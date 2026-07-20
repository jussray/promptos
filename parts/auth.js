/**
 * auth.js — Google Identity Services (GIS) OAuth for PromptOS
 *
 * Flow:
 *   1. Page loads → showOnboarding() (hide #appShell, show #onboarding)
 *   2. GIS SDK loaded dynamically → initialize + renderButton into #gsiButton
 *   3. User clicks Sign in → __gsiCallback receives JWT credential
 *   4. Decode JWT payload → store user in memory → showApp()
 *   5. showApp() hides #onboarding, shows #appShell, renders #userChip
 *   6. Sign-out button → signOut() → back to #onboarding
 *
 * Sandbox-safe: no localStorage / sessionStorage used.
 * Dev bypass: on localhost the sign-in screen is skipped automatically.
 */
(function () {
  'use strict';

  /* ── CONFIG ──────────────────────────────────────────────────────────── */
  var CLIENT_ID = 'project-dfb645a4-e937-4976-b1b.apps.googleusercontent.com';

  /* ── IN-MEMORY SESSION (no localStorage — sandbox-safe) ──────────────── */
  var SESSION = { user: null }; // { id, name, email, picture }

  /* ── DOM HELPERS ────────────────────────────────────────────────────────── */
  function qs(sel) { return document.querySelector(sel); }

  /* ── JWT DECODE ─────────────────────────────────────────────────────────── */
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

  /* ── USER CHIP ─────────────────────────────────────────────────────────── */
  function buildAvatar(user) {
    if (user.picture) {
      var img = document.createElement('img');
      img.src    = user.picture;
      img.alt    = user.name || 'User';
      img.width  = 24;
      img.height = 24;
      img.setAttribute('referrerpolicy', 'no-referrer');
      img.style.cssText = 'border-radius:50%;object-fit:cover;flex-shrink:0;border:1px solid var(--border)';
      img.onerror = function () { img.replaceWith(buildInitials(user.name)); };
      return img;
    }
    return buildInitials(user.name);
  }

  function buildInitials(name) {
    var letters = (name || '?').split(' ').map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase();
    var el = document.createElement('div');
    el.textContent = letters;
    el.style.cssText = 'width:24px;height:24px;border-radius:50%;background:var(--primary-dim);color:var(--primary);' +
      'font-family:var(--mono);font-size:10px;font-weight:700;display:grid;place-items:center;flex-shrink:0';
    return el;
  }

  function renderUserChip(user) {
    var chip = qs('#userChip');
    if (!chip) return;
    chip.innerHTML = '';

    chip.appendChild(buildAvatar(user));

    var nameSpan = document.createElement('span');
    nameSpan.textContent = user.name || user.email || 'Signed in';
    chip.appendChild(nameSpan);

    var btn = document.createElement('button');
    btn.textContent = 'Sign out';
    btn.setAttribute('aria-label', 'Sign out of PromptOS');
    btn.addEventListener('click', function (e) { e.stopPropagation(); signOut(); });
    chip.appendChild(btn);
  }

  /* ── SHOW / HIDE ────────────────────────────────────────────────────────── */
  function showOnboarding() {
    var ob  = qs('#onboarding');
    var app = qs('#appShell');
    if (ob)  ob.style.display  = 'flex';
    if (app) app.style.display = 'none';
  }

  function showApp(user) {
    SESSION.user = user;
    var ob  = qs('#onboarding');
    var app = qs('#appShell');
    if (ob)  ob.style.display  = 'none';
    if (app) app.style.display = '';
    renderUserChip(user);
    window.dispatchEvent(new CustomEvent('promptos:authed', { detail: user }));
  }

  /* ── SIGN OUT ──────────────────────────────────────────────────────────── */
  function signOut() {
    SESSION.user = null;
    var chip = qs('#userChip');
    if (chip) chip.innerHTML = '';
    if (window.google && google.accounts && google.accounts.id) {
      google.accounts.id.disableAutoSelect();
    }
    showOnboarding();
    window.dispatchEvent(new CustomEvent('promptos:signedout'));
  }

  /* ── GIS CREDENTIAL CALLBACK ─────────────────────────────────────────── */
  window.__promptosGsiCallback = function (response) {
    if (!response || !response.credential) {
      console.warn('[PromptOS auth] empty GIS response');
      return;
    }
    var payload = decodeJwt(response.credential);
    if (!payload) { showOnboarding(); return; }
    showApp({
      id     : payload.sub,
      name   : payload.name    || payload.email || 'User',
      email  : payload.email   || '',
      picture: payload.picture || ''
    });
  };

  /* ── GIS INIT ───────────────────────────────────────────────────────────── */
  function initGIS() {
    if (!window.google || !google.accounts || !google.accounts.id) {
      setTimeout(initGIS, 150);
      return;
    }
    google.accounts.id.initialize({
      client_id           : CLIENT_ID,
      callback            : window.__promptosGsiCallback,
      auto_select         : false,
      cancel_on_tap_outside: true
    });

    var btnEl = qs('#gsiButton');
    if (btnEl) {
      google.accounts.id.renderButton(btnEl, {
        theme : document.documentElement.getAttribute('data-theme') === 'light'
                  ? 'outline' : 'filled_black',
        size  : 'large',
        shape : 'pill',
        width : 280,
        text  : 'signin_with'
      });
    }
    google.accounts.id.prompt();
  }

  /* ── LOAD GIS SDK ────────────────────────────────────────────────────────── */
  function loadGIS() {
    /* Dev bypass: skip sign-in on localhost */
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      showApp({ id: 'dev', name: 'Dev User', email: 'dev@local', picture: '' });
      return;
    }
    if (document.getElementById('gis-sdk')) { initGIS(); return; }
    var s   = document.createElement('script');
    s.id    = 'gis-sdk';
    s.src   = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload  = initGIS;
    s.onerror = function () {
      console.error('[PromptOS auth] GIS SDK failed to load');
    };
    document.head.appendChild(s);
  }

  /* ── PUBLIC API ──────────────────────────────────────────────────────────── */
  window.PromptOSAuth  = { signOut: signOut, getUser: function () { return SESSION.user; } };
  window.promptOSSignOut = signOut;
  window.promptOSSession = SESSION;

  /* ── BOOT ──────────────────────────────────────────────────────────────── */
  function boot() {
    showOnboarding();
    loadGIS();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
