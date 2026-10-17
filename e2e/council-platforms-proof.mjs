import {chromium} from 'playwright';

const BASE_URL = process.env.PROMPTOS_BASE_URL || 'http://127.0.0.1:4173';
const NEW_PLATFORMS = ['gemini', 'muse', 'meta', 'deepseek', 'granola', 'obsidian'];
const LABELS = {gemini: 'Gemini', muse: 'Muse', meta: 'Meta', deepseek: 'DeepSeek', granola: 'Granola', obsidian: 'Obsidian'};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function go(page, name) {
  await page.locator(`.mobile-nav [data-page="${name}"], .sidebar [data-page="${name}"]`).filter({visible: true}).first().click();
  await page.locator(`#page-${name}.on`).waitFor({state: 'visible'});
}

async function prove(browser, {name, width, height}) {
  const context = await browser.newContext({viewport: {width, height}});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE_URL, {waitUntil: 'domcontentloaded'});
  await page.locator('#appShell').waitFor({state: 'visible'});
  await page.locator('#page-catalog.on').waitFor({state: 'visible'});

  // Freestyle: every new platform is selectable and produces its own tab.
  await go(page, 'freestyle');
  for (const value of NEW_PLATFORMS) {
    const box = page.locator(`.pcheck input[value="${value}"]`);
    assert(await box.count() === 1, `${name}: freestyle is missing the ${value} checkbox`);
    await box.check();
  }
  await page.locator('#fsAsk').fill('Audit the onboarding flow before launch');
  await page.locator('#fsGenerate').click();
  for (const value of NEW_PLATFORMS) {
    await page.locator('#fsTabs .ptab', {hasText: new RegExp(`^${value}$`)}).waitFor({state: 'visible'});
  }
  await page.locator('#fsTabs .ptab', {hasText: /^granola$/}).click();
  const granolaBody = await page.locator('#fsBody').textContent();
  assert(granolaBody.includes('Using only what was said in this meeting'), `${name}: granola freestyle is not meeting-bound`);
  await page.locator('#fsTabs .ptab', {hasText: /^obsidian$/}).click();
  const obsidianBody = await page.locator('#fsBody').textContent();
  assert(obsidianBody.includes('YAML frontmatter') && obsidianBody.includes('[[wikilinks]]'), `${name}: obsidian freestyle is not a vault note`);

  // Builder: each new platform changes the output shape instead of silently falling back to ChatGPT.
  await go(page, 'builder');
  await page.locator('#bTask').fill('Find why the save button does nothing');
  const outputs = {};
  for (const value of NEW_PLATFORMS) {
    await page.locator('#bPlatform').selectOption({label: LABELS[value]});
    outputs[value] = await page.locator('#builderOut').textContent();
    assert(outputs[value].includes('Find why the save button does nothing'), `${name}: builder ${value} dropped the task`);
  }
  assert(new Set(Object.values(outputs)).size === NEW_PLATFORMS.length, `${name}: builder outputs are not distinct per platform`);
  assert(outputs.granola.includes('Using only what was said in this meeting'), `${name}: builder granola is not meeting-bound`);
  assert(outputs.obsidian.includes('YAML frontmatter'), `${name}: builder obsidian is not a vault note`);
  assert(outputs.gemini.includes('## Task'), `${name}: builder gemini lost its sections`);

  // Library: the attack and godmode prompts exist with a version for every new seat.
  await go(page, 'library');
  await page.locator('#search').fill('Council');
  for (const title of ['Council Attack', 'Council Godmode']) {
    const card = page.locator('#grid .pcard h3', {hasText: title});
    await card.waitFor({state: 'visible'});
    await card.click();
    for (const value of NEW_PLATFORMS) {
      await page.locator('#mTabs .ptab', {hasText: new RegExp(`^${value}$`)}).waitFor({state: 'visible'});
    }
    await page.locator('#mTabs .ptab', {hasText: /^granola$/}).click();
    const body = await page.locator('#mBody').textContent();
    assert(body.includes('NEXT GATE') && body.includes('not discussed'), `${name}: ${title} granola version is missing the report or the meeting bound`);
    await page.locator('#mTabs .ptab', {hasText: /^deepseek$/}).click();
    assert((await page.locator('#mBody').textContent()).includes('showing the key reasoning'), `${name}: ${title} deepseek version does not ask for reasoning`);
    await page.keyboard.press('Escape');
    await page.locator('#modalWrap.open').waitFor({state: 'detached'}).catch(() => page.locator('#modalWrap').evaluate((el) => el.classList.remove('open')));
  }
  assert(errors.length === 0, `${name}: page errors: ${errors.join(' | ')}`);
  await context.close();
  console.log(`council platforms ok: ${name}`);
}

const browser = await chromium.launch();
try {
  await prove(browser, {name: 'desktop', width: 1280, height: 900});
  await prove(browser, {name: 'mobile', width: 390, height: 844});
} finally {
  await browser.close();
}
