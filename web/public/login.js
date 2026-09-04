const API_BASE_URL = 'https://manhaje.com/apps/api';
const ENDPOINTS = {
  login: API_BASE_URL + '/login',
  me: API_BASE_URL + '/me',
  forgotPassword: API_BASE_URL + '/forgot_password',
  demoFeedback: API_BASE_URL + '/demo_feedback_submit',
};
// Single field now - no more email/ID/username tabs. Whatever's typed is
// checked against email/code/username on the backend in one go (see
// ApiController.php's login()); the only thing detected client-side is
// whether it looks like an email, purely so that case can go straight to
// an indexed email lookup server-side instead of the broader OR-across-
// three-columns match every other case falls into.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function detectLoginType(value) {
  return EMAIL_RE.test(value) ? 'email' : null;
}
// "Remember me" picks which storage backs the session: localStorage
// survives closing the tab, sessionStorage clears with it.
const TOKEN_KEY = 'muslimedu_auth_token';
// Which account the offline cache was built for. Always localStorage, even
// for a sessionStorage-backed session, so it outlives the tab and a later
// sign-in can still tell whether the device changed hands.
const USER_KEY = 'muslimedu_cache_owner';

// Two-factor accounts aren't supported on the web yet - deliberately not
// part of this page's logic (see dashboard.js's guardDashboard for the
// per-role landing pages this redirects to once real login succeeds).
const DASHBOARD_BY_ROLE = {
  admin: 'admin-dashboard.php',
  superadmin: 'superadmin-dashboard.php',
  teacher: 'teacher-dashboard.php',
  student: 'student-dashboard.php',
  accountant: 'cashier-dashboard.php',
  alumni: 'alumni-dashboard.php',
  registrar: 'registrar-dashboard.php',
  platform_staff: 'superadmin-dashboard.php',
};
function dashboardUrlForRole(role) {
  return DASHBOARD_BY_ROLE[role] || 'placeholder-dashboard.php';
}

// ── Localization ─────────────────────────────────────────────────────
// This page runs before anyone is signed in, so it can't call the
// authenticated /academic_locale_bundle endpoint dashboard.js's guarded
// pages use. Two things make it "sync" anyway:
//   1. LOCALE_KEY/LOCALE_CACHE_KEY are the SAME localStorage keys
//      dashboard.js's applyLocale() writes on every guarded page - if
//      this browser already signed in once and picked Arabic (Account
//      Settings or anywhere else), that cached bundle is sitting there
//      and this page opens in it immediately, no login required.
//   2. The lang chip in the topbar (previously "Language — coming
//      soon") now actually toggles en/ar right here, offline-capable,
//      via LOGIN_AR_FALLBACK below - a small hand-translated copy of
//      just this page's own strings, keyed by the identical login.*
//      keys the backend's academic_translations seed uses. Once signed
//      in, the real seeded/edited translations (from the superadmin
//      Languages page) take over on every other screen; this table only
//      ever affects this one pre-auth page.
const LOCALE_KEY = 'muslimedu_locale';
const LOCALE_CACHE_KEY = 'muslimedu_locale_bundle';
const LOGIN_AR_FALLBACK = {
  'login.auth_code_label': 'رمز المصادقة',
  'login.back': 'مجددًا!',
  'login.connect_through': 'تواصل عبر ',
  'login.continue': 'متابعة',
  'login.copyright': '© 2026 مسلم إيديو. جميع الحقوق محفوظة.',
  'login.create_alumni_desc': 'أعد التواصل مع مدرستك ومجتمع الخريجين.',
  'login.create_alumni_title': 'إنشاء حساب خريج',
  'login.education': 'التعليم.',
  'login.credential_label': 'البريد / رقم الهوية / اسم المستخدم',
  'login.credential_helper': 'سجّل الدخول بأي منها.',
  'login.credential_required': 'يرجى إدخال بريدك الإلكتروني أو رقم الهوية أو اسم المستخدم.',
  'login.enter_authenticator_code': 'أدخل الرمز من تطبيق المصادقة الخاص بك.',
  'login.forgot_password': 'هل نسيت كلمة المرور؟',
  'login.forgot_title': 'إعادة تعيين كلمة المرور',
  'login.forgot_subtitle': 'أدخل البريد الإلكتروني المرتبط بحسابك وسنرسل لك رابطًا لإعادة تعيين كلمة المرور.',
  'login.forgot_email_label': 'البريد الإلكتروني',
  'login.forgot_email_error': 'يرجى إدخال بريد إلكتروني صحيح.',
  'login.forgot_send': 'إرسال رابط إعادة التعيين',
  'login.forgot_sent_title': 'تحقق من بريدك الإلكتروني',
  'login.forgot_sent_body': 'إذا كان هناك حساب مرتبط بـ {email}، فسنرسل رابط إعادة تعيين كلمة المرور إليه.',
  'login.forgot_done': 'تم',
  'login.forgot_generic_error': 'تعذر إرسال رابط إعادة التعيين. حاول مرة أخرى.',
  'login.get_started': 'ابدأ الآن',
  'login.greeting_peace_be': 'السلام',
  'login.greeting_upon_you': 'عليكم!',
  'login.log_in': 'تسجيل الدخول',
  'login.new_here': 'جديد هنا؟ ',
  'login.one_more': 'خطوة',
  'login.password_label': 'كلمة المرور',
  'login.please_wait': 'يرجى الانتظار…',
  'login.register_school_desc': 'أنشئ مؤسستك وأدرها مع مسلم إيديو.',
  'login.register_school_title': 'سجّل مدرستك',
  'login.remember_me': 'تذكرني',
  'login.sign_in': 'تسجيل الدخول',
  'login.step_dot': 'خطوة.',
  'login.step_pill': 'الخطوة {step} من 2',
  'login.step_pill_two_factor': 'التحقق بخطوتين',
  'login.verify': 'تحقق',
  'login.welcome': 'مرحبًا',
};
let currentLocale = 'en';
let currentTranslations = {};

function t(key, fallback) {
  return (currentTranslations && currentTranslations[key]) || fallback || key;
}

function applyDomTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (!el.hasAttribute('data-i18n-original')) el.setAttribute('data-i18n-original', el.textContent);
    el.textContent = t(key, el.getAttribute('data-i18n-original'));
  });
  const chipText = document.getElementById('langChipText');
  if (chipText) chipText.textContent = currentLocale.toUpperCase();
  // loginBtnLabel also carries data-i18n (handled by the loop above), but
  // handleSubmit() below swaps it to login.please_wait mid-request and
  // restores it afterward - don't stomp that while a request is in flight.
  const loginBtn = document.getElementById('loginBtn');
  const loginBtnLabel = document.getElementById('loginBtnLabel');
  if (loginBtnLabel && loginBtn && !loginBtn.classList.contains('loading')) {
    loginBtnLabel.textContent = t('login.log_in', 'Log In');
  }
  document.documentElement.setAttribute('dir', currentLocale === 'ar' ? 'rtl' : 'ltr');
  document.documentElement.classList.toggle('rtl', currentLocale === 'ar');
}

function setLocale(locale) {
  currentLocale = locale;
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem(LOCALE_CACHE_KEY) || 'null'); } catch (e) { /* ignore */ }
  if (cached && cached.locale === locale && cached.translations) {
    currentTranslations = cached.translations;
  } else {
    currentTranslations = locale === 'ar' ? LOGIN_AR_FALLBACK : {};
  }
  try { localStorage.setItem(LOCALE_KEY, locale); } catch (e) { /* private browsing etc. - locale just won't persist */ }
  applyDomTranslations();
}

function toggleLocale() {
  setLocale(currentLocale === 'ar' ? 'en' : 'ar');
}

// Runs at script load (this tag is `defer`, so the DOM is already parsed) -
// picks up whatever locale this browser last had, or 'en' the very first
// time the app is ever opened here.
(function initLocale() {
  let saved = 'en';
  try { saved = localStorage.getItem(LOCALE_KEY) || 'en'; } catch (e) { /* ignore */ }
  setLocale(saved);
})();

let step = 1;
// Defaults to on: unchecked, the token lives in sessionStorage, which is
// wiped whenever the tab/app closes - for the installed PWA that meant
// every relaunch forced a fresh login. Still toggleable for a shared device.
let rememberMe = true;
let secure = true;
let currentCredential = '';
let currentPassword = '';

function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}
function saveToken(token) {
  (rememberMe ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
}
function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 1800);
}

function clearCredentialError() {
  document.getElementById('credentialError').classList.remove('show');
}

function clearLoginError() {
  document.getElementById('loginError').classList.remove('show');
}
function setError(id, message) {
  const el = document.getElementById(id);
  el.textContent = message;
  el.classList.add('show');
}

function switchPanel(newStep, direction) {
  document.querySelectorAll('.panel').forEach(p => p.style.display = 'none');
  const panel = document.getElementById('panel' + newStep);
  panel.style.display = 'block';
  panel.classList.remove('enter', 'enter-back');
  void panel.offsetWidth; // reflow to restart animation
  panel.classList.add(direction === 1 ? 'enter' : 'enter-back');

  const topbar1 = document.getElementById('topbarStep1');
  const topbarOther = document.getElementById('topbarStepOther');

  if (newStep === 1) {
    topbar1.style.display = 'flex';
    topbarOther.style.display = 'none';
  } else {
    topbar1.style.display = 'none';
    topbarOther.style.display = 'flex';
    document.getElementById('topbarOtherTitle').textContent = t('login.sign_in', 'Sign in');
  }

  document.getElementById('dot1').classList.toggle('active', newStep === 1);
  document.getElementById('dot2').classList.toggle('active', newStep === 2);

  document.getElementById('bodyScroll').scrollTo({ top: 0, behavior: 'smooth' });
  step = newStep;
}

function goToStep2() {
  const credential = document.getElementById('credentialInput').value.trim();
  // No format-specific check anymore - an email, an ID number, and a
  // username all look different enough from each other that validating
  // "is this a plausible one of the three" would mostly just mean
  // re-deriving what detectLoginType() already needs to do at submit
  // time. Only real client-side requirement left is "typed something".
  if (!credential) {
    document.getElementById('credentialError').classList.add('show');
    return;
  }
  clearCredentialError();
  currentCredential = credential;
  document.getElementById('credentialChipText').textContent = credential;
  switchPanel(2, 1);
  setTimeout(() => document.getElementById('passwordInput').focus(), 100);
}

function goToStep1() {
  switchPanel(1, -1);
}

function handleBack() {
  goToStep1();
}

function togglePassword() {
  const input = document.getElementById('passwordInput');
  secure = !secure;
  input.type = secure ? 'password' : 'text';
  const icon = document.getElementById('eyeIcon');
  icon.innerHTML = secure
    ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#6B8C88" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><line x1="4" y1="20" x2="20" y2="4" stroke="#6B8C88" stroke-width="1.7" stroke-linecap="round"/>'
    : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#6B8C88" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="#6B8C88" stroke-width="1.7"/>';
}

function toggleRemember() {
  rememberMe = !rememberMe;
  document.getElementById('rememberCheckbox').classList.toggle('checked', rememberMe);
}

function updateSubmitState() {
  const pw = document.getElementById('passwordInput').value;
  document.getElementById('loginBtn').disabled = !(currentCredential.length > 0 && pw.length > 0);
}

// Shared by the manual sign-in form and the Quick Demo Access buttons
// below - both end up authenticating the same way against the same
// endpoint, just with credentials that come from different places.
function requestLogin(credential, password) {
  return fetch(ENDPOINTS.login, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    // Field stays named 'email' for backward compat with the API - the
    // backend accepts any of the three credential types through it.
    // login_type is only sent when it's unambiguously an email address;
    // omitted otherwise, since an ID number and a username can look
    // identical (a username is generated FROM the ID number, digits and
    // all - see generate_username() in the backend's CommonHelper.php),
    // so the backend checks the ID-number and username columns together
    // rather than trusting a guess here.
    body: JSON.stringify(Object.assign(
      { email: credential, password: password, device_name: 'muslimedu-web' },
      detectLoginType(credential) ? { login_type: detectLoginType(credential) } : {}
    )),
  }).then(res => res.json().catch(() => ({})).then(data => ({ res, data })));
}

// Runs once a /login response is confirmed ok (2FA already ruled out by
// the caller). Saves the token, clears stale offline cache on a genuine
// account switch, and redirects to the right dashboard.
function completeLogin(data) {
  saveToken(data.token);
  // The offline layer's IndexedDB is keyed on endpoint+body with no
  // account in the key, and it outlives both logout and a plain
  // browser-close (which never runs wireLogout at all). If this is a
  // different account than the cache was built for, a stale entry
  // would answer this user's offline reads - /me included, which is
  // what guardDashboard() trusts for identity - and any queued write
  // would replay under the previous user's token. So wipe both stores
  // on a genuine account change, and keep them when the same person
  // signs back in, so their unsynced offline work survives.
  const go = () => { window.location.href = dashboardUrlForRole(data.user.role); };
  const owner = data.user && data.user.id != null ? String(data.user.id) : null;
  const sameAccount = owner !== null && localStorage.getItem(USER_KEY) === owner;
  if (owner !== null) localStorage.setItem(USER_KEY, owner);
  const offline = window.MuslimEduOffline;
  if (sameAccount || !offline || !offline.clearCache) { go(); return; }
  // Navigate even if the wipe fails or hangs: openDb() stays pending
  // when IndexedDB is blocked, and that must not strand the user here.
  Promise.race([
    offline.clearCache({ reads: true, queue: true }),
    new Promise(r => setTimeout(r, 2000)),
  ]).then(go, go);
}

function handleSubmit() {
  const btn = document.getElementById('loginBtn');
  if (btn.disabled || btn.classList.contains('loading')) return;
  currentPassword = document.getElementById('passwordInput').value;

  const label = document.getElementById('loginBtnLabel');
  btn.classList.add('loading');
  btn.disabled = true;
  label.textContent = t('login.please_wait', 'Please wait…');
  clearLoginError();

  requestLogin(currentCredential, currentPassword)
    .then(({ res, data }) => {
      // Two-factor isn't wired up on the web - tell the account holder
      // plainly instead of silently failing or crashing on a step that
      // no longer exists here.
      if (res.ok && data && data.requires_two_factor) {
        setError('loginError', 'This account has two-factor authentication enabled, which isn’t supported on the web yet. Please sign in from the MuslimEdu app.');
        return;
      }
      if (!res.ok) {
        setError('loginError', (data && data.message) || 'Login failed.');
        return;
      }
      completeLogin(data);
    })
    .catch(() => {
      setError('loginError', 'Could not reach the server. Check your internet connection.');
    })
    .finally(() => {
      btn.classList.remove('loading');
      label.textContent = t('login.log_in', 'Log In');
      updateSubmitState();
    });
}

// ── Quick Demo Access ────────────────────────────────────────────────
// Three pre-seeded accounts, one per role. Tapping a role signs straight
// in through the same /login endpoint the manual form above uses (no
// separate backend route needed) - it just skips typing credentials.
// *** Fill in the real demo account credentials below before deploying. ***
const DEMO_ACCOUNTS = {
  admin:   { credential: 'FILL_ME_IN', password: 'FILL_ME_IN' },
  teacher: { credential: 'FILL_ME_IN', password: 'FILL_ME_IN' },
  student: { credential: 'FILL_ME_IN', password: 'FILL_ME_IN' },
};
const DEMO_BTN_IDS = { admin: 'demoAdminBtn', teacher: 'demoTeacherBtn', student: 'demoStudentBtn' };
// Which demo role (if any) the visitor tried, so it can be attached to
// their "How's the demo?" feedback below - DemoFeedbackController's
// `role` field is optional, this just adds context when it's known.
let lastDemoRole = null;

function setDemoButtonsLoading(loading) {
  Object.values(DEMO_BTN_IDS).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('loading', loading);
  });
}
function setDemoHint(message, isError) {
  const hint = document.getElementById('demoHint');
  if (!hint) return;
  hint.textContent = message;
  hint.classList.toggle('error', !!isError);
}

function performDemoLogin(role) {
  const btn = document.getElementById(DEMO_BTN_IDS[role]);
  if (btn && btn.classList.contains('loading')) return;
  const account = DEMO_ACCOUNTS[role];
  if (!account || !account.credential || !account.password || account.credential === 'FILL_ME_IN') {
    setDemoHint('This demo account isn’t set up yet.', true);
    return;
  }
  lastDemoRole = role;
  setDemoButtonsLoading(true);
  setDemoHint(t('login.please_wait', 'Please wait…'), false);

  requestLogin(account.credential, account.password)
    .then(({ res, data }) => {
      if (res.ok && data && data.requires_two_factor) {
        setDemoHint('This demo account has two-factor authentication enabled and can’t sign in here.', true);
        return;
      }
      if (!res.ok) {
        setDemoHint((data && data.message) || 'Could not sign in to the demo account.', true);
        return;
      }
      completeLogin(data);
    })
    .catch(() => {
      setDemoHint('Could not reach the server. Check your internet connection.', true);
    })
    .finally(() => {
      setDemoButtonsLoading(false);
    });
}

// ── "How's the demo?" feedback card ─────────────────────────────────
// Collapsed by default; posts multipart (for the optional photo) to
// /demo_feedback_submit - public, no auth (see DemoFeedbackController).
// Required there: name, email, address, phone, message. Optional:
// rating (1-5), role, photo (jpg/jpeg/png, max 5MB).
let feedbackRating = 0;
let feedbackPhotoFile = null;

function buildFeedbackStars() {
  const row = document.getElementById('feedbackStarRow');
  if (!row) return;
  row.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const starBtn = document.createElement('button');
    starBtn.type = 'button';
    starBtn.className = 'feedback-star';
    starBtn.setAttribute('data-value', String(i));
    starBtn.setAttribute('aria-label', i + ' star' + (i > 1 ? 's' : ''));
    starBtn.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.6 7.1.7-5.4 4.7 1.6 7-6.2-3.8-6.2 3.8 1.6-7L1.9 9.3l7.1-.7L12 2z"/></svg>';
    starBtn.addEventListener('click', () => setFeedbackRating(i));
    row.appendChild(starBtn);
  }
}
function setFeedbackRating(value) {
  feedbackRating = value;
  document.querySelectorAll('#feedbackStarRow .feedback-star').forEach(starBtn => {
    starBtn.classList.toggle('filled', Number(starBtn.getAttribute('data-value')) <= value);
  });
}

function toggleFeedbackCard() {
  document.getElementById('feedbackCard').classList.toggle('collapsed');
}

function clearFeedbackHint() {
  const hint = document.getElementById('feedbackHint');
  hint.textContent = '';
  hint.classList.remove('error');
}
function setFeedbackHint(message, isError) {
  const hint = document.getElementById('feedbackHint');
  hint.textContent = message;
  hint.classList.toggle('error', !!isError);
}

function handleFeedbackPhotoChange() {
  const input = document.getElementById('feedbackPhotoInput');
  const file = input.files && input.files[0];
  feedbackPhotoFile = file || null;
  document.getElementById('feedbackPhotoName').textContent = file ? file.name : '';
}

function handleFeedbackSubmit() {
  const btn = document.getElementById('feedbackSubmitBtn');
  if (btn.disabled) return;

  const name = document.getElementById('feedbackName').value.trim();
  const email = document.getElementById('feedbackEmail').value.trim();
  const address = document.getElementById('feedbackAddress').value.trim();
  const phone = document.getElementById('feedbackPhone').value.trim();
  const message = document.getElementById('feedbackMessage').value.trim();

  // Mirrors DemoFeedbackController's validator - name/email/address/
  // phone/message required, rating/role/photo optional.
  if (!name || !email || !EMAIL_RE.test(email) || !address || !phone || !message) {
    setFeedbackHint('Please fill in your name, a valid email, address, phone, and feedback.', true);
    return;
  }
  clearFeedbackHint();

  btn.disabled = true;
  btn.textContent = 'Sending…';

  const formData = new FormData();
  formData.append('name', name);
  formData.append('email', email);
  formData.append('address', address);
  formData.append('phone', phone);
  formData.append('message', message);
  if (feedbackRating > 0) formData.append('rating', String(feedbackRating));
  if (lastDemoRole) formData.append('role', lastDemoRole);
  if (feedbackPhotoFile) formData.append('photo', feedbackPhotoFile);

  fetch(ENDPOINTS.demoFeedback, {
    method: 'POST',
    headers: { Accept: 'application/json' }, // no Content-Type - the browser sets the multipart boundary itself
    body: formData,
  })
    .then(res => res.json().catch(() => ({})).then(data => ({ res, data })))
    .then(({ res, data }) => {
      if (!res.ok) {
        if (res.status === 422 && data && data.errors) {
          const firstError = Object.values(data.errors)[0];
          setFeedbackHint(Array.isArray(firstError) ? firstError[0] : 'Please check the highlighted fields.', true);
        } else {
          setFeedbackHint('Could not send feedback. Please try again.', true);
        }
        return;
      }
      document.getElementById('feedbackCard').classList.add('sent');
      setFeedbackHint('Thanks for your feedback!', false);
      showToast('Feedback sent — thank you!');
    })
    .catch(() => {
      setFeedbackHint('Could not reach the server. Check your internet connection.', true);
    })
    .finally(() => {
      btn.disabled = false;
      btn.textContent = 'Send feedback';
    });
}

// Both the demo-login buttons and the feedback card only exist on
// demo/index.php - every other page sharing this script (login.php,
// the regular index.php, demo/login.php) has neither, so bail out
// quietly rather than throwing on a missing element.
function initDemoSection() {
  const adminBtn = document.getElementById('demoAdminBtn');
  if (!adminBtn) return;

  adminBtn.addEventListener('click', () => performDemoLogin('admin'));
  document.getElementById('demoTeacherBtn').addEventListener('click', () => performDemoLogin('teacher'));
  document.getElementById('demoStudentBtn').addEventListener('click', () => performDemoLogin('student'));

  if (document.getElementById('feedbackCard')) {
    buildFeedbackStars();
    document.getElementById('feedbackHeaderBtn').addEventListener('click', toggleFeedbackCard);
    document.getElementById('feedbackPhotoBtn').addEventListener('click', () => document.getElementById('feedbackPhotoInput').click());
    document.getElementById('feedbackPhotoInput').addEventListener('change', handleFeedbackPhotoChange);
    document.getElementById('feedbackSubmitBtn').addEventListener('click', handleFeedbackSubmit);
    ['feedbackName', 'feedbackEmail', 'feedbackAddress', 'feedbackPhone', 'feedbackMessage'].forEach(id => {
      document.getElementById(id).addEventListener('input', clearFeedbackHint);
    });
  }
}

function openSheet() {
  document.getElementById('modalBackdrop').classList.add('open');
}
function closeSheet() {
  document.getElementById('modalBackdrop').classList.remove('open');
}

// ── Forgot password ──────────────────────────────────────────────────
// Always shows the same "check your email" success state whether or not
// the address actually has an account - see handleForgotSubmit()'s
// .then() below. Doing otherwise (e.g. "no account with that email")
// would let this form be used to test which emails are registered.
function resetForgotSheetState() {
  document.getElementById('forgotFormState').style.display = '';
  document.getElementById('forgotSuccessState').style.display = 'none';
  document.getElementById('forgotEmailInput').value = currentCredential && EMAIL_RE.test(currentCredential) ? currentCredential : '';
  clearForgotError();
  const btn = document.getElementById('forgotSubmitBtn');
  const label = document.getElementById('forgotSubmitLabel');
  btn.classList.remove('loading');
  btn.disabled = false;
  label.textContent = t('login.forgot_send', 'Send Reset Link');
}
function openForgotSheet() {
  resetForgotSheetState();
  document.getElementById('forgotBackdrop').classList.add('open');
  setTimeout(() => document.getElementById('forgotEmailInput').focus(), 100);
}
function closeForgotSheet() {
  document.getElementById('forgotBackdrop').classList.remove('open');
}
function clearForgotError() {
  document.getElementById('forgotError').classList.remove('show');
}
function handleForgotSubmit() {
  const btn = document.getElementById('forgotSubmitBtn');
  if (btn.classList.contains('loading')) return;
  const email = document.getElementById('forgotEmailInput').value.trim();
  if (!EMAIL_RE.test(email)) {
    document.getElementById('forgotError').classList.add('show');
    return;
  }
  clearForgotError();

  const label = document.getElementById('forgotSubmitLabel');
  btn.classList.add('loading');
  btn.disabled = true;
  label.textContent = t('login.please_wait', 'Please wait…');

  fetch(ENDPOINTS.forgotPassword, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email: email }),
  })
    .then(res => res.json().catch(() => ({})).then(data => ({ res, data })))
    .then(({ res, data }) => {
      // Treat any non-5xx response as "request accepted" - a 404/422 for
      // "no such account" still shows the same success state (see the
      // comment above resetForgotSheetState()). Only a genuine server
      // failure falls through to the catch below.
      if (res.status >= 500) {
        throw new Error((data && data.message) || t('login.forgot_generic_error', 'Could not send the reset link. Please try again.'));
      }
      document.getElementById('forgotSuccessText').textContent =
        t('login.forgot_sent_body', 'If an account exists for {email}, we\u2019ve sent a password reset link to it.').replace('{email}', email);
      document.getElementById('forgotFormState').style.display = 'none';
      document.getElementById('forgotSuccessState').style.display = '';
    })
    .catch(err => {
      document.getElementById('forgotError').textContent = (err && err.message) || t('login.forgot_generic_error', 'Could not send the reset link. Please try again.');
      document.getElementById('forgotError').classList.add('show');
    })
    .finally(() => {
      btn.classList.remove('loading');
      btn.disabled = false;
      label.textContent = t('login.forgot_send', 'Send Reset Link');
    });
}

// ── Wire up all interactive elements (CSP script-src 'self' blocks
//    inline onclick/oninput attributes, so everything binds here) ──
function wireUp() {
  document.getElementById('langChip').addEventListener('click', toggleLocale);
  document.getElementById('backBtn').addEventListener('click', handleBack);

  const credentialInput = document.getElementById('credentialInput');
  credentialInput.addEventListener('input', clearCredentialError);
  credentialInput.addEventListener('keydown', e => { if (e.key === 'Enter') goToStep2(); });
  document.getElementById('continueBtn').addEventListener('click', goToStep2);

  document.querySelectorAll('.get-started-link').forEach(el => el.addEventListener('click', openSheet));

  const passwordInput = document.getElementById('passwordInput');
  passwordInput.addEventListener('input', () => { clearLoginError(); updateSubmitState(); });
  passwordInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleSubmit(); });
  document.getElementById('eyeBtn').addEventListener('click', togglePassword);
  // The checkbox markup always starts unchecked - toggleRemember() only
  // flips it on a click, so it has to be seeded here or it'd show
  // unchecked while rememberMe is actually true.
  document.getElementById('rememberCheckbox').classList.toggle('checked', rememberMe);
  document.getElementById('rememberRow').addEventListener('click', toggleRemember);
  document.getElementById('forgotText').addEventListener('click', openForgotSheet);
  document.getElementById('loginBtn').addEventListener('click', handleSubmit);

  const modalBackdrop = document.getElementById('modalBackdrop');
  modalBackdrop.addEventListener('click', e => { if (e.target === modalBackdrop) closeSheet(); });
  document.getElementById('sheetHandleZone').addEventListener('click', closeSheet);

  const forgotEmailInput = document.getElementById('forgotEmailInput');
  forgotEmailInput.addEventListener('input', clearForgotError);
  forgotEmailInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleForgotSubmit(); });
  document.getElementById('forgotSubmitBtn').addEventListener('click', handleForgotSubmit);
  document.getElementById('forgotDoneBtn').addEventListener('click', closeForgotSheet);
  const forgotBackdrop = document.getElementById('forgotBackdrop');
  forgotBackdrop.addEventListener('click', e => { if (e.target === forgotBackdrop) closeForgotSheet(); });
  document.getElementById('forgotHandleZone').addEventListener('click', closeForgotSheet);

  initDemoSection();

  // ── On load: already signed in -> go straight to the right dashboard,
  //    same as AuthContext's launch check deciding "skip login" on native. ──
  const token = getStoredToken();
  if (!token) return;
  fetch(ENDPOINTS.me, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: 'Bearer ' + token },
  })
    .then(res => {
      // Only 401/403 mean the token itself is no longer good. A 5xx is the
      // server having a bad moment, not the session ending.
      if (res.status === 401 || res.status === 403) throw { invalidSession: true };
      if (!res.ok) throw new Error('server unavailable');
      return res.json();
    })
    .then(data => {
      if (!data || !data.user) throw new Error('unexpected response');
      window.location.href = dashboardUrlForRole(data.user.role);
    })
    .catch(err => {
      // Anything other than a real "no" from the server leaves the token
      // alone and just shows the sign-in form. This check runs on every
      // cold launch of the installed app, which routinely starts before
      // the network is ready - treating that as a logout signed people
      // out constantly.
      if (err && err.invalidSession) clearStoredToken();
    });
}

document.addEventListener('DOMContentLoaded', wireUp);
