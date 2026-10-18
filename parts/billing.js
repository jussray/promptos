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

  async function call(path, method) {
    if (!apiBase) throw new Error('billing not configured');
    var credential = token();
    if (!credential) throw new Error('sign in required');
    var response = await fetch(apiBase + path, {
      method: method || 'GET',
      headers: { Authorization: 'Bearer ' + credential },
      cache: 'no-store'
    });
    if (!response.ok) {
      if (response.status === 401) throw new Error('sign in required');
      if (response.status === 402) throw new Error('paid account required');
      throw new Error('billing unavailable');
    }
    return response.json();
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

  async function upgrade() {
    if (!token()) {
      message('Sign in with Google before starting a paid subscription.');
      window.PromptOSAuth?.signIn?.();
      return;
    }
    try {
      var data = await call('/billing/checkout', 'POST');
      var url = new URL(data.url);
      if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com') throw new Error('invalid checkout');
      window.location.assign(url.href);
    } catch {
      message('Checkout is unavailable until the billing account and price are verified.');
    }
  }

  window.PromptOSBilling = Object.freeze({ admit: admit, refresh: refresh, upgrade: upgrade });
  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('billingUpgrade')?.addEventListener('click', upgrade);
    refresh();
  });
  window.addEventListener('promptos:authed', refresh);
  window.addEventListener('promptos:guest', refresh);
  window.addEventListener('promptos:signedout', refresh);
})();
