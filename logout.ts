export interface Env { DB: D1Database; }
// Force 401 with different realm to drop cached Basic Auth (as much as browsers allow).
export const onRequestGet: PagesFunction<Env> = async () => {
  return new Response("Logged out", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="zentique logged out"' }
  });
};
