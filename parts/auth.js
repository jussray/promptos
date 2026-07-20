/* PromptOS — Google Identity Services Auth Layer
   Uses Google GIS (accounts.google.com/gsi/client) — no backend needed.
   Replace GOOGLE_CLIENT_ID with your real Client ID from Google Cloud Console.

   Flow:
     1. Page loads → check if user already signed in (in-memory session)
     2. If not → show #onboarding, hide #appShell
     3. User clicks "Sign in with Google" → GIS popup
     4. On success → store profile in SESSION, show app, render topbar user
     5. Sign-out → clear SESSION, show onboarding again
*/
(function () {
  'use strict';

  /* ── CONFIG ── swap this value after getting your Client ID ─────────────── */
  var GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID';
  /* ────────────────────────────────────────────────────────────────────────── */

  /* In-memory session — never touches localStorage (sandbox-safe) */
  var SESSION = { user: null };

  /* ── DOM refs (resolved after DOMContentLoaded) ─────────────────────────── */
  function qs(s) { return document.querySelector(s); }

  /* ── Show/hide app vs onboarding ────────────────────────────────────────── */
  function showApp() {
    var ob = qs('#onboarding');
    var app = qs('#appShell');
    if (ob)  { ob.style.display  = 'none'; }
    if (app) { app.style.display = ''; }
    renderTopbarUser();
  }

  function showOnboarding() {
    var ob  = qs('#onboarding');
    var app = qs('#appShell');
    if (ob)  { ob.style.display  = ''; }
    if (app) { app.style.display = 'none'; }
  }

  /* ── Topbar user chip ───────────────────────────────────────────────────── */
  function renderTopbarUser() {
    var u = SESSION.user;
    var slot = qs('#userChip');
    if (!slot || !u) return;
    slot.innerHTML =
      '<div style="display:flex;align-items:center;gap:8px">' +
        (u.picture
          ? '<img src="' + u.picture + '" width="26" height="26" ' +
            'style="border-radius:50%;border:1px solid var(--border)" ' +
            'alt="' + u.name + '" referrerpolicy="no-referrer">'
          : '<div style="width:26px;height:26px;border-radius:50%;background:var(--primary-dim);' +
            'display:grid;place-items:center;font-size:11px;color:var(--primary);font-weight:700">' +
            (u.name ? u.name[0].toUpperCase() : '?') + '</div>') +
        '<span style="font-size:13px;font-weight:500;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
          u.name +
        '</span>' +
        '<button id="signOutBtn" title="Sign out" ' +
          'style="font-family:var(--mono);font-size:11px;padding:4px 9px;border-radius:var(--r-md);' +
          'border:1px solid var(--border);background:var(--surface-2);color:var(--text-muted);cursor:pointer;' +
          'transition:all 180ms cubic-bezier(.16,1,.3,1)">' +
          'Sign out' +
        '</button>' +
      '</div>';
    qs('#signOutBtn').addEventListener('click', signOut);
  }

  /* ── Google credential callback ─────────────────────────────────────────── */
  function handleCredential(response) {
    /* GIS returns a JWT — decode the payload (base64url middle segment) */
    try {
      var parts   = response.credential.split('.');
      var payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      SESSION.user = {
        id:      payload.sub,
        name:    payload.name    || payload.email,
        email:   payload.email,
        picture: payload.picture || ''
      };
      showApp();
    } catch (e) {
      console.error('PromptOS auth: failed to decode credential', e);
      showOnboarding();
    }
  }

  /* ── Sign out ───────────────────────────────────────────────────────────── */
  function signOut() {
    SESSION.user = null;
    /* Revoke GIS session so One Tap doesn't auto-sign back in */
    if (window.google && google.accounts && google.accounts.id) {
      google.accounts.id.disableAutoSelect();
    }
    showOnboarding();
  }

  /* ── Init GIS once the script is loaded ─────────────────────────────────── */
  function initGIS() {
    if (!window.google || !google.accounts || !google.accounts.id) {
      /* GIS script not loaded yet — retry */
      setTimeout(initGIS, 150);
      return;
    }
    google.accounts.id.initialize({
      client_id:  GOOGLE_CLIENT_ID,
      callback:   handleCredential,
      auto_select: false,
      cancel_on_tap_outside: true
    });

    /* Render the Google-styled button inside #gsiButton */
    var btnEl = qs('#gsiButton');
    if (btnEl) {
      google.accounts.id.renderButton(btnEl, {
        theme:  'filled_black',
        size:   'large',
        shape:  'pill',
        width:  260,
        text:   'signin_with'
      });
    }

    /* Also show One Tap prompt */
    google.accounts.id.prompt();
  }

  /* ── Boot ───────────────────────────────────────────────────────────────── */
  function boot() {
    /* Start hidden — auth decides what to show */
    showOnboarding();

    /* Load GIS script dynamically */
    var script = document.createElement('script');
    script.src  = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initGIS;
    document.head.appendChild(script);

    /* Expose signOut globally so other modules can call it */
    window.promptOSSignOut = signOut;
    window.promptOSSession = SESSION;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
