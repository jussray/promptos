/*
 * Paid account UI bridge. Server admission is mandatory for saving custom prompts.
 * No price, subscription state, Google ID token, or Stripe secret is trusted from
 * local browser storage. The server remains the source of paid-account truth.
 */
(function () {
  'use strict';
  var raw = document.querySelector('meta[name="promptos-billing-api"]')?.content?.trim() || '';
  var apiBase = '';
  try {
    var candidate = new URL(raw);
    if (candidate.protocol === 'https:' && !candidate.username && !candidate.password &&
        !candidate.search && !candidate.hash) apiBase = candidate.origin + candidate.pathname.replace(/\/$/, '');
  } catch { /* No configured billing endpoint means paid actions fail closed. */ }

  function token() {
    return window.PromptOSAuth?.getIdToken?.() || '';
  }

  function message(value) {
    var el = document.getElementById('billingStatus');
    if (el) el.textContent = value;
  }

  var pendingOffer = null;
  var offerGeneration = 0;
  var checkoutBusy = false;

  async function call(path, method, body) {
    if (!apiBase) throw new Error('billing not configured');
    var credential = token();
    if (!credential) throw new Error('sign in required');
    var response = await fetch(apiBase + path, {
      method: method || 'GET',
      headers: { Authorization: 'Bearer ' + credential, ...(body ? {'Content-Type':'application/json'} : {}) },
      ...(body ? {body:JSON.stringify(body)} : {}),
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'error'
    });
    if (!response.ok) {
      if (response.status === 401) throw new Error('sign in required');
      if (response.status === 402) throw new Error('paid account required');
      throw new Error('billing unavailable');
    }
    var result = await response.json();
    if (token() !== credential) throw new Error('account changed');
    return result;
  }

  async function refresh() {
    if (!apiBase) {
      message('Paid prompt saving is unavailable until billing is connected. The free library remains open.');
      return false;
    }
    if (!token()) {
      message('Paid account required to save personal prompts. Sign in with Google to upgrade.');
      return false;
    }
    try {
      var data = await call('/billing/entitlement');
      message(data.paid ? 'Paid account verified. Personal prompt saving is enabled.' :
        'Paid account required to save personal prompts. The curated library remains free.');
      return data.paid === true;
    } catch {
      message('Payment verification unavailable. Personal prompt saving is paused.');
      return false;
    }
  }

  async function admit() {
    try {
      var data = await call('/prompts/admit', 'POST');
      if (data.admitted === true) return true;
    } catch (e) {
      message(e.message === 'sign in required' ? 'Sign in with Google, then choose Upgrade to save prompts.' :
        e.message === 'paid account required' ? 'A paid account is required to save or import personal prompts.' :
          'Billing verification unavailable. No prompt was saved.');
    }
    return false;
  }

  function resetOffer() {
    offerGeneration++;
    pendingOffer = null;
    var panel = document.getElementById('billingConsent');
    var checkbox = document.getElementById('billingRenewalConsent');
    var submit = document.getElementById('billingCheckout');
    var terms = document.getElementById('billingTerms');
    if (panel) panel.hidden = true;
    if (checkbox) checkbox.checked = false;
    if (submit) submit.disabled = true;
    if (terms) terms.removeAttribute('href');
  }

  async function upgrade() {
    if (checkoutBusy) return;
    resetOffer();
    if (!token()) {
      message('Sign in with a verified Google account before starting a subscription.');
      window.PromptOSAuth?.signIn?.();
      return;
    }
    var credential = token();
    var generation = offerGeneration;
    try {
      var data = await call('/billing/offer');
      var offer = data.offer;
      if (generation !== offerGeneration || credential !== token()) return;
      var terms = new URL(offer.termsUrl);
      if (offer.billingMode !== 'test' || offer.currency !== 'usd' || offer.interval !== 'month' ||
          offer.firstInvoiceAmountMinor !== 100 || !Number.isSafeInteger(offer.renewalAmountMinor) ||
          offer.renewalAmountMinor !== 999 || terms.protocol !== 'https:' || terms.username || terms.password || terms.port) {
        throw new Error('invalid offer');
      }
      pendingOffer = {offer:offer, credential:credential};
      document.getElementById('billingOfferSummary').textContent =
        'Sandbox only — no real charges. USD $1.00 first month; then USD $' +
        (offer.renewalAmountMinor / 100).toFixed(2) + ' per month, automatically renewed in test mode.';
      document.getElementById('billingTerms').href = terms.href;
      document.getElementById('billingConsent').hidden = false;
      message('Review the current sandbox offer and renewal terms before continuing.');
    } catch {
      if (generation === offerGeneration) message('Checkout is unavailable until the billing account and price are verified.');
    }
  }

  async function checkout() {
    var box = document.getElementById('billingRenewalConsent');
    if (checkoutBusy || !pendingOffer || !box?.checked || pendingOffer.credential !== token()) return;
    var selected = pendingOffer;
    var offer = selected.offer;
    var generation = offerGeneration;
    checkoutBusy = true;
    var submit = document.getElementById('billingCheckout');
    if (submit) submit.disabled = true;
    try {
      var data = await call('/billing/checkout','POST',{
        acceptsTerms:true, acceptsAutomaticRenewal:true,
        firstInvoiceAmountMinor:offer.firstInvoiceAmountMinor,
        renewalAmountMinor:offer.renewalAmountMinor, interval:offer.interval, termsUrl:offer.termsUrl
      });
      if (generation !== offerGeneration || selected.credential !== token()) return;
      var url = new URL(data.url);
      if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com' || url.port ||
          url.username || url.password || !url.pathname.startsWith('/c/') ||
          data.billingMode !== 'test' || data.firstInvoiceAmountMinor !== offer.firstInvoiceAmountMinor ||
          data.renewalAmountMinor !== offer.renewalAmountMinor || data.interval !== offer.interval ||
          data.currency !== offer.currency || data.termsUrl !== offer.termsUrl) throw new Error('invalid checkout');
      window.location.assign(url.href);
    } catch {
      if (generation === offerGeneration) {
        resetOffer();
        message('Checkout unavailable or offer changed. Review the current offer again.');
      }
    } finally { checkoutBusy = false; }
  }

  window.PromptOSBilling = Object.freeze({ admit: admit, refresh: refresh, upgrade: upgrade });
  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('billingUpgrade')?.addEventListener('click', upgrade);
    document.getElementById('billingRenewalConsent')?.addEventListener('change', function () {
      document.getElementById('billingCheckout').disabled = !this.checked || !pendingOffer || checkoutBusy;
    });
    document.getElementById('billingCheckout')?.addEventListener('click', checkout);
    refresh();
  });
  ['promptos:authed', 'promptos:guest', 'promptos:signedout'].forEach(function(event) {
    window.addEventListener(event, function () { resetOffer(); refresh(); });
  });
})();
