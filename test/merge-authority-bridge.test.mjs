import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createApprovalComment, verifyApprovalComment, verifyAppMainPush, isFounderDirectPush,
} from '../scripts/merge-authority-bridge.mjs';

const secret = 'test-only-independent-approval-key-32+characters';
const base = 'a'.repeat(40), head = 'b'.repeat(40), after = 'c'.repeat(40);
const issuedAt = '2026-11-06T17:02:00.000Z', runId = 123;
const bot = 'juss-merge[bot]';
const event = {
  repository: 'jussray/promptos', ref: 'refs/heads/main',
  actor: bot, triggeringActor: bot, forced: 'false', before: base, after,
};
const details = {
  prNumber: 78, headSha: head, baseSha: base, workflowRunId: runId,
  issuedAt, nonce: 'f'.repeat(32),
};
const comment = createApprovalComment(details, secret);
const pr = {
  merged: true, merge_commit_sha: after, number: 78,
  head: { sha: head, repo: { full_name: 'jussray/promptos' } },
  base: { ref: 'main' }, user: { login: 'jussray' },
  merged_by: { login: bot }, merged_at: '2026-11-06T17:03:00.000Z',
};
const commentObj = { user: { login: bot, type: 'Bot' }, body: comment };
const run = {
  event: 'workflow_dispatch', actor: { login: 'jussray' },
  head_sha: base, head_branch: 'main',
  path: '.github/workflows/founder-safe-pr-refresh.yml@refs/heads/main',
  created_at: '2026-11-06T17:00:00.000Z',
};
function reader({ prs = [pr], comments = [commentObj], workflow = run } = {}) {
  return async (path) => {
    if (path === '/commits/' + after + '/pulls') return prs;
    if (path === '/issues/78/comments?per_page=100&page=1') return comments;
    if (path === '/actions/runs/' + runId) return workflow;
    throw new Error('Unexpected test evidence route: ' + path);
  };
}

test('founder-only push remains an independent authorization path', () => {
  assert.equal(isFounderDirectPush({ actor: 'jussray', triggeringActor: 'jussray' }), true);
  assert.equal(isFounderDirectPush({ actor: bot, triggeringActor: bot }), false);
});
test('signed founder workflow and provider receipt bind exact PR/base/head/App', async () => {
  const result = await verifyAppMainPush(event, { secret, read: reader() });
  assert.equal(result.founderAuthorized, true);
  assert.equal(result.prNumber, 78);
  assert.equal(result.headSha, head);
  assert.equal(result.baseSha, base);
  assert.equal(result.mergeSha, after);
});
test('tampered receipt signatures and short secrets fail closed', () => {
  const tampered = comment.replace(/:([a-f0-9]{64}) -->/, ':' + '0'.repeat(64) + ' -->');
  assert.throws(() => verifyApprovalComment(tampered, secret), /signature/);
  assert.throws(() => createApprovalComment(details, 'short'), /key/);
});
test('arbitrary bot actors and user-authored comments cannot pass', async () => {
  await assert.rejects(() => verifyAppMainPush({
    ...event, actor: 'other-bot[bot]', triggeringActor: 'other-bot[bot]',
  }, { secret, read: reader() }), /founder PR merged/);
  await assert.rejects(() => verifyAppMainPush(event, {
    secret, read: reader({ comments: [{ ...commentObj, user: { login: 'jussray', type: 'User' } }] }),
  }), /signed receipt/);
});
test('unapproved GitHub Actions runs cannot prove founder authority', async () => {
  for (const delta of [
    { actor: { login: 'someone-else' } }, { event: 'push' },
    { head_sha: head }, { path: '.github/workflows/unsafe.yml' },
  ]) {
    await assert.rejects(() => verifyAppMainPush(event, {
      secret, read: reader({ workflow: { ...run, ...delta } }),
    }), /provenance/);
  }
});
test('changed base, changed head, and different merger fail closed', async () => {
  await assert.rejects(() => verifyAppMainPush({
    ...event, before: 'd'.repeat(40),
  }, { secret, read: reader() }), /signed receipt/);
  for (const delta of [
    { head: { sha: 'e'.repeat(40), repo: { full_name: 'jussray/promptos' } } },
    { merged_by: { login: 'other-bot[bot]' } },
  ]) {
    await assert.rejects(() => verifyAppMainPush(event, {
      secret, read: reader({ prs: [{ ...pr, ...delta }] }),
    }), /signed receipt|founder PR merged/);
  }
});
test('expired, duplicate, and unsigned records cannot authorize a merge', async () => {
  await assert.rejects(() => verifyAppMainPush(event, {
    secret, read: reader({ prs: [{ ...pr, merged_at: '2026-11-06T18:00:00Z' }] }),
  }), /signed receipt/);
  await assert.rejects(() => verifyAppMainPush(event, {
    secret, read: reader({ comments: [commentObj, commentObj] }),
  }), /ambiguous/);
  await assert.rejects(() => verifyAppMainPush(event, {
    secret, read: reader({ comments: [{ ...commentObj, body: 'approved by founder' }] }),
  }), /signed receipt/);
});
test('forced pushes, wrong repos, wrong actors and missing key cannot pass', async () => {
  for (const delta of [
    { forced: 'true' }, { actor: 'jussray' },
    { repository: 'other/repo' }, { triggeringActor: 'jussray' },
  ]) {
    await assert.rejects(() => verifyAppMainPush({ ...event, ...delta }, {
      secret, read: reader(),
    }), /BLOCKED/);
  }
  await assert.rejects(() => verifyAppMainPush(event, {
    secret: '', read: reader(),
  }), /key/);
});
