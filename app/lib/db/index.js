const fs = require('fs');
const path = require('path');

let DatabaseSync;
try {
  DatabaseSync = require('node:sqlite').DatabaseSync;
} catch (err) {
  console.warn('[DB] node:sqlite module not available in this Node.js version (< 22.5). SQLite DB feature disabled.');
}

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'database.sqlite');

let db = null;
if (DatabaseSync) {
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  try {
    db = new DatabaseSync(dbPath);
    // Required PRAGMAs
    db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = 5000;
      PRAGMA temp_store = MEMORY;
    `);
  } catch (err) {
    console.error(`Failed to open SQLite database at ${dbPath}:`, err);
    db = null;
  }
}

function migrate() {
  if (!db) return;
  const migrationsDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) return;

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  // Create schema_meta if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_meta (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const currentVersionStmt = db.prepare('SELECT MAX(version) as v FROM schema_meta');
  const row = currentVersionStmt.get();
  const currentVersion = row ? row.v || 0 : 0;

  for (const file of files) {
    const versionMatch = file.match(/^(\d+)_/);
    if (!versionMatch) continue;
    const version = parseInt(versionMatch[1], 10);

    if (version > currentVersion) {
      console.log(`Applying migration ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      
      db.exec('BEGIN EXCLUSIVE TRANSACTION');
      try {
        db.exec(sql);
        db.prepare('INSERT INTO schema_meta (version) VALUES (?)').run(version);
        db.exec('COMMIT');
        console.log(`Migration ${file} applied successfully.`);
      } catch (err) {
        db.exec('ROLLBACK');
        console.error(`Failed to apply migration ${file}:`, err);
        throw err;
      }
    }
  }
}

if (db) {
  try {
    migrate();
  } catch (err) {
    console.error('Failed auto-running SQLite migrations on startup:', err);
  }
}

module.exports = {
  db,
  migrate,
};
