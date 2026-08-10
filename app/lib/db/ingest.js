const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { parseString } = require('@fast-csv/parse');
const { db } = require('./index');

function parseNumeric(val) {
  if (val === '' || val === 'NA' || val === null || val === undefined) return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
}

function readFileContent(fileName) {
  const buffer = fs.readFileSync(fileName);
  if (buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.toString('utf16le');
  }
  return buffer.toString('utf8');
}

function getChecksum(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

async function getOrCreateApp(packageName, platform = 'google') {
  let app = db.prepare('SELECT id FROM app WHERE package_name = ? AND platform = ?').get(packageName, platform);
  if (!app) {
    db.prepare('INSERT INTO app (package_name, platform) VALUES (?, ?)').run(packageName, platform);
    app = db.prepare('SELECT id FROM app WHERE package_name = ? AND platform = ?').get(packageName, platform);
  }
  return app.id;
}

async function updateAppDates(appId) {
  db.exec(`
    UPDATE app 
    SET first_date = (SELECT MIN(date) FROM fact_daily WHERE app_id = ${appId}),
        last_date = (SELECT MAX(date) FROM fact_daily WHERE app_id = ${appId})
    WHERE id = ${appId}
  `);
}

async function ingestGoogleOverview(filePath, fileMonth, appId, fileStat, checksum) {
  const content = readFileContent(filePath);
  
  const records = await new Promise((resolve, reject) => {
    const results = [];
    parseString(content, { headers: true, trim: true })
      .on('error', error => reject(error))
      .on('data', row => results.push(row))
      .on('end', () => resolve(results));
  });

  db.exec('BEGIN IMMEDIATE');
  try {
    const sourceStmt = db.prepare(`
      INSERT INTO source_file (path, kind, app_id, period, size_bytes, mtime_ms, checksum, row_count, status)
      VALUES (?, 'overview', ?, ?, ?, ?, ?, ?, 'ok')
      ON CONFLICT(path) DO UPDATE SET
        size_bytes = excluded.size_bytes,
        mtime_ms = excluded.mtime_ms,
        checksum = excluded.checksum,
        row_count = excluded.row_count,
        status = 'ok',
        ingested_at = datetime('now')
      RETURNING id
    `);
    const sourceId = sourceStmt.get(filePath, appId, fileMonth, fileStat.size, fileStat.mtimeMs, checksum, records.length).id;

    const start = `${fileMonth.substring(0,4)}-${fileMonth.substring(4,6)}-01`;
    const end = `${fileMonth.substring(0,4)}-${fileMonth.substring(4,6)}-31`;
    
    db.prepare('DELETE FROM fact_daily WHERE app_id = ? AND date BETWEEN ? AND ?').run(appId, start, end);
    db.prepare(`
      DELETE FROM agg_cache 
      WHERE (',' || app_scope || ',') LIKE ('%,' || ? || ',%') 
        AND covers_start <= ? AND covers_end >= ?
    `).run(appId, end, start);

    const insertFact = db.prepare(`
      INSERT INTO fact_daily (
        app_id, date, device_installs, device_uninstalls, device_upgrades, 
        total_user_installs, user_installs, user_uninstalls, active_devices, 
        install_events, update_events, uninstall_events, source_file_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const row of records) {
      if (!row['Date']) continue;
      insertFact.run(
        appId,
        row['Date'],
        parseNumeric(row['Daily Device Installs']) || 0,
        parseNumeric(row['Daily Device Uninstalls']) || 0,
        parseNumeric(row['Daily Device Upgrades']) || 0,
        parseNumeric(row['Total User Installs']) || 0,
        parseNumeric(row['Daily User Installs']) || 0,
        parseNumeric(row['Daily User Uninstalls']) || 0,
        parseNumeric(row['Active Device Installs']) || 0,
        parseNumeric(row['Install events']) || 0,
        parseNumeric(row['Update events']) || 0,
        parseNumeric(row['Uninstall events']) || 0,
        sourceId
      );
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

async function backfill(targetApp = null, since = null) {
  console.log(`Starting backfill... Target app: ${targetApp || 'all'}, since: ${since || 'beginning'}`);
  const dataDir = path.join(__dirname, '..', '..', '..', 'data', 'download_stats');
  if (!fs.existsSync(dataDir)) {
    console.log(`Data directory not found: ${dataDir}`);
    return;
  }

  const apps = fs.readdirSync(dataDir).filter(f => fs.statSync(path.join(dataDir, f)).isDirectory());
  for (const app of apps) {
    if (app === 'apple') continue;
    if (targetApp && app !== targetApp) continue;

    console.log(`Processing app: ${app}`);
    const appId = await getOrCreateApp(app);
    const appDir = path.join(dataDir, app);
    const files = fs.readdirSync(appDir);

    for (const file of files) {
      if (file.startsWith('overview_') && file.endsWith('.csv')) {
        const fileMonth = file.match(/_(\d{6})\.csv/)[1];
        if (since && fileMonth < since.replace('-', '')) continue;
        
        const filePath = path.join(appDir, file);
        const stat = fs.statSync(filePath);
        
        const existing = db.prepare('SELECT size_bytes, mtime_ms, checksum FROM source_file WHERE path = ?').get(filePath);
        if (existing && existing.size_bytes === stat.size && existing.mtime_ms === stat.mtimeMs) {
          continue; // File hasn't changed
        }
        
        const checksum = getChecksum(filePath);
        if (existing && existing.checksum === checksum) {
           // update mtime/size but no need to re-parse
           db.prepare('UPDATE source_file SET size_bytes = ?, mtime_ms = ? WHERE path = ?').run(stat.size, stat.mtimeMs, filePath);
           continue;
        }

        console.log(`Ingesting ${file}...`);
        await ingestGoogleOverview(filePath, fileMonth, appId, stat, checksum);
      }
    }
    await updateAppDates(appId);
  }
}

async function status() {
  console.log('Database Status:');
  const stmt = db.prepare(`
    SELECT a.package_name, 
           COUNT(f.date) as days_covered, 
           MIN(f.date) as first_date, 
           MAX(f.date) as last_date 
    FROM fact_daily f
    JOIN app a ON f.app_id = a.id
    GROUP BY f.app_id
  `);
  const rows = stmt.all();
  console.table(rows);
}

async function clearCache(targetApp = null) {
  if (targetApp) {
    db.exec(`DELETE FROM agg_cache WHERE app_scope LIKE '%${targetApp}%'`);
    console.log(`Cleared cache for app matching: ${targetApp}`);
  } else {
    db.exec('DELETE FROM agg_cache');
    console.log('Cleared all agg_cache');
  }
}

module.exports = {
  backfill,
  status,
  clearCache,
  ingestGoogleOverview,
  getOrCreateApp,
  updateAppDates,
  getChecksum
};
