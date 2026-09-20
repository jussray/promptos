import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AI_MASTERY_V6_PROTOCOL_STACK,
  ATTACK_WORKFLOWS,
  REPAIR_OS_SEQUENCE,
  buildPromptOSSignal,
  compileV6Prompt,
  selectPromptMode,
  validateFounderSignal,
} from './ai-mastery-v6.mjs';

const inbound = (overrides = {}) => ({
  source: 'fcr', target: 'promptos', intent: 'prioritize founder work', goal: 'choose the highest leverage next action',
  evidenceClass: 'verified', evidenceRefs: ['receipt:fcr:123'], authority: 'founder:approval:123', approved: true,
  fingerprint: 'fp:123', proofCookie: 'proof:123', correlationId: 'mission:123', ...overrides,
});

const EXPECTED_PROTOCOL_STACK = [
  'truthmode', 'confess', '5w1h', 'billgates', 'elonmusk', 'garyvee', 'ultrathink',
  'redteam-1', 'redteam-twin', 'lindymode', 'l99', 'redteam-2', 'ooda', 'goalfix',
  'attack-ten', 'proofmode', 'continuity',
];

const EXPECTED_REPAIR_OS = [
  'lindymode', 'redteam-1', 'attack-ten', 'ooda-observe', 'ooda-orient', 'ooda-decide',
  'l99-authority', 'act', 'redteam-2', 'recursive-hardening', 'verify', 'loop',
];

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

test('V6 protocol stack preserves founder challenge order exactly', () => {
  assert.deepEqual([...AI_MASTERY_V6_PROTOCOL_STACK], EXPECTED_PROTOCOL_STACK);
  assert.equal(new Set(AI_MASTERY_V6_PROTOCOL_STACK).size, AI_MASTERY_V6_PROTOCOL_STACK.length);
});

test('repair OS fuses Lindy Red Team attack OODA L99 action and verification', () => {
  assert.deepEqual([...REPAIR_OS_SEQUENCE], EXPECTED_REPAIR_OS);
  assert.equal(new Set(REPAIR_OS_SEQUENCE).size, REPAIR_OS_SEQUENCE.length);
  assert.equal(ATTACK_WORKFLOWS.premise, 'attack-ten');
  assert.equal(ATTACK_WORKFLOWS.implementation, 'recursive-hardening');
  assert.equal(ATTACK_WORKFLOWS.recursiveContract, 'juss-v10/recursive-hardening@v1');
  assert.equal(ATTACK_WORKFLOWS.requiredCycles, 10);
  assert.deepEqual([...ATTACK_WORKFLOWS.modes], [
    'authority-inversion', 'evidence-falsification', 'human-outcome', 'temporal-race',
  ]);
  assert.equal(ATTACK_WORKFLOWS.authorityEffect, 'none');
});

test('compiled prompt preserves V6 kernel order and separate receipts', () => {
  const result = compileV6Prompt(inbound({ requestedMode: 'workflow-optimizer' }));
  assert.equal(result.selected, true);
  assert.match(result.prompt, /TRUTHMODE -> CONFESS -> 5W1H -> BILLGATES -> ELONMUSK -> GARYVEE -> ULTRATHINK -> REDTEAM I -> REDTEAM TWIN -> LINDY -> L99 -> REDTEAM II -> OODA -> GOALFIX -> ATTACK TEN -> ACTION -> PROOF -> CONTINUITY -> NEXT GATE/);
  assert.match(result.prompt, /Repair OS: LINDY -> REDTEAM I -> ATTACK TEN -> OODA OBSERVE -> OODA ORIENT -> OODA DECIDE -> L99 AUTHORITY -> ACT -> REDTEAM II -> RECURSIVE HARDENING -> VERIFY -> LOOP/);
  assert.match(result.prompt, /10-cycle RECURSIVE HARDENING/);
  assert.match(result.prompt, /authority inversion, evidence falsification, human-outcome failure, and temporal races/);
  assert.match(result.prompt, /never create, renew, widen, or transport execution authority/);
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
