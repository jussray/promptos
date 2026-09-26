/**
 * auth.js — PromptOS Auth + Analytics + Persistence Truth
 *
 * Boot behaviour:
 *   • App opens immediately as Guest — no sign-in wall.
 *   • Google sign-in is optional (topbar chip shows “Sign in” button).
 *   • Signing in upgrades the session in-place.
 *
 * Persistence authority (app state — stars, custom prompts, theme):
 *   • Current browser app state is session-only.
 *   • Founder Control Room is the canonical runtime persistence authority.
 *   • FCR runtime persistence is not connected from this browser product yet.
 *   • Browser GitHub/Gist credentials are not accepted or implemented.
 *   • JSON Export / Import remains explicit backup and recovery.
 *   This is unrelated to visitor analytics identification below — a device
 *   returning tomorrow keeps its analytics identity even though its star
 *   list did not survive the reload.
 *
 * Visitor identification (separate from app-state persistence above):
 *   • Gated behind an explicit accept/decline consent banner shown once.
 *   • On accept: a cryptographically-random id is stored in a first-party
 *     cookie (`promptos_vid`, 400-day max per browser policy) so a
 *     returning visitor can be recognized across sessions. No canvas,
 *     WebGL, audio, font, or hardware/user-agent signal is collected —
 *     .control-room/browser-reality.contract.json (added to this repo for
 *     a separate read-only URL-inspection skill) explicitly lists those
 *     as prohibited signals, and its own pseudonymousId clause describes
 *     this exact pattern instead: cryptographically-random, first-party,
 *     disclosed, resettable, no cross-site correlation.
 *   • On decline: no cookie is set; every event carries visitor_id: null.
 *   • The identifier is pseudonymous but is still personal data under
 *     GDPR/CCPA (it can single out a device across visits), so it is
 *     opt-in, not silent, and a decline is honored and not re-prompted.
 *
 * Analytics:
 *   • guest_session_started  — every cold page load
 *   • google_signin_success  — Google OAuth completes
 *   • guest_to_google_upgrade — user was guest, then signed in
 *   • consent_accepted / consent_declined — visitor-identification choice
 *   • Every event payload carries visitor_id (string once consented, else
 *     null). No name, email, or other directly-identifying field is sent.
 *
 * Authorized JS origin: https://jussray.github.io
 * Client ID: 813638397474-6pibutsimcafimrcttq7idnmugsin01c.apps.googleusercontent.com
 */
(function () {
  'use strict';

  if (!Array.isArray(window.PROMPTS)) window.PROMPTS = [];

  var CLIENT_ID = '813638397474-6pibutsimcafimrcttq7idnmugsin01c.apps.googleusercontent.com';
  var ANALYTICS_ENDPOINT = '';

  var persistenceAuthority = Object.freeze({
    canonicalAuthority: 'Founder Control Room',
    runtimePersistence: 'not-connected',
    browserState: 'session-only',
    browserGitHubTokenAccepted: false,
    recovery: Object.freeze(['export', 'import'])
  });
  window.__PROMPTOS_PERSISTENCE_AUTHORITY__ = persistenceAuthority;

  function renderPersistenceAuthority() {
    var foot = document.querySelector('.side-foot');
    if (foot && foot.parentElement && !document.getElementById('persistenceAuthorityStatus')) {
      var panel = document.createElement('div');
      panel.setAttribute('data-persistence-authority', 'session-only');
      panel.setAttribute('aria-label', 'PromptOS persistence authority');
      panel.style.cssText = 'margin-top:14px;padding:12px 10px;border-top:1px solid var(--border)';

      var label = document.createElement('div');
      label.className = 'side-label';
      label.style.cssText = 'padding:0 0 8px';
      label.textContent = '☁️ Runtime persistence';

      var status = document.createElement('div');
      status.id = 'persistenceAuthorityStatus';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      status.style.cssText = 'font-family:var(--mono);font-size:11px;line-height:1.5;color:var(--text-muted);padding:8px 9px;border:1px solid var(--border);border-radius:var(--r-md);background:var(--surface-2)';
      status.textContent = 'Session only · FCR runtime persistence not connected';

      var recovery = document.createElement('div');
      recovery.style.cssText = 'font-size:10px;color:var(--text-faint);margin-top:8px;line-height:1.5';
      recovery.textContent = 'Use Export / Import for explicit backup and recovery. PromptOS does not collect a browser GitHub token.';

      panel.appendChild(label);
      panel.appendChild(status);
      panel.appendChild(recovery);
      foot.parentElement.insertBefore(panel, foot);
      foot.textContent = 'Session-only state · use Export / Import for recovery.';
    }

    var mobileNav = document.getElementById('mobileNav');
    if (mobileNav && !document.getElementById('persistenceAuthorityMobileStatus')) {
      var mobileStatus = document.createElement('div');
      mobileStatus.id = 'persistenceAuthorityMobileStatus';
      mobileStatus.setAttribute('role', 'status');
      mobileStatus.setAttribute('aria-live', 'polite');
      mobileStatus.setAttribute('data-persistence-authority', 'session-only');
      mobileStatus.style.cssText = 'font-family:var(--mono);font-size:10.5px;line-height:1;white-space:nowrap;flex-shrink:0;padding:8px 11px;border:1px solid var(--border);border-radius:var(--r-full);background:var(--surface-2);color:var(--text-muted)';
      mobileStatus.textContent = 'Session only · FCR not connected';
      mobileNav.insertBefore(mobileStatus, mobileNav.firstChild);
    }
  }

  var SESSION = {
    user: null,
    startedAs: 'guest'
  };

  function qs(s) { return document.querySelector(s); }

  function logEvent(name) {
    var payload = JSON.stringify({ event: name, ts: Date.now(), visitor_id: VISITOR_ID });
    console.info('[PromptOS analytics]', name);
    if (!ANALYTICS_ENDPOINT) return;
    try {
      var blob = new Blob([payload], { type: 'application/json' });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(ANALYTICS_ENDPOINT, blob);
      } else {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', ANALYTICS_ENDPOINT, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(payload);
      }
    } catch (e) {
      console.warn('[PromptOS analytics] beacon failed', e);
    }
  }

  /* ── VISITOR IDENTIFICATION: consent gate + device fingerprint + cookie ──
   * See file header. Independent of the app-state persistence authority
   * above — this identifies a returning browser for analytics only.
   */
  var CONSENT_COOKIE = 'promptos_consent';
  var VISITOR_COOKIE = 'promptos_vid';
  var VISITOR_COOKIE_DAYS = 400; /* Chrome's own max cookie lifetime cap */
  var VISITOR_ID = null;

  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  }

  function setCookie(name, value, days) {
    var expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires +
      '; path=/; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '');
  }

  /* Cryptographically-random id — no canvas/WebGL/audio/font/hardware
     signal collection. .control-room/browser-reality.contract.json
     (added to this repo for a separate read-only URL-inspection skill)
     explicitly lists canvas-readback, user-agent-entropy-collection, and
     device-hardware-signal-aggregation as prohibited signals; its own
     pseudonymousId clause describes exactly this pattern instead —
     cryptographically-random, first-party, disclosed, resettable, no
     cross-site correlation — so that is what this uses. */
  function randomId() {
    if (window.crypto && crypto.getRandomValues) {
      var bytes = crypto.getRandomValues(new Uint8Array(16));
      return Array.prototype.map.call(bytes, function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    }
    /* Fallback for a browser without crypto.getRandomValues (none expected
       in a modern evergreen browser, but never leave this unset). */
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
  }

  function ensureVisitorId() {
    var existing = getCookie(VISITOR_COOKIE);
    if (existing) {
      VISITOR_ID = existing;
      return existing;
    }
    var id = randomId();
    setCookie(VISITOR_COOKIE, id, VISITOR_COOKIE_DAYS);
    VISITOR_ID = id;
    return id;
  }

  function hideConsentBanner() {
    var el = document.getElementById('cookieConsent');
    if (el) el.remove();
  }

  function grantConsent() {
    setCookie(CONSENT_COOKIE, 'accepted', VISITOR_COOKIE_DAYS);
    ensureVisitorId();
    hideConsentBanner();
    logEvent('consent_accepted');
  }

  function declineConsent() {
    setCookie(CONSENT_COOKIE, 'declined', VISITOR_COOKIE_DAYS);
    hideConsentBanner();
    logEvent('consent_declined');
  }

  function renderConsentBanner() {
    if (document.getElementById('cookieConsent')) return;
    /* Normal document flow, not position:fixed — inserted as the very
       first element in <body> so it occupies its own space above
       #appShell / #onboarding and can never overlay (and so never
       intercept clicks on) any real page content, in any viewport. */
    var el = document.createElement('div');
    el.id = 'cookieConsent';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Cookie and visitor identification consent');
    el.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px;' +
      'background:var(--surface,#161513);color:var(--text,#e8e6e3);border-bottom:1px solid var(--border,rgba(255,255,255,.08));' +
      'padding:10px 16px;font-family:var(--sans,system-ui,sans-serif);font-size:12.5px;line-height:1.5';
    el.innerHTML =
      '<div style="flex:1;min-width:220px">PromptOS sets a cookie with a random id to recognize you as a returning visitor. ' +
      'It does not read your device or browser to build a fingerprint. This is separate from your prompt library, which stays session-only either way.</div>' +
      '<div style="display:flex;gap:8px;flex-shrink:0">' +
      '<button id="cookieDecline" style="font-family:inherit;font-size:12px;padding:6px 12px;border-radius:8px;' +
      'border:1px solid rgba(255,255,255,.14);background:transparent;color:inherit;cursor:pointer">Decline</button>' +
      '<button id="cookieAccept" style="font-family:inherit;font-size:12px;font-weight:600;padding:6px 14px;' +
      'border-radius:8px;border:none;background:#4f98a3;color:#fff;cursor:pointer">Accept</button>' +
      '</div>';
    document.body.insertBefore(el, document.body.firstChild);
    document.getElementById('cookieAccept').addEventListener('click', grantConsent);
    document.getElementById('cookieDecline').addEventListener('click', declineConsent);
  }

  function initVisitorIdentification() {
    var consent = getCookie(CONSENT_COOKIE);
    if (consent === 'accepted') {
      ensureVisitorId();
    } else if (consent === 'declined') {
      VISITOR_ID = null;
    } else {
      renderConsentBanner();
    }
  }

  function decodeJwt(token) {
    try {
      var b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      var json = decodeURIComponent(
        atob(b64).split('').map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join('')
      );
      return JSON.parse(json);
    } catch (e) {
      console.error('[PromptOS auth] JWT decode error', e);
      return null;
    }
  }

  function renderGuestChip() {
    var chip = qs('#userChip');
    if (!chip) return;
    chip.innerHTML = '';

    var icon = document.createElement('div');
    icon.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>';
    icon.style.cssText = 'width:24px;height:24px;border-radius:50%;background:var(--surface-3);display:grid;place-items:center;color:var(--text-faint);flex-shrink:0';

    var label = document.createElement('span');
    label.textContent = 'Guest';
    label.style.cssText = 'font-family:var(--mono);font-size:11px;color:var(--text-faint)';

    var signInBtn = document.createElement('button');
    signInBtn.textContent = 'Sign in';
    signInBtn.setAttribute('aria-label', 'Sign in with Google');
    signInBtn.style.cssText = 'font-family:var(--mono);font-size:10px;font-weight:600;padding:3px 9px;' +
      'border-radius:var(--r-full);border:1px solid var(--primary);background:var(--primary-dim);' +
      'color:var(--primary);cursor:pointer;transition:all 180ms cubic-bezier(.16,1,.3,1)';
    signInBtn.addEventListener('mouseenter', function () {
      signInBtn.style.background = 'var(--primary)';
      signInBtn.style.color = '#fff';
    });
    signInBtn.addEventListener('mouseleave', function () {
      signInBtn.style.background = 'var(--primary-dim)';
      signInBtn.style.color = 'var(--primary)';
    });
    signInBtn.addEventListener('click', function () { triggerGoogleSignIn(); });

    chip.appendChild(icon);
    chip.appendChild(label);
    chip.appendChild(signInBtn);
  }

  function renderUserChip(user) {
    var chip = qs('#userChip');
    if (!chip) return;
    chip.innerHTML = '';

    var avatarEl;
    if (user.picture) {
      avatarEl = document.createElement('img');
      avatarEl.src = user.picture;
      avatarEl.alt = user.name || 'User';
      avatarEl.width = 24;
      avatarEl.height = 24;
      avatarEl.setAttribute('referrerpolicy', 'no-referrer');
      avatarEl.style.cssText = 'border-radius:50%;object-fit:cover;flex-shrink:0;border:1px solid var(--border)';
      avatarEl.onerror = function () { avatarEl.replaceWith(buildInitials(user.name)); };
    } else {
      avatarEl = buildInitials(user.name);
    }

    var nameSpan = document.createElement('span');
    nameSpan.textContent = user.name || user.email || 'Signed in';

    var signOutBtn = document.createElement('button');
    signOutBtn.textContent = 'Sign out';
    signOutBtn.setAttribute('aria-label', 'Sign out of PromptOS');
    signOutBtn.addEventListener('click', function (e) { e.stopPropagation(); signOut(); });

    chip.appendChild(avatarEl);
    chip.appendChild(nameSpan);
    chip.appendChild(signOutBtn);
  }

  function buildInitials(name) {
    var letters = (name || '?').split(' ').map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase();
    var el = document.createElement('div');
    el.textContent = letters;
    el.style.cssText = 'width:24px;height:24px;border-radius:50%;background:var(--primary-dim);color:var(--primary);' +
      'font-family:var(--mono);font-size:10px;font-weight:700;display:grid;place-items:center;flex-shrink:0';
    return el;
  }

  function bootAsGuest() {
    var ob = qs('#onboarding');
    var app = qs('#appShell');
    if (ob) ob.style.display = 'none';
    if (app) app.style.display = '';
    SESSION.user = null;
    SESSION.startedAs = 'guest';
    renderGuestChip();
    logEvent('guest_session_started');
    window.dispatchEvent(new CustomEvent('promptos:guest'));
  }

  function triggerGoogleSignIn() {
    if (window.google && google.accounts && google.accounts.id) {
      google.accounts.id.prompt();
    } else {
      loadGIS(true);
    }
  }

  window.__promptosGsiCallback = function (response) {
    if (!response || !response.credential) return;
    var payload = decodeJwt(response.credential);
    if (!payload) return;

    var wasGuest = SESSION.startedAs === 'guest' && SESSION.user === null;
    SESSION.user = {
      id: payload.sub,
      name: payload.name || payload.email || 'User',
      email: payload.email || '',
      picture: payload.picture || ''
    };

    renderUserChip(SESSION.user);
    logEvent('google_signin_success');
    if (wasGuest) logEvent('guest_to_google_upgrade');
    window.dispatchEvent(new CustomEvent('promptos:authed', { detail: SESSION.user }));
  };

  function signOut() {
    SESSION.user = null;
    SESSION.startedAs = 'guest';
    if (window.google && google.accounts && google.accounts.id) {
      google.accounts.id.disableAutoSelect();
    }
    renderGuestChip();
    logEvent('guest_session_started');
    window.dispatchEvent(new CustomEvent('promptos:signedout'));
  }

  function initGIS() {
    if (!window.google || !google.accounts || !google.accounts.id) {
      setTimeout(initGIS, 150);
      return;
    }
    google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: window.__promptosGsiCallback,
      auto_select: false,
      cancel_on_tap_outside: true
    });
  }

  function loadGIS(promptAfter) {
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return;
    if (document.getElementById('gis-sdk')) {
      if (promptAfter && window.google) google.accounts.id.prompt();
      return;
    }
    var s = document.createElement('script');
    s.id = 'gis-sdk';
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = function () {
      initGIS();
      if (promptAfter) setTimeout(function () { google.accounts.id.prompt(); }, 200);
    };
    s.onerror = function () { console.error('[PromptOS auth] GIS SDK failed to load'); };
    document.head.appendChild(s);
  }

  window.PromptOSAuth = { signOut: signOut, getUser: function () { return SESSION.user; }, isGuest: function () { return SESSION.user === null; } };
  window.promptOSSignOut = signOut;
  window.promptOSSession = SESSION;

  function boot() {
    initVisitorIdentification();
    bootAsGuest();
    renderPersistenceAuthority();
    loadGIS();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
