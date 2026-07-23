const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'database.sqlite');

// Ensure directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db;
try {
  db = new DatabaseSync(dbPath);
} catch (err) {
  console.error(`Failed to open SQLite database at ${dbPath}:`, err);
  process.exit(1);
}

// Required PRAGMAs
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;
  PRAGMA temp_store = MEMORY;
`);

function migrate() {
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

module.exports = {
  db,
  migrate,
};
