export interface Env {
  DB: D1Database;
  BUCKET?: R2Bucket; // optional (text-only installs may not bind R2)
}

// DELETE /api/admin/posts/:id
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const id = context.params.id as string;

  // Try to delete images from R2 (best-effort). If BUCKET isn't bound, just skip.
  if (context.env.BUCKET) {
    try {
      const mediaRes = await context.env.DB.prepare(
        "SELECT r2_key FROM media WHERE post_id = ?"
      ).bind(id).all();

      const keys = (mediaRes.results || [])
        .map((r: any) => (r as any).r2_key)
        .filter(Boolean);

      for (const key of keys) {
        try { await context.env.BUCKET.delete(key); } catch (_) {}
      }
    } catch (_) {
      // media table missing or query failed — still allow DB delete
    }
  }

  // Delete DB rows (best-effort in case media table isn't present)
  try { await context.env.DB.prepare("DELETE FROM media WHERE post_id = ?").bind(id).run(); } catch (_) {}
  const out = await context.env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(id).run();

  return Response.json({ ok: true, deleted: out.success });
};
