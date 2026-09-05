import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PROMPTOS_STATE_POLICY,
  canonicalPromptOSStateJSON,
  promptOSStateFingerprint,
  validatePromptOSStateText,
} from '../src/promptos-state-schema.mjs';

function validState(overrides = {}) {
  return {
    schemaVersion: 1,
    stars: {'64': true},
    custom: [{
      id: 'custom_1',
      emoji: '✨',
      title: 'Example',
      sub: '',
      cat: 'custom',
      platforms: ['chatgpt'],
      body: 'Do the bounded thing.',
      ts: 1,
    }],
    theme: 'dark',
    _v: 1,
    ...overrides,
  };
}

test('accepts and normalizes schemaVersion 1 state', () => {
  const state = validatePromptOSStateText(JSON.stringify(validState()));
  assert.equal(state.schemaVersion, 1);
  assert.equal(state.stars['64'], true);
  assert.equal(state.custom[0].id, 'custom_1');
});

test('rejects legacy remote schema', () => {
  assert.throws(() => validatePromptOSStateText(JSON.stringify(validState({schemaVersion: 0}))), /schemaVersion must be 1/);
});

test('rejects future remote schema', () => {
  assert.throws(() => validatePromptOSStateText(JSON.stringify(validState({schemaVersion: 2}))), /schemaVersion must be 1/);
});

test('rejects unknown top-level keys', () => {
  assert.throws(() => validatePromptOSStateText(JSON.stringify(validState({extra: true}))), /unknown top-level key extra/);
});

test('rejects prototype-pollution keys recursively', () => {
  const text = '{"schemaVersion":1,"stars":{},"custom":[],"theme":"dark","_v":1,"constructor":{"prototype":{"polluted":true}}}';
  assert.throws(() => validatePromptOSStateText(text), /forbidden key constructor/);
});

test('rejects duplicate custom prompt ids', () => {
  const prompt = validState().custom[0];
  assert.throws(() => validatePromptOSStateText(JSON.stringify(validState({custom: [prompt, {...prompt}]}))), /duplicate custom id/);
});

test('rejects oversized state before parsing', () => {
  const oversized = ' '.repeat(PROMPTOS_STATE_POLICY.maxBytes + 1);
  assert.throws(() => validatePromptOSStateText(oversized), /payload exceeds/);
});

test('canonical JSON is independent of object key insertion order', () => {
  const left = {b: 2, a: {d: 4, c: 3}};
  const right = {a: {c: 3, d: 4}, b: 2};
  assert.equal(canonicalPromptOSStateJSON(left), canonicalPromptOSStateJSON(right));
});

test('fingerprints are deterministic lowercase SHA-256 hex', async () => {
  const state = validatePromptOSStateText(JSON.stringify(validState()));
  const first = await promptOSStateFingerprint(state);
  const second = await promptOSStateFingerprint(state);
  assert.match(first, /^[0-9a-f]{64}$/);
  assert.equal(first, second);
});
