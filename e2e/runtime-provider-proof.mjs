import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { courtHandoffFingerprint } from '../src/court-compiler.mjs';

const publicUrl = String(process.env.PROMPTOS_PUBLIC_URL || '').trim().replace(/\/$/, '');
const providerUrl = String(process.env.PROMPTOS_PROVIDER_URL || '').trim().replace(/\/$/, '');
const operatorKey = String(process.env.PROMPTOS_AI_OPERATOR_KEY || '').trim();
const courtBridgeKey = String(process.env.PROMPTOS_COURT_BRIDGE_KEY || '').trim();
const expectedSha = String(process.env.EXPECTED_HEAD_SHA || '').trim().toLowerCase();
const provider = String(process.env.PROMPTOS_RUNTIME_PROOF_PROVIDER || 'openai').trim().toLowerCase();
const proofDir = String(process.env.PROMPTOS_RUNTIME_PROOF_DIR || 'artifacts/promptos-runtime-proof');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(/^https:\/\//.test(publicUrl), 'PROMPTOS_PUBLIC_URL must be an https URL');
assert(/^https:\/\//.test(providerUrl), 'PROMPTOS_PROVIDER_URL must be an https URL');
assert(operatorKey.length > 0, 'PROMPTOS_AI_OPERATOR_KEY is required');
assert(courtBridgeKey.length > 0, 'PROMPTOS_COURT_BRIDGE_KEY is required');
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


  const observedAt = new Date();
  const expiresAt = new Date(observedAt.getTime() + 15 * 60_000);
  const courtCore = {
    schema: 'juss/promptos-court-compile-handoff@v1',
    caseId: `runtime-proof:${expectedSha}`,
    repository: 'jussray/promptos',
    branch: 'main',
    headSha: expectedSha,
    witnessReceiptFingerprint: 'a'.repeat(64),
    observedAt: observedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    authority: {
      evidenceOnly: true,
      createsTruth: false,
      createsAuthority: false,
      executionAuthorized: false,
      mergeAuthorized: false,
      deployAuthorized: false,
      publishAuthorized: false,
      credentialMutationAuthorized: false,
      providerMutationAuthorized: false,
    },
    task: 'Compile the smallest non-mutating next proof gate for the exact deployed PromptOS runtime.',
    founderGoal: 'Prove the PromptOS Court compiler is live on the exact trusted main SHA.',
    stopCondition: 'Return compiled proof steps only; perform no mutation.',
    constraints: [
      'preserve VERIFIED/INFERRED/UNKNOWN/BLOCKED/FAIL exactly',
      'do not convert Council consensus into authority',
      'do not merge, deploy, publish, spend, rotate credentials, or mutate providers',
      'bind successor work to the exact current source/runtime identity',
    ],
  };
  const courtHandoff = {
    ...courtCore,
    handoffFingerprint: courtHandoffFingerprint(courtCore),
  };

  const courtProof = await page.evaluate(async ({ baseUrl, key, handoff }) => {
    const response = await fetch(`${baseUrl}/court/compile`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(handoff),
      cache: 'no-store',
    });
    return { status: response.status, body: await response.json() };
  }, { baseUrl: providerUrl, key: courtBridgeKey, handoff: courtHandoff });

  assert(courtProof.status === 200, `court compiler returned ${courtProof.status}: ${courtProof.body?.error || 'unknown error'}`);
  assert(courtProof.body?.service === 'promptos', 'court compiler service mismatch');
  assert(courtProof.body?.release_sha === expectedSha, 'court compiler release SHA mismatch');
  assert(courtProof.body?.authority === 'none', 'court compiler response widened authority');
  assert(courtProof.body?.result?.schema === 'juss/promptos-court-workflow@v1', 'court compiler workflow schema mismatch');
  assert(courtProof.body?.result?.state === 'COMPILED', 'fresh Court handoff did not compile');
  assert(courtProof.body?.result?.sourceHandoffFingerprint === courtHandoff.handoffFingerprint, 'court compiler handoff fingerprint mismatch');
  assert(courtProof.body?.result?.subject?.repository === 'jussray/promptos', 'court compiler repository mismatch');
  assert(courtProof.body?.result?.subject?.branch === 'main', 'court compiler branch mismatch');
  assert(courtProof.body?.result?.subject?.headSha === expectedSha, 'court compiler exact-head mismatch');
  assert(courtProof.body?.result?.authority?.executionAuthorized === false, 'court compiler gained execution authority');
  assert(courtProof.body?.result?.authority?.createsAuthority === false, 'court compiler gained authority creation');
  assert(courtProof.body?.result?.steps?.every((step) => step?.mayMutate === false), 'court compiler emitted a mutating step');
  assert(/^[0-9a-f]{64}$/.test(String(courtProof.body?.result?.workflowFingerprint || '')), 'court compiler workflow fingerprint missing');

  const safeReceipt = {
    expectedSha,
    provider,
    responseId: proof.body.response_id,
    evidenceRef: proof.body.evidence_ref,
    providerState: proof.body.provider_state,
    court: {
      sourceHandoffFingerprint: courtHandoff.handoffFingerprint,
      workflowFingerprint: courtProof.body.result.workflowFingerprint,
      state: courtProof.body.result.state,
      authority: 'none',
    },
  };
  await writeFile(`${proofDir}/runtime-proof.json`, `${JSON.stringify(safeReceipt, null, 2)}\n`, 'utf8');
  await page.screenshot({ path: `${proofDir}/promptos-browser.png`, fullPage: true });
} finally {
  await browser.close();
}
