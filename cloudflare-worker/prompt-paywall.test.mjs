import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { webcrypto } from 'node:crypto';
import { handlePromptPaywall } from './prompt-paywall.js';
import worker from './analytics.js';

const c = globalThis.crypto || webcrypto;
const audience = '813638397474-6pibutsimcafimrcttq7idnmugsin01c.apps.googleusercontent.com';
const { privateKey, publicKey } = await c.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  true, ['sign', 'verify']);
const jwk = await c.subtle.exportKey('jwk', publicKey);
jwk.kid = 'test-key';
jwk.alg = 'RS256';
const now = () => Math.floor(Date.now() / 1000);
const calls = [];
let upstream;
const env = {
  PROMPTOS_JUSSPAY: {
    async fetch(request) {
      calls.push({ url: request.url, method: request.method, auth: request.headers.get('Authorization') });
      if (upstream === 'outage') throw new Error('unavailable');
      if (upstream === 'unauthorized') return Response.json({ error: 'unauthorized' }, { status: 401 });
      if (upstream === 'invalid') return Response.json({ paid: true });
      return Response.json({ entitlements: upstream ?? [] });
    }
  }
};
const run = (path, method = 'GET', token, config = env) => handlePromptPaywall(
  new Request('https://promptos.example' + path, { method,
    headers: token ? { Authorization: 'Bearer ' + token } : {} }),
  config, path, { 'Access-Control-Allow-Origin': 'https://jussray.github.io' }
);
const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');
async function jwt(overrides = {}) {
  const value = b64({ alg: 'RS256', kid: 'test-key' }) + '.' + b64({
    iss: 'https://accounts.google.com', aud: audience, sub: 'user-123',
    iat: now(), exp: now() + 3600, email: 'verified@example.com', email_verified: true, ...overrides
  });
  const signature = await c.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(value));
  return value + '.' + Buffer.from(signature).toString('base64url');
}
const oldFetch = globalThis.fetch;
globalThis.fetch = async url => {
  assert.equal(String(url), 'https://www.googleapis.com/oauth2/v3/certs', 'Never contact Stripe directly from PromptOS');
  return Response.json({ keys: [jwk] });
};

test('unconfigured JussPay denies all personal prompt admissions', async () => {
  const token = await jwt();
  assert.equal((await run('/prompts/admit', 'POST', token, {})).status, 503);
  assert.equal((await run('/billing/entitlement', 'GET', token, {})).status, 503);
});

test('unsigned, expired, wrong-audience or forged Google credentials never reach JussPay', async () => {
  calls.length = 0;
  assert.equal((await run('/prompts/admit', 'POST')).status, 401);
  assert.equal((await run('/prompts/admit', 'POST', 'not-a-jwt')).status, 401);
  assert.equal((await run('/prompts/admit', 'POST', await jwt({ exp: now() - 100 }))).status, 401);
  assert.equal((await run('/prompts/admit', 'POST', await jwt({ aud: 'malicious-app' }))).status, 401);
  const signed = await jwt();
  assert.equal((await run('/prompts/admit', 'POST', signed.slice(0, -8) + 'invalidx')).status, 401);
  assert.equal(calls.length, 0);
});

test('signed Google credentials without verified email never reach JussPay', async () => {
  calls.length = 0;
  upstream = [{ product: 'promptos', entitlements: ['promptos.personal_prompts'], until: now() + 1000 }];
  for (const claims of [
    { email_verified: false }, { email_verified: undefined }, { email_verified: 'false' },
    { email_verified: 1 }, { email: undefined }, { email: '' }
  ]) {
    const token = await jwt(claims);
    assert.equal((await run('/prompts/admit', 'POST', token)).status, 401);
    assert.equal((await run('/billing/entitlement', 'GET', token)).status, 401);
  }
  assert.equal(calls.length, 0);
  assert.equal((await run('/prompts/admit', 'POST', await jwt({ email_verified: 'true' }))).status, 200);
});

test('free user and other product subscriptions cannot save personal prompts', async () => {
  const token = await jwt();
  upstream = [];
  assert.equal((await run('/prompts/admit', 'POST', token)).status, 402);
  assert.deepEqual(await (await run('/billing/entitlement', 'GET', token)).json(), { paid: false });
  upstream = [{ product: 'thinktank', entitlements: ['promptos.personal_prompts'], until: now() + 1000 }];
  assert.equal((await run('/prompts/admit', 'POST', token)).status, 402);
  upstream = [{ product: 'promptos', entitlements: ['read_library'], until: now() + 1000 }];
  assert.equal((await run('/prompts/admit', 'POST', token)).status, 402);
  upstream = [{ product: 'promptos', entitlements: ['promptos.personal_prompts'], until: now() - 10 }];
  assert.equal((await run('/prompts/admit', 'POST', token)).status, 402);
});

test('verified Google bearer is forwarded to the private JussPay binding for its own subject check', async () => {
  const token = await jwt();
  calls.length = 0;
  upstream = [{ product: 'promptos', entitlements: ['promptos.personal_prompts'], until: now() + 1000 }];
  assert.deepEqual(await (await run('/billing/entitlement', 'GET', token)).json(), { paid: true });
  const admitted = await run('/prompts/admit', 'POST', token);
  assert.equal(admitted.status, 200);
  assert.deepEqual(await admitted.json(), { admitted: true, persistence: 'session-only', subject: 'https://accounts.google.com#user-123' });
  assert.equal(calls.length, 2);
  assert.deepEqual(calls.map(v => v.url), ['https://jusspay.internal/entitlements', 'https://jusspay.internal/entitlements']);
  assert(calls.every(v => v.method === 'GET' && v.auth === 'Bearer ' + token));
});

test('JussPay auth failures, provider outage and malformed data fail closed', async () => {
  const token = await jwt();
  for (const response of ['unauthorized', 'outage', 'invalid']) {
    upstream = response;
    assert.equal((await run('/prompts/admit', 'POST', token)).status, 503);
    assert.equal((await run('/billing/entitlement', 'GET', token)).status, 503);
  }
});

test('$1 checkout and webhook cannot bypass the JussPay commerce authority', async () => {
  const token = await jwt();
  calls.length = 0;
  assert.equal((await run('/billing/checkout', 'POST', token)).status, 503);
  assert.equal((await run('/billing/webhook', 'POST', token)).status, 404);
  assert.equal((await run('/billing/checkout', 'GET', token)).status, 405);
  assert.equal(calls.length, 0);
});

test('PromptOS Worker declares a private JussPay service binding for premium access',()=>{
  const config=JSON.parse(readFileSync(new URL('../wrangler.provider.jsonc',import.meta.url),'utf8'));
  assert(config.services.some(s=>s.binding==='PROMPTOS_JUSSPAY'&&s.service==='jusspay'));
  assert.equal(config.secrets.required.includes('PROMPTOS_STRIPE_SECRET_KEY'),false);
  assert.equal(config.secrets.required.includes('PROMPTOS_AI_OPERATOR_KEY'),true);
});

test.after(() => { globalThis.fetch = oldFetch; });

test('billing CORS admits only exact PromptOS origins and never bypasses authentication', async () => {
  for (const origin of ['https://promptos.jussco.company', 'https://promptos.foundercontrolroom.org', 'https://jussray.github.io']) {
    const url = 'https://promptos.example/billing/entitlement';
    const preflight = await worker.fetch(new Request(url, { method: 'OPTIONS', headers: {
      Origin: origin, 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'authorization'
    } }), env);
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), origin);
    assert.equal(preflight.headers.get('Vary'), 'Origin');
    assert.equal(preflight.headers.get('Access-Control-Allow-Credentials'), null);
    const response = await worker.fetch(new Request(url, { headers: { Origin: origin } }), env);
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
    assert.equal(response.headers.get('Vary'), 'Origin');
  }
  for (const origin of ['https://promptos.jussco.company.evil.example', 'https://evil.example', 'null', 'http://promptos.jussco.company']) {
    for (const method of ['OPTIONS', 'GET']) {
      const response = await worker.fetch(new Request('https://promptos.example/billing/entitlement', { method, headers: { Origin: origin } }), env);
      assert.equal(response.status, 403);
      assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
    }
  }
  const server = await worker.fetch(new Request('https://promptos.example/billing/entitlement'), env);
  assert.equal(server.status, 401);
  assert.equal(server.headers.get('Access-Control-Allow-Origin'), null);
  const operator = await worker.fetch(new Request('https://promptos.example/runtime-identity', { method: 'OPTIONS', headers: { Origin: 'https://promptos.jussco.company' } }), env);
  assert.equal(operator.headers.get('Access-Control-Allow-Origin'), 'https://jussray.github.io');
});

test('sandbox billing requires verified identity, explicit current terms and a matching JussPay receipt', async () => {
  const token = await jwt();
  const termsUrl = 'https://merchant.example/terms';
  const row = {id:'promptos', purchaseStatus:'requires_provider_validation', offerConfigured:true,
    currency:'usd',interval:'month',unitAmount:999,termsUrl,entitlements:['promptos.personal_prompts'],
    introOffer:{approved:true,billingMode:'test',firstInvoiceAmountMinor:100,renewalAmountMinor:999,renewalInterval:'month'}};
  const receipt = {billingMode:'test',currency:'usd',interval:'month',termsUrl,firstInvoiceAmountMinor:100,
    renewalAmountMinor:999,url:'https://checkout.stripe.com/c/test_fixture'};
  const consent = {acceptsTerms:true,acceptsAutomaticRenewal:true,firstInvoiceAmountMinor:100,
    renewalAmountMinor:999,interval:'month',termsUrl};
  const requests = [];
  let catalog = row, checkoutReceipt = receipt;
  const config = {PROMPTOS_INTRO_SANDBOX_ENABLED:'true',PROMPTOS_JUSSPAY:{fetch:async request => {
    const path = new URL(request.url).pathname;
    requests.push({path, auth:request.headers.get('Authorization'), body:path==='/checkout'?await request.json():null});
    return Response.json(path==='/catalog'?[catalog]:checkoutReceipt);
  }}};
  const call = (path, method, credential, body, settings=config) => handlePromptPaywall(
    new Request('https://promptos.example'+path, {method,headers:{
      ...(credential?{Authorization:'Bearer '+credential}:{}),...(body?{'Content-Type':'application/json'}:{})},
      ...(body?{body:JSON.stringify(body)}:{})}),settings,path,{});
  assert.equal((await call('/billing/offer','GET',token,null,{})).status,503);
  assert.equal((await call('/billing/offer','GET',null)).status,401);
  assert.equal(requests.length,0);
  const offer = await call('/billing/offer','GET',token);
  assert.equal(offer.status,200);
  assert.equal((await offer.json()).offer.renewalAmountMinor,999);
  for (const invalid of [{...consent,acceptsAutomaticRenewal:false},{...consent,renewalAmountMinor:1},{...consent,termsUrl:'https://evil.example'}]) {
    assert.equal((await call('/billing/checkout','POST',token,invalid)).status,409);
  }
  assert.equal(requests.filter(r=>r.path==='/checkout').length,0);
  // A valid-looking offer for any amount other than the approved renewal must fail closed.
  for (const amount of [998, 1000, 1900]) {
    catalog={...row,unitAmount:amount,introOffer:{...row.introOffer,renewalAmountMinor:amount}};
    assert.equal((await call('/billing/offer','GET',token)).status,503);
    assert.equal((await call('/billing/checkout','POST',token,{...consent,renewalAmountMinor:amount})).status,503);
  }
  catalog={...row,introOffer:{...row.introOffer,billingMode:'live'}};
  assert.equal((await call('/billing/checkout','POST',token,consent)).status,503);
  assert.equal(requests.filter(r=>r.path==='/checkout').length,0);
  catalog=row;
  const checkout = await call('/billing/checkout','POST',token,{...consent,product:'other',priceId:'attacker'});
  assert.equal(checkout.status,200);
  const body=await checkout.json();
  assert.equal(body.billingMode,'test');
  assert.equal(body.url,receipt.url);
  assert.equal(body.paid,undefined);
  const forwarded=requests.at(-1);
  assert.equal(forwarded.auth,'Bearer '+token);
  assert.deepEqual(forwarded.body,{product:'promptos',introConsent:consent});
  for (const bad of [{...receipt,billingMode:'live'},{...receipt,renewalAmountMinor:1},{...receipt,url:'https://checkout.stripe.com.evil.example/c/test'},{...receipt,url:'https://user@checkout.stripe.com/c/test'}]) {
    checkoutReceipt=bad;
    assert.equal((await call('/billing/checkout','POST',token,consent)).status,503);
  }
});

test('private library route denies anonymous, unpaid and unconfigured storage requests', async () => {
  const token = await jwt();
  upstream = [];
  assert.equal((await run('/prompts/library','GET')).status,401);
  assert.equal((await run('/prompts/library','GET',token)).status,402);
  upstream = [{product:'promptos',entitlements:['promptos.personal_prompts'],until:now()+1000}];
  assert.equal((await run('/prompts/library','GET',token)).status,503);
});
test('library reads and writes are scoped to the verified subject and fail closed on conflicts', async () => {
  const token = await jwt();
  const other = await jwt({sub:'user-456'});
  upstream = [{product:'promptos',entitlements:['promptos.personal_prompts'],until:now()+1000}];
  const stored = new Map();
  const calls = [];
  const config = {...env,PROMPTOS_LIBRARY_STORE:{async fetch(req) {
    const data = req.method==='POST'?await req.json():null;
    const subject = req.headers.get('X-PromptOS-Subject');
    calls.push({subject,auth:req.headers.get('Authorization'),data,url:req.url});
    const row = stored.get(subject)||{revision:0,prompts:[]};
    if (req.method==='GET') return Response.json(row);
    if (data.revision!==row.revision) return Response.json({error:'revision conflict'},{status:409});
    const next={revision:row.revision+1,prompts:data.prompts};
    stored.set(subject,next);
    return Response.json(next);
  }}};
  const call=(method,credential,body)=>worker.fetch(new Request('https://promptos.example/prompts/library',{
    method,headers:{Authorization:'Bearer '+credential,'Content-Type':'application/json','X-PromptOS-Subject':'forged'},
    ...(body===undefined?{}:{body:JSON.stringify(body)})}),config);
  const prompt={id:'c_123',title:'Test prompt',sub:'',cat:'custom',platforms:['chatgpt'],body:'Keep this',ts:1,emoji:'✨'};
  assert.deepEqual(await (await call('GET',token)).json(),{revision:0,prompts:[]});
  const saved=await call('POST',token,{revision:0,prompts:[prompt]});
  assert.equal(saved.status,200);
  assert.deepEqual(await saved.json(),{revision:1,prompts:[prompt]});
  assert.deepEqual(await (await call('GET',token)).json(),{revision:1,prompts:[prompt]});
  assert.deepEqual(await (await call('GET',other)).json(),{revision:0,prompts:[]});
  assert.equal((await call('POST',token,{revision:0,prompts:[]})).status,409);
  const count=calls.length;
  assert.equal((await call('POST',token,{revision:1,prompts:[prompt],subject:'https://accounts.google.com#user-456'})).status,400);
  assert.equal((await call('POST',token,{revision:1,prompts:[{...prompt,id:'bad"id'}]})).status,400);
  assert.equal(calls.length,count);
  assert.equal(calls[0].subject,'https://accounts.google.com#user-123');
  assert.equal(calls[0].auth,'Bearer '+token);
  assert.equal(calls[0].url,'https://promptos-library.internal/v1/library');
  upstream=[];
  assert.equal((await call('GET',token)).status,402);
});
