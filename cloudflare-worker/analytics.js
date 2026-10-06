import { invokeProvider, providerStates } from './providers.js';
import { executeOptimizerExperiment } from './optimizer-executor.js';
import { compileCourtHandoff } from '../src/court-compiler.mjs';

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
const FULL_SHA = /^[0-9a-f]{40}$/i;
const RUNTIME_PROOF_MARKER = 'PROMPTOS_RUNTIME_PROOF_OK';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin' : 'https://jussray.github.io',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function providerAuthorized(request, env) {
  if (!env.PROMPTOS_AI_OPERATOR_KEY) return false;
  const bearer = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1];
  return (bearer || '') === env.PROMPTOS_AI_OPERATOR_KEY;
}


function releaseSha(env) {
  const candidates = [
    env?.PROMPTOS_RELEASE_SHA,
    env?.CF_PAGES_COMMIT_SHA,
    env?.WORKERS_CI_COMMIT_SHA,
    env?.GITHUB_SHA,
  ];
  for (const candidate of candidates) {
    const normalized = typeof candidate === 'string' ? candidate.trim().toLowerCase() : '';
    if (FULL_SHA.test(normalized)) return normalized;
  }
  return 'unknown';
}

function publicProviderStates(env) {
  return Object.fromEntries(
    Object.entries(providerStates(env)).map(([provider, state]) => [provider, {
      state: state.state,
      model: state.model,
    }]),
  );
}

async function runtimeProof(request, env) {
  const release = releaseSha(env);
  if (!FULL_SHA.test(release)) return json({ error: 'release identity unavailable' }, 503);

  const input = await request.json().catch(() => ({}));
  const provider = String(input?.provider || '').trim().toLowerCase();
  const states = providerStates(env);
  if (!provider || !states[provider]) return json({ error: 'unsupported provider' }, 400);
  if (states[provider].state === 'ABSENT') return json({ error: 'provider not configured' }, 503);

  try {
    const result = await invokeProvider(env, {
      provider,
      prompt: `Return exactly ${RUNTIME_PROOF_MARKER} and nothing else.`,
      sensitivity: 'standard',
    });
    if (result.text.trim() !== RUNTIME_PROOF_MARKER) {
      return json({ error: 'provider proof marker mismatch' }, 502);
    }
    return json({
      service: 'promptos',
      release_sha: release,
      provider: result.provider,
      model: result.model,
      response_id: result.responseId,
      evidence_ref: result.evidenceRef,
      provider_state: 'VERIFIED',
      authority: 'none',
    });
  } catch {
    return json({ error: 'provider proof failed' }, 503);
  }
}

export default {
  async fetch(request, env) {
    const url    = new URL(request.url);
    const method = request.method.toUpperCase();

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }


    if (url.pathname === '/runtime-identity' && method === 'GET') {
      if (!env.PROMPTOS_AI_OPERATOR_KEY) return json({ error: 'provider lane not configured' }, 503);
      if (!providerAuthorized(request, env)) return json({ error: 'unauthorized' }, 401);
      return json({
        service: 'promptos',
        release_sha: releaseSha(env),
        providers: publicProviderStates(env),
        authority: 'none',
      });
    }

    if (url.pathname === '/runtime-proof' && method === 'POST') {
      if (!env.PROMPTOS_AI_OPERATOR_KEY) return json({ error: 'provider lane not configured' }, 503);
      if (!providerAuthorized(request, env)) return json({ error: 'unauthorized' }, 401);
      return runtimeProof(request, env);
    }

    if (url.pathname === '/court/compile' && method === 'POST') {
      if (!env.PROMPTOS_AI_OPERATOR_KEY) return json({ error: 'court compiler lane not configured' }, 503);
      if (!providerAuthorized(request, env)) return json({ error: 'unauthorized' }, 401);
      const release = releaseSha(env);
      if (!FULL_SHA.test(release)) return json({ error: 'release identity unavailable' }, 503);
      const input = await request.json().catch(() => ({}));
      try {
        const result = compileCourtHandoff(input);
        return json({
          service: 'promptos',
          release_sha: release,
          result,
          authority: 'none',
        });
      } catch (error) {
        return json({
          error: error instanceof Error ? error.message : 'court compilation failed',
        }, 400);
      }
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

    if (url.pathname === '/optimizer/evaluate' && method === 'POST') {
      if (!env.PROMPTOS_AI_OPERATOR_KEY) return json({ error: 'optimizer lane not configured' }, 503);
      if (!providerAuthorized(request, env)) return json({ error: 'unauthorized' }, 401);
      const input = await request.json().catch(() => ({}));
      try {
        const result = await executeOptimizerExperiment(env, input);
        return json({ service: 'promptos', result });
      } catch (error) {
        return json({ error: error instanceof Error ? error.message : 'optimizer evaluation failed' }, 503);
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
