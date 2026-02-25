import jwt from "jsonwebtoken";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/health") return new Response("ok");
    if (url.pathname === "/ws") return this.handleWs(request, env, ctx);
    if (request.method === "OPTIONS") return new Response(null, { status: 204 });
    if (url.pathname === "/api/announcements" && request.method === "GET") {
      const data = await env.DB.prepare("SELECT * FROM announcements ORDER BY timestamp DESC").all();
      return json(data.results);
    }
    if (url.pathname === "/api/students" && request.method === "GET") {
      await requireAuth(request, env);
      const q = url.searchParams.get("q");
      if (q) {
        const data = await env.DB.prepare("SELECT * FROM students WHERE id LIKE ? OR email LIKE ? OR first_name || ' ' || last_name LIKE ? LIMIT 100").bind(`%${q}%`, `%${q}%`, `%${q}%`).all();
        return json(data.results);
      }
      const cacheKey = new Request(url.toString(), { method: "GET" });
      const cache = caches.default;
      const cached = await cache.match(cacheKey);
      if (cached) return cached;
      const data = await env.DB.prepare("SELECT * FROM students LIMIT 500").all();
      const resp = json(data.results);
      resp.headers.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
      ctx.waitUntil(cache.put(cacheKey, resp.clone()));
      return resp;
    }
    if (url.pathname === "/api/courses" && request.method === "GET") {
      await requireAuth(request, env);
      const data = await env.DB.prepare("SELECT * FROM courses").all();
      return json(data.results);
    }
    if (url.pathname === "/api/enrollments" && request.method === "POST") {
      await requireAuth(request, env);
      const body = await request.json();
      const id = crypto.randomUUID();
      await env.DB.prepare("INSERT INTO enrollments (id, student_id, course_id, semester) VALUES (?, ?, ?, ?)").bind(id, body.student_id, body.course_id, body.semester).run();
      ctx.waitUntil(broadcast(env, { type: "enrollment_created", id, student_id: body.student_id, course_id: body.course_id }));
      return json({ id });
    }
    if (url.pathname === "/api/grades" && request.method === "POST") {
      await requireAuth(request, env);
      const body = await request.json();
      const id = crypto.randomUUID();
      await env.DB.prepare("INSERT INTO grades (id, enrollment_id, grade) VALUES (?, ?, ?)").bind(id, body.enrollment_id, body.grade).run();
      ctx.waitUntil(broadcast(env, { type: "grade_recorded", id, enrollment_id: body.enrollment_id, grade: body.grade }));
      return json({ id });
    }
    return new Response("not found", { status: 404 });
  },
  async scheduled(event, env, ctx) {
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const key = `d1-backup-${ts}.json`;
    const rows1 = await env.DB.prepare("SELECT * FROM students").all();
    const rows2 = await env.DB.prepare("SELECT * FROM courses").all();
    const rows3 = await env.DB.prepare("SELECT * FROM enrollments").all();
    const rows4 = await env.DB.prepare("SELECT * FROM grades").all();
    const rows5 = await env.DB.prepare("SELECT * FROM announcements").all();
    const payload = JSON.stringify({ students: rows1.results, courses: rows2.results, enrollments: rows3.results, grades: rows4.results, announcements: rows5.results });
    await env.BACKUPS.put(key, payload, { httpMetadata: { contentType: "application/json" } });
  },
  async handleWs(request, env, ctx) {
    const [client, server] = Object.values(new WebSocketPair());
    const id = crypto.randomUUID();
    const state = env.SYNC_HUB.idFromName("global");
    const stub = env.SYNC_HUB.get(state);
    await stub.fetch("http://sync/connect", { headers: { "x-conn-id": id }, webSocket: server });
    return new Response(null, { status: 101, webSocket: client });
  },
};

class SyncHub {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sockets = new Map();
  }
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/connect") {
      const id = request.headers.get("x-conn-id");
      const pair = request.webSocket;
      pair.accept();
      this.sockets.set(id, pair);
      pair.addEventListener("close", () => this.sockets.delete(id));
      return new Response(null, { status: 101, webSocket: pair });
    }
    if (url.pathname === "/broadcast") {
      const payload = await request.text();
      for (const [, ws] of this.sockets) {
        try { ws.send(payload); } catch {}
      }
      return new Response("ok");
    }
    return new Response("nf", { status: 404 });
  }
}

function json(data, status = 200) {
  const resp = new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
  return resp;
}

async function requireAuth(request, env) {
  const h = request.headers.get("authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) throw new Response("unauthorized", { status: 401 });
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { issuer: env.JWT_ISS, audience: env.JWT_AUD });
    return decoded;
  } catch {
    throw new Response("forbidden", { status: 403 });
  }
}

async function broadcast(env, msg) {
  const id = env.SYNC_HUB.idFromName("global");
  const stub = env.SYNC_HUB.get(id);
  await stub.fetch("http://sync/broadcast", { method: "POST", body: JSON.stringify(msg) });
}

export { SyncHub };
