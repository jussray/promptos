import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPromptOSSignal, compileV6Prompt, selectPromptMode, validateFounderSignal } from './ai-mastery-v6.mjs';

const inbound = (overrides = {}) => ({
  source: 'fcr', target: 'promptos', intent: 'prioritize founder work', goal: 'choose the highest leverage next action',
  evidenceClass: 'verified', evidenceRefs: ['receipt:fcr:123'], authority: 'founder:approval:123', approved: true,
  fingerprint: 'fp:123', proofCookie: 'proof:123', correlationId: 'mission:123', ...overrides,
});

test('FCR signal selects task prioritizer', () => {
  const route = selectPromptMode(inbound());
  assert.equal(route.selected, true);
  assert.equal(route.mode, 'task-prioritizer');
});

test('Chief can explicitly request a valid prompt mode', () => {
  const route = selectPromptMode(inbound({ source: 'chief', intent: 'reason about mission', requestedMode: 'goal-to-action' }));
  assert.equal(route.mode, 'goal-to-action');
  assert.equal(route.reason, 'explicit-mode');
});

test('unknown intent fails closed instead of guessing a prompt', () => {
  const route = selectPromptMode(inbound({ intent: 'florbulate the moon' }));
  assert.equal(route.selected, false);
  assert.equal(route.reason, 'no-safe-match');
});

test('approval without authority is rejected', () => {
  const result = validateFounderSignal(inbound({ authority: 'none' }));
  assert.equal(result.valid, false);
  assert.match(result.errors.join(' '), /approval requires/i);
});

test('compiled prompt preserves V6 kernel order and separate receipts', () => {
  const result = compileV6Prompt(inbound({ requestedMode: 'workflow-optimizer' }));
  assert.equal(result.selected, true);
  assert.match(result.prompt, /CONFESS\/TRUTHMODE -> ULTRATHINK -> REDTEAM I -> LINDY -> L99 -> REDTEAM TWIN -> OODA -> GOALFIX/);
  assert.match(result.prompt, /independent failures as separate receipts/);
  assert.match(result.prompt, /never creates or renews authority/);
});

test('PromptOS emits deterministic bounded signals to FCR or Chief', () => {
  const a = buildPromptOSSignal({ target: 'chief', intent: 'decide', goal: 'select prompt', mode: 'goal-to-action', correlationId: 'm1' });
  const b = buildPromptOSSignal({ target: 'chief', intent: 'decide', goal: 'select prompt', mode: 'goal-to-action', correlationId: 'm1' });
  assert.equal(a.signalHash, b.signalHash);
  assert.equal(a.source, 'promptos');
  assert.equal(a.target, 'chief');
  assert.equal(a.selectedMode, 'goal-to-action');
  assert.throws(() => buildPromptOSSignal({ target: 'random-system' }), /target must be fcr or chief/);
});
