// MuslimEdu service worker — app-shell precache + runtime caching.
// PRECACHE and VERSION are injected at build time by build.mjs.
'use strict';

// Bumped to force every existing install to discard its old shell cache
// and refetch the app's JS/CSS. The browser only re-installs this worker
// when THIS FILE's bytes change, and same-origin scripts below are served
// stale-while-revalidate (cache first) - so uploading a new dashboard.js
// without touching this constant leaves every already-installed client
// serving the previously cached copy indefinitely, which looks exactly
// like "I deployed the fix and nothing changed".
// Change this string every time you deploy changed JS/CSS/PHP.
const VERSION = '20260830-wizard-step-order-01';
const PRECACHE = [
  "academic-analytics.js",
  "academic-analytics.php",
  "academic-setup.js",
  "academic-setup.php",
  "account-settings.js",
  "account-settings.php",
  "admin-dashboard.js",
  "admin-dashboard.php",
  "admission.js",
  "admission.php",
  "alumni-applications.js",
  "alumni-applications.php",
  "alumni-dashboard.js",
  "alumni-dashboard.php",
  "alumni-list.js",
  "alumni-list.php",
  "alumni-registration.js",
  "alumni-registration.php",
  "assets/fonts.css",
  "assets/fonts/dmsans-v17-rP2Fp2ywxg089UriCZa4ET-DNl0.woff2",
  "assets/fonts/dmsans-v17-rP2Fp2ywxg089UriCZa4Hz-D.woff2",
  "assets/fonts/dmsans-v17-rP2Hp2ywxg089UriCZ2IHSeH.woff2",
  "assets/fonts/dmsans-v17-rP2Hp2ywxg089UriCZOIHQ.woff2",
  "assets/fonts/playfairdisplay-v40-nuFRD-vYSZviVYUb_rj3ij__anPXDTnCjmHKM4nYO7KN_naUXt7A-W2r.woff2",
  "assets/fonts/playfairdisplay-v40-nuFRD-vYSZviVYUb_rj3ij__anPXDTnCjmHKM4nYO7KN_naUXtHA-Q.woff2",
  "assets/fonts/playfairdisplay-v40-nuFRD-vYSZviVYUb_rj3ij__anPXDTnCjmHKM4nYO7KN_naUXtXA-W2r.woff2",
  "assets/fonts/playfairdisplay-v40-nuFRD-vYSZviVYUb_rj3ij__anPXDTnCjmHKM4nYO7KN_naUXt_A-W2r.woff2",
  "assets/fonts/playfairdisplay-v40-nuFiD-vYSZviVYUb_rj3ij__anPXDTLYgFE_.woff2",
  "assets/fonts/playfairdisplay-v40-nuFiD-vYSZviVYUb_rj3ij__anPXDTPYgFE_.woff2",
  "assets/fonts/playfairdisplay-v40-nuFiD-vYSZviVYUb_rj3ij__anPXDTjYgFE_.woff2",
  "assets/fonts/playfairdisplay-v40-nuFiD-vYSZviVYUb_rj3ij__anPXDTzYgA.woff2",
  "assets/icons/apple-touch-icon.png",
  "assets/icons/favicon-16.png",
  "assets/icons/favicon-32.png",
  "assets/icons/favicon-48.png",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/icons/icon-maskable-512.png",
  "assets/icons/logo.jpg",
  "attendance-config.js",
  "attendance-config.php",
  "attendance.js",
  "attendance.php",
  "cashier-dashboard.js",
  "cashier-dashboard.php",
  "cashier-fees.js",
  "cashier-fees.php",
  "cashier-list.js",
  "cashier-list.php",
  "change-password.js",
  "change-password.php",
  "class-schedule.js",
  "class-schedule.php",
  "classes-sections.js",
  "classes-sections.php",
  "dashboard.css",
  "dashboard.js",
  "document-requests.js",
  "document-requests.php",
  "edit-profile.js",
  "edit-profile.php",
  "enrollment-fee-types.js",
  "enrollment-fee-types.php",
  "enrollment-stages.js",
  "enrollment-stages.php",
  "enrollment-status.js",
  "enrollment-status.php",
  "enrollment-students.js",
  "enrollment-students.php",
  "entry-guard.js",
  "facilities.js",
  "facilities.php",
  "fee-reports.js",
  "fee-reports.php",
  "grading-systems.js",
  "grading-systems.php",
  "institution-profile.js",
  "institution-profile.php",
  "login.js",
  "login.php",
  "manifest.webmanifest",
  "notifications.js",
  "notifications.php",
  "offline-data.js",
  "offline-status.js",
  "offline.html",
  "placeholder-dashboard.js",
  "placeholder-dashboard.php",
  "pwa.js",
  "qr.js",
  "register.js",
  "register.php",
  "registrar-dashboard.js",
  "registrar-dashboard.php",
  "registrar-list.js",
  "registrar-list.php",
  "setup-checklist.js",
  "setup-checklist.php",
  "staff-id-cards.js",
  "staff-id-cards.php",
  "student-dashboard.js",
  "student-dashboard.php",
  "student-documents.js",
  "student-documents.php",
  "student-grades.js",
  "student-grades.php",
  "student-id-card.js",
  "student-id-card.php",
  "student-id-cards.js",
  "student-id-cards.php",
  "student-progress.js",
  "student-progress.php",
  "student-quarterly-report.js",
  "student-quarterly-report.php",
  "student-schedule.js",
  "student-schedule.php",
  "student-services.js",
  "student-services.php",
  "student-staff-codes.js",
  "student-staff-codes.php",
  "student-subject-status.js",
  "student-subject-status.php",
  "student-upload-documents.js",
  "student-upload-documents.php",
  "students-list.js",
  "students-list.php",
  "subjects.js",
  "subjects.php",
  "superadmin-dashboard.js",
  "superadmin-dashboard.php",
  "superadmin-language.js",
  "superadmin-language.php",
  "teacher-attendance.js",
  "teacher-attendance.php",
  "teacher-dashboard.js",
  "teacher-dashboard.php",
  "teacher-grades.js",
  "teacher-grades.php",
  "teachers-list.js",
  "teachers-list.php"
];

const SHELL_CACHE = 'muslimedu-shell-' + VERSION;
const MEDIA_CACHE = 'muslimedu-media-v1';   // survives shell upgrades
const OFFLINE_URL = 'offline.html';

// Uploaded photos/logos/seals the API serves as ordinary images.
const MEDIA_ORIGIN = 'https://manhaje.com';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    // addAll() is atomic: one 404 would abandon the whole install and leave
    // the app with no offline shell at all, so failures are collected and
    // reported instead.
    const results = await Promise.allSettled(
      PRECACHE.map((url) => cache.add(new Request(url, { cache: 'reload' })))
    );
    const failed = results
      .map((r, i) => (r.status === 'rejected' ? PRECACHE[i] : null))
      .filter(Boolean);
    if (failed.length) console.warn('[sw] not precached:', failed);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.map((n) => {
      if (n.startsWith('muslimedu-shell-') && n !== SHELL_CACHE) return caches.delete(n);
      return null;
    }));
    if (self.registration.navigationPreload) {
      await self.registration.navigationPreload.enable();
    }
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// Serve from cache, refresh in the background for next time.
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, { ignoreSearch: false });
  const network = fetch(request)
    .then((res) => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);
  return cached || network.then((r) => r || Promise.reject(new Error('offline')));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // The API is POST-only. The Cache API cannot key on POST, so these are
  // left entirely to offline-data.js in the page — touching them here would
  // break uploads and double-handle every write.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preload = await event.preloadResponse;
        if (preload) {
          const cache = await caches.open(SHELL_CACHE);
          cache.put(request, preload.clone());
          return preload;
        }
        const fresh = await fetch(request);
        const cache = await caches.open(SHELL_CACHE);
        cache.put(request, fresh.clone());
        return fresh;
      } catch (err) {
        const cache = await caches.open(SHELL_CACHE);
        // Try the exact page, then the same path without a query string,
        // then the offline notice.
        return (await cache.match(request, { ignoreSearch: true }))
            || (await cache.match(OFFLINE_URL))
            || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
      }
    })());
    return;
  }

  // Same-origin static assets: scripts, styles, fonts, icons.
  if (url.origin === self.location.origin) {
    event.respondWith(
      staleWhileRevalidate(request, SHELL_CACHE).catch(() =>
        new Response('', { status: 504, statusText: 'Offline' }))
    );
    return;
  }

  // Uploaded media from the API host — keep whatever has been seen so cards
  // and avatars still render offline.
  if (url.origin === MEDIA_ORIGIN) {
    event.respondWith(
      staleWhileRevalidate(request, MEDIA_CACHE).catch(() =>
        new Response('', { status: 504, statusText: 'Offline' }))
    );
  }
});
