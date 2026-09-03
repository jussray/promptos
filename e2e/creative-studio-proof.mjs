import {mkdir, writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const BASE_URL = process.env.PROMPTOS_BASE_URL || 'http://127.0.0.1:4173';
const OUTPUT_DIR = process.env.PROMPTOS_CREATIVE_STUDIO_PROOF_DIR || 'artifacts/creative-studio-proof';
const TARGET_TITLE = 'Creative Director Router';
const TARGET_ID = 309;
const PROVIDERS = ['chatgpt-image','midjourney','leonardo','ideogram','flux'];

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

  const registry = await page.evaluate(({targetId, providers}) => {
    const prompt = Array.isArray(PROMPTS) ? PROMPTS.find((entry) => entry?.id === targetId) : null;
    return {
      title: prompt?.title || null,
      category: prompt?.cat || null,
      platforms: prompt?.platforms || [],
      versionKeys: Object.keys(prompt?.versions || {}),
      hasAllProviders: providers.every((provider) => typeof prompt?.versions?.[provider] === 'string' && prompt.versions[provider].length > 180),
      chatgptBody: prompt?.versions?.['chatgpt-image'] || ''
    };
  }, {targetId: TARGET_ID, providers: PROVIDERS});

  assert(registry.title === TARGET_TITLE, `missing ${TARGET_TITLE}`);
  assert(registry.category === 'design', 'creative router must render in design category');
  assert(registry.platforms.join(',') === PROVIDERS.join(','), 'provider tabs drifted in runtime registry');
  assert(registry.versionKeys.join(',') === PROVIDERS.join(','), 'provider version order drifted');
  assert(registry.hasAllProviders, 'one or more provider adapters are missing');
  assert(registry.chatgptBody.includes('social-graphic') && registry.chatgptBody.includes('logo-concepts'), 'master router omitted specialist routes');
  assert(registry.chatgptBody.includes('Never let a provider become brand or publication authority'), 'master router widened provider authority');

  const search = page.locator('#search');
  await search.fill(TARGET_TITLE);
  const cards = page.locator('.pcard');
  await cards.first().waitFor({state: 'visible'});
  assert(await cards.count() === 1, 'creative router search did not resolve uniquely');
  assert((await cards.locator('h3').textContent())?.trim() === TARGET_TITLE, 'creative router card title drifted');

  await page.locator(`[data-open="${TARGET_ID}"]`).click();
  await page.locator('#modalWrap.open').waitFor({state: 'visible'});
  const tabs = await page.locator('#mTabs .ptab').allTextContents();
  assert(tabs.join(',') === PROVIDERS.join(','), `modal provider tabs drifted: ${tabs.join(',')}`);

  const chatgptBody = (await page.locator('#mBody').textContent()) || '';
  assert(chatgptBody.includes('Create the final visual now'), 'ChatGPT image generation adapter did not render');
  assert(chatgptBody.includes('<variables>'), 'dropdown-style variable template did not render');

  await page.getByRole('button', {name: 'midjourney', exact: true}).click();
  const midjourneyBody = (await page.locator('#mBody').textContent()) || '';
  assert(midjourneyBody.endsWith('--ar [ASPECT_RATIO] [OPTIONAL_MJ_PARAMETERS]'), 'Midjourney parameters are not kept at the end');

  await page.getByRole('button', {name: 'ideogram', exact: true}).click();
  const ideogramBody = (await page.locator('#mBody').textContent()) || '';
  assert(ideogramBody.includes('Typography direction:'), 'Ideogram text-first adapter did not render');

  await mkdir(OUTPUT_DIR, {recursive: true});
  const name = `${viewport.width}x${viewport.height}`;
  const screenshot = `${OUTPUT_DIR}/${name}.png`;
  await page.screenshot({path: screenshot, fullPage: true});

  assert(pageErrors.length === 0, `page errors: ${pageErrors.join(' | ')}`);
  assert(consoleErrors.length === 0, `console errors: ${consoleErrors.join(' | ')}`);
  await context.close();
  return {viewport, title: TARGET_TITLE, promptId: TARGET_ID, providers: PROVIDERS, screenshot};
}

await mkdir(OUTPUT_DIR, {recursive: true});
const browser = await chromium.launch({headless: true});
try {
  const results = [
    await prove(browser, {width: 1440, height: 1000}),
    await prove(browser, {width: 390, height: 844})
  ];
  const receipt = {
    schemaVersion: 1,
    proofScope: 'creative-studio-rendering-only',
    providerExecutionVerified: false,
    generatedAt: new Date().toISOString(),
    result: 'passed',
    results
  };
  await writeFile(`${OUTPUT_DIR}/receipt.json`, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(receipt));
} finally {
  await browser.close();
}
