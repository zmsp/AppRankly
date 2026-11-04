-- Migration 007: Zero-SDK Campaign Link Builder & Attribution Registry
CREATE TABLE IF NOT EXISTS campaign_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  package_name TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'all',
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  channel TEXT DEFAULT 'social',
  utm_source TEXT NOT NULL,
  utm_medium TEXT,
  utm_campaign TEXT NOT NULL,
  apple_url TEXT,
  play_url TEXT,
  universal_url TEXT,
  clicks INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_campaign_pkg ON campaign_links(package_name, platform);
