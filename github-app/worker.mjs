const CONTRACT = 'promptos/github-app@v1';
const GITHUB_API = 'https://api.github.com';
const API_VERSION = '2022-11-28';
const MAX_WEBHOOK_BYTES = 1024 * 1024;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders,
    },
  });
}

function requiredEnv(env, name) {
  const value = env?.[name];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`missing-env:${name}`);
  }
  return value;
}

function hexToBytes(hex) {
  if (!/^[a-f0-9]+$/i.test(hex) || hex.length % 2 !== 0) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

async function verifyWebhookSignature(payloadBytes, signatureHeader, secret) {
  if (!signatureHeader?.startsWith('sha256=')) return false;
  const signature = hexToBytes(signatureHeader.slice('sha256='.length));
  if (!signature) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );

  return crypto.subtle.verify('HMAC', key, signature, payloadBytes);
}

function pemToBytes(pem) {
  const normalized = pem.replace(/\\n/g, '\n');
  const base64 = normalized
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  if (!base64) throw new Error('invalid-private-key');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function jsonToBase64Url(value) {
  return bytesToBase64Url(textEncoder.encode(JSON.stringify(value)));
}

async function createAppJwt(env) {
  const appId = requiredEnv(env, 'GITHUB_APP_ID');
  const privateKeyPem = requiredEnv(env, 'GITHUB_APP_PRIVATE_KEY');
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToBytes(privateKeyPem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const now = Math.floor(Date.now() / 1000);
  const header = jsonToBase64Url({ alg: 'RS256', typ: 'JWT' });
  const payload = jsonToBase64Url({ iat: now - 60, exp: now + 9 * 60, iss: appId });
  const signingInput = `${header}.${payload}`;
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    textEncoder.encode(signingInput),
  );
  return `${signingInput}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

async function githubRequest(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${GITHUB_API}${path}`, {
    method,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'x-github-api-version': API_VERSION,
      'user-agent': 'promptos-github-app',
      ...(body ? { 'content-type': 'application/json; charset=utf-8' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`github-api:${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function getInstallationToken(env, installationId) {
  const appJwt = await createAppJwt(env);
  const result = await githubRequest(`/app/installations/${installationId}/access_tokens`, {
    method: 'POST',
    token: appJwt,
  });
  if (!result?.token) throw new Error('github-api:missing-installation-token');
  return result.token;
}

function receiptMarker(deliveryId) {
  return `<!-- promptos-delivery:${deliveryId} -->`;
}

async function commentExists(token, repository, issueNumber, marker) {
  const comments = await githubRequest(
    `/repos/${repository}/issues/${issueNumber}/comments?per_page=100&sort=created&direction=desc`,
    { token },
  );
  return Array.isArray(comments) && comments.some((comment) => String(comment?.body || '').includes(marker));
}

async function postIssueComment(token, repository, issueNumber, body) {
  return githubRequest(`/repos/${repository}/issues/${issueNumber}/comments`, {
    method: 'POST',
    token,
    body: { body },
  });
}

function statusComment({ marker, deliveryId, event, repository, installationId }) {
  return `${marker}\n### PromptOS GitHub App\n\n**REALITY:** GitHub delivered a signed \`${event}\` webhook and PromptOS authenticated as installation \`${installationId}\` for \`${repository}\`.\n\n**AUTHORITY:** this v1 app can read Actions, repository contents, and pull-request state, and can write issue/PR conversation comments. It has **no code-write, merge, deployment, workflow-write, secret, billing, or publication authority**.\n\n**PROOF:** webhook delivery \`${deliveryId}\`; contract \`${CONTRACT}\`.\n\n**NEXT GATE:** use \`/promptos status\` for another live receipt. Failure auto-comments remain off unless the deployed runtime explicitly sets \`PROMPTOS_COMMENT_ON_FAILURES=true\`.\n`;
}

async function handlePromptCommand(env, payload, deliveryId, event) {
  if (payload?.action !== 'created') return { action: 'ignored-non-created-comment' };
  if (payload?.sender?.type === 'Bot') return { action: 'ignored-bot-comment' };

  const body = String(payload?.comment?.body || '').trim();
  if (!body.startsWith('/promptos')) return { action: 'ignored-non-command' };
  if (!['/promptos', '/promptos status', '/promptos help'].includes(body.toLowerCase())) {
    return { action: 'ignored-unknown-command' };
  }

  const installationId = payload?.installation?.id;
  const repository = payload?.repository?.full_name;
  const issueNumber = payload?.issue?.number;
  if (!installationId || !repository || !issueNumber) throw new Error('invalid-command-payload');

  const token = await getInstallationToken(env, installationId);
  const marker = receiptMarker(deliveryId);
  if (await commentExists(token, repository, issueNumber, marker)) {
    return { action: 'duplicate-delivery-skipped', repository, issueNumber };
  }

  const comment = statusComment({ marker, deliveryId, event, repository, installationId });
  await postIssueComment(token, repository, issueNumber, comment);
  return { action: 'status-commented', repository, issueNumber };
}

async function handleWorkflowRun(env, payload, deliveryId) {
  if (payload?.action !== 'completed') return { action: 'workflow-observed' };
  const run = payload?.workflow_run;
  if (!run || run.conclusion === 'success' || run.conclusion === 'neutral' || run.conclusion === 'skipped') {
    return { action: 'workflow-nonfailure-observed' };
  }

  if (env?.PROMPTOS_COMMENT_ON_FAILURES !== 'true') {
    return { action: 'workflow-failure-observed', commentMode: 'disabled' };
  }

  const installationId = payload?.installation?.id;
  const repository = payload?.repository?.full_name;
  const pullRequests = Array.isArray(run.pull_requests) ? run.pull_requests.slice(0, 3) : [];
  if (!installationId || !repository || pullRequests.length === 0) {
    return { action: 'workflow-failure-observed', commentMode: 'no-linked-pr' };
  }

  const token = await getInstallationToken(env, installationId);
  const results = [];
  for (const pullRequest of pullRequests) {
    const issueNumber = pullRequest?.number;
    if (!issueNumber) continue;
    const marker = `<!-- promptos-workflow:${run.id}:${deliveryId} -->`;
    if (await commentExists(token, repository, issueNumber, marker)) {
      results.push({ issueNumber, action: 'duplicate-skipped' });
      continue;
    }
    const body = `${marker}\n### PromptOS failure receipt\n\n**REALITY:** workflow \`${run.name || run.id}\` completed with \`${run.conclusion}\`.\n\n**PROOF:** run ${run.html_url || '(URL unavailable)'}; delivery \`${deliveryId}\`.\n\n**AUTHORITY:** observed failure only. No code, merge, deployment, workflow, or secret mutation was performed.\n\n**NEXT GATE:** investigate the exact failed job/logs before proposing a focused repair.\n`;
    await postIssueComment(token, repository, issueNumber, body);
    results.push({ issueNumber, action: 'failure-commented' });
  }

  return { action: 'workflow-failure-comment-processing', results };
}

function registrationTemplate(origin) {
  return {
    contract: CONTRACT,
    name: 'PromptOS',
    url: 'https://github.com/jussray/promptos',
    webhook_url: `${origin}/github/webhook`,
    setup_url: `${origin}/github/setup`,
    public: false,
    permissions: {
      actions: 'read',
      contents: 'read',
      issues: 'write',
      pull_requests: 'read',
    },
    events: ['issue_comment', 'pull_request', 'workflow_run'],
    required_runtime_secrets: ['GITHUB_APP_ID', 'GITHUB_APP_PRIVATE_KEY', 'GITHUB_WEBHOOK_SECRET'],
    optional_runtime_flags: ['PROMPTOS_COMMENT_ON_FAILURES'],
  };
}

async function handleWebhook(request, env) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_WEBHOOK_BYTES) return json({ ok: false, error: 'payload-too-large' }, 413);

  const payloadBuffer = await request.arrayBuffer();
  if (payloadBuffer.byteLength > MAX_WEBHOOK_BYTES) return json({ ok: false, error: 'payload-too-large' }, 413);

  const payloadBytes = new Uint8Array(payloadBuffer);
  let webhookSecret;
  try {
    webhookSecret = requiredEnv(env, 'GITHUB_WEBHOOK_SECRET');
  } catch {
    return json({ ok: false, error: 'runtime-not-configured' }, 503);
  }

  const signatureOk = await verifyWebhookSignature(
    payloadBytes,
    request.headers.get('x-hub-signature-256'),
    webhookSecret,
  );
  if (!signatureOk) return json({ ok: false, error: 'invalid-webhook-signature' }, 401);

  const event = request.headers.get('x-github-event');
  const deliveryId = request.headers.get('x-github-delivery');
  if (!event || !deliveryId) return json({ ok: false, error: 'missing-github-event-metadata' }, 400);

  let payload;
  try {
    payload = JSON.parse(textDecoder.decode(payloadBytes));
  } catch {
    return json({ ok: false, error: 'invalid-json' }, 400);
  }

  try {
    let result = { action: 'event-observed' };
    if (event === 'ping') result = { action: 'ping-acknowledged' };
    if (event === 'issue_comment') result = await handlePromptCommand(env, payload, deliveryId, event);
    if (event === 'workflow_run') result = await handleWorkflowRun(env, payload, deliveryId);
    if (event === 'pull_request') result = { action: 'pull-request-observed', pullRequest: payload?.pull_request?.number || null };

    return json({ ok: true, contract: CONTRACT, event, deliveryId, ...result }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown-error';
    const status = message.startsWith('missing-env:') ? 503 : message.startsWith('github-api:') ? 502 : 400;
    return json({ ok: false, contract: CONTRACT, event, deliveryId, error: message }, status);
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
          read: ['actions', 'contents', 'pull_requests'],
          write: ['issue_and_pr_conversation_comments'],
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
        state: 'registration-requires-provider-proof',
        message: 'Configure the three runtime secrets in the deployed Worker, install the GitHub App on selected repositories, then prove a signed /promptos status receipt before widening authority.',
      });
    }

    if (request.method === 'POST' && url.pathname === '/github/webhook') {
      return handleWebhook(request, env);
    }

    return json({ ok: false, error: 'not-found', contract: CONTRACT }, 404);
  },
};

export { CONTRACT, registrationTemplate, verifyWebhookSignature };
