import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {readFileSync} from 'node:fs';
import worker,{PromptLibraryAccount} from './library-store.mjs';

const c=globalThis.crypto||webcrypto;
const {privateKey,publicKey}=await c.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk=await c.subtle.exportKey('jwk',publicKey);jwk.kid='library-test';jwk.alg='RS256';
const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
const now=()=>Math.floor(Date.now()/1000);
async function token(sub,extra={}){
  const value=encode({alg:'RS256',kid:jwk.kid})+'.'+encode({iss:'https://accounts.google.com',aud:'fixture-audience',sub,email:'fixture@example.invalid',email_verified:true,exp:now()+300,...extra});
  return value+'.'+Buffer.from(await c.subtle.sign('RSASSA-PKCS1-v1_5',privateKey,new TextEncoder().encode(value))).toString('base64url');
}
const originalFetch=globalThis.fetch;
globalThis.fetch=async url=>{assert.equal(String(url),'https://www.googleapis.com/oauth2/v3/certs');return Response.json({keys:[jwk]});};
test.after(()=>{globalThis.fetch=originalFetch;});

// In-memory transactional storage fixture, NOT Cloudflare runtime evidence.
function fixture(){
  const accounts=new Map();let paid=true, authOutage=false;
  const env={PROMPTOS_LIBRARY_STORE_ENABLED:'true',PROMPTOS_GOOGLE_CLIENT_ID:'fixture-audience',
    PROMPTOS_JUSSPAY:{async fetch(req){
      assert.equal(req.url,'https://jusspay.internal/entitlements');
      assert.match(req.headers.get('Authorization'),/^Bearer /);
      if(authOutage) return new Response(null,{status:503});
      return Response.json({entitlements:paid?[{product:'promptos',entitlements:['promptos.personal_prompts'],until:now()+300}]:[]});
    }},
    LIBRARY_ACCOUNTS:{idFromName:name=>name,get(id){
      if(!accounts.has(id)){
        let value;let tail=Promise.resolve();
        const storage={get:async()=>structuredClone(value),put:async(_,v)=>{value=structuredClone(v);},
          transaction(fn){const next=tail.then(()=>fn(storage));tail=next.catch(()=>{});return next;}};
        accounts.set(id,{storage});
      }
      return {fetch:req=>new PromptLibraryAccount({storage:accounts.get(id).storage},env).fetch(req)};
    }}};
  return {env,accounts,setPaid:v=>paid=v,setOutage:v=>authOutage=v};
}
const subject=s=>'https://accounts.google.com#'+s;
const prompt={id:'c_a',title:'Example',sub:'',cat:'custom',platforms:['chatgpt'],body:'Fixture only',ts:1,emoji:'✨'};
const request=(method,bearer,owner,data,url='https://promptos-library.internal/v1/library')=>new Request(url,{method,headers:{...(bearer?{Authorization:'Bearer '+bearer}:{}),...(owner?{'X-PromptOS-Subject':owner}:{}),...(data!==undefined?{'Content-Type':'application/json'}:{})},...(data!==undefined?{body:JSON.stringify(data)}:{})});

test('private store is disabled by default, has no public route, and rejects forged owner selection',async()=>{
  const f=fixture();const a=await token('a');
  assert.equal((await worker.fetch(request('GET',a,subject('a')),{...f.env,PROMPTOS_LIBRARY_STORE_ENABLED:'false'})).status,503);
  assert.equal((await worker.fetch(request('GET',a,subject('a'),undefined,'https://public.example/v1/library'),f.env)).status,404);
  assert.equal((await worker.fetch(request('GET',null,subject('a')),f.env)).status,401);
  assert.equal((await worker.fetch(request('GET',a,subject('b')),f.env)).status,403);
  assert.equal((await worker.fetch(request('GET',await token('a',{exp:now()-1}),subject('a')),f.env)).status,401);
  assert.equal(f.accounts.size,0);
});
test('storage rechecks entitlement and denies provider failure before accessing account data',async()=>{
  const f=fixture();const a=await token('a');f.setPaid(false);
  assert.equal((await worker.fetch(request('GET',a,subject('a')),f.env)).status,402);
  f.setOutage(true);
  assert.equal((await worker.fetch(request('GET',a,subject('a')),f.env)).status,503);
  assert.equal(f.accounts.size,0);
});
test('account data survives object recreation, isolates users and atomically rejects competing revisions',async()=>{
  const f=fixture();const a=await token('a'),b=await token('b');
  const get=(t,s)=>worker.fetch(request('GET',t,subject(s)),f.env);
  const put=(t,s,data)=>worker.fetch(request('POST',t,subject(s),data),f.env);
  assert.deepEqual(await (await get(a,'a')).json(),{subject:subject('a'),revision:0,prompts:[]});
  const attempts=await Promise.all([put(a,'a',{revision:0,prompts:[prompt]}),put(a,'a',{revision:0,prompts:[{...prompt,title:'Other'}]})]);
  assert.deepEqual(attempts.map(x=>x.status).sort(),[200,409]);
  const saved=await (await get(a,'a')).json();
  assert.equal(saved.revision,1);assert.equal(saved.prompts.length,1);
  assert.deepEqual(await (await get(b,'b')).json(),{subject:subject('b'),revision:0,prompts:[]});
  assert.equal((await put(a,'a',{revision:1,prompts:[prompt,prompt]})).status,400);
  assert.deepEqual(await (await get(a,'a')).json(),saved);
});
test('candidate configuration has no public routes, production binding or enabled storage flag',()=>{
  const config=JSON.parse(readFileSync(new URL('../wrangler.library-store.candidate.jsonc',import.meta.url),'utf8'));
  assert.equal(config.workers_dev,false);assert.equal(config.preview_urls,false);
  assert.equal(config.routes.length,0);
  assert.equal(config.vars.PROMPTOS_LIBRARY_STORE_ENABLED,'false');
  assert(config.services.every(s=>s.service.endsWith('-sandbox')));
  const provider=JSON.parse(readFileSync(new URL('../wrangler.provider.jsonc',import.meta.url),'utf8'));
  assert(!provider.services.some(s=>s.binding==='PROMPTOS_LIBRARY_STORE'));
});
