// Test-only provider fixture. Never run this against a deployed origin.
export async function installBillingFixture(page, state = {paid:true}) {
  const origin = new URL(page.url()).origin;
  if (!['127.0.0.1','localhost'].includes(new URL(origin).hostname)) throw new Error('Local mock only');
  await page.route('https://billing.test/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const headers = {'Access-Control-Allow-Origin': '*','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type'};
    if (route.request().method() === 'OPTIONS') return route.fulfill({status:204,headers});
    if (!route.request().headers().authorization) return route.fulfill({status:401,headers,body:'{}'});
    const offer = {billingMode:'test',firstInvoiceAmountMinor:100,renewalAmountMinor:999,currency:'usd',interval:'month',termsUrl:'https://merchant.example/terms'};
    const allowed = state.paid && state.admit !== false;
    const body = path === '/billing/entitlement' ? {paid:state.paid === true} :
      path === '/billing/offer' ? {offer} :
      path === '/billing/checkout' ? {...offer,url:'https://checkout.stripe.com/c/test_fixture'} :
      allowed ? {admitted:true,subject:'https://accounts.google.com#test-owner'} : {error:'paid account required'};
    return route.fulfill({status:path === '/prompts/admit' && !allowed ? 402 : 200,headers,contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.route(origin+'/**', async route => {
    if (!route.request().isNavigationRequest()) return route.continue();
    const response = await route.fetch();
    const body = (await response.text()).replace('<meta name="promptos-billing-api" content="">','<meta name="promptos-billing-api" content="https://billing.test">');
    return route.fulfill({response,body});
  });
  await page.reload({waitUntil:'domcontentloaded'});
}
export async function signInFixture(page) {
  await page.evaluate(() => {
    const payload = btoa(JSON.stringify({sub:'test-owner',name:'Test Account',email:'fixture@example.invalid'})).replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
    window.__promptosGsiCallback({credential:'mock.'+payload+'.signature'});
  });
}
// Compatibility name for prior browser proofs; this is a paid fixture, not guest admission.
export async function enterGuestWorkspace(page) {
  await installBillingFixture(page);
  await page.locator('#welcomeScreen').waitFor({state:'visible'});
  await page.locator('[data-start-onboarding]').click();
  await signInFixture(page);
  await page.locator('#appShell').waitFor({state:'visible'});
}
