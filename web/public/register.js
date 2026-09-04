// Unauthenticated multipart POST -> { status: 'pending', registration_id }.
// Lands in the same superadmin review queue as an app submission.
// Restructured into a one-step-at-a-time wizard (same panel/switchPanel
// pattern as login.js, same design tokens/components as login.php)
// instead of one long all-at-once scrolling form.
var API_BASE_URL = 'https://manhaje.com/apps/api';
var SUBMIT_ENDPOINT = API_BASE_URL + '/school_registration_submit';

var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Localization ─────────────────────────────────────────────────────
// Same reasoning as login.js/alumni-registration.js: this page runs before
// anyone is signed in, so it reads the same cached locale bundle a prior
// sign-in on this browser may have left behind, and otherwise falls back
// to a small hand-translated copy of just this page's own strings.
var LOCALE_KEY = 'muslimedu_locale';
var LOCALE_CACHE_KEY = 'muslimedu_locale_bundle';
var AR_FALLBACK = {
  'register.step_institution_type': 'نوع المؤسسة',
  'register.step_school_info': 'معلومات المدرسة',
  'register.step_admin_account': 'حساب المسؤول',
  'register.step_identity_verification': 'التحقق من الهوية',
  'register.app_submitted': 'تم إرسال الطلب',
  'register.type_mahad': 'معهد',
  'register.type_mahad_tagline': 'معهد إسلامي أو برنامج كامل الوقت',
  'register.type_madrasa': 'مدرسة',
  'register.type_madrasa_tagline': 'مدرسة إسلامية جزئية أو في عطلة نهاية الأسبوع',
  'register.type_markaz': 'مركز',
  'register.type_markaz_tagline': 'مركز تعليمي مجتمعي',
  'register.type_orphanage': 'مدرسة أيتام',
  'register.type_orphanage_tagline': 'مؤسسة رعاية الأيتام — بدون منهج قائم على الصفوف',
  'register.feature_classes_attendance': 'الصفوف والحضور وسجل الدرجات',
  'register.feature_exams_grading': 'الامتحانات والتقييم وبطاقات التقارير',
  'register.feature_fees_enrollment': 'تحصيل الرسوم وتسجيل الطلاب',
  'register.feature_hifz_tracking': 'متابعة حفظ القرآن',
  'register.feature_orphan_profiles': 'ملفات الأطفال الأيتام وسجلات الرعاية',
  'register.feature_monthly_reports': 'تقارير شهرية عن التقدم من المعلمين والإدارة',
  'register.feature_sponsorship': 'إدارة الرعاية والجهات المانحة',
  'register.pw_rule_length': '8 أحرف على الأقل',
  'register.pw_rule_upper': 'حرف كبير واحد (A-Z)',
  'register.pw_rule_lower': 'حرف صغير واحد (a-z)',
  'register.pw_rule_number': 'رقم واحد (0-9)',
  'register.pw_rule_special': 'رمز خاص واحد (!@#$...)',
  'register.comes_with': 'يتضمن:',
  'register.continue': 'متابعة',
  'register.what_kind_line1': 'ما نوع المدرسة',
  'register.what_kind_line2': 'التي تنشئها؟',
  'register.institution_type_hint': 'هذا يحدد إعداداتك الافتراضية الأولية - لا شيء نهائي.',
  'register.school_info_line1': 'معلومات',
  'register.school_info_line2': 'المدرسة',
  'register.school_info_hint': 'أخبرنا عن مؤسستك.',
  'register.school_name_label': 'اسم المدرسة',
  'register.school_name_placeholder': 'مثال: أكاديمية النور الإسلامية',
  'register.address_label': 'العنوان',
  'register.address_placeholder': 'الشارع، المدينة، البلد',
  'register.school_email_label': 'البريد الإلكتروني للمدرسة',
  'register.email_invalid': 'يرجى إدخال عنوان بريد إلكتروني صحيح.',
  'register.school_phone_label': 'هاتف المدرسة',
  'register.admin_account_line1': 'حساب',
  'register.admin_account_line2': 'المسؤول',
  'register.admin_account_hint': 'ستستخدم هذا البريد الإلكتروني وكلمة المرور لتسجيل الدخول بعد الموافقة.',
  'register.your_full_name_label': 'اسمك الكامل',
  'register.your_full_name_placeholder': 'كما يظهر في هويتك',
  'register.your_email_label': 'بريدك الإلكتروني',
  'register.email_invalid_example': 'أدخل عنوان بريد إلكتروني صحيح، مثال: name@example.com',
  'register.your_phone_label': 'هاتفك',
  'register.password_label': 'كلمة المرور',
  'register.password_placeholder': 'أنشئ كلمة مرور قوية',
  'register.password_helper': '8 أحرف على الأقل، مع حرف كبير وحرف صغير ورقم ورمز.',
  'register.pw_meets_all': 'تستوفي جميع متطلبات كلمة المرور',
  'register.confirm_password_label': 'تأكيد كلمة المرور',
  'register.confirm_password_placeholder': 'أعد إدخال كلمة المرور',
  'register.passwords_dont_match': 'كلمتا المرور غير متطابقتين.',
  'register.identity_line1': 'التحقق من',
  'register.identity_line2': 'الهوية',
  'register.identity_hint': 'نتحقق من كل مسؤول جديد حتى تُدار المدارس على مسلم إيديو من قِبل أشخاص حقيقيين.',
  'register.upload_id_title': 'حمّل هويتك',
  'register.upload_id_hint': 'جواز سفر أو هوية وطنية أو رخصة قيادة',
  'register.upload_selfie_title': 'حمّل صورة شخصية',
  'register.upload_selfie_hint': 'صورة واضحة لوجهك بإضاءة جيدة',
  'register.change_photo': 'تغيير الصورة',
  'register.submit_application': 'إرسال الطلب',
  'register.submit_disclaimer': 'بالإرسال، فإنك توافق على التواصل معك بخصوص طلبك. تُستخدم هويتك وصورتك الشخصية فقط للتحقق من هويتك كمسؤول المدرسة.',
  'register.submit_error_default': 'حدث خطأ ما.',
  'register.app_submitted_title': 'تم إرسال الطلب',
  'register.app_submitted_body': 'حساب مدرستك والمسؤول قيد المراجعة. ستتمكن من تسجيل الدخول بمجرد موافقة فريق مسلم إيديو على طلبك - عادةً ما يكون ذلك سريعًا، لكن قد يستغرق بعض الوقت.',
  'register.go_to_login': 'الذهاب لتسجيل الدخول',
  'register.privacy_statement': 'بيان الخصوصية',
  'register.terms': 'الشروط',
  'register.copyright': '© 2026 مسلم إيديو. جميع الحقوق محفوظة.',
  'register.request_timeout': 'انتهت مهلة الطلب. تحقق من اتصالك وحاول مرة أخرى.',
  'register.request_failed': 'فشل الطلب ({status})',
  'register.could_not_reach_server': 'تعذر الوصول إلى الخادم. تحقق من اتصالك وحاول مرة أخرى.',
};
var currentLocale = 'en';
var currentTranslations = {};

function t(key, fallback) {
  return (currentTranslations && currentTranslations[key]) || fallback || key;
}

function applyDomTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(function (el) {
    var key = el.getAttribute('data-i18n');
    if (!el.hasAttribute('data-i18n-original')) el.setAttribute('data-i18n-original', el.textContent);
    el.textContent = t(key, el.getAttribute('data-i18n-original'));
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
    var key = el.getAttribute('data-i18n-placeholder');
    if (!el.hasAttribute('data-i18n-placeholder-original')) el.setAttribute('data-i18n-placeholder-original', el.getAttribute('placeholder') || '');
    el.setAttribute('placeholder', t(key, el.getAttribute('data-i18n-placeholder-original')));
  });
  var chipText = document.getElementById('langChipText');
  if (chipText) chipText.textContent = currentLocale.toUpperCase();
  document.documentElement.setAttribute('dir', currentLocale === 'ar' ? 'rtl' : 'ltr');
  document.documentElement.classList.toggle('rtl', currentLocale === 'ar');
}

function setLocale(locale) {
  currentLocale = locale;
  var cached = null;
  try { cached = JSON.parse(localStorage.getItem(LOCALE_CACHE_KEY) || 'null'); } catch (e) { /* ignore */ }
  if (cached && cached.locale === locale && cached.translations) {
    currentTranslations = cached.translations;
  } else {
    currentTranslations = locale === 'ar' ? AR_FALLBACK : {};
  }
  try { localStorage.setItem(LOCALE_KEY, locale); } catch (e) { /* private browsing etc. - locale just won't persist */ }
  applyDomTranslations();
}

// The .lang-chip markup and CSS already existed on this page (copied from
// login.php's shell) but nothing ever rendered a clickable element or
// wired it up - AR_FALLBACK above has always had a complete Arabic
// translation for every string on this page, there was just no way for a
// visitor to actually switch to it. Same toggleLocale()/langChip pattern
// as login.js.
function toggleLocale() {
  setLocale(currentLocale === 'ar' ? 'en' : 'ar');
}
document.getElementById('langChip').addEventListener('click', toggleLocale);

(function initLocale() {
  var saved = 'en';
  try { saved = localStorage.getItem(LOCALE_KEY) || 'en'; } catch (e) { /* ignore */ }
  setLocale(saved);
})();

// Small local icon set - same visual language as dashboard.js's icon()
// (24x24 viewBox, stroke-based, currentColor) but this page is standalone
// and doesn't load dashboard.js, so it carries just the paths it needs.
var ICON_PATHS = {
  idcard: '<rect x="2" y="4" width="20" height="16" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M15 9h4M15 13h4M6 17h6"/>',
  camera: '<path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  mosque: '<path d="M12 2v3M8 9a4 4 0 018 0v3H8V9z"/><path d="M4 21V13l3-2M20 21V13l-3-2"/><path d="M4 21h16"/><path d="M10 21v-4a2 2 0 014 0v4"/>',
  book: '<path d="M2 6a2 2 0 012-2h6v16H4a2 2 0 01-2-2V6z"/><path d="M22 6a2 2 0 00-2-2h-6v16h6a2 2 0 002-2V6z"/>',
  building: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 21v-4h6v4M9 8h.01M9 12h.01M14 8h.01M14 12h.01"/>',
  gradcap: '<path d="M2 9l10-5 10 5-10 5-10-5z"/><path d="M6 11v5c0 1.5 2.5 3 6 3s6-1.5 6-3v-5"/><path d="M22 9v6"/>',
  heart: '<path d="M12 21s-7-4.5-9.5-9C1 8.5 2 5 5.5 5c2 0 3.5 1.5 4.5 3 1-1.5 2.5-3 4.5-3C18 5 19 8.5 17.5 12 15 16.5 12 21 12 21z"/>',
  school: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M5 10.5V16c0 1 3 3 7 3s7-2 7-3v-5.5"/><path d="M21 10.5v6"/>',
  monitor: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
};
function svgIcon(name, size, color) {
  size = size || 20;
  color = color || 'currentColor';
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (ICON_PATHS[name] || '') + '</svg>';
}

document.getElementById('idUploadIcon').innerHTML = svgIcon('idcard', 20);
document.getElementById('selfieUploadIcon').innerHTML = svgIcon('camera', 20);
document.getElementById('successIcon').innerHTML = svgIcon('check', 28);

function standardFeatures() {
  return [
    t('register.feature_classes_attendance', 'Classes, attendance & gradebook'),
    t('register.feature_exams_grading', 'Exams, grading & report cards'),
    t('register.feature_fees_enrollment', 'Fee collection & student enrollment'),
  ];
}
function institutionTypes() {
  return [
    { type: 'mahad', name: t('register.type_mahad', 'Mahad'), icon: 'mosque', tagline: t('register.type_mahad_tagline', 'Islamic seminary or full-time program'), features: standardFeatures() },
    { type: 'madrasa', name: t('register.type_madrasa', 'Madrasa'), icon: 'book', tagline: t('register.type_madrasa_tagline', 'Part-time or weekend Islamic school'), features: standardFeatures() },
    { type: 'markaz', name: t('register.type_markaz', 'Markaz'), icon: 'building', tagline: t('register.type_markaz_tagline', 'Community learning center'), features: standardFeatures().concat([t('register.feature_hifz_tracking', 'Quran memorization (Hifz) tracking')]) },
    { type: 'orphanage', name: t('register.type_orphanage', 'Orphan School'), icon: 'heart', tagline: t('register.type_orphanage_tagline', 'Orphan care institution — no class-based curriculum'), features: [t('register.feature_orphan_profiles', 'Orphan child profiles & care records'), t('register.feature_monthly_reports', 'Monthly progress reports from teachers & admin'), t('register.feature_sponsorship', 'Sponsorship & donor management')] },
    { type: 'regular_school', name: t('register.type_regular', 'Regular School'), icon: 'school', tagline: t('register.type_regular_tagline', 'Full-time day school, standard curriculum'), features: standardFeatures() },
    { type: 'online_class', name: t('register.type_online', 'Online Class'), icon: 'monitor', tagline: t('register.type_online_tagline', 'Remote/virtual classes, no physical campus'), features: standardFeatures().concat([t('register.feature_virtual_sessions', 'Virtual session links & recordings')]) },
  ];
}

// Same rules as the app's PASSWORD_RULES / isPasswordStrong.
function passwordRules() {
  return [
    { key: 'length', label: t('register.pw_rule_length', 'At least 8 characters'), test: function (pw) { return pw.length >= 8; } },
    { key: 'upper', label: t('register.pw_rule_upper', 'One uppercase letter (A-Z)'), test: function (pw) { return /[A-Z]/.test(pw); } },
    { key: 'lower', label: t('register.pw_rule_lower', 'One lowercase letter (a-z)'), test: function (pw) { return /[a-z]/.test(pw); } },
    { key: 'number', label: t('register.pw_rule_number', 'One number (0-9)'), test: function (pw) { return /[0-9]/.test(pw); } },
    { key: 'special', label: t('register.pw_rule_special', 'One special character (!@#$...)'), test: function (pw) { return /[^A-Za-z0-9]/.test(pw); } },
  ];
}
function passwordStrong(pw) {
  return passwordRules().every(function (r) { return r.test(pw); });
}

function stepTitles() {
  return [
    t('register.step_institution_type', 'Institution Type'),
    t('register.step_school_info', 'School Information'),
    t('register.step_admin_account', 'Administrator Account'),
    t('register.step_identity_verification', 'Identity Verification'),
  ];
}

// ── State ────────────────────────────────────────────────────────
var step = 1;
var state = {
  institutionType: null,
  idFile: null,       // resized Blob ready to upload
  selfieFile: null,
};

// ── Wizard chrome (topbar title, dots, back navigation) ───────────
function updateChrome() {
  document.getElementById('topbarTitle').textContent = step <= 4 ? stepTitles()[step - 1] : t('register.app_submitted', 'Application Submitted');
  for (var i = 1; i <= 4; i++) {
    document.getElementById('dot' + i).classList.toggle('active', i === step);
  }
  document.getElementById('stepDots').style.display = step <= 4 ? 'flex' : 'none';
}

function switchPanel(newStep) {
  document.querySelectorAll('.panel').forEach(function (p) { p.style.display = 'none'; });
  var panel = document.getElementById(newStep <= 4 ? 'panel' + newStep : 'panelSuccess');
  panel.style.display = 'block';
  panel.classList.remove('enter');
  void panel.offsetWidth; // reflow to restart animation
  panel.classList.add('enter');
  step = newStep;
  updateChrome();
  // .body-scroll is the one that actually scrolls (only engages on a
  // step taller than the viewport - see register.php) - the outer page
  // itself has no scroll position of its own to reset.
  document.getElementById('bodyScroll').scrollTo({ top: 0, behavior: 'smooth' });
}

function goBack() {
  if (step === 1) { window.location.href = 'login.php'; return; }
  switchPanel(step - 1);
}
document.getElementById('backBtn').addEventListener('click', goBack);

// ── Step 1: Institution type grid ───────────────────────────────
var typeGrid = document.getElementById('typeGrid');
function renderTypeGrid() {
  typeGrid.innerHTML = '';
  institutionTypes().forEach(function (opt) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'type-tile' + (state.institutionType === opt.type ? ' active' : '');
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', String(state.institutionType === opt.type));
    btn.dataset.type = opt.type;
    btn.innerHTML = '<span class="type-tile-icon">' + svgIcon(opt.icon, 16) + '</span><span class="type-tile-name">' + opt.name + '</span><span class="type-tile-tagline">' + opt.tagline + '</span>';
    btn.addEventListener('click', function () { selectType(opt.type); });
    typeGrid.appendChild(btn);
  });
}
renderTypeGrid();

function selectType(type) {
  state.institutionType = type;
  Array.prototype.forEach.call(typeGrid.children, function (el) {
    var active = el.dataset.type === type;
    el.classList.toggle('active', active);
    el.setAttribute('aria-checked', String(active));
  });
  var meta = institutionTypes().filter(function (o) { return o.type === type; })[0];
  var preview = document.getElementById('typePreview');
  preview.classList.add('filled');
  document.getElementById('typePreviewTag').textContent = t('register.comes_with', 'Comes with:');
  var list = document.getElementById('typePreviewList');
  list.innerHTML = '';
  meta.features.forEach(function (f) {
    var row = document.createElement('div');
    row.className = 'type-preview-feature';
    row.innerHTML = svgIcon('check', 13, 'var(--accent)') + '<span>' + f + '</span>';
    list.appendChild(row);
  });
  document.getElementById('step1NextBtn').disabled = false;
}
document.getElementById('step1NextBtn').addEventListener('click', function () { switchPanel(2); });

// ── Step 2: School information ──────────────────────────────────
var schoolNameInput = document.getElementById('schoolName');
var schoolAddressInput = document.getElementById('schoolAddress');
var schoolEmailInput = document.getElementById('schoolEmail');
var schoolPhoneInput = document.getElementById('schoolPhone');

function step2Valid() {
  return (
    schoolNameInput.value.trim().length > 0 &&
    schoolAddressInput.value.trim().length > 0 &&
    EMAIL_RE.test(schoolEmailInput.value.trim()) &&
    schoolPhoneInput.value.trim().length > 0
  );
}
function refreshStep2Btn() {
  document.getElementById('step2NextBtn').disabled = !step2Valid();
}
[schoolNameInput, schoolAddressInput, schoolEmailInput, schoolPhoneInput].forEach(function (el) {
  el.addEventListener('input', refreshStep2Btn);
});
schoolEmailInput.addEventListener('input', function () {
  var v = schoolEmailInput.value.trim();
  document.getElementById('schoolEmailErr').classList.toggle('show', v.length > 0 && !EMAIL_RE.test(v));
});
document.getElementById('step2NextBtn').addEventListener('click', function () { switchPanel(3); });

// ── Step 3: Administrator account ───────────────────────────────
// Collapsed to a single summary row (was one row per PASSWORD_RULES entry) -
// what's actually required is spelled out once as static helper text next
// to the field instead, so this only has to answer "am I done yet", not
// re-explain the rules on every keystroke.
var pwChecklist = document.getElementById('pwChecklist');
function renderPwChecklist() {
  pwChecklist.innerHTML = '<div class="pw-rule" id="pwRuleAll"><span class="pw-rule-dot">' + svgIcon('check', 13) + '</span><span>' + escapeHtmlLite(t('register.pw_meets_all', 'Meets all password requirements')) + '</span></div>';
}
function escapeHtmlLite(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
}
renderPwChecklist();

var adminNameInput = document.getElementById('adminName');
var adminEmailInput = document.getElementById('adminEmail');
var passwordInput = document.getElementById('password');
var confirmInput = document.getElementById('confirmPassword');

function checkConfirmMatch() {
  var mismatch = confirmInput.value.length > 0 && confirmInput.value !== passwordInput.value;
  document.getElementById('confirmErr').classList.toggle('show', mismatch);
}
function validateStep3() {
  var ok =
    adminNameInput.value.trim().length > 0 &&
    EMAIL_RE.test(adminEmailInput.value.trim()) &&
    passwordStrong(passwordInput.value) &&
    passwordInput.value === confirmInput.value;
  document.getElementById('step3NextBtn').disabled = !ok;
  return ok;
}
adminNameInput.addEventListener('input', validateStep3);
adminEmailInput.addEventListener('input', function () {
  var v = adminEmailInput.value.trim();
  document.getElementById('adminEmailErr').classList.toggle('show', v.length > 0 && !EMAIL_RE.test(v));
  validateStep3();
});
passwordInput.addEventListener('input', function () {
  var pw = passwordInput.value;
  pwChecklist.classList.toggle('show', pw.length > 0);
  document.getElementById('pwRuleAll').classList.toggle('met', passwordStrong(pw));
  checkConfirmMatch();
  validateStep3();
});
confirmInput.addEventListener('input', function () { checkConfirmMatch(); validateStep3(); });

function togglePwVisibility() {
  var secure = passwordInput.type === 'password';
  passwordInput.type = secure ? 'text' : 'password';
  var icon = document.getElementById('pwEyeIcon');
  icon.innerHTML = secure
    ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#8E8E93" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><line x1="4" y1="20" x2="20" y2="4" stroke="#8E8E93" stroke-width="1.7" stroke-linecap="round"/>'
    : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#8E8E93" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="#8E8E93" stroke-width="1.7"/>';
}
document.getElementById('pwEyeBtn').addEventListener('click', togglePwVisibility);
document.getElementById('step3NextBtn').addEventListener('click', function () { if (validateStep3()) switchPanel(4); });

// ── Step 4: Photo upload + client-side downscale (mirrors the app's
//    ~200KB on-device compression before upload, done here with
//    a canvas since a browser can't call the native resizer) + submit. ──
function compressImage(file, maxDim, maxBytes) {
  maxDim = maxDim || 1600;
  maxBytes = maxBytes || 200 * 1024;
  return new Promise(function (resolve, reject) {
    var img = new Image();
    var url = URL.createObjectURL(file);
    img.onload = function () {
      URL.revokeObjectURL(url);
      var scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      var w = Math.round(img.width * scale);
      var h = Math.round(img.height * scale);
      var canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);

      var qualities = [0.85, 0.7, 0.55, 0.4];
      function tryQuality(i) {
        canvas.toBlob(function (blob) {
          if (!blob) { resolve(file); return; } // fall back to the original file
          if (blob.size <= maxBytes || i === qualities.length - 1) resolve(blob);
          else tryQuality(i + 1);
        }, 'image/jpeg', qualities[i]);
      }
      tryQuality(0);
    };
    img.onerror = function () { URL.revokeObjectURL(url); resolve(file); }; // best-effort - upload original rather than block the user
    img.src = url;
  });
}

function validateStep4() {
  document.getElementById('submitBtn').disabled = !(state.idFile && state.selfieFile);
}

function wireUpload(inputId, previewId, stateKey) {
  var input = document.getElementById(inputId);
  var preview = document.getElementById(previewId);
  var card = input.closest('.upload-card');
  input.addEventListener('change', function () {
    var file = input.files && input.files[0];
    if (!file) return;
    preview.src = URL.createObjectURL(file);
    card.classList.add('has-file');
    compressImage(file).then(function (resized) {
      state[stateKey] = resized;
      validateStep4();
    });
  });
}
wireUpload('idDocument', 'idPreview', 'idFile');
wireUpload('selfie', 'selfiePreview', 'selfieFile');

var submitBtn = document.getElementById('submitBtn');
var formError = document.getElementById('formError');

submitBtn.addEventListener('click', function () {
  if (submitBtn.disabled || submitBtn.classList.contains('loading')) return;

  formError.classList.remove('show');
  submitBtn.classList.add('loading');
  submitBtn.disabled = true;

  var fd = new FormData();
  fd.append('school_name', schoolNameInput.value.trim());
  fd.append('institution_type', state.institutionType);
  var address = document.getElementById('schoolAddress').value.trim();
  if (address) fd.append('school_address', address);
  var schoolEmail = document.getElementById('schoolEmail').value.trim();
  if (schoolEmail) fd.append('school_email', schoolEmail);
  var schoolPhone = document.getElementById('schoolPhone').value.trim();
  if (schoolPhone) fd.append('school_phone', schoolPhone);
  fd.append('admin_name', adminNameInput.value.trim());
  fd.append('admin_email', adminEmailInput.value.trim());
  var adminPhone = document.getElementById('adminPhone').value.trim();
  if (adminPhone) fd.append('admin_phone', adminPhone);
  fd.append('password', passwordInput.value);
  fd.append('id_document', state.idFile, 'id_document.jpg');
  fd.append('selfie', state.selfieFile, 'selfie.jpg');

  var controller = new AbortController();
  var timeoutId = setTimeout(function () { controller.abort(); }, 45000);

  fetch(SUBMIT_ENDPOINT, { method: 'POST', body: fd, signal: controller.signal })
    .then(function (res) {
      clearTimeout(timeoutId);
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) throw new Error(data && data.message ? data.message : t('register.request_failed', 'Request failed ({status})').replace('{status}', res.status));
        return data;
      });
    })
    .then(function () {
      switchPanel(5);
    })
    .catch(function (err) {
      clearTimeout(timeoutId);
      var msg = err && err.name === 'AbortError'
        ? t('register.request_timeout', 'Request timed out. Check your connection and try again.')
        : (err && err.message ? err.message : t('register.could_not_reach_server', 'Could not reach the server. Check your connection and try again.'));
      formError.textContent = msg;
      formError.classList.add('show');
    })
    .finally(function () {
      submitBtn.classList.remove('loading');
      submitBtn.disabled = !(state.idFile && state.selfieFile);
    });
});

updateChrome();
