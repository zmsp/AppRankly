const { db } = require('./index');
const crypto = require('crypto');

const LOGIC_VERSION = 1;

function canonicalize(req) {
  const canonical = {
    kind: req.kind,
    appIds: Array.isArray(req.appIds) ? req.appIds.slice().sort() : [req.appIds],
    start: req.startDate || '1970-01-01',
    end: req.endDate || new Date().toISOString().split('T')[0],
    dimension: (req.dimension || null)?.toLowerCase() || null,
    topN: req.topN || 10,
    logic: LOGIC_VERSION,
  };
  return canonical;
}

function getCacheKey(canonical) {
  return crypto.createHash('sha256')
    .update(JSON.stringify(canonical, Object.keys(canonical).sort()))
    .digest('hex');
}

function getTwoDaysAgoStr() {
  const d = new Date();
  d.setDate(d.getDate() - 2);
  return d.toISOString().split('T')[0];
}

async function getOrCompute(req, computeFn) {
  if (!db) {
    return await computeFn();
  }
  const canonical = canonicalize(req);
  const cacheKey = getCacheKey(canonical);

  const twoDaysAgo = getTwoDaysAgoStr();
  const coversRecent = !canonical.end || canonical.end >= twoDaysAgo;

  const stmt = db.prepare('SELECT payload FROM agg_cache WHERE cache_key = ? AND logic_version = ?');
  const row = stmt.get(cacheKey, LOGIC_VERSION);

  if (row) {
    let cachedPayload;
    try {
      cachedPayload = JSON.parse(row.payload);
    } catch {}

    if (cachedPayload) {
      let isMissingRecent = false;
      if (coversRecent && canonical.kind === 'stats') {
        const trends = cachedPayload.dailyTrends;
        if (!trends || !Array.isArray(trends) || trends.length === 0) {
          isMissingRecent = true;
        } else {
          const maxDate = trends.reduce((max, t) => (t.date > max ? t.date : max), '');
          if (maxDate < twoDaysAgo) {
            isMissingRecent = true;
          }
        }
      }

      if (!isMissingRecent) {
        db.prepare('UPDATE agg_cache SET hit_count = hit_count + 1, last_hit_at = datetime("now") WHERE cache_key = ?').run(cacheKey);
        return cachedPayload;
      }
      console.log(`[db/cache] agg_cache hit for key ${cacheKey} is missing recent days (max date < ${twoDaysAgo}). Repulling recent days...`);
    }
  }

  const start = Date.now();
  const payload = await computeFn();
  const computeMs = Date.now() - start;
  const payloadStr = JSON.stringify(payload);

  try {
    db.prepare(`
      INSERT OR REPLACE INTO agg_cache 
      (cache_key, kind, request_json, app_scope, covers_start, covers_end, logic_version, payload, payload_bytes, compute_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      cacheKey, 
      canonical.kind, 
      JSON.stringify(canonical), 
      canonical.appIds.join(','), 
      canonical.start, 
      canonical.end, 
      LOGIC_VERSION, 
      payloadStr, 
      Buffer.byteLength(payloadStr), 
      computeMs
    );
  } catch (err) {
    console.error('Failed to cache result:', err);
  }

  return payload;
}

module.exports = {
  getOrCompute
};
