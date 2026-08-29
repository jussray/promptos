import {readFile} from 'node:fs/promises';
import {
  BROWSER_REALITY_CANONICALIZATION,
  BROWSER_REALITY_CONTRACT_ID,
  BROWSER_REALITY_TRUTH_STATES,
  fingerprintBrowserRealityEvidence,
  sanitizeBrowserRealityUrl,
} from '../src/browser-reality-receipt.mjs';

const AGENT_ENTRYPOINT_PATH = 'AGENTS_FOUNDER_INTELLIGENCE.md';
const CONTRACT_PATH = '.control-room/browser-reality.contract.json';
const CONTROL_ROOM_MANIFEST_PATH = 'control-room.manifest.json';
const RECEIPT_IMPLEMENTATION_PATH = 'src/browser-reality-receipt.mjs';
const SKILL_PATH = 'skills/browser-reality-inspector/SKILL.md';
const WORKFLOW_PATH = '.github/workflows/control-room-tests.yml';
const VERIFIER_PATH = 'scripts/verify-browser-reality-contract.mjs';

const [agentEntrypoint, contractRaw, controlRoomManifestRaw, skill, workflow] = await Promise.all([
  readFile(AGENT_ENTRYPOINT_PATH, 'utf8'),
  readFile(CONTRACT_PATH, 'utf8'),
  readFile(CONTROL_ROOM_MANIFEST_PATH, 'utf8'),
  readFile(SKILL_PATH, 'utf8'),
  readFile(WORKFLOW_PATH, 'utf8'),
]);

const contract = JSON.parse(contractRaw);
const controlRoomManifest = JSON.parse(controlRoomManifestRaw);
const failures = [];

function requireCondition(condition, message) {
  if (!condition) failures.push(message);
}

function requireExactArray(actual, expected, label) {
  requireCondition(
    Array.isArray(actual)
      && actual.length === expected.length
      && actual.every((value, index) => value === expected[index]),
    `${label} must equal ${expected.join(' -> ')}`,
  );
}

function requireMembers(actual, expected, label) {
  requireCondition(Array.isArray(actual), `${label} must be an array`);
  if (!Array.isArray(actual)) return;
  for (const value of expected) {
    requireCondition(actual.includes(value), `${label} missing ${value}`);
  }
}

function countOccurrences(text, needle) {
  return text.split(needle).length - 1;
}

function requireThrows(operation, pattern, label) {
  try {
    operation();
    failures.push(`${label} must fail closed`);
  } catch (error) {
    requireCondition(pattern.test(error.message), `${label} failed for the wrong reason: ${error.message}`);
  }
}

function clone(value) {
  return structuredClone(value);
}

function withQueryValue(rawUrl, key, value) {
  const url = new URL(rawUrl);
  url.searchParams.set(key, value);
  return url.toString();
}

requireCondition(contract.schemaVersion === '1.0', 'schemaVersion must be 1.0');
requireCondition(contract.contractId === 'juss/browser-reality@v1', 'canonical contract ID drifted');
requireCondition(contract.name === 'browser-reality-inspector', 'canonical contract name drifted');
requireCondition(contract.status === 'active', 'browser reality contract must be active');

requireCondition(contract.authority?.mode === 'read-only', 'authority must remain read-only');
for (const deniedFlag of [
  'mayMutateDestination',
  'mayBypassProviderBoundary',
  'mayCompleteAuthentication',
  'maySolveCaptcha',
]) {
  requireCondition(contract.authority?.[deniedFlag] === false, `authority.${deniedFlag} must be false`);
}

requireCondition(contract.sourceOfTruth?.required === 'live-rendered-page', 'live rendered page must be the source of truth');
requireCondition(contract.sourceOfTruth?.redirectPolicy === 'follow-and-record-final-url', 'redirect policy must retain final URL evidence');
requireMembers(contract.sourceOfTruth?.forbiddenAsVerification, [
  'search-engine-snippet',
  'redirect-shape-without-rendered-content',
  'cached-summary',
  'unrendered-metadata',
], 'sourceOfTruth.forbiddenAsVerification');

requireExactArray(contract.truthStates, [
  'VERIFIED',
  'INFERRED',
  'UNKNOWN',
  'BLOCKED',
], 'truthStates');
requireMembers(contract.evidence?.required, ['final-url', 'rendered-page-state'], 'evidence.required');
requireMembers(contract.evidence?.captureWhenAvailable, ['screenshot', 'relevant-rendered-text'], 'evidence.captureWhenAvailable');
requireExactArray(contract.inspectionFields, [
  'final-resolved-url',
  'target-type',
  'visible-account-page-profile-name',
  'main-visible-text-summary',
  'visible-images-video',
  'visible-date-time',
  'marketplace-price',
  'marketplace-location',
  'visible-engagement-counts',
  'visible-external-links',
  'important-or-suspicious-claims',
], 'inspectionFields');

requireMembers(contract.readOnly?.prohibitedInteractions, [
  'like',
  'comment',
  'message',
  'follow',
  'buy',
  'save',
  'share',
  'post',
  'upload',
  'change-settings',
], 'readOnly.prohibitedInteractions');
requireMembers(contract.stopBoundaries, [
  'login-required-without-an-existing-authenticated-session',
  'authentication-step',
  'captcha',
  'permission-prompt',
  'provider-boundary',
  'mutation-required',
  'scope-expansion-required',
], 'stopBoundaries');

const cookies = contract.continuity?.firstPartySessionCookies;
requireCondition(cookies?.browserManagedReuse === 'allowed-when-already-present-and-appropriate', 'only browser-managed first-party session reuse may be allowed');
for (const deniedFlag of ['inspect', 'extract', 'export', 'copy', 'log', 'alter', 'synthesize']) {
  requireCondition(cookies?.[deniedFlag] === false, `firstPartySessionCookies.${deniedFlag} must be false`);
}

const pseudonymousId = contract.continuity?.pseudonymousId;
requireCondition(pseudonymousId?.allowedOnlyWhen === 'an-existing-first-party-application-seam-requires-continuity', 'pseudonymous ID must require an existing first-party seam');
requireCondition(pseudonymousId?.createForInspectionAlone === false, 'inspection alone must never create an identifier');
requireCondition(pseudonymousId?.generation === 'cryptographically-random', 'pseudonymous ID generation must be random');
requireCondition(pseudonymousId?.scope === 'first-party-purpose-limited', 'pseudonymous ID must be first-party and purpose-limited');
for (const requiredFlag of ['resettable', 'disclosed', 'consentAware']) {
  requireCondition(pseudonymousId?.[requiredFlag] === true, `pseudonymousId.${requiredFlag} must be true`);
}
requireCondition(pseudonymousId?.crossSiteCorrelation === false, 'pseudonymous IDs must not correlate across sites');

const fingerprinting = contract.continuity?.browserFingerprinting;
for (const deniedFlag of ['allowed', 'alterationAllowed', 'crossSiteTrackingAllowed']) {
  requireCondition(fingerprinting?.[deniedFlag] === false, `browserFingerprinting.${deniedFlag} must be false`);
}
requireMembers(fingerprinting?.prohibitedSignals, [
  'canvas-readback',
  'webgl-renderer-probe',
  'audio-context-probe',
  'font-enumeration',
  'user-agent-entropy-collection',
  'device-hardware-signal-aggregation',
], 'browserFingerprinting.prohibitedSignals');
requireCondition(/deterministic evidence identifiers, not browser or device fingerprints/.test(contract.continuity?.terminology || ''), 'repository fingerprint terminology must remain distinct');

const evidenceFingerprint = contract.evidenceFingerprint;
requireCondition(evidenceFingerprint?.name === 'sanitized-evidence-receipt-sha256', 'evidence fingerprint name drifted');
requireCondition(evidenceFingerprint?.implementation === RECEIPT_IMPLEMENTATION_PATH, 'receipt implementation path drifted');
requireCondition(evidenceFingerprint?.algorithm === 'SHA-256', 'evidence fingerprint algorithm must be SHA-256');
requireCondition(evidenceFingerprint?.digestEncoding === 'lowercase-hex', 'evidence fingerprint must be lowercase hex');
requireCondition(evidenceFingerprint?.canonicalization === BROWSER_REALITY_CANONICALIZATION, 'canonicalization identity drifted');
requireExactArray(evidenceFingerprint?.receiptFields, [
  'contractId',
  'authorizedInputUrl',
  'finalUrl',
  'observedAt',
  'scope',
  'observations',
], 'evidenceFingerprint.receiptFields');
requireExactArray(evidenceFingerprint?.inputFields, [
  'contractId',
  'authorizedInputUrl',
  'finalUrl',
  'observedAt',
  'scope',
  'observations',
], 'evidenceFingerprint.inputFields');
requireExactArray(evidenceFingerprint?.optionalReceiptFields, ['screenshotSha256'], 'evidenceFingerprint.optionalReceiptFields');
requireExactArray(evidenceFingerprint?.truthStateOrder, BROWSER_REALITY_TRUTH_STATES, 'evidenceFingerprint.truthStateOrder');
requireMembers(evidenceFingerprint?.canonicalizationRules, [
  'accept-only-the-declared-input-fields-and-reject-all-extra-fields',
  'sanitize-authorized-input-and-final-urls-before-receipt-construction',
  'normalize-text-to-unicode-nfc-trim-and-collapse-whitespace',
  'normalize-observed-at-to-utc-iso-8601-milliseconds',
  'sort-truth-labeled-observations-by-state-order-then-utf16-code-units',
  'deduplicate-identical-state-and-statement-observations',
  'sort-all-json-object-keys-by-utf16-code-units',
  'preserve-canonical-array-order-and-serialize-without-extra-whitespace',
  'hash-the-utf8-canonical-json-bytes',
], 'evidenceFingerprint.canonicalizationRules');
requireCondition(evidenceFingerprint?.urlSanitization?.removeUserInfo === true, 'URL userinfo must be removed');
requireCondition(evidenceFingerprint?.urlSanitization?.removeFragment === true, 'URL fragments must be removed');
requireCondition(evidenceFingerprint?.urlSanitization?.redactSensitiveQueryValuesWith === 'REDACTED', 'sensitive query values must be redacted consistently');
requireCondition(evidenceFingerprint?.urlSanitization?.sanitizeDecodedHttpUrlQueryValuesRecursively === true, 'decoded HTTP(S) query values must be sanitized recursively');
requireCondition(evidenceFingerprint?.urlSanitization?.maxNestedUrlDepth === 3, 'nested URL sanitization depth must remain 3');
requireCondition(evidenceFingerprint?.urlSanitization?.beyondNestedUrlDepthValue === 'REDACTED_NESTED_URL', 'nested URLs beyond depth 3 must be redacted');
requireExactArray(evidenceFingerprint?.urlSanitization?.dropTrackingQueryKeys, [
  'utm_*',
  'dclid',
  'fbclid',
  'gclid',
  'mibextid',
  'msclkid',
  'rdid',
  'share_url',
], 'evidenceFingerprint.urlSanitization.dropTrackingQueryKeys');
requireExactArray(evidenceFingerprint?.urlSanitization?.sensitiveNormalizedQueryKeys, [
  'accesstoken',
  'apikey',
  'auth',
  'authorization',
  'clientsecret',
  'code',
  'connectsid',
  'cookie',
  'cookies',
  'credential',
  'credentials',
  'csrftoken',
  'encryptedcontext',
  'idtoken',
  'jsessionid',
  'jwt',
  'key',
  'oauth',
  'oauthtoken',
  'password',
  'phpsessid',
  'refreshtoken',
  'secret',
  'session',
  'sessionid',
  'sid',
  'sig',
  'signature',
  'state',
  'token',
  'xsrftoken',
], 'evidenceFingerprint.urlSanitization.sensitiveNormalizedQueryKeys');
requireMembers(evidenceFingerprint?.forbiddenInputCategories, [
  'cookie-names-or-values',
  'credentials-or-tokens',
  'browser-or-device-entropy',
  'person-or-device-identifiers',
  'unrelated-private-data',
], 'evidenceFingerprint.forbiddenInputCategories');
for (const deniedFlag of ['identifiesPerson', 'identifiesDevice', 'crossSiteCorrelation', 'mayBeUsedForTracking']) {
  requireCondition(evidenceFingerprint?.identityBoundary?.[deniedFlag] === false, `evidenceFingerprint.identityBoundary.${deniedFlag} must be false`);
}
requireCondition(evidenceFingerprint?.requiredWhenSha256IsAvailable === true, 'safe evidence fingerprint must be required when SHA-256 is available');
requireCondition(evidenceFingerprint?.runtimeInvocationClaimed === false, 'static contract must not claim live browser invocation');

requireCondition(BROWSER_REALITY_CONTRACT_ID === contract.contractId, 'receipt implementation contract ID drifted');
const vector = evidenceFingerprint?.conformanceVector;
requireCondition(vector.input?.contractId === contract.contractId, 'conformance input contract ID drifted');
const vectorResult = fingerprintBrowserRealityEvidence(vector.input);
requireCondition(vectorResult.canonicalJson === vector.expectedCanonicalJson, 'conformance vector canonical JSON drifted');
requireCondition(vectorResult.sha256 === vector.expectedSha256, `conformance vector digest drifted: ${vectorResult.sha256}`);
requireCondition(vector.expectedSha256 === 'b638320661652bab6398f45e2b35bc343ac963bb0eb8b926462db6aea8cb1ab4', 'shared conformance digest drifted');
requireCondition(/^[a-f0-9]{64}$/.test(vectorResult.sha256), 'evidence fingerprint output must be 64-character lowercase hex');
requireCondition(
  fingerprintBrowserRealityEvidence(clone(vector.input)).sha256 === vectorResult.sha256,
  'identical evidence must produce an identical digest',
);

const reorderedInput = clone(vector.input);
reorderedInput.observations.reverse();
requireCondition(
  fingerprintBrowserRealityEvidence(reorderedInput).sha256 === vectorResult.sha256,
  'input observation order must normalize to the canonical finalized order',
);

const redactedVariant = clone(vector.input);
redactedVariant.authorizedInputUrl = redactedVariant.authorizedInputUrl
  .replace('viewer:drop-me', 'other-user:other-secret')
  .replace('token=drop-me', 'token=other-secret')
  .replace('utm_source=chat', 'utm_source=other');
redactedVariant.finalUrl = redactedVariant.finalUrl
  .replace('sessionid=drop-me', 'sessionid=other-secret')
  .replace('rdid=track', 'rdid=other');
requireCondition(
  fingerprintBrowserRealityEvidence(redactedVariant).sha256 === vectorResult.sha256,
  'URL credentials, sensitive values, and tracking values must not enter the evidence digest',
);
const encryptedContextA = clone(vector.input);
encryptedContextA.finalUrl = withQueryValue(encryptedContextA.finalUrl, 'encrypted_context', 'provider-secret-a');
const encryptedContextB = clone(vector.input);
encryptedContextB.finalUrl = withQueryValue(encryptedContextB.finalUrl, 'encrypted_context', 'provider-secret-b');
const encryptedContextResultA = fingerprintBrowserRealityEvidence(encryptedContextA);
const encryptedContextResultB = fingerprintBrowserRealityEvidence(encryptedContextB);
requireCondition(
  encryptedContextResultA.sha256 === encryptedContextResultB.sha256,
  'encrypted_context provider-token values must normalize identically',
);
requireCondition(
  encryptedContextResultA.canonicalJson.includes('encrypted_context=REDACTED')
    && !encryptedContextResultA.canonicalJson.includes('provider-secret'),
  'encrypted_context must preserve only its redacted key state',
);
const nestedUrlA = clone(vector.input);
nestedUrlA.finalUrl = withQueryValue(
  nestedUrlA.finalUrl,
  'next',
  'https://nested-user:nested-pass@example.net/landing?token=nested-secret-a&utm_source=drop#nested-fragment',
);
const nestedUrlB = clone(vector.input);
nestedUrlB.finalUrl = withQueryValue(
  nestedUrlB.finalUrl,
  'next',
  'https://other-user:other-pass@example.net/landing?token=nested-secret-b&utm_source=other#other-fragment',
);
const nestedResultA = fingerprintBrowserRealityEvidence(nestedUrlA);
const nestedResultB = fingerprintBrowserRealityEvidence(nestedUrlB);
requireCondition(
  nestedResultA.sha256 === nestedResultB.sha256,
  'nested redirect URL secrets and tracking values must normalize identically',
);
for (const leakedValue of ['nested-user', 'nested-pass', 'nested-secret', 'nested-fragment', 'utm_source']) {
  requireCondition(!nestedResultA.canonicalJson.includes(leakedValue), `nested redirect URL leaked ${leakedValue}`);
}
requireCondition(
  nestedResultA.canonicalJson.includes('next=https%3A%2F%2Fexample.net%2Flanding%3Ftoken%3DREDACTED'),
  'nested redirect URL must retain only sanitized target evidence',
);

let tooDeepNestedUrl = 'https://level4.example/path?token=deep-secret';
for (let level = 3; level >= 1; level -= 1) {
  const wrapper = new URL(`https://level${level}.example/path`);
  wrapper.searchParams.set('next', tooDeepNestedUrl);
  tooDeepNestedUrl = wrapper.toString();
}
const tooDeepInput = clone(vector.input);
tooDeepInput.finalUrl = withQueryValue(tooDeepInput.finalUrl, 'next', tooDeepNestedUrl);
const tooDeepResult = fingerprintBrowserRealityEvidence(tooDeepInput);
requireCondition(
  tooDeepResult.canonicalJson.includes('REDACTED_NESTED_URL')
    && !tooDeepResult.canonicalJson.includes('level4.example')
    && !tooDeepResult.canonicalJson.includes('deep-secret'),
  'nested redirect URLs beyond depth 3 must fail closed to a redacted value',
);
for (const forbiddenValue of ['drop-me', 'viewer', 'private-fragment', '#details', 'track']) {
  requireCondition(!vectorResult.canonicalJson.includes(forbiddenValue), `canonical receipt leaked forbidden URL material: ${forbiddenValue}`);
}

const loadBearingVariants = [
  ['authorizedInputUrl', (input) => { input.authorizedInputUrl = withQueryValue(input.authorizedInputUrl, 'evidence', 'changed'); }],
  ['finalUrl', (input) => { input.finalUrl = withQueryValue(input.finalUrl, 'evidence', 'changed'); }],
  ['observedAt', (input) => { input.observedAt = '2026-08-29T01:02:04-04:00'; }],
  ['scope', (input) => { input.scope = 'user-authorized target and one approved child route'; }],
  ['observations', (input) => { input.observations.push({state: 'UNKNOWN', statement: 'Price was not visible.'}); }],
  ['screenshotSha256', (input) => { input.screenshotSha256 = 'b'.repeat(64); }],
];
for (const [field, mutate] of loadBearingVariants) {
  const changed = clone(vector.input);
  mutate(changed);
  requireCondition(
    fingerprintBrowserRealityEvidence(changed).sha256 !== vectorResult.sha256,
    `load-bearing field ${field} must change the digest`,
  );
}

const noScreenshot = clone(vector.input);
delete noScreenshot.screenshotSha256;
const noScreenshotResult = fingerprintBrowserRealityEvidence(noScreenshot);
requireCondition(!Object.hasOwn(noScreenshotResult.receipt, 'screenshotSha256'), 'unavailable screenshot digest must be omitted, not invented');
requireCondition(noScreenshotResult.sha256 !== vectorResult.sha256, 'optional screenshot presence must bind the digest');

const wrongContract = clone(vector.input);
wrongContract.contractId = 'juss/browser-reality@v0';
requireThrows(
  () => fingerprintBrowserRealityEvidence(wrongContract),
  /contractId must be juss\/browser-reality@v1/,
  'wrong evidence contract ID',
);

for (const forbiddenField of ['cookie', 'credentials', 'token', 'deviceEntropy', 'userId', 'unrelatedPrivateData']) {
  const unsafe = clone(vector.input);
  unsafe[forbiddenField] = 'forbidden';
  requireThrows(
    () => fingerprintBrowserRealityEvidence(unsafe),
    /not allowed/,
    `forbidden evidence field ${forbiddenField}`,
  );
}
const invalidScreenshot = clone(vector.input);
invalidScreenshot.screenshotSha256 = 'not-a-digest';
requireThrows(
  () => fingerprintBrowserRealityEvidence(invalidScreenshot),
  /64-character hexadecimal/,
  'invalid screenshot digest',
);
requireCondition(
  sanitizeBrowserRealityUrl('https://[2001:db8::1]/path?sid=drop-me#fragment')
    === 'https://[2001:db8::1]/path?sid=REDACTED',
  'IPv6 URL sanitization must preserve exactly one bracket pair and redact session IDs',
);

requireCondition(contract.externalClaims?.separateSourceClaimFromVerification === true, 'source claims must remain separate from external verification');
requireCondition(contract.externalClaims?.facebookSourceLabel === 'FACEBOOK CLAIM', 'Facebook source label drifted');
requireCondition(contract.externalClaims?.verificationLabel === 'EXTERNAL VERIFICATION', 'external verification label drifted');
requireCondition(contract.externalClaims?.mayUpgradeUnrenderedClaimToVerified === false, 'unrendered claims must never become verified');

requireExactArray(contract.outputSections, [
  'REALITY',
  'TARGET',
  'CONTENT',
  'PROOF',
  'RED TEAM',
  'BLOCKERS',
  'NEXT GATE',
], 'outputSections');

for (const marker of [
  'name: browser-reality-inspector',
  'version: 1.0.0',
  'juss/browser-reality@v1',
  'real browser',
  'search-engine snippets',
  'final URL',
  'VERIFIED',
  'INFERRED',
  'UNKNOWN',
  'BLOCKED',
  'FACEBOOK CLAIM',
  'EXTERNAL VERIFICATION',
  'CAPTCHA',
  'first-party session cookies',
  'cryptographically random',
  'Never collect or alter a browser or device fingerprint',
  'canvas readback',
  'WebGL renderer probes',
  'audio-context probes',
  'font enumeration',
  'user-agent entropy collection',
  'cross sites',
  'Safe evidence fingerprint',
  'juss-browser-reality-canonical-json-v1',
  'evidenceFingerprintSha256',
  'never identifies a person or device',
  'Cookie names or values',
  'browser or device entropy',
  'REALITY:',
  'TARGET:',
  'CONTENT:',
  'PROOF:',
  'RED TEAM:',
  'BLOCKERS:',
  'NEXT GATE:',
]) {
  requireCondition(skill.includes(marker), `skill missing governed marker: ${marker}`);
}

for (const marker of [
  'browser-reality-inspector',
  'skills/browser-reality-inspector/SKILL.md',
  'real browser actually rendered',
  'read-only navigation and evidence capture only',
  'first-party session cookies',
  'never identify people/devices or correlate activity across sites',
]) {
  requireCondition(agentEntrypoint.includes(marker), `agent routing entrypoint missing marker: ${marker}`);
}

const catalogEntry = controlRoomManifest.tests?.catalog?.find((entry) => entry.id === 'browser-reality-contract');
requireCondition(catalogEntry?.name === 'Portable read-only browser reality contract', 'control-room browser reality test name drifted');
requireCondition(catalogEntry?.kind === 'contract', 'control-room browser reality test must be a contract');
requireCondition(catalogEntry?.command === `node ${VERIFIER_PATH}`, 'control-room browser reality test command drifted');
requireCondition(catalogEntry?.required === true, 'control-room browser reality test must be required');
requireCondition(catalogEntry?.status === 'active', 'control-room browser reality test must be active');
requireMembers(catalogEntry?.evidencePaths, [
  AGENT_ENTRYPOINT_PATH,
  CONTRACT_PATH,
  SKILL_PATH,
  RECEIPT_IMPLEMENTATION_PATH,
  VERIFIER_PATH,
  WORKFLOW_PATH,
], 'control-room browser reality evidencePaths');

for (const guardedPath of [CONTRACT_PATH, SKILL_PATH, RECEIPT_IMPLEMENTATION_PATH, VERIFIER_PATH]) {
  const pathLine = `      - "${guardedPath}"`;
  requireCondition(
    countOccurrences(workflow, pathLine) === 2,
    `${guardedPath} must be watched by pull_request and push filters`,
  );
}
requireCondition(
  workflow.includes(`run: node ${VERIFIER_PATH}`),
  `${VERIFIER_PATH} must run in the exact-head Control Room job`,
);

if (failures.length > 0) {
  console.error('PromptOS browser reality contract verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: 'passed',
  contractId: contract.contractId,
  skill: contract.name,
  authority: contract.authority.mode,
  sourceOfTruth: contract.sourceOfTruth.required,
  outputSections: contract.outputSections,
  inspectionFields: contract.inspectionFields,
  canonicalization: evidenceFingerprint.canonicalization,
  conformanceSha256: vectorResult.sha256,
  liveBrowserInvocationClaimed: false,
  firstPartyCookieContentAccessPolicy: 'forbidden',
  browserFingerprintingPolicy: 'forbidden',
}));
