const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cache = require('./cache');
const { db } = require('./db/index');

const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const _inflight = new Map();

const metrics = {
  hits: { cache: 0, db: 0, file: 0, api: 0 },
  inFlightCollapses: 0
};

function keyToFilename(key) {
  return crypto.createHash('sha256').update(key).digest('hex') + '.json';
}

function dbGet(resource, params) {
  if (!db) return undefined;

  if (resource === 'gcs:filelist' && params.bucket && params.prefix !== undefined) {
    try {
      const row = db.prepare('SELECT file_list, fetched_at FROM gcs_file_cache WHERE bucket_name = ? AND prefix = ?').get(params.bucket, params.prefix);
      if (!row) return undefined;
      const ageMs = Date.now() - new Date(row.fetched_at).getTime();
      if (ageMs > 300 * 1000) return undefined; // 5 min TTL
      return JSON.parse(row.file_list);
    } catch {
      return undefined;
    }
  }

  if ((resource === 'scrape:google' || resource === 'scrape:apple') && (params.appId || params.identifier)) {
    const identifier = params.appId || params.identifier;
    const platform = resource === 'scrape:google' ? 'google' : 'apple';
    try {
      const row = db.prepare(`
        SELECT sm.payload, sm.expires_at 
        FROM store_metadata sm
        JOIN app a ON a.id = sm.app_id
        WHERE a.package_name = ? AND sm.platform = ?
      `).get(identifier, platform);
      if (!row) return undefined;
      if (new Date(row.expires_at).getTime() < Date.now()) return undefined;
      return JSON.parse(row.payload);
    } catch {
      return undefined;
    }
  }

  return undefined;
}

function dbUpsert(resource, params, value) {
  if (!db || value === undefined || value === null) return;

  if (resource === 'gcs:filelist' && params.bucket && params.prefix !== undefined) {
    try {
      db.prepare(`
        INSERT OR REPLACE INTO gcs_file_cache (bucket_name, prefix, file_list, fetched_at)
        VALUES (?, ?, ?, datetime('now'))
      `).run(params.bucket, params.prefix, JSON.stringify(value));
    } catch (err) {
      console.error('[resolver] DB save gcs_file_cache error:', err);
    }
  }

  if ((resource === 'scrape:google' || resource === 'scrape:apple') && (params.appId || params.identifier)) {
    const identifier = params.appId || params.identifier;
    const platform = resource === 'scrape:google' ? 'google' : 'apple';
    try {
      let appRow = db.prepare('SELECT id FROM app WHERE package_name = ? AND platform = ?').get(identifier, platform);
      if (!appRow) {
        const res = db.prepare('INSERT INTO app (package_name, platform) VALUES (?, ?)').run(identifier, platform);
        appRow = { id: res.lastInsertRowid };
      }
      const expiresAt = new Date(Date.now() + 86400 * 1000).toISOString();
      db.prepare(`
        INSERT OR REPLACE INTO store_metadata (app_id, platform, payload, fetched_at, expires_at, status)
        VALUES (?, ?, ?, datetime('now'), ?, 'ok')
      `).run(appRow.id, platform, JSON.stringify(value), expiresAt);
    } catch (err) {
      console.error('[resolver] DB save store_metadata error:', err);
    }
  }
}

function fileGet(key) {
  try {
    const filePath = path.join(dataDir, '.resolve_cache', keyToFilename(key));
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      return parsed.data;
    }
  } catch {}
  return undefined;
}

function fileSet(key, value) {
  try {
    const cacheDir = path.join(dataDir, '.resolve_cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    const filePath = path.join(cacheDir, keyToFilename(key));
    fs.writeFileSync(filePath, JSON.stringify({ key, data: value, savedAt: Date.now() }));
  } catch (err) {
    console.error('[resolver] File cache save error:', err);
  }
}

async function singleFlight(key, fetchFn) {
  if (_inflight.has(key)) {
    metrics.inFlightCollapses++;
    return _inflight.get(key);
  }

  const promise = (async () => {
    try {
      return await fetchFn();
    } finally {
      _inflight.delete(key);
    }
  })();

  _inflight.set(key, promise);
  return promise;
}

/**
 * Main Resolver Entrypoint — 4-Tier Lookup Waterfall
 * 1. IN-MEMORY CACHE (Map)
 * 2. DATABASE (SQLite)
 * 3. FILE ON DISK (.resolve_cache JSON)
 * 4. EXTERNAL API (Single-flight execution)
 */
async function resolve(resource, params = {}, fetchFn) {
  const key = cache.makeKey(resource, params);

  const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0];
  const isRecentSalesReport = (resource === 'apple:sales_report' && params.dateStr && params.dateStr >= twoDaysAgo);

  // 1. In-Memory Cache
  const memHit = cache.get(key, resource);
  if (memHit !== undefined) {
    const isMissing = (memHit === null || memHit === '__EMPTY__' || memHit === 'NO_DATA');
    if (!isRecentSalesReport || !isMissing) {
      metrics.hits.cache++;
      logTier(resource, 'cache');
      return memHit;
    }
  }

  // 2. Database
  const dbHit = dbGet(resource, params);
  if (dbHit !== undefined) {
    const isMissing = (dbHit === null || dbHit === '__EMPTY__' || dbHit === 'NO_DATA');
    if (!isRecentSalesReport || !isMissing) {
      metrics.hits.db++;
      cache.set(key, dbHit); // Backfill Tier 1
      logTier(resource, 'db');
      return dbHit;
    }
  }

  // 3. File on Disk
  const fileHit = fileGet(key);
  if (fileHit !== undefined) {
    const isMissing = (fileHit === null || fileHit === '__EMPTY__' || fileHit === 'NO_DATA');
    if (!isRecentSalesReport || !isMissing) {
      metrics.hits.file++;
      cache.set(key, fileHit); // Backfill Tier 1
      if (fileHit !== null) dbUpsert(resource, params, fileHit); // Backfill Tier 2
      logTier(resource, 'file');
      return fileHit;
    }
  }

  // 4. External API (deduplicated)
  metrics.hits.api++;
  logTier(resource, 'api');
  const value = await singleFlight(key, fetchFn);

  // Backfill all faster tiers (including null for negative caching)
  if (value !== undefined) {
    cache.set(key, value);
    if (value !== null) {
      dbUpsert(resource, params, value);
    }
    fileSet(key, value);
  }

  return value;
}

function logTier(resource, tier) {
  console.log(`[resolve] ${resource} → ${tier}`);
}

function getMetrics() {
  const total = metrics.hits.cache + metrics.hits.db + metrics.hits.file + metrics.hits.api;
  const apiRatio = total > 0 ? (metrics.hits.api / total) * 100 : 0;
  return {
    hits: { ...metrics.hits },
    totalHits: total,
    apiHitPercentage: Number(apiRatio.toFixed(2)),
    inFlightCollapses: metrics.inFlightCollapses,
    cacheSize: cache.stats().size
  };
}

function clearCache(resource) {
  cache.invalidate(resource);
  if (db) {
    try {
      if (!resource) {
        db.exec('DELETE FROM gcs_file_cache');
        db.exec('DELETE FROM agg_cache');
        db.exec('DELETE FROM store_metadata');
      } else if (resource === 'gcs:filelist') {
        db.exec('DELETE FROM gcs_file_cache');
      } else if (resource === 'agg_cache') {
        db.exec('DELETE FROM agg_cache');
      }
    } catch (e) {
      console.error('[resolver] DB clearCache error:', e.message);
    }
  }
  try {
    const cacheDir = path.join(dataDir, '.resolve_cache');
    if (fs.existsSync(cacheDir)) {
      if (!resource) {
        fs.rmSync(cacheDir, { recursive: true, force: true });
      } else {
        const search = resource.toLowerCase();
        const files = fs.readdirSync(cacheDir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            const filePath = path.join(cacheDir, file);
            try {
              const raw = fs.readFileSync(filePath, 'utf8');
              const parsed = JSON.parse(raw);
              if (parsed.key && parsed.key.toLowerCase().includes(`:${search}`)) {
                fs.unlinkSync(filePath);
              }
            } catch {}
          }
        }
      }
    }
  } catch (err) {
    console.error('[resolver] clearCache error:', err.message);
  }
}

module.exports = {
  resolve,
  singleFlight,
  clearCache,
  getMetrics,
  makeKey: cache.makeKey
};
