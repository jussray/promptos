import {spawnSync} from 'node:child_process';
import {access, mkdir, readFile, readdir, writeFile} from 'node:fs/promises';
import path from 'node:path';

const EXPECTED_REPOSITORY = 'jussray/promptos';
const ASSEMBLY_WORKFLOW = '.github/workflows/assemble.yml';
const APP_RUNTIME = 'parts/app.js';
const INDEX_PATH = 'index.html';
const EXPECTED_INDEX_SCRIPTS = [
  'parts/auth.js',
  'parts/state.js',
  'parts/p05-new-prompts.js',
  'parts/p06-gap-prompts.js',
  'parts/p07-ship-ultrathink-skills.js',
  'parts/p08-cont-redteam.js',
  'parts/p09-cont-design.js',
  'parts/p10-cont-ops-growth.js',
  'parts/app.js',
];
const MALFORMED_APP_STATE = "  search: '',n  sync: { token: '', gistId: '', status: 'idle', lastSynced: null }";
const REPAIRED_APP_STATE = "  search: '',\n  sync: { token: '', gistId: '', status: 'idle', lastSynced: null }";
const ALLOWED_KINDS = new Set([
  'typecheck',
  'lint',
  'unit',
  'integration',
  'e2e',
  'contract',
  'security',
  'build',
  'deployment',
  'other',
]);
const ALLOWED_STATUSES = new Set(['active', 'founder-gated', 'missing', 'retired']);

function singleLine(value, max = 500) {
  return typeof value === 'string'
    && value.trim().length > 0
    && value.length <= max
    && !value.includes('\n')
    && !value.includes('\r');
}

function safePath(value) {
  return typeof value === 'string'
    && value.length > 0
    && !value.startsWith('/')
    && !value.includes('\\')
    && !value.split('/').includes('..');
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

function runSyntaxCheck(file) {
  return spawnSync(process.execPath, ['--check', file], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function indexPartScripts(indexHtml) {
  return [...indexHtml.matchAll(/<script\b[^>]*\bsrc=["']\.\/(parts\/[^"']+\.js)["'][^>]*><\/script>/g)]
    .map((match) => match[1]);
}

function sameSequence(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

const rawManifest = await readFile('control-room.manifest.json', 'utf8');
const manifest = JSON.parse(rawManifest);
const errors = [];
const observations = [];

if (manifest.schemaVersion !== '1.0') errors.push('schemaVersion must be 1.0');
if (manifest.repository !== EXPECTED_REPOSITORY) errors.push(`repository must be ${EXPECTED_REPOSITORY}`);
if (manifest.portfolioHub !== 'jussray/founder-control-room') errors.push('portfolioHub must be Founder Control Room');
if (manifest.controlRoom?.privateContentAllowed !== false) errors.push('private content must be denied');
if (manifest.tests?.rawLogsAllowed !== false) errors.push('raw logs must be denied');
if (!Array.isArray(manifest.tests?.catalog) || manifest.tests.catalog.length === 0) {
  errors.push('tests.catalog must not be empty');
}

const ids = new Set();
for (const entry of Array.isArray(manifest.tests?.catalog) ? manifest.tests.catalog : []) {
  const entryErrors = [];
  if (!singleLine(entry.id, 100)) entryErrors.push('invalid id');
  if (ids.has(entry.id)) entryErrors.push('duplicate id');
  ids.add(entry.id);
  if (!singleLine(entry.name, 200)) entryErrors.push('invalid name');
  if (!ALLOWED_KINDS.has(entry.kind)) entryErrors.push('unsupported kind');
  if (!ALLOWED_STATUSES.has(entry.status)) entryErrors.push('unsupported status');
  if (typeof entry.required !== 'boolean') entryErrors.push('required must be boolean');
  if (!singleLine(entry.command)) entryErrors.push('command must be single-line');
  if (!Array.isArray(entry.evidencePaths) || entry.evidencePaths.length === 0) {
    entryErrors.push('evidencePaths must not be empty');
  }
  for (const evidencePath of Array.isArray(entry.evidencePaths) ? entry.evidencePaths : []) {
    if (!safePath(evidencePath)) entryErrors.push(`unsafe evidence path: ${String(evidencePath)}`);
    else if (!(await exists(evidencePath))) entryErrors.push(`missing evidence path: ${evidencePath}`);
  }
  observations.push({
    id: entry.id,
    kind: entry.kind,
    status: entry.status,
    required: entry.required,
    catalogValid: entryErrors.length === 0,
  });
  for (const error of entryErrors) errors.push(`${entry.id || 'unknown'}: ${error}`);
}

const assemblyEntry = manifest.tests?.catalog?.find((entry) => entry.id === 'assembly-determinism');
const renderedEntry = manifest.tests?.catalog?.find((entry) => entry.id === 'rendered-browser-proof');
const indexHtml = await readFile(INDEX_PATH, 'utf8');
const declaredSources = indexPartScripts(indexHtml);
const missingSources = [];
for (const source of EXPECTED_INDEX_SCRIPTS) {
  if (!(await exists(source))) missingSources.push(source);
}
const exactMatch = sameSequence(declaredSources, EXPECTED_INDEX_SCRIPTS);

if (missingSources.length > 0) errors.push(`index references missing canonical sources: ${missingSources.join(', ')}`);
if (!exactMatch) {
  errors.push(`index script authority drifted; expected ${EXPECTED_INDEX_SCRIPTS.join(' -> ')}, got ${declaredSources.join(' -> ')}`);
}
if (assemblyEntry?.status !== 'active') errors.push('assembly-determinism must be active once index source authority is repaired');
if (renderedEntry?.status !== 'active') errors.push('rendered-browser-proof must be active once browser proof is configured');
if (renderedEntry?.command !== 'node e2e/rendered-proof.mjs') {
  errors.push('rendered-browser-proof must use node e2e/rendered-proof.mjs');
}

const assemblyWorkflow = await readFile(ASSEMBLY_WORKFLOW, 'utf8');
const assemblyManualOnly = assemblyWorkflow.includes('workflow_dispatch:')
  && !/^\s{2}(pull_request|push):/m.test(assemblyWorkflow);
if (/contents:\s*write/.test(assemblyWorkflow)) errors.push('legacy assembly workflow must not retain contents: write');
if (/\bgit\s+push\b/.test(assemblyWorkflow)) errors.push('legacy assembly workflow must not mutate the repository');
if (!assemblyManualOnly) errors.push('legacy assembly workflow must remain workflow_dispatch-only to avoid duplicate hosted proof jobs');
if (!assemblyWorkflow.includes('expected_head_sha:')) errors.push('manual source verifier must require an exact expected_head_sha input');
if (!assemblyWorkflow.includes('node scripts/verify-control-room-tests.mjs')) {
  errors.push('legacy assembly workflow must delegate to the non-mutating source verifier');
}

const promptModules = (await readdir('parts'))
  .filter((file) => file.endsWith('.js'))
  .sort()
  .map((file) => `parts/${file}`);
if (promptModules.length === 0) errors.push('no prompt JavaScript modules were discovered');
for (const file of promptModules) {
  const result = runSyntaxCheck(file);
  if (result.status !== 0) {
    errors.push(`${file} failed node --check: ${(result.stderr || result.stdout || '').trim().slice(0, 300)}`);
  }
}

const appRuntime = await readFile(APP_RUNTIME, 'utf8');
if (appRuntime.includes(MALFORMED_APP_STATE)) {
  errors.push('PromptOS app state contains the malformed search/sync token');
}
if (!appRuntime.includes(REPAIRED_APP_STATE)) {
  errors.push('PromptOS app state does not contain the repaired search/sync boundary');
}

const zapierPackage = JSON.parse(await readFile('tools/zapier/package.json', 'utf8'));
if (zapierPackage.scripts?.typecheck !== 'tsc -p tsconfig.json --noEmit') {
  errors.push('Zapier tooling typecheck command drifted');
}
if (/(api[_-]?key|secret\s*[:=]|token\s*[:=]|sk-[a-z0-9_-]{10,})/i.test(rawManifest)) {
  errors.push('control-room manifest appears to contain secret material');
}

const report = {
  schemaVersion: 1,
  repository: EXPECTED_REPOSITORY,
  status: errors.length === 0 ? 'passed' : 'failed',
  generatedAt: new Date().toISOString(),
  assembly: {
    authority: 'index-script-graph',
    workflow: ASSEMBLY_WORKFLOW,
    expectedSources: EXPECTED_INDEX_SCRIPTS,
    declaredSources,
    missingSources,
    status: missingSources.length > 0 ? 'missing' : exactMatch ? 'passed' : 'failed',
    exactMatch,
    mutatingWorkflowRetired:
      !/contents:\s*write/.test(assemblyWorkflow)
      && !/\bgit\s+push\b/.test(assemblyWorkflow),
    manualOnly: assemblyManualOnly,
  },
  promptModules: {
    count: promptModules.length,
    syntaxPassed: !errors.some((error) => error.includes('failed node --check')),
    appRuntimeBoundaryPassed:
      !appRuntime.includes(MALFORMED_APP_STATE)
      && appRuntime.includes(REPAIRED_APP_STATE),
  },
  renderedBrowserProof: {
    configured: renderedEntry?.status === 'active' && renderedEntry?.command === 'node e2e/rendered-proof.mjs',
    path: 'e2e/rendered-proof.mjs',
  },
  tests: observations,
  summary: {
    total: observations.length,
    active: observations.filter((item) => item.status === 'active').length,
    missing: observations.filter((item) => item.status === 'missing').length,
    invalid: observations.filter((item) => !item.catalogValid).length,
  },
};

const reportPath = process.env.CONTROL_ROOM_TEST_REPORT_PATH;
if (reportPath) {
  await mkdir(path.dirname(reportPath), {recursive: true});
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

if (errors.length > 0) {
  console.error('PromptOS control-room verification failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(JSON.stringify(report));
