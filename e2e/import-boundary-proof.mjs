import {mkdir, writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const BASE_URL = process.env.PROMPTOS_BASE_URL || 'http://127.0.0.1:4173';
const OUTPUT_DIR = process.env.PROMPTOS_PROOF_DIR || 'artifacts/promptos-rendered-proof';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function proveImportBoundary(browser, viewport) {
  const context = await browser.newContext({viewport});
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];

  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto(BASE_URL, {waitUntil: 'domcontentloaded'});
  await page.locator('#appShell').waitFor({state: 'visible'});

  const policy = await page.evaluate(() => window.__PROMPTOS_IMPORT_POLICY__);
  assert(policy?.schemaVersion === 1, 'import policy schemaVersion is not 1');
  assert(policy?.legacySchemaVersion === 0, 'legacy import compatibility is not declared');
  assert(policy?.maxBytes === 524288, 'import byte cap is not 512 KiB');
  assert(policy?.maxCustomPrompts === 100, 'custom prompt cap is not 100');

  const validatorAttacks = await page.evaluate(() => {
    function attempt(raw) {
      try {
        const result = window.__promptosValidateImport(raw);
        return {accepted: true, schemaVersion: result?.schemaVersion ?? null};
      } catch (error) {
        return {accepted: false, message: String(error?.message || error)};
      }
    }

    const basePrompt = {
      id: 'c_import_1',
      emoji: '✨',
      title: 'Imported proof prompt',
      sub: 'browser import proof',
      cat: 'custom',
      platforms: ['chatgpt'],
      body: 'Prove the import boundary without widening authority.',
      ts: 1,
    };

    return {
      current: attempt(JSON.stringify({schemaVersion: 1, stars: {'64': true}, custom: [basePrompt], theme: 'dark'})),
      legacy: attempt(JSON.stringify({stars: {}, custom: [], theme: 'dark'})),
      futureVersion: attempt(JSON.stringify({schemaVersion: 99, stars: {}, custom: [], theme: 'dark'})),
      prototypeKey: attempt('{"schemaVersion":1,"__proto__":{"polluted":true},"stars":{},"custom":[],"theme":"dark"}'),
      unknownTopLevel: attempt(JSON.stringify({schemaVersion: 1, stars: {}, custom: [], theme: 'dark', execute: true})),
      invalidTheme: attempt(JSON.stringify({schemaVersion: 1, stars: {}, custom: [], theme: 'neon'})),
      duplicateIds: attempt(JSON.stringify({schemaVersion: 1, stars: {}, custom: [basePrompt, basePrompt], theme: 'dark'})),
      oversizedBody: attempt(JSON.stringify({schemaVersion: 1, stars: {}, custom: [{...basePrompt, body: 'x'.repeat(20001)}], theme: 'dark'})),
      tooManyPrompts: attempt(JSON.stringify({schemaVersion: 1, stars: {}, custom: Array.from({length: 101}, (_, index) => ({...basePrompt, id: `c_${index}`})), theme: 'dark'})),
      prototypePolluted: ({}).polluted === true,
    };
  });

  assert(validatorAttacks.current.accepted, 'current import schema was rejected');
  assert(validatorAttacks.legacy.accepted && validatorAttacks.legacy.schemaVersion === 0, 'legacy export compatibility failed');
  assert(!validatorAttacks.futureVersion.accepted && validatorAttacks.futureVersion.message.includes('unsupported schemaVersion'), 'future schema was not rejected');
  assert(!validatorAttacks.prototypeKey.accepted && validatorAttacks.prototypeKey.message.includes('forbidden key'), 'prototype-bearing payload was not rejected');
  assert(!validatorAttacks.unknownTopLevel.accepted && validatorAttacks.unknownTopLevel.message.includes('unknown top-level key'), 'unknown top-level mutation key was not rejected');
  assert(!validatorAttacks.invalidTheme.accepted && validatorAttacks.invalidTheme.message.includes('theme must be dark or light'), 'invalid theme was not rejected');
  assert(!validatorAttacks.duplicateIds.accepted && validatorAttacks.duplicateIds.message.includes('duplicate custom id'), 'duplicate custom ids were not rejected');
  assert(!validatorAttacks.oversizedBody.accepted && validatorAttacks.oversizedBody.message.includes('length must be'), 'oversized prompt body was not rejected');
  assert(!validatorAttacks.tooManyPrompts.accepted && validatorAttacks.tooManyPrompts.message.includes('too many custom prompts'), 'custom prompt count cap was not enforced');
  assert(!validatorAttacks.prototypePolluted, 'prototype pollution occurred during validation');

  const validPayload = JSON.stringify({
    schemaVersion: 1,
    stars: {'64': true},
    custom: [{
      id: 'c_import_ui',
      emoji: '🧪',
      title: 'Imported UI proof',
      sub: 'atomic import',
      cat: 'custom',
      platforms: ['chatgpt'],
      body: 'This prompt exists only to prove a fully validated import can commit atomically.',
      ts: 1,
    }],
    theme: 'dark',
  });

  const importInput = page.locator('#importFile');
  await importInput.setInputFiles({name: 'promptos-valid.json', mimeType: 'application/json', buffer: Buffer.from(validPayload)});
  await page.locator('#toast.show').waitFor({state: 'visible'});
  assert((await page.locator('#toast').innerText()).includes('State imported'), 'valid file did not complete the real import UI path');
  assert((await page.locator('#statCustom').innerText()).trim() === '1', 'valid import did not materialize exactly one custom prompt');
  assert(await page.locator('html').getAttribute('data-theme') === 'dark', 'valid import changed theme unexpectedly');

  const invalidPayload = JSON.stringify({
    schemaVersion: 99,
    stars: {'64': true, '65': true},
    custom: [{
      id: 'c_should_not_apply',
      emoji: '🚫',
      title: 'Must not apply',
      sub: '',
      cat: 'custom',
      platforms: ['chatgpt'],
      body: 'Invalid future schema must not partially mutate state.',
      ts: 2,
    }],
    theme: 'light',
  });

  await importInput.setInputFiles({name: 'promptos-invalid-version.json', mimeType: 'application/json', buffer: Buffer.from(invalidPayload)});
  await page.locator('#toast.show').waitFor({state: 'visible'});
  const invalidToast = await page.locator('#toast').innerText();
  assert(invalidToast.includes('Import rejected: unsupported schemaVersion 99'), 'invalid schema did not fail closed through the real file-input path');
  assert((await page.locator('#statCustom').innerText()).trim() === '1', 'rejected import partially mutated custom prompts');
  assert(await page.locator('html').getAttribute('data-theme') === 'dark', 'rejected import partially mutated theme');

  await importInput.setInputFiles({name: 'promptos-too-large.json', mimeType: 'application/json', buffer: Buffer.alloc(policy.maxBytes + 1, 0x78)});
  await page.locator('#toast.show').waitFor({state: 'visible'});
  const largeToast = await page.locator('#toast').innerText();
  assert(largeToast.includes('Import rejected: file exceeds 524288 bytes'), 'oversized file was not rejected before parsing');
  assert((await page.locator('#statCustom').innerText()).trim() === '1', 'oversized file mutated state');

  assert(pageErrors.length === 0, `page errors: ${pageErrors.join(' | ')}`);
  assert(consoleErrors.length === 0, `console errors: ${consoleErrors.join(' | ')}`);

  const result = {
    viewport,
    policy,
    validatorAttacks,
    validUiImport: true,
    rejectedUiImportAtomic: true,
    oversizedFileRejected: true,
    pageErrors,
    consoleErrors,
  };
  await context.close();
  return result;
}

await mkdir(OUTPUT_DIR, {recursive: true});
const browser = await chromium.launch({headless: true});
try {
  const results = [];
  results.push(await proveImportBoundary(browser, {width: 1440, height: 1000}));
  results.push(await proveImportBoundary(browser, {width: 390, height: 844}));
  const receipt = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    result: 'passed',
    proofScope: 'state-import-boundary',
    viewports: results,
  };
  await writeFile(`${OUTPUT_DIR}/import-boundary.json`, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(receipt));
} finally {
  await browser.close();
}
