-- Migration 001: Initial schema


-- One row per ingested source file. This is how we know what is stale.
CREATE TABLE source_file (
  id           INTEGER PRIMARY KEY,
  path         TEXT NOT NULL UNIQUE,
  kind         TEXT NOT NULL,     -- overview|country|os_version|device|app_version|
                                  -- ratings_overview|apple_sales|apple_engagement
  app_id       INTEGER REFERENCES app(id),
  period       TEXT,              -- 'YYYYMM' for Google monthly files, 'YYYY-MM-DD' for Apple daily
  size_bytes   INTEGER,
  mtime_ms     INTEGER,
  checksum     TEXT,              -- sha256 of file contents
  row_count    INTEGER,
  status       TEXT NOT NULL DEFAULT 'ok',   -- ok|failed|partial
  error        TEXT,
  ingested_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_source_file_kind ON source_file(kind, period);

CREATE TABLE app (
  id            INTEGER PRIMARY KEY,
  package_name  TEXT NOT NULL,      -- Google package or Apple bundle/SKU
  platform      TEXT NOT NULL,      -- 'google' | 'apple'
  apple_id      TEXT,               -- numeric App Store ID
  display_name  TEXT,
  first_date    TEXT,               -- earliest fact date, maintained on ingest
  last_date     TEXT,               -- latest fact date  ← used for range clamping
  UNIQUE(package_name, platform)
);

CREATE TABLE fact_daily (
  app_id             INTEGER NOT NULL REFERENCES app(id),
  date               TEXT NOT NULL,           -- 'YYYY-MM-DD', sorts lexicographically
  device_installs    INTEGER NOT NULL DEFAULT 0,
  device_uninstalls  INTEGER NOT NULL DEFAULT 0,
  device_upgrades    INTEGER NOT NULL DEFAULT 0,
  total_user_installs INTEGER NOT NULL DEFAULT 0,  -- cumulative: use MAX, never SUM
  user_installs      INTEGER NOT NULL DEFAULT 0,
  user_uninstalls    INTEGER NOT NULL DEFAULT 0,
  active_devices     INTEGER NOT NULL DEFAULT 0,   -- snapshot: use LAST, never SUM
  install_events     INTEGER NOT NULL DEFAULT 0,
  update_events      INTEGER NOT NULL DEFAULT 0,
  uninstall_events   INTEGER NOT NULL DEFAULT 0,
  source_file_id     INTEGER REFERENCES source_file(id),
  PRIMARY KEY (app_id, date)
) WITHOUT ROWID;
CREATE INDEX idx_fact_daily_date ON fact_daily(date);

CREATE TABLE fact_daily_dim (
  app_id             INTEGER NOT NULL REFERENCES app(id),
  date               TEXT NOT NULL,
  dimension          TEXT NOT NULL,   -- country|os_version|device|app_version
  dim_value          TEXT NOT NULL,   -- '' when the source cell is blank, never NULL
  device_installs    INTEGER NOT NULL DEFAULT 0,
  device_uninstalls  INTEGER NOT NULL DEFAULT 0,
  device_upgrades    INTEGER NOT NULL DEFAULT 0,
  total_user_installs INTEGER NOT NULL DEFAULT 0,
  user_installs      INTEGER NOT NULL DEFAULT 0,
  user_uninstalls    INTEGER NOT NULL DEFAULT 0,
  active_devices     INTEGER NOT NULL DEFAULT 0,
  install_events     INTEGER NOT NULL DEFAULT 0,
  update_events      INTEGER NOT NULL DEFAULT 0,
  uninstall_events   INTEGER NOT NULL DEFAULT 0,
  source_file_id     INTEGER REFERENCES source_file(id),
  PRIMARY KEY (app_id, dimension, dim_value, date)
) WITHOUT ROWID;
CREATE INDEX idx_fdd_scan ON fact_daily_dim(app_id, dimension, date);

CREATE TABLE fact_rating_daily (
  app_id            INTEGER NOT NULL REFERENCES app(id),
  date              TEXT NOT NULL,
  daily_avg_rating  REAL,          -- NULLABLE — 'NA' and 0.0 mean "no ratings today"
  total_avg_rating  REAL,
  rating_1          INTEGER, rating_2 INTEGER, rating_3 INTEGER,
  rating_4          INTEGER, rating_5 INTEGER,
  source_file_id    INTEGER REFERENCES source_file(id),
  PRIMARY KEY (app_id, date)
) WITHOUT ROWID;

CREATE TABLE fact_apple_sales (
  app_id        INTEGER NOT NULL REFERENCES app(id),
  date          TEXT NOT NULL,
  product_type  TEXT NOT NULL,   -- '1F','7F','1','3F','7','3', ...
  country       TEXT NOT NULL,
  device        TEXT NOT NULL,
  version       TEXT,
  units         INTEGER NOT NULL DEFAULT 0,
  proceeds_micros INTEGER NOT NULL DEFAULT 0,  -- integer micros, never REAL
  currency      TEXT,
  source_file_id INTEGER REFERENCES source_file(id),
  PRIMARY KEY (app_id, date, product_type, country, device, version)
) WITHOUT ROWID;

CREATE TABLE fact_apple_engagement (
  app_id           INTEGER NOT NULL REFERENCES app(id),
  date             TEXT NOT NULL,
  event            TEXT NOT NULL,   -- Impression | Page view | Tap
  page_type        TEXT NOT NULL,
  source_type      TEXT NOT NULL,   -- App Store search | browse | App referrer | Web referrer
  device           TEXT NOT NULL,
  platform_version TEXT NOT NULL,
  territory        TEXT NOT NULL,
  counts           INTEGER NOT NULL DEFAULT 0,
  unique_counts    INTEGER NOT NULL DEFAULT 0,
  source_file_id   INTEGER REFERENCES source_file(id),
  PRIMARY KEY (app_id, date, event, page_type, source_type, device, platform_version, territory)
) WITHOUT ROWID;

CREATE TABLE store_metadata (
  app_id      INTEGER NOT NULL REFERENCES app(id),
  platform    TEXT NOT NULL,
  payload     TEXT NOT NULL,        -- JSON blob as scraped
  fetched_at  TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'ok',   -- ok | failed | not_found
  error       TEXT,
  PRIMARY KEY (app_id, platform)
);
CREATE INDEX idx_store_metadata_expiry ON store_metadata(expires_at);

CREATE TABLE agg_cache (
  cache_key     TEXT PRIMARY KEY,     -- sha256 of the canonical request (§4)
  kind          TEXT NOT NULL,        -- stats | dimension | dimension_series | funnel | portfolio
  request_json  TEXT NOT NULL,        -- canonical form, for debugging and audit
  app_scope     TEXT NOT NULL,        -- sorted CSV of app_ids, e.g. '3' or '1,2,3'
  covers_start  TEXT NOT NULL,        -- resolved range start
  covers_end    TEXT NOT NULL,        -- resolved range end
  logic_version INTEGER NOT NULL,     -- bump to invalidate everything on deploy
  payload       TEXT NOT NULL,        -- JSON response body
  payload_bytes INTEGER NOT NULL,
  compute_ms    INTEGER,
  computed_at   TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at    TEXT,                 -- NULL = valid until invalidated
  hit_count     INTEGER NOT NULL DEFAULT 0,
  last_hit_at   TEXT
);
CREATE INDEX idx_agg_overlap ON agg_cache(app_scope, covers_end, covers_start);
CREATE INDEX idx_agg_expiry  ON agg_cache(expires_at);
