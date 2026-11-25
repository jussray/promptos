// Sandbox-only PromptOS checkout bridge. JussPay remains the payment authority.
const BASE = 'https://jusspay.internal';
const permission = 'promptos.personal_prompts';
function result(status, body) { return { status, body }; }
function secureUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port ? url : null;
  } catch { return null; }
}
function offerFromCatalog(rows) {
  if (!Array.isArray(rows)) return null;
  const matches = rows.filter(row => row?.id === 'promptos');
  if (matches.length !== 1) return null;
  const row = matches[0], intro = row.introOffer;
  if (row.purchaseStatus !== 'requires_provider_validation' || row.offerConfigured !== true ||
      row.currency !== 'usd' || row.interval !== 'month' ||
      !Number.isSafeInteger(row.unitAmount) || row.unitAmount <= 100 ||
      !secureUrl(row.termsUrl) || !Array.isArray(row.entitlements) ||
      !row.entitlements.includes(permission) ||
      intro?.approved !== true || intro.billingMode !== 'test' ||
      intro.firstInvoiceAmountMinor !== 100 || intro.renewalAmountMinor !== row.unitAmount ||
      intro.renewalInterval !== 'month') return null;
  return { billingMode: 'test', firstInvoiceAmountMinor: 100, renewalAmountMinor: row.unitAmount,
    currency: 'usd', interval: 'month', termsUrl: row.termsUrl };
}
async function readConsent(request) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type') || '')) return null;
  if (Number(request.headers.get('Content-Length')) > 4096 || !request.body) return null;
  const reader = request.body.getReader();
  let total = 0;
  const decoder = new TextDecoder('utf-8', {fatal: true});
  let value = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      total += chunk.value.byteLength;
      if (total > 4096) { await reader.cancel(); return null; }
      value += decoder.decode(chunk.value, {stream: true});
    }
    return JSON.parse(value + decoder.decode());
  } catch { return null; } finally { reader.releaseLock(); }
}
export async function handleIntroBilling(request, env, pathname) {
  if (env.PROMPTOS_INTRO_SANDBOX_ENABLED !== 'true') return result(503, {error: 'sandbox_checkout_disabled'});
  const binding = env.PROMPTOS_JUSSPAY;
  const authorization = request.headers.get('Authorization');
  if (!binding?.fetch || !authorization) return result(503, {error: 'billing_unavailable'});
  try {
    const catalog = await binding.fetch(new Request(BASE + '/catalog', {method: 'GET'}));
    if (!catalog.ok) return result(503, {error: 'offer_unavailable'});
    const offer = offerFromCatalog(await catalog.json());
    if (!offer) return result(503, {error: 'offer_unavailable'});
    if (pathname === '/billing/offer') return result(200, {offer});
    const c = await readConsent(request);
    if (!c || c.acceptsTerms !== true || c.acceptsAutomaticRenewal !== true ||
        c.firstInvoiceAmountMinor !== offer.firstInvoiceAmountMinor ||
        c.renewalAmountMinor !== offer.renewalAmountMinor ||
        c.interval !== offer.interval || c.termsUrl !== offer.termsUrl) {
      return result(409, {error: 'renewal_consent_required'});
    }
    const introConsent = {acceptsTerms: true, acceptsAutomaticRenewal: true,
      firstInvoiceAmountMinor: offer.firstInvoiceAmountMinor, renewalAmountMinor: offer.renewalAmountMinor,
      interval: offer.interval, termsUrl: offer.termsUrl};
    const upstream = await binding.fetch(new Request(BASE + '/checkout', {
      method: 'POST', headers: {Authorization: authorization, 'Content-Type': 'application/json'},
      body: JSON.stringify({product: 'promptos', introConsent})
    }));
    if (!upstream.ok) return result(upstream.status === 401 ? 401 : upstream.status === 409 ? 409 : 503,
      {error: 'checkout_unavailable'});
    const receipt = await upstream.json();
    const url = secureUrl(receipt?.url);
    if (!url || url.hostname !== 'checkout.stripe.com' || !url.pathname.startsWith('/c/') ||
        receipt.billingMode !== 'test' || receipt.currency !== offer.currency ||
        receipt.interval !== offer.interval || receipt.termsUrl !== offer.termsUrl ||
        receipt.firstInvoiceAmountMinor !== offer.firstInvoiceAmountMinor ||
        receipt.renewalAmountMinor !== offer.renewalAmountMinor) return result(503, {error: 'checkout_receipt_mismatch'});
    // A checkout URL does not grant any entitlement.
    return result(200, {...offer, url: url.href});
  } catch { return result(503, {error: 'billing_unavailable'}); }
}
