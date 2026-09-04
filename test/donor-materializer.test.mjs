import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  DONOR_PATH,
  MISSING_DONOR_IDS,
  extractMissingDonorPrompts,
  renderMissingPromptModule,
} from '../scripts/materialize-donor-prompts.mjs';

test('historical donor produces exactly the genuinely missing 126 prompt entries', async () => {
  const source = await readFile(DONOR_PATH, 'utf8');
  const additions = extractMissingDonorPrompts(source);
  assert.equal(additions.length, 126);
  assert.deepEqual(additions.map((prompt) => prompt.id), [...MISSING_DONOR_IDS]);
});

test('missing set preserves 119/120 gaps and excludes already canonical donor ranges', async () => {
  const source = await readFile(DONOR_PATH, 'utf8');
  const ids = extractMissingDonorPrompts(source).map((prompt) => prompt.id);
  assert.equal(ids.includes(119), false);
  assert.equal(ids.includes(120), false);
  assert.equal(ids.some((id) => id >= 64 && id <= 94), false);
  assert.equal(ids.some((id) => id >= 160 && id <= 206), false);
});

test('generated module is deterministic and fails closed on duplicate ids', async () => {
  const source = await readFile(DONOR_PATH, 'utf8');
  const additions = extractMissingDonorPrompts(source);
  const first = renderMissingPromptModule(additions);
  const second = renderMissingPromptModule(additions);
  assert.equal(first, second);
  assert.match(first, /PromptOS donor duplicate id/);
  assert.match(first, /Missing donor IDs only: 1-63, 95-118, 121-159/);
});
