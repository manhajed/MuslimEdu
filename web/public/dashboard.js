// Shared across every *-dashboard.php and utility page: route guard,
// header population, logout, an inline-SVG icon set, and a toast for
// menu items that don't have a web page yet.
const API_BASE_URL = 'https://manhaje.com/apps/api';
const ENDPOINTS = { me: API_BASE_URL + '/me', logout: API_BASE_URL + '/logout' };
const TOKEN_KEY = 'muslimedu_auth_token';

// Ported from config/api.ts's absoluteUrl() - the backend returns image/
// file fields (photos, logos, seals, signatures, uploaded documents, ID
// card backgrounds) as paths relative to the API server, never as full
// URLs. Every <img>/<a href> built from an API response needs to run
// through this or it 404s silently (a broken-image icon, not an error
// anywhere obvious) - this was missing app-wide until now, so any image
// that looked broken on the web pages was this, not a bad upload.
const ASSET_DOMAIN = 'https://manhaje.com';
const ASSET_BASE_PATH = 'apps/public';
function absoluteUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  if (/^data:/i.test(path)) return path;
  let p = path.replace(/^\/+/, '');
  p = p.replace(/^apps\//i, '');
  p = p.replace(/^public\//i, '');
  return ASSET_DOMAIN + '/' + ASSET_BASE_PATH + '/' + p;
}

function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}
function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

// ── Localization ─────────────────────────────────────────────────────
// Every *-dashboard.php page (via guardDashboard below, once /me resolves)
// fetches the signed-in user's saved language (user_settings.language) and
// loads /academic_locale_bundle for it - same endpoint/table
// LocaleContext.tsx already drives live in the React Native app. Two ways
// a page picks up a translation:
//   1. Static markup: give an element data-i18n="some.key" (and
//      data-i18n-placeholder="some.key" for an input placeholder) -
//      applyDomTranslations() below swaps it automatically, no JS needed.
//   2. JS-built strings (e.g. a row title built from a template): call
//      t('some.key', 'English fallback') where the string is built, and
//      register the render function with onLocaleChange() so it re-runs
//      once the real bundle arrives (translations load asynchronously,
//      after whatever already rendered with the English fallback).
// A key with no saved translation just returns its fallback - there's no
// "half translated" broken state, only English peeking through until
// someone adds that key on the superadmin Languages page.
const LOCALE_KEY = 'muslimedu_locale';
const LOCALE_CACHE_KEY = 'muslimedu_locale_bundle';
let CURRENT_LOCALE = localStorage.getItem(LOCALE_KEY) || 'en';
let CURRENT_TRANSLATIONS = {};
let CURRENT_IS_RTL = false;
const LOCALE_LISTENERS = [];

// Warm-start from whatever bundle got cached on a previous page load, so
// there's no flash of English while this page's own network round-trip
// to /academic_locale_bundle is still in flight. Self-heals the moment
// loadLocale() below resolves with whatever the server actually has now.
(function hydrateLocaleFromCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(LOCALE_CACHE_KEY) || 'null');
    if (cached && cached.locale === CURRENT_LOCALE) {
      CURRENT_TRANSLATIONS = cached.translations || {};
      CURRENT_IS_RTL = !!cached.is_rtl;
    }
  } catch (e) { /* corrupt/blocked storage - fall through with English defaults */ }
})();

function t(key, fallback) {
  return (CURRENT_TRANSLATIONS && CURRENT_TRANSLATIONS[key]) || fallback || key;
}

function onLocaleChange(fn) {
  LOCALE_LISTENERS.push(fn);
}

function applyRTL(isRTL) {
  CURRENT_IS_RTL = !!isRTL;
  document.documentElement.setAttribute('dir', CURRENT_IS_RTL ? 'rtl' : 'ltr');
  document.documentElement.classList.toggle('rtl', CURRENT_IS_RTL);
}

function applyDomTranslations(root) {
  (root || document).querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    // Cache the original (English) text on first pass, so switching back
    // to English - or a key nothing has translated yet - restores the
    // real fallback instead of re-reading whatever the last language left
    // in textContent.
    if (!el.hasAttribute('data-i18n-original')) el.setAttribute('data-i18n-original', el.textContent);
    el.textContent = t(key, el.getAttribute('data-i18n-original'));
  });
  (root || document).querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (!el.hasAttribute('data-i18n-placeholder-original')) el.setAttribute('data-i18n-placeholder-original', el.getAttribute('placeholder') || '');
    el.setAttribute('placeholder', t(key, el.getAttribute('data-i18n-placeholder-original')));
  });
}
onLocaleChange(() => applyDomTranslations());
applyRTL(CURRENT_IS_RTL);
applyDomTranslations();

function applyLocale(bundle) {
  const incoming = bundle.translations || {};
  const count = Object.keys(incoming).length;
  CURRENT_LOCALE = bundle.locale || CURRENT_LOCALE;

  // A non-English locale that comes back with ZERO translation rows means
  // the seed never landed for it (wrong DB, the school_id-NOT-NULL insert
  // failure, or nobody has added that language's words yet) - NOT that
  // every string is deliberately blank. Caching that empty set is what
  // makes the bug stick: every later page load hydrates the empty cache,
  // t() falls through to English for everything, and the only visible
  // symptom is dir="rtl" flipping punctuation on otherwise-English text.
  // So: keep whatever translations we already had, shout once in the
  // console, and leave the cache alone so a later good response can fix
  // it. RTL still applies - the locale IS Arabic, it just has no words.
  if (count === 0 && CURRENT_LOCALE !== 'en') {
    // eslint-disable-next-line no-console
    console.warn(
      '[locale] "' + CURRENT_LOCALE + '" returned 0 translations from /academic_locale_bundle. ' +
      'The UI will stay in English. Check that the seed rows exist: ' +
      "SELECT COUNT(*) FROM academic_translations WHERE locale='" + CURRENT_LOCALE + "' AND school_id IS NULL;"
    );
    applyRTL(bundle.is_rtl);
    localStorage.setItem(LOCALE_KEY, CURRENT_LOCALE);
    LOCALE_LISTENERS.forEach(fn => { try { fn(); } catch (e) { /* one bad listener shouldn't break the rest */ } });
    return;
  }

  CURRENT_TRANSLATIONS = incoming;
  applyRTL(bundle.is_rtl);
  localStorage.setItem(LOCALE_KEY, CURRENT_LOCALE);
  try {
    localStorage.setItem(LOCALE_CACHE_KEY, JSON.stringify({ locale: CURRENT_LOCALE, translations: CURRENT_TRANSLATIONS, is_rtl: CURRENT_IS_RTL }));
  } catch (e) { /* storage full/blocked - cache is a nice-to-have, not required */ }
  LOCALE_LISTENERS.forEach(fn => { try { fn(); } catch (e) { /* one bad listener shouldn't break the rest */ } });
}

// Fetches the bundle for `locale` (defaults to whatever's already known -
// cached or 'en') and applies it. account-settings.js calls this directly
// right after saving a new language choice, so the switch is visible
// immediately with no page reload; guardDashboard calls it automatically
// on every guarded page once auth resolves.
//
// Errors are logged, never swallowed: a silent catch here was the whole
// reason a failing bundle request looked like "the language switch just
// doesn't work" with nothing in the console to act on.
function loadLocale(token, locale) {
  if (locale) CURRENT_LOCALE = locale;
  return authedPost('/academic_locale_bundle', token, CURRENT_LOCALE ? { locale: CURRENT_LOCALE } : {})
    .then(applyLocale)
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[locale] /academic_locale_bundle failed for "' + CURRENT_LOCALE + '":', err && err.message ? err.message : err);
      return null;
    });
}

// Console handle for diagnosing a stuck language, e.g.
//   MuslimEduLocale.state()   -> what this page currently has loaded
//   MuslimEduLocale.reload()  -> force a fresh fetch, bypassing the cache
//   MuslimEduLocale.clear()   -> drop the cached bundle and reload the page
// Deliberately tiny and read-only-ish; it exists because a wrong locale is
// otherwise invisible from the outside.
window.MuslimEduLocale = {
  state: function () {
    return {
      locale: CURRENT_LOCALE,
      isRTL: CURRENT_IS_RTL,
      translationCount: Object.keys(CURRENT_TRANSLATIONS || {}).length,
      sample: Object.keys(CURRENT_TRANSLATIONS || {}).slice(0, 5),
    };
  },
  reload: function () {
    try { localStorage.removeItem(LOCALE_CACHE_KEY); } catch (e) { /* ignore */ }
    return loadLocale(getStoredToken(), CURRENT_LOCALE);
  },
  clear: function () {
    try {
      localStorage.removeItem(LOCALE_CACHE_KEY);
      localStorage.removeItem(LOCALE_KEY);
    } catch (e) { /* ignore */ }
    window.location.reload();
  },
};

function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 1800);
}

function notWiredYet() {
  showToast('Feature not available');
}

// CSP is script-src 'self' with no 'unsafe-inline', which blocks inline
// onclick="" attributes the same as inline <script> blocks - this
// delegated listener replaces them all: markup marks itself with
// data-action="not-wired" instead.
document.addEventListener('click', function (e) {
  const el = e.target.closest('[data-action="not-wired"]');
  if (el) notWiredYet();
});

// Same reasoning as guardDashboard's /me fetch: a bare fetch() has no
// timeout, so one stalled endpoint (any admin_*_list call behind the
// Setup Checklist, most visibly) would hang its Promise.all forever with
// no error, no retry, just a spinner/blank screen that never resolves.
// 15s is generous but bounded, and unlike /me's dashboard-blocking check
// this one is a background data call, so a timeout should reject cleanly
// into this function's existing error handling rather than tear down the
// session - callers that already .catch() (e.g. fetchSetupChecklistItems)
// pick this up for free.
const AUTHED_POST_TIMEOUT_MS = 15000;
function authedPost(path, token, body) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AUTHED_POST_TIMEOUT_MS);
  return fetch(API_BASE_URL + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify(body || {}),
    signal: controller.signal,
  }).catch(err => {
    if (err && err.name === 'AbortError') throw new Error('Request timed out. Please check your connection and try again.');
    throw err;
  }).then(res => {
    clearTimeout(timeoutId);
    return res.json().catch(() => ({})).then(data => {
      // Laravel's own validator failures (16 endpoints as of this backend,
      // admin_classes_create among them) return {"errors": {...}} on 422
      // with no top-level "message" key at all - every admin form that
      // hits a real validation error (duplicate class code, a required
      // field left off, etc.) was showing the useless generic "Request
      // failed (422)" below instead of what actually went wrong, on every
      // screen that calls authedPost. firstValidationError() is the same
      // fallback updateMyProfile() already uses for this exact shape.
      if (!res.ok) throw new Error((data && data.message) || firstValidationError(data) || 'Request failed (' + res.status + ')');
      return data;
    });
  });
}

// Account/Profile endpoints, shared by account-settings.js, edit-profile.js,
// change-password.js and notifications.js.
function fetchUserSettings(token) {
  return authedPost('/user_settings_show', token);
}
function saveUserSettings(token, settings) {
  return authedPost('/user_settings_save', token, settings);
}
function updatePassword(token, currentPassword, newPassword) {
  return authedPost('/user_password_update', token, {
    current_password: currentPassword,
    new_password: newPassword,
    new_password_confirmation: newPassword,
  });
}
// Laravel sends { errors: { field: ["message"] } }, but a hand-rolled
// endpoint may send { errors: { field: "message" } }. Indexing [0] blindly
// turns that second shape into the single character "m", so check first.
function firstValidationError(data) {
  if (!data || !data.errors || typeof data.errors !== 'object') return null;
  const first = Object.values(data.errors)[0];
  if (Array.isArray(first)) return typeof first[0] === 'string' ? first[0] : null;
  return typeof first === 'string' ? first : null;
}

// input may include: name, name_ar, email, phone, address, gender,
// birthday, emergency_contact_name, emergency_contact_phone, photoFile -
// all optional (see me_profile_update's filled()-gated handling: omitting
// a key here leaves that field untouched server-side, it does not clear
// it). Same field set admission.js/student-preregister.php collect, kept
// in sync so a student can correct anything entered about them at
// admission or pre-registration time, not just view it.
function updateMyProfile(token, input) {
  let body;
  let headers = { Accept: 'application/json', Authorization: 'Bearer ' + token };
  const TEXT_FIELDS = ['name', 'name_ar', 'email', 'phone', 'address', 'gender', 'birthday', 'emergency_contact_name', 'emergency_contact_phone'];
  if (input.photoFile) {
    const form = new FormData();
    TEXT_FIELDS.forEach(key => { if (input[key]) form.append(key, input[key]); });
    form.append('photo', input.photoFile, input.photoFile.name || 'photo.jpg');
    body = form;
  } else {
    headers['Content-Type'] = 'application/json';
    const json = {};
    TEXT_FIELDS.forEach(key => { if (input[key] !== undefined) json[key] = input[key]; });
    body = JSON.stringify(json);
  }
  return fetch(API_BASE_URL + '/me_profile_update', { method: 'POST', headers, body })
    .then(res => res.json().catch(() => ({})).then(data => {
      if (!res.ok) {
        const msg = (data && data.message) || firstValidationError(data) || 'Request failed (' + res.status + ')';
        throw new Error(msg);
      }
      return data.user;
    }));
}
function fetchNotifications(token, cursor) {
  return authedPost('/notifications_list', token, cursor ? { cursor } : {});
}
function markNotificationRead(token, id) {
  return authedPost('/notifications_mark_read', token, { id });
}
function markAllNotificationsRead(token) {
  return authedPost('/notifications_mark_all_read', token);
}
function fetchUnreadNotificationCount(token) {
  return authedPost('/notifications_unread_count', token);
}

// Red badge on the bottom nav's bell icon. Called once from guardDashboard
// after every page's onReady runs (so #bottomNav already exists), and again
// after any action that changes the unread count (marking read, etc) -
// see notifications.js. Silently does nothing if the nav isn't on the page
// or the request fails, since a missing badge is never worth surfacing an
// error over.
function refreshNotifBadge(token) {
  const bell = document.querySelector('#bottomNav a[href="notifications.php"]');
  if (!bell) return;
  fetchUnreadNotificationCount(token).then(data => {
    const count = (data && data.unread_count) || 0;
    let badge = bell.querySelector('.bn-badge');
    if (count > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'bn-badge';
        bell.appendChild(badge);
      }
      badge.textContent = count > 9 ? '9+' : String(count);
    } else if (badge) {
      badge.remove();
    }
  }).catch(() => {});
}

// Shared header for every non-dashboard page: circular back button, big
// title, optional subtitle, optional pill action button. Injects into
// #utilHeaderWrap.
//
// backHref/action.onClick are wired via a real click listener after
// injection rather than a javascript: URI - CSP's script-src blocks those
// too.
function renderUtilHeader(title, subtitle, backHref, action) {
  document.body.classList.add('util-page');
  const backTag = backHref ? 'a' : 'button';
  const backOpen = backHref
    ? '<a class="page-back-btn" href="' + escapeHtml(backHref) + '" aria-label="Back">'
    : '<button type="button" class="page-back-btn" id="utilBackBtn" aria-label="Back">';
  const actionTag = action ? (action.href ? 'a' : 'button') : null;
  const actionHtml = action
    ? '<' + actionTag + ' class="page-add-btn"' +
        (action.href ? ' href="' + escapeHtml(action.href) + '"' : ' type="button" id="utilHeaderActionBtn"') +
        '>' + escapeHtml(action.label) + '</' + actionTag + '>'
    : '';
  const html =
    '<div class="page-header">' +
      '<div class="page-header-row">' +
        backOpen + icon('chevronleft', { size: 22, color: 'var(--ink)' }) + '</' + backTag + '>' +
        actionHtml +
      '</div>' +
      '<div class="page-hero-fade" id="pageHeroFade">' +
        '<div class="page-title">' + escapeHtml(title) + '</div>' +
        (subtitle ? '<div class="page-subtitle">' + escapeHtml(subtitle) + '</div>' : '') +
      '</div>' +
    '</div>';
  requestAnimationFrame(() => {
    if (!backHref) {
      document.getElementById('utilBackBtn')?.addEventListener('click', () => {
        if (window.history.length > 1) window.history.back();
        else window.location.href = 'login.php';
      });
    }
    if (action && !action.href) {
      document.getElementById('utilHeaderActionBtn')?.addEventListener('click', action.onClick);
    }
    // Same fade-on-scroll treatment as the dashboards' .hero-bg
    // (wireParallax()), scaled to this page's own title/subtitle block
    // instead of a full hero banner - title+subtitle dissolve into the
    // frosted .page-header-row as they scroll under it instead of
    // hitting its edge flatly.
    const fadeEl = document.getElementById('pageHeroFade');
    if (fadeEl) wireParallax('pageHeroFade', fadeEl.offsetHeight || 60);
  });
  return html;
}

// Bottom sheet option picker (tap to select and save). Creates the
// backdrop once and reuses it for every row's picker on the page.
function openOptionSheet(title, options, currentKey, onPick) {
  let backdrop = document.getElementById('optionSheetBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'optionSheetBackdrop';
    backdrop.className = 'sheet-backdrop';
    backdrop.innerHTML = '<div class="sheet-panel"><div class="sheet-handle"></div><div class="sheet-title" id="sheetTitle"></div><div id="sheetOptions"></div></div>';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) closeOptionSheet(); });
  }
  document.getElementById('sheetTitle').textContent = title;
  const optsEl = document.getElementById('sheetOptions');
  optsEl.innerHTML = options.map(opt =>
    '<button class="sheet-option" type="button" data-key="' + escapeHtml(opt.key) + '">' +
      '<span class="sheet-option-label' + (opt.key === currentKey ? ' selected' : '') + '">' + escapeHtml(opt.label) + '</span>' +
      '<span class="sheet-option-mark">' + (opt.key === currentKey ? '<span class="sheet-check">' + icon('check', { size: 13, color: '#fff' }) + '</span>' : '') + '</span>' +
    '</button>'
  ).join('');
  optsEl.querySelectorAll('.sheet-option').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.saving) return;
      const key = btn.dataset.key;
      const markEl = btn.querySelector('.sheet-option-mark');
      markEl.innerHTML = '<span class="sheet-spinner"></span>';
      btn.dataset.saving = '1';
      Promise.resolve(onPick(key)).then(() => {
        closeOptionSheet();
      }).catch(() => {
        markEl.innerHTML = '';
        delete btn.dataset.saving;
        showToast('Could not save. Try again.');
      });
    });
  });
  backdrop.classList.add('open');
}
function closeOptionSheet() {
  document.getElementById('optionSheetBackdrop')?.classList.remove('open');
}

// Admin dashboard's Academic Analytics widget - mirrors AnalyticsCard.tsx.
// Shown for every non-orphan school (mahad/madrasa/markaz/regular_school);
// orphan schools get their own SchoolIdentityCard + MonthlyReportsCard
// pairing instead (see loadOrphanDashboardCards in admin-dashboard.js).
function fetchAdminAcademicAnalytics(token, period) {
  return authedPost('/admin_academic_analytics_dashboard', token, { period: period || 'current' });
}
function fetchAdminAttendanceTrend(token) {
  return authedPost('/admin_academic_analytics_attendance_trend', token).then(d => d.trend || []);
}
// SubscriptionStatusCard.tsx's data source - platform subscription state
// (package, expiry, pending self-serve request) for the calling admin's
// own school. Set by the superadmin from SuperAdminSchoolSubscription, or
// by approving a request submitted from this same status.
function fetchAdminSubscriptionStatus(token) {
  return authedPost('/admin_subscription_status', token);
}
// subscriptionService.ts's fetchAdminSubscriptionPackages/submitSubscriptionRequest -
// the self-serve "browse plans, request one" flow (SubscribeScreen.tsx /
// SubscriptionDetailsScreen.tsx's switch-plan section) used by
// subscription.js.
function fetchAdminSubscriptionPackages(token) {
  return authedPost('/admin_subscription_packages', token).then(d => d.packages);
}
function submitSubscriptionRequest(token, input) {
  return authedPost('/admin_subscription_request_create', token, input).then(d => d.request);
}
function fetchAdminSchoolProfile(token) {
  return authedPost('/admin_school_setup_status', token).then(d => d.school || null);
}
// Full setup-status payload (school + the server's own enum option lists) -
// InstitutionProfileScreen.tsx's fetchSetupStatus(), used by
// institution-profile.js so the Institution Type / Calendar Type /
// Academic Year Structure / Program Duration chip rows always match
// whatever the backend currently supports instead of a hardcoded list.
function fetchAdminSetupStatus(token) {
  return authedPost('/admin_school_setup_status', token);
}
// saveInstitutionProfile() - plain JSON post when there's nothing to
// upload, multipart when logo/seal files are attached (matches the RN
// service's own hasFiles branch exactly).
function saveInstitutionProfile(token, input, files) {
  files = files || {};
  const hasFiles = !!files.logo || !!files.seal;
  if (!hasFiles) {
    return authedPost('/admin_school_profile_update', token, input).then(d => d.school);
  }
  const form = new FormData();
  Object.keys(input).forEach(key => {
    const value = input[key];
    if (value === undefined || value === null) return;
    if (key === 'working_days' && Array.isArray(value)) {
      value.forEach(day => form.append('working_days[]', String(day)));
      return;
    }
    form.append(key, String(value));
  });
  if (files.logo) form.append('logo', files.logo, files.logo.name || 'logo.jpg');
  if (files.seal) form.append('seal', files.seal, files.seal.name || 'seal.jpg');
  return fetch(API_BASE_URL + '/admin_school_profile_update', {
    method: 'POST',
    headers: { Accept: 'application/json', Authorization: 'Bearer ' + token },
    body: form,
  }).then(res => res.json().catch(() => ({})).then(data => {
    if (!res.ok) throw new Error((data && data.message) || 'Request failed (' + res.status + ')');
    return data.school;
  }));
}
// Web port of MonthlyReportsCard.tsx's data source - submitted/missing
// counts for this month's orphan child reports.
function fetchAdminOrphanReportOverview(token) {
  return authedPost('/admin_orphan_report_overview', token);
}
function isOrphanSchoolUser(user) {
  return !!user && (user.institution_type === 'orphanage' || user.is_orphan === true);
}
// Web port of src/utils/orphanSchool.ts's isQuranTrackingSchoolUser() -
// Quran memorization tracking (surah, juz, memorization status) is scoped
// to Markaz schools only, explicitly not Madrasa/Mahad/Regular/Orphanage.
function isQuranTrackingSchoolUser(user) {
  return !!user && user.institution_type === 'markaz';
}


// The 12 readiness checks behind the Admin dashboard's Setup Checklist
// ring - "done" if a check returns at least one row. A failed individual
// check counts as "not done" (fail-open).
function fetchSetupChecklistProgress(token) {
  const checks = [
    () => authedPost('/admin_sessions_list', token).then(d => (d.sessions || []).length),
    () => authedPost('/admin_grading_systems_list', token).then(d => (d.grading_systems || []).length),
    () => authedPost('/admin_class_list', token).then(d => (d.classes || d.data || []).length),
    () => authedPost('/admin_subjects_catalog_list', token).then(d => (d.subjects || []).length),
    () => Promise.all([
      authedPost('/admin_student_number_format_show', token, { target_type: 'student' }),
      authedPost('/admin_student_number_format_show', token, { target_type: 'staff' }),
    ]).then(([student, staff]) => {
      const configured = d => (d.issued_count || 0) > 0 || !!(d.format && d.format.id);
      return configured(student) && configured(staff) ? 1 : 0;
    }),
    () => authedPost('/admin_teacher_list', token).then(d => (d.teachers || []).length),
    () => authedPost('/admin_accountant_list', token).then(d => (d.accountants || []).length),
    () => authedPost('/admin_registrar_list', token).then(d => (d.registrars || []).length),
    () => authedPost('/admin_schedule_list', token).then(d => (d.schedules || []).length),
    () => authedPost('/admin_attendance_method_list', token).then(d => (d.methods || []).length),
    () => authedPost('/admin_enrollment_stages_list', token).then(d => (d.stages || []).length),
    () => authedPost('/admin_enrollment_fee_types_list', token).then(d => (d.fee_types || []).length),
  ];
  return Promise.all(checks.map(run => run().then(n => n > 0).catch(() => false)))
    .then(results => ({ doneCount: results.filter(Boolean).length, total: checks.length }));
}

// Per-item version of the same checks, for the full Setup Checklist
// overview page.
function fetchSetupChecklistItems(token) {
  const defs = [
    { key: 'academic_year', title: 'Academic Year', desc: 'At least one school year with a current year set.', category: 'foundation', icon: 'calendar',
      run: () => authedPost('/admin_sessions_list', token).then(d => (d.sessions || []).length) },
    { key: 'grading', title: 'Grading System', desc: 'How grades are scored and reported.', category: 'foundation', icon: 'star',
      run: () => authedPost('/admin_grading_systems_list', token).then(d => (d.grading_systems || []).length) },
    { key: 'classes', title: 'Classes & Sections', desc: 'Create classes, then sections (with room + adviser) inside them.', category: 'foundation', icon: 'layers',
      run: () => authedPost('/admin_class_list', token).then(d => (d.classes || d.data || []).length) },
    { key: 'subjects', title: 'Subjects', desc: 'The subject catalog sections and schedules pull from.', category: 'foundation', icon: 'book',
      run: () => authedPost('/admin_subjects_catalog_list', token).then(d => (d.subjects || []).length) },
    { key: 'student_staff_codes', title: 'Student & Staff Codes', desc: 'The code format assigned automatically to new students and staff.', category: 'foundation', icon: 'idcard',
      run: () => Promise.all([
        authedPost('/admin_student_number_format_show', token, { target_type: 'student' }),
        authedPost('/admin_student_number_format_show', token, { target_type: 'staff' }),
      ]).then(([student, staff]) => {
        const configured = d => (d.issued_count || 0) > 0 || !!(d.format && d.format.id);
        return configured(student) && configured(staff) ? 1 : 0;
      }) },
    { key: 'teachers', title: 'Teacher Accounts', desc: 'Create logins for the teachers who will use the app.', category: 'staff', icon: 'gradcap',
      run: () => authedPost('/admin_teacher_list', token).then(d => (d.teachers || []).length) },
    { key: 'cashiers', title: 'Cashier Accounts', desc: 'Create logins for staff who collect and record fees.', category: 'staff', icon: 'creditcard',
      run: () => authedPost('/admin_accountant_list', token).then(d => (d.accountants || []).length) },
    { key: 'registrars', title: 'Registrar Accounts', desc: 'Create logins for staff who manage admissions and enrollment.', category: 'staff', icon: 'clipboard',
      run: () => authedPost('/admin_registrar_list', token).then(d => (d.registrars || []).length) },
    { key: 'schedule', title: 'Class Schedule', desc: 'Assign subject, teacher, room and time to each section.', category: 'foundation', icon: 'clock',
      run: () => authedPost('/admin_schedule_list', token).then(d => (d.schedules || []).length) },
    { key: 'attendance', title: 'Attendance Config', desc: 'Which capture methods (manual, QR, face) are active.', category: 'operations', icon: 'camera',
      run: () => authedPost('/admin_attendance_method_list', token).then(d => (d.methods || []).length) },
    { key: 'enrollment_stages', title: 'Enrollment Stages', desc: 'The admission pipeline students move through.', category: 'enrollment', icon: 'flag',
      run: () => authedPost('/admin_enrollment_stages_list', token).then(d => (d.stages || []).length) },
    { key: 'fee_types', title: 'Fee Types', desc: 'Tuition, miscellaneous, service fees - what enrollment collects.', category: 'enrollment', icon: 'banknote',
      run: () => authedPost('/admin_enrollment_fee_types_list', token).then(d => (d.fee_types || []).length) },
  ];
  return Promise.all(defs.map(d => d.run().then(count => ({ ...d, status: count > 0 ? 'done' : 'todo', count })).catch(() => ({ ...d, status: 'error', count: null }))));
}

// Every item now has a real config page behind it, so each one is a link
// out to where an admin actually fixes it - shared by setup-checklist.js
// (the normal, browsable page) and the gate screen below (the forced
// pre-dashboard view), so both stay in sync with one map.
const SETUP_CHECKLIST_HREF_BY_KEY = {
  academic_year: 'academic-setup.php',
  grading: 'grading-systems.php',
  classes: 'classes-sections.php',
  subjects: 'subjects.php',
  student_staff_codes: 'student-staff-codes.php',
  teachers: 'teachers-list.php',
  cashiers: 'cashier-list.php',
  registrars: 'registrar-list.php',
  schedule: 'class-schedule.php',
  attendance: 'attendance-config.php',
  enrollment_stages: 'enrollment-stages.php',
  fee_types: 'enrollment-fee-types.php',
};

const SETUP_WIZARD_CATEGORY_LABEL_FALLBACK = { foundation: 'Academic Foundation', operations: 'Operations', staff: 'Staff Accounts', enrollment: 'Enrollment & Fees' };
function setupWizardCategoryLabel(cat) {
  return t('setup_checklist.category_' + cat, SETUP_WIZARD_CATEGORY_LABEL_FALLBACK[cat] || '');
}
const SETUP_WIZARD_ITEM_TINT = {
  academic_year: '#0A84FF', grading: '#D4A64A', classes: '#5E5CE6', subjects: '#FF9F0A',
  student_staff_codes: '#FF3B72',
  teachers: '#30B0C7', cashiers: '#32ADE6', registrars: '#64D2FF',
  schedule: '#2FA9B8', attendance: '#BF5AF2',
  enrollment_stages: '#FF453A', fee_types: '#1C1C1E',
};

// Web port of SetupChecklistScreen.tsx: one readiness item at a time
// (icon, "CATEGORY · Step n of N" eyebrow, title, description, a single
// action button) instead of a scrolling list of 9 rows - same pattern used
// by both the forced pre-dashboard gate (renderAdminSetupGateScreen,
// isGate:true, no back on step 0, Log Out takes BottomNavBar's place) and
// the normal browsable "Setup Checklist" page reached from the admin menu
// (setup-checklist.js, isGate:false, real back button, no forced lock).
// Every action button is a plain <a href> straight to that item's real
// config page (SETUP_CHECKLIST_HREF_BY_KEY) rather than an in-app route
// hop like RN's navigation.navigate() - the web equivalent of "direct
// link to add the setup".
//
// rootEl gets fully replaced on every render(); mount once per page load
// and drive it afterwards through the returned controller.
function createSetupWizard(rootEl, opts) {
  let items = opts.items || [];
  // 0 = overview, 1..items.length = one per item, items.length+1 = complete.
  let step = 0;

  function firstIncompleteIndex() {
    return items.findIndex(i => i.status !== 'done');
  }

  function render() {
    const doneCount = items.filter(i => i.status === 'done').length;
    const total = items.length;
    const overallPercent = total > 0 ? (doneCount / total) * 100 : 0;
    const allDone = total > 0 && doneCount === total;
    const progressPct = step === 0 ? 0 : step > total ? 100 : ((step - 1) / Math.max(total, 1)) * 100;

    const showBack = (!opts.isGate && step === 0) || (step > 0 && step <= total);
    const chromeLeft = showBack
      ? '<button type="button" class="wizard-round-btn" id="wizBack" aria-label="' + escapeHtml(t('common.back', 'Back')) + '">' + icon('chevronleft', { size: 18, color: 'var(--ink)' }) + '</button>'
      : '<span class="wizard-btn-ghost"></span>';
    const chromeRight = opts.isGate
      ? '<button type="button" class="wizard-logout-link" id="wizLogout" aria-label="' + escapeHtml(t('common.log_out', 'Log Out')) + '">' + icon('logout', { size: 16, color: 'var(--subtle)' }) + '</button>'
      : '<span class="wizard-btn-ghost"></span>';

    let bodyHtml;
    if (total === 0) {
      bodyHtml =
        '<div class="wizard-step-fill"><div class="wizard-step-scroll">' +
          '<div class="list-error">' + escapeHtml(t('setup_checklist.load_failed', 'Failed to load setup status.')) + '<br>' +
            '<button type="button" class="list-retry-btn" id="wizRetry">' + escapeHtml(t('common.retry', 'Try again')) + '</button></div>' +
        '</div></div>';
    } else if (step === 0) {
      const categories = ['foundation', 'operations', 'staff', 'enrollment'].map(cat => {
        const catItems = items.filter(i => i.category === cat);
        const catDone = catItems.filter(i => i.status === 'done').length;
        return { key: cat, label: setupWizardCategoryLabel(cat), done: catDone, total: catItems.length };
      }).filter(c => c.total > 0);

      bodyHtml =
        '<div class="wizard-step-fill">' +
          '<div class="wizard-step-scroll">' +
            '<div class="wizard-ring-row">' + progressRing(overallPercent, { size: 64, strokeWidth: 6 }) +
              '<div class="wizard-overview-copy">' +
                '<div class="wizard-overview-title">' + escapeHtml(t('setup_checklist.progress', '{done} of {total} set up').replace('{done}', doneCount).replace('{total}', total)) + '</div>' +
                '<div class="wizard-overview-sub">' + escapeHtml(opts.isGate
                  ? t('setup_checklist.gate_helper', 'The rest of the app unlocks once every step below is done.')
                  : t('setup_checklist.helper_short', 'Everything a school needs before its portals are ready for day-to-day use.')) + '</div>' +
              '</div>' +
            '</div>' +
            categories.map(c => {
              const pct = c.total > 0 ? (c.done / c.total) * 100 : 0;
              return (
                '<div class="wizard-stage-card" data-category="' + c.key + '">' +
                  '<div class="wizard-stage-info"><div class="wizard-stage-name">' + escapeHtml(c.label) + '</div>' +
                    '<div class="wizard-stage-bar-track"><div class="wizard-stage-bar-fill" style="width:' + pct + '%;background:' + (pct === 100 ? 'var(--emerald)' : '#0A84FF') + ';"></div></div></div>' +
                  '<div class="wizard-stage-count">' + c.done + '/' + c.total + '</div>' +
                '</div>'
              );
            }).join('') +
          '</div>' +
          '<div class="wizard-step-actions">' +
            '<button type="button" class="wizard-primary-btn" id="wizContinue">' +
              '<span>' + escapeHtml(allDone ? t('setup_checklist.review', 'Review Setup') : t('setup_checklist.continue', 'Continue Setup')) + '</span>' +
              icon('arrow', { size: 17, color: '#fff' }) +
            '</button>' +
          '</div>' +
        '</div>';
    } else if (step <= total) {
      const item = items[step - 1];
      const isDone = item.status === 'done';
      const isChecking = item.status === 'checking';
      const href = SETUP_CHECKLIST_HREF_BY_KEY[item.key];
      const tint = SETUP_WIZARD_ITEM_TINT[item.key] || 'var(--emerald)';
      const actionLabel = isChecking
        ? t('setup_checklist.checking', 'Checking…')
        : isDone
        ? t('setup_checklist.review_item', 'Review {title}').replace('{title}', item.title)
        : t('setup_checklist.set_up_item', 'Set Up {title}').replace('{title}', item.title);
      const actionInner = '<span>' + escapeHtml(actionLabel) + '</span>' + icon('arrow', { size: 17, color: '#fff' });
      const action = href && !isChecking
        ? '<a class="wizard-primary-btn" id="wizAction" href="' + escapeHtml(href) + '">' + actionInner + '</a>'
        : '<button type="button" class="wizard-primary-btn" id="wizAction" disabled>' + actionInner + '</button>';

      bodyHtml =
        '<div class="wizard-step-fill">' +
          '<div class="wizard-step-scroll">' +
            '<div class="wizard-step-icon" style="background:' + (isDone ? 'var(--emerald)' : tint) + '">' + icon(item.icon, { size: 26, color: '#fff' }) + '</div>' +
            '<div class="wizard-step-eyebrow">' + escapeHtml(setupWizardCategoryLabel(item.category)) + ' &middot; ' + escapeHtml(t('setup_checklist.step_of', 'Step {n} of {total}').replace('{n}', String(step)).replace('{total}', String(total))) + '</div>' +
            '<div class="wizard-step-title">' + escapeHtml(item.title) + '</div>' +
            '<div class="wizard-step-desc">' + escapeHtml(item.desc) + '</div>' +
            (isDone
              ? '<div class="wizard-step-badge">' + icon('check', { size: 13, color: 'var(--emerald)' }) + '<span>' + escapeHtml(item.count != null ? t('setup_checklist.count_meta', '{count} configured').replace('{count}', String(item.count)) : t('setup_checklist.done', 'Done')) + '</span></div>'
              : '') +
          '</div>' +
          '<div class="wizard-step-actions">' + action + '</div>' +
        '</div>';
    } else {
      bodyHtml =
        '<div class="wizard-step-fill">' +
          '<div class="wizard-step-scroll">' +
            '<div class="wizard-done-icon">' + icon('check', { size: 30, color: '#fff' }) + '</div>' +
            '<div class="wizard-done-title">' + escapeHtml(t('setup_checklist.all_set', "You're all set")) + '</div>' +
            '<div class="wizard-done-sub">' + escapeHtml(opts.isGate
              ? t('setup_checklist.all_set_gate_sub', 'Every step is complete. The rest of the admin menu is now unlocked.')
              : t('setup_checklist.all_set_sub', "Every step is complete - your portals are ready for day-to-day use.")) + '</div>' +
          '</div>' +
          (!opts.isGate ? '<div class="wizard-step-actions"><button type="button" class="wizard-primary-btn" id="wizDoneBtn"><span>' + escapeHtml(t('setup_checklist.done', 'Done')) + '</span></button></div>' : '') +
        '</div>';
    }

    rootEl.innerHTML =
      '<div class="wizard-chrome">' +
        '<div class="wizard-chrome-row">' + chromeLeft +
          '<div class="wizard-progress-track"><div class="wizard-progress-fill" style="width:' + progressPct + '%;"></div></div>' +
          chromeRight +
        '</div>' +
      '</div>' +
      '<div class="wizard-body">' + bodyHtml + '</div>';

    wireEvents();
  }

  function wireEvents() {
    const backBtn = document.getElementById('wizBack');
    if (backBtn) backBtn.addEventListener('click', () => {
      if (step === 0) { opts.onBack && opts.onBack(); return; }
      goToStep(step - 1);
    });
    const logoutBtn = document.getElementById('wizLogout');
    if (logoutBtn) logoutBtn.addEventListener('click', (e) => { e.currentTarget.disabled = true; opts.onLogout && opts.onLogout(); });
    const continueBtn = document.getElementById('wizContinue');
    if (continueBtn) continueBtn.addEventListener('click', () => {
      const doneCount = items.filter(i => i.status === 'done').length;
      if (items.length > 0 && doneCount === items.length) { goToStep(items.length + 1); return; }
      const idx = firstIncompleteIndex();
      goToStep((idx === -1 ? 0 : idx) + 1);
    });
    const doneBtn = document.getElementById('wizDoneBtn');
    if (doneBtn) doneBtn.addEventListener('click', () => opts.onBack && opts.onBack());
    const retryBtn = document.getElementById('wizRetry');
    if (retryBtn) retryBtn.addEventListener('click', () => window.location.reload());
    rootEl.querySelectorAll('.wizard-stage-card').forEach(card => {
      card.addEventListener('click', () => {
        const cat = card.getAttribute('data-category');
        let idx = items.findIndex(i => i.category === cat && i.status !== 'done');
        if (idx === -1) idx = items.findIndex(i => i.category === cat);
        if (idx !== -1) goToStep(idx + 1);
      });
    });
  }

  function goToStep(n) { step = Math.max(0, Math.min(n, items.length + 1)); render(); }

  // Mirrors SetupChecklistScreen.tsx's useEffect: once the item currently
  // being viewed flips to "done" (the admin set it up on its real page and
  // came back), auto-advance to the next incomplete item, or the
  // completion screen if that was the last one. Only fires for the
  // in-progress item step, so a fresh page load never yanks anyone off
  // the overview.
  function refreshItems(newItems) {
    const prevItem = step >= 1 && step <= items.length ? items[step - 1] : null;
    items = newItems;
    if (prevItem && step >= 1 && step <= items.length) {
      const current = items[step - 1];
      if (current && current.status === 'done' && prevItem.status !== 'done') {
        const nextIncomplete = firstIncompleteIndex();
        if (nextIncomplete === -1) { step = items.length + 1; opts.onAllDone && opts.onAllDone(); }
        else { step = nextIncomplete + 1; }
      }
    }
    render();
  }

  render();
  return { refreshItems, goToStep };
}

function completeAdminSchoolSetup(token) {
  return authedPost('/admin_school_setup_complete', token).then(d => d.school || {});
}

const ADMIN_SETUP_GATE_CACHE_PREFIX = 'muslimedu_admin_setup_gate_';

// Full-screen replacement (same shape as renderEnrollmentGateScreen above)
// shown in place of ANY admin-*.php page once its own guardDashboard() call
// resolves the checklist as incomplete. No header, no bottom nav - a step
// wizard (see createSetupWizard) walks the admin through each item one at
// a time, and every step's action button is a working link out to that
// item's real config page (see SETUP_CHECKLIST_HREF_BY_KEY). Coming back
// to any admin page re-runs this same gate, so it naturally re-opens once
// everything's done; while this screen itself is open, a window-focus
// listener re-checks status so finishing an item and returning here (e.g.
// via the browser back button) auto-advances the wizard instead of making
// the admin re-click Continue.
function renderAdminSetupGateScreen(user, token, items) {
  document.body.className = 'util-page';
  document.body.innerHTML = '<div class="es-gate-screen" id="asGateScreen"></div>';

  const wizard = createSetupWizard(document.getElementById('asGateScreen'), {
    isGate: true,
    items: items || [],
    onLogout: () => performLogout(token),
    onAllDone: () => window.location.reload(),
  });

  function recheck() {
    fetchSetupChecklistItems(token).then(fresh => {
      wizard.refreshItems(fresh);
      if (fresh.length > 0 && fresh.every(i => i.status === 'done')) {
        try { localStorage.setItem(ADMIN_SETUP_GATE_CACHE_PREFIX + user.id, '1'); } catch (e) {}
      }
    }).catch(() => {});
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') recheck(); });
  window.addEventListener('focus', recheck);
}

// One-time bootstrap step, shown instead of the 9-item checklist gate
// above whenever the school hasn't finished this even earlier step yet
// (user.academic_setup_completed === false). Institution name/address/
// phone were already collected at registration (SchoolRegistrationScreen
// on RN), so - unlike the older version of this screen - nothing re-asks
// for them here; this only asks for the one thing registration doesn't
// already have: the first academic year. Submitting calls
// /admin_sessions_create then /admin_school_setup_complete and reloads -
// the reload re-runs guardDashboard, which then either opens the
// dashboard (if the 9-item checklist happens to already be done too) or
// drops into the checklist gate above.
function renderAdminBootstrapScreen(user, token) {
  document.body.className = 'util-page';
  document.body.innerHTML =
    '<div class="es-gate-screen">' +
      '<div class="es-gate-header">' +
        '<div class="es-gate-title">' + escapeHtml(t('academic_setup_wizard.welcome_title', 'Welcome to MuslimEdu!')) + '</div>' +
        '<div class="es-gate-subtitle">' + escapeHtml(t('academic_setup_wizard.gate_subtitle', 'A few quick details before your Admin, Teacher, and Student portals go live.')) + '</div>' +
      '</div>' +
      '<div class="es-gate-content scrollable">' +
        '<div class="util-card padded">' +
          '<label class="util-label" style="margin-top:0;">' + escapeHtml(t('academic_setup_wizard.year_heading', 'Your first academic year')) + '</label>' +
          '<input type="text" class="util-input" id="bsYear" placeholder="e.g. 2026-2027" />' +
        '</div>' +
        '<div class="list-error" id="bsError" style="display:none;"></div>' +
        '<button type="button" class="util-save-btn pill" id="bsSubmitBtn" style="width:100%;">' + escapeHtml(t('academic_setup_wizard.finish_setup', 'Finish Setup')) + '</button>' +
      '</div>' +
      '<div class="es-gate-footer">' +
        '<button type="button" class="es-gate-logout-btn" id="bsLogoutBtn">' + icon('logout', { size: 16, color: 'var(--subtle)' }) + '<span>' + escapeHtml(t('common.log_out', 'Log Out')) + '</span></button>' +
      '</div>' +
    '</div>';

  document.getElementById('bsLogoutBtn').addEventListener('click', (e) => {
    e.currentTarget.disabled = true;
    performLogout(token);
  });

  document.getElementById('bsSubmitBtn').addEventListener('click', () => {
    const yearTitle = document.getElementById('bsYear').value.trim();
    const errEl = document.getElementById('bsError');
    errEl.style.display = 'none';

    if (!yearTitle) { errEl.textContent = t('academic_setup_wizard.year_title_required', 'Enter a title for your first academic year (e.g. "2026-2027").'); errEl.style.display = ''; return; }

    const btn = document.getElementById('bsSubmitBtn');
    btn.disabled = true;
    const originalLabel = btn.innerHTML;
    btn.innerHTML = '<span class="util-spinner"></span>';

    authedPost('/admin_sessions_create', token, { session_title: yearTitle, set_current: true })
      .then(() => completeAdminSchoolSetup(token))
      .then(() => { window.location.reload(); })
      .catch(err => {
        btn.disabled = false;
        btn.innerHTML = originalLabel;
        errEl.textContent = (err && err.message) || t('academic_setup_wizard.finish_error', 'Could not finish setup.');
        errEl.style.display = '';
      });
  });
}

// Web port of MainTabs.tsx's useAdminSetupGate: gates a non-orphan admin's
// whole app behind either the one-time bootstrap screen above or the
// full 9-item checklist gate, exactly mirroring the two-stage order the RN
// app uses (bootstrap first, since Academic Year - one of the 9 checks -
// can't pass before it anyway). Superadmin and orphan-school admins are
// never gated (checked by the caller in guardDashboard, same as RN's
// isGatedAdmin). Cache-first with fail-closed-only-without-a-cache, same
// reasoning as runStudentEnrollmentGate: a single flaky request among the
// 9 checks must never lock an already-set-up admin out over a dropped
// connection, but a brand-new admin with no cached verdict yet must not
// slip through on that same flakiness.
// The real config pages a setup-gate step's action button links to
// (SETUP_CHECKLIST_HREF_BY_KEY's values) must be exempt from the gate
// itself. On RN, GradingSystemsScreen/ClassListScreen/etc. are separate
// entries in the root Stack.Navigator, siblings of MainTabs rather than
// children of it - so navigating into one from SetupChecklistScreen's
// "Set Up X" button leaves MainTabs (and its useAdminSetupGate check)
// behind entirely and is never re-gated. On the web, every admin-*.php
// page independently calls guardDashboard(), so without this exemption
// clicking "Set Up Classes & Sections" would load classes-sections.php,
// which reruns runAdminSetupGate, sees the very same "classes" item still
// incomplete, and renders the identical gate screen again instead of the
// actual config UI - the URL changes but the wizard never fades, and
// there's no way to ever complete that item. academic-setup.php is
// exempt from the earlier bootstrap check for the same reason (it's also
// where the 'academic_year' item gets completed).
function currentPageFilename() {
  return (window.location.pathname.split('/').pop() || '').toLowerCase();
}
const SETUP_GATE_EXEMPT_PAGES = new Set(Object.values(SETUP_CHECKLIST_HREF_BY_KEY));

function runAdminSetupGate(user, token, onReady) {
  if (SETUP_GATE_EXEMPT_PAGES.has(currentPageFilename())) {
    document.getElementById('routeGuardSplash')?.remove();
    renderHeader(user);
    onReady(user, token);
    wireLogout(token);
    refreshNotifBadge(token);
    return;
  }

  if (user.academic_setup_completed === false) {
    document.getElementById('routeGuardSplash')?.remove();
    renderAdminBootstrapScreen(user, token);
    return;
  }

  const cacheKey = ADMIN_SETUP_GATE_CACHE_PREFIX + user.id;
  let cached = null;
  try { cached = localStorage.getItem(cacheKey); } catch (e) {}

  function proceed() {
    renderHeader(user);
    document.getElementById('routeGuardSplash')?.remove();
    onReady(user, token);
    wireLogout(token);
    refreshNotifBadge(token);
  }

  const live = fetchSetupChecklistItems(token).then(items => {
    const hasError = items.some(i => i.status === 'error');
    const doneCount = items.filter(i => i.status === 'done').length;
    if (hasError) return { ok: null, items, hasError: true };
    const ok = items.length > 0 && doneCount >= items.length;
    try { localStorage.setItem(cacheKey, ok ? '1' : '0'); } catch (e) {}
    return { ok, items, hasError: false };
  }).catch(() => ({ ok: null, items: null, hasError: true }));

  if (cached === '1') {
    proceed();
    live.then(r => { if (r.ok === false) window.location.reload(); });
  } else {
    live.then(r => {
      if (r.ok) { proceed(); return; }
      if (r.ok === null && cached !== null) {
        // A flaky check on a return visit with no fresh verdict either
        // way - keep the last cached read rather than punishing a
        // dropped connection.
        if (cached === '1') { proceed(); return; }
      }
      document.getElementById('routeGuardSplash')?.remove();
      renderAdminSetupGateScreen(user, token, r.items);
    });
  }
}

// ── Post-save setup guidance ───────────────────────────────────────────
// Every one of the 12 pages a setup-checklist item's "Set Up X" button
// links to (SETUP_CHECKLIST_HREF_BY_KEY) calls notifySetupItemSaved(token)
// right after its own save succeeds. This is what turns "I saved a grading
// system, now what?" into an explicit "✓ Setup completed / Next step: ...
// Continue Setup →" confirmation instead of leaving the admin to guess
// whether to hit the browser Back button and, if so, where it'll land -
// SETUP_CHECKLIST_HREF_BY_KEY's own doc comment describes exactly that
// problem for the header's Back arrow, which this exists to paper over.
//
// It only ever shows something when both are true:
//  - this page is actually one of the 12 setup destinations, AND
//  - the item this page is responsible for is now genuinely done (not
//    just "a save happened" - Student & Staff Codes needs both tabs
//    configured, Classes only needs one, etc., so this re-fetches the
//    real checklist rather than assuming).
// A school that finished setup months ago and is just adding an 11th
// Subject sees no banner at all, because doneCount === total already and
// there's nothing left to guide them toward.
function notifySetupItemSaved(token) {
  const file = currentPageFilename();
  const itemKey = Object.keys(SETUP_CHECKLIST_HREF_BY_KEY).find(k => SETUP_CHECKLIST_HREF_BY_KEY[k] === file);
  if (!itemKey) return;

  fetchSetupChecklistItems(token).then(items => {
    if (items.length === 0 || items.some(i => i.status === 'error')) return; // stale/partial read - don't guess
    const item = items.find(i => i.key === itemKey);
    if (!item || item.status !== 'done') return; // this save didn't actually finish the item (yet)

    const total = items.length;
    const doneCount = items.filter(i => i.status === 'done').length;

    if (doneCount === total) {
      // Last item just finished - nothing left to route the admin through,
      // so this goes straight to "you're done", not "continue setup".
      renderSetupSaveBanner({ allDone: true });
      return;
    }

    const next = items[items.findIndex(i => i.status !== 'done')];
    renderSetupSaveBanner({
      allDone: false,
      nextTitle: next.title,
      nextHref: SETUP_CHECKLIST_HREF_BY_KEY[next.key] || 'setup-checklist.php',
    });
  }).catch(() => {}); // a failed re-check just means no banner - never blocks the save the admin already made
}

function renderSetupSaveBanner(opts) {
  let backdrop = document.getElementById('setupSaveBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'setupSaveBackdrop';
    backdrop.className = 'sheet-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.classList.remove('open'); });
  }

  const bodyHtml = opts.allDone
    ? (
        '<div class="setup-save-icon done">' + icon('check', { size: 24, color: '#fff' }) + '</div>' +
        '<div class="setup-save-title">' + escapeHtml(t('setup_checklist.all_set', "You're all set")) + '</div>' +
        '<div class="setup-save-sub">' + escapeHtml(t('setup_checklist.all_set_sub', "Every step is complete - your portals are ready for day-to-day use.")) + '</div>' +
        '<div class="setup-save-actions">' +
          '<a class="wizard-primary-btn" href="admin-dashboard.php">' +
            '<span>' + escapeHtml(t('setup_checklist.go_to_dashboard', 'Go to Dashboard')) + '</span>' + icon('arrow', { size: 17, color: '#fff' }) +
          '</a>' +
        '</div>'
      )
    : (
        '<div class="setup-save-icon">' + icon('check', { size: 20, color: '#fff' }) + '</div>' +
        '<div class="setup-save-title">' + escapeHtml(t('setup_checklist.item_completed', 'Setup completed')) + '</div>' +
        '<div class="setup-save-next-label">' + escapeHtml(t('setup_checklist.next_step_label', 'Next step')) + '</div>' +
        '<div class="setup-save-next-title">' + escapeHtml(opts.nextTitle) + '</div>' +
        '<div class="setup-save-actions">' +
          '<a class="wizard-primary-btn" href="' + escapeHtml(opts.nextHref) + '">' +
            '<span>' + escapeHtml(t('setup_checklist.continue', 'Continue Setup')) + '</span>' + icon('arrow', { size: 17, color: '#fff' }) +
          '</a>' +
          '<a class="setup-save-back-link" href="setup-checklist.php">' + icon('chevronleft', { size: 14, color: 'var(--subtle)' }) + '<span>' + escapeHtml(t('setup_checklist.back_to_setup', 'Back to Setup')) + '</span></a>' +
        '</div>'
      );

  backdrop.innerHTML =
    '<div class="sheet-panel setup-save-panel">' +
      '<button type="button" class="setup-save-close-btn" id="setupSaveCloseBtn" aria-label="' + escapeHtml(t('common.close', 'Close')) + '">' + icon('close', { size: 14, color: 'var(--subtle)' }) + '</button>' +
      '<div class="sheet-handle"></div>' +
      bodyHtml +
    '</div>';
  document.getElementById('setupSaveCloseBtn').addEventListener('click', () => backdrop.classList.remove('open'));
  requestAnimationFrame(() => backdrop.classList.add('open'));
}

function fetchAdminFeeTotal(token) {
  return authedPost('/admin_fee_list', token, {})
    .then(d => (d.invoices || []).reduce((sum, inv) => sum + (inv.paid_amount || 0), 0))
    .catch(() => 0);
}

function fetchSuperAdminOverview(token) {
  return authedPost('/superadmin_dashboard_overview', token, {});
}

// Admin People & Fees endpoints, shared by students-list.js,
// teachers-list.js, fee-reports.js.
function fetchStudents(token, search) {
  return authedPost('/admin_children_list', token, { search: search || '' })
    .then(d => (d.children || []).map(c => ({ ...c, status: c.status || c.admission_status || 'active' })));
}
function addTeacher(token, input) {
  return authedPost('/admin_teacher_admission_single', token, input)
    .then(d => d.teacher || (d.data && d.data.teacher) || d.data || d);
}

// Admit one student - admission.js. Always multipart: the backend reads
// the profile picture (required) and the drawn signature (optional) via
// $request->hasFile(), so this can't go through authedPost's JSON body.
// Empty/undefined fields are dropped rather than sent as "" - the backend
// stores what it's given verbatim into user_information.
function admitStudent(token, input, photoFile, signatureBlob) {
  const form = new FormData();
  Object.keys(input || {}).forEach(key => {
    const value = input[key];
    if (value === undefined || value === null || value === '') return;
    form.append(key, String(value));
  });
  // photoFile is null when the registrar is continuing a walk-in
  // admission whose pre-registration already has a selfie on file - the
  // backend reuses that image via preregistration_id instead, so there's
  // no 'photo' step (and no file) here at all in that case.
  if (photoFile) form.append('photo', photoFile, photoFile.name || 'profile.jpg');
  if (signatureBlob) form.append('signature', signatureBlob, 'signature.png');

  return fetch(API_BASE_URL + '/admin_admission_single', {
    method: 'POST',
    headers: { Accept: 'application/json', Authorization: 'Bearer ' + token },
    body: form,
  }).then(res => res.json().catch(() => ({})).then(data => {
    // The student row is committed before the backend's best-effort tail
    // (student number, enrollment row, welcome email), so a response that
    // carries a student object is a success even on a non-2xx status -
    // same reasoning as admitStudent() in adminService.ts.
    const student = data.student || (data.data && data.data.student) || null;
    if (student) return student;
    if (!res.ok) {
      throw new Error((data && data.message) || firstValidationError(data) || 'Request failed (' + res.status + ')');
    }
    return data;
  }));
}

// Plain picker endpoints (admin_class_list/admin_section_list) - distinct
// from classes-sections.js's own admin_classes_* full-CRUD contract, but
// backed by the same underlying `classes`/`sections` tables. Used wherever
// a screen just needs "pick a class, then a section", e.g. Place in
// Section on an enrollment workflow record.
function fetchClasses(token) {
  return authedPost('/admin_class_list', token, {}).then(d => d.classes || d.data || []);
}
function fetchSections(token, classId) {
  return authedPost('/admin_section_list', token, classId ? { class_id: classId } : {}).then(d => d.sections || d.data || []);
}
// admin_sessions_list - academic years. pickCurrentSession mirrors the RN
// service's own fallback: the row flagged current, or just the first one
// if none is flagged yet (a school mid-setup may not have set one).
function fetchAcademicSessions(token) {
  return authedPost('/admin_sessions_list', token, {}).then(d => d.sessions || []);
}
function pickCurrentSession(sessions) {
  return sessions.find(s => s.status === 1) || sessions[0] || null;
}

// Identity & Codes group - StudentIdCardsScreen.tsx / StaffIdCardsScreen.tsx /
// StudentStaffCodeSetupScreen.tsx's own backends.
function fetchTeacherList(token) {
  return authedPost('/admin_teacher_list', token, {}).then(d => d.teachers || []);
}
function fetchCashierAccounts(token) {
  return authedPost('/admin_accountant_list', token, {}).then(d => d.accountants || []);
}
function fetchRegistrarAccounts(token) {
  return authedPost('/admin_registrar_list', token, {}).then(d => d.registrars || []);
}
// SuperAdmin's own internal platform team (sub-admins who help run
// Manhaje/MuslimEdu itself, gated on a `permissions` array plus a
// `full_access` catch-all) - distinct from adminList/adminCreate/
// adminDelete on SuperAdminController (a school's own admin account) AND
// from superadmin_staff_create/superadmin_staff_delete/superadmin_school_staff
// (a school's teacher/cashier/registrar accounts) - hence `_team_`, not
// `_staff_`, in these endpoint names, to avoid colliding with those.
// Backed by SuperAdminApiController::team*() - see superadmin-staff.js.
function fetchSuperAdminStaff(token) {
  return authedPost('/superadmin_team_list', token, {}).then(d => d.staff || []);
}
function addSuperAdminStaff(token, input) {
  return authedPost('/superadmin_team_create', token, input)
    .then(d => d.staff || (d.data && d.data.staff) || d.data || d);
}
function fetchSuperAdminStaffProfile(token, staffId) {
  return authedPost('/superadmin_team_profile', token, { staff_id: staffId });
}
function updateSuperAdminStaff(token, staffId, input) {
  return authedPost('/superadmin_team_update', token, { staff_id: staffId, ...input });
}
function updateSuperAdminStaffStatus(token, staffId, status) {
  return authedPost('/superadmin_team_status', token, { staff_id: staffId, status });
}
function deleteSuperAdminStaff(token, staffId) {
  return authedPost('/superadmin_team_delete', token, { staff_id: staffId });
}

// Schools - list/create/status, plus the per-school Taqdim/Translation
// feature toggles (auto-derived from the school's subscription package,
// with a manual override - see School::getFeatures()). See
// superadmin-schools.js.
function fetchSchools(token, params) {
  return authedPost('/superadmin_school_list', token, params || {});
}
function createSchool(token, input) {
  return authedPost('/superadmin_school_create', token, input).then(d => d.school);
}
function updateSchool(token, schoolId, input) {
  return authedPost('/superadmin_school_update', token, { school_id: schoolId, ...input }).then(d => d.school);
}
function setSchoolStatus(token, schoolId, status) {
  return authedPost('/superadmin_school_set_status', token, { school_id: schoolId, status });
}
function fetchSchoolFeatures(token, schoolId) {
  return authedPost('/superadmin_school_features_get', token, { school_id: schoolId });
}
function updateSchoolFeature(token, schoolId, feature, enabled) {
  return authedPost('/superadmin_school_features_update', token, { school_id: schoolId, feature, enabled });
}
function resyncSchoolFeature(token, schoolId, feature) {
  return authedPost('/superadmin_school_features_resync', token, feature ? { school_id: schoolId, feature } : { school_id: schoolId });
}
function fetchTaqdimOverview(token) { return authedPost('/taqdim_overview', token); }
function fetchTranslationOverview(token) { return authedPost('/translation_overview', token); }
function fetchQuranTrackerOverview(token) { return authedPost('/quran_tracker_overview', token); }

// Taqdim Assistant / Translation Service - per-school application
// workflow (TaqdimTranslationRequirementController /
// TaqdimTranslationApplicationController). `feature` is always 'taqdim'
// or 'translation' throughout - the two services share one set of
// endpoints instead of duplicating them, same as the backend tables.
//
// School admin: requirements checklist setup.
function fetchTaqdimTranslationRequirements(token, feature) {
  return authedPost('/taqdim_translation_requirement_list', token, { feature }).then(d => d.requirements || []);
}
function createTaqdimTranslationRequirement(token, input) {
  return authedPost('/taqdim_translation_requirement_create', token, input).then(d => d.requirement);
}
function updateTaqdimTranslationRequirement(token, requirementId, input) {
  return authedPost('/taqdim_translation_requirement_update', token, { requirement_id: requirementId, ...input }).then(d => d.requirement);
}
function deleteTaqdimTranslationRequirement(token, requirementId) {
  return authedPost('/taqdim_translation_requirement_delete', token, { requirement_id: requirementId });
}

// Student: application lifecycle.
function startTaqdimTranslationApplication(token, feature) {
  return authedPost('/taqdim_translation_application_start', token, { feature }).then(d => d.application);
}
function fetchMyTaqdimTranslationApplications(token, feature) {
  return authedPost('/taqdim_translation_application_list', token, feature ? { feature } : {}).then(d => d.applications || []);
}
function fetchMyTaqdimTranslationApplication(token, applicationId) {
  return authedPost('/taqdim_translation_application_show', token, { application_id: applicationId }).then(d => d.application);
}
function updateTaqdimTranslationChecklistItem(token, itemId, fields) {
  return authedPost('/taqdim_translation_application_checklist_update', token, { item_id: itemId, ...fields }).then(d => d.item);
}
function submitTaqdimTranslationApplication(token, applicationId) {
  return authedPost('/taqdim_translation_application_submit', token, { application_id: applicationId }).then(d => d.application);
}
function withdrawTaqdimTranslationApplication(token, applicationId) {
  return authedPost('/taqdim_translation_application_withdraw', token, { application_id: applicationId }).then(d => d.application);
}

// Student: document vault (category = taqdim | translation on
// user_documents). Multipart, same shape as uploadScholarshipDocument.
function uploadTaqdimTranslationDocument(token, feature, file, title) {
  const form = new FormData();
  form.append('feature', feature);
  form.append('file', file, file.name || 'document.pdf');
  if (title) form.append('title', title);
  return fetch(API_BASE_URL + '/taqdim_translation_document_upload', {
    method: 'POST',
    headers: { Accept: 'application/json', Authorization: 'Bearer ' + token },
    body: form,
  }).then(res => res.json().catch(() => ({})).then(data => {
    if (!res.ok) throw new Error((data && data.message) || 'Request failed (' + res.status + ')');
    return data.document;
  }));
}
function fetchMyTaqdimTranslationDocuments(token, feature) {
  return authedPost('/taqdim_translation_document_list', token, { feature }).then(d => d.documents || []);
}
function deleteTaqdimTranslationDocument(token, documentId) {
  return authedPost('/taqdim_translation_document_delete', token, { document_id: documentId });
}

// School admin: review queue.
function fetchAdminTaqdimTranslationApplications(token, filters) {
  return authedPost('/admin_taqdim_translation_application_list', token, filters || {}).then(d => d.applications || []);
}
function fetchAdminTaqdimTranslationApplication(token, applicationId) {
  return authedPost('/admin_taqdim_translation_application_show', token, { application_id: applicationId }).then(d => d.application);
}
function assignTaqdimTranslationApplication(token, applicationId, staffId) {
  return authedPost('/admin_taqdim_translation_application_assign', token, { application_id: applicationId, staff_id: staffId }).then(d => d.application);
}
function advanceTaqdimTranslationApplicationStatus(token, applicationId, status, note) {
  return authedPost('/admin_taqdim_translation_application_advance_status', token, { application_id: applicationId, status, note }).then(d => d.application);
}
function reviewTaqdimTranslationChecklistItem(token, itemId, isCompleted, notes) {
  return authedPost('/admin_taqdim_translation_checklist_item_review', token, { item_id: itemId, is_completed: isCompleted, notes }).then(d => d.item);
}

// Scholarship & Taqdim Assistant - staff catalog management (providers,
// programs, requirements). Reachable by the primary SuperAdmin and by any
// platform staff member granted scholarship_access - see
// scholarship-programs.js / scholarship-providers.js, which check
// user.scholarship_access (added to buildUserPayload) before rendering.
// Backed by ScholarshipProgramController, gated server-side on
// hasScholarshipAccess() independent of this frontend check.
function fetchScholarshipProviders(token, params) {
  return authedPost('/scholarship_provider_list', token, params || {}).then(d => d.providers || []);
}
function createScholarshipProvider(token, input) {
  return authedPost('/scholarship_provider_create', token, input).then(d => d.provider);
}
function updateScholarshipProvider(token, providerId, input) {
  return authedPost('/scholarship_provider_update', token, { provider_id: providerId, ...input }).then(d => d.provider);
}
function deleteScholarshipProvider(token, providerId) {
  return authedPost('/scholarship_provider_delete', token, { provider_id: providerId });
}

// per_page:100 - this is a staff-facing catalog list, not a public/student
// browse feed, so there's no "load more" UI here; asking the API for a
// generously large single page is simpler than wiring up
// ScholarshipProgramController::PER_PAGE=20's pagination for a list this
// small in practice.
function fetchScholarshipPrograms(token, filters) {
  return authedPost('/scholarship_program_list', token, { per_page: 100, ...(filters || {}) })
    .then(d => d.data || []);
}
function fetchScholarshipProgram(token, programId) {
  return authedPost('/scholarship_program_show', token, { program_id: programId }).then(d => d.program);
}
function createScholarshipProgram(token, input) {
  return authedPost('/scholarship_program_create', token, input).then(d => d.program);
}
function updateScholarshipProgram(token, programId, input) {
  return authedPost('/scholarship_program_update', token, { program_id: programId, ...input }).then(d => d.program);
}
function setScholarshipProgramStatus(token, programId, status) {
  return authedPost('/scholarship_program_set_status', token, { program_id: programId, status }).then(d => d.program);
}
function deleteScholarshipProgram(token, programId) {
  return authedPost('/scholarship_program_delete', token, { program_id: programId });
}

function fetchScholarshipRequirements(token, programId) {
  return authedPost('/scholarship_requirement_list', token, { program_id: programId }).then(d => d.requirements || []);
}
function createScholarshipRequirement(token, input) {
  return authedPost('/scholarship_requirement_create', token, input).then(d => d.requirement);
}
function updateScholarshipRequirement(token, requirementId, input) {
  return authedPost('/scholarship_requirement_update', token, { requirement_id: requirementId, ...input }).then(d => d.requirement);
}
function deleteScholarshipRequirement(token, requirementId) {
  return authedPost('/scholarship_requirement_delete', token, { requirement_id: requirementId });
}

// Scholarship & Taqdim Assistant - staff review queue
// (ScholarshipApplicationController's admin_* endpoints). Drafts are
// never returned here - they're the student's private working copy until
// submitted, filtered server-side in adminApplicationList. See
// scholarship-applications.js.
function fetchAdminScholarshipApplications(token, filters) {
  return authedPost('/admin_scholarship_application_list', token, { per_page: 100, ...(filters || {}) })
    .then(d => d.data || []);
}
function fetchAdminScholarshipApplication(token, applicationId) {
  return authedPost('/admin_scholarship_application_show', token, { application_id: applicationId }).then(d => d.application);
}
function assignScholarshipApplication(token, applicationId, staffId) {
  return authedPost('/admin_scholarship_application_assign', token, { application_id: applicationId, staff_id: staffId }).then(d => d.application);
}
function advanceScholarshipApplicationStatus(token, applicationId, status, note) {
  return authedPost('/admin_scholarship_application_advance_status', token, { application_id: applicationId, status, note }).then(d => d.application);
}
function reviewScholarshipChecklistItem(token, itemId, isCompleted, notes) {
  return authedPost('/admin_scholarship_checklist_item_review', token, { item_id: itemId, is_completed: isCompleted, notes }).then(d => d.item);
}

// Scholarship & Taqdim Assistant - Translation Services. Student side
// requests/lists/cancels translations for a specific application; staff
// side (gated on scholarship_translation_access, not just
// scholarship_access - see requireScholarshipTranslationAccess() below)
// works the resulting queue. See ScholarshipTranslationController.
function requestScholarshipTranslation(token, input) {
  return authedPost('/scholarship_translation_request_create', token, input).then(d => d.translation_request);
}
function fetchScholarshipTranslationRequests(token, applicationId) {
  return authedPost('/scholarship_translation_request_list', token, { application_id: applicationId }).then(d => d.translation_requests || []);
}
function cancelScholarshipTranslationRequest(token, requestId) {
  return authedPost('/scholarship_translation_request_cancel', token, { request_id: requestId }).then(d => d.translation_request);
}

function fetchAdminTranslationRequests(token, filters) {
  return authedPost('/admin_translation_request_list', token, { per_page: 100, ...(filters || {}) }).then(d => d.data || []);
}
function fetchAdminTranslationRequest(token, requestId) {
  return authedPost('/admin_translation_request_show', token, { request_id: requestId }).then(d => d.translation_request);
}
function assignScholarshipTranslationRequest(token, requestId, staffId) {
  return authedPost('/admin_translation_request_assign', token, { request_id: requestId, staff_id: staffId }).then(d => d.translation_request);
}
function advanceScholarshipTranslationRequestStatus(token, requestId, status, note) {
  return authedPost('/admin_translation_request_advance_status', token, { request_id: requestId, status, note }).then(d => d.translation_request);
}
// Multipart, matches saveInstitutionProfile()'s hasFiles branch above -
// the only other file-upload helper in this file.
function uploadScholarshipTranslationFile(token, requestId, file) {
  const form = new FormData();
  form.append('request_id', String(requestId));
  form.append('file', file, file.name || 'translation.pdf');
  return fetch(API_BASE_URL + '/admin_translation_request_upload', {
    method: 'POST',
    headers: { Accept: 'application/json', Authorization: 'Bearer ' + token },
    body: form,
  }).then(res => res.json().catch(() => ({})).then(data => {
    if (!res.ok) throw new Error((data && data.message) || 'Request failed (' + res.status + ')');
    return data;
  }));
}

// Second-stage gate for scholarship-translations.php, same shape as
// requireScholarshipStaffAccess() below but checking the translation
// sub-grant specifically - a staff member with plain scholarship_access
// (no translation responsibilities) is redirected away just like anyone
// with neither.
function requireScholarshipTranslationAccess(user) {
  if (user && user.scholarship_translation_access) return true;
  window.location.href = dashboardUrlForRole(user && user.role);
  return false;
}

// Scholarship & Taqdim Assistant - student-facing browse/detail/
// eligibility (ScholarshipController), application lifecycle
// (ScholarshipApplicationController's student endpoints), and the
// document vault (ScholarshipDocumentController's student endpoints).
// See scholarship-browse.js, scholarship-detail.js, scholarship-
// application.js.
function fetchScholarshipBrowseList(token, filters) {
  return authedPost('/scholarship_browse_list', token, { per_page: 100, ...(filters || {}) }).then(d => d.data || []);
}
function fetchScholarshipProgramDetail(token, programId) {
  return authedPost('/scholarship_program_detail', token, { program_id: programId });
}
function checkScholarshipEligibility(token, programId, answers) {
  return authedPost('/scholarship_eligibility_check', token, { program_id: programId, answers: answers || {} });
}

function startScholarshipApplication(token, programId) {
  return authedPost('/scholarship_application_start', token, { program_id: programId }).then(d => d.application);
}
function fetchMyScholarshipApplications(token, filters) {
  return authedPost('/scholarship_application_list', token, filters || {}).then(d => d.applications || []);
}
function fetchMyScholarshipApplication(token, applicationId) {
  return authedPost('/scholarship_application_show', token, { application_id: applicationId }).then(d => d.application);
}
function updateScholarshipChecklistItem(token, itemId, fields) {
  return authedPost('/scholarship_application_checklist_update', token, { item_id: itemId, ...fields }).then(d => d.item);
}
function submitScholarshipApplication(token, applicationId) {
  return authedPost('/scholarship_application_submit', token, { application_id: applicationId }).then(d => d.application);
}
function withdrawScholarshipApplication(token, applicationId) {
  return authedPost('/scholarship_application_withdraw', token, { application_id: applicationId }).then(d => d.application);
}

// Multipart, same shape as uploadScholarshipTranslationFile above.
function uploadScholarshipDocument(token, file, title) {
  const form = new FormData();
  form.append('file', file, file.name || 'document.pdf');
  if (title) form.append('title', title);
  return fetch(API_BASE_URL + '/scholarship_document_upload', {
    method: 'POST',
    headers: { Accept: 'application/json', Authorization: 'Bearer ' + token },
    body: form,
  }).then(res => res.json().catch(() => ({})).then(data => {
    if (!res.ok) throw new Error((data && data.message) || 'Request failed (' + res.status + ')');
    return data.document;
  }));
}
function fetchMyScholarshipDocuments(token) {
  return authedPost('/scholarship_document_list', token, {}).then(d => d.documents || []);
}
function deleteScholarshipDocument(token, documentId) {
  return authedPost('/scholarship_document_delete', token, { document_id: documentId });
}

// Staff document review queue (ScholarshipDocumentController's admin_*
// endpoints) - separate from Translation Services (Round 3): this is for
// plain uploaded documents (passports, transcripts) that don't need
// translation, just a staff approve/reject/revision-request pass.
function fetchAdminScholarshipDocumentQueue(token, status) {
  return authedPost('/admin_scholarship_document_queue', token, status ? { status } : {}).then(d => d.data || []);
}
function reviewScholarshipDocument(token, documentId, status, reviewNote) {
  return authedPost('/admin_scholarship_document_review', token, { document_id: documentId, status, review_note: reviewNote }).then(d => d.document);
}

// Announcements (ScholarshipProgramController's announcement* endpoints
// for staff, ScholarshipController::announcementFeed for students) - was
// already built server-side, just never had a frontend.
function fetchScholarshipAnnouncements(token, programId) {
  return authedPost('/scholarship_announcement_list', token, programId ? { program_id: programId } : {}).then(d => d.announcements || []);
}
function createScholarshipAnnouncement(token, input) {
  return authedPost('/scholarship_announcement_create', token, input).then(d => d.announcement);
}
function updateScholarshipAnnouncement(token, announcementId, input) {
  return authedPost('/scholarship_announcement_update', token, { announcement_id: announcementId, ...input }).then(d => d.announcement);
}
function deleteScholarshipAnnouncement(token, announcementId) {
  return authedPost('/scholarship_announcement_delete', token, { announcement_id: announcementId });
}
function fetchScholarshipAnnouncementFeed(token) {
  return authedPost('/scholarship_announcement_feed', token, {}).then(d => d.announcements || []);
}

// Basic reports (ScholarshipProgramController::reportsSummary).
function fetchScholarshipReportsSummary(token) {
  return authedPost('/scholarship_reports_summary', token, {});
}

// Shared second-stage gate for scholarship-programs.php / scholarship-
// providers.js: guardDashboard(['superadmin','platform_staff']) only
// checks role, not scholarship_access, since the superadmin-dashboard.php
// row linking here is visible to every platform_staff member regardless
// (see that file's comment). Mirrors the fail-safe every other role
// mismatch on this dashboard already gets: redirect to their own
// dashboard rather than showing a broken/forbidden page. Returns false
// after redirecting, so the caller's onReady can just `if (!x) return;`.
function requireScholarshipStaffAccess(user) {
  if (user && user.scholarship_access) return true;
  window.location.href = dashboardUrlForRole(user && user.role);
  return false;
}

// Second-stage gate for superadmin-staff.php ("Team & Staff"), same shape
// as requireScholarshipStaffAccess() above. The superadmin-dashboard.php
// row linking here is visible to every platform_staff member regardless
// (see that file's comment on the 'staff' row), since this page - like
// scholarship-programs.php - does its own real check.
//
// Unlike scholarship_access, the primary SuperAdmin is checked by role
// here rather than by trusting a backend-computed flag: the SuperAdmin
// isn't a row in the staff list at all (they're the one granting
// full_access to everyone else), so there's no `permissions` array for
// them to have 'full_access' *in* - and gating them on a boolean the
// backend forgets to send would lock the SuperAdmin out of their own
// team page, which a missing/late backend field should never be able to
// do. A platform_staff member still needs the real, backend-computed
// `full_access` boolean on the user payload (added to buildUserPayload()
// alongside scholarship_access: true only when their `permissions` array
// contains 'full_access') - that part can't be short-circuited
// client-side, since the frontend has no independent way to know what
// the SuperAdmin granted them.
function requireFullAccessStaff(user) {
  if (user && user.role === 'superadmin') return true;
  if (user && user.full_access) return true;
  window.location.href = dashboardUrlForRole(user && user.role);
  return false;
}
function addCashier(token, input) {
  return authedPost('/admin_accountant_admission_single', token, input)
    .then(d => d.accountant || (d.data && d.data.accountant) || d.data || d);
}
function addRegistrar(token, input) {
  return authedPost('/admin_registrar_admission_single', token, input)
    .then(d => d.registrar || (d.data && d.data.registrar) || d.data || d);
}
// Full per-person profile - only fetched on demand (opening an ID card),
// same as StudentIdCardsScreen.tsx/StaffIdCardsScreen.tsx: the list
// endpoints are summaries, these single-record ones carry the extra
// ID-card-only fields (dob, address, emergency contact, signature).
function fetchChildProfile(token, studentId) {
  return authedPost('/admin_child_profile', token, { student_id: studentId });
}
function fetchTeacherProfile(token, teacherId) {
  return authedPost('/admin_teacher_profile', token, { teacher_id: teacherId });
}
function fetchCashierProfile(token, cashierId) {
  return authedPost('/admin_accountant_profile', token, { accountant_id: cashierId });
}
function fetchRegistrarProfile(token, registrarId) {
  return authedPost('/admin_registrar_profile', token, { registrar_id: registrarId });
}
// admin_child_basic_profile_update/admin_teacher_profile_update/
// admin_accountant_profile_update - all three share the exact same
// {name,email,phone,address,gender,birthday,password?} shape server-side,
// just keyed to a different id field. Registrar has no such endpoint yet
// (admin_registrar_profile is read-only on the backend), so there is
// deliberately no updateRegistrarProfile here.
function updateStudentProfile(token, studentId, input) {
  return authedPost('/admin_child_basic_profile_update', token, { student_id: studentId, ...input });
}
function updateTeacherProfile(token, teacherId, input) {
  return authedPost('/admin_teacher_profile_update', token, { teacher_id: teacherId, ...input });
}
function updateCashierProfile(token, cashierId, input) {
  return authedPost('/admin_accountant_profile_update', token, { accountant_id: cashierId, ...input });
}
// Mints a 30-minute signed link to a printable HTML "Student Report"
// (attendance summary + fee/payment history) - opened in a new tab, not
// fetched as JSON, since the backend renders it as a full page the user
// can Print > Save as PDF from. Admin/superadmin only (requireAdmin() on
// the backend) - there is no teacher-facing equivalent yet.
function fetchStudentReportLink(token, studentId) {
  return authedPost('/admin_student_report_link', token, { student_id: studentId });
}

// Walk-in admission QR flow (admission-management.js / preregistrations.js
// / student-preregister.js). Config is what fields/questions/documents
// the school's public pre-registration form asks for; preregistrations
// are the submissions a registrar reviews and carries into admission.php.
function fetchPreregistrationConfig(token) {
  return authedPost('/admin_preregistration_config_get', token, {});
}
function updatePreregistrationConfig(token, input) {
  return authedPost('/admin_preregistration_config_update', token, input);
}
function fetchPreregistrationList(token, status) {
  return authedPost('/admin_preregistration_list', token, status ? { status } : {}).then(d => d.preregistrations || []);
}
function fetchPreregistrationDetail(token, id) {
  return authedPost('/admin_preregistration_detail', token, { id });
}
function rejectPreregistration(token, id, reason) {
  return authedPost('/admin_preregistration_reject', token, { id, reason });
}
function markPreregistrationAdmitted(token, id, studentId) {
  return authedPost('/admin_preregistration_mark_admitted', token, { id, student_id: studentId });
}
function deletePreregistration(token, id) {
  return authedPost('/admin_preregistration_delete', token, { id });
}

// StudentNumberFormat config - src/services/studentNumberService.ts's own
// backend/RN field-name translation is reproduced here (running vs
// running_number, reset_policy 'yearly'|'continuous' vs UI's boolean, etc.)
// so the rest of student-staff-codes.js can work with the same simple
// draft shape the RN screen does.
function codeConfigFromFormat(format) {
  format = format || {};
  return {
    id: format.id ?? null,
    prefix: format.prefix || '',
    suffix: format.suffix || '',
    separator: format.separator || '',
    include_campus_code: !!format.include_campus_code,
    include_department_code: !!format.include_department_code,
    include_academic_year: !!format.include_academic_year,
    include_admission_year: !!format.include_admission_year,
    digit_length: format.digit_length ?? 4,
    start_number: format.running_number_start ?? 1,
    reset_mode: format.reset_policy === 'yearly' ? 'yearly' : 'never',
    year_format: format.year_format === 'short' ? 'short' : 'full',
    is_active: !!format.is_active,
    updated_at: format.updated_at || null,
  };
}
function codeDraftToBackend(draft, targetType) {
  return {
    target_type: targetType,
    prefix: draft.prefix,
    suffix: draft.suffix,
    separator: draft.separator,
    digit_length: draft.digit_length,
    running_number_start: draft.start_number,
    reset_policy: draft.reset_mode === 'yearly' ? 'yearly' : 'continuous',
    include_school_code: true,
    include_campus_code: draft.include_campus_code,
    include_department_code: draft.include_department_code,
    include_academic_year: draft.include_academic_year,
    include_admission_year: draft.include_admission_year,
    include_academic_type: false,
    year_format: draft.year_format,
  };
}
function fetchStudentNumberConfig(token, targetType) {
  return authedPost('/admin_student_number_format_show', token, { target_type: targetType }).then(d => ({
    config: codeConfigFromFormat(d.format),
    preview: (d.preview || ''),
    issued_count: d.issued_count || 0,
  }));
}
function previewStudentNumber(token, draft, targetType) {
  return authedPost('/admin_student_number_format_preview', token, codeDraftToBackend(draft, targetType))
    .then(d => d.preview || '');
}
function saveStudentNumberConfig(token, draft, targetType) {
  return authedPost('/admin_student_number_format_save', token, codeDraftToBackend(draft, targetType)).then(d => ({
    config: codeConfigFromFormat(d.format),
    preview: (d.preview || ''),
  }));
}

// Shared ID card renderer - matches StudentIdCard.tsx's layout exactly
// (school logo/name/address, badge, avatar overlapping the header band,
// name + optional Arabic name, class/section pill, a bordered field
// panel of only the fields on file, and a footer row with a QR code +
// signature). Reused by student-id-card.js (self-service),
// student-id-cards.js and staff-id-cards.js (admin browsers).
// Two ways to dress the card header, both admin-set and both stored on the
// school record so every viewer (admin preview, student's own card, printed
// batch) resolves the same one: an uploaded background image, or one of
// these colours. An uploaded image wins while it is present; removing it
// falls back to the chosen colour. Neither is a per-viewer preference any
// more - the old picker lived in localStorage, so it never reached the
// students it was styling.
const CARD_THEMES = [
  { key: 'emerald', gradient: 'linear-gradient(135deg, #0B3D2E, #1FAE64)' },
  { key: 'gold', gradient: 'linear-gradient(135deg, #7C5A0B, #D4A64A)' },
  { key: 'ocean', gradient: 'linear-gradient(135deg, #0B2545, #2B7FD4)' },
  { key: 'charcoal', gradient: 'linear-gradient(135deg, #111827, #374151)' },
];
function idCardThemeGradient(key) {
  return (CARD_THEMES.find(x => x.key === key) || CARD_THEMES[0]).gradient;
}
// Same wire format as studentIdCardService.ts's buildStudentIdQrPayload -
// used for both student and staff cards there too, so this matches it
// exactly rather than inventing a separate staff prefix.
function buildIdCardQrPayload(code) {
  return 'MUSLIMEDU:STUDENT:' + code;
}
function idCardQrImgUrl(code) {
  // Generated on-device by qr.js so ID cards still render with no network.
  // Falls back to the hosted generator if qr.js somehow did not load.
  if (window.MuslimEduQR) {
    return window.MuslimEduQR.toDataURL(buildIdCardQrPayload(code), { margin: 1 });
  }
  return 'https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=0&data=' + encodeURIComponent(buildIdCardQrPayload(code));
}
function buildIdCardHtml(s) {
  const bgUrl = absoluteUrl(s.background);
  const headerBg = bgUrl
    ? 'background-image:linear-gradient(rgba(11,13,16,0.52),rgba(11,13,16,0.52)),url(\'' + bgUrl.replace(/'/g, '') + '\');'
    : 'background:' + idCardThemeGradient(s.themeKey) + ';';
  const initial = (s.name || '?').trim().charAt(0).toUpperCase();
  const classSection = [s.className, s.sectionName].filter(Boolean).join(' - ');

  const fields = [
    { label: t('id_card.id_no', 'ID No'), value: s.code },
    { label: t('id_card.dob', 'Date of Birth'), value: s.dob },
    { label: t('id_card.address', 'Address'), value: s.address },
    { label: t('id_card.emergency_contact', 'Emergency Contact'), value: s.emergencyContactName },
    { label: t('id_card.emergency_phone', 'Emergency Phone'), value: s.emergencyContactPhone },
  ].filter(f => !!f.value);

  // Logo centred on its own row at the top of the header (directly above
  // the avatar that overlaps the header's bottom edge), then the school's
  // identity split left/right: English down the left, Arabic down the
  // right. Each text line carries dir="auto" so the browser picks
  // direction from the text's own first strong character - without that,
  // an English address sitting in a right-to-left block renders as
  // ".Banale, Pagadian City" with its full stop flipped to the front. The
  // row itself is pinned dir="ltr" so English stays on the left even when
  // the app UI is in Arabic and the card is printed from an RTL page.
  // Arabic column falls back to the English value per line, so a school
  // that has only filled in some of the Arabic fields still gets a
  // balanced two-column header instead of a half-empty right side.
  const arName = s.schoolNameAr || s.schoolName || '';
  const arAddress = s.schoolAddressAr || s.schoolAddress || '';
  const arSecReg = s.secRegAr || s.secReg || '';
  const secRegLine = s.secReg ? t('id_card.sec_reg_prefix', 'SEC REG') + ' ' + s.secReg : null;
  const secRegLineAr = arSecReg ? t('id_card.sec_reg_prefix_ar', 'س.ت') + ' ' + arSecReg : null;
  return (
    '<div class="idcard-wrap">' +
      '<div class="idcard-header" style="' + headerBg + '">' +
        '<div class="idcard-header-row" dir="ltr">' +
          '<div class="idcard-school-col idcard-school-en">' +
            '<div class="idcard-school" dir="auto">' + escapeHtml(s.schoolName || t('id_card.school_fallback', 'School')) + '</div>' +
            (s.schoolAddress ? '<div class="idcard-school-sub" dir="auto">' + escapeHtml(s.schoolAddress) + '</div>' : '') +
            (secRegLine ? '<div class="idcard-school-sub" dir="auto">' + escapeHtml(secRegLine) + '</div>' : '') +
          '</div>' +
          // Logo sits between the two columns rather than on a row of its
          // own: centred in the header, directly above the avatar, and it
          // occupies the slack that otherwise pooled in the middle once
          // both school names shrank to a single line each.
          (s.schoolLogo
            ? '<img class="idcard-logo" src="' + escapeHtml(absoluteUrl(s.schoolLogo)) + '" alt="" />'
            : '<span class="idcard-logo idcard-logo-placeholder"></span>') +
          '<div class="idcard-school-col idcard-school-ar-col" dir="rtl">' +
            (arName ? '<div class="idcard-school idcard-school-ar" dir="auto">' + escapeHtml(arName) + '</div>' : '') +
            (arAddress ? '<div class="idcard-school-sub" dir="auto">' + escapeHtml(arAddress) + '</div>' : '') +
            (secRegLineAr ? '<div class="idcard-school-sub" dir="auto">' + escapeHtml(secRegLineAr) + '</div>' : '') +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="idcard-avatar-wrap">' +
        (s.photo
          ? '<img class="idcard-avatar" src="' + escapeHtml(absoluteUrl(s.photo)) + '" alt="" />'
          : '<span class="idcard-avatar-fallback">' + escapeHtml(initial) + '</span>') +
      '</div>' +

      '<div class="idcard-body">' +
        (s.nameAr ? '<div class="idcard-name-ar">' + escapeHtml(s.nameAr) + '</div>' : '') +
        '<div class="idcard-name">' + escapeHtml(s.name) + '</div>' +
        (classSection ? '<span class="idcard-meta-pill">' + escapeHtml(classSection) + '</span>' : '') +

        '<div class="idcard-panel">' +
          fields.map(f =>
            '<div class="idcard-panel-row"><span class="idcard-panel-label">' + escapeHtml(f.label) + '</span>' +
              '<span class="idcard-panel-value">' + escapeHtml(f.value) + '</span></div>'
          ).join('') +
        '</div>' +

        '<div class="idcard-footer-row">' +
          '<div class="idcard-qr-wrap"><img src="' + idCardQrImgUrl(s.code) + '" alt="QR code" /></div>' +
          '<div class="idcard-sig-col">' +
            '<div class="idcard-sig-box">' + (s.signatureUrl ? '<img src="' + escapeHtml(absoluteUrl(s.signatureUrl)) + '" alt="" />' : '') + '</div>' +
            '<div class="idcard-sig-caption">' + escapeHtml(t('id_card.signature', 'Signature')) + '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
}
// ID card background upload - admin only, one image for the whole school.
// Posted to the same /admin_school_profile_update endpoint the Institution
// Profile logo/seal uploads already use, as an `id_card_background` file
// part named to match the `id_card_background` field /my_school_branding
// already returns. Because it lives on the school record rather than in
// each viewer's localStorage, every student's card and every admin preview
// picks the new background up on their next load - that server round trip
// IS the sync.
const ID_CARD_BG_MAX_BYTES = 3 * 1024 * 1024;
const ID_CARD_BG_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
function buildThemeRowHtml(activeKey) {
  return '<div class="theme-row" id="themeRow">' +
    CARD_THEMES.map(x =>
      '<button type="button" class="theme-swatch' + (x.key === activeKey ? ' active' : '') + '" data-key="' + x.key + '" style="background:' + x.gradient + '"></button>'
    ).join('') +
  '</div>';
}
// Colour choice rides along on the same school record as the background
// image, for the same reason: it has to be the same for everyone who
// renders this school's cards, not per-device.
function saveIdCardTheme(token, themeKey) {
  return authedPost('/admin_school_profile_update', token, { id_card_theme: themeKey }).then(d => d.school || {});
}
function saveIdCardBackground(token, file) {
  const form = new FormData();
  form.append('id_card_background', file, file.name || 'id-card-bg.jpg');
  return fetch(API_BASE_URL + '/admin_school_profile_update', {
    method: 'POST',
    headers: { Accept: 'application/json', Authorization: 'Bearer ' + token },
    body: form,
  }).then(res => res.json().catch(() => ({})).then(data => {
    if (!res.ok) throw new Error((data && data.message) || 'Request failed (' + res.status + ')');
    return data.school || {};
  }));
}
// Empty string rather than null - the same "clear this file field" shape
// the profile update endpoint already accepts for logo/seal.
function clearIdCardBackground(token) {
  return authedPost('/admin_school_profile_update', token, { id_card_background: '' }).then(d => d.school || {});
}

// Position/zoom picker for a just-picked background photo - drag to pan,
// slider to zoom, over a frame standing in for the ID card header's own
// proportions (see .bg-crop-frame comment in dashboard.css for why it's an
// approximation rather than an exact per-school match). Bakes the visible
// region into one flat cropped JPEG client-side, the same shape
// uploadBackground() already expects - no backend change needed, the
// server still just stores a single image.
const BG_CROP_FRAME_W = 288;
const BG_CROP_FRAME_H = 160;
const BG_CROP_OUTPUT_SCALE = 3; // export at 3x the on-screen frame for print sharpness
function openBackgroundCropper(file, onDone) {
  let backdrop = document.getElementById('bgCropBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'bgCropBackdrop';
    backdrop.className = 'sheet-backdrop';
    document.body.appendChild(backdrop);
  }
  // Rebuilt fresh every call (not just the first time) so the drag/zoom
  // listeners wired below never stack up across repeated opens - the old
  // frame/img/zoom nodes and everything bound to them are simply discarded.
  backdrop.innerHTML =
    '<div class="sheet-panel form">' +
      '<div class="sheet-title-row">' +
        '<div class="sheet-title">' + escapeHtml(t('student_id_cards.crop_title', 'Position Background Image')) + '</div>' +
        '<button type="button" class="sheet-close-btn" id="bgCropCloseBtn">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="bg-crop-frame" id="bgCropFrame"><img id="bgCropImg" draggable="false" alt="" /></div>' +
      '<div class="bg-crop-hint">' + escapeHtml(t('student_id_cards.crop_hint', 'Drag to reposition. Use the slider to zoom.')) + '</div>' +
      '<input type="range" class="bg-crop-zoom" id="bgCropZoom" min="1" max="3" step="0.01" value="1" />' +
      '<div class="sheet-form-actions">' +
        '<button type="button" class="sheet-btn-secondary" id="bgCropCancelBtn">' + escapeHtml(t('common.cancel', 'Cancel')) + '</button>' +
        '<button type="button" class="sheet-btn-primary" id="bgCropUseBtn">' + escapeHtml(t('student_id_cards.crop_use', 'Use This Photo')) + '</button>' +
      '</div>' +
    '</div>';

  const frame = document.getElementById('bgCropFrame');
  const imgEl = document.getElementById('bgCropImg');
  const zoomEl = document.getElementById('bgCropZoom');

  const objectUrl = URL.createObjectURL(file);
  let natW = 0, natH = 0;
  let baseScale = 1; // scale at which the image exactly covers the frame at zoom=1
  let scale = 1;
  let offsetX = 0, offsetY = 0; // image top-left, in on-screen frame px
  let dragging = false, dragStartX = 0, dragStartY = 0, startOffsetX = 0, startOffsetY = 0;

  function clampOffset() {
    const w = natW * baseScale * scale;
    const h = natH * baseScale * scale;
    offsetX = Math.max(Math.min(0, BG_CROP_FRAME_W - w), Math.min(0, offsetX));
    offsetY = Math.max(Math.min(0, BG_CROP_FRAME_H - h), Math.min(0, offsetY));
  }
  function render() {
    const w = natW * baseScale * scale;
    const h = natH * baseScale * scale;
    imgEl.style.width = w + 'px';
    imgEl.style.height = h + 'px';
    imgEl.style.transform = 'translate(' + offsetX + 'px,' + offsetY + 'px)';
  }

  imgEl.onload = () => {
    natW = imgEl.naturalWidth;
    natH = imgEl.naturalHeight;
    if (!natW || !natH) return;
    baseScale = Math.max(BG_CROP_FRAME_W / natW, BG_CROP_FRAME_H / natH);
    scale = 1;
    zoomEl.value = '1';
    offsetX = (BG_CROP_FRAME_W - natW * baseScale) / 2;
    offsetY = (BG_CROP_FRAME_H - natH * baseScale) / 2;
    clampOffset();
    render();
  };
  imgEl.onerror = () => {
    close();
    showToast(t('student_id_cards.crop_load_error', 'Could not open that image.'));
  };
  imgEl.src = objectUrl;

  zoomEl.addEventListener('input', () => {
    scale = parseFloat(zoomEl.value) || 1;
    clampOffset();
    render();
  });

  function pointerDown(e) {
    dragging = true;
    const p = e.touches ? e.touches[0] : e;
    dragStartX = p.clientX; dragStartY = p.clientY;
    startOffsetX = offsetX; startOffsetY = offsetY;
    e.preventDefault();
  }
  function pointerMove(e) {
    if (!dragging) return;
    const p = e.touches ? e.touches[0] : e;
    offsetX = startOffsetX + (p.clientX - dragStartX);
    offsetY = startOffsetY + (p.clientY - dragStartY);
    clampOffset();
    render();
  }
  function pointerUp() { dragging = false; }

  frame.addEventListener('mousedown', pointerDown);
  window.addEventListener('mousemove', pointerMove);
  window.addEventListener('mouseup', pointerUp);
  frame.addEventListener('touchstart', pointerDown, { passive: false });
  frame.addEventListener('touchmove', pointerMove, { passive: false });
  frame.addEventListener('touchend', pointerUp);

  function cleanup() {
    URL.revokeObjectURL(objectUrl);
    window.removeEventListener('mousemove', pointerMove);
    window.removeEventListener('mouseup', pointerUp);
  }
  function close() {
    cleanup();
    backdrop.classList.remove('open');
  }
  document.getElementById('bgCropCancelBtn').addEventListener('click', close);
  document.getElementById('bgCropCloseBtn').addEventListener('click', close);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });

  document.getElementById('bgCropUseBtn').addEventListener('click', () => {
    const canvas = document.createElement('canvas');
    canvas.width = BG_CROP_FRAME_W * BG_CROP_OUTPUT_SCALE;
    canvas.height = BG_CROP_FRAME_H * BG_CROP_OUTPUT_SCALE;
    const ctx = canvas.getContext('2d');
    const drawScale = baseScale * scale * BG_CROP_OUTPUT_SCALE;
    ctx.drawImage(imgEl, offsetX * BG_CROP_OUTPUT_SCALE, offsetY * BG_CROP_OUTPUT_SCALE, natW * drawScale, natH * drawScale);
    const tryQuality = (q) => {
      canvas.toBlob(blob => {
        if (!blob) { showToast(t('student_id_cards.crop_failed', 'Could not process that image.')); return; }
        if (blob.size <= ID_CARD_BG_MAX_BYTES || q <= 0.5) {
          close();
          onDone(new File([blob], 'id-card-bg.jpg', { type: 'image/jpeg' }));
        } else {
          tryQuality(q - 0.1);
        }
      }, 'image/jpeg', q);
    };
    tryQuality(0.9);
  });

  backdrop.classList.add('open');
}

// Shared circular avatar-with-initials-fallback, used by newsfeed.js,
// create-post.js, messages.js and chat-box.js - same onerror-swap pattern
// student-schedule.js's teacherAvatarHtml() already uses for teacher
// photos, generalized here for any name+photo pair.
function userInitials(name) {
  const parts = (name || '?').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
function postAvatarHtml(photo, name, size) {
  const initials = escapeHtml(userInitials(name));
  const style = 'width:' + size + 'px;height:' + size + 'px;';
  if (photo) {
    return '<span class="post-avatar" style="' + style + '"><img src="' + escapeHtml(photo) + '" alt="" onerror="this.parentElement.innerHTML=\'' + initials + '\'" /></span>';
  }
  return '<span class="post-avatar" style="' + style + '">' + initials + '</span>';
}

// ── Newsfeed (posts) - web port of src/services/postService.ts ──
// Same endpoints, same field names, same normalize-image-paths-to-absolute-
// URLs behavior as the RN service. Posted photos are compressed client-side
// the same canvas-based way institution-profile.js's compressImageFile()
// already does for logo/seal - this app has no server-side thumbnailing, so
// an uncompressed multi-megabyte phone photo would otherwise upload as-is.
function normalizePostAuthor(raw) {
  if (!raw) return null;
  return { ...raw, photo: absoluteUrl(raw.photo) };
}
function normalizePost(raw) {
  return {
    ...raw,
    images: (raw.images || []).map(absoluteUrl).filter(Boolean),
    author: normalizePostAuthor(raw.author),
    repost_of: raw.repost_of
      ? {
          ...raw.repost_of,
          images: (raw.repost_of.images || []).map(absoluteUrl).filter(Boolean),
          author: normalizePostAuthor(raw.repost_of.author),
        }
      : null,
  };
}
function normalizeComment(raw) {
  return {
    ...raw,
    likes_count: raw.likes_count || 0,
    is_liked: !!raw.is_liked,
    author: normalizePostAuthor(raw.author),
    replies: (raw.replies || []).map(normalizeComment),
  };
}
function fetchFeed(token, beforeId) {
  return authedPost('/post_feed', token, beforeId ? { before_id: beforeId } : {}).then(data => ({
    posts: (data.posts || []).map(normalizePost),
    nextBeforeId: data.next_before_id ?? null,
    hasMore: !!data.has_more,
  }));
}
// multipart when images are attached (files is an array of File/Blob),
// plain JSON otherwise - same hasFiles branch every other upload endpoint
// in this app already follows (saveInstitutionProfile, saveIdCardBackground).
function createPost(token, fields, files) {
  files = files || [];
  const form = new FormData();
  if (fields.content) form.append('content', fields.content);
  form.append('privacy', fields.privacy);
  files.forEach((file, i) => form.append('images[]', file, file.name || ('photo_' + i + '.jpg')));
  return fetch(API_BASE_URL + '/post_create', {
    method: 'POST',
    headers: { Accept: 'application/json', Authorization: 'Bearer ' + token },
    body: form,
  }).then(res => res.json().catch(() => ({})).then(data => {
    if (!res.ok) throw new Error((data && data.message) || 'Request failed (' + res.status + ')');
    return normalizePost(data.post);
  }));
}
function deletePost(token, postId) {
  return authedPost('/post_delete', token, { post_id: postId });
}
function updatePost(token, postId, fields) {
  return authedPost('/post_update', token, Object.assign({ post_id: postId }, fields)).then(d => normalizePost(d.post));
}
function updatePostPrivacy(token, postId, privacy) {
  return updatePost(token, postId, { privacy: privacy });
}
function togglePostLike(token, postId) {
  return authedPost('/post_like_toggle', token, { post_id: postId }).then(d => ({ isLiked: !!d.is_liked, likesCount: d.likes_count || 0 }));
}
function fetchPostComments(token, postId) {
  return authedPost('/post_comment_list', token, { post_id: postId }).then(d => (d.comments || []).map(normalizeComment));
}
function addPostComment(token, postId, content, parentId) {
  const body = { post_id: postId, content: content };
  if (parentId) body.parent_id = parentId;
  return authedPost('/post_comment_create', token, body).then(d => ({
    comment: normalizeComment(d.comment),
    commentsCount: d.comments_count || 0,
    parentId: d.parent_id ?? null,
  }));
}
function deletePostComment(token, commentId) {
  return authedPost('/post_comment_delete', token, { comment_id: commentId });
}
function toggleCommentLike(token, commentId) {
  return authedPost('/post_comment_like_toggle', token, { comment_id: commentId }).then(d => ({ isLiked: !!d.is_liked, likesCount: d.likes_count || 0 }));
}
function repostPost(token, postId, content, privacy) {
  return authedPost('/post_repost', token, { post_id: postId, content: content, privacy: privacy || 'school' }).then(d => normalizePost(d.post));
}
// POST /profile_feed - the "stalk someone's profile" surface: who they
// are, plus their own posts INCLUDING their reposts (reposts never show
// in the main feed - see fetchFeed above/PostController::feed - so this
// is the only place another person's reposts are visible). Web port of
// postService.ts's fetchUserProfile(), used by UserProfileModal.tsx.
function fetchUserProfile(token, userId, beforeId) {
  const body = { user_id: userId };
  if (beforeId) body.before_id = beforeId;
  return authedPost('/profile_feed', token, body).then(d => ({
    profile: d.profile ? Object.assign({}, d.profile, { photo: absoluteUrl(d.profile.photo) }) : null,
    posts: (d.posts || []).map(normalizePost),
    nextBeforeId: d.next_before_id ?? null,
    hasMore: !!d.has_more,
  }));
}
// Same canvas-based resize/compress loop as institution-profile.js's
// compressImageFile(), tuned for post photos (they can print up to 20 per
// post, so 900px/~180KB keeps a full composer's uploads reasonable) rather
// than the smaller 800px/200KB logo target. PNG is preserved so a
// screenshot or graphic with transparency isn't flattened onto black the
// same bug institution-profile.js's logo upload had - see that file's fix.
function compressPostPhoto(file) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpeg|jpg|webp)$/.test(file.type)) {
      reject(new Error(t('create_post.err_image_type', 'Please choose a JPG, PNG, or WEBP image.')));
      return;
    }
    const isPng = file.type === 'image/png';
    const outputType = isPng ? 'image/png' : 'image/jpeg';
    const outputExt = isPng ? '.png' : '.jpg';
    const maxBytes = 180 * 1024;
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const drawAt = (maxDim) => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        return canvas;
      };
      const finish = (blob) => {
        URL.revokeObjectURL(objectUrl);
        resolve(new File([blob], (file.name || 'photo').replace(/\.\w+$/, '') + outputExt, { type: outputType }));
      };
      const failProcess = () => reject(new Error(t('create_post.err_image_process', 'Could not process that image. Please try a different one.')));
      if (isPng) {
        const tryDim = (maxDim) => {
          drawAt(maxDim).toBlob(blob => {
            if (!blob) { failProcess(); return; }
            if (blob.size <= maxBytes || maxDim <= 250) finish(blob);
            else tryDim(Math.round(maxDim * 0.75));
          }, outputType);
        };
        tryDim(900);
      } else {
        const canvas = drawAt(900);
        const tryQuality = (q) => {
          canvas.toBlob(blob => {
            if (!blob) { failProcess(); return; }
            if (blob.size <= maxBytes || q <= 0.4) finish(blob);
            else tryQuality(q - 0.15);
          }, outputType, q);
        };
        tryQuality(0.85);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error(t('create_post.err_image_process', 'Could not process that image. Please try a different one.'))); };
    img.src = objectUrl;
  });
}

// ── Messages (1:1 chat) - web port of src/services/chatService.ts ──
function normalizeChatThread(raw) {
  return {
    thread_id: raw.thread_id,
    user_id: raw.user_id,
    name: raw.name || '',
    photo: absoluteUrl(raw.photo || null),
    last_message: raw.last_message ?? null,
    last_message_at: raw.last_message_at ?? null,
    unread_count: raw.unread_count || 0,
  };
}
function fetchThreadList(token) {
  return authedPost('/message_thread_list', token, {}).then(d => (d.threads || []).map(normalizeChatThread));
}
function startMessageThread(token, userId) {
  return authedPost('/message_thread_start', token, { reciver_id: userId }).then(d => d.thread_id);
}
function fetchChatMessages(token, threadId, afterId) {
  const body = { thread_id: threadId };
  if (afterId) body.after_id = afterId;
  return authedPost('/message_chat_list', token, body).then(d => d.chats || []);
}
function sendChatMessage(token, params) {
  const body = { message: params.message };
  if (params.threadId) body.thread_id = params.threadId;
  if (params.userId) body.reciver_id = params.userId;
  return authedPost('/message_chat_send', token, body);
}
function searchMessageUsers(token, query) {
  return authedPost('/message_user_search', token, { query: query }).then(d => (d.users || []).map(u => ({
    user_id: u.user_id,
    name: u.name || '',
    photo: absoluteUrl(u.photo || null),
    gender: u.gender ?? null,
  })));
}
// Same gender-segregation rule as src/utils/genderGuard.ts - a viewer never
// sees, or is offered to message/see comments from, someone of the
// opposite gender. Whichever side's gender is missing, nothing is hidden
// (fail-open, matching the RN util exactly) rather than guessing.
function isOppositeGender(viewerGender, otherGender) {
  if (!viewerGender || !otherGender) return false;
  const v = String(viewerGender).toLowerCase();
  const o = String(otherGender).toLowerCase();
  if (v !== 'male' && v !== 'female') return false;
  if (o !== 'male' && o !== 'female') return false;
  return v !== o;
}

// Student portal reads/writes - mirrors src/services/studentAcademicService.ts,
// academicScheduleService.ts and studentPortalService.ts's authedPost shape,
// same token-bearer POST convention as everything above.
function fetchStudentProgress(token) {
  return authedPost('/student_progress_summary', token);
}
// Backend (AcademicScheduleController) is flat-POST style with its own
// field names: integer day_of_week (0=Sunday..6=Saturday), start_time/
// end_time, period_label - not the starts_at/ends_at/code/string-day shape
// every page here consumes. Mirrors src/services/academicScheduleService.ts's
// fromBackendSchedule() adapter - without it, student-schedule.js's
// row.starts_at.localeCompare(...) throws on undefined and the page shows
// a generic "Could not load your schedule" for what is actually just an
// un-translated response shape.
const SCHEDULE_INT_TO_DAY = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
function fromBackendSchedule(row) {
  return {
    id: row.id,
    code: row.period_label || ('SCH-' + row.id),
    day_of_week: SCHEDULE_INT_TO_DAY[row.day_of_week] ?? 'monday',
    starts_at: row.start_time,
    ends_at: row.end_time,
    room_id: row.room_id ?? null,
    section_id: row.section_id ?? null,
    teacher_id: row.teacher_id ?? null,
    subject_id: row.subject_id ?? null,
    meeting_type: row.status,
    room_name: row.room_name ?? null,
    section_name: row.section_name ?? null,
    // Carried through for student-id-card.js, which uses it to build the
    // "Class - Section" pill when /me doesn't carry a class name itself.
    class_name: row.class_name ?? null,
    teacher_name: row.teacher_name ?? null,
    teacher_photo: row.teacher_photo ?? null,
    subject_name: row.subject_name ?? null,
    subject_color: row.subject_color ?? null,
    campus_name: row.campus_name ?? null,
    units: row.units ?? null,
  };
}
function fetchMySchedule(token) {
  return authedPost('/my_schedules', token).then(data => (data.schedules || data.data || []).map(fromBackendSchedule));
}
function fetchMySchoolBranding(token) {
  return authedPost('/my_school_branding', token);
}

// Shared by student-id-cards.js / staff-id-cards.js - buildIdCardHtml()'s
// header needs at least a school name/address to not look broken, so
// those are a hard gate in front of both admin ID-card pages. SEC reg has
// no backend column in most deployments yet, so it's a dismissible nudge
// instead of a hard gate here - blocking every admin out of ID cards
// entirely over a field their backend can't fill in yet would be worse
// than just not showing it on the card.
function schoolProfileGateHtml(branding) {
  const missing = [];
  if (!branding.name) missing.push('school name');
  if (!branding.address) missing.push('address');
  if (missing.length === 0) return null;
  return (
    '<div class="list-empty">' +
      '<div class="list-empty-title">Finish your school profile first</div>' +
      '<div class="list-empty-sub">ID cards need your school’s ' + escapeHtml(missing.join(' and ')) + ' on file before they can be generated.</div>' +
      '<a href="institution-profile.php" class="util-save-btn pill" style="max-width:240px;margin:18px auto 0;display:flex;">Go to Institution Profile</a>' +
    '</div>'
  );
}
const SEC_REG_NUDGE_DISMISSED_KEY = 'muslimedu_secreg_nudge_dismissed';
function secRegNudgeHtml(branding) {
  if (branding.sec_reg || localStorage.getItem(SEC_REG_NUDGE_DISMISSED_KEY) === '1') return '';
  return (
    '<div class="secreg-nudge">' +
      '<span>Add your school’s SEC Registration No. in <a href="institution-profile.php">Institution Profile</a> to show it on ID cards.</span>' +
      '<button type="button" class="secreg-nudge-dismiss" id="secRegNudgeDismiss" aria-label="Dismiss">' + icon('close', { size: 13, color: 'var(--subtle)' }) + '</button>' +
    '</div>'
  );
}
function wireSecRegNudgeDismiss() {
  document.getElementById('secRegNudgeDismiss')?.addEventListener('click', (e) => {
    localStorage.setItem(SEC_REG_NUDGE_DISMISSED_KEY, '1');
    e.currentTarget.closest('.secreg-nudge')?.remove();
  });
}
function fetchStudentGrades(token) {
  return authedPost('/marks', token);
}
// Same /attendance endpoint the RN app's fetchStudentAttendance already
// reads (month/year must both be passed - backend does not default them).
// Used by student-subject-status.js to filter this month's marks down to
// one subject; "attedances" is the backend's own (misspelled) response key.
function fetchStudentAttendance(token, month, year) {
  return authedPost('/attendance', token, { month: month, year: year })
    .then(d => d.attedances || d.attendances || []);
}
function fetchStudentQuarterlyReport(token) {
  return authedPost('/student_quarterly_report', token);
}
function fetchStudentDocuments(token) {
  return authedPost('/student_document_list', token);
}
function requestStudentDocument(token, documentType, purpose, copies, deliveryMethod) {
  return authedPost('/student_document_request', token, {
    document_type: documentType, purpose, copies,
    delivery_method: deliveryMethod || 'pickup',
  });
}
function cancelStudentDocument(token, documentId) {
  return authedPost('/student_document_cancel', token, { document_id: documentId });
}
function fetchMyUploadedDocuments(token) {
  return authedPost('/student_document_upload_list', token).then(data => data.documents || []);
}
function uploadMyDocument(token, title, file) {
  const form = new FormData();
  form.append('title', title);
  form.append('file', file, file.name || 'document');
  return fetch(API_BASE_URL + '/student_document_upload_store', {
    method: 'POST',
    headers: { Accept: 'application/json', Authorization: 'Bearer ' + token },
    body: form,
  }).then(res => res.json().catch(() => ({})).then(data => {
    if (!res.ok) throw new Error((data && data.message) || 'Request failed (' + res.status + ')');
    return data.document;
  }));
}
function deleteMyDocument(token, documentId) {
  return authedPost('/student_document_upload_delete', token, { document_id: documentId });
}
function fetchServiceCatalog(token) {
  return authedPost('/student_service_catalog', token);
}
function storeServiceRequest(token, serviceKey, subject, details) {
  return authedPost('/student_service_request_store', token, { service_key: serviceKey, subject, details });
}
function cancelServiceRequest(token, requestId) {
  return authedPost('/student_service_request_cancel', token, { request_id: requestId });
}

function fetchAdminFeeList(token) {
  return authedPost('/admin_fee_list', token, {}).then(d => d.invoices || []);
}
// Shared by admin and accountant/cashier - admin_fee_record_payment accepts
// either role (requireAdminOrAccountant on the backend). paidAmount is the
// amount being paid NOW, added to whatever's already on the invoice.
function recordFeePayment(token, feeId, paidAmount, paymentMethod) {
  return authedPost('/admin_fee_record_payment', token, {
    fee_id: feeId,
    paid_amount: paidAmount,
    payment_method: paymentMethod,
  }).then(d => d.invoice);
}

// --- Activity & Requests (admin) ----------------------------------------
// Attendance analytics/locks - mirrors AdminAttendanceAnalyticsScreen.tsx /
// adminAttendanceService.ts (admin_attendance_dashboard/_locks_list/_unlock).
function fetchAdminClasses(token) {
  return authedPost('/admin_class_list', token, {}).then(d => d.classes || d.data || []);
}
function fetchAttendanceAnalytics(token, filters) {
  filters = filters || {};
  return authedPost('/admin_attendance_dashboard', token, {
    class_id: filters.classId || null,
    section_id: filters.sectionId || null,
    subject_id: filters.subjectId || null,
    teacher_id: filters.teacherId || null,
    date_from: filters.dateFrom || null,
    date_to: filters.dateTo || null,
  }).then(d => ({
    status_counts: Object.assign({ present: 0, late: 0, absent: 0, excused: 0, leave: 0 }, d.status_counts || {}),
    total_marked: d.total_marked || 0,
    attendance_percentage: d.attendance_percentage || 0,
    daily_trend: d.daily_trend || [],
  }));
}
function fetchAttendanceLocks(token) {
  return authedPost('/admin_attendance_locks_list', token).then(d => d.locks || []);
}
function unlockAttendance(token, sectionId, subjectId, date) {
  return authedPost('/admin_attendance_unlock', token, { section_id: sectionId, subject_id: subjectId, date: date });
}

// Document requests (admin fulfillment) - mirrors StudentDocumentRequestsScreen.tsx /
// studentPortalService.ts.
function fetchAdminDocumentRequests(token) {
  return authedPost('/admin_student_document_list', token).then(d => (d.requests && d.requests.data) || []);
}
// fileBlob is optional - the backend already accepted an attached file here
// (adminDocumentIssue's own $request->hasFile('file') branch), the web app
// just never sent one. Needed now that a request can ask for a digital
// copy: without a file, marking it "issued" leaves download_url null and
// the student has nothing to download.
function issueAdminDocument(token, documentId, fileBlob) {
  if (!fileBlob) {
    return authedPost('/admin_student_document_issue', token, { document_id: documentId });
  }
  const form = new FormData();
  form.append('document_id', String(documentId));
  form.append('file', fileBlob, fileBlob.name || 'document');
  return fetch(API_BASE_URL + '/admin_student_document_issue', {
    method: 'POST',
    headers: { Accept: 'application/json', Authorization: 'Bearer ' + token },
    body: form,
  }).then(res => res.json().catch(() => ({})).then(data => {
    if (!res.ok) throw new Error((data && data.message) || firstValidationError(data) || 'Request failed (' + res.status + ')');
    return data;
  }));
}
function rejectAdminDocument(token, documentId, reason) {
  return authedPost('/admin_student_document_reject', token, { document_id: documentId, reason: reason });
}

// Alumni applications (admin review) - mirrors AlumniApplicationsScreen.tsx /
// alumniRegistrationService.ts. Scoped server-side to the admin's own school.
function fetchPendingAlumniRegistrations(token) {
  return authedPost('/admin_alumni_registration_list', token).then(d => d.registrations || []);
}
function approveAlumniRegistration(token, id) {
  return authedPost('/admin_alumni_registration_approve', token, { id: id });
}
function rejectAlumniRegistration(token, id, reason) {
  return authedPost('/admin_alumni_registration_reject', token, reason ? { id: id, reason: reason } : { id: id });
}

// Generic bottom sheet for a list of tappable actions (e.g. a row's
// Profile/Documents/Report choices). Separate from openOptionSheet since
// actions have icons+descriptions and no "selected" state.
function openActionSheet(title, actions) {
  let backdrop = document.getElementById('actionSheetBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'actionSheetBackdrop';
    backdrop.className = 'sheet-backdrop';
    backdrop.innerHTML = '<div class="sheet-panel"><div class="sheet-handle"></div><div class="sheet-title" id="actionSheetTitle"></div><div id="actionSheetOptions"></div></div>';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) closeActionSheet(); });
  }
  document.getElementById('actionSheetTitle').textContent = title;
  const optsEl = document.getElementById('actionSheetOptions');
  optsEl.innerHTML = actions.map((a, i) =>
    '<button class="sheet-action-row" type="button" data-idx="' + i + '">' +
      '<span class="sheet-action-icon">' + icon(a.icon, { size: 19, color: 'var(--ink)' }) + '</span>' +
      '<span><span class="sheet-action-label">' + escapeHtml(a.label) + '</span><br><span class="sheet-action-desc">' + escapeHtml(a.desc) + '</span></span>' +
    '</button>'
  ).join('');
  optsEl.querySelectorAll('.sheet-action-row').forEach((btn, i) => {
    btn.addEventListener('click', () => { closeActionSheet(); actions[i].onPress(); });
  });
  backdrop.classList.add('open');
}
function closeActionSheet() {
  document.getElementById('actionSheetBackdrop')?.classList.remove('open');
}

// Full-detail bottom sheet - web port of ChildProfileSheet.tsx's visual
// design (photo + status dot, name, status pill, divider, icon+label+value
// rows, an Edit pencil top-left and a View Full Report button, both
// optional per caller). Unlike ChildProfileSheet this one is shared by
// every "people" list (students/teachers/cashiers/registrars/alumni) -
// each caller supplies its own field list, edit handler, and report
// handler rather than this component knowing about any one entity type.
//
// config: { photo, name, initials, statusColor, statusLabel, fields:
//   [{icon,label,value}], canEdit, onEdit, onViewReport }
function openPersonProfileModal(config) {
  let backdrop = document.getElementById('personDetailBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'personDetailBackdrop';
    backdrop.className = 'sheet-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) closePersonProfileModal(); });
  }
  const initials = config.initials || (config.name || '?').trim().charAt(0).toUpperCase();
  backdrop.innerHTML =
    '<div class="sheet-panel pdetail-panel">' +
      '<div class="sheet-handle"></div>' +
      '<div class="pdetail-header">' +
        (config.canEdit
          ? '<button type="button" class="pdetail-edit-btn" id="pdetailEditBtn">' + icon('pencil', { size: 16, color: 'var(--emerald-deep)' }) + '<span>' + escapeHtml(t('common.edit', 'Edit')) + '</span></button>'
          : '<span></span>') +
        '<button type="button" class="pdetail-close-btn" id="pdetailCloseBtn">' + icon('close', { size: 18, color: 'var(--ink)' }) + '</button>' +
      '</div>' +
      '<div class="pdetail-avatar-wrap">' +
        (config.photo
          ? '<img class="pdetail-avatar" src="' + escapeHtml(absoluteUrl(config.photo)) + '" alt="" />'
          : '<span class="pdetail-avatar pdetail-avatar-fallback">' + escapeHtml(initials) + '</span>') +
        (config.statusColor ? '<span class="pdetail-status-dot" style="background:' + config.statusColor + '"></span>' : '') +
      '</div>' +
      '<div class="pdetail-name">' + escapeHtml(config.name || '') + '</div>' +
      (config.statusLabel
        ? '<div class="pdetail-status-pill" style="' + (config.statusColor ? 'color:' + config.statusColor + ';background:' + config.statusColor + '1a;' : '') + '"><span class="pdetail-status-dot-sm" style="background:' + (config.statusColor || 'var(--emerald)') + '"></span>' + escapeHtml(config.statusLabel) + '</div>'
        : '') +
      '<div class="pdetail-divider"></div>' +
      '<div class="pdetail-fields">' +
        (config.fields || []).map(f =>
          '<div class="pdetail-field-row">' +
            '<span class="pdetail-field-icon">' + icon(f.icon || 'idcard', { size: 18, color: 'var(--subtle)' }) + '</span>' +
            '<div class="pdetail-field-text"><div class="pdetail-field-label">' + escapeHtml(f.label) + '</div><div class="pdetail-field-value">' + escapeHtml(String(f.value)) + '</div></div>' +
          '</div>'
        ).join('') +
      '</div>' +
      (config.onViewReport
        ? '<button type="button" class="pdetail-report-btn" id="pdetailReportBtn">' + icon('clipboard', { size: 18, color: 'var(--emerald-deep)' }) + '<span>' + escapeHtml(t('people_profile.view_full_report', 'View Full Report')) + '</span></button>'
        : '') +
    '</div>';
  document.getElementById('pdetailCloseBtn').addEventListener('click', closePersonProfileModal);
  if (config.canEdit) {
    document.getElementById('pdetailEditBtn').addEventListener('click', () => { closePersonProfileModal(); config.onEdit(); });
  }
  if (config.onViewReport) {
    document.getElementById('pdetailReportBtn').addEventListener('click', config.onViewReport);
  }
  backdrop.classList.add('open');
}
function closePersonProfileModal() {
  document.getElementById('personDetailBackdrop')?.classList.remove('open');
}

// Shared edit form for the three entity types whose backend update
// endpoint takes the exact same {name,name_ar,email,phone,address,gender,
// birthday,emergency_contact_name,emergency_contact_phone,password?} shape
// (students/teachers/cashiers - see updateStudentProfile/
// updateTeacherProfile/updateCashierProfile above). name_ar and the
// emergency contact fields are the same ones admission.js's wizard and
// student-preregister.php's form collect - kept in sync here so anything
// entered at admission time can actually be corrected later, not just
// viewed.
// config: { title, initial: {name,name_ar,email,phone,address,gender,
//   birthday,emergency_contact_name,emergency_contact_phone},
//   onSubmit: (values) => Promise }
function openEditBasicProfileSheet(config) {
  let backdrop = document.getElementById('editProfileBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'editProfileBackdrop';
    backdrop.className = 'sheet-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) closeEditBasicProfileSheet(); });
  }
  const initial = config.initial || {};
  backdrop.innerHTML =
    '<div class="sheet-panel form">' +
      '<div class="sheet-handle"></div>' +
      '<div class="sheet-title-row"><span class="sheet-title">' + escapeHtml(config.title || t('people_profile.edit_title', 'Edit Profile')) + '</span>' +
        '<button type="button" class="sheet-close-btn" id="epCloseBtn">' + icon('close', { size: 16, color: 'var(--subtle)' }) + '</button></div>' +
      '<label class="util-label" style="margin-top:0;">' + escapeHtml(t('staff_list.full_name_label', 'Full Name')) + '</label>' +
      '<input type="text" id="epName" class="util-input" value="' + escapeHtml(initial.name || '') + '" />' +
      '<label class="util-label">' + escapeHtml(t('people_profile.name_ar_optional_label', 'Arabic Name (optional)')) + '</label>' +
      '<input type="text" id="epNameAr" class="util-input" dir="rtl" value="' + escapeHtml(initial.name_ar || '') + '" />' +
      '<label class="util-label">' + escapeHtml(t('staff_list.email_label', 'Email')) + '</label>' +
      '<input type="email" id="epEmail" class="util-input" value="' + escapeHtml(initial.email || '') + '" autocapitalize="none" />' +
      '<label class="util-label">' + escapeHtml(t('staff_list.phone_field_label', 'Phone (optional)')) + '</label>' +
      '<input type="tel" id="epPhone" class="util-input" value="' + escapeHtml(initial.phone || '') + '" />' +
      '<label class="util-label">' + escapeHtml(t('people_profile.address_optional_label', 'Address (optional)')) + '</label>' +
      '<input type="text" id="epAddress" class="util-input" value="' + escapeHtml(initial.address || '') + '" />' +
      '<label class="util-label">' + escapeHtml(t('people_profile.gender_optional_label', 'Gender (optional)')) + '</label>' +
      '<select id="epGender" class="util-input">' +
        '<option value="">' + escapeHtml(t('common.select', 'Select…')) + '</option>' +
        '<option value="male"' + (initial.gender === 'male' ? ' selected' : '') + '>' + escapeHtml(t('admission.gender_male', 'Male')) + '</option>' +
        '<option value="female"' + (initial.gender === 'female' ? ' selected' : '') + '>' + escapeHtml(t('admission.gender_female', 'Female')) + '</option>' +
      '</select>' +
      '<label class="util-label">' + escapeHtml(t('people_profile.birthday_optional_label', 'Birthday (optional)')) + '</label>' +
      '<input type="date" id="epBirthday" class="util-input" value="' + escapeHtml(initial.birthday || '') + '" />' +
      '<label class="util-label">' + escapeHtml(t('people_profile.emergency_contact_name_optional_label', 'Emergency Contact Name (optional)')) + '</label>' +
      '<input type="text" id="epEmergencyName" class="util-input" value="' + escapeHtml(initial.emergency_contact_name || '') + '" />' +
      '<label class="util-label">' + escapeHtml(t('people_profile.emergency_contact_phone_optional_label', 'Emergency Contact Phone (optional)')) + '</label>' +
      '<input type="tel" id="epEmergencyPhone" class="util-input" value="' + escapeHtml(initial.emergency_contact_phone || '') + '" />' +
      '<label class="util-label">' + escapeHtml(t('people_profile.new_password_label', 'New Password (optional)')) + '</label>' +
      '<input type="password" id="epPassword" class="util-input" placeholder="' + escapeHtml(t('people_profile.new_password_placeholder', 'Leave blank to keep current password')) + '" />' +
      '<div class="sheet-form-actions">' +
        '<button type="button" class="sheet-btn-secondary" id="epCancelBtn">' + escapeHtml(t('common.cancel', 'Cancel')) + '</button>' +
        '<button type="button" class="sheet-btn-primary" id="epSubmitBtn"><span id="epSubmitLabel">' + escapeHtml(t('common.save', 'Save')) + '</span></button>' +
      '</div>' +
    '</div>';
  document.getElementById('epCloseBtn').addEventListener('click', closeEditBasicProfileSheet);
  document.getElementById('epCancelBtn').addEventListener('click', closeEditBasicProfileSheet);
  document.getElementById('epSubmitBtn').addEventListener('click', () => {
    const name = document.getElementById('epName').value.trim();
    const email = document.getElementById('epEmail').value.trim();
    if (!name || !email) { showToast(t('people_profile.name_email_required', 'Name and email are required.')); return; }
    const values = {
      name, email,
      name_ar: document.getElementById('epNameAr').value.trim() || undefined,
      phone: document.getElementById('epPhone').value.trim() || undefined,
      address: document.getElementById('epAddress').value.trim() || undefined,
      gender: document.getElementById('epGender').value || undefined,
      birthday: document.getElementById('epBirthday').value || undefined,
      emergency_contact_name: document.getElementById('epEmergencyName').value.trim() || undefined,
      emergency_contact_phone: document.getElementById('epEmergencyPhone').value.trim() || undefined,
      password: document.getElementById('epPassword').value.trim() || undefined,
    };
    const btn = document.getElementById('epSubmitBtn');
    const label = document.getElementById('epSubmitLabel');
    btn.disabled = true;
    label.innerHTML = '<span class="util-spinner"></span>';
    config.onSubmit(values).then(() => {
      closeEditBasicProfileSheet();
    }).catch(err => {
      showToast(err && err.message ? err.message : t('people_profile.save_failed', 'Could not save changes.'));
    }).finally(() => {
      btn.disabled = false;
      label.textContent = t('common.save', 'Save');
    });
  });
  backdrop.classList.add('open');
}
function closeEditBasicProfileSheet() {
  document.getElementById('editProfileBackdrop')?.classList.remove('open');
}

function formatCompactCurrency(amount) {
  if (amount >= 1000) {
    const short = (amount / 1000).toFixed(1).replace(/\.0$/, '');
    return '$' + short + 'k';
  }
  return '$' + Math.round(amount).toLocaleString();
}

function progressRing(percent, opts) {
  opts = opts || {};
  const size = opts.size || 34;
  const strokeWidth = opts.strokeWidth || 4;
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const c = size / 2;
  return (
    '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
      '<circle cx="' + c + '" cy="' + c + '" r="' + radius + '" stroke="#E5E7EB" stroke-width="' + strokeWidth + '" fill="none" />' +
      '<circle cx="' + c + '" cy="' + c + '" r="' + radius + '" stroke="#D4A64A" stroke-width="' + strokeWidth + '" fill="none" ' +
        'stroke-dasharray="' + circumference + ' ' + circumference + '" stroke-dashoffset="' + offset + '" ' +
        'stroke-linecap="round" transform="rotate(-90 ' + c + ' ' + c + ')" />' +
    '</svg>'
  );
}

const DASHBOARD_BY_ROLE = {
  admin: 'admin-dashboard.php',
  superadmin: 'superadmin-dashboard.php',
  teacher: 'teacher-dashboard.php',
  student: 'student-dashboard.php',
  accountant: 'cashier-dashboard.php',
  alumni: 'alumni-dashboard.php',
  registrar: 'registrar-dashboard.php',
  // Missing here (though present in login.js's copy of this same map)
  // meant any redirect-away-on-failed-gate for a platform_staff user -
  // e.g. requireFullAccessStaff()/requireScholarshipStaffAccess() sending
  // them "back to their own dashboard" - fell through to the generic
  // placeholder-dashboard.php ("hasn't been built yet") instead of back
  // to superadmin-dashboard.php, which is where they actually landed at
  // login and where the rest of the platform_staff experience lives.
  platform_staff: 'superadmin-dashboard.php',
};
function dashboardUrlForRole(role) {
  return DASHBOARD_BY_ROLE[role] || 'placeholder-dashboard.php';
}

// Redirects to login.php if there's no token; on a valid token, populates
// the shared header and hands the user object to the page's own render
// function. Redirects to the *correct* dashboard if the signed-in user's
// role doesn't match this page (e.g. a stale bookmark). expectedRole can
// be a single role string or an array of allowed roles - class-schedule.js
// needs the latter since AcademicScheduleController's write guard is
// admin-or-registrar, not admin-only.
// ── Student enrollment gate (web port of MainTabs.tsx's useEnrollmentGate +
// the EnrollmentStatusScreen it shows in place of the app). A student
// whose workflow is started but not yet 'completed' sees ONLY this full-
// screen status view - no header, no bottom nav, no way out but Log Out -
// instead of whatever student-*.php page guardDashboard() was guarding.
// A student who never had a workflow started (enrolled before this
// feature existed, or the admin hasn't started theirs) is NOT gated - see
// isEnrollmentGateCompleted. Orphan-school students have no enrollment
// pipeline and are never gated (checked in guardDashboard below).
function fetchMyEnrollmentStatus(token) {
  return authedPost('/student_enrollment_workflow_status', token, {});
}
function isEnrollmentGateCompleted(status) {
  return !status.started || (status.record && status.record.status === 'completed');
}
const ENROLLMENT_STATUS_META = {
  in_progress: { label: 'In progress', cls: 'in_progress' },
  completed: { label: 'Officially enrolled', cls: 'completed' },
  withdrawn: { label: 'Withdrawn', cls: 'withdrawn' },
};
function formatEnrollmentHistoryDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) { return iso; }
}
// Pure HTML-string builder - shared by enrollment-status.js's own page
// (normal chrome, reachable once a student is past the gate) and
// renderEnrollmentGateScreen below (blocked students, every other student
// page), so the two presentations of the same data can never drift apart.
// opts.hideHistory: the gate screen has no room to scroll (it's meant to
// fit in one viewport with no way out but Log Out), so it asks for the
// History section to be left off entirely rather than just visually
// truncated - enrollment-status.js's own page (reachable once a student is
// past the gate, as a historical/reference view) still wants it and calls
// this without opts, so History keeps showing there.
function buildEnrollmentStatusHtml(data, opts) {
  opts = opts || {};
  const record = data.record;
  const stages = data.stages || [];
  const isFullyCompleted = record && record.status === 'completed';
  const currentOrder = (record && record.current_stage && record.current_stage.order != null) ? record.current_stage.order : -1;

  if (!data.started) {
    return (
      '<div class="list-empty">' +
        '<div class="list-empty-title">Not started yet</div>' +
        '<div class="list-empty-sub">' + escapeHtml(data.message || 'Your enrollment workflow has not been started yet. Please contact the school office.') + '</div>' +
      '</div>'
    );
  }

  const currentIndex = isFullyCompleted
    ? stages.length - 1
    : stages.findIndex(s => s.id === (record && record.current_stage_id));
  const progressPct = stages.length > 0 && currentIndex >= 0
    ? Math.round(((currentIndex + 1) / stages.length) * 100)
    : 0;
  const statusMeta = record ? (ENROLLMENT_STATUS_META[record.status] || ENROLLMENT_STATUS_META.in_progress) : null;

  let html = '';

  html += '<div class="es-top-row">' +
    (statusMeta ? '<span class="ew-record-status ' + escapeHtml(statusMeta.cls) + '">' + escapeHtml(statusMeta.label) + '</span>' : '<span></span>') +
    (stages.length > 0 && currentIndex >= 0 ? '<span class="es-step-of">Step ' + (currentIndex + 1) + ' of ' + stages.length + '</span>' : '') +
  '</div>';

  if (stages.length > 0 && currentIndex >= 0) {
    html += '<div class="es-progress-track"><div class="es-progress-fill" style="width:' + progressPct + '%;"></div></div>';
  }

  if (record && record.status === 'in_progress' && record.current_stage) {
    const instructions = (record.current_stage.student_instructions || '').trim();
    html += '<div class="es-action-row">' +
      icon('lightbulb', { size: 16, color: 'var(--warn-yellow)' }) +
      '<p class="es-action-text"><strong>What to do now:</strong> ' +
        escapeHtml(instructions || 'Please contact the school office for next steps.') +
      '</p>' +
    '</div>';
  }

  html += '<div class="es-section-label">Stages</div><div class="es-stages-card">';
  stages.forEach((stage, idx) => {
    const isDone = isFullyCompleted || stage.order < currentOrder;
    const isCurrent = !isFullyCompleted && record && stage.id === record.current_stage_id;
    const isLast = idx === stages.length - 1;
    html += '<div class="es-step-row' + (isCurrent ? ' current' : '') + '">' +
      '<div class="es-step-icon-col">' +
        '<div class="es-step-dot' + (isDone ? ' done' : (isCurrent ? ' current' : '')) + '">' +
          (isDone ? icon('check', { size: 16, color: '#fff' }) : '<span class="es-step-num' + (isCurrent ? ' current' : '') + '">' + (idx + 1) + '</span>') +
        '</div>' +
        (isLast ? '' : '<div class="es-step-line' + (isDone ? ' done' : '') + '"></div>') +
      '</div>' +
      '<div class="es-step-text-col">' +
        '<div class="es-step-label' + (isDone ? ' done' : '') + (isCurrent ? ' current' : '') + '">' + escapeHtml(stage.name) + '</div>' +
        (isCurrent ? '<div class="es-here-tag"><span class="es-here-dot"></span><span class="es-here-text">You are here</span></div>' : '') +
      '</div>' +
    '</div>';
  });
  html += '</div>';

  const history = data.history || [];
  if (!opts.hideHistory && history.length > 0) {
    html += '<div class="es-section-label">History</div><div class="es-history-card">';
    history.forEach((h, idx) => {
      const line = h.from_stage ? (h.from_stage + ' → ' + h.to_stage) : ('Started at ' + h.to_stage);
      html += '<div class="es-history-row' + (idx > 0 ? ' bordered' : '') + '">' +
        icon('clock', { size: 16, color: 'var(--subtle)' }) +
        '<span style="flex:1;margin-left:10px;">' +
          '<div class="es-history-text">' + escapeHtml(line) + '</div>' +
          '<div class="es-history-date">' + escapeHtml(formatEnrollmentHistoryDate(h.changed_at)) + '</div>' +
        '</span>' +
      '</div>';
    });
    html += '</div>';
  }

  return html;
}

const ENROLLMENT_GATE_CACHE_PREFIX = 'muslimedu_enrollment_gate_';
// Full-screen replacement, not injected into whatever container the
// current page happens to have - guardDashboard() can trigger this from
// ANY student-*.php page, each with its own unrelated body markup, so the
// only reliable target is document.body itself (same as RN's MainTabs
// swapping out its whole screen). data is null only on a load failure
// with no cached verdict to show instead - the section below `showBlocked`
// in guardDashboard handles falling back to a retryable error state.
function renderEnrollmentGateScreen(user, token, data) {
  document.body.className = 'util-page';
  document.body.innerHTML =
    '<div class="es-gate-screen">' +
      '<div class="es-gate-header">' +
        '<div class="es-gate-title">Enrollment Progress</div>' +
        '<div class="es-gate-subtitle">Where you are in the admission process</div>' +
      '</div>' +
      '<div class="es-gate-content" id="esGateContent"></div>' +
      '<div class="es-gate-footer">' +
        '<button type="button" class="es-gate-logout-btn" id="esGateLogoutBtn">' + icon('logout', { size: 16, color: 'var(--subtle)' }) + '<span>Log Out</span></button>' +
      '</div>' +
    '</div>';

  const contentEl = document.getElementById('esGateContent');
  if (data) {
    contentEl.innerHTML = buildEnrollmentStatusHtml(data, { hideHistory: true });
  } else {
    contentEl.innerHTML =
      '<div class="list-error">Could not load your enrollment status.<br><button type="button" class="list-retry-btn" id="esGateRetryBtn">Try again</button></div>';
    document.getElementById('esGateRetryBtn').addEventListener('click', () => window.location.reload());
  }

  // Direct logout, no confirm() - this screen has nothing else to do, and
  // RN's own gate makes the same deliberate call for the same reason.
  document.getElementById('esGateLogoutBtn').addEventListener('click', (e) => {
    e.currentTarget.disabled = true;
    performLogout(token);
  });
}

// Runs the gate check for a confirmed student user, then either falls
// through to the page's own onReady or replaces the screen with the gate.
// Cache-first (optimistic) when the last known verdict was "allowed", so
// the common case (a long-since-enrolled student) never waits on a round
// trip just to render their own dashboard; self-corrects via a reload if
// the live check disagrees. Fails closed only when there's no cached
// verdict to fall back on - see fetchMyEnrollmentStatus's .catch below.
function runStudentEnrollmentGate(user, token, onReady) {
  const cacheKey = ENROLLMENT_GATE_CACHE_PREFIX + user.id;
  let cached = null;
  try { cached = localStorage.getItem(cacheKey); } catch (e) {}

  function proceed() {
    renderHeader(user);
    document.getElementById('routeGuardSplash')?.remove();
    onReady(user, token);
    wireLogout(token);
    refreshNotifBadge(token);
  }

  const live = fetchMyEnrollmentStatus(token).then(data => {
    const ok = isEnrollmentGateCompleted(data);
    try { localStorage.setItem(cacheKey, ok ? '1' : '0'); } catch (e) {}
    return { ok, data };
  }).catch(() => ({ ok: cached === '1', data: null }));

  if (cached === '1') {
    proceed();
    live.then(r => { if (!r.ok) window.location.reload(); });
  } else {
    live.then(r => {
      if (r.ok) proceed();
      else { document.getElementById('routeGuardSplash')?.remove(); renderEnrollmentGateScreen(user, token, r.data); }
    });
  }
}

// Distinct failure reasons a guardDashboard() request can hit - fetch()
// collapses all of these into a bare "TypeError: Failed to fetch" with no
// further detail, so this is as specific as the browser lets us get. Kept
// separate from the invalidSession case (a real 401/403), which is handled
// inline where it's thrown.
function guardFetchFailureReason(res, err) {
  if (err && err.name === 'AbortError') return 'timeout';
  if (res) return 'http_' + res.status; // e.g. 'http_500', 'http_419'
  // No `res` means fetch() itself rejected before a response ever came
  // back - offline, DNS failure, a dropped connection, or the request
  // getting blocked client-side (CORS, a CSP connect-src mismatch, an
  // extension). Those are indistinguishable from here; logging the raw
  // TypeError below is what actually tells them apart in devtools.
  return 'network';
}

function guardDashboard(expectedRole, onReady, _isRetry) {
  const token = getStoredToken();
  if (!token) {
    window.location.href = 'login.php';
    return;
  }

  // A bare fetch() has no timeout, so an unresponsive API would leave the
  // splash spinning forever with no way out. 12s is generous but bounded.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  fetch(ENDPOINTS.me, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: 'Bearer ' + token },
    signal: controller.signal,
  })
    .then(res => {
      clearTimeout(timeoutId);
      // Only 401/403 end the session. A 5xx means the API is having a bad
      // moment - that falls through to the retry UI below with the token
      // intact, rather than signing the user out over a server hiccup.
      if (res.status === 401 || res.status === 403) throw { invalidSession: true };
      if (!res.ok) throw { reason: guardFetchFailureReason(res) };
      return res.json().catch(() => { throw { reason: 'bad_response' }; });
    })
    .then(data => {
      const user = data && data.user;
      if (!user) throw { invalidSession: true };
      const allowed = Array.isArray(expectedRole) ? expectedRole : (expectedRole ? [expectedRole] : null);
      if (allowed && !allowed.includes(user.role)) {
        window.location.href = dashboardUrlForRole(user.role);
        return;
      }

      // Self-registration gate (School::REGISTRATION_STATUSES) - a school
      // admin created by "Register Your School" can sign in immediately
      // (SchoolRegistrationApiController::submit()), but sees only
      // registration-pending.php until a SuperAdmin approves it, so they
      // always have a way to check their status instead of no account at
      // all. Every pre-existing school defaults to 'approved' server-side,
      // so this is a no-op for every admin who didn't come through that
      // flow. Checked here (not per-page) for the same reason the
      // student/admin gates below are - every admin-*.php page routes
      // through guardDashboard(). registration-pending.php itself is
      // exempt from the redirect (so its own onReady runs and can decide
      // what to show) and from runAdminSetupGate below (a school this new
      // never has academic_setup_completed yet, which would otherwise show
      // the setup wizard instead of the pending/rejected screen on the one
      // page meant to show it).
      if (user.role === 'admin' && currentPageFilename() === 'registration-pending.php') {
        document.getElementById('routeGuardSplash')?.remove();
        onReady(user, token);
        return;
      }
      if (user.role === 'admin' && user.school_registration_status && user.school_registration_status !== 'approved') {
        window.location.href = 'registration-pending.php';
        return;
      }

      // Every student-*.php page routes through here, so this is the one
      // place a still-enrolling student's access needs blocking - not
      // duplicated per page. isOrphanSchoolUser: orphan schools have no
      // class-based enrollment pipeline, so there's nothing to gate them on.
      if (user.role === 'student' && !isOrphanSchoolUser(user)) {
        runStudentEnrollmentGate(user, token, onReady);
        return;
      }

      // Same reasoning as the student gate above, ported from
      // MainTabs.tsx's isGatedAdmin: every admin-*.php page routes through
      // here, so this is the one place a not-yet-set-up school's admin
      // needs blocking. Orphan schools have no class-based academic setup
      // to gate on (their dashboard already hides those tiles).
      if (user.role === 'admin' && !isOrphanSchoolUser(user)) {
        runAdminSetupGate(user, token, onReady);
        return;
      }

      renderHeader(user);
      document.getElementById('routeGuardSplash')?.remove();

      // Fire-and-forget: the page renders in English (or whatever locale
      // was cached from a previous page) immediately below, then
      // re-renders in the user's saved language once this resolves - see
      // the Localization block up top. Never blocks onReady, so a slow or
      // failed locale fetch can't hold up the rest of the page.
      fetchUserSettings(token)
        .then(d => loadLocale(token, (d && d.settings && d.settings.language) || CURRENT_LOCALE))
        .catch(() => loadLocale(token));

      // onReady builds the body content, including the #logoutBtn footer -
      // wireLogout has to run after that exists in the DOM, not before.
      onReady(user, token);
      wireLogout(token);

      // #bottomNav is rendered synchronously inside onReady on every page
      // that has one, so it's safe to look for it immediately after.
      refreshNotifBadge(token);
    })
    .catch(err => {
      clearTimeout(timeoutId);
      if (err && err.invalidSession) {
        // A real "no" from the server - the token genuinely doesn't work.
        clearStoredToken();
        window.location.href = 'login.php';
        return;
      }
      const reason = (err && err.reason) || guardFetchFailureReason(null, err);
      // eslint-disable-next-line no-console
      console.error('[guardDashboard] /me failed:', reason, err);
      // A cold API instance or a single dropped packet shouldn't flash the
      // full error screen - one silent retry after a beat covers that
      // before showing the user anything.
      if (!_isRetry) {
        setTimeout(() => guardDashboard(expectedRole, onReady, true), 1500);
        return;
      }
      // Timeout or network failure - the token might still be valid, so
      // don't clear it. Show a retry UI instead of an endless spinner.
      showRouteGuardError(reason);
    });
}

const ROUTE_GUARD_REASON_TEXT = {
  timeout: 'The server took too long to respond. Check your connection and try again.',
  network: 'Couldn’t reach the server. Check your connection and try again.',
  bad_response: 'Got an unexpected response from the server. Please try again.',
};
function routeGuardReasonText(reason) {
  if (ROUTE_GUARD_REASON_TEXT[reason]) return ROUTE_GUARD_REASON_TEXT[reason];
  if (reason && reason.indexOf('http_') === 0) {
    return 'The server returned an error (' + reason.slice(5) + '). Please try again.';
  }
  return ROUTE_GUARD_REASON_TEXT.network;
}

function showRouteGuardError(reason) {
  const splash = document.getElementById('routeGuardSplash');
  if (!splash) return;
  splash.innerHTML =
    '<div class="route-guard-error">' +
      '<div class="route-guard-error-text">' + escapeHtml(routeGuardReasonText(reason)) + '</div>' +
      '<button type="button" class="route-guard-retry" id="routeGuardRetryBtn">Retry</button>' +
      '<a class="route-guard-signin" href="login.php">Back to Sign In</a>' +
    '</div>';
  document.getElementById('routeGuardRetryBtn').addEventListener('click', () => window.location.reload());
}

function renderHeader(user) {
  const nameEl = document.getElementById('greetingName');
  if (nameEl) nameEl.textContent = user.name || '';

  const avatarWrap = document.getElementById('avatarWrap');
  if (avatarWrap) {
    const initial = (user.name || '?').trim().charAt(0).toUpperCase();
    if (user.photo) {
      avatarWrap.innerHTML =
        '<img class="avatar" src="' + escapeHtml(absoluteUrl(user.photo)) + '" alt="" onerror="this.replaceWith(Object.assign(document.createElement(\'div\'),{className:\'avatar-fallback\',textContent:\'' + initial + '\'}))" />';
    } else {
      avatarWrap.innerHTML = '<div class="avatar-fallback">' + initial + '</div>';
    }
  }

  document.querySelectorAll('[data-user-name]').forEach(el => (el.textContent = user.name || ''));
  document.querySelectorAll('[data-user-email]').forEach(el => (el.textContent = user.email || ''));
  document.querySelectorAll('[data-user-code]').forEach(el => {
    const row = el.closest('[data-user-code-row]');
    if (user.code) {
      el.textContent = user.code;
      if (row) row.style.display = '';
    } else if (row) {
      row.style.display = 'none';
    }
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Core logout action, shared by the confirm-gated footer button
// (wireLogout below) and the enrollment gate screen's direct logout
// (renderEnrollmentGateScreen) - RN's own gate deliberately skips the
// confirm dialog ("direct logout, no confirmation dialog", since it's the
// one button on a screen with nothing else to do), so that has to stay a
// separate call path rather than reusing wireLogout's confirm() straight.
function performLogout(token) {
  clearStoredToken();
  // Sweeps every cached enrollment-gate verdict, not just the current
  // user's - a different student logging in on this same device
  // afterward must never inherit someone else's stale cached pass/block.
  try {
    Object.keys(localStorage)
      .filter(k => k.indexOf(ENROLLMENT_GATE_CACHE_PREFIX) === 0)
      .forEach(k => localStorage.removeItem(k));
  } catch (e) {}
  // Cached reads (/me, grades, rosters) live in IndexedDB, which
  // clearStoredToken() doesn't touch - left behind they stay readable
  // on the device after sign-out. The queued writes are deliberately
  // kept: they're work this user performed offline and haven't synced,
  // so login.js clears those only when the device actually changes
  // hands. Navigate even if the wipe fails or hangs; a stuck
  // IndexedDB must not trap the user on a signed-in page.
  const done = () => { window.location.href = 'login.php'; };
  const offline = window.MuslimEduOffline;
  const wipe = (!offline || !offline.clearCache)
    ? Promise.resolve()
    : Promise.race([offline.clearCache({ reads: true, queue: false }), new Promise(r => setTimeout(r, 2000))]);

  return fetch(ENDPOINTS.logout, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: 'Bearer ' + token },
  }).then(() => wipe, () => wipe).then(done, done);
}

// Delegated on `document`, not attached directly to #logoutBtn: every
// dashboard's onLocaleChange listener rebuilds #groupsWrap's innerHTML
// (to re-render tile titles in the new language), which recreates the
// logout footer as a brand-new DOM node with no listeners on it. A direct
// btn.addEventListener() here would only ever reach the button that
// existed at page load - the very first locale bundle to resolve after
// that (which now happens automatically on every guarded page) silently
// orphaned it, and the button looked clickable but did nothing. Binding
// to `document` survives any number of re-renders because the listener
// never lived on the button in the first place.
let logoutWired = false;
function wireLogout(token) {
  if (logoutWired) return;
  logoutWired = true;
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('#logoutBtn');
    if (!btn) return;
    if (!confirm('Log out of your account?')) return;
    btn.style.opacity = '0.6';
    btn.style.pointerEvents = 'none';
    performLogout(token);
  });
}

// Live text filter over one or more .group-section blocks: hides rows
// whose title doesn't match, hides empty sections, shows a "no results"
// message when every section is empty.
function wireSearch(inputId, opts) {
  const input = document.getElementById(inputId);
  const bar = input?.closest('.search-bar');
  const clearBtn = bar?.querySelector('.search-clear');
  const sections = document.querySelectorAll('.group-section');
  const noResults = document.getElementById('noResults');
  const featured = (opts && opts.hideWhileSearching) || [];

  function apply() {
    const q = input.value.trim().toLowerCase();
    bar?.classList.toggle('has-value', q.length > 0);
    let anyVisible = false;
    sections.forEach(section => {
      let sectionHasMatch = false;
      section.querySelectorAll('.row').forEach(row => {
        const title = (row.dataset.title || row.querySelector('.row-title')?.textContent || '').toLowerCase();
        const match = q.length === 0 || title.includes(q);
        row.style.display = match ? '' : 'none';
        if (match) sectionHasMatch = true;
      });
      section.style.display = sectionHasMatch ? '' : 'none';
      if (sectionHasMatch) anyVisible = true;
    });
    featured.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = q.length > 0 ? 'none' : '';
    });
    if (noResults) noResults.style.display = q.length > 0 && !anyVisible ? '' : 'none';
  }
  input?.addEventListener('input', apply);
  clearBtn?.addEventListener('click', () => { input.value = ''; apply(); input.focus(); });
}

// Compact icon set (24x24, outline, strokeWidth ~1.8).
const ICONS = {
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>',
  users: '<path d="M17 20h5v-2a3 3 0 00-5.36-1.86M17 20H7m10 0v-2a4 4 0 00-3-3.87M7 20H2v-2a3 3 0 015.36-1.86M7 20v-2a4 4 0 013-3.87m0 0a4 4 0 110-7.75 4 4 0 010 7.75zm6-3a4 4 0 100-8 4 4 0 000 8z"/>',
  presentation: '<path d="M3 4h18M4 4v11a1 1 0 001 1h5l-1 4h6l-1-4h5a1 1 0 001-1V4M11 15v1"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 4.5A2.5 2.5 0 016.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15z"/>',
  banknote: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/><path d="M9 15l2 2 4-4"/>',
  idcard: '<rect x="2" y="4" width="20" height="16" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M15 9h4M15 13h4M6 17h6"/>',
  creditcard: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 005.6 15a1.65 1.65 0 00-1.51-1H4a2 2 0 010-4h.09A1.65 1.65 0 005.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9c.14.32.22.66.24 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>',
  gradcap: '<path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1.3 2.7 2.5 6 2.5s6-1.2 6-2.5v-5"/>',
  logout: '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7"/>',
  person: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a8 8 0 0116 0v1"/>',
  camera: '<path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>',
  bell: '<path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>',
  document: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/>',
  megaphone: '<path d="M3 11v3a1 1 0 001 1h1l3 6h2l-1-6h6l4 3V5l-4 3H8L5 7H4a1 1 0 00-1 1z"/>',
  clipboard: '<rect x="4" y="4" width="16" height="18" rx="2"/><path d="M9 2h6v4H9z"/><path d="M9 12l2 2 4-4"/>',
  star: '<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.8 21l1.2-6.9-5-4.9 6.9-1z"/>',
  layers: '<path d="M12 2L2 8l10 6 10-6-10-6z"/><path d="M2 14l10 6 10-6"/>',
  school: '<path d="M14 22v-4a2 2 0 00-4 0v4M4 12l8-6 8 6M6 12v10h12V12"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M10.85 12.15L19 4M17 6l2 2M15 8l2 2"/>',
  activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  flag: '<path d="M4 2v20M4 4h13l-2 4 2 4H4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
  lightbulb: '<path d="M9 18h6M10 22h4M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z"/>',
  trash: '<path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>',
  images: '<rect x="3" y="3" width="14" height="14" rx="2"/><path d="M7 21h11a2 2 0 002-2V8"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M3 13l3-3 3 3 4-4 4 4" stroke-linecap="round"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>',
  house: '<path d="M3 9.5L12 2l9 7.5V21a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1z"/>',
  message: '<path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  scan: '<path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"/><path d="M7 12h10"/>',
  chevronleft: '<path d="M15 6l-6 6 6 6"/>',
  chevronup: '<path d="M6 15l6-6 6 6"/>',
  chevrondown: '<path d="M6 9l6 6 6-6"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>',
  palette: '<path d="M12 2a10 10 0 100 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.3A4.2 4.2 0 0021 11c0-5-4.5-9-9-9z"/><circle cx="7" cy="10" r="1"/><circle cx="12" cy="7" r="1"/><circle cx="17" cy="10" r="1"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>',
  phone: '<path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .3 2 .7 2.9a2 2 0 01-.4 2.1L8.1 10a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.4 1.9.6 2.9.7a2 2 0 011.6 2z"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><line x1="4" y1="20" x2="20" y2="4"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  filter: '<path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>',
  close: '<path d="M18 6L6 18M6 6l12 12"/>',
  warning: '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  chart: '<path d="M18 20V10M12 20V4M6 20v-6"/>',
  pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/>',
  filetext: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h8"/><path d="M8 9h2"/>',
  checkcircle: '<circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/>',
  alertcircle: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
  download: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/>',
  refresh: '<path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0115-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 01-15 6.7L3 16"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z"/>',
  send: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>',
  repeat: '<path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/>',
  // Classic three-node "share" glyph (post-action-bar's Share button) -
  // reads as "share" at a glance, unlike 'repeat' which looks like
  // refresh/retweet.
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49"/>',
};
// Each gradient-filled icon embeds its own <linearGradient>, so it needs
// its own id - two SVGs on the same page sharing one id is invalid HTML,
// and depending on the browser can make both resolve to whichever def
// happened to land in the DOM first. A simple incrementing counter keeps
// every one unique regardless of how many render at once (a whole feed
// full of liked hearts, say).
let _iconGradientCounter = 0;

function icon(name, opts) {
  opts = opts || {};
  const size = opts.size || 20;
  const color = opts.color || 'currentColor';
  const body = ICONS[name] || ICONS.gear;
  // opts.filled: every icon here is normally drawn as an outline only
  // (fill="none") - pass filled:true for the rare case that needs a
  // solid glyph instead (the liked heart on a post, so far). Still keeps
  // a matching stroke so the edge stays crisp at small sizes rather than
  // just being a flat fill.
  //
  // opts.gradient: [startColor, endColor] - fills with a diagonal
  // gradient between them instead of a flat color. Only meaningful
  // alongside filled:true (an outline has nothing for a fill gradient to
  // paint). Uses the same 135deg direction as the app's own
  // --emerald-gradient CSS variable so an SVG-filled icon reads as the
  // same gradient as every gradient button/badge elsewhere.
  let fill = opts.filled ? color : 'none';
  let defs = '';
  if (opts.filled && opts.gradient && opts.gradient.length === 2) {
    const gid = 'icongrad-' + (++_iconGradientCounter);
    defs =
      '<defs><linearGradient id="' + gid + '" x1="0%" y1="0%" x2="100%" y2="100%">' +
        '<stop offset="0%" stop-color="' + opts.gradient[0] + '"/>' +
        '<stop offset="100%" stop-color="' + opts.gradient[1] + '"/>' +
      '</linearGradient></defs>';
    fill = 'url(#' + gid + ')';
  }
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="' + fill + '" stroke="' + color + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + defs + body + '</svg>';
}

// Builder helpers used by each dashboard page's render script. Every row
// icon is a plain black glyph with no background chip, regardless of any
// category tint the page still passes in - matches the flat icon style
// used everywhere else in the app now (Academic Analytics' snapshot cards,
// etc.), instead of each section having its own accent color.
function renderRow(item) {
  // A row with a real web page (item.href) renders as an actual link;
  // everything else still toasts "not built on the web yet".
  const tag = item.href ? 'a' : 'button';
  const openAttr = item.href ? ' href="' + escapeHtml(item.href) + '"' : ' type="button" data-action="not-wired"';
  // data-key is a stable, untranslated identifier for code that needs to
  // find a specific row again later (e.g. appending a live count to the
  // Trash row) - data-title holds the current (possibly translated) text,
  // which stops matching the moment the locale changes.
  return (
    '<' + tag + ' class="row" data-title="' + escapeHtml(item.title) + '"' +
      (item.key ? ' data-key="' + escapeHtml(item.key) + '"' : '') + openAttr + '>' +
      '<span class="row-icon" style="background:transparent;color:var(--ink)">' + icon(item.icon, { size: 19, color: 'var(--ink)' }) + '</span>' +
      '<span class="row-text"><span class="row-title">' + escapeHtml(item.title) + '</span><span class="row-desc">' + escapeHtml(item.desc) + '</span></span>' +
      '<span class="row-chevron">' + icon('chevron', { size: 18 }) + '</span>' +
    '</' + tag + '>'
  );
}
function renderGroupSection(label, items) {
  if (!items.length) return '';
  return (
    '<div class="group-section"><div class="group-label">' + escapeHtml(label) + '</div>' +
    '<div class="group-card">' + items.map(renderRow).join('') + '</div></div>'
  );
}
function renderLogoutFooter() {
  return (
    '<button class="logout-card" id="logoutBtn" type="button">' +
      '<span class="logout-icon-badge">' + icon('logout', { size: 18, color: 'var(--ink)' }) + '</span>' +
      '<span><span class="logout-title">' + escapeHtml(t('menu.log_out', 'Log Out')) + '</span><br><span class="logout-subtitle">' + escapeHtml(t('menu.log_out_subtitle', 'Sign out of your account')) + '</span></span>' +
    '</button>'
  );
}

// Bottom tab bar. Demo build: only the Menu/Dashboard tab is reachable, so
// Home (Newsfeed), Chat (Messages), the per-role center action, and Alerts
// (Notifications) are dropped entirely for every role - not just visually
// disabled, they're simply not in the markup.
function renderBottomNav(role, activeTab) {
  activeTab = activeTab || 'Menu';
  const inkColor = 'var(--ink)';
  const menuActive = activeTab === 'Menu';
  return (
    '<nav class="bottom-nav bottom-nav-single" id="bottomNav">' +
      '<a class="bn-item' + (menuActive ? ' active' : '') + '" href="' + (DASHBOARD_BY_ROLE[role] || 'placeholder-dashboard.php') + '" aria-label="Menu"' + (menuActive ? ' aria-current="page"' : '') + '>' + icon('grid', { size: 24, color: inkColor }) + '</a>' +
    '</nav>'
  );
}

// Scroll-linked parallax hero: the dark hero layer travels at half the
// scroll speed and fades out as the white body panel scrolls up over it.
// rAF-throttled so it doesn't run more than once per frame.
// The dark hero background (.hero-bg) is plain `position: absolute; top:
// 0` inside a normally-scrolling `.screen` container - not `position:
// fixed`. That means it already scrolls in perfect lockstep with the
// header/card content sitting after it in the same parent, with zero JS
// needed. Any nonzero `factor` here pushes the background an *extra*
// amount upward on top of that already-correct scroll, so it visibly
// races ahead of the foreground content and scrolls out from under it -
// the card's stats/progress bar/button are still on screen but the dark
// background behind them has already scrolled away, exposing the white
// page underneath mid-card. factor must stay 0 so the background only
// ever sits exactly where natural scrolling already puts it; the opacity
// fade near the bottom of the card is unaffected by this and is safe to
// keep since it doesn't move anything.
function wireParallax(heroBgId, heroHeight) {
  const heroBg = document.getElementById(heroBgId);
  if (!heroBg) return;
  const factor = 0;
  let ticking = false;
  function apply() {
    const y = window.scrollY || window.pageYOffset || 0;
    const clampedY = Math.max(0, Math.min(y, heroHeight));
    const translateY = -clampedY * factor;
    const fadeStart = heroHeight * 0.6;
    let opacity = 1;
    if (y > fadeStart) {
      opacity = Math.max(0, 1 - (y - fadeStart) / (heroHeight - fadeStart));
    }
    heroBg.style.transform = 'translateY(' + translateY + 'px)';
    heroBg.style.opacity = String(opacity);
    ticking = false;
  }
  apply();
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(apply);
      ticking = true;
    }
  }, { passive: true });
}
