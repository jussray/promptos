import { invokeProvider, providerStates } from './providers.js';

/**
 * PromptOS Analytics + bounded provider Worker.
 * Analytics remains public-safe. Provider execution is separately protected by
 * PROMPTOS_AI_OPERATOR_KEY and never becomes part of the free client layer.
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

function providerAuthorized(request, env) {
  if (!env.PROMPTOS_AI_OPERATOR_KEY) return false;
  const bearer = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1];
  return (bearer || '') === env.PROMPTOS_AI_OPERATOR_KEY;
}

export default {
  async fetch(request, env) {
    const url    = new URL(request.url);
    const method = request.method.toUpperCase();

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (url.pathname === '/providers' && method === 'GET') {
      if (!env.PROMPTOS_AI_OPERATOR_KEY) return json({ error: 'provider lane not configured' }, 503);
      if (!providerAuthorized(request, env)) return json({ error: 'unauthorized' }, 401);
      return json({ service: 'promptos', providers: providerStates(env), authority: 'none' });
    }

    if (url.pathname === '/providers' && method === 'POST') {
      if (!env.PROMPTOS_AI_OPERATOR_KEY) return json({ error: 'provider lane not configured' }, 503);
      if (!providerAuthorized(request, env)) return json({ error: 'unauthorized' }, 401);
      const input = await request.json().catch(() => ({}));
      try {
        const result = await invokeProvider(env, input);
        return json({ service: 'promptos', result });
      } catch (error) {
        return json({ error: error instanceof Error ? error.message : 'provider invocation failed' }, 503);
      }
    }

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

      const current = parseInt((await env.ANALYTICS_KV.get(event)) || '0', 10);
      await env.ANALYTICS_KV.put(event, String(current + 1));

      return json({ ok: true, event, total: current + 1 });
    }

    if (method === 'GET' && url.pathname === '/totals') {
      const counts = {};
      await Promise.all(
        ALLOWED_EVENTS.map(async (e) => {
          counts[e] = parseInt((await env.ANALYTICS_KV.get(e)) || '0', 10);
        })
      );
      return json(counts);
    }

    return json({ error: 'not found' }, 404);
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
