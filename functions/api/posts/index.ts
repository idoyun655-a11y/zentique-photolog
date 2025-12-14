export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
}

function intParam(url: URL, key: string, def: number): number {
  const v = url.searchParams.get(key);
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) ? n : def;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);

  const limit = Math.max(1, Math.min(60, intParam(url, "limit", 20)));
  const cursorRaw = url.searchParams.get("cursor");
  const cursor = cursorRaw ? Number(cursorRaw) : null;

  const sql = cursor
    ? `SELECT id, caption, created_at, cover_media_id,
         (SELECT COUNT(1) FROM media WHERE post_id = posts.id) as media_count
       FROM posts
       WHERE created_at < ?
       ORDER BY created_at DESC
       LIMIT ?`
    : `SELECT id, caption, created_at, cover_media_id,
         (SELECT COUNT(1) FROM media WHERE post_id = posts.id) as media_count
       FROM posts
       ORDER BY created_at DESC
       LIMIT ?`;

  const ps = context.env.DB.prepare(sql);
  const res = cursor ? await ps.bind(cursor, limit).all() : await ps.bind(limit).all();

  const items = (res.results || []).map((r: any) => ({
    id: r.id,
    caption: r.caption,
    created_at: r.created_at,
    media_count: r.media_count ?? 0,
    cover_url: r.cover_media_id ? `/api/media/${r.cover_media_id}` : null,
  }));

  const nextCursor = items.length ? items[items.length - 1].created_at : null;
  return Response.json({ items, nextCursor });
};
