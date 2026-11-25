/*
 * PromptOS paid admission, governed by JussPay (not a second Stripe merchant).
 * Public pages and the curated catalog remain free. This Worker validates the
 * Google caller and asks JussPay, using a private Cloudflare service binding,
 * for the caller's own paid personal-prompt entitlement.
 *
 * JussPay AUTH must independently validate the same visitor token for the
 * jusspay audience and stable subject. No client "paid" flag, session return
 * URL, Stripe secret, product price, or browser-controlled entitlement is used.
 * Checkout is intentionally unavailable until the $1 first-billing-period
 * contract is supported and verified in JussPay itself.
 */
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
const GOOGLE_KEYS = 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_AUDIENCE = '813638397474-6pibutsimcafimrcttq7idnmugsin01c.apps.googleusercontent.com';
const PERSONAL_PROMPTS_PERMISSION = 'promptos.personal_prompts';
const enc = new TextEncoder();

function reply(value, status, headers) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}
function decode64(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('invalid token');
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}
function text64(value) { return new TextDecoder().decode(decode64(value)); }

async function verifyIdentity(request, env) {
  const bearer = (request.headers.get('Authorization') || '').match(/^Bearer\s+(\S+)$/i);
  if (!bearer || bearer[1].length > 8192) return false;
  try {
    const parts = bearer[1].split('.');
    if (parts.length !== 3) return false;
    const header = JSON.parse(text64(parts[0]));
    const claims = JSON.parse(text64(parts[1]));
    if (header.alg !== 'RS256' || !header.kid || typeof claims.sub !== 'string' || !claims.sub) return false;
    const now = Math.floor(Date.now() / 1000);
    const audience = env.PROMPTOS_GOOGLE_CLIENT_ID || GOOGLE_AUDIENCE;
    if (!GOOGLE_ISSUERS.includes(claims.iss) || claims.aud !== audience ||
        typeof claims.email !== 'string' || !claims.email.trim() ||
        (claims.email_verified !== true && claims.email_verified !== 'true') ||
        !Number.isInteger(claims.exp) || claims.exp <= now ||
        (claims.iat && claims.iat > now + 60) ||
        (claims.nbf && claims.nbf > now)) return false;
    const response = await fetch(GOOGLE_KEYS);
    if (!response.ok) return false;
    const keys = await response.json();
    const jwk = keys.keys?.find(k => k.kid === header.kid && k.kty === 'RSA' && (!k.alg || k.alg === 'RS256'));
    if (!jwk) return false;
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    return await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decode64(parts[2]), enc.encode(parts[0] + '.' + parts[1]));
  } catch { return false; }
}

async function eligibleInJussPay(request, env) {
  if (!env.PROMPTOS_JUSSPAY || typeof env.PROMPTOS_JUSSPAY.fetch !== 'function') {
    throw new Error('JussPay binding unavailable');
  }
  // This fixed internal URL cannot be influenced by the caller or the browser.
  const upstream = await env.PROMPTOS_JUSSPAY.fetch(new Request('https://jusspay.internal/entitlements', {
    method: 'GET',
    headers: { Authorization: request.headers.get('Authorization') },
  }));
  if (!upstream.ok) throw new Error('JussPay identity or entitlement unavailable');
  const data = await upstream.json();
  if (!Array.isArray(data?.entitlements)) throw new Error('invalid JussPay entitlement response');
  const now = Math.floor(Date.now() / 1000);
  return data.entitlements.some(row =>
    row && row.product === 'promptos' && Number.isSafeInteger(row.until) && row.until > now &&
    Array.isArray(row.entitlements) && row.entitlements.includes(PERSONAL_PROMPTS_PERMISSION)
  );
}

export async function handlePromptPaywall(request, env, pathname, corsHeaders) {
  const method = request.method.toUpperCase();
  const replyJson = (value, status) => reply(value, status, corsHeaders);
  if (!['/billing/entitlement', '/billing/checkout', '/prompts/admit'].includes(pathname)) {
    return replyJson({ error: 'not found' }, 404);
  }
  const expected = pathname === '/billing/entitlement' ? 'GET' : 'POST';
  if (method !== expected) return replyJson({ error: 'method not allowed' }, 405);
  if (pathname === '/billing/checkout') {
    // Do not bypass JussPay with a product-specific Stripe Checkout link.
    // $1 first invoice + product-specific renewal must be verified in JussPay.
    return replyJson({ error: 'introductory checkout not yet verified in JussPay' }, 503);
  }
  if (!env.PROMPTOS_JUSSPAY?.fetch) return replyJson({ error: 'billing unavailable', paid: false }, 503);
  if (!(await verifyIdentity(request, env))) return replyJson({ error: 'sign in required', paid: false }, 401);
  try {
    const paid = await eligibleInJussPay(request, env);
    if (pathname === '/billing/entitlement') return replyJson({ paid }, 200);
    return paid
      ? replyJson({ admitted: true, persistence: 'session-only' }, 200)
      : replyJson({ error: 'paid account required' }, 402);
  } catch {
    return replyJson({ error: 'JussPay verification unavailable', paid: false }, 503);
  }
}
