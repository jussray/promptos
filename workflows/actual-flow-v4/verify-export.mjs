import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildProjectExport} from './export-project.mjs';

const sha = 'a'.repeat(40);
const workflow = {
  schemaVersion: 1,
  artifactType: 'promptos-workflow',
  id: 'actual-flow-v4', version: '4.0.0', status: 'approved',
  registrationAuthority: 'founder-approved',
  provenance: { contract: 'juss/actual-flow-v4-proof@v1',
    neverAuthorizesExecution: true, requiresExactRepositoryHead: true },
  reasoningSequence: ['scope','challenge','implement','verify','report'],
  truthStates: ['VERIFIED', 'INFERRED', 'UNKNOWN', 'BLOCKED'],
};
const registry = {workflows: [{id:workflow.id, version:workflow.version,
  status:'approved', path:'workflows/actual-flow-v4.workflow.json'}]};
const input = {workflow, registry, expectedHead:sha, observedHead:sha, observedRef:'refs/heads/main'};
const build = overrides => buildProjectExport({...input, ...overrides});
const output = build();

assert.equal(output.schema, 'juss/promptos-workflow-project-export@v1');
assert.equal(output.artifact.id, 'actual-flow-v4');
assert.equal(output.source.exactHeadSha, sha);
assert.equal(output.source.observedRef, 'refs/heads/main');
assert.equal(output.source.isCanonicalMain, true);
assert.equal(output.verification.registrationEffective, true);
const candidate = build({observedRef:'refs/heads/feat/example'});
assert.equal(candidate.source.isCanonicalMain, false);
assert.equal(candidate.runtime.status, 'candidate-definition-only');
assert.equal(candidate.verification.registrationEffective, false);
assert.throws(() => build({observedRef:'unsupported-ref'}), /invalid source ref/);
assert.throws(() => build({observedRef:'refs/heads/../main'}), /invalid source ref/);
assert.equal(output.source.canonicalBranch, 'main');
assert.equal(output.runtime.automaticExecution, false);
assert.equal(output.runtime.providerPrivilegesGranted, false);
assert.equal(output.runtime.sitesIdentity, 'UNVERIFIED');
assert.equal(output.runtime.deployed, false);
assert.equal(JSON.stringify(output), JSON.stringify(build()), 'export must be deterministic');
assert.throws(() => build({expectedHead:'b'.repeat(40)}), /stale or invalid/);
assert.throws(() => build({expectedHead:'invalid', observedHead:'invalid'}), /stale or invalid/);
assert.throws(() => build({project:'another-site'}), /unverified project/);
assert.throws(() => build({workflow:{...workflow, status:'draft'}}), /founder-approved/);
assert.throws(() => build({workflow:{...workflow, registrationAuthority:'founder-review-required'}}), /founder-approved/);
assert.throws(() => build({workflow:{...workflow, provenance:{...workflow.provenance, neverAuthorizesExecution:false}}}), /invariants/);
assert.throws(() => build({registry:{workflows:[]}}), /registry entry/);
assert.throws(() => build({registry:{workflows:[...registry.workflows,...registry.workflows]}}), /registry entry/);
assert.throws(() => build({registry:{workflows:[{...registry.workflows[0], version:'stale'}]}}), /registry entry/);
assert.throws(() => build({workflow:{...workflow, truthStates:['VERIFIED']}}), /classifications/);

const [realWorkflow, realRegistry] = await Promise.all([
  readFile(new URL('../actual-flow-v4.workflow.json', import.meta.url), 'utf8').then(JSON.parse),
  readFile(new URL('../registry.json', import.meta.url), 'utf8').then(JSON.parse),
]);
const realExport = buildProjectExport({workflow: realWorkflow, registry: realRegistry,
  expectedHead:sha, observedHead:sha, observedRef:'refs/heads/main'});
assert.equal(realExport.artifact.version, realWorkflow.version);
assert.equal(realExport.runtime.status, 'definition-only');
console.log('PASS actual-flow-v4 project-export and registry checks');
