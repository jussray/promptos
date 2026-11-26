import { execFileSync } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const REPOSITORY = 'jussray/promptos';
const WORKFLOW_ID = 'actual-flow-v4';
const SHA = /^[0-9a-f]{40}$/;
const HEAD_REF = /^refs\/heads\/[a-zA-Z0-9][a-zA-Z0-9._/-]{0,127}$/;
const ROOT = fileURLToPath(new URL('../../', import.meta.url));

export function buildProjectExport({workflow, registry, expectedHead, observedHead, observedRef, project = 'promptos'}) {
  if (project !== 'promptos') throw new Error('unverified project binding: only canonical PromptOS is supported');
  if (!SHA.test(expectedHead ?? '') || expectedHead !== observedHead) {
    throw new Error('stale or invalid exact-head source; export denied');
  }
  if (!HEAD_REF.test(observedRef ?? '') || observedRef.includes('..') || observedRef.includes('//')) {
    throw new Error('invalid source ref; exact checked-out branch is required');
  }
  const onMain = observedRef === 'refs/heads/main';
  if (workflow?.schemaVersion !== 1 || workflow?.artifactType !== 'promptos-workflow'
      || workflow?.id !== WORKFLOW_ID || workflow?.status !== 'approved'
      || workflow?.registrationAuthority !== 'founder-approved') {
    throw new Error('workflow must be founder-approved before project export');
  }
  const matches = registry?.workflows?.filter((entry) => entry?.id === WORKFLOW_ID) ?? [];
  if (matches.length !== 1 || matches[0]?.status !== 'approved'
      || matches[0]?.version !== workflow.version
      || matches[0]?.path !== 'workflows/actual-flow-v4.workflow.json') {
    throw new Error('exact approved workflow registry entry is required');
  }
  if (workflow?.provenance?.contract !== 'juss/actual-flow-v4-proof@v1'
      || workflow?.provenance?.neverAuthorizesExecution !== true
      || workflow?.provenance?.requiresExactRepositoryHead !== true) {
    throw new Error('ACTUAL-FLOW proof and authority invariants must remain intact');
  }
  if (!Array.isArray(workflow.reasoningSequence) || workflow.reasoningSequence.length < 5
      || !['VERIFIED', 'INFERRED', 'UNKNOWN', 'BLOCKED'].every(x => workflow.truthStates?.includes(x))) {
    throw new Error('workflow protocol or truth classifications are incomplete');
  }
  return {
    schema: 'juss/promptos-workflow-project-export@v1',
    project: 'promptos',
    source: { repository: REPOSITORY, canonicalBranch: 'main', observedRef, isCanonicalMain: onMain, exactHeadSha: expectedHead },
    artifact: structuredClone(workflow),
    runtime: {
      status: onMain ? 'definition-only' : 'candidate-definition-only',
      automaticExecution: false,
      providerPrivilegesGranted: false,
      authenticatedAccountRequiredForUse: true,
      sitesIdentity: 'UNVERIFIED',
      deployed: false,
      authority: 'founder-review-at-each-consequential-gate',
    },
    verification: {
      exactHeadMatched: true,
      approvalRegistryMatched: true,
      registrationEffective: onMain,
      guarantees: ['definition-integrity', 'source-head-identity'],
      notProven: ['ChatGPT Sites binding', 'deployment', 'browser parity', 'authenticated execution'],
    },
  };
}

async function cli(args) {
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!args[i]?.startsWith('--') || !args[i + 1] || args[i + 1].startsWith('--')) {
      throw new Error('usage: node export-project.mjs --expected-head <40hex> --output <path>');
    }
    options[args[i].slice(2)] = args[i + 1];
  }
  if (!options['expected-head'] || !options.output) throw new Error('exact head and output required');
  const [workflow, registry] = await Promise.all([
    readFile(resolve(ROOT, 'workflows/actual-flow-v4.workflow.json'), 'utf8').then(JSON.parse),
    readFile(resolve(ROOT, 'workflows/registry.json'), 'utf8').then(JSON.parse),
  ]);
  const observedHead = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: ROOT, encoding: 'utf8'}).trim();
  const observedRef = execFileSync('git', ['symbolic-ref', '-q', 'HEAD'], {cwd: ROOT, encoding: 'utf8'}).trim();
  const payload = buildProjectExport({workflow, registry, expectedHead: options['expected-head'],
    observedHead, observedRef, project: options.project || 'promptos'});
  const dest = resolve(process.cwd(), options.output);
  await mkdir(dirname(dest), {recursive: true});
  await writeFile(dest, JSON.stringify(payload, null, 2) + '\n', {flag: 'wx', mode: 0o600});
  process.stdout.write('Exported actual-flow-v4 definition for ' + payload.source.exactHeadSha +
    '; no deployment or execution authorized.\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  cli(process.argv.slice(2)).catch(err => {console.error(err.message); process.exitCode = 1;});
}
