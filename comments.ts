export interface Env {
  DB: D1Database;
}

function intParam(url: URL, key: string, def: number): number {
  const v = url.searchParams.get(key);
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) ? n : def;
}

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,"0")).join("");
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const id = context.params.id as string;
  const url = new URL(context.request.url);
  const limit = Math.max(1, Math.min(50, intParam(url, "limit", 30)));

  const res = await context.env.DB.prepare(
    "SELECT id, name, body, created_at FROM comments WHERE post_id = ? ORDER BY created_at DESC LIMIT ?"
  ).bind(id, limit).all();

  const items = (res.results || []).map((r: any) => ({
    id: r.id,
    name: r.name,
    body: r.body,
    created_at: r.created_at
  }));

  return Response.json({ items });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const id = context.params.id as string;

  const post = await context.env.DB.prepare("SELECT id FROM posts WHERE id = ?").bind(id).first();
  if (!post) return new Response("Not found", { status: 404 });

  const body = await context.request.json().catch(() => ({})) as any;

  // honeypot
  if (String(body.hp || "").trim()) return new Response("ok", { status: 200 });

  const name = String(body.name || "").trim().slice(0, 30);
  const text = String(body.body || "").trim().slice(0, 500);

  if (!text) return new Response("comment required", { status: 400 });

  const commentId = crypto.randomUUID();
  const created_at = Date.now();

  const ip = context.request.headers.get("CF-Connecting-IP") || "";
  const ua = context.request.headers.get("User-Agent") || "";
  const ip_hash = ip ? await sha256Hex(ip) : null;

  await context.env.DB.prepare(
    "INSERT INTO comments (id, post_id, name, body, created_at, ip_hash, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).bind(commentId, id, name, text, created_at, ip_hash, ua.slice(0, 200)).run();

  return Response.json({ ok: true, id: commentId });
};
