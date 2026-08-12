-- Migration 005: Create notes table for per-app notes and brainstorming
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  package_name TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'all',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags_json TEXT DEFAULT '[]',
  pinned INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notes_package ON notes(package_name, platform);
CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at DESC);
