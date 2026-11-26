import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyPagesReadback } from './verify-pages-publication-source.mjs';

test('workflow build type passes (strict default)', () => {
  assert.equal(classifyPagesReadback({ pagesStatus: 200, pages: { build_type: 'workflow' } }).ok, true);
});

test('branch-based build type fails even when absentOk is set', () => {
  assert.equal(classifyPagesReadback({ pagesStatus: 200, pages: { build_type: 'legacy' }, absentOk: true }).ok, false);
});

test('404 fails closed by default (deploy path)', () => {
  assert.equal(classifyPagesReadback({ pagesStatus: 404, repoHasPages: false }).ok, false);
});

test('404 with absentOk and has_pages=false passes (Pages not enabled)', () => {
  assert.equal(classifyPagesReadback({ pagesStatus: 404, repoHasPages: false, absentOk: true }).ok, true);
});

test('404 with absentOk but has_pages=true fails', () => {
  assert.equal(classifyPagesReadback({ pagesStatus: 404, repoHasPages: true, absentOk: true }).ok, false);
});

test('404 with absentOk but unknown has_pages fails', () => {
  assert.equal(classifyPagesReadback({ pagesStatus: 404, repoHasPages: null, absentOk: true }).ok, false);
});

test('non-404 errors fail even with absentOk', () => {
  for (const pagesStatus of [401, 403, 500, 502]) {
    assert.equal(classifyPagesReadback({ pagesStatus, repoHasPages: false, absentOk: true }).ok, false, String(pagesStatus));
  }
});
