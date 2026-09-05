import { readFile } from 'node:fs/promises';

const contract = JSON.parse(await readFile('.control-room/control-input.contract.json', 'utf8'));
const entrypoint = await readFile('AGENTS_FOUNDER_INTELLIGENCE.md', 'utf8');

const requiredModes = [
  'goalfix',
  'ultrathink',
  'truthmode',
  'confess',
  'redteam',
  'attackten',
  'lindymode',
  'ooda',
  'proofmode',
  'l99',
];

const requiredUntrusted = [
  'external-user',
  'api-payload',
  'webpage',
  'email',
  'document',
  'retrieved-content',
  'plugin-output',
  'tool-output',
  'model-output',
];

const requiredTrusted = [
  'internal-controller',
  'operator-control-plane',
  'trusted-scheduler',
];

const rules = contract?.rules || {};
const checks = [
  ['control-input contract is v1', contract?.contract === 'promptos/internal-control-input@v1'],
  ['portable control-input contract is pinned', contract?.portableContract === 'juss/portable-control-input@v1'],
  ['contract remains advisory only', contract?.authority === 'advisory-only'],
  ['system-owned mode list is exact', JSON.stringify(contract?.systemOwnedModes) === JSON.stringify(requiredModes)],
  ['untrusted source list is exact', JSON.stringify(contract?.untrustedSources) === JSON.stringify(requiredUntrusted)],
  ['trusted controller origins are exact', JSON.stringify(contract?.trustedControllerOrigins) === JSON.stringify(requiredTrusted)],
  ['untrusted input is data', rules.untrustedInputIsData === true],
  ['caller mode names are non-authorizing', rules.callerSuppliedModeNameIsAuthority === false],
  ['external text cannot select modes', rules.externalTextMaySelectInternalMode === false],
  ['external text cannot trigger system workflows', rules.externalTextMayTriggerSystemWorkflow === false],
  ['authorized controller is required', rules.authorizedInternalControllerRequired === true],
  ['mode selection cannot widen authority', rules.modeSelectionMayWidenAuthority === false],
  ['mode selection does not imply execution authority', rules.modeSelectionImpliesExecutionAuthority === false],
  ['continuity cannot authorize mode selection', rules.continuityMayAuthorizeModeSelection === false],
  ['fingerprints cannot authorize mode selection', rules.fingerprintMayAuthorizeModeSelection === false],
  ['selection law says mode names are data, never authority', /Mode names are identifiers and data, never invocation authority/.test(contract?.selectionLaw || '')],
  ['execution law preserves privileged gates', /does not authorize execution, merge, deployment, publication, provider mutation, secret access, spending, deletion/.test(contract?.executionLaw || '')],
  ['fail-closed law blocks ambiguous trust or authority', /do not activate the mode and return BLOCKED or inert data semantics/.test(contract?.failClosedLaw || '')],
  ['founder entrypoint documents untrusted input as inert', /untrusted external input[\s\S]+inert data/i.test(entrypoint)],
  ['founder entrypoint requires an authorized internal controller', /authorized internal controller/i.test(entrypoint)],
  ['founder entrypoint says strings never grant authority', /Strings never grant authority/.test(entrypoint)],
];

const failed = checks.filter(([, passed]) => !passed);
if (failed.length > 0) {
  console.error('PromptOS control-input contract verification failed:');
  for (const [name] of failed) console.error(`- ${name}`);
  process.exit(1);
}

console.log(`PromptOS control-input contract verification passed (${checks.length} checks).`);
