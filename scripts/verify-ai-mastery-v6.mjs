import {readFile} from 'node:fs/promises';
import {
  AI_MASTERY_V6_PROTOCOL_STACK,
  CHALLENGE_LENS_SEMANTICS,
  compileV6Prompt,
} from '../src/ai-mastery-v6.mjs';

const workflow = JSON.parse(await readFile('workflows/ai-mastery-v6.workflow.json', 'utf8'));
const registry = JSON.parse(await readFile('workflows/registry.json', 'utf8'));
const failures = [];

if (workflow.schemaVersion !== 1 || workflow.artifactType !== 'promptos-workflow') failures.push('workflow schema identity invalid');
if (workflow.id !== 'ai-mastery-v6' || workflow.version !== '6.0') failures.push('AI Mastery V6 identity/version invalid');
if (workflow.status !== 'approved' || workflow.registrationAuthority !== 'founder-approved') failures.push('founder approval provenance missing');
for (const state of ['VERIFIED','INFERRED','UNKNOWN','BLOCKED']) if (!workflow.truthStates?.includes(state)) failures.push(`missing truth state ${state}`);

const expectedStack = [...AI_MASTERY_V6_PROTOCOL_STACK];
if (JSON.stringify(workflow.protocolStack) !== JSON.stringify(expectedStack)) {
  failures.push(`protocol stack drift: expected ${expectedStack.join(' -> ')}`);
}
if (new Set(workflow.protocolStack ?? []).size !== (workflow.protocolStack ?? []).length) failures.push('protocol stack contains duplicates');
for (const required of ['billgates','elonmusk','garyvee','redteam-1','redteam-twin','lindymode','l99','redteam-2','ooda','goalfix','attack-ten']) {
  if (!workflow.protocolStack?.includes(required)) failures.push(`missing required protocol ${required}`);
}
for (const specialist of ['deep-work','goal-to-action','task-prioritizer','meeting-to-action','learning-accelerator','email-efficiency','workflow-optimizer','daily-progress']) {
  if (!workflow.specialists?.[specialist]) failures.push(`missing specialist ${specialist}`);
}
for (const section of ['REALITY','FIX','PROOF','RISK','ROLLBACK','BLOCKED','NEXT GATE']) if (!workflow.outputContract?.includes(section)) failures.push(`missing output section ${section}`);
if (!/cannot self-authorize consequential action/i.test(workflow.handoff?.chief || '')) failures.push('Chief authority boundary missing');
if (!/PromptOS owns this workflow definition/i.test(workflow.handoff?.promptos || '')) failures.push('PromptOS ownership boundary missing');
if (!/FCR receives the compiled workflow signal/i.test(workflow.handoff?.fcr || '')) failures.push('FCR receive/execute boundary missing');
if (!/never grants authority/i.test(workflow.handoff?.signalRule || '')) failures.push('signal non-authority rule missing');
if (!workflow.operatingPrinciples?.some((p) => /separate receipt/i.test(p))) failures.push('separate failure receipt rule missing');
if (!workflow.operatingPrinciples?.some((p) => /bidirectional non-secret state markers/i.test(p))) failures.push('bidirectional continuity rule missing');
if (!workflow.operatingPrinciples?.some((p) => /may never be overwritten by model-generated content/i.test(p))) failures.push('system-owned provenance protection missing');
if (!workflow.operatingPrinciples?.some((p) => /Playwright evidence/i.test(p))) failures.push('real-path Playwright requirement missing');
if (!workflow.operatingPrinciples?.some((p) => /Never inherit stale green/i.test(p))) failures.push('stale-proof invalidation missing');

const bill = CHALLENGE_LENS_SEMANTICS.billgates;
const elon = CHALLENGE_LENS_SEMANTICS.elonmusk;
if (bill?.objective !== 'durable_growth' || bill?.role !== 'durable-leverage') failures.push('Bill Gates lens identity drift');
if (elon?.objective !== 'upside_growth' || elon?.role !== 'first-principles-execution') failures.push('Elon Musk lens identity drift');
if (bill?.authorityEffect !== 'none' || elon?.authorityEffect !== 'none') failures.push('challenge lenses must not create authority');
for (const behavior of [
  'identify-the-bottleneck-and-highest-leverage-point',
  'prefer-stable-options-and-reversible-changes',
  'prefer-generated-docs-shared-fixtures-and-reusable-artifacts',
  'standardize-a-proven-path-before-scaling',
  'do-not-scale-an-unproven-path',
]) {
  if (!bill?.behaviors?.includes(behavior)) failures.push(`Bill Gates semantic missing: ${behavior}`);
}
for (const behavior of [
  'question-requirements-before-accepting-them',
  'delete-before-optimizing',
  'simplify-from-first-principles',
  'prefer-fast-small-reversible-experiments',
  'accelerate-feedback-and-automate-last',
]) {
  if (!elon?.behaviors?.includes(behavior)) failures.push(`Elon Musk semantic missing: ${behavior}`);
}

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
if (!compiled.selected || !compiled.prompt) failures.push('canonical V6 prompt did not compile');
if (!/BILLGATES lens \(durable_growth\)/.test(compiled.prompt || '')) failures.push('compiled prompt does not pin Bill Gates semantics');
if (!/standardize proven paths before scaling and do not scale unproven paths/i.test(compiled.prompt || '')) failures.push('compiled prompt lost Bill Gates scale boundary');
if (!/ELONMUSK lens \(upside_growth\)/.test(compiled.prompt || '')) failures.push('compiled prompt does not pin Elon Musk semantics');
if (!/question requirements; delete before optimizing; simplify from first principles/i.test(compiled.prompt || '')) failures.push('compiled prompt lost Elon Musk first-principles sequence');
if (!/Authority effect: none/i.test(compiled.prompt || '')) failures.push('compiled challenge lens authority boundary missing');

const entry = registry.workflows?.find((item) => item.id === workflow.id);
if (!entry) failures.push('workflow missing from registry');
if (entry?.version !== workflow.version || entry?.status !== 'approved' || entry?.path !== 'workflows/ai-mastery-v6.workflow.json') failures.push('registry/workflow drift');
const ultrathink = registry.workflows?.find((item) => item.id === 'ultrathink');
if (ultrathink?.version !== '1.6') failures.push('current-main ULTRATHINK registry version was not preserved');

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
  chiefSignal:true,
  fcrReceiveBoundary:true,
  authorityPreserved:true,
}));
