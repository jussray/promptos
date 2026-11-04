import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const proof = readFileSync(new URL('../e2e/public-deploy-proof.mjs', import.meta.url), 'utf8');
const auth = readFileSync(new URL('../parts/auth.js', import.meta.url), 'utf8');
const policy = JSON.parse(readFileSync(new URL('../.security/cookies.json', import.meta.url), 'utf8'));
const workflow = readFileSync(new URL('../.github/workflows/control-room-tests.yml', import.meta.url), 'utf8');

test('deployed UI proof navigates to a visible Quick Library control before opening a card', () => {
  const nav = proof.indexOf('const quickLibraryNav =');
  const card = proof.indexOf('await firstCard.click();');
  assert.ok(nav >= 0 && nav < card, 'navigation must precede library card click');
  assert.match(proof, /quickLibraryNav\.click\(\)/);
  assert.match(proof, /'#page-library\.on'/);
  assert.doesNotMatch(proof, /firstCard\.click\(\{\s*force:\s*true/);
});

test('a cold guest visit never obtains an opt-in visitor cookie', () => {
  assert.match(proof, /freshCookies = await context\.cookies\(\)/);
  assert.match(proof, /postJourneyCookies = await context\.cookies\(\)/);
  assert.match(proof, /VISITOR_COOKIE_NAMES = new Set\(\['promptos_vid', 'promptos_vid_v2'\]\)/);
  assert.match(proof, /VISITOR_COOKIE_NAMES\.has\(cookie\.name\)/);
  assert.match(auth, /if \(consent === 'accepted'\)\s*\{\s*ensureVisitorId\(\)/);
});

test('both successful and failed live checks retain a non-authorizing source fingerprint', () => {
  assert.match(proof, /SCRIPT_SHA256/);
  assert.match(proof, /headSha: EXPECTED_SHA/);
  assert.match(proof, /proofFingerprint: 'sha256:' \+ fingerprint/);
  assert.match(proof, /proofCookie: \{/);
  assert.match(proof, /browserCookie: false/);
  assert.match(proof, /authority: false/);
  assert.match(proof, /proofReceipt\('failed'/);
  assert.match(proof, /-failure\.png/);
  assert.match(proof, /finally \{\s*await context\.close\(\)/);
  assert.match(proof, /const results = \[\];\s*let browser;\s*try/);
  assert.match(proof, /writeFile\(\x60\$\{OUTPUT_DIR\}\/failure\.json/);
});

test('declared cookies are separate from proof cookies and optional analytics requires consent', () => {
  assert.equal(policy.defaultPolicy, 'deny-undeclared');
  assert.deepEqual(policy.allowedCookieWriters, ['parts/auth.js']);
  assert.deepEqual(policy.cookies.map((c) => c.name), ['promptos_consent_v2', 'promptos_vid_v2']);
  const visitor = policy.cookies[1];
  assert.equal(visitor.consentRequired, true);
  assert.equal(visitor.crossSite, false);
  assert.equal(visitor.identitySource, 'cryptographically_random_browser_id');
  assert.match(auth, /var VISITOR_COOKIE = 'promptos_vid_v2'/);
  assert.match(auth, /var CONSENT_COOKIE = 'promptos_consent_v2'/);
  assert.match(auth, /SameSite=Lax/);
  assert.match(auth, /function cookieScopePath\(\)/);
  assert.match(auth, /url\.origin === location\.origin/);
  assert.match(auth, /return url\.pathname/);
  assert.match(auth, /location\.hostname === 'jussray\.github\.io' \? '\/promptos\/' : '\/'/);
  assert.match(auth, /'; path=' \+ COOKIE_PATH/);
  assert.doesNotMatch(auth, /'; path=\/; SameSite=Lax'/);
  assert.ok(policy.cookies.every((c) => c.path === 'application_root_from_same_origin_script'));
  assert.ok(policy.cookies.every((c) => c.legacyRootCookieBehavior.includes('Do not read')));

  assert.match(auth, /location\.protocol === 'https:'/);
  assert.doesNotMatch(auth, /Math\.random\(/);
  assert.match(auth, /return null;\s*\}\s*setCookie\(VISITOR_COOKIE/);
  assert.ok(policy.prohibited.includes('Browser or device entropy-based fingerprinting'));
  assert.ok(policy.nonCookieState.some((x) => x.includes('never written to document.cookie')));
});

test('the existing CI lane gates the privacy and proof contract regression', () => {
  assert.match(workflow, /node --test test\/public-deploy-proof-contract\.test\.mjs/);
  assert.match(workflow, /Check out exact head/);
  assert.match(workflow, /test "\$actual" = "\$EXPECTED_HEAD_SHA"/);
});
