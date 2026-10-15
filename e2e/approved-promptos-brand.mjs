import { chromium } from 'playwright';

const baseUrl = process.env.PROMPTOS_BASE_URL || 'http://127.0.0.1:4173';

function assert(ok, message) { if (!ok) throw new Error(message); }

async function verifyViewport(browser, width, height) {
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    // These UI checks require the ordinary authenticated PromptOS test setup.
    // Do not bypass sign-in or turn private prompt state into a public fixture.
    await page.locator('#appShell').waitFor({ state: 'visible', timeout: 20000 });
    await page.locator('#page-library.on .brand-hero h1').waitFor({ state: 'visible' });
    assert((await page.locator('#page-library.on .brand-hero h1').innerText()).includes('Prompt'), 'Missing approved PromptOS title');

    const art = await page.request.get(new URL('/assets/brand/approved-promptos-cube.webp', baseUrl).toString());
    assert(art.status() === 200, 'Approved PromptOS cube asset unavailable');
    assert(/image\/webp/i.test(art.headers()['content-type'] || ''), 'Cube content type not WebP');

    const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert(horizontalOverflow <= 1, `${width}px: horizontal overflow ${horizontalOverflow}px`);

    await page.locator('.brand-command [data-page="builder"]').click();
    await page.locator('#page-builder.on').waitFor({ state: 'visible' });
    if (width < 900) {
      await page.locator('.mobile-nav [data-page="library"]').click();
    } else {
      await page.locator('.brand-top-nav [data-page="library"]').click();
    }
    await page.locator('#page-library.on').waitFor({ state: 'visible' });
    assert(errors.length === 0, 'Unexpected page errors: ' + errors.join('; '));
    console.log(JSON.stringify({ viewport: `${width}x${height}`, result: 'PASS' }));
  } finally {
    await page.close();
  }
}

const browser = await chromium.launch({ headless: true });
try {
  await verifyViewport(browser, 1440, 900);
  await verifyViewport(browser, 390, 844);
} finally {
  await browser.close();
}
