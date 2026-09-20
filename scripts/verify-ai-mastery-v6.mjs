import {readFile} from 'node:fs/promises';
import {
  AI_MASTERY_V6_PROTOCOL_STACK,
  CHALLENGE_LENS_SEMANTICS,
  compileV6Prompt,
} from '../src/ai-mastery-v6.mjs';
import {
  DECISION_PROOF_KINDS,
  FOUNDER_DECISION_POLICIES,
  FOUNDER_DECISION_POLICY_CONTRACT,
  evaluateDecisionTournament,
  scoreDecisionPolicy,
  validateDecisionEvidence,
} from '../src/ai-mastery-v6-decision-policies.mjs';

const workflow = JSON.parse(await readFile('workflows/ai-mastery-v6.workflow.json', 'utf8'));
const registry = JSON.parse(await readFile('workflows/registry.json', 'utf8'));
const failures = [];

function fail(message) {
  if (failures.length < 80) failures.push(message);
}

if (workflow.schemaVersion !== 1 || workflow.artifactType !== 'promptos-workflow') fail('workflow schema identity invalid');
if (workflow.id !== 'ai-mastery-v6' || workflow.version !== '6.0') fail('AI Mastery V6 identity/version invalid');
if (workflow.status !== 'approved' || workflow.registrationAuthority !== 'founder-approved') fail('founder approval provenance missing');
for (const state of ['VERIFIED','INFERRED','UNKNOWN','BLOCKED']) if (!workflow.truthStates?.includes(state)) fail(`missing truth state ${state}`);

const expectedStack = [...AI_MASTERY_V6_PROTOCOL_STACK];
if (JSON.stringify(workflow.protocolStack) !== JSON.stringify(expectedStack)) {
  fail(`protocol stack drift: expected ${expectedStack.join(' -> ')}`);
}
if (new Set(workflow.protocolStack ?? []).size !== (workflow.protocolStack ?? []).length) fail('protocol stack contains duplicates');
for (const required of ['billgates','elonmusk','garyvee','redteam-1','redteam-twin','lindymode','l99','redteam-2','ooda','goalfix','attack-ten']) {
  if (!workflow.protocolStack?.includes(required)) fail(`missing required protocol ${required}`);
}
for (const specialist of ['deep-work','goal-to-action','task-prioritizer','meeting-to-action','learning-accelerator','email-efficiency','workflow-optimizer','daily-progress']) {
  if (!workflow.specialists?.[specialist]) fail(`missing specialist ${specialist}`);
}
for (const section of ['REALITY','FIX','PROOF','RISK','ROLLBACK','BLOCKED','NEXT GATE']) if (!workflow.outputContract?.includes(section)) fail(`missing output section ${section}`);
if (!/cannot self-authorize consequential action/i.test(workflow.handoff?.chief || '')) fail('Chief authority boundary missing');
if (!/PromptOS owns this workflow definition/i.test(workflow.handoff?.promptos || '')) fail('PromptOS ownership boundary missing');
if (!/FCR receives the compiled workflow signal/i.test(workflow.handoff?.fcr || '')) fail('FCR receive/execute boundary missing');
if (!/never grants authority/i.test(workflow.handoff?.signalRule || '')) fail('signal non-authority rule missing');
if (!workflow.operatingPrinciples?.some((p) => /separate receipt/i.test(p))) fail('separate failure receipt rule missing');
if (!workflow.operatingPrinciples?.some((p) => /bidirectional non-secret state markers/i.test(p))) fail('bidirectional continuity rule missing');
if (!workflow.operatingPrinciples?.some((p) => /may never be overwritten by model-generated content/i.test(p))) fail('system-owned provenance protection missing');
if (!workflow.operatingPrinciples?.some((p) => /Playwright evidence/i.test(p))) fail('real-path Playwright requirement missing');
if (!workflow.operatingPrinciples?.some((p) => /Never inherit stale green/i.test(p))) fail('stale-proof invalidation missing');

const bill = CHALLENGE_LENS_SEMANTICS.billgates;
const elon = CHALLENGE_LENS_SEMANTICS.elonmusk;
if (bill?.objective !== 'durable_growth' || bill?.role !== 'durable-leverage') fail('Bill Gates reasoning lens identity drift');
if (elon?.objective !== 'upside_growth' || elon?.role !== 'first-principles-execution') fail('Elon Musk reasoning lens identity drift');
if (bill?.authorityEffect !== 'none' || elon?.authorityEffect !== 'none') fail('challenge lenses must not create authority');
for (const behavior of [
  'identify-the-bottleneck-and-highest-leverage-point',
  'prefer-stable-options-and-reversible-changes',
  'prefer-generated-docs-shared-fixtures-and-reusable-artifacts',
  'standardize-a-proven-path-before-scaling',
  'do-not-scale-an-unproven-path',
]) {
  if (!bill?.behaviors?.includes(behavior)) fail(`Bill Gates reasoning semantic missing: ${behavior}`);
}
for (const behavior of [
  'question-requirements-before-accepting-them',
  'delete-before-optimizing',
  'simplify-from-first-principles',
  'prefer-fast-small-reversible-experiments',
  'accelerate-feedback-and-automate-last',
]) {
  if (!elon?.behaviors?.includes(behavior)) fail(`Elon Musk reasoning semantic missing: ${behavior}`);
}

const billPolicy = FOUNDER_DECISION_POLICIES.billgates;
const elonPolicy = FOUNDER_DECISION_POLICIES.elonmusk;
if (FOUNDER_DECISION_POLICY_CONTRACT !== 'promptos/founder-decision-policies@v1') fail('founder decision policy contract identity drift');
if (billPolicy?.role !== 'conservative_lane' || billPolicy?.enabled !== true || billPolicy?.objective !== 'durable_growth') fail('canonical /billgates executable policy drift');
if (elonPolicy?.role !== 'aggressive_lane' || elonPolicy?.enabled !== true || elonPolicy?.objective !== 'upside_growth') fail('canonical /elonmusk executable policy drift');
if (billPolicy?.authorityEffect !== 'none' || elonPolicy?.authorityEffect !== 'none') fail('executable decision policies must remain non-authorizing');
for (const behavior of ['prefer_stable_options','prefer_reversible_changes','prefer_generated_docs','prefer_shared_fixtures']) {
  if (billPolicy?.behavior?.[behavior] !== true) fail(`canonical /billgates behavior missing: ${behavior}`);
}
for (const behavior of ['prefer_speed','prefer_first_principles','prefer_experimentation','prefer_small_bets_first']) {
  if (elonPolicy?.behavior?.[behavior] !== true) fail(`canonical /elonmusk behavior missing: ${behavior}`);
}
if (billPolicy.objective !== bill.objective || elonPolicy.objective !== elon.objective) fail('executable policy and reasoning lens objective drift');

const compiled = compileV6Prompt({
  source: 'founder',
  target: 'promptos',
  intent: 'optimize workflow',
  goal: 'remove the highest-leverage bottleneck without widening authority',
  evidenceClass: 'verified',
  authority: 'founder:audit',
  approved: true,
  requestedMode: 'workflow-optimizer',
});
if (!compiled.selected || !compiled.prompt) fail('canonical V6 prompt did not compile');
if (!/BILLGATES lens \(durable_growth\)/.test(compiled.prompt || '')) fail('compiled prompt does not pin Bill Gates semantics');
if (!/standardize proven paths before scaling and do not scale unproven paths/i.test(compiled.prompt || '')) fail('compiled prompt lost Bill Gates scale boundary');
if (!/ELONMUSK lens \(upside_growth\)/.test(compiled.prompt || '')) fail('compiled prompt does not pin Elon Musk semantics');
if (!/question requirements; delete before optimizing; simplify from first principles/i.test(compiled.prompt || '')) fail('compiled prompt lost Elon Musk first-principles sequence');
if (!/Authority effect: none/i.test(compiled.prompt || '')) fail('compiled challenge lens authority boundary missing');

const canonicalEvidence = {growth: 10, drawdown: 2, speed: 4, risk: 1};
const billScore = scoreDecisionPolicy('billgates', canonicalEvidence);
const elonScore = scoreDecisionPolicy('elonmusk', canonicalEvidence);
if (Math.abs(billScore - (10 - 2 - 1 + (1 / 5))) > Number.EPSILON) fail('Bill Gates score formula drift');
if (Math.abs(elonScore - (10 + 4 - 2 - 1)) > Number.EPSILON) fail('Elon Musk score formula drift');

const negativeSpeed = validateDecisionEvidence({growth:1, drawdown:1, speed:-1, risk:1});
if (negativeSpeed.valid) fail('negative speed must fail closed before Bill Gates stability division');
const nonFinite = validateDecisionEvidence({growth:1, drawdown:1, speed:Number.POSITIVE_INFINITY, risk:1});
if (nonFinite.valid) fail('non-finite decision evidence must fail closed');

const missingProofPolicy = evaluateDecisionTournament({
  evidence: canonicalEvidence,
  gates: {truthmodeApproved:true, redteamPassed:true, redteamVeto:false, lindyPassed:true, ultrathinkPassed:true, proofs:{}},
  requiredProofs: [],
});
if (missingProofPolicy.allow || missingProofPolicy.executionAuthorized !== false || missingProofPolicy.winner !== null) fail('missing project-specific proof requirements must fail closed');

let rng = 0x5eed6000;
function randomUnit() {
  rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
  return rng / 0x100000000;
}
function metric() {
  return Math.round(randomUnit() * 100000) / 1000;
}

let attackCases = 0;
let blockedCases = 0;
let approvedCases = 0;
for (let index = 0; index < 6000; index += 1) {
  const evidence = {growth:metric(), drawdown:metric(), speed:metric(), risk:metric()};
  const proofKind = DECISION_PROOF_KINDS[index % DECISION_PROOF_KINDS.length];
  const gates = {
    truthmodeApproved: true,
    redteamPassed: true,
    redteamVeto: false,
    lindyPassed: true,
    ultrathinkPassed: true,
    proofs: {[proofKind]: true},
  };
  let expectedBlocked = false;
  switch (index % 11) {
    case 0:
      gates.truthmodeApproved = false;
      expectedBlocked = true;
      break;
    case 1:
      gates.redteamVeto = true;
      expectedBlocked = true;
      break;
    case 2:
      gates.redteamPassed = false;
      expectedBlocked = true;
      break;
    case 3:
      gates.lindyPassed = false;
      expectedBlocked = true;
      break;
    case 4:
      gates.ultrathinkPassed = false;
      expectedBlocked = true;
      break;
    case 5:
      gates.proofs[proofKind] = false;
      expectedBlocked = true;
      break;
    default:
      break;
  }

  const result = evaluateDecisionTournament({evidence, gates, requiredProofs:[proofKind]});
  attackCases += 1;
  if (result.executionAuthorized !== false || result.authorityEffect !== 'none' || result.humanDecisionRequired !== true) {
    fail(`attack-${index}: policy result widened authority`);
  }
  if (expectedBlocked) {
    blockedCases += 1;
    if (result.allow !== false || result.winner !== null || result.scores !== null) fail(`attack-${index}: failed gate produced false green`);
    continue;
  }

  approvedCases += 1;
  if (result.allow !== true || result.reasons?.[0] !== 'approved') {
    fail(`attack-${index}: valid evidence/gates did not produce a recommendation`);
    continue;
  }
  const expectedBill = scoreDecisionPolicy('billgates', evidence);
  const expectedElon = scoreDecisionPolicy('elonmusk', evidence);
  const expectedWinner = expectedBill > expectedElon ? 'billgates' : expectedElon > expectedBill ? 'elonmusk' : 'tie';
  if (result.winner !== expectedWinner) fail(`attack-${index}: winner drifted from deterministic scoring`);
  if (result.scores?.billgates !== expectedBill || result.scores?.elonmusk !== expectedElon) fail(`attack-${index}: score drift`);
  if (!result.evidenceFingerprint || result.evidenceFingerprint.length !== 64) fail(`attack-${index}: shared evidence fingerprint missing`);
}
if (attackCases !== 6000) fail(`Attack 6000 executed ${attackCases} cases instead of 6000`);
if (blockedCases === 0 || approvedCases === 0) fail('Attack 6000 did not exercise both fail-closed and recommendation paths');

const entry = registry.workflows?.find((item) => item.id === workflow.id);
if (!entry) fail('workflow missing from registry');
if (entry?.version !== workflow.version || entry?.status !== 'approved' || entry?.path !== 'workflows/ai-mastery-v6.workflow.json') fail('registry/workflow drift');
const ultrathink = registry.workflows?.find((item) => item.id === 'ultrathink');
if (ultrathink?.version !== '1.6') fail('current-main ULTRATHINK registry version was not preserved');

if (failures.length) {
  console.error('AI Mastery V6 verification failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(JSON.stringify({
  status:'passed',
  id:workflow.id,
  version:workflow.version,
  registered:true,
  protocolStack:expectedStack,
  challengeLenses:{billgates:bill.objective,elonmusk:elon.objective},
  executablePolicies:{
    contract:FOUNDER_DECISION_POLICY_CONTRACT,
    billgates:{role:billPolicy.role,objective:billPolicy.objective},
    elonmusk:{role:elonPolicy.role,objective:elonPolicy.objective},
    sameEvidence:true,
    projectSpecificProofRequired:true,
    executionAuthorized:false,
  },
  attack6000:{cases:attackCases,blocked:blockedCases,approved:approvedCases,status:'passed'},
  chiefSignal:true,
  fcrReceiveBoundary:true,
  authorityPreserved:true,
}));
