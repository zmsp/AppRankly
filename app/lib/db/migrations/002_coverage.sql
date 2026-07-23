-- Migration 002: Coverage tracking for range-based caching and GCS file listing cache

CREATE TABLE IF NOT EXISTS coverage_index (
  app_id      INTEGER NOT NULL REFERENCES app(id),
  resource    TEXT NOT NULL,    -- 'overview' | 'country' | 'device' | 'os_version' | 'ratings' | 'vitals'
  start_date  TEXT NOT NULL,    -- 'YYYY-MM-DD'
  end_date    TEXT NOT NULL,    -- 'YYYY-MM-DD'
  fetched_at  TEXT NOT NULL DEFAULT (datetime('now')),
  file_month  TEXT,             -- 'YYYYMM' for Google monthly files
  PRIMARY KEY (app_id, resource, start_date, end_date)
);
CREATE INDEX IF NOT EXISTS idx_coverage_scan ON coverage_index(app_id, resource, end_date, start_date);

-- GCS file listing cache (avoid re-listing bucket)
CREATE TABLE IF NOT EXISTS gcs_file_cache (
  bucket_name TEXT NOT NULL,
  prefix      TEXT NOT NULL,
  file_list   TEXT NOT NULL,    -- JSON array of file names
  fetched_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (bucket_name, prefix)
);
