// "Create Alumni Account" — web port of the RN app's AlumniRegistrationScreen
// (src/screens/AlumniRegistrationScreen.tsx) / alumniRegistrationService.ts.
// Same 4-step flow: pick your school -> basic info -> graduation details ->
// review -> submit. Public/unauthenticated, standalone page (same pattern
// as login.js/register.js — its own API_BASE_URL, no dashboard.js).
// Backend: AlumniRegistrationApiController (public_school_list /
// alumni_registration_submit).

const API_BASE_URL = 'https://manhaje.com/apps/api';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CURRENT_YEAR = new Date().getFullYear();

let step = 1;
let schools = [];
let loadingSchools = true;
let schoolsError = null;
let selectedSchool = null;
let passwordVisible = false;
let confirmVisible = false;
let submitting = false;

// ── Localization ─────────────────────────────────────────────────────
// Same reasoning as login.js: this page runs before anyone is signed in,
// so it reads the same cached locale bundle a prior sign-in on this
// browser may have left behind, and otherwise falls back to a small
// hand-translated copy of just this page's own strings.
const LOCALE_KEY = 'muslimedu_locale';
const LOCALE_CACHE_KEY = 'muslimedu_locale_bundle';
const AR_FALLBACK = {
  'alumni_registration.topbar_title': 'إنشاء حساب خريج',
  'alumni_registration.topbar_subtitle': 'أعد التواصل مع مجتمع مدرستك',
  'alumni_registration.school_search_placeholder': 'ابحث عن مدرستك',
  'alumni_registration.loading_schools': 'جارٍ تحميل المدارس…',
  'alumni_registration.could_not_load_schools': 'تعذر تحميل المدارس.',
  'alumni_registration.try_again': 'إعادة المحاولة',
  'alumni_registration.no_schools_found': 'لم يتم العثور على مدارس.',
  'alumni_registration.full_name_label': 'الاسم الكامل',
  'alumni_registration.full_name_placeholder': 'كما يظهر في سجلاتك',
  'alumni_registration.email_label': 'البريد الإلكتروني',
  'alumni_registration.email_placeholder': 'you@example.com',
  'alumni_registration.phone_label': 'الهاتف',
  'alumni_registration.optional_suffix': '(اختياري)',
  'alumni_registration.phone_placeholder': '+63 912 345 6789',
  'alumni_registration.password_label': 'كلمة المرور',
  'alumni_registration.password_placeholder': '8 أحرف على الأقل',
  'alumni_registration.confirm_password_label': 'تأكيد كلمة المرور',
  'alumni_registration.confirm_password_placeholder': 'أعد إدخال كلمة المرور',
  'alumni_registration.passwords_dont_match': 'كلمتا المرور غير متطابقتين.',
  'alumni_registration.graduation_year_label': 'سنة التخرج',
  'alumni_registration.program_label': 'البرنامج / الشهادة',
  'alumni_registration.program_placeholder': 'مثال: برنامج التحفيظ، شهادة الثانوية',
  'alumni_registration.anything_else_label': 'هل هناك شيء آخر؟',
  'alumni_registration.notes_placeholder': 'ملاحظة اختيارية لمسؤول المدرسة الذي سيراجع طلبك',
  'alumni_registration.review_school_section': 'المدرسة',
  'alumni_registration.review_school_label': 'المدرسة',
  'alumni_registration.review_your_info_section': 'معلوماتك',
  'alumni_registration.review_full_name_label': 'الاسم الكامل',
  'alumni_registration.review_email_label': 'البريد الإلكتروني',
  'alumni_registration.review_phone_label': 'الهاتف',
  'alumni_registration.review_graduation_section': 'التخرج',
  'alumni_registration.review_graduation_year_label': 'سنة التخرج',
  'alumni_registration.review_program_label': 'البرنامج / الشهادة',
  'alumni_registration.review_notes_label': 'ملاحظات',
  'alumni_registration.submit_error_default': 'حدث خطأ ما.',
  'alumni_registration.next_btn': 'التالي',
  'alumni_registration.submit_application_btn': 'إرسال الطلب',
  'alumni_registration.success_title': 'تم إرسال الطلب',
  'alumni_registration.success_body_default': 'حساب الخريج الخاص بك قيد المراجعة. ستتمكن من تسجيل الدخول بمجرد الموافقة عليه.',
  'alumni_registration.success_body_with_school': 'حساب الخريج الخاص بك قيد المراجعة من قِبل إدارة {school}. ستتمكن من تسجيل الدخول بمجرد الموافقة عليه.',
  'alumni_registration.pending_approval_badge': 'الحالة: بانتظار الموافقة',
  'alumni_registration.back_to_login': 'العودة لتسجيل الدخول',
  'alumni_registration.request_timeout': 'انتهت مهلة الطلب. تحقق من اتصالك وحاول مرة أخرى.',
  'alumni_registration.request_failed': 'فشل الطلب ({status}).',
  'alumni_registration.please_try_again': 'يرجى المحاولة مرة أخرى.',
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
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (!el.hasAttribute('data-i18n-placeholder-original')) el.setAttribute('data-i18n-placeholder-original', el.getAttribute('placeholder') || '');
    el.setAttribute('placeholder', t(key, el.getAttribute('data-i18n-placeholder-original')));
  });
  const chipText = document.getElementById('langChipText');
  if (chipText) chipText.textContent = currentLocale.toUpperCase();
  document.documentElement.setAttribute('dir', currentLocale === 'ar' ? 'rtl' : 'ltr');
  document.documentElement.classList.toggle('rtl', currentLocale === 'ar');
  updateNextButton();
  renderSchoolList();
  if (step === 4) renderReview();
}

function setLocale(locale) {
  currentLocale = locale;
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem(LOCALE_CACHE_KEY) || 'null'); } catch (e) { /* ignore */ }
  if (cached && cached.locale === locale && cached.translations) {
    currentTranslations = cached.translations;
  } else {
    currentTranslations = locale === 'ar' ? AR_FALLBACK : {};
  }
  try { localStorage.setItem(LOCALE_KEY, locale); } catch (e) { /* private browsing etc. - locale just won't persist */ }
  applyDomTranslations();
}

// AR_FALLBACK above has always had a complete Arabic translation for
// every string on this page - there was just no visible control to
// actually switch to it (the topbar had no lang-chip element at all).
// Same toggleLocale()/langChip pattern as login.js/register.js.
function toggleLocale() {
  setLocale(currentLocale === 'ar' ? 'en' : 'ar');
}
document.getElementById('langChip').addEventListener('click', toggleLocale);

(function initLocale() {
  let saved = 'en';
  try { saved = localStorage.getItem(LOCALE_KEY) || 'en'; } catch (e) { /* ignore */ }
  setLocale(saved);
})();

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2200);
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Ported from dashboard.js's absoluteUrl() - this page is standalone and
// doesn't load dashboard.js (see the file banner above), so it needs its
// own copy. The backend returns image/file fields (school logos here) as
// paths relative to the API server, never as full URLs.
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

async function postJson(path, body) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  let response;
  try {
    response = await fetch(API_BASE_URL + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err && err.name === 'AbortError') throw new Error(t('alumni_registration.request_timeout', 'Request timed out. Check your connection and try again.'));
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const firstFieldError = data && data.errors ? Object.values(data.errors)[0] : null;
    throw new Error((firstFieldError && firstFieldError[0]) || (data && data.message) || t('alumni_registration.request_failed', 'Request failed ({status}).').replace('{status}', response.status));
  }
  return data;
}

function fetchSchools() {
  return postJson('/public_school_list', {}).then(d => (d.schools || []).map(s => ({
    id: s.id, name: s.name, institutionType: s.institution_type, logo: s.logo,
  })));
}
function submitAlumniRegistration(input) {
  return postJson('/alumni_registration_submit', {
    school_id: input.schoolId, name: input.name, email: input.email, phone: input.phone || undefined,
    password: input.password, graduation_year: input.graduationYear,
    program: input.program || undefined, notes: input.notes || undefined,
  });
}

// ── Step 1: school list ─────────────────────────────────────────────────

function loadSchools() {
  loadingSchools = true;
  schoolsError = null;
  renderSchoolList();
  fetchSchools()
    .then(rows => { schools = rows; loadingSchools = false; renderSchoolList(); })
    .catch(err => { schoolsError = (err && err.message) || t('alumni_registration.could_not_load_schools', 'Could not load schools.'); loadingSchools = false; renderSchoolList(); });
}

function renderSchoolList() {
  const wrap = document.getElementById('schoolListWrap');
  if (loadingSchools) {
    wrap.innerHTML = '<div class="school-loading">' + escapeHtml(t('alumni_registration.loading_schools', 'Loading schools…')) + '</div>';
    return;
  }
  if (schoolsError) {
    wrap.innerHTML = '<div class="school-empty">' + escapeHtml(schoolsError) + '<br><span id="schoolsRetryLink" style="color:var(--accent);font-weight:700;cursor:pointer;">' + escapeHtml(t('alumni_registration.try_again', 'Try again')) + '</span></div>';
    document.getElementById('schoolsRetryLink').addEventListener('click', loadSchools);
    return;
  }

  const q = document.getElementById('schoolSearchInput').value.trim().toLowerCase();
  const filtered = q ? schools.filter(s => s.name.toLowerCase().includes(q)) : schools;

  if (!filtered.length) {
    wrap.innerHTML = '<div class="school-empty">' + escapeHtml(t('alumni_registration.no_schools_found', 'No schools found.')) + '</div>';
    return;
  }

  wrap.innerHTML = filtered.map(s => {
    const active = selectedSchool && selectedSchool.id === s.id;
    const initial = (s.name || '?').trim().charAt(0).toUpperCase();
    return (
      '<div class="school-row' + (active ? ' active' : '') + '" data-school-id="' + s.id + '">' +
        '<div class="school-logo-wrap">' +
          (s.logo ? '<img src="' + escapeHtml(absoluteUrl(s.logo)) + '" alt="" />' : '<span style="font-weight:800;color:var(--accent);">' + escapeHtml(initial) + '</span>') +
        '</div>' +
        '<div class="school-info">' +
          '<div class="school-name">' + escapeHtml(s.name) + '</div>' +
          '<div class="school-type">' + escapeHtml((s.institutionType || '').replace(/_/g, ' ')) + '</div>' +
        '</div>' +
        (active ? '<div class="school-check"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' : '') +
      '</div>'
    );
  }).join('');

  wrap.querySelectorAll('[data-school-id]').forEach(row => {
    row.addEventListener('click', () => {
      selectedSchool = schools.find(s => s.id === Number(row.dataset.schoolId)) || null;
      renderSchoolList();
      updateNextButton();
    });
  });
}

// ── Wizard chrome (dots, next button, navigation) ───────────

function renderStepChrome() {
  document.querySelectorAll('#stepDots .dot').forEach((dot, i) => {
    const n = i + 1;
    dot.classList.toggle('active', n === step);
    dot.classList.toggle('done', n < step);
  });
}

function showStep(n) {
  step = n;
  [1, 2, 3, 4].forEach(i => {
    document.getElementById('step' + i).style.display = i === step ? '' : 'none';
  });
  renderStepChrome();
  updateNextButton();
  document.getElementById('bodyScroll').scrollTop = 0;

  if (step === 2 && selectedSchool) {
    document.getElementById('selectedSchoolBanner').innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 4L2 9l10 5 8-4v6" stroke="#1C1C1E" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '<span class="school-banner-text">' + escapeHtml(selectedSchool.name) + '</span>';
  }
  if (step === 4) renderReview();
}

function stepValid(n) {
  if (n === 1) return !!selectedSchool;
  if (n === 2) {
    const name = document.getElementById('nameInput').value.trim();
    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value;
    const confirm = document.getElementById('confirmPasswordInput').value;
    return name.length > 0 && EMAIL_RE.test(email) && password.length >= 8 && password === confirm;
  }
  if (n === 3) {
    const y = parseInt(document.getElementById('gradYearInput').value, 10);
    return !!y && y >= 1950 && y <= CURRENT_YEAR + 1;
  }
  return true;
}

function updateNextButton() {
  const btn = document.getElementById('nextBtn');
  const label = document.getElementById('nextBtnLabel');
  label.textContent = step < 4 ? t('alumni_registration.next_btn', 'Next') : t('alumni_registration.submit_application_btn', 'Submit Application');
  btn.disabled = submitting || !stepValid(step);
}

function goNext() {
  if (!stepValid(step)) return;
  if (step === 2) {
    const password = document.getElementById('passwordInput').value;
    const confirm = document.getElementById('confirmPasswordInput').value;
    document.getElementById('passwordError').classList.toggle('show', confirm.length > 0 && password !== confirm);
    if (password !== confirm) return;
  }
  if (step < 4) { showStep(step + 1); return; }
  submit();
}
function goBack() {
  if (step === 1) { window.location.href = 'login.php'; return; }
  showStep(step - 1);
}

// ── Step 4: review ──────────────────────────────────────────────────────

function renderReview() {
  document.getElementById('reviewSchool').textContent = selectedSchool ? selectedSchool.name : '—';
  document.getElementById('reviewName').textContent = document.getElementById('nameInput').value.trim();
  document.getElementById('reviewEmail').textContent = document.getElementById('emailInput').value.trim();

  const phone = document.getElementById('phoneInput').value.trim();
  document.getElementById('reviewPhoneRow').style.display = phone ? '' : 'none';
  document.getElementById('reviewPhone').textContent = phone;

  document.getElementById('reviewGradYear').textContent = document.getElementById('gradYearInput').value.trim();

  const program = document.getElementById('programInput').value.trim();
  document.getElementById('reviewProgramRow').style.display = program ? '' : 'none';
  document.getElementById('reviewProgram').textContent = program;

  const notes = document.getElementById('notesInput').value.trim();
  document.getElementById('reviewNotesRow').style.display = notes ? '' : 'none';
  document.getElementById('reviewNotes').textContent = notes;

  document.getElementById('submitError').classList.remove('show');
}

// ── Submit ──────────────────────────────────────────────────────────────

function submit() {
  if (!selectedSchool || submitting) return;
  submitting = true;
  const btn = document.getElementById('nextBtn');
  btn.disabled = true;
  btn.classList.add('loading');
  document.getElementById('submitError').classList.remove('show');

  submitAlumniRegistration({
    schoolId: selectedSchool.id,
    name: document.getElementById('nameInput').value.trim(),
    email: document.getElementById('emailInput').value.trim(),
    phone: document.getElementById('phoneInput').value.trim(),
    password: document.getElementById('passwordInput').value,
    graduationYear: parseInt(document.getElementById('gradYearInput').value, 10),
    program: document.getElementById('programInput').value.trim(),
    notes: document.getElementById('notesInput').value.trim(),
  }).then(() => {
    document.getElementById('successBody').textContent =
      t('alumni_registration.success_body_with_school', 'Your alumni account is pending review by {school}’s admin. You’ll be able to sign in once it’s approved.').replace('{school}', selectedSchool.name);
    document.getElementById('wizardWrap').style.display = 'none';
    document.getElementById('successWrap').style.display = 'flex';
    document.getElementById('pageFooter').style.display = 'none';
  }).catch(err => {
    const msg = (err && err.message) || t('alumni_registration.please_try_again', 'Please try again.');
    document.getElementById('submitError').textContent = msg;
    document.getElementById('submitError').classList.add('show');
    showToast(msg);
  }).finally(() => {
    submitting = false;
    btn.classList.remove('loading');
    updateNextButton();
  });
}

// ── Boot ────────────────────────────────────────────────────────────────

document.getElementById('backBtn').addEventListener('click', goBack);
document.getElementById('nextBtn').addEventListener('click', goNext);
document.getElementById('schoolSearchInput').addEventListener('input', renderSchoolList);

['nameInput', 'emailInput', 'passwordInput', 'confirmPasswordInput'].forEach(id => {
  document.getElementById(id).addEventListener('input', () => {
    document.getElementById('passwordError').classList.remove('show');
    updateNextButton();
  });
});
document.getElementById('gradYearInput').addEventListener('input', (e) => {
  e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
  updateNextButton();
});

function toggleVisibility(inputId, btnId, flagSetter, flagGetter) {
  document.getElementById(btnId).addEventListener('click', () => {
    const show = !flagGetter();
    flagSetter(show);
    document.getElementById(inputId).type = show ? 'text' : 'password';
  });
}
toggleVisibility('passwordInput', 'passwordEyeBtn', v => (passwordVisible = v), () => passwordVisible);
toggleVisibility('confirmPasswordInput', 'confirmEyeBtn', v => (confirmVisible = v), () => confirmVisible);

renderStepChrome();
updateNextButton();
loadSchools();
