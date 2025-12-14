export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const id = context.params.id as string;

  const post = await context.env.DB.prepare(
    "SELECT id, caption, created_at FROM posts WHERE id = ?"
  ).bind(id).first();

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

  return Response.json({
    id: (post as any).id,
    caption: (post as any).caption,
    created_at: (post as any).created_at,
    media: items,
  });
};
