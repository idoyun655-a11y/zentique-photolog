export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body = await context.request.json().catch(() => ({}));
  const caption = String((body as any).caption || ""); // allow empty

  const id = crypto.randomUUID();
  const created_at = Date.now();

  await context.env.DB.prepare(
    "INSERT INTO posts (id, caption, created_at) VALUES (?, ?, ?)"
  ).bind(id, caption, created_at).run();

  return Response.json({ id, caption, created_at });
};
