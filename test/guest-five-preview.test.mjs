import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html = readFileSync(new URL('../index.html',import.meta.url),'utf8');
const auth = readFileSync(new URL('../parts/auth.js',import.meta.url),'utf8');
const preview = html.match(/<section id="beginnerLibrary"[\s\S]*?<\/section>/)?.[0] || '';
test('guest preview has exactly five fixed beginner templates', () => {
  assert.equal((preview.match(/<details>/g)||[]).length,5);
  assert.equal((preview.match(/<option value="[0-4]"/g)||[]).length,5);
});
test('guest can compile a beginner prompt but has no personal library or import controls in preview', () => {
  assert.match(preview,/id="guestPromptCompile"/);
  assert.match(preview,/id="guestPromptOutput"/);
  assert.doesNotMatch(preview,/id="(?:saveBuilder|saveCustom|importBtn)"/);
  assert.match(auth,/function compileGuestPrompt\(/);
  assert.match(auth,/guestPromptOutput/);
  assert.match(auth,/\.textContent = /);
});
test('preview is available without sign-in but full workspace stays server gated', () => {
  assert.match(auth,/beginnerLibrary'\)\) qs\('#beginnerLibrary'\)\.hidden = access === 'paid'/);
  assert.match(auth,/if \(currentAccess !== 'paid' \|\| !verifiedIdToken\) return;/);
  assert.match(html,/id="appShell"[^>]*inert/);
});
