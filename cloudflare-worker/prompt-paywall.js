/*
 * PromptOS paid custom-prompt admission.
 * An authenticated Google ID token is verified server-side. Stripe is the
 * live subscription authority. Never trust a browser "paid" flag.
 * This is an ADMISSION boundary for the existing session-only My Prompts UI;
 * it does not claim that FCR persistence is connected.
 */
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
const GOOGLE_KEYS = 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_AUDIENCE = '813638397474-6pibutsimcafimrcttq7idnmugsin01c.apps.googleusercontent.com';
const STRIPE_API = 'https://api.stripe.com/v1';
const enc = new TextEncoder();

function reply(value, status, headers) {
  return new Response(JSON.stringify(value), {
    status: status || 200,
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
  if (!bearer || bearer[1].length > 8192) return null;
  try {
    const parts = bearer[1].split('.');
    if (parts.length !== 3) return null;
    const header = JSON.parse(text64(parts[0]));
    const claims = JSON.parse(text64(parts[1]));
    if (header.alg !== 'RS256' || !header.kid || typeof claims.sub !== 'string' || !claims.sub) return null;
    const now = Math.floor(Date.now() / 1000);
    const audience = env.PROMPTOS_GOOGLE_CLIENT_ID || GOOGLE_AUDIENCE;
    if (!GOOGLE_ISSUERS.includes(claims.iss) || claims.aud !== audience ||
        !Number.isInteger(claims.exp) || claims.exp <= now ||
        (claims.iat && claims.iat > now + 60) ||
        (claims.nbf && claims.nbf > now)) return null;
    const response = await fetch(GOOGLE_KEYS);
    if (!response.ok) return null;
    const keys = await response.json();
    const jwk = keys.keys?.find(k => k.kid === header.kid && k.kty === 'RSA' && (!k.alg || k.alg === 'RS256'));
    if (!jwk) return null;
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const signed = enc.encode(parts[0] + '.' + parts[1]);
    if (!(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decode64(parts[2]), signed))) return null;
    return { sub: claims.sub, email: claims.email_verified === true ? claims.email : null };
  } catch {
    return null;
  }
}

async function stripeRequest(env, path, form) {
  const secret = env.PROMPTOS_STRIPE_SECRET_KEY;
  if (typeof secret !== 'string' || !secret.startsWith('sk_')) throw new Error('billing not configured');
  const response = await fetch(STRIPE_API + path, {
    method: form ? 'POST' : 'GET',
    headers: {
      Authorization: 'Bearer ' + secret,
      ...(form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {})
    },
    body: form ? new URLSearchParams(form).toString() : undefined
  });
  if (!response.ok) throw new Error('Stripe lookup failed');
  return response.json();
}

function configReady(env) {
  return !!(env.PROMPTOS_BILLING_KV &&
    env.PROMPTOS_STRIPE_SECRET_KEY &&
    env.PROMPTOS_STRIPE_PRICE_ID &&
    env.PROMPTOS_BILLING_SUCCESS_URL &&
    env.PROMPTOS_BILLING_CANCEL_URL);
}

function verifiedReturnUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !!u.hostname && !u.username && !u.password;
  } catch { return false; }
}

async function paidSubscription(env, sub) {
  const customer = await env.PROMPTOS_BILLING_KV.get('customer:' + sub);
  if (!customer || !/^cus_[A-Za-z0-9]+$/.test(customer)) return false;
  const subscriptions = await stripeRequest(env, '/subscriptions?customer=' +
    encodeURIComponent(customer) + '&status=all&limit=100');
  return Array.isArray(subscriptions.data) && subscriptions.data.some(s =>
    s.status === 'active' && Array.isArray(s.items?.data) &&
    s.items.data.some(item => item.price?.id === env.PROMPTOS_STRIPE_PRICE_ID)
  );
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a[i] ^ b[i];
  return mismatch === 0;
}

async function verifiedStripeEvent(request, env) {
  const secret = env.PROMPTOS_STRIPE_WEBHOOK_SECRET;
  const sig = request.headers.get('Stripe-Signature') || '';
  if (!secret || sig.length > 1000) return null;
  const t = sig.match(/(?:^|,)t=(\d+)(?:,|$)/)?.[1];
  const signatures = [...sig.matchAll(/(?:^|,)v1=([a-fA-F0-9]{64})(?=,|$)/g)].map(m => m[1]);
  if (!t || !signatures.length || Math.abs(Date.now() / 1000 - Number(t)) > 300) return null;
  const raw = await request.text();
  if (raw.length > 1000000) return null;
  const hmac = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', hmac, enc.encode(t + '.' + raw)));
  const valid = signatures.some(candidate => {
    const bytes = new Uint8Array(candidate.match(/.{2}/g).map(s => parseInt(s, 16)));
    return timingSafeEqual(signature, bytes);
  });
  if (!valid) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function handlePromptPaywall(request, env, pathname, corsHeaders) {
  const method = request.method.toUpperCase();
  const headers = corsHeaders;
  if (pathname === '/billing/webhook' && method === 'POST') {
    const event = await verifiedStripeEvent(request, env);
    if (!event) return reply({ error: 'invalid signature' }, 400, headers);
    if (event.type === 'checkout.session.completed') {
      const session = event.data?.object;
      if (session?.mode === 'subscription' && session?.payment_status === 'paid' &&
          /^cus_[A-Za-z0-9]+$/.test(session.customer || '') &&
          typeof session.client_reference_id === 'string' &&
          /^[A-Za-z0-9_-]{1,255}$/.test(session.client_reference_id)) {
        if (!env.PROMPTOS_BILLING_KV) return reply({ error: 'billing storage unavailable' }, 503, headers);
        await env.PROMPTOS_BILLING_KV.put('customer:' + session.client_reference_id, session.customer);
      }
    }
    return reply({ received: true }, 200, headers);
  }

  if (!['/billing/entitlement', '/billing/checkout', '/prompts/admit'].includes(pathname)) {
    return reply({ error: 'not found' }, 404, headers);
  }
  if (!configReady(env)) return reply({ error: 'billing unavailable', paid: false }, 503, headers);
  const identity = await verifyIdentity(request, env);
  if (!identity) return reply({ error: 'sign in required', paid: false }, 401, headers);

  if (pathname === '/billing/entitlement' && method === 'GET') {
    try {
      return reply({ paid: await paidSubscription(env, identity.sub) }, 200, headers);
    } catch {
      return reply({ error: 'billing verification unavailable', paid: false }, 503, headers);
    }
  }

  if (pathname === '/prompts/admit' && method === 'POST') {
    try {
      if (!(await paidSubscription(env, identity.sub))) return reply({ error: 'paid account required' }, 402, headers);
      return reply({ admitted: true, persistence: 'session-only' }, 200, headers);
    } catch {
      return reply({ error: 'billing verification unavailable' }, 503, headers);
    }
  }

  if (pathname === '/billing/checkout' && method === 'POST') {
    if (!verifiedReturnUrl(env.PROMPTOS_BILLING_SUCCESS_URL) ||
        !verifiedReturnUrl(env.PROMPTOS_BILLING_CANCEL_URL)) {
      return reply({ error: 'checkout return URLs not configured' }, 503, headers);
    }
    try {
      const customer = await env.PROMPTOS_BILLING_KV.get('customer:' + identity.sub);
      const checkout = await stripeRequest(env, '/checkout/sessions', {
        mode: 'subscription',
        'line_items[0][price]': env.PROMPTOS_STRIPE_PRICE_ID,
        'line_items[0][quantity]': '1',
        client_reference_id: identity.sub,
        success_url: env.PROMPTOS_BILLING_SUCCESS_URL,
        cancel_url: env.PROMPTOS_BILLING_CANCEL_URL,
        ...(customer && /^cus_[A-Za-z0-9]+$/.test(customer) ? { customer } :
          identity.email ? { customer_email: identity.email } : {})
      });
      if (!checkout.url || new URL(checkout.url).hostname !== 'checkout.stripe.com') {
        return reply({ error: 'invalid checkout response' }, 502, headers);
      }
      return reply({ url: checkout.url }, 200, headers);
    } catch {
      return reply({ error: 'checkout unavailable' }, 503, headers);
    }
  }
  return reply({ error: 'method not allowed' }, 405, headers);
}
