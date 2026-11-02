-- Migration 008: GitHub Repository Tracking (Stars, Downloads, Releases)
CREATE TABLE IF NOT EXISTS github_repos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT UNIQUE NOT NULL,
  owner TEXT NOT NULL,
  repo TEXT NOT NULL,
  name TEXT,
  description TEXT,
  default_branch TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS github_repo_daily (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id INTEGER REFERENCES github_repos(id),
  url TEXT NOT NULL,
  date TEXT NOT NULL,
  stars INTEGER NOT NULL DEFAULT 0,
  forks INTEGER NOT NULL DEFAULT 0,
  open_issues INTEGER NOT NULL DEFAULT 0,
  watchers INTEGER NOT NULL DEFAULT 0,
  total_downloads INTEGER NOT NULL DEFAULT 0,
  release_count INTEGER NOT NULL DEFAULT 0,
  latest_release_tag TEXT,
  latest_release_date TEXT,
  details_json TEXT,
  polled_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(url, date)
);

CREATE INDEX IF NOT EXISTS idx_gh_daily_url_date ON github_repo_daily(url, date DESC);

