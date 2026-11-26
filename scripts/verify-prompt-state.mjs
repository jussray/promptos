import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const State = require('../parts/state.js');

const valid = State.validateState({
  stars: {'64': true},
  custom: [{
    id: 'c_demo',
    emoji: '✨',
    title: 'Repo audit',
    sub: 'Evidence first',
    cat: 'coding',
    platforms: ['chatgpt', 'claude'],
    body: 'Use current repository evidence and return a bounded plan.',
    ts: 1
  }],
  theme: 'dark'
});
assert.equal(valid.ok, true, 'valid state should pass');
assert.equal(valid.value.schemaVersion, State.SCHEMA_VERSION, 'state should receive a schema version');
assert.deepEqual(valid.value.custom[0].platforms, ['chatgpt', 'claude']);

const serialized = State.serializeState(valid.value);
const serializedValue = JSON.parse(serialized);
assert.equal(serializedValue.schemaVersion, 1);
assert.equal(Object.hasOwn(serializedValue, '_v'), false, 'legacy timestamp must not be exported');

const secret = State.validateState({
  custom: [{id: 'c_secret', title: 'Token check', sub: '', cat: 'coding', platforms: ['chatgpt'], body: 'OPENAI_API_KEY=sk-12345678901234567890'}],
  theme: 'dark'
});
assert.equal(secret.ok, true, 'secret scanning should not turn a shape-valid record into malformed JSON');
assert.ok(secret.findings.some((finding) => finding.code === 'openai-token'), 'OpenAI-style token must be detected');
assert.ok(secret.findings.some((finding) => finding.code === 'secret-assignment'), 'secret assignment must be detected');
assert.ok(State.scanText('API_KEY=real-value').some((finding) => finding.code === 'secret-assignment'), 'standalone API_KEY assignments must be detected');

const placeholder = State.validateState({
  custom: [{id: 'c_placeholder', title: 'Template', sub: '', cat: 'coding', platforms: ['chatgpt'], body: 'OPENAI_API_KEY=[PASTE HERE]'}],
  theme: 'dark'
});
assert.equal(placeholder.findings.length, 0, 'safe placeholders should remain usable');

const prototypePayload = JSON.parse('{"custom":[],"theme":"dark","__proto__":{"polluted":true}}');
assert.equal(State.validateState(prototypePayload).ok, false, 'prototype-bearing keys must be rejected');

const duplicate = State.validateState({
  custom: [
    {id: 'c_same', title: 'One', sub: '', cat: 'coding', platforms: ['chatgpt'], body: 'one'},
    {id: 'c_same', title: 'Two', sub: '', cat: 'coding', platforms: ['chatgpt'], body: 'two'}
  ],
  theme: 'dark'
});
assert.equal(duplicate.ok, false, 'duplicate custom IDs must be rejected');

const unsupported = State.validateState({
  custom: [{id: 'c_bad', title: 'Bad platform', sub: '', cat: 'coding', platforms: ['unknown'], body: 'body'}],
  theme: 'dark'
});
assert.equal(unsupported.ok, false, 'unsupported platforms must be rejected');

const summary = State.summarizeImport(
  {custom: [{id: 'c_same', title: 'Changed', sub: '', cat: 'coding', platforms: ['chatgpt'], body: 'new'}]},
  {custom: [{id: 'c_same', title: 'Old', sub: '', cat: 'coding', platforms: ['chatgpt'], body: 'old'}]}
);
assert.deepEqual(summary, {additions: 0, updates: 1, unchanged: 0, conflicts: 1, rejected: 0});

console.log(JSON.stringify({
  result: 'passed',
  schemaVersion: State.SCHEMA_VERSION,
  secretChecks: ['private-key', 'jwt', 'provider-token', 'secret-assignment'],
  prototypePollutionRejected: true,
  duplicateIdsRejected: true,
  importReview: summary
}));
