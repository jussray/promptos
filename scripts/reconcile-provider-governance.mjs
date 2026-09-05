import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { classifyProviderMergeMembrane } from './verify-provider-merge-membrane.mjs';

const DESIRED_PATH = process.env.PROVIDER_GOVERNANCE_DESIRED || '.control-room/provider-governance.desired.json';
const RECEIPT_PATH = process.env.PROVIDER_GOVERNANCE_RECEIPT || 'artifacts/provider-governance-reconcile.json';
const EXPECTED_NAME = 'PromptOS main governance';
const REQUIRED_CHECK = process.env.REQUIRED_CHECK || 'Verify PromptOS control room tests';

function fail(message) {
  throw new Error(`PromptOS provider governance reconcile: ${message}`);
}

function mutationBody(desired) {
  const { schemaVersion, contract, ...body } = desired;
  return body;
}

function validateDesired(desired) {
  if (!desired || typeof desired !== 'object' || Array.isArray(desired)) fail('desired state must be an object');
  if (desired.schemaVersion !== 1) fail('desired schemaVersion must be 1');
  if (desired.contract !== 'promptos/provider-governance-desired@v1') fail('desired contract mismatch');
  if (desired.name !== EXPECTED_NAME) fail(`ruleset name must remain ${EXPECTED_NAME}`);
  if (desired.target !== 'branch' || desired.enforcement !== 'active') fail('desired ruleset must be an active branch ruleset');
  if (!Array.isArray(desired.bypass_actors) || desired.bypass_actors.length !== 0) fail('desired ruleset must have zero bypass actors');

  const classified = classifyProviderMergeMembrane([
    {...mutationBody(desired), id: 1, current_user_can_bypass: 'never'},
  ], {requiredCheck: REQUIRED_CHECK});
  if (classified.state !== 'VERIFIED') fail(`desired state does not satisfy membrane: ${classified.failed.join(', ')}`);
  return desired;
}

async function githubRequest(path, { token, method = 'GET', body } = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'user-agent': 'promptos-provider-governance-reconciler',
      authorization: `Bearer ${token}`,
      ...(body ? {'content-type': 'application/json'} : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let parsed = null;
  try { parsed = text ? JSON.parse(text) : null; }
  catch { parsed = {raw: text.slice(0, 500)}; }
  if (!response.ok) {
    const error = new Error(`GitHub API ${method} ${path} failed: ${response.status} ${response.statusText}`);
    error.status = response.status;
    error.body = parsed;
    throw error;
  }
  return parsed;
}

async function writeReceipt(receipt) {
  const slash = RECEIPT_PATH.lastIndexOf('/');
  if (slash > 0) await mkdir(RECEIPT_PATH.slice(0, slash), {recursive: true});
  await writeFile(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
}

export async function reconcileProviderGovernance({ repository, token, desired, request = githubRequest } = {}) {
  if (!repository || !/^[^/]+\/[^/]+$/.test(repository)) fail('repository must be owner/name');
  if (typeof token !== 'string' || token.length < 20) fail('PROMPTOS_RULESET_ADMIN_TOKEN is required');
  validateDesired(desired);

  const listed = await request(`/repos/${repository}/rulesets?targets=branch&per_page=100`, {token});
  if (!Array.isArray(listed)) fail('ruleset list response must be an array');
  const sameName = listed.filter((item) => item?.name === EXPECTED_NAME);
  if (sameName.length > 1) fail('multiple PromptOS main governance rulesets exist; refusing ambiguous mutation');

  const body = mutationBody(desired);
  let action;
  let ruleset;
  if (sameName.length === 0) {
    action = 'created';
    ruleset = await request(`/repos/${repository}/rulesets`, {token, method: 'POST', body});
  } else {
    const id = sameName[0]?.id;
    if (!Number.isSafeInteger(id) || id <= 0) fail('existing ruleset id is invalid');
    action = 'updated';
    ruleset = await request(`/repos/${repository}/rulesets/${id}`, {token, method: 'PUT', body});
  }

  if (!Number.isSafeInteger(ruleset?.id) || ruleset.id <= 0) fail('mutation response omitted ruleset id');
  const detailed = await request(`/repos/${repository}/rulesets/${ruleset.id}`, {token});
  const classified = classifyProviderMergeMembrane([detailed], {requiredCheck: REQUIRED_CHECK});
  if (classified.state !== 'VERIFIED') fail(`provider readback remains blocked: ${classified.failed.join(', ')}`);

  return Object.freeze({
    schemaVersion: 1,
    contract: 'promptos/provider-governance-reconcile@v1',
    repository,
    action,
    rulesetId: detailed.id,
    rulesetName: detailed.name,
    state: 'VERIFIED',
    membrane: classified,
    authority: {
      authorizesMerge: false,
      authorizesBypass: false,
      note: 'This receipt proves provider governance only. Merge remains separately gated by exact-head evidence.',
    },
  });
}

async function main() {
  const repository = process.env.GITHUB_REPOSITORY;
  const token = process.env.PROMPTOS_RULESET_ADMIN_TOKEN || '';
  const desired = JSON.parse(await readFile(DESIRED_PATH, 'utf8'));
  let receipt;
  try {
    receipt = {
      ...(await reconcileProviderGovernance({repository, token, desired})),
      reconciledAt: new Date().toISOString(),
      providerReadback: 'github-rulesets-api',
    };
  } catch (error) {
    receipt = {
      schemaVersion: 1,
      contract: 'promptos/provider-governance-reconcile@v1',
      repository: repository || null,
      state: 'BLOCKED',
      reconciledAt: new Date().toISOString(),
      providerReadback: 'github-rulesets-api',
      error: {
        message: error instanceof Error ? error.message : String(error),
        status: error?.status ?? null,
      },
      authority: {authorizesMerge: false, authorizesBypass: false},
    };
  }
  await writeReceipt(receipt);
  console.log(JSON.stringify(receipt, null, 2));
  if (receipt.state !== 'VERIFIED') process.exitCode = 1;
}

const invokedDirectly = process.argv[1] && new URL(import.meta.url).pathname === process.argv[1];
if (invokedDirectly) main().catch((error) => { console.error(error); process.exitCode = 1; });
