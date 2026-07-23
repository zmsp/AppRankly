CREATE TABLE IF NOT EXISTS aso_keyword (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  app_id INTEGER,
  package_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  term TEXT NOT NULL,
  normalized TEXT NOT NULL,
  cluster TEXT,
  source TEXT NOT NULL,
  autocomplete_verified INTEGER NOT NULL DEFAULT 0,
  tracked INTEGER NOT NULL DEFAULT 0,
  added_at TEXT NOT NULL,
  UNIQUE(package_name, platform, normalized)
);

CREATE TABLE IF NOT EXISTS aso_rank_history (
  package_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  keyword_id INTEGER NOT NULL REFERENCES aso_keyword(id) ON DELETE CASCADE,
  store TEXT NOT NULL,
  country TEXT NOT NULL,
  rank INTEGER,
  top_n INTEGER NOT NULL,
  checked_at TEXT NOT NULL,
  PRIMARY KEY (keyword_id, store, country, checked_at)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS aso_competitor (
  package_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  store TEXT NOT NULL,
  competitor_key TEXT NOT NULL,
  name TEXT,
  title TEXT,
  short_desc TEXT,
  subtitle TEXT,
  description TEXT,
  rating REAL,
  installs_text TEXT,
  pinned INTEGER DEFAULT 0,
  fetched_at TEXT,
  PRIMARY KEY (package_name, platform, store, competitor_key)
);

CREATE TABLE IF NOT EXISTS aso_review (
  id TEXT NOT NULL,
  package_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  store TEXT NOT NULL,
  country TEXT,
  rating INTEGER,
  title TEXT,
  body TEXT,
  author TEXT,
  review_date TEXT,
  version TEXT,
  theme TEXT,
  reply_draft TEXT,
  replied INTEGER DEFAULT 0,
  PRIMARY KEY (id, store)
);

CREATE TABLE IF NOT EXISTS aso_ai_run (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  package_name TEXT,
  platform TEXT,
  kind TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  prompt_version INTEGER NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  est_cost_usd REAL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_aso_ai_cache ON aso_ai_run(kind, package_name, platform, input_hash, prompt_version);

CREATE TABLE IF NOT EXISTS aso_listing_snapshot (
  package_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  store TEXT NOT NULL,
  title TEXT,
  short_desc TEXT,
  subtitle TEXT,
  description TEXT,
  fetched_at TEXT NOT NULL,
  PRIMARY KEY (package_name, platform, store, fetched_at)
);
