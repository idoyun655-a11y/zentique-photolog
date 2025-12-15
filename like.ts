export interface Env {
  DB: D1Database;
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


function makeClientId(): string {
  return crypto.randomUUID();
}

function setClientCookie(headers: Headers, clientId: string) {
  headers.append("Set-Cookie", `client_id=${encodeURIComponent(clientId)}; Path=/; Max-Age=31536000; SameSite=Lax`);
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const id = context.params.id as string;

  let clientId = getCookie(context.request, "client_id");
  const headers = new Headers();
  if (!clientId) {
    clientId = makeClientId();
    setClientCookie(headers, clientId);
  }

  const post = await context.env.DB.prepare("SELECT id FROM posts WHERE id = ?").bind(id).first();
  if (!post) return new Response("Not found", { status: 404, headers });

  const now = Date.now();

  const existing = await context.env.DB.prepare(
    "SELECT 1 FROM likes WHERE post_id = ? AND client_id = ?"
  ).bind(id, clientId).first();

  let liked: boolean;

  if (existing) {
    await context.env.DB.prepare(
      "DELETE FROM likes WHERE post_id = ? AND client_id = ?"
    ).bind(id, clientId).run();

    await context.env.DB.prepare(
      "UPDATE posts SET like_count = CASE WHEN like_count > 0 THEN like_count - 1 ELSE 0 END WHERE id = ?"
    ).bind(id).run();

    liked = false;
  } else {
    await context.env.DB.prepare(
      "INSERT OR IGNORE INTO likes (post_id, client_id, created_at) VALUES (?, ?, ?)"
    ).bind(id, clientId, now).run();

    await context.env.DB.prepare(
      "UPDATE posts SET like_count = like_count + 1 WHERE id = ?"
    ).bind(id).run();

    liked = true;
  }

  const row = await context.env.DB.prepare(
    "SELECT like_count FROM posts WHERE id = ?"
  ).bind(id).first() as any;

  return new Response(JSON.stringify({ liked, like_count: row?.like_count ?? 0 }), {
    headers: {
      ...Object.fromEntries(headers.entries()),
      "Content-Type": "application/json"
    }
  });
};
