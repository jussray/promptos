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
    const encoded=route.request().headers().authorization.split(' ')[1]?.split('.')[1];
    const subject='https://accounts.google.com#'+JSON.parse(Buffer.from(encoded,'base64url').toString()).sub;
    if(path==='/prompts/library'){
      const finish=(status,body)=>route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(body)});
      if(!allowed) return finish(402,{error:'paid account required'});
      if(!state.durable||state.libraryOutage) return finish(503,{error:'storage unavailable'});
      const row=state.library.get(subject)||{revision:0,prompts:[]};
      if(route.request().method()==='GET') return finish(200,row);
      const input=route.request().postDataJSON();
      if(input.revision!==row.revision) return finish(409,{error:'conflict'});
      const next={revision:row.revision+1,prompts:input.prompts};
      state.library.set(subject,next);
      return finish(200,next);
    }
    const body = path === '/billing/entitlement' ? {paid:state.paid === true} :
      path === '/billing/offer' ? {offer} :
      path === '/billing/checkout' ? {...offer,url:'https://checkout.stripe.com/c/test_fixture'} :
      allowed ? {admitted:true,subject} : {error:'paid account required'};
    return route.fulfill({status:path === '/prompts/admit' && !allowed ? 402 : 200,headers,contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.route(origin+'/**', async route => {
    if (!route.request().isNavigationRequest()) return route.continue();
    const response = await route.fetch();
    let body = (await response.text()).replace('<meta name="promptos-billing-api" content="">','<meta name="promptos-billing-api" content="https://billing.test">');
    if(state.durable) body=body.replace('<meta name="promptos-durable-library" content="disabled">','<meta name="promptos-durable-library" content="enabled">');
    return route.fulfill({response,body});
  });
  await page.reload({waitUntil:'domcontentloaded'});
}
export async function signInFixture(page, subject='test-owner') {
  await page.evaluate(subject => {
    const payload = btoa(JSON.stringify({sub:subject,name:'Test Account',email:'fixture@example.invalid'})).replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
    window.__promptosGsiCallback({credential:'mock.'+payload+'.signature'});
  }, subject);
}
// Compatibility name for prior browser proofs; this is a paid fixture, not guest admission.
export async function enterGuestWorkspace(page) {
  await installBillingFixture(page);
  await page.locator('#welcomeScreen').waitFor({state:'visible'});
  await page.locator('[data-start-onboarding]').click();
  await signInFixture(page);
  await page.locator('#appShell').waitFor({state:'visible'});
}
