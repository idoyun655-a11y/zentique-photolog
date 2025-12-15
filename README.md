# zentique photolog (Cloudflare Pages + D1 + R2)

Public photo-log (Instagram-ish) with an admin uploader.
Supports **text-only**, **photo-only**, or **text+photos** posts.

- Public: / (timeline), /photos.html (grid), /post.html?id=...
- Admin: /admin/ (basic auth) + uploads multiple photos per post
- Images are resized + watermarked **in the browser** before upload (no originals are stored)

## 0) Requirements
- Cloudflare account
- (Recommended) Node.js 20+ for `wrangler` CLI (for migrations / local dev)

## 1) Create Cloudflare resources
### D1
Create a D1 database named `zentique_db`.

### R2
Create an R2 bucket named `zentique_media`.

## 2) Create a Pages project
- Create a new Cloudflare Pages project from this repo (Git integration or Direct Upload).
- Build command: set to `echo "skip build"`
- Build output directory: `public`

## 3) Add bindings to the Pages project
Pages Project → Settings → Bindings:
- D1 database: Variable name `DB` → select `zentique_db`
- R2 bucket: Variable name `BUCKET` → select `zentique_media`
- Environment variables (secrets):
  - `ADMIN_USER` = your username (e.g. `me`)
  - `ADMIN_PASS` = a strong password

Redeploy after adding bindings.

## 4) Create tables in D1 (no CLI needed)
Open D1 → `zentique_db` → Console and run:
```sql
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
```

## 5) Use
- Public: open your Pages URL, post feed should load (empty at first)
- Admin: go to /admin/ and create posts

---

### Notes
- “Prevent download / screenshot” is impossible. This template:
  - never stores originals (client-side resize + watermark)
  - serves only watermarked images
  - disables right-click/drag (weak protection, but reduces casual saving)


## Likes & Comments
- Likes use a browser cookie (`client_id`) to limit one-like-per-device.
- Comments are public and stored in D1.
- Admin delete removes media/likes/comments.
