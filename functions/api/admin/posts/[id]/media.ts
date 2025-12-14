export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
}

function asInt(v: FormDataEntryValue | null): number | null {
  if (v === null) return null;
  const n = Number(String(v));
  return Number.isFinite(n) ? n : null;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const postId = context.params.id as string;

  const post = await context.env.DB.prepare(
    "SELECT id, cover_media_id FROM posts WHERE id = ?"
  ).bind(postId).first() as any;

  if (!post) return new Response("post not found", { status: 404 });

  const form = await context.request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) return new Response("file required", { status: 400 });

  const width = asInt(form.get("width"));
  const height = asInt(form.get("height"));

  const mediaId = crypto.randomUUID();
  const created_at = Date.now();
  const key = `p/${postId}/${mediaId}.jpg`;

  await context.env.BUCKET.put(key, file.stream(), {
    httpMetadata: { contentType: file.type || "image/jpeg" },
    customMetadata: { postId, mediaId, wm: "zentique" },
  });

  await context.env.DB.prepare(
    "INSERT INTO media (id, post_id, r2_key, mime, width, height, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).bind(
    mediaId,
    postId,
    key,
    file.type || "image/jpeg",
    width,
    height,
    created_at
  ).run();

  if (!post.cover_media_id) {
    await context.env.DB.prepare(
      "UPDATE posts SET cover_media_id = ? WHERE id = ? AND cover_media_id IS NULL"
    ).bind(mediaId, postId).run();
  }

  return Response.json({ id: mediaId, postId, url: `/api/media/${mediaId}` });
};
