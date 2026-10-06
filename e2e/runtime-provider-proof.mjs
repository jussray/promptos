import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const publicUrl = String(process.env.PROMPTOS_PUBLIC_URL || '').trim().replace(/\/$/, '');
const providerUrl = String(process.env.PROMPTOS_PROVIDER_URL || '').trim().replace(/\/$/, '');
const operatorKey = String(process.env.PROMPTOS_AI_OPERATOR_KEY || '').trim();
const expectedSha = String(process.env.EXPECTED_HEAD_SHA || '').trim().toLowerCase();
const provider = String(process.env.PROMPTOS_RUNTIME_PROOF_PROVIDER || 'openai').trim().toLowerCase();
const proofDir = String(process.env.PROMPTOS_RUNTIME_PROOF_DIR || 'artifacts/promptos-runtime-proof');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(/^https:\/\//.test(publicUrl), 'PROMPTOS_PUBLIC_URL must be an https URL');
assert(/^https:\/\//.test(providerUrl), 'PROMPTOS_PROVIDER_URL must be an https URL');
assert(operatorKey.length > 0, 'PROMPTOS_AI_OPERATOR_KEY is required');
assert(/^[0-9a-f]{40}$/.test(expectedSha), 'EXPECTED_HEAD_SHA must be an exact 40-character SHA');
assert(/^(openai|anthropic|muse)$/.test(provider), 'unsupported proof provider');

await mkdir(proofDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const navigation = await page.goto(`${publicUrl}/`, { waitUntil: 'domcontentloaded' });
  assert(navigation?.ok(), `PromptOS public UI returned ${navigation?.status()}`);

  const identity = await page.evaluate(async ({ baseUrl, key }) => {
    const response = await fetch(`${baseUrl}/runtime-identity`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: 'no-store',
    });
    return { status: response.status, body: await response.json() };
  }, { baseUrl: providerUrl, key: operatorKey });

  assert(identity.status === 200, `runtime identity returned ${identity.status}`);
  assert(identity.body?.service === 'promptos', 'runtime identity service mismatch');
  assert(identity.body?.release_sha === expectedSha, `runtime SHA mismatch: ${identity.body?.release_sha}`);
  assert(identity.body?.providers?.[provider]?.state !== 'ABSENT', `${provider} is not configured on deployed runtime`);

  const proof = await page.evaluate(async ({ baseUrl, key, selectedProvider }) => {
    const response = await fetch(`${baseUrl}/runtime-proof`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ provider: selectedProvider }),
    });
    return { status: response.status, body: await response.json() };
  }, { baseUrl: providerUrl, key: operatorKey, selectedProvider: provider });

  assert(proof.status === 200, `runtime proof returned ${proof.status}: ${proof.body?.error || 'unknown error'}`);
  assert(proof.body?.service === 'promptos', 'runtime proof service mismatch');
  assert(proof.body?.release_sha === expectedSha, 'runtime proof release SHA mismatch');
  assert(proof.body?.provider === provider, 'runtime proof provider mismatch');
  assert(proof.body?.provider_state === 'VERIFIED', 'provider did not reach VERIFIED state');
  assert(/^[A-Za-z0-9._:-]+$/.test(String(proof.body?.response_id || '')), 'provider response identity is missing');
  assert(proof.body?.evidence_ref === `provider:${provider === 'muse' ? 'meta' : provider}:${proof.body.response_id}`, 'provider evidence reference mismatch');
  assert(!('text' in (proof.body || {})), 'proof route must not return provider text');

  const safeReceipt = {
    expectedSha,
    provider,
    responseId: proof.body.response_id,
    evidenceRef: proof.body.evidence_ref,
    providerState: proof.body.provider_state,
  };
  await writeFile(`${proofDir}/runtime-proof.json`, `${JSON.stringify(safeReceipt, null, 2)}\n`, 'utf8');
  await page.screenshot({ path: `${proofDir}/promptos-browser.png`, fullPage: true });
} finally {
  await browser.close();
}
