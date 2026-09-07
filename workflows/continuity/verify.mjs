import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import {
  ASSISTANT_CONTINUITY_CONTRACT,
  MAIN_CONTINUITY_CONTRACT,
  createAssistantContinuityReceipt,
  createMainContinuityReceipt,
  evaluateAssistantContinuity,
  evaluateMainContinuity,
} from './continuity-fingerprint.mjs';

const failures = [];
const shaA = '1'.repeat(40);
const shaB = '2'.repeat(40);
const shaC = '3'.repeat(40);

const mainA = createMainContinuityReceipt({ repository: 'jussray/promptos', branch: 'main', sha: shaA });
const mainA2 = createMainContinuityReceipt({ repository: 'JUSSRAY/PromptOS', branch: 'main', sha: shaA });
const mainB = createMainContinuityReceipt({ repository: 'jussray/promptos', branch: 'main', sha: shaB });

if (mainA.contract !== MAIN_CONTINUITY_CONTRACT) failures.push('main contract drifted');
if (mainA.fingerprint !== mainA2.fingerprint || mainA.cookie !== mainA2.cookie) failures.push('main normalization is not deterministic');
if (mainA.fingerprint === mainB.fingerprint || mainA.cookie === mainB.cookie) failures.push('main movement did not expire continuity');
if (mainA.browserCookie !== false || mainA.deviceFingerprint !== false || mainA.authorizing !== false) failures.push('main continuity crossed privacy/authority boundary');
if (evaluateMainContinuity(mainA, { repository: 'jussray/promptos', branch: 'main', sha: shaA }).state !== 'current') failures.push('unchanged main did not remain current');
if (evaluateMainContinuity(mainA, { repository: 'jussray/promptos', branch: 'main', sha: shaB }).state !== 'stale') failures.push('changed main did not become stale');

const assistantA = createAssistantContinuityReceipt({
  source: 'chatgpt',
  operator: 'gpt-5.6-sol',
  mains: [
    { repository: 'jussray/promptos', branch: 'main', sha: shaA },
    { repository: 'jussray/founder-control-room', branch: 'main', sha: shaB },
  ],
});
const assistantReordered = createAssistantContinuityReceipt({
  source: 'chatgpt',
  operator: 'gpt-5.6-sol',
  mains: [
    { repository: 'jussray/founder-control-room', branch: 'main', sha: shaB },
    { repository: 'jussray/promptos', branch: 'main', sha: shaA },
  ],
});
const assistantMoved = createAssistantContinuityReceipt({
  source: 'chatgpt',
  operator: 'gpt-5.6-sol',
  mains: [
    { repository: 'jussray/founder-control-room', branch: 'main', sha: shaB },
    { repository: 'jussray/promptos', branch: 'main', sha: shaC },
  ],
});

if (assistantA.contract !== ASSISTANT_CONTINUITY_CONTRACT) failures.push('assistant contract drifted');
if (assistantA.fingerprint !== assistantReordered.fingerprint || assistantA.cookie !== assistantReordered.cookie) failures.push('assistant continuity depends on input ordering');
if (assistantA.fingerprint === assistantMoved.fingerprint || assistantA.cookie === assistantMoved.cookie) failures.push('assistant continuity did not expire when one main moved');
if (assistantA.browserCookie !== false || assistantA.deviceFingerprint !== false || assistantA.personalDataFingerprint !== false || assistantA.authorizing !== false) failures.push('assistant continuity crossed privacy/authority boundary');
if (evaluateAssistantContinuity(assistantA, {
  source: 'chatgpt', operator: 'gpt-5.6-sol', mains: [
    { repository: 'jussray/promptos', branch: 'main', sha: shaA },
    { repository: 'jussray/founder-control-room', branch: 'main', sha: shaB },
  ],
}).state !== 'current') failures.push('unchanged assistant continuity did not remain current');
if (evaluateAssistantContinuity(assistantA, {
  source: 'chatgpt', operator: 'gpt-5.6-sol', mains: [
    { repository: 'jussray/promptos', branch: 'main', sha: shaC },
    { repository: 'jussray/founder-control-room', branch: 'main', sha: shaB },
  ],
}).state !== 'stale') failures.push('assistant continuity did not become stale after main movement');

try {
  const cliMain = JSON.parse(execFileSync(process.execPath, [
    'workflows/continuity/continuity-cookie.mjs', 'main', '--repository', 'jussray/promptos', '--sha', shaA,
  ], { encoding: 'utf8' }));
  if (cliMain.fingerprint !== mainA.fingerprint || cliMain.cookie !== mainA.cookie) failures.push('main CLI drifted from library contract');

  const cliAssistant = JSON.parse(execFileSync(process.execPath, [
    'workflows/continuity/continuity-cookie.mjs', 'assistant', '--operator', 'gpt-5.6-sol',
    '--main', `jussray/promptos@${shaA}`,
    '--main', `jussray/founder-control-room@${shaB}`,
  ], { encoding: 'utf8' }));
  if (cliAssistant.fingerprint !== assistantA.fingerprint || cliAssistant.cookie !== assistantA.cookie) failures.push('assistant CLI drifted from library contract');
} catch (error) {
  failures.push(`continuity CLI failed: ${error.message}`);
}

const protocol = await readFile('workflows/continuity/README.md', 'utf8');
const workflow = await readFile('.github/workflows/control-room-tests.yml', 'utf8');
const ultrathink = JSON.parse(await readFile('workflows/ultrathink.workflow.json', 'utf8'));

for (const token of [
  'repository + branch + exact SHA',
  'not a browser cookie',
  'device, IP, browser, account, or personal-data fingerprint',
  'Any bound `main` movement',
]) {
  if (!protocol.includes(token)) failures.push(`continuity protocol missing: ${token}`);
}
if (workflow.split('      - "workflows/**"').length - 1 !== 2) failures.push('workflows/** must remain watched by PR and main-push verification');
for (const token of [
  'main fingerprint + continuity cookie',
  'assistant continuity cookie',
  'never become browser cookies',
  'never grant authority',
  'main movement expires predecessor continuity',
]) {
  if (!ultrathink.operatingPrinciples?.some((principle) => principle.includes(token))) {
    failures.push(`ULTRATHINK continuity rule missing: ${token}`);
  }
}

if (failures.length) {
  console.error('Continuity fingerprint verification failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(JSON.stringify({
  status: 'passed',
  mainContract: MAIN_CONTINUITY_CONTRACT,
  assistantContract: ASSISTANT_CONTINUITY_CONTRACT,
  mainMovementExpiresContinuity: true,
  assistantExpiresOnAnyMainMovement: true,
  browserCookie: false,
  deviceFingerprint: false,
  authorizing: false,
}));
