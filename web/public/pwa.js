// Service worker registration plus the small amount of UI that offline
// support needs: a connection banner, a pending-sync count, an update
// prompt, and the install button. Injected on every page.
(function () {
  'use strict';

  // ---- Styles (one injected <style>, so no page markup has to change) ---
  var css =
    // position:fixed, not an in-flow first child of <body> - several
    // public pages (register.php, login.php, alumni-registration.php)
    // give <body> its own `display:flex; align-items:center` to center a
    // fixed-size .screen phone-frame, and a plain prepended block becomes
    // a second flex item there instead of stacking above the page: it
    // shrinks to its content width and gets laid out beside .screen
    // rather than as a full-width bar on top of it. Fixed positioning
    // anchors it to the viewport regardless of whatever layout scheme
    // the host page's <body> happens to use.
    // Styled after the OS-level "No internet connection" indicator
    // (Chrome/Android's own offline bar): a slim, dark, icon+text-only
    // strip - no dot, no pill button - that turns emerald green once
    // back online instead of staying neutral white in every state.
    '.meo-bar{display:none;position:fixed;top:0;left:0;right:0;z-index:2147483000;' +
      'align-items:center;justify-content:center;gap:8px;' +
      'padding:calc(7px + env(safe-area-inset-top)) 14px 7px;' +
      'font:600 12.5px/1.3 "DM Sans",system-ui,sans-serif;color:#fff;' +
      'background:#1C1C1E;transition:background .2s ease}' +
    '.meo-bar.show{display:flex}' +
    '.meo-bar.synced{background:#0F7A3D}' +
    '.meo-icon{display:flex;flex:none;line-height:0}' +
    // The one remaining action (update-ready "Reload", failed-sync
    // "Dismiss") is a plain inline text link now, not a pill button -
    // keeps the bar reading as pure status text everywhere else.
    '.meo-bar .meo-link{font:600 12.5px inherit;color:inherit;background:none;' +
      'border:0;padding:0;text-decoration:underline;text-underline-offset:2px;' +
      'cursor:pointer;flex:none}' +
    '.meo-install{position:fixed;right:16px;bottom:16px;z-index:2147482999;display:none;' +
      'align-items:center;gap:10px;padding:12px 16px;border-radius:14px;background:#fff;' +
      'color:#0D1E1C;border:1px solid rgba(13,30,28,.1);box-shadow:0 12px 36px rgba(13,30,28,.16);' +
      'font:500 13px/1.4 "DM Sans",system-ui,sans-serif;max-width:min(340px,calc(100vw - 32px))}' +
    '.meo-install.show{display:flex}' +
    '.meo-install button{font:600 13px/1 "DM Sans",system-ui,sans-serif;cursor:pointer;' +
      'border-radius:100px;padding:8px 14px;border:0;background:#1A7A6E;color:#fff;white-space:nowrap}' +
    '.meo-install .meo-x{background:transparent;color:#6B8C88;padding:8px;font-size:16px}' +
    '@media print{.meo-bar,.meo-install{display:none!important}}' +
    // Pushes page content down instead of the fixed bar floating over it
    // (covering a topbar's back/language buttons underneath it) - --meo-
    // bar-h is kept at the bar's real rendered height while it's shown,
    // 0px otherwise, so this is a silent no-op on every page until the
    // bar actually appears. The three phone-frame pages (register.php,
    // login.php, alumni-registration.php) additionally shrink .screen's
    // own height by the same variable in their own stylesheets, so nothing
    // of the card runs past the bottom of the viewport once body's padding
    // eats into the space above it - see each of those files' .screen rule.
    'body{padding-top:var(--meo-bar-h,0px);transition:padding-top .2s ease}';

  var style = document.createElement('style');
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);

  // ---- Banner ----------------------------------------------------------
  // Cloud (online) / cloud-off (offline) - the only two icons this bar
  // ever shows, matching the Chrome-style connectivity indicator this
  // was modeled on. currentColor so they follow the bar's white text in
  // both the dark (offline) and green (online) states.
  var ICON_CLOUD = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h.79a4.5 4.5 0 1 1 0 9Z"/></svg>';
  var ICON_CLOUD_OFF = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22.6 17a5 5 0 0 0-4.6-7h-1.26a8 8 0 0 0-7.05-6M5 5 3 3m11.5 13H4a4 4 0 0 1-1.1-7.85M21 21 3 3"/></svg>';

  var bar, barIcon, barText, barBtn, hideTimer;
  function ensureBar() {
    if (bar) return bar;
    bar = document.createElement('div');
    bar.className = 'meo-bar';
    bar.setAttribute('role', 'status');
    bar.innerHTML = '<span class="meo-icon"></span><span class="meo-text"></span>';
    barBtn = document.createElement('button');
    barBtn.type = 'button';
    barBtn.className = 'meo-link';
    barBtn.style.display = 'none';
    bar.appendChild(barBtn);
    // Fixed positioning means DOM order doesn't affect where this
    // renders, but appending it last keeps it after any page-specific
    // fixed/absolute elements in source order, which is the more
    // predictable side to win a stacking-context tie if one ever comes up.
    document.body.appendChild(bar);
    barIcon = bar.querySelector('.meo-icon');
    barText = bar.querySelector('.meo-text');
    return bar;
  }

  // Keeps --meo-bar-h in sync with the bar's real rendered height (it can
  // span two lines on a narrow screen with a long message) so body's
  // padding-top - and .screen's height subtraction on the phone-frame
  // pages - always reserves exactly enough space, never more or less.
  function updateBarSpacer() {
    var h = (bar && bar.classList.contains('show')) ? bar.offsetHeight : 0;
    document.documentElement.style.setProperty('--meo-bar-h', h + 'px');
  }
  window.addEventListener('resize', updateBarSpacer);

  function showBar(text, kind, action) {
    ensureBar();
    clearTimeout(hideTimer);
    barIcon.innerHTML = kind === 'offline' ? ICON_CLOUD_OFF : kind === 'synced' ? ICON_CLOUD : '';
    barText.textContent = text;
    bar.className = 'meo-bar show' + (kind ? ' ' + kind : '');
    if (action) {
      barBtn.textContent = action.label;
      barBtn.onclick = action.onClick;
      barBtn.style.display = '';
    } else {
      barBtn.style.display = 'none';
    }
    updateBarSpacer();
    if (action || kind === 'offline') return;
    hideTimer = setTimeout(hideBar, 4000);
  }
  function hideBar() {
    if (!bar) return;
    bar.className = 'meo-bar';
    updateBarSpacer();
  }

  // ---- Connection state ------------------------------------------------
  // Uploading is manual-only now (Offline & Sync's "Upload Now") - this
  // bar only ever reports the queue's status, it never triggers a flush
  // itself, on reconnect or otherwise.
  function pendingSuffix(n) {
    return n ? ' · ' + n + ' change' + (n === 1 ? '' : 's') + ' waiting to upload' : '';
  }

  function refreshOfflineBanner() {
    var api = window.MuslimEduOffline;
    var done = function (n) {
      if (!navigator.onLine) {
        showBar('No internet connection' + pendingSuffix(n), 'offline');
      } else if (n) {
        showBar(n + ' change' + (n === 1 ? '' : 's') + ' waiting to upload', 'synced');
      } else {
        hideBar();
      }
    };
    if (api) api.pendingCount().then(done, function () { done(0); });
    else done(0);
  }

  window.addEventListener('online', function () {
    showBar('Back online', 'synced');
    setTimeout(refreshOfflineBanner, 400);
  });
  window.addEventListener('offline', refreshOfflineBanner);

  window.addEventListener('muslimedu:queued', refreshOfflineBanner);
  window.addEventListener('muslimedu:synced', function (e) {
    var d = (e && e.detail) || {};
    if (d.failed && d.failed.length) {
      showBar(d.failed.length + ' offline change' + (d.failed.length === 1 ? '' : 's') +
        ' could not be saved — please re-enter ' + (d.failed.length === 1 ? 'it' : 'them'), 'offline',
        { label: 'Dismiss', onClick: hideBar });
    } else if (d.synced) {
      showBar(d.synced + ' change' + (d.synced === 1 ? '' : 's') + ' synced', 'synced');
    }
  });

  // ---- Install prompt --------------------------------------------------
  // login.php and register.php are reached via index.html's own install
  // screen (or a direct deep link), so the floating banner would just be
  // repeating a choice the user already made or was never shown yet -
  // suppress it there. deferredPrompt itself is still captured so
  // data-install-then CTAs on those pages keep working.
  var NO_INSTALL_BANNER_PAGES = /\/(login|register)\.php$/;
  function installBannerSuppressed() {
    return NO_INSTALL_BANNER_PAGES.test(window.location.pathname);
  }

  var deferredPrompt = null, installEl;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    if (installBannerSuppressed()) return;
    if (sessionStorage.getItem('meo-install-dismissed')) return;
    if (!installEl) {
      installEl = document.createElement('div');
      installEl.className = 'meo-install';
      installEl.innerHTML = '<span style="flex:1">Install MuslimEdu for offline access</span>';
      var ok = document.createElement('button');
      ok.type = 'button'; ok.textContent = 'Install';
      ok.onclick = function () {
        installEl.classList.remove('show');
        deferredPrompt.prompt();
        deferredPrompt.userChoice.finally(function () { deferredPrompt = null; });
      };
      var x = document.createElement('button');
      x.type = 'button'; x.className = 'meo-x'; x.textContent = '✕';
      x.setAttribute('aria-label', 'Dismiss');
      x.onclick = function () {
        installEl.classList.remove('show');
        try { sessionStorage.setItem('meo-install-dismissed', '1'); } catch (err) {}
      };
      installEl.appendChild(ok); installEl.appendChild(x);
      document.body.appendChild(installEl);
    }
    installEl.classList.add('show');
  });

  // ---- "Install app" CTAs -----------------------------------------------
  // Any link/button with data-install-then="<url>" tries to install the
  // PWA first; on acceptance it navigates to that URL instead of its own
  // href. Installing is always a
  // bonus step, never a blocker: if the app's already installed, the
  // browser never fired beforeinstallprompt (no support, or it already
  // fired once this session and got consumed), or the user dismisses the
  // native prompt, the link just falls through to its normal href.
  function isStandalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      navigator.standalone === true;
  }
  function wireInstallCtas() {
    var els = document.querySelectorAll('[data-install-then]');
    if (!els.length) return;
    els.forEach(function (el) {
      el.addEventListener('click', function (e) {
        if (isStandalone() || !deferredPrompt) return; // let the normal href happen
        e.preventDefault();
        var redirectUrl = el.getAttribute('data-install-then');
        var fallbackUrl = el.getAttribute('href') || redirectUrl;
        var promptToUse = deferredPrompt;
        deferredPrompt = null;
        if (installEl) installEl.classList.remove('show');
        promptToUse.prompt();
        promptToUse.userChoice.then(function (choice) {
          window.location.href = (choice && choice.outcome === 'accepted') ? redirectUrl : fallbackUrl;
        }).catch(function () {
          window.location.href = fallbackUrl;
        });
      });
    });
  }
  document.addEventListener('DOMContentLoaded', wireInstallCtas);
  if (document.readyState !== 'loading') wireInstallCtas();

  // ---- Registration + update flow --------------------------------------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js', { scope: './' }).then(function (reg) {
        reg.addEventListener('updatefound', function () {
          var sw = reg.installing;
          if (!sw) return;
          sw.addEventListener('statechange', function () {
            // A previous controller means this is an upgrade, not first install.
            if (sw.state === 'installed' && navigator.serviceWorker.controller) {
              showBar('A new version of MuslimEdu is ready', null, {
                label: 'Reload',
                onClick: function () { sw.postMessage({ type: 'SKIP_WAITING' }); }
              });
            }
          });
        });
      }).catch(function (err) {
        console.warn('[pwa] service worker registration failed:', err);
      });

      // Only an *upgrade* should reload. On a first visit the freshly
      // activated worker calls clients.claim(), which also fires
      // controllerchange — reloading there would bounce every new user's
      // very first page load for no reason.
      var hadController = !!navigator.serviceWorker.controller;
      var reloading = false;
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (!hadController || reloading) return;
        reloading = true;
        window.location.reload();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', refreshOfflineBanner);
  if (document.readyState !== 'loading') refreshOfflineBanner();
})();
