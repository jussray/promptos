import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolvePagesBuildContext } from './cloudflare-pages-build.mjs';

const SHA = 'a'.repeat(40);
const base = {
  CF_PAGES_BRANCH: 'main',
  CF_PAGES_COMMIT_SHA: SHA,
  PROMPTOS_APPROVED_SHA: SHA,
};

test('stages only the exact approved main commit', () => {
  assert.deepEqual(resolvePagesBuildContext(base), { expectedHeadSha: SHA });
});

test('rejects previews and unapproved production publication', () => {
  for (const overrides of [
    { CF_PAGES_BRANCH: 'feature/demo' },
    { CF_PAGES_BRANCH: '' },
    { PROMPTOS_APPROVED_SHA: '' },
    { PROMPTOS_APPROVED_SHA: 'b'.repeat(40) },
    { CF_PAGES_COMMIT_SHA: '' },
    { CF_PAGES_COMMIT_SHA: 'A'.repeat(40) },
    { CF_PAGES_COMMIT_SHA: 'not-a-sha' },
  ]) {
    assert.throws(() => resolvePagesBuildContext({ ...base, ...overrides }));
  }
});

test('rejects an unexpected external SHA override', () => {
  assert.throws(() => resolvePagesBuildContext({
    ...base,
    EXPECTED_HEAD_SHA: 'b'.repeat(40),
  }));
});
