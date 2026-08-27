/**
 * auth.js — PromptOS Auth + Analytics + Persistence Truth
 *
 * Boot behaviour:
 *   • App opens immediately as Guest — no sign-in wall.
 *   • Google sign-in is optional (topbar chip shows “Sign in” button).
 *   • Signing in upgrades the session in-place.
 *
 * Persistence authority:
 *   • Current browser state is session-only.
 *   • Founder Control Room is the canonical runtime persistence authority.
 *   • FCR runtime persistence is not connected from this browser product yet.
 *   • Browser GitHub/Gist credentials are not accepted or implemented.
 *   • JSON Export / Import remains explicit backup and recovery.
 *
 * Analytics (no personal data stored):
 *   • guest_session_started  — every cold page load
 *   • google_signin_success  — Google OAuth completes
 *   • guest_to_google_upgrade — user was guest, then signed in
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
    if (document.getElementById('persistenceAuthorityStatus')) return;
    var foot = document.querySelector('.side-foot');
    if (!foot || !foot.parentElement) return;

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
  }

  var SESSION = {
    user: null,
    startedAs: 'guest'
  };

  function qs(s) { return document.querySelector(s); }

  function logEvent(name) {
    var payload = JSON.stringify({ event: name, ts: Date.now() });
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
