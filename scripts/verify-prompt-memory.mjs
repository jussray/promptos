import assert from 'node:assert/strict';
import {
  clearPromptMemory,
  exportPromptMemory,
  inferLane,
  laneContract,
  listPrompts,
  recordExecution,
  recordGeneratedPrompt,
  recordOutcome,
} from '../src/prompt-memory.js';

await clearPromptMemory();

assert.equal(inferLane({ familyId: 'brand.voice.and.content' }), 'content.creation');
assert.equal(inferLane({ familyId: 'debug.without.thrashing' }), 'repo.engineering');
assert.equal(laneContract('content.creation').northStar, 'founder_intent_outcome');

const first = await recordGeneratedPrompt({
  promptText: 'Create a founder post that explains PromptOS clearly.',
  title: 'Founder post',
  workflowId: 'brand.voice.and.content',
  founderIntent: 'Earn qualified replies from builders who understand the product.',
  source: { surface: 'catalog', familyId: 'brand.voice.and.content', platform: 'chatgpt', stage: 'build' },
  channel: 'LinkedIn',
});
assert.equal(first.laneId, 'content.creation');
assert.equal(first.status, 'generated');
assert.equal(first.libraryVisibility, 'revision');
assert.deepEqual(first.route.recommendedExecutors, ['sol', 'chief', 'fcr']);
assert.equal(first.route.executionAuthority, 'advisory-only');
assert.equal(first.route.publicationRequiresApproval, true);

const duplicate = await recordGeneratedPrompt({
  promptText: 'Create a founder post that explains PromptOS clearly.',
  title: 'Founder post',
  workflowId: 'brand.voice.and.content',
  founderIntent: 'Earn qualified replies from builders who understand the product.',
  source: { surface: 'catalog', familyId: 'brand.voice.and.content' },
});
assert.equal(duplicate.id, first.id);
assert.equal(duplicate.observations, 2);

const executed = await recordExecution(first.id, {
  executor: 'sol',
  channel: 'LinkedIn',
  status: 'published',
  artifactRef: 'https://example.test/post/1',
});
assert.equal(executed.executions.length, 1);
assert.equal(executed.executions[0].channel, 'LinkedIn');
assert.equal(executed.libraryVisibility, 'revision', 'execution alone must not promote a prompt');

const missed = await recordOutcome(first.id, {
  metric: 'qualified_replies',
  value: '0',
  founderIntentSatisfied: false,
  attribution: 'unknown',
  evidenceRef: 'analytics://post-1',
  note: 'Published successfully, but the founder intent was not met.',
});
assert.equal(missed.status, 'revision_required');
assert.equal(missed.libraryVisibility, 'revision');
assert.equal(missed.outcomes[0].attribution, 'unknown');

const revised = await recordGeneratedPrompt({
  promptText: 'Create a founder post that explains PromptOS with one concrete before/after example and asks builders one precise question.',
  title: 'Founder post',
  workflowId: 'brand.voice.and.content',
  founderIntent: 'Earn qualified replies from builders who understand the product.',
  source: { surface: 'catalog', familyId: 'brand.voice.and.content', platform: 'chatgpt', stage: 'build' },
});
assert.equal(revised.lineageId, first.lineageId);
assert.equal(revised.version, 2);
assert.equal(revised.supersedesId, first.id);
assert.equal(revised.libraryVisibility, 'revision');

const pending = await recordOutcome(revised.id, {
  metric: 'meaningful_engagement',
  value: '14 reactions',
  founderIntentSatisfied: null,
  attribution: 'unknown',
  note: 'Engagement exists, but no founder-intent outcome has been verified yet.',
});
assert.equal(pending.status, 'outcome_pending');
assert.equal(pending.libraryVisibility, 'revision', 'raw engagement must not auto-promote');

const proven = await recordOutcome(revised.id, {
  metric: 'qualified_replies',
  value: '6',
  founderIntentSatisfied: true,
  attribution: 'prompt',
  evidenceRef: 'analytics://post-2',
});
assert.equal(proven.status, 'proven');
assert.equal(proven.libraryVisibility, 'visual');

const visual = await listPrompts({ libraryVisibility: 'visual' });
const revision = await listPrompts({ libraryVisibility: 'revision' });
assert.equal(visual.length, 1);
assert.equal(visual[0].id, revised.id);
assert.equal(revision.length, 1);
assert.equal(revision[0].id, first.id);

const exported = await exportPromptMemory();
assert.equal(exported.fcrSync, 'not-connected');
assert.equal(exported.prompts.length, 2);
assert.ok(exported.prompts.every((record) => record.promptText && record.lineageId));

console.log(JSON.stringify({
  status: 'passed',
  promptCount: exported.prompts.length,
  provenCount: visual.length,
  revisionCount: revision.length,
  lanes: [...new Set(exported.prompts.map((record) => record.laneId))],
  lineageVersion: proven.version,
  executionReceiptCount: executed.executions.length,
}));
