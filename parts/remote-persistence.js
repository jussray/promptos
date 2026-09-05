/* PromptOS staged remote persistence adapter.
   This file is intentionally NOT loaded by index.html.
   Founder Control Room remains canonical runtime persistence authority.
*/
(function(){
'use strict';

var REMOTE_SCHEMA_VERSION = 1;
var SOURCE_SHA_RE = /^[0-9a-f]{40}$/;
var FINGERPRINT_RE = /^[0-9a-f]{64}$/;

function fail(message){
  throw new Error('PromptOS remote persistence: ' + message);
}

function normalizeEndpoint(raw){
  var url;
  try { url = new URL(raw); }
  catch(e) { fail('endpoint must be a valid URL'); }
  if (url.protocol !== 'https:') fail('endpoint must use HTTPS');
  if (url.username || url.password || url.search || url.hash) fail('endpoint may not contain credentials, query, or fragment');
  url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  return url;
}

function stateEndpoint(endpoint){
  var url = new URL(endpoint.href);
  var basePath = url.pathname.replace(/\/+$/, '');
  url.pathname = basePath + '/state';
  if (url.origin !== endpoint.origin) fail('state endpoint escaped configured origin');
  return url;
}

function canonicalize(value){
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    var normalized = {};
    Object.keys(value).sort().forEach(function(key){ normalized[key] = canonicalize(value[key]); });
    return normalized;
  }
  return value;
}

async function sha256HexText(value){
  if (!window.crypto || !window.crypto.subtle) fail('Web Crypto is unavailable');
  var bytes = new TextEncoder().encode(value);
  var digest = await window.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(function(byte){ return byte.toString(16).padStart(2, '0'); }).join('');
}

async function stateFingerprint(state){
  return sha256HexText(JSON.stringify(canonicalize(state)));
}

function expectedEtag(revision, fingerprint){
  return '"promptos-v' + revision + '-' + fingerprint + '"';
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

function validateReceiptShape(envelope){
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) fail('receipt envelope must be an object');
  if (!Number.isSafeInteger(envelope.revision) || envelope.revision < 1) fail('receipt revision is invalid');
  if (typeof envelope.fingerprint !== 'string' || !FINGERPRINT_RE.test(envelope.fingerprint)) fail('receipt fingerprint is invalid');
  if (typeof envelope.sourceSha !== 'string' || !SOURCE_SHA_RE.test(envelope.sourceSha)) fail('receipt source SHA is invalid');
}

function createAdapter(options){
  options = options || {};
  var endpoint = normalizeEndpoint(options.endpoint || '');
  var stateUrl = stateEndpoint(endpoint);
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
    var response = await request(stateUrl, {
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
    if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) fail('pull envelope must be an object');
    var etag = response.headers.get('etag');
    if (!etag) fail('pull response omitted ETag');
    if (envelope.state === null && envelope.revision === 0) {
      if (envelope.fingerprint !== null || envelope.sourceSha !== null) fail('empty pull receipt is inconsistent');
      if (etag !== '"promptos-v0-empty"') fail('empty pull ETag is inconsistent');
      return Object.freeze({state:null, normalizedState:null, etag:etag, revision:0, fingerprint:null, sourceSha:null});
    }
    var validated = validateStateForRemote(envelope.state);
    validateReceiptShape(envelope);
    var fingerprint = await stateFingerprint(validated.normalized);
    if (fingerprint !== envelope.fingerprint) fail('pull fingerprint mismatch');
    if (etag !== expectedEtag(envelope.revision, envelope.fingerprint)) fail('pull ETag does not bind receipt revision and fingerprint');
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
    var expectedFingerprint = await stateFingerprint(validated.normalized);
    var response = await request(stateUrl, {
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
    validateReceiptShape(envelope);
    var etag = response.headers.get('etag');
    if (!etag) fail('push response omitted ETag');
    if (envelope.fingerprint !== expectedFingerprint) fail('push receipt fingerprint mismatch');
    if (envelope.sourceSha !== input.sourceSha) fail('push receipt source SHA mismatch');
    if (etag !== expectedEtag(envelope.revision, envelope.fingerprint)) fail('push ETag does not bind receipt revision and fingerprint');
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
