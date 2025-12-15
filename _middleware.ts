export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  ADMIN_USER?: string;
  ADMIN_PASS?: string;
}

function withSecurityHeaders(resp: Response): Response {
  const h = new Headers(resp.headers);
  h.set("X-Content-Type-Options", "nosniff");
  h.set("X-Frame-Options", "DENY");
  h.set("Referrer-Policy", "no-referrer");
  h.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  h.set("Content-Security-Policy", "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'");
  return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers: h });
}

function parseBasicAuth(header: string | null): { user: string; pass: string } | null {
  if (!header) return null;
  const m = header.match(/^Basic\s+(.+)$/i);
  if (!m) return null;
  try {
    const decoded = atob(m[1]);
    const i = decoded.indexOf(":");
    if (i < 0) return null;
    return { user: decoded.slice(0, i), pass: decoded.slice(i + 1) };
  } catch {
    return null;
  }
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const path = url.pathname;

  const needsAuth = path.startsWith("/admin") || path.startsWith("/api/admin");
  if (needsAuth) {
    const user = context.env.ADMIN_USER;
    const pass = context.env.ADMIN_PASS;

    if (!user || !pass) {
      return withSecurityHeaders(new Response("Admin credentials not configured. Set ADMIN_USER and ADMIN_PASS in Pages env.", { status: 403 }));
    }

    const creds = parseBasicAuth(context.request.headers.get("Authorization"));
    if (!creds || creds.user !== user || creds.pass !== pass) {
      return withSecurityHeaders(new Response("Auth required.", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="zentique admin"' } }));
    }
  }

  const resp = await context.next();
  return withSecurityHeaders(resp);
};
