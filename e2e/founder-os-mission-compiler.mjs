import {mkdir, writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const BASE_URL = process.env.PROMPTOS_BASE_URL || 'http://127.0.0.1:4173';
const OUTPUT_DIR = process.env.PROMPTOS_FOUNDER_OS_PROOF_DIR || 'artifacts/promptos-founder-os-proof';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function prove(browser, viewport) {
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

  const runtime = await page.evaluate(() => ({
    version: window.PROMPTOS_FOUNDER_OS_VERSION,
    compiler: typeof window.compilePromptOSMission,
    promptIds: Array.isArray(PROMPTS)
      ? PROMPTS.filter((prompt) => [92, 93, 94].includes(prompt?.id)).map((prompt) => prompt.id)
      : [],
  }));
  assert(runtime.version === 'founder-os-mission-v1', `unexpected compiler version: ${runtime.version}`);
  assert(runtime.compiler === 'function', 'compiler runtime export is missing');
  assert(runtime.promptIds.length === 3, `expected 3 Founder OS prompts, got ${runtime.promptIds.length}`);

  const missionNav = page.locator('[data-page="mission"]:visible').first();
  await missionNav.click();
  await page.locator('#page-mission.on').waitFor({state: 'visible'});

  await page.locator('#foProject').fill('jussray/Sekret-Bip');
  await page.locator('#foIntent').fill('Repair production Cloudflare routing, improve the user-facing recovery flow, and measure successful completion.');
  await page.locator('#foConstraints').fill('Audit current main first. Preserve unrelated behavior. Playwright proof required for UI claims.');
  await page.locator('#foProviders').fill('github, cloudflare');
  await page.locator('#foCompile').click();

  await page.locator('#foOutput').waitFor({state: 'visible'});
  const outputText = await page.locator('#foOutput').innerText();
  for (const required of [
    'L6',
    'critical',
    'product-design',
    'data-analytics',
    'Playwright proof is mandatory',
    'Baseline + comparable post-change measurement required',
    'Chief AI:',
    'PromptOS:',
    'FCR:',
    'provider-readback',
    'rollback-path',
  ]) {
    assert(outputText.includes(required), `compiled mission UI missing: ${required}`);
  }

  const compiled = await page.locator('#foCompiled').innerText();
  assert(compiled.includes('Authority ceiling: L6'), 'compiled instruction did not preserve L6 ceiling');
  assert(compiled.includes('The system may exercise granted authority but may never expand its own authority.'), 'compiled instruction lost authority boundary');

  assert(pageErrors.length === 0, `page errors: ${pageErrors.join(' | ')}`);
  assert(consoleErrors.length === 0, `console errors: ${consoleErrors.join(' | ')}`);

  await mkdir(OUTPUT_DIR, {recursive: true});
  const name = viewport.width < 600 ? 'mobile' : 'desktop';
  const screenshot = `${OUTPUT_DIR}/${name}.png`;
  await page.screenshot({path: screenshot, fullPage: true});

  await context.close();
  return {
    name,
    viewport,
    runtime,
    authority: 'L6',
    productDesignGate: true,
    dataAnalyticsGate: true,
    pageErrors,
    consoleErrors,
    screenshot,
  };
}

await mkdir(OUTPUT_DIR, {recursive: true});
const browser = await chromium.launch({headless: true});
try {
  const viewports = [
    await prove(browser, {width: 1440, height: 1000}),
    await prove(browser, {width: 390, height: 844}),
  ];
  const receipt = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    result: 'passed',
    version: 'founder-os-mission-v1',
    viewports,
  };
  await writeFile(`${OUTPUT_DIR}/receipt.json`, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(receipt));
} finally {
  await browser.close();
}
