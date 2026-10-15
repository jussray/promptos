#!/usr/bin/env node

const repository = process.env.GITHUB_REPOSITORY || 'jussray/promptos';
const token = process.env.GITHUB_TOKEN || '';
const reportOnly = process.env.PROMPTOS_AUTHORITY_REPORT_ONLY === '1';
const requiredContext = process.env.PROMPTOS_REQUIRED_STATUS_CONTEXT || 'Verify PromptOS control room tests';
const apiVersion = '2026-03-10';

if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
  throw new Error(`Invalid GITHUB_REPOSITORY: ${repository}`);
}

const headers = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': apiVersion,
  'User-Agent': 'promptos-main-authority-check',
};
if (token) headers.Authorization = `Bearer ${token}`;

async function readJsonResult(path) {
  const response = await fetch(`https://api.github.com/repos/${repository}${path}`, { headers });
  const body = await response.text();
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      body: body.slice(0, 1000),
    };
  }
  return {
    ok: true,
    status: response.status,
    data: body ? JSON.parse(body) : null,
  };
}

function appliesToMain(ruleset) {
  if (ruleset.target !== 'branch' || ruleset.enforcement !== 'active') return false;
  const refName = ruleset.conditions?.ref_name;
  if (!refName) return true;
  const include = Array.isArray(refName.include) ? refName.include : [];
  const exclude = Array.isArray(refName.exclude) ? refName.exclude : [];
  const mainTokens = new Set(['~ALL', '~DEFAULT_BRANCH', 'main', 'refs/heads/main']);
  const included = include.length === 0 || include.some((value) => mainTokens.has(value));
  const excluded = exclude.some((value) => mainTokens.has(value));
  return included && !excluded;
}

function ruleContexts(rule) {
  if (rule?.type !== 'required_status_checks') return [];
  const checks = rule?.parameters?.required_status_checks;
  if (!Array.isArray(checks)) return [];
  return checks
    .map((check) => typeof check === 'string' ? check : check?.context)
    .filter((value) => typeof value === 'string' && value.length > 0);
}

const branchResult = await readJsonResult('/branches/main');
if (!branchResult.ok) {
  throw new Error(`GitHub authority readback failed for /branches/main: HTTP ${branchResult.status}`);
}
const branch = branchResult.data;

const rulesetSummariesResult = await readJsonResult('/rulesets');
const providerPlanBlocked =
  !rulesetSummariesResult.ok &&
  rulesetSummariesResult.status === 403 &&
  /Upgrade to GitHub Pro or make this repository public/i.test(rulesetSummariesResult.body || '');

const detailedRulesets = [];
const detailReadErrors = [];
if (rulesetSummariesResult.ok) {
  for (const summary of Array.isArray(rulesetSummariesResult.data) ? rulesetSummariesResult.data : []) {
    if (!summary?.id) continue;
    const detail = await readJsonResult(`/rulesets/${summary.id}`);
    if (detail.ok) detailedRulesets.push(detail.data);
    else detailReadErrors.push({ id: summary.id, status: detail.status });
  }
}

const classicContexts = branch.protection?.required_status_checks?.contexts ?? [];
const classicChecks = branch.protection?.required_status_checks?.checks ?? [];
const classicRequiredContexts = [
  ...classicContexts,
  ...classicChecks.map((check) => check?.context),
].filter((value) => typeof value === 'string' && value.length > 0);
const classicHasRequiredContext = Boolean(branch.protected) && classicRequiredContexts.includes(requiredContext);

const activeMainRulesets = detailedRulesets.filter(appliesToMain);
const rulesetRequiredContexts = activeMainRulesets.flatMap((ruleset) =>
  Array.isArray(ruleset.rules) ? ruleset.rules.flatMap(ruleContexts) : []
);
const uniqueRulesetRequiredContexts = [...new Set(rulesetRequiredContexts)];
const rulesetHasRequiredContext = uniqueRulesetRequiredContexts.includes(requiredContext);
const emptyRequiredCheckRules = activeMainRulesets.reduce((count, ruleset) => {
  if (!Array.isArray(ruleset.rules)) return count;
  return count + ruleset.rules.filter((rule) => rule?.type === 'required_status_checks' && ruleContexts(rule).length === 0).length;
}, 0);

const protectedByRequiredChecks = classicHasRequiredContext || rulesetHasRequiredContext;
const receipt = {
  repository,
  branchProtected: Boolean(branch.protected),
  requiredContext,
  classicRequiredContexts,
  rulesetsReadable: rulesetSummariesResult.ok,
  rulesetsReadStatus: rulesetSummariesResult.status,
  providerPlanBlocked,
  detailReadErrors,
  rulesetRequiredContexts: uniqueRulesetRequiredContexts,
  emptyRequiredCheckRules,
  activeMainRulesets: activeMainRulesets.map((ruleset) => ({
    id: ruleset.id,
    name: ruleset.name,
    enforcement: ruleset.enforcement,
    requiredContexts: Array.isArray(ruleset.rules) ? ruleset.rules.flatMap(ruleContexts) : [],
  })),
  protectedByRequiredChecks,
  reportOnly,
};

console.log(JSON.stringify(receipt));

if (!protectedByRequiredChecks && !reportOnly) {
  if (providerPlanBlocked) {
    throw new Error(
      'PromptOS provider governance is BLOCKED by the current GitHub private-repository plan. ' +
      `The proven required context is "${requiredContext}", but GitHub rulesets are unavailable until the provider plan changes. Repository CI must not translate that provider limitation into a false green.`
    );
  }
  if (!rulesetSummariesResult.ok) {
    throw new Error(
      `PromptOS provider ruleset readback is unavailable (HTTP ${rulesetSummariesResult.status}); required context "${requiredContext}" is not proven enforced.`
    );
  }
  throw new Error(
    `PromptOS main does not require the proven exact-head status context "${requiredContext}". ` +
    'An empty required_status_checks rule is not evidence of protection.'
  );
}
