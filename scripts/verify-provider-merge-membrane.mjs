import { mkdir, writeFile } from 'node:fs/promises';

const DEFAULT_BRANCH = process.env.TARGET_BRANCH || 'main';
const DEFAULT_REQUIRED_CHECK = process.env.REQUIRED_CHECK || 'Verify PromptOS control room tests';
const DEFAULT_RECEIPT_PATH = process.env.PROVIDER_MERGE_MEMBRANE_RECEIPT || 'artifacts/provider-merge-membrane.json';

function wildcardToRegExp(pattern) {
  const escaped = String(pattern)
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*');
  return new RegExp(`^${escaped}$`);
}

function patternMatchesBranch(pattern, branch) {
  if (pattern === '~ALL') return true;
  if (pattern === '~DEFAULT_BRANCH') return branch === DEFAULT_BRANCH;

  const ref = `refs/heads/${branch}`;
  const normalized = String(pattern || '');
  if (!normalized) return false;
  if (normalized === branch || normalized === ref) return true;

  return wildcardToRegExp(normalized).test(ref) || wildcardToRegExp(normalized).test(branch);
}

function rulesetAppliesToBranch(ruleset, branch) {
  if (ruleset?.target !== 'branch' || ruleset?.enforcement !== 'active') return false;

  const refName = ruleset?.conditions?.ref_name;
  const includes = Array.isArray(refName?.include) ? refName.include : [];
  const excludes = Array.isArray(refName?.exclude) ? refName.exclude : [];

  const included = includes.length === 0 || includes.some((pattern) => patternMatchesBranch(pattern, branch));
  const excluded = excludes.some((pattern) => patternMatchesBranch(pattern, branch));
  return included && !excluded;
}

function ruleParameters(rule) {
  return rule?.parameters && typeof rule.parameters === 'object' ? rule.parameters : {};
}

function statusContexts(rule) {
  const checks = ruleParameters(rule).required_status_checks;
  if (!Array.isArray(checks)) return [];
  return checks
    .map((check) => (typeof check?.context === 'string' ? check.context.trim() : ''))
    .filter(Boolean);
}

function bypassPolicyIsExplicit(ruleset) {
  if (!Array.isArray(ruleset?.bypass_actors)) return false;
  return ruleset.bypass_actors.every((actor) => {
    const mode = actor?.bypass_mode;
    const type = actor?.actor_type;
    return typeof type === 'string' && type.length > 0 && (mode === 'always' || mode === 'pull_request');
  });
}

export function classifyProviderMergeMembrane(
  rulesets,
  { branch = DEFAULT_BRANCH, requiredCheck = DEFAULT_REQUIRED_CHECK } = {},
) {
  const candidates = Array.isArray(rulesets) ? rulesets : [];
  const applicable = candidates.filter((ruleset) => rulesetAppliesToBranch(ruleset, branch));
  const rules = applicable.flatMap((ruleset) => (Array.isArray(ruleset?.rules) ? ruleset.rules : []));

  const pullRequestRules = rules.filter((rule) => rule?.type === 'pull_request');
  const pullRequestGate = pullRequestRules.some((rule) => {
    const parameters = ruleParameters(rule);
    return (
      Number(parameters.required_approving_review_count || 0) >= 1 &&
      parameters.dismiss_stale_reviews_on_push === true &&
      parameters.required_review_thread_resolution === true
    );
  });

  const deletionBlocked = rules.some((rule) => rule?.type === 'deletion');
  const nonFastForwardBlocked = rules.some((rule) => rule?.type === 'non_fast_forward');
  const requiredCheckBound = rules
    .filter((rule) => rule?.type === 'required_status_checks')
    .some((rule) => statusContexts(rule).includes(requiredCheck));
  const bypassPolicyExplicit = applicable.length > 0 && applicable.every(bypassPolicyIsExplicit);

  const checks = {
    activeRulesetAppliesToMain: applicable.length > 0,
    pullRequestRequiredWithFreshApproval: pullRequestGate,
    deletionBlocked,
    nonFastForwardBlocked,
    exactHeadControlRoomCheckRequired: requiredCheckBound,
    bypassActorsAndModesExplicit: bypassPolicyExplicit,
  };

  const failed = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);

  return {
    schemaVersion: 1,
    contract: 'promptos/provider-merge-membrane@v1',
    state: failed.length === 0 ? 'VERIFIED' : 'BLOCKED',
    targetBranch: branch,
    requiredCheck,
    checks,
    failed,
    applicableRulesets: applicable.map((ruleset) => ({
      id: ruleset.id ?? null,
      name: ruleset.name ?? null,
      enforcement: ruleset.enforcement ?? null,
      bypassActors: Array.isArray(ruleset.bypass_actors)
        ? ruleset.bypass_actors.map((actor) => ({
            actorType: actor?.actor_type ?? null,
            actorId: actor?.actor_id ?? null,
            bypassMode: actor?.bypass_mode ?? null,
          }))
        : null,
    })),
    authority: {
      authorizesMerge: false,
      authorizesProviderMutation: false,
      authorizesBypass: false,
      note: 'This receipt observes provider governance only. It never grants merge, mutation, or bypass authority.',
    },
  };
}

async function githubGet(path, token) {
  const headers = {
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
    'user-agent': 'promptos-provider-merge-membrane-verifier',
  };
  if (token) headers.authorization = `Bearer ${token}`;

  const response = await fetch(`https://api.github.com${path}`, { headers });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text.slice(0, 500) };
  }

  if (!response.ok) {
    const error = new Error(`GitHub provider readback failed: ${response.status} ${response.statusText}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

async function loadDetailedRulesets(repository, token) {
  const listed = await githubGet(`/repos/${repository}/rulesets?targets=branch&per_page=100`, token);
  if (!Array.isArray(listed)) throw new Error('GitHub rulesets response was not an array');

  const detailed = [];
  for (const summary of listed) {
    if (summary?.target !== 'branch' || summary?.enforcement !== 'active' || !summary?.id) continue;
    detailed.push(await githubGet(`/repos/${repository}/rulesets/${summary.id}`, token));
  }
  return detailed;
}

async function writeReceipt(receipt, receiptPath) {
  const separator = receiptPath.lastIndexOf('/');
  if (separator > 0) await mkdir(receiptPath.slice(0, separator), { recursive: true });
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
}

async function main() {
  const repository = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN || '';
  const branch = process.env.TARGET_BRANCH || DEFAULT_BRANCH;
  const requiredCheck = process.env.REQUIRED_CHECK || DEFAULT_REQUIRED_CHECK;
  const receiptPath = process.env.PROVIDER_MERGE_MEMBRANE_RECEIPT || DEFAULT_RECEIPT_PATH;

  if (!repository || !/^[^/]+\/[^/]+$/.test(repository)) {
    throw new Error('GITHUB_REPOSITORY must be owner/name');
  }

  let receipt;
  try {
    const rulesets = await loadDetailedRulesets(repository, token);
    receipt = {
      ...classifyProviderMergeMembrane(rulesets, { branch, requiredCheck }),
      repository,
      observedAt: new Date().toISOString(),
      providerReadback: 'github-rulesets-api',
    };
  } catch (error) {
    receipt = {
      schemaVersion: 1,
      contract: 'promptos/provider-merge-membrane@v1',
      state: 'BLOCKED',
      repository,
      targetBranch: branch,
      requiredCheck,
      observedAt: new Date().toISOString(),
      providerReadback: 'github-rulesets-api',
      failed: ['providerReadbackUnavailable'],
      error: {
        message: error instanceof Error ? error.message : String(error),
        status: error?.status ?? null,
      },
      authority: {
        authorizesMerge: false,
        authorizesProviderMutation: false,
        authorizesBypass: false,
      },
    };
  }

  await writeReceipt(receipt, receiptPath);
  console.log(JSON.stringify(receipt, null, 2));
  if (receipt.state !== 'VERIFIED') process.exitCode = 1;
}

const invokedDirectly = process.argv[1] && new URL(import.meta.url).pathname === process.argv[1];
if (invokedDirectly) {
  main().catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
