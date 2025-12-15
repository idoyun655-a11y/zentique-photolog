export interface Env { DB: D1Database; }
export const onRequestGet: PagesFunction<Env> = async () => Response.json({ ok: true });
