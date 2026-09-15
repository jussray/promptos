import {readFile} from 'node:fs/promises';

const workflow = JSON.parse(await readFile('workflows/ai-mastery-v6.workflow.json', 'utf8'));
const registry = JSON.parse(await readFile('workflows/registry.json', 'utf8'));
const failures = [];

if (workflow.schemaVersion !== 1 || workflow.artifactType !== 'promptos-workflow') failures.push('workflow schema identity invalid');
if (workflow.id !== 'ai-mastery-v6' || workflow.version !== '6.0') failures.push('AI Mastery V6 identity/version invalid');
if (workflow.status !== 'approved' || workflow.registrationAuthority !== 'founder-approved') failures.push('founder approval provenance missing');
for (const state of ['VERIFIED','INFERRED','UNKNOWN','BLOCKED']) if (!workflow.truthStates?.includes(state)) failures.push(`missing truth state ${state}`);
for (const protocol of ['truthmode','confess','5w1h','redteam-1','redteam-twin','l99','lindymode','ooda','goalfix','redteam-2','proofmode','continuity']) {
  if (!workflow.protocolStack?.includes(protocol)) failures.push(`missing protocol ${protocol}`);
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

const entry = registry.workflows?.find((item) => item.id === workflow.id);
if (!entry) failures.push('workflow missing from registry');
if (entry?.version !== workflow.version || entry?.status !== 'approved' || entry?.path !== 'workflows/ai-mastery-v6.workflow.json') failures.push('registry/workflow drift');

if (failures.length) {
  console.error('AI Mastery V6 verification failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(JSON.stringify({status:'passed', id:workflow.id, version:workflow.version, registered:true, chiefSignal:true, fcrReceiveBoundary:true, authorityPreserved:true}));
