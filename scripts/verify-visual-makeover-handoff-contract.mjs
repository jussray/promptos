import { readFile } from 'node:fs/promises';

const CONTRACT_PATH = '.control-room/visual-makeover-handoff.contract.json';
const PRODUCT_BOUNDARY_PATH = '.control-room/product-boundary.json';

const contract = JSON.parse(await readFile(CONTRACT_PATH, 'utf8'));
const productBoundary = JSON.parse(await readFile(PRODUCT_BOUNDARY_PATH, 'utf8'));
const failures = [];

function requireCondition(condition, message) {
  if (!condition) failures.push(message);
}

function validateArtifact(artifact) {
  const errors = [];
  const expectedFields = [...contract.requiredArtifactFields].sort();
  const actualFields = Object.keys(artifact || {}).sort();
  if (JSON.stringify(actualFields) !== JSON.stringify(expectedFields)) {
    errors.push('artifact fields must exactly match the acceptance contract');
  }

  for (const [key, expected] of Object.entries(contract.requiredValues)) {
    if (artifact?.[key] !== expected) errors.push(`${key} must equal ${JSON.stringify(expected)}`);
  }

  if (artifact?.contractId !== contract.acceptedSourceContract) {
    errors.push('artifact contractId is not the accepted Visual Makeover source contract');
  }

  if (!Array.isArray(artifact?.evidence)) errors.push('evidence must be an array');
  else {
    for (const [index, item] of artifact.evidence.entries()) {
      if (!item || typeof item !== 'object') {
        errors.push(`evidence[${index}] must be an object`);
        continue;
      }
      if (!/^[a-f0-9]{64}$/.test(item.evidenceFingerprintSha256 || '')) {
        errors.push(`evidence[${index}] fingerprint must be lowercase SHA-256`);
      }
      if (item.receipt?.contractId !== contract.requiredEvidenceContract) {
        errors.push(`evidence[${index}] receipt contract must be ${contract.requiredEvidenceContract}`);
      }
    }
  }

  const serialized = JSON.stringify(artifact);
  for (const forbidden of ['browserGrantToken','sessionToken','cookie','cookies','credential','credentials','rawBrowserPayload','rawScreenshotBytes']) {
    if (serialized.includes(`"${forbidden}"`)) errors.push(`forbidden field present: ${forbidden}`);
  }
  return errors;
}

requireCondition(contract.schemaVersion === 1, 'schemaVersion must equal 1');
requireCondition(contract.contractId === 'promptos/visual-makeover-handoff-acceptance@v1', 'acceptance contract ID drifted');
requireCondition(contract.status === 'active', 'acceptance contract must be active');
requireCondition(contract.sourceRepository === 'jussray/visual-makeover', 'source repository drifted');
requireCondition(contract.acceptedSourceContract === 'visual-makeover/promptos-handoff@v1', 'source handoff contract drifted');
requireCondition(contract.requiredEvidenceContract === 'juss/browser-reality@v1', 'browser reality contract drifted');

for (const key of ['mayAutoRegisterWorkflow','mayExecuteBrowser','mayWidenBrowserGrant','mayMutateSourceRepository','mayDeploy','mayPublish']) {
  requireCondition(contract.acceptance?.[key] === false, `${key} must remain false`);
}
requireCondition(contract.acceptance?.mode === 'advisory-input-only', 'acceptance mode must remain advisory-input-only');
requireCondition(contract.acceptance?.mayCompileGovernedDraft === true, 'PromptOS may compile a governed draft');
for (const key of ['rawBrowserPayloadAllowed','rawScreenshotBytesAllowed','browserGrantTokenAllowed','sessionTokenAllowed','cookiesAllowed','credentialsAllowed']) {
  requireCondition(contract.evidenceRules?.[key] === false, `${key} must remain false`);
}

for (const ownership of ['agent execution authority','provider authentication authority','deployment authority','publication authority']) {
  requireCondition(productBoundary.doesNotOwn?.includes(ownership), `PromptOS product boundary must continue to disclaim ${ownership}`);
}

const sample = {
  contractId: 'visual-makeover/promptos-handoff@v1',
  status: 'draft',
  sourceProduct: 'Visual Makeover',
  targetProduct: 'PromptOS',
  intent: 'Govern a website visual makeover proposal from captured browser reality evidence.',
  authority: 'advisory-only',
  executionAuthorized: false,
  registrationAuthority: false,
  browserRealityContract: 'juss/browser-reality@v1',
  source: { url: 'https://example.com/' },
  evidence: [{
    captureId: 'capture-1',
    evidenceFingerprintSha256: 'a'.repeat(64),
    receipt: { contractId: 'juss/browser-reality@v1' }
  }],
  makeover: { summary: 'Draft makeover' },
  requestedVerification: ['browser-reality','playwright'],
  authorityBoundary: 'No authority transfer.'
};

for (const error of validateArtifact(sample)) failures.push(`valid sample rejected: ${error}`);

const unsafeExecution = structuredClone(sample);
unsafeExecution.executionAuthorized = true;
requireCondition(validateArtifact(unsafeExecution).some(error => /executionAuthorized/.test(error)), 'executionAuthorized=true must be rejected');

const unsafeRegistration = structuredClone(sample);
unsafeRegistration.registrationAuthority = true;
requireCondition(validateArtifact(unsafeRegistration).some(error => /registrationAuthority/.test(error)), 'registrationAuthority=true must be rejected');

for (const forbiddenField of ['browserGrantToken','sessionToken','cookie','rawBrowserPayload','rawScreenshotBytes']) {
  const unsafe = structuredClone(sample);
  unsafe[forbiddenField] = 'forbidden';
  requireCondition(validateArtifact(unsafe).length > 0, `${forbiddenField} must be rejected`);
}

if (failures.length) {
  console.error('Visual Makeover handoff acceptance verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: 'passed',
  contractId: contract.contractId,
  acceptedSourceContract: contract.acceptedSourceContract,
  requiredEvidenceContract: contract.requiredEvidenceContract,
  authority: contract.acceptance.mode,
  executionAuthorityInherited: false,
  browserAuthorityInherited: false,
  autoRegistrationAllowed: false
}));
