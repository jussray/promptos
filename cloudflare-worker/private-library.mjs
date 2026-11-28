// Candidate private account-library bridge. No backing service is provisioned here.
// The receiving private service must independently verify the bearer and subject,
// enforce per-account storage and atomically compare revisions.
const MAX_BYTES = 1024 * 1024;
const MAX_PROMPTS = 200;
const STORE_URL = 'https://promptos-library.internal/v1/library';
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const hasOnly = (value, keys) => isObject(value) && Object.keys(value).every(key => keys.includes(key));
const bounded = (value, limit, required = false) => typeof value === 'string' && value.length <= limit && (!required || value.trim().length > 0);

function validPrompt(p) {
  return hasOnly(p,['id','title','sub','cat','platforms','body','ts','emoji']) &&
    typeof p.id === 'string' && /^c_[A-Za-z0-9_-]{1,80}$/.test(p.id) &&
    bounded(p.title,200,true) && bounded(p.sub,500) && bounded(p.cat,80,true) &&
    bounded(p.body,20000,true) && bounded(p.emoji,32) &&
    Array.isArray(p.platforms) && p.platforms.length <= 20 &&
    p.platforms.every(value => bounded(value,40,true)) &&
    Number.isSafeInteger(p.ts) && p.ts >= 0;
}
function validLibrary(value) {
  return hasOnly(value,['revision','prompts']) && Number.isSafeInteger(value.revision) &&
    value.revision >= 0 && value.revision < Number.MAX_SAFE_INTEGER &&
    Array.isArray(value.prompts) && value.prompts.length <= MAX_PROMPTS &&
    value.prompts.every(validPrompt) &&
    new Set(value.prompts.map(p => p.id)).size === value.prompts.length;
}
async function limitedJson(message) {
  if (!message.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) throw new Error('invalid content type');
  if (Number(message.headers.get('Content-Length')) > MAX_BYTES || !message.body) throw new Error('invalid length');
  const reader = message.body.getReader();
  const decoder = new TextDecoder('utf-8',{fatal:true});
  let length=0, text='';
  try {
    while (true) {
      const {done,value}=await reader.read();
      if (done) break;
      length+=value.byteLength;
      if (length>MAX_BYTES) { await reader.cancel(); throw new Error('too large'); }
      text+=decoder.decode(value,{stream:true});
    }
    text+=decoder.decode();
    return JSON.parse(text);
  } finally { reader.releaseLock(); }
}
export async function handlePrivateLibrary(request, env, subject, reply) {
  if (!env.PROMPTOS_LIBRARY_STORE?.fetch) return reply({error:'account storage unavailable'},503);
  let input;
  if (request.method === 'POST') {
    try { input=await limitedJson(request); } catch { return reply({error:'invalid library'},400); }
    if (!validLibrary(input)) return reply({error:'invalid library'},400);
  }
  try {
    const upstream=await env.PROMPTOS_LIBRARY_STORE.fetch(new Request(STORE_URL,{
      method:request.method,
      headers:{Authorization:request.headers.get('Authorization'),'X-PromptOS-Subject':subject,
        ...(input?{'Content-Type':'application/json'}:{})},
      ...(input?{body:JSON.stringify(input)}:{}),
      redirect:'error',
    }));
    if (upstream.status===409 && input) return reply({error:'library revision conflict'},409);
    if (!upstream.ok) return reply({error:'account storage unavailable'},503);
    const result=await limitedJson(upstream);
    if (!hasOnly(result,['subject','revision','prompts']) || result.subject!==subject) return reply({error:'account storage unavailable'},503);
    const library={revision:result.revision,prompts:result.prompts};
    if (!validLibrary(library) || (input && library.revision!==input.revision+1)) return reply({error:'account storage unavailable'},503);
    return reply(library,200);
  } catch { return reply({error:'account storage unavailable'},503); }
}
