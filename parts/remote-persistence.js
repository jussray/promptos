/* PromptOS staged remote persistence adapter.
   This file is intentionally NOT loaded by index.html.
   Founder Control Room remains canonical runtime persistence authority.
*/
(function(){
'use strict';

var REMOTE_SCHEMA_VERSION = 1;
var SOURCE_SHA_RE = /^[0-9a-f]{40}$/;

function fail(message){
  throw new Error('PromptOS remote persistence: ' + message);
}

function normalizeEndpoint(raw){
  var url;
  try { url = new URL(raw); }
  catch(e) { fail('endpoint must be a valid URL'); }
  if (url.protocol !== 'https:') fail('endpoint must use HTTPS');
  if (url.username || url.password || url.search || url.hash) fail('endpoint may not contain credentials, query, or fragment');
  url.pathname = url.pathname.replace(/\/+$/, '');
  return url;
}

function validateStateForRemote(state){
  if (!state || typeof state !== 'object' || Array.isArray(state)) fail('state must be an object');
  if (state.schemaVersion !== REMOTE_SCHEMA_VERSION) fail('remote state must use schemaVersion 1');
  if (typeof window.__promptosValidateImport !== 'function') fail('browser import validator is unavailable');
  var text = JSON.stringify(state);
  var validated = window.__promptosValidateImport(text);
  if (validated.schemaVersion !== REMOTE_SCHEMA_VERSION) fail('browser validator did not confirm schemaVersion 1');
  return {text:text, normalized:validated.state};
}

function createAdapter(options){
  options = options || {};
  var endpoint = normalizeEndpoint(options.endpoint || '');
  var request = options.fetchImpl || window.fetch.bind(window);
  var getAuthorizationHeader = options.getAuthorizationHeader;
  if (typeof request !== 'function') fail('fetch implementation is unavailable');
  if (typeof getAuthorizationHeader !== 'function') fail('getAuthorizationHeader callback is required');

  async function authorizationHeader(){
    var value = await getAuthorizationHeader();
    if (typeof value !== 'string' || !/^Bearer\s+\S+$/.test(value)) fail('authorization callback must return a Bearer header');
    return value;
  }

  async function pull(){
    var response = await request(new URL(endpoint.pathname + '/state', endpoint), {
      method:'GET',
      headers:{
        'Accept':'application/json',
        'Authorization':await authorizationHeader()
      },
      cache:'no-store',
      credentials:'omit'
    });
    if (!response.ok) fail('pull failed with status ' + response.status);
    var envelope = await response.json();
    if (!envelope || typeof envelope !== 'object') fail('pull envelope must be an object');
    var etag = response.headers.get('etag');
    if (!etag) fail('pull response omitted ETag');
    if (envelope.state === null && envelope.revision === 0) {
      return Object.freeze({state:null, normalizedState:null, etag:etag, revision:0, fingerprint:null, sourceSha:null});
    }
    var validated = validateStateForRemote(envelope.state);
    if (!Number.isSafeInteger(envelope.revision) || envelope.revision < 1) fail('pull revision is invalid');
    if (typeof envelope.fingerprint !== 'string' || !/^[0-9a-f]{64}$/.test(envelope.fingerprint)) fail('pull fingerprint is invalid');
    if (typeof envelope.sourceSha !== 'string' || !SOURCE_SHA_RE.test(envelope.sourceSha)) fail('pull source SHA is invalid');
    return Object.freeze({
      state:envelope.state,
      normalizedState:validated.normalized,
      etag:etag,
      revision:envelope.revision,
      fingerprint:envelope.fingerprint,
      sourceSha:envelope.sourceSha
    });
  }

  async function push(input){
    input = input || {};
    if (typeof input.etag !== 'string' || input.etag.length < 3) fail('push requires the current ETag');
    if (typeof input.sourceSha !== 'string' || !SOURCE_SHA_RE.test(input.sourceSha)) fail('push requires an exact lowercase 40-character source SHA');
    var validated = validateStateForRemote(input.state);
    var response = await request(new URL(endpoint.pathname + '/state', endpoint), {
      method:'PUT',
      headers:{
        'Accept':'application/json',
        'Content-Type':'application/json',
        'Authorization':await authorizationHeader(),
        'If-Match':input.etag,
        'X-PromptOS-Source-Sha':input.sourceSha
      },
      body:validated.text,
      cache:'no-store',
      credentials:'omit'
    });
    if (response.status === 412) fail('state conflict: remote ETag changed; pull and review before retrying');
    if (response.status === 428) fail('remote rejected write without a precondition');
    if (!response.ok) fail('push failed with status ' + response.status);
    var envelope = await response.json();
    var etag = response.headers.get('etag');
    if (!etag) fail('push response omitted ETag');
    return Object.freeze({
      etag:etag,
      revision:envelope.revision,
      fingerprint:envelope.fingerprint,
      sourceSha:envelope.sourceSha
    });
  }

  return Object.freeze({pull:pull, push:push});
}

window.__PROMPTOS_REMOTE_PERSISTENCE__ = Object.freeze({
  contractVersion:'promptos-remote-persistence-v1',
  enabledByDefault:false,
  canonicalAuthority:'Founder Control Room',
  runtimePersistence:'staged-not-connected',
  credentialStorage:'memory-only-callback',
  automaticMerge:false,
  automaticRetry:false,
  createAdapter:createAdapter
});
})();
