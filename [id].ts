export interface Env {
  DB: D1Database;
  BUCKET?: R2Bucket;
}

function getCookie(req: Request, name: string): string | null {
  const c = req.headers.get("Cookie") || "";
  const parts = c.split(";").map(s => s.trim());
  for (const p of parts) {
    if (!p) continue;
    const i = p.indexOf("=");
    if (i < 0) continue;
    const k = p.slice(0, i);
    const v = p.slice(i + 1);
    if (k === name) return decodeURIComponent(v);
  }
  return null;
}


export const onRequestGet: PagesFunction<Env> = async (context) => {
  const id = context.params.id as string;

  const post = await context.env.DB.prepare(
    "SELECT id, caption, created_at, like_count FROM posts WHERE id = ?"
  ).bind(id).first() as any;

  if (!post) return new Response("Not found", { status: 404 });

  const media = await context.env.DB.prepare(
    "SELECT id, width, height, created_at FROM media WHERE post_id = ? ORDER BY created_at ASC"
  ).bind(id).all();

  const items = (media.results || []).map((m: any) => ({
    id: m.id,
    width: m.width ?? null,
    height: m.height ?? null,
    created_at: m.created_at,
    url: `/api/media/${m.id}`,
  }));

  const clientId = getCookie(context.request, "client_id");
  let liked = false;
  if (clientId) {
    const row = await context.env.DB.prepare(
      "SELECT 1 FROM likes WHERE post_id = ? AND client_id = ?"
    ).bind(id, clientId).first();
    liked = !!row;
  }

  return Response.json({
    id: post.id,
    caption: post.caption,
    created_at: post.created_at,
    like_count: post.like_count ?? 0,
    liked,
    media: items,
  });
};
