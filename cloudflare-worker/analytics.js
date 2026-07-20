/**
 * PromptOS Analytics Worker
 * Deploy to Cloudflare Workers. Requires a KV namespace bound as ANALYTICS_KV.
 *
 * Setup steps:
 *   1. Create a KV namespace in Cloudflare dashboard — name it "ANALYTICS_KV"
 *   2. Create a new Worker and paste this file
 *   3. In the Worker settings → Variables → KV Namespace Bindings:
 *      Variable name: ANALYTICS_KV  → KV namespace: (the one you just created)
 *   4. Copy the Worker URL (e.g. https://promptos-analytics.your-subdomain.workers.dev)
 *   5. Paste it into ANALYTICS_ENDPOINT in parts/auth.js
 *
 * Endpoints:
 *   POST /event   { event: "guest_session_started" | "google_signin_success" | "guest_to_google_upgrade" }
 *   GET  /totals  → { guest_session_started: N, google_signin_success: N, guest_to_google_upgrade: N }
 *
 * No personal data is stored. Only event names and integer counters.
 */

const ALLOWED_EVENTS = [
  'guest_session_started',
  'google_signin_success',
  'guest_to_google_upgrade',
];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin' : 'https://jussray.github.io',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    const url    = new URL(request.url);
    const method = request.method.toUpperCase();

    /* ── CORS preflight ──────────────────────────────────────────────── */
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    /* ── POST /event — increment a counter ──────────────────────────────── */
    if (method === 'POST' && url.pathname === '/event') {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: 'invalid JSON' }, 400);
      }

      const event = body && body.event;
      if (!event || !ALLOWED_EVENTS.includes(event)) {
        return json({ error: 'unknown event' }, 400);
      }

      /* Read current count, increment, write back */
      const current = parseInt((await env.ANALYTICS_KV.get(event)) || '0', 10);
      await env.ANALYTICS_KV.put(event, String(current + 1));

      return json({ ok: true, event, total: current + 1 });
    }

    /* ── GET /totals — return all counters ─────────────────────────────── */
    if (method === 'GET' && url.pathname === '/totals') {
      const counts = {};
      await Promise.all(
        ALLOWED_EVENTS.map(async (e) => {
          counts[e] = parseInt((await env.ANALYTICS_KV.get(e)) || '0', 10);
        })
      );
      return json(counts);
    }

    /* ── Catch-all ─────────────────────────────────────────────────────────────── */
    return json({ error: 'not found' }, 404);
  },
};

/* Helper */
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
