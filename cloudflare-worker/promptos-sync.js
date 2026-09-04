import {
  PROMPTOS_STATE_POLICY,
  promptOSStateFingerprint,
  sha256Hex,
  validatePromptOSStateText,
} from '../src/promptos-state-schema.mjs';

const STATE_KEY = 'state';
const SOURCE_SHA_RE = /^[0-9a-f]{40}$/;

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
  });
}

function etagFor(record) {
  if (!record) return '"promptos-v0-empty"';
  return `"promptos-v${record.revision}-${record.fingerprint}"`;
}

async function bearerAuthorized(request, expectedSecret) {
  if (typeof expectedSecret !== 'string' || expectedSecret.length < 16) return false;
  const supplied = request.headers.get('authorization');
  if (typeof supplied !== 'string' || !supplied.startsWith('Bearer ')) return false;
  const candidate = supplied.slice('Bearer '.length);
  if (!candidate) return false;
  const [candidateHash, expectedHash] = await Promise.all([
    sha256Hex(candidate),
    sha256Hex(expectedSecret),
  ]);
  let diff = 0;
  for (let index = 0; index < expectedHash.length; index += 1) {
    diff |= candidateHash.charCodeAt(index) ^ expectedHash.charCodeAt(index);
  }
  return diff === 0;
}

function allowedOrigin(env) {
  if (typeof env.PROMPTOS_ALLOWED_ORIGIN !== 'string' || !env.PROMPTOS_ALLOWED_ORIGIN) return null;
  try {
    const url = new URL(env.PROMPTOS_ALLOWED_ORIGIN);
    return url.origin === env.PROMPTOS_ALLOWED_ORIGIN ? url.origin : null;
  } catch {
    return null;
  }
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, If-Match, X-PromptOS-Source-Sha',
    'Access-Control-Expose-Headers': 'ETag',
    'Vary': 'Origin',
  };
}

function withCors(response, origin) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders(origin))) headers.set(key, value);
  return new Response(response.body, {status: response.status, statusText: response.statusText, headers});
}

export class PromptOSStateStore {
  constructor(ctx) {
    this.ctx = ctx;
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname !== '/state') return json({error: 'not_found'}, 404);

    if (request.method === 'GET') {
      const record = await this.ctx.storage.get(STATE_KEY);
      if (!record) {
        return json({
          state: null,
          revision: 0,
          fingerprint: null,
          sourceSha: null,
        }, 200, {'ETag': etagFor(null)});
      }
      return json({
        state: record.state,
        revision: record.revision,
        fingerprint: record.fingerprint,
        sourceSha: record.sourceSha,
      }, 200, {'ETag': etagFor(record)});
    }

    if (request.method === 'PUT') {
      const current = await this.ctx.storage.get(STATE_KEY);
      const expectedEtag = etagFor(current || null);
      const providedEtag = request.headers.get('if-match');
      if (!providedEtag) return json({error: 'precondition_required'}, 428, {'ETag': expectedEtag});
      if (providedEtag !== expectedEtag) return json({error: 'state_conflict'}, 412, {'ETag': expectedEtag});

      const sourceSha = request.headers.get('x-promptos-source-sha');
      if (!SOURCE_SHA_RE.test(sourceSha || '')) return json({error: 'invalid_source_sha'}, 400, {'ETag': expectedEtag});

      const body = await request.text();
      if (new TextEncoder().encode(body).byteLength > PROMPTOS_STATE_POLICY.maxBytes) {
        return json({error: 'payload_too_large'}, 413, {'ETag': expectedEtag});
      }

      let state;
      try {
        state = validatePromptOSStateText(body);
      } catch (error) {
        return json({error: 'invalid_state', detail: error.message}, 400, {'ETag': expectedEtag});
      }

      const fingerprint = await promptOSStateFingerprint(state);
      const record = {
        state,
        revision: (current?.revision || 0) + 1,
        fingerprint,
        sourceSha,
        updatedAt: new Date().toISOString(),
      };
      await this.ctx.storage.put(STATE_KEY, record);
      const nextEtag = etagFor(record);
      return json({
        revision: record.revision,
        fingerprint: record.fingerprint,
        sourceSha: record.sourceSha,
      }, 200, {'ETag': nextEtag});
    }

    return json({error: 'method_not_allowed'}, 405, {'Allow': 'GET, PUT'});
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/health' && request.method === 'GET') {
      return json({
        ok: true,
        schemaVersion: PROMPTOS_STATE_POLICY.schemaVersion,
        persistence: 'staged-disabled-until-proof',
      });
    }

    if (url.pathname !== '/state') return json({error: 'not_found'}, 404);

    const origin = allowedOrigin(env);
    if (!origin) return json({error: 'provider_origin_not_configured'}, 503);
    const requestOrigin = request.headers.get('origin');
    if (requestOrigin && requestOrigin !== origin) return json({error: 'origin_denied'}, 403);

    if (request.method === 'OPTIONS') {
      return new Response(null, {status: 204, headers: corsHeaders(origin)});
    }
    if (request.method !== 'GET' && request.method !== 'PUT') {
      return withCors(json({error: 'method_not_allowed'}, 405, {'Allow': 'GET, PUT, OPTIONS'}), origin);
    }

    if (!(await bearerAuthorized(request, env.PROMPTOS_SYNC_SECRET))) {
      return withCors(json({error: 'unauthorized'}, 401), origin);
    }
    if (!env.PROMPTOS_STATE || typeof env.PROMPTOS_STATE.idFromName !== 'function') {
      return withCors(json({error: 'state_binding_unavailable'}, 503), origin);
    }

    const id = env.PROMPTOS_STATE.idFromName('primary');
    const response = await env.PROMPTOS_STATE.get(id).fetch(request);
    return withCors(response, origin);
  },
};
