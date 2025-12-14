export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const id = context.params.id as string;

  const row = await context.env.DB.prepare(
    "SELECT r2_key, mime FROM media WHERE id = ?"
  ).bind(id).first() as any;

  if (!row) return new Response("Not found", { status: 404 });

  const obj = await context.env.BUCKET.get(row.r2_key);
  if (!obj) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  headers.set("Content-Type", row.mime || "image/jpeg");
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("Content-Disposition", "inline");
  headers.set("X-Robots-Tag", "noindex, noimageindex");

  return new Response(obj.body, { headers });
};
