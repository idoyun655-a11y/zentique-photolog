-- D1 (SQLite) schema
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  caption TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  cover_media_id TEXT
);

CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  mime TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_post_id_created_at ON media(post_id, created_at ASC);
