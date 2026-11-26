import { sendFcrObservation } from './federated-relay.mjs';

const CONTRACT = 'promptos/github-app@v2';
const MAX_WEBHOOK_BYTES = 1024 * 1024;
const textEncoder = new TextEncoder();

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}

function hexToBytes(hex) {
  if (!/^[a-f0-9]+$/i.test(hex) || hex.length % 2 !== 0) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

export async function verifyWebhookSignature(payloadBytes, signatureHeader, secret) {
  if (typeof signatureHeader !== 'string' || !signatureHeader.startsWith('sha256=')) return false;
  const signature = hexToBytes(signatureHeader.slice('sha256='.length));
  if (!signature || signature.length !== 32) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  return crypto.subtle.verify('HMAC', key, signature, payloadBytes);
}

export function registrationTemplate(origin) {
  return {
    contract: CONTRACT,
    name: 'PromptOS',
    url: 'https://github.com/jussray/promptos',
    webhook_url: origin + '/github/webhook',
    setup_url: origin + '/github/setup',
    public: false,
    permissions: {
      actions: 'read',
      contents: 'read',
      issues: 'read',
      pull_requests: 'read',
    },
    events: ['issue_comment', 'pull_request', 'workflow_run'],
    required_runtime_secrets: [
      'GITHUB_WEBHOOK_SECRET',
      'PROMPTOS_RELAY_PRIVATE_KEY_JWK',
    ],
    required_runtime_variables: [
      'PROMPTOS_RELAY_KEY_ID',
      'PROMPTOS_GIT_SHA',
      'FCR_RELAY_TARGET_SHA',
    ],
    explicitly_not_granted: [
      'contents:write',
      'issues:write',
      'pull_requests:write',
      'actions:write',
      'workflows:write',
      'administration',
      'secrets',
      'deployments',
      'merge',
      'billing',
      'publication',
    ],
  };
}

async function handleWebhook(request, env) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_WEBHOOK_BYTES) return json({ ok: false, error: 'payload-too-large' }, 413);

  const payloadBuffer = await request.arrayBuffer();
  if (payloadBuffer.byteLength > MAX_WEBHOOK_BYTES) return json({ ok: false, error: 'payload-too-large' }, 413);
  const payloadBytes = new Uint8Array(payloadBuffer);

  const secret = typeof env.GITHUB_WEBHOOK_SECRET === 'string' ? env.GITHUB_WEBHOOK_SECRET.trim() : '';
  if (!secret) return json({ ok: false, error: 'runtime-not-configured' }, 503);

  const signatureOk = await verifyWebhookSignature(
    payloadBytes,
    request.headers.get('x-hub-signature-256'),
    secret,
  );
  if (!signatureOk) return json({ ok: false, error: 'invalid-webhook-signature' }, 401);

  const event = request.headers.get('x-github-event');
  const deliveryId = request.headers.get('x-github-delivery');
  if (!event || !deliveryId) return json({ ok: false, error: 'missing-github-event-metadata' }, 400);

  let payload;
  try {
    payload = JSON.parse(new TextDecoder().decode(payloadBytes));
  } catch {
    return json({ ok: false, error: 'invalid-json' }, 400);
  }

  if (event === 'ping') return json({ ok: true, contract: CONTRACT, action: 'ping-acknowledged' });
  if (!['issue_comment', 'pull_request', 'workflow_run'].includes(event)) {
    return json({ ok: true, contract: CONTRACT, action: 'event-not-subscribed' });
  }

  try {
    const relay = await sendFcrObservation({ env, event, payload, deliveryId });
    return json({
      ok: true,
      contract: CONTRACT,
      event,
      deliveryId,
      action: relay.action,
      relay,
      executionAuthorized: false,
      authorityTransferred: false,
      approvalCarriedForward: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown-error';
    const status = message.startsWith('missing-env:') || message.startsWith('invalid-env:') ? 503 : 502;
    return json({
      ok: false,
      contract: CONTRACT,
      event,
      deliveryId,
      error: message.slice(0, 180),
      executionAuthorized: false,
    }, status);
  }
}

export default {
  async fetch(request, env = {}) {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/health') {
      return json({
        ok: true,
        contract: CONTRACT,
        status: 'source-ready',
        authority: {
          read: ['actions', 'contents', 'issues', 'pull_requests'],
          write: [],
          forwards: ['signed_observations_to_founder_control_room'],
          denied: ['code_write', 'merge', 'deployment', 'workflow_write', 'secrets', 'billing', 'publication'],
        },
      });
    }

    if (request.method === 'GET' && url.pathname === '/github/registration') {
      return json(registrationTemplate(url.origin));
    }

    if (request.method === 'GET' && url.pathname === '/github/setup') {
      return json({
        ok: true,
        contract: CONTRACT,
        state: 'registration-and-relay-key-proof-required',
        message: 'Register the read-only GitHub App, install it only on jussray/promptos, provision the webhook and Ed25519 relay secrets, register the public relay key through FCR, then prove a signed observation receipt.',
        executionAuthorized: false,
      });
    }

    if (request.method === 'POST' && url.pathname === '/github/webhook') {
      return handleWebhook(request, env);
    }

    return json({ ok: false, error: 'not-found', contract: CONTRACT }, 404);
  },
};

export { CONTRACT };
