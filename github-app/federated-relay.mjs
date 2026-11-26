const RELAY_CONTRACT = 'juss/federated-agent-relay@v3';
const RELAY_URL = 'https://api.foundercontrolroom.org/api/federated-relay/v3';
const SOURCE_MEMBER = 'promptos';
const SOURCE_REPOSITORY = 'jussray/promptos';
const TARGET_MEMBER = 'founder-control-room';
const TARGET_REPOSITORY = 'jussray/founder-control-room';
const GENESIS_PROOF_COOKIE = 'Q4R:v3:genesis:promptos';
const encoder = new TextEncoder();
const SHA40 = /^[0-9a-f]{40}$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY_ID = /^[A-Za-z0-9:._-]{3,200}$/;

function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function canonicalize(value) {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('relay-json-non-finite-number');
    return JSON.stringify(value);
  }
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
  if (record(value)) {
    const keys = Object.keys(value).sort();
    return '{' + keys.map((key) => {
      const child = value[key];
      if (child === undefined || typeof child === 'function' || typeof child === 'symbol' || typeof child === 'bigint') {
        throw new Error('relay-json-non-json-value');
      }
      return JSON.stringify(key) + ':' + canonicalize(child);
    }).join(',') + '}';
  }
  throw new Error('relay-json-non-json-value');
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function required(env, name) {
  const value = env && env[name];
  if (typeof value !== 'string' || value.trim() === '') throw new Error('missing-env:' + name);
  return value.trim();
}

function exactSha(value, name) {
  if (!SHA40.test(value)) throw new Error('invalid-env:' + name);
  return value.toLowerCase();
}

function stableUuidFromHex(hex) {
  const bytes = Uint8Array.from(hex.slice(0, 32).match(/.{2}/g), (part) => parseInt(part, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const value = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return value.slice(0, 8) + '-' + value.slice(8, 12) + '-' + value.slice(12, 16) + '-' + value.slice(16, 20) + '-' + value.slice(20);
}

async function stableDeliveryIds(deliveryId) {
  const [chain, operation, nonce, sequence] = await Promise.all([
    sha256Hex('promptos-relay-v3:chain:' + deliveryId),
    sha256Hex('promptos-relay-v3:operation:' + deliveryId),
    sha256Hex('promptos-relay-v3:nonce:' + deliveryId),
    sha256Hex('promptos-relay-v3:sequence:' + deliveryId),
  ]);
  return {
    chainId: stableUuidFromHex(chain),
    logicalOperationId: stableUuidFromHex(operation),
    nonce: stableUuidFromHex(nonce),
    sourceSequence: Number(BigInt('0x' + sequence.slice(0, 13))),
  };
}

function eventTimestamp(event, payload) {
  const issueComment = record(payload.comment) ? payload.comment : {};
  const pullRequest = record(payload.pull_request) ? payload.pull_request : {};
  const workflowRun = record(payload.workflow_run) ? payload.workflow_run : {};
  const raw = event === 'issue_comment'
    ? (issueComment.updated_at || issueComment.created_at)
    : event === 'pull_request'
      ? (pullRequest.updated_at || pullRequest.created_at)
      : (workflowRun.updated_at || workflowRun.created_at);
  const time = typeof raw === 'string' ? Date.parse(raw) : Number.NaN;
  if (!Number.isFinite(time)) throw new Error('relay-event-timestamp-missing');
  return new Date(time);
}

function safeCommand(body) {
  const value = typeof body === 'string' ? body.trim().toLowerCase() : '';
  if (value === '/promptos' || value === '/promptos status' || value === '/promptos help') return value;
  return value.startsWith('/promptos') ? 'unrecognized-promptos-command' : 'not-a-promptos-command';
}

function buildObservation(event, payload, deliveryId, issuedAt) {
  const repository = record(payload.repository) ? payload.repository.full_name : null;
  if (repository !== SOURCE_REPOSITORY) throw new Error('github-repository-not-allowlisted');
  const installationId = record(payload.installation) ? payload.installation.id : null;
  const issueNumber = record(payload.issue) && Number.isSafeInteger(payload.issue.number)
    ? payload.issue.number
    : undefined;
  const pullRequest = record(payload.pull_request) ? payload.pull_request : {};
  const workflowRun = record(payload.workflow_run) ? payload.workflow_run : {};
  const headSha = record(pullRequest.head) && typeof pullRequest.head.sha === 'string'
    ? pullRequest.head.sha
    : typeof workflowRun.head_sha === 'string'
      ? workflowRun.head_sha
      : undefined;
  const command = event === 'issue_comment' ? safeCommand(record(payload.comment) ? payload.comment.body : '') : undefined;

  return {
    schema: 'promptos/github-event-observation@v1',
    provider: 'github',
    event,
    action: typeof payload.action === 'string' ? payload.action.slice(0, 80) : 'unknown',
    deliveryId,
    repository: SOURCE_REPOSITORY,
    ...(Number.isSafeInteger(installationId) ? { installationId } : {}),
    ...(issueNumber !== undefined ? { issueNumber } : {}),
    ...(Number.isSafeInteger(pullRequest.number) ? { pullRequestNumber: pullRequest.number } : {}),
    ...(headSha && SHA40.test(headSha) ? { headSha: headSha.toLowerCase() } : {}),
    ...(Number.isSafeInteger(workflowRun.id) ? { workflowRunId: workflowRun.id } : {}),
    ...(typeof workflowRun.name === 'string' ? { workflowName: workflowRun.name.slice(0, 120) } : {}),
    ...(typeof workflowRun.conclusion === 'string' ? { workflowConclusion: workflowRun.conclusion.slice(0, 40) } : {}),
    ...(typeof workflowRun.html_url === 'string' ? { workflowUrl: workflowRun.html_url.slice(0, 500) } : {}),
    ...(command ? { command } : {}),
    eventTimestamp: issuedAt.toISOString(),
  };
}

export async function sendFcrObservation(input) {
  const env = input.env || {};
  const event = input.event;
  const payload = input.payload;
  const deliveryId = String(input.deliveryId || '').trim();
  if (!['issue_comment', 'pull_request', 'workflow_run'].includes(event)) {
    throw new Error('relay-event-not-supported');
  }
  if (!UUID.test(deliveryId)) throw new Error('relay-delivery-id-invalid');

  const sourceHeadSha = exactSha(required(env, 'PROMPTOS_GIT_SHA'), 'PROMPTOS_GIT_SHA');
  const targetHeadSha = exactSha(required(env, 'FCR_RELAY_TARGET_SHA'), 'FCR_RELAY_TARGET_SHA');
  const keyId = required(env, 'PROMPTOS_RELAY_KEY_ID');
  if (!KEY_ID.test(keyId)) throw new Error('invalid-env:PROMPTOS_RELAY_KEY_ID');

  let privateKeyJwk;
  try {
    privateKeyJwk = JSON.parse(required(env, 'PROMPTOS_RELAY_PRIVATE_KEY_JWK'));
  } catch {
    throw new Error('invalid-env:PROMPTOS_RELAY_PRIVATE_KEY_JWK');
  }
  if (!record(privateKeyJwk) || privateKeyJwk.kty !== 'OKP' || privateKeyJwk.crv !== 'Ed25519' || typeof privateKeyJwk.d !== 'string') {
    throw new Error('invalid-env:PROMPTOS_RELAY_PRIVATE_KEY_JWK');
  }

  const issuedAt = eventTimestamp(event, payload);
  const expiresAt = new Date(issuedAt.getTime() + 10 * 60 * 1000);
  const observation = buildObservation(event, payload, deliveryId, issuedAt);
  const payloadBody = JSON.stringify(observation);
  const payloadDigest = await sha256Hex(payloadBody);
  const contextFingerprint = await sha256Hex(canonicalize({
    event,
    deliveryId,
    repository: SOURCE_REPOSITORY,
    sourceHeadSha,
    targetHeadSha,
    observation,
  }));
  const ids = await stableDeliveryIds(deliveryId);
  if (!Number.isSafeInteger(ids.sourceSequence)) throw new Error('relay-source-sequence-invalid');

  const unsigned = {
    contract: RELAY_CONTRACT,
    messageId: deliveryId.toLowerCase(),
    ordering: {
      chainId: ids.chainId,
      sourceSequence: ids.sourceSequence,
      chainPosition: 0,
      logicalOperationId: ids.logicalOperationId,
    },
    source: {
      member: SOURCE_MEMBER,
      repository: SOURCE_REPOSITORY,
      branch: 'main',
      headSha: sourceHeadSha,
    },
    target: {
      member: TARGET_MEMBER,
      repository: TARGET_REPOSITORY,
      branch: 'main',
      headSha: targetHeadSha,
    },
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    nonce: ids.nonce,
    disposition: 'observe',
    subject: 'GitHub ' + event + ' observed for ' + SOURCE_REPOSITORY,
    payload: {
      contentType: 'application/json',
      body: payloadBody,
      sha256: payloadDigest,
    },
    contextFingerprint,
    predecessorProofCookie: GENESIS_PROOF_COOKIE,
    evidence: [{
      ref: 'github-delivery:' + deliveryId.toLowerCase(),
      state: 'verified',
      sha256: payloadDigest,
    }],
    supersedesMessageIds: [],
  };

  const signingKey = await crypto.subtle.importKey(
    'jwk',
    privateKeyJwk,
    { name: 'Ed25519' },
    false,
    ['sign'],
  );
  const signatureBytes = await crypto.subtle.sign(
    'Ed25519',
    signingKey,
    encoder.encode(canonicalize(unsigned)),
  );
  const envelope = {
    ...unsigned,
    signature: {
      algorithm: 'Ed25519',
      keyId,
      valueBase64Url: bytesToBase64Url(new Uint8Array(signatureBytes)),
    },
  };

  const response = await (input.fetchImpl || fetch)(RELAY_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(envelope),
  });
  const responseText = await response.text();
  if (responseText.length > 16_384) throw new Error('fcr-relay-response-too-large');

  let responseBody;
  try {
    responseBody = JSON.parse(responseText);
  } catch {
    throw new Error('fcr-relay-response-invalid-json');
  }
  if (!response.ok) {
    const code = typeof responseBody.error === 'string' ? responseBody.error : 'rejected';
    throw new Error('fcr-relay-rejected:' + response.status + ':' + code);
  }

  const receipt = responseBody.receipt;
  if (
    responseBody.contract !== RELAY_CONTRACT
    || !['accepted', 'duplicate'].includes(responseBody.outcome)
    || !record(receipt)
    || receipt.contract !== RELAY_CONTRACT
    || receipt.status !== 'accepted'
    || receipt.messageId !== envelope.messageId
    || receipt.executionAuthorized !== false
    || receipt.authorityTransferred !== false
    || receipt.approvalCarriedForward !== false
    || responseBody.executionAuthorized !== false
    || responseBody.authorityTransferred !== false
    || responseBody.approvalCarriedForward !== false
  ) {
    throw new Error('fcr-relay-receipt-contract-invalid');
  }

  return {
    action: 'fcr-observation-accepted',
    outcome: responseBody.outcome,
    messageId: receipt.messageId,
    messageFingerprint: receipt.messageFingerprint,
    acceptedAt: receipt.acceptedAt,
    executionAuthorized: false,
    authorityTransferred: false,
    approvalCarriedForward: false,
  };
}

export { canonicalize as canonicalizeRelayJsonV3, RELAY_CONTRACT, RELAY_URL };
