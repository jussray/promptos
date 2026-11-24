import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source = readFileSync(new URL('../src/catalog-ui.js', import.meta.url), 'utf8');
const section = source.match(/<section class="promptos-command-deck" aria-label="Founder-only security catalog">[\s\S]*?<\/section>/)?.[0];
test('existing catalog has a founder-only handoff', () => {
  assert.ok(section);
  assert.match(section, /A PromptOS browser session does not grant founder access/);
});
test('handoff is fixed to intended FCR origin without credentials or query parameters', () => {
  const href = section?.match(/href="([^"]+)"/)?.[1];
  assert.equal(href, 'https://www.foundercontrolroom.org/control-room/security.html');
  const url = new URL(href);
  assert.equal(url.search, '');
  assert.equal(url.hash, '');
  assert.equal(url.username, '');
  assert.equal(url.password, '');
  assert.match(section, /rel="noreferrer"/);
});
test('handoff has no form, script, iframe or execution control', () => {
  assert.doesNotMatch(section ?? '', /<(?:form|script|iframe|input|button)\b|\son\w+=/i);
  assert.match(section, /Deployment of the catalog is not yet confirmed/);
});
