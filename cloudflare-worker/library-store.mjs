// Candidate private storage service. No public route or production binding is configured.
import {verifyIdentity,eligibleInJussPay} from './prompt-paywall.js';
import {validLibrary,limitedJson} from './private-library.mjs';

const SERVICE_URL='https://promptos-library.internal/v1/library';
const ACCOUNT_URL='https://promptos-library-account.internal/v1/library';
const OWNER_HEADER='X-PromptOS-Subject';
const SUBJECT=/^https:\/\/accounts\.google\.com#[A-Za-z0-9_-]{1,128}$/;
const RECORD_KEY='library-v1';
const response=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const validMethod=m=>m==='GET'||m==='POST';

function ownedRecord(row,subject){
  if(row===undefined) return {subject,revision:0,prompts:[]};
  if(!row||row.subject!==subject||!validLibrary({revision:row.revision,prompts:row.prompts})) throw new Error('invalid stored state');
  return row;
}

export class PromptLibraryAccount {
  constructor(ctx,env){this.storage=ctx.storage;}
  async fetch(request){
    if(request.url!==ACCOUNT_URL) return response({error:'not found'},404);
    if(!validMethod(request.method)) return response({error:'method not allowed'},405);
    const subject=request.headers.get(OWNER_HEADER);
    if(!SUBJECT.test(subject||'')) return response({error:'invalid owner'},403);
    let input;
    if(request.method==='POST'){
      try {input=await limitedJson(request);}catch{return response({error:'invalid library'},400);}
      if(!validLibrary(input)) return response({error:'invalid library'},400);
    }
    try{
      if(request.method==='GET') return response(ownedRecord(await this.storage.get(RECORD_KEY),subject));
      return await this.storage.transaction(async tx=>{
        const row=ownedRecord(await tx.get(RECORD_KEY),subject);
        if(input.revision!==row.revision) return response({error:'library revision conflict'},409);
        const next={subject,revision:row.revision+1,prompts:input.prompts};
        if(!validLibrary({revision:next.revision,prompts:next.prompts})) return response({error:'revision limit'},409);
        await tx.put(RECORD_KEY,next);
        return response(next);
      });
    }catch{return response({error:'account storage unavailable'},503);}
  }
}

export default {
  async fetch(request,env){
    if(request.url!==SERVICE_URL) return response({error:'not found'},404);
    if(!validMethod(request.method)) return response({error:'method not allowed'},405);
    if(env.PROMPTOS_LIBRARY_STORE_ENABLED!=='true'||!env.LIBRARY_ACCOUNTS||!env.PROMPTOS_JUSSPAY?.fetch) return response({error:'account storage unavailable'},503);
    const subject=await verifyIdentity(request,env);
    if(!subject||!SUBJECT.test(subject)) return response({error:'sign in required'},401);
    if(request.headers.get(OWNER_HEADER)!==subject) return response({error:'invalid owner'},403);
    try{
      if(!await eligibleInJussPay(request,env)) return response({error:'paid account required'},402);
    }catch{return response({error:'billing verification unavailable'},503);}
    let input;
    if(request.method==='POST'){
      try{input=await limitedJson(request);}catch{return response({error:'invalid library'},400);}
      if(!validLibrary(input)) return response({error:'invalid library'},400);
    }
    try{
      const id=env.LIBRARY_ACCOUNTS.idFromName('promptos-library-v1:'+subject);
      const stub=env.LIBRARY_ACCOUNTS.get(id);
      return await stub.fetch(new Request(ACCOUNT_URL,{method:request.method,
        headers:{[OWNER_HEADER]:subject,...(input?{'Content-Type':'application/json'}:{})},
        ...(input?{body:JSON.stringify(input)}:{}),redirect:'error'}));
    }catch{return response({error:'account storage unavailable'},503);}
  }
};
