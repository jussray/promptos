import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = JSON.parse(readFileSync('workflows/active-defense.workflow.json', 'utf8'));
const ultrathink = JSON.parse(readFileSync('workflows/ultrathink.workflow.json', 'utf8'));

const requiredFlows = [
  'attack10', 'attack20', 'attack30', 'attack3000', 'attack5000', 'attack6000', 'attack48000',
  'redteamI', 'redteamII', 'redteamTwin', 'devil', 'lindymode', 'l99', 'ooda', 'truthmode',
  'confess', 'goalfix', 'proofMode', 'continuity', 'rollback',
];

assert.equal(workflow.id, 'active-defense');
assert.equal(workflow.orchestrator, 'ultrathink');
assert.deepEqual(workflow.attackUnit, requiredFlows);
assert.equal(workflow.hallway.fixedLogicalExpansionPerStep, 48000);
assert.equal(workflow.hallway.additionalExpansion.minimum, 1);
assert.equal(workflow.hallway.additionalExpansion.maximum, 48000);
assert.equal(workflow.hallway.additionalExpansion.requiredForContainedStep, true);
assert.equal(workflow.hallway.materialization, 'lazy');
assert.equal(workflow.hallway.materializedContinuationBudget, 8);
assert.equal(workflow.hallway.sessionIsolationRequired, true);
assert.equal(workflow.hallway.realCredentialsAllowed, false);
assert.equal(workflow.hallway.realCustomerDataAllowed, false);
assert.equal(workflow.hallway.productionAuthorityAllowed, false);
assert.equal(workflow.hallway.outboundIntrusiveProbeAllowed, false);
assert.equal(workflow.identityPolicy.claimedIdentityIsNotVerifiedIdentity, true);
assert.equal(workflow.identityPolicy.humanAttributionWithoutIndependentEvidence, 'UNKNOWN');
assert.ok(workflow.hardInvariants.some((entry) => entry.includes('No single lens')));
assert.ok(workflow.hardInvariants.some((entry) => entry.includes('fixed 48000')));
assert.ok(workflow.hardInvariants.some((entry) => entry.includes('does not authorize intrusive outbound')));

const ultrathinkText = JSON.stringify(ultrathink).toLowerCase();
for (const marker of ['red-team', 'lindy', 'l99', 'ooda', 'proof']) {
  assert.ok(ultrathinkText.includes(marker), `ULTRATHINK missing ${marker}`);
}

console.log(JSON.stringify({
  ok: true,
  contract: 'juss/active-defense@v1',
  workflow: workflow.id,
  attackFlows: workflow.attackUnit.length,
  fixedExpansion: workflow.hallway.fixedLogicalExpansionPerStep,
  randomExpansion: [workflow.hallway.additionalExpansion.minimum, workflow.hallway.additionalExpansion.maximum],
}));
