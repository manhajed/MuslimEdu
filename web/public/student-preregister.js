// Student Pre-Registration - what a school's walk-in admission QR
// (admission-management.php, admin-facing) opens when scanned. Public/
// unauthenticated, standalone page (own API_BASE_URL, no dashboard.js -
// same pattern as login.js/register.js/alumni-registration.js). The URL
// carries just ?school_id=<id>; everything else (which fields to ask,
// which documents to require) is fetched from that school's own
// admin-configured form (public_preregistration_form_config).
//
// Submission lands in a review queue (preregistrations.php) for the
// registrar to look over and carry into the real admission.php wizard -
// this page never creates a student account itself.

const API_BASE_URL = 'https://manhaje.com/apps/api';
const PREREG_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LOCALE_KEY = 'muslimedu_locale';
const LOCALE_CACHE_KEY = 'muslimedu_locale_bundle';
const AR_FALLBACK = {
  'student_preregister.topbar_title': 'التسجيل المسبق للطالب',
  'student_preregister.topbar_subtitle': 'املأ هذا - لن تحتاج المدرسة لكتابته لك.',
  'student_preregister.loading': 'جارٍ تحميل النموذج…',
  'student_preregister.load_error': 'تعذر فتح هذا الرابط.',
  'student_preregister.try_again': 'إعادة المحاولة',
  'student_preregister.missing_school': 'رابط غير صالح - لا توجد مدرسة محددة.',
  'student_preregister.school_not_found': 'تعذر العثور على هذه المدرسة.',
  'student_preregister.submit_btn': 'إرسال',
  'student_preregister.registering_with': 'التسجيل في',
  'student_preregister.login_section_title': 'إنشاء حساب الدخول',
  'student_preregister.password_label': 'كلمة المرور',
  'student_preregister.password_confirm_label': 'تأكيد كلمة المرور',
  'student_preregister.password_hint': 'استخدم 6 أحرف على الأقل. ستستخدم هذه لتسجيل الدخول بعد موافقة المدرسة على تسجيلك.',
  'student_preregister.email_invalid': 'يرجى إدخال عنوان بريد إلكتروني صحيح.',
  'student_preregister.password_too_short': 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.',
  'student_preregister.password_mismatch': 'كلمتا المرور غير متطابقتين.',
  'student_preregister.selfie_section_title': 'التحقق بصورة شخصية',
  'student_preregister.selfie_hint': 'التقط صورة شخصية واضحة حتى تتأكد المدرسة من أن شخصًا حقيقيًا أرسل هذا الطلب.',
  'student_preregister.selfie_change_hint': 'اضغط لتغيير الصورة.',
  'student_preregister.selfie_required_error': 'يرجى التقاط صورة شخصية.',
  'student_preregister.selfie_process_error': 'تعذرت معالجة هذه الصورة. حاول مرة أخرى.',
  'student_preregister.selfie_type_error': 'يُسمح فقط بصور JPG أو JPEG أو PNG.',
  'student_preregister.install_required_title': 'ثبّت تطبيق مسلم إيديو للمتابعة.',
  'student_preregister.install_required_hint': 'هذا النموذج يفتح فقط داخل التطبيق المثبت - يساعد المدرسة على التأكد من أن شخصًا حقيقيًا يسجل.',
  'student_preregister.install_btn': 'تثبيت التطبيق',
  'student_preregister.install_refresh_btn': 'قمت بالتثبيت - متابعة',
  'student_preregister.install_manual_ios_hint': 'اضغط على زر المشاركة، ثم اختر "إضافة إلى الشاشة الرئيسية".',
  'student_preregister.install_manual_hint': 'افتح قائمة المتصفح واختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية".',
  'student_preregister.install_open_from_home_hint': 'يرجى فتح مسلم إيديو من أيقونة الشاشة الرئيسية، ثم المحاولة مرة أخرى.',
  'student_preregister.name_label': 'الاسم الكامل',
  'student_preregister.name_ar_label': 'الاسم بالعربية',
  'student_preregister.phone_label': 'الهاتف',
  'student_preregister.address_label': 'العنوان',
  'student_preregister.emergency_contact_name_label': 'اسم جهة اتصال الطوارئ',
  'student_preregister.emergency_contact_phone_label': 'هاتف جهة اتصال الطوارئ',
  'student_preregister.gender_label': 'الجنس',
  'student_preregister.gender_male': 'ذكر',
  'student_preregister.gender_female': 'أنثى',
  'student_preregister.gender_select': 'اختر...',
  'student_preregister.birthday_label': 'تاريخ الميلاد',
  'student_preregister.optional_suffix': '(اختياري)',
  'student_preregister.choose_file': 'اختيار ملف',
  'student_preregister.change_file': 'تغيير',
  'student_preregister.no_file_chosen': 'لم يتم اختيار ملف',
  'student_preregister.required_fields_error': 'يرجى تعبئة جميع الحقول المطلوبة.',
  'student_preregister.submit_failed': 'تعذر الإرسال. حاول مرة أخرى.',
  'student_preregister.success_title': 'تم الإرسال!',
  'student_preregister.success_body': 'تم إرسال معلوماتك إلى {school}. يرجى التوجه إلى موظف التسجيل لإكمال القيد.',
  'student_preregister.login_btn': 'تسجيل الدخول',
};
let currentLocale = 'en';
let currentTranslations = {};

function t(key, fallback) {
  return (currentTranslations && currentTranslations[key]) || fallback || key;
}
function applyDomTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.getAttribute('data-i18n'), el.textContent); });
  const langChipText = document.getElementById('langChipText');
  if (langChipText) langChipText.textContent = currentLocale === 'ar' ? 'AR' : 'EN';
  document.documentElement.setAttribute('dir', currentLocale === 'ar' ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', currentLocale);
}
function setLocale(locale) {
  currentLocale = locale;
  currentTranslations = locale === 'ar' ? AR_FALLBACK : {};
  try { localStorage.setItem(LOCALE_KEY, locale); } catch (e) {}
  applyDomTranslations();
  if (formConfig) renderFields();
}
function toggleLocale() { setLocale(currentLocale === 'ar' ? 'en' : 'ar'); }
document.getElementById('langChip')?.addEventListener('click', toggleLocale);
(function initLocale() {
  let saved = null;
  try { saved = localStorage.getItem(LOCALE_KEY); } catch (e) {}
  currentLocale = saved === 'ar' ? 'ar' : 'en';
  currentTranslations = currentLocale === 'ar' ? AR_FALLBACK : {};
  applyDomTranslations();
})();

function qsParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function runEntryGate() {
  showState('loadingState');
  loadForm();
}
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.remove('show'), 3200);
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
    if (err && err.name === 'AbortError') throw new Error('Request timed out. Check your connection and try again.');
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const firstFieldError = data && data.errors ? Object.values(data.errors)[0] : null;
    throw new Error((firstFieldError && firstFieldError[0]) || (data && data.message) || 'Request failed (' + response.status + ').');
  }
  return data;
}
async function postMultipart(path, formData) {
  const response = await fetch(API_BASE_URL + path, { method: 'POST', body: formData });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const firstFieldError = data && data.errors ? Object.values(data.errors)[0] : null;
    throw new Error((firstFieldError && firstFieldError[0]) || (data && data.message) || 'Request failed (' + response.status + ').');
  }
  return data;
}

// STANDARD_FIELD_META mirrors StudentPreregistrationController::STANDARD_FIELDS
// on the backend - icon/label/input-type per key, so rendering is just a
// loop over whatever the school's config enabled.
const STANDARD_FIELD_META = {
  name: { labelKey: 'student_preregister.name_label', fallback: 'Full Name', type: 'text' },
  name_ar: { labelKey: 'student_preregister.name_ar_label', fallback: 'Arabic Name', type: 'text', dir: 'rtl' },
  phone: { labelKey: 'student_preregister.phone_label', fallback: 'Phone', type: 'tel' },
  address: { labelKey: 'student_preregister.address_label', fallback: 'Address', type: 'text' },
  emergency_contact_name: { labelKey: 'student_preregister.emergency_contact_name_label', fallback: 'Emergency Contact Name', type: 'text' },
  emergency_contact_phone: { labelKey: 'student_preregister.emergency_contact_phone_label', fallback: 'Emergency Contact Phone', type: 'tel' },
  gender: { labelKey: 'student_preregister.gender_label', fallback: 'Gender', type: 'select' },
  birthday: { labelKey: 'student_preregister.birthday_label', fallback: 'Birthday', type: 'date' },
};

let schoolId = null;
let formConfig = null; // { school_name, fields_config, custom_questions, required_documents }
let fieldValues = {};
let documentFiles = {}; // key -> File
let submitting = false;

// Selfie Verification: a live camera photo, required alongside email/
// password - mainly an anti-bot measure (a script posting this form now
// also needs a plausible image, not just text), and it doubles as the
// registrar's at-a-glance check in preregistrations.php before admitting
// anyone. Reused directly as the student's profile photo at admission
// time (see admission.js), so it's compressed to the same ~200KB budget
// admission.js's own photo step uses - same admPrepareProfilePhoto logic,
// copied here since this is a separate, standalone page with no shared
// script to import it from.
const PREREG_MAX_SELFIE_BYTES = 200 * 1024;
const PREREG_ALLOWED_SELFIE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
let selfieFile = null;
let selfiePreviewUrl = null;

function pregLoadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that image.')); };
    img.src = url;
  });
}
function pregCanvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not encode the image.'))), type, quality);
  });
}
function pregPrepareSelfie(file) {
  const typeOk = PREREG_ALLOWED_SELFIE_TYPES.indexOf((file.type || '').toLowerCase()) !== -1;
  if (!typeOk) return Promise.reject(new Error(t('student_preregister.selfie_type_error', 'Only JPG, JPEG or PNG images are allowed.')));
  if (file.size <= PREREG_MAX_SELFIE_BYTES) return Promise.resolve(file);

  return pregLoadImage(file).then(img => {
    const maxEdge = 1024;
    let { width, height } = img;
    if (width > maxEdge || height > maxEdge) {
      const scale = maxEdge / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const qualities = [0.82, 0.7, 0.6, 0.5, 0.4, 0.3];
    let i = 0;
    function attempt() {
      return pregCanvasToBlob(canvas, 'image/jpeg', qualities[i]).then(blob => {
        if (blob.size <= PREREG_MAX_SELFIE_BYTES || i === qualities.length - 1) {
          return new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
        }
        i++;
        return attempt();
      });
    }
    return attempt();
  });
}

function renderSelfiePreview() {
  const circle = document.getElementById('selfieCircle');
  const hint = document.getElementById('selfieHint');
  if (!circle) return;
  if (selfiePreviewUrl) {
    circle.classList.add('filled');
    circle.innerHTML = '<img src="' + escapeHtml(selfiePreviewUrl) + '" alt="" />';
    if (hint) hint.textContent = t('student_preregister.selfie_change_hint', 'Tap to change the photo.');
  } else {
    circle.classList.remove('filled');
    circle.innerHTML = '<svg width="34" height="34" viewBox="0 0 24 24" fill="none"><path d="M4 8a2 2 0 012-2h1.2a1 1 0 00.86-.49l.8-1.34A2 2 0 0110.5 3h3a2 2 0 011.64 1.17l.8 1.34a1 1 0 00.86.49H18a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" stroke="#0F7A3D" stroke-width="1.7" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.4" stroke="#0F7A3D" stroke-width="1.7"/></svg>';
    if (hint) hint.textContent = t('student_preregister.selfie_hint', 'Take a clear selfie so the school can confirm a real person submitted this.');
  }
}
document.getElementById('selfieBtn')?.addEventListener('click', () => document.getElementById('selfieInput')?.click());
document.getElementById('selfieInput')?.addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const selfieError = document.getElementById('selfieError');
  if (selfieError) selfieError.classList.remove('show');
  pregPrepareSelfie(file).then(prepared => {
    if (selfiePreviewUrl) URL.revokeObjectURL(selfiePreviewUrl);
    selfieFile = prepared;
    selfiePreviewUrl = URL.createObjectURL(prepared);
    renderSelfiePreview();
  }).catch(err => {
    if (selfieError) {
      selfieError.textContent = (err && err.message) || t('student_preregister.selfie_process_error', 'Could not process that image. Please try again.');
      selfieError.classList.add('show');
    }
  });
});

function showState(name) {
  ['loadingState', 'errorState', 'formWrap', 'successWrap'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = id === name ? '' : 'none';
  });
}

function loadForm() {
  schoolId = qsParam('school_id');
  if (!schoolId) {
    showState('errorState');
    const errText = document.getElementById('errorStateText');
    if (errText) errText.textContent = t('student_preregister.missing_school', 'Invalid link - no school specified.');
    const retry = document.getElementById('retryBtn');
    if (retry) retry.style.display = 'none';
    return;
  }
  showState('loadingState');
  postJson('/public_preregistration_form_config', { school_id: schoolId })
    .then(cfg => {
      formConfig = cfg;
      const nameEl = document.getElementById('schoolCardName');
      if (nameEl) nameEl.textContent = cfg.school_name;
      const logoEl = document.getElementById('schoolCardLogo');
      if (logoEl) {
        logoEl.innerHTML = cfg.school_logo
          ? '<img src="' + escapeHtml(cfg.school_logo) + '" alt="" />'
          : escapeHtml((cfg.school_name || '?').trim().charAt(0).toUpperCase());
      }
      renderFields();
      showState('formWrap');
    })
    .catch(err => {
      showState('errorState');
      const errText = document.getElementById('errorStateText');
      if (errText) errText.textContent = err && err.message ? err.message : t('student_preregister.school_not_found', 'That school could not be found.');
      const retry = document.getElementById('retryBtn');
      if (retry) retry.style.display = '';
    });
}
document.getElementById('retryBtn')?.addEventListener('click', loadForm);

function inputRowHtml(key, meta, required) {
  const value = escapeHtml(fieldValues[key] || '');
  const optSuffix = required ? '' : ' <span class="opt">' + escapeHtml(t('student_preregister.optional_suffix', '(optional)')) + '</span>';
  const label = '<div class="field-label">' + escapeHtml(t(meta.labelKey, meta.fallback)) + optSuffix + '</div>';

  if (meta.type === 'select') {
    // Only 'gender' is a select today - kept generic in case a future
    // standard field needs one too.
    return label +
      '<div class="input-row"><select data-field="' + key + '">' +
        '<option value="">' + escapeHtml(t('student_preregister.gender_select', 'Select…')) + '</option>' +
        '<option value="male"' + (fieldValues[key] === 'male' ? ' selected' : '') + '>' + escapeHtml(t('student_preregister.gender_male', 'Male')) + '</option>' +
        '<option value="female"' + (fieldValues[key] === 'female' ? ' selected' : '') + '>' + escapeHtml(t('student_preregister.gender_female', 'Female')) + '</option>' +
      '</select></div>';
  }
  return label +
    '<div class="input-row"><input type="' + (meta.type || 'text') + '" data-field="' + key + '" value="' + value + '"' +
      (meta.type === 'date' ? ' max="' + new Date().toISOString().split('T')[0] + '"' : '') +
      (meta.dir ? ' dir="' + meta.dir + '"' : '') + ' /></div>';
}

function customQuestionHtml(q) {
  const value = escapeHtml(fieldValues[q.key] || '');
  const optSuffix = q.required ? '' : ' <span class="opt">' + escapeHtml(t('student_preregister.optional_suffix', '(optional)')) + '</span>';
  const label = '<div class="field-label">' + escapeHtml(q.label) + optSuffix + '</div>';
  if (q.type === 'textarea') {
    return label + '<div class="input-row multiline"><textarea data-field="' + q.key + '">' + value + '</textarea></div>';
  }
  return label + '<div class="input-row"><input type="text" data-field="' + q.key + '" value="' + value + '" /></div>';
}

function documentRowHtml(doc) {
  const file = documentFiles[doc.key];
  const optSuffix = doc.required ? '' : ' <span class="opt">' + escapeHtml(t('student_preregister.optional_suffix', '(optional)')) + '</span>';
  return '<div class="field-label">' + escapeHtml(doc.label) + optSuffix + '</div>' +
    '<div class="doc-row' + (file ? ' attached' : '') + '">' +
      '<span class="doc-row-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="' + (file ? '#0F7A3D' : '#8E8E93') + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg></span>' +
      '<span class="doc-row-text"><div class="doc-row-name">' + escapeHtml(file ? file.name : t('student_preregister.no_file_chosen', 'No file chosen')) + '</div></span>' +
      '<button type="button" class="doc-choose-btn" data-doc="' + doc.key + '">' + escapeHtml(t(file ? 'student_preregister.change_file' : 'student_preregister.choose_file', file ? 'Change' : 'Choose File')) + '</button>' +
      '<input type="file" data-doc-input="' + doc.key + '" accept="image/*,application/pdf" style="display:none;" />' +
    '</div>';
}

function renderFields() {
  const parts = [];
  Object.keys(STANDARD_FIELD_META).forEach(key => {
    const rule = formConfig.fields_config[key];
    if (!rule || !rule.enabled) return;
    parts.push(inputRowHtml(key, STANDARD_FIELD_META[key], !!rule.required));
  });
  (formConfig.custom_questions || []).forEach(q => parts.push(customQuestionHtml(q)));
  const docsWrap = document.getElementById('fieldsCard');
  if (!docsWrap) return;
  docsWrap.innerHTML = parts.join('');

  document.querySelectorAll('[data-field]').forEach(el => {
    el.addEventListener('input', () => { fieldValues[el.dataset.field] = el.value; });
    el.addEventListener('change', () => { fieldValues[el.dataset.field] = el.value; });
  });

  if ((formConfig.required_documents || []).length) {
    const docsHtml = formConfig.required_documents.map(documentRowHtml).join('');
    docsWrap.insertAdjacentHTML('beforeend', docsHtml);
    document.querySelectorAll('[data-doc]').forEach(btn => {
      btn.addEventListener('click', () => document.querySelector('[data-doc-input="' + btn.dataset.doc + '"]').click());
    });
    document.querySelectorAll('[data-doc-input]').forEach(input => {
      input.addEventListener('change', () => {
        const key = input.dataset.docInput;
        if (input.files && input.files[0]) documentFiles[key] = input.files[0];
        renderFields();
      });
    });
  }
}

// Email + password are the student's own login credentials - always
// collected, never part of the admin-configurable fields loop (a school
// can't be allowed to disable the one thing a later login depends on).
// Validated here as a convenience; the backend re-checks all of this
// itself and is the actual source of truth.
function validateCredentials() {
  const emailEl = document.getElementById('credEmail');
  const pwEl = document.getElementById('credPassword');
  const pwConfirmEl = document.getElementById('credPasswordConfirm');
  const email = emailEl ? emailEl.value.trim() : '';
  const password = pwEl ? pwEl.value : '';
  const confirm = pwConfirmEl ? pwConfirmEl.value : '';
  if (!email || !PREREG_EMAIL_RE.test(email)) {
    return { error: t('student_preregister.email_invalid', 'Please enter a valid email address.') };
  }
  if (!password || password.length < 6) {
    return { error: t('student_preregister.password_too_short', 'Password must be at least 6 characters.') };
  }
  if (password !== confirm) {
    return { error: t('student_preregister.password_mismatch', 'Passwords do not match.') };
  }
  return { email, password };
}

function validate() {
  for (const key of Object.keys(STANDARD_FIELD_META)) {
    const rule = formConfig.fields_config[key];
    if (rule && rule.enabled && rule.required && !(fieldValues[key] || '').trim()) return false;
  }
  for (const q of (formConfig.custom_questions || [])) {
    if (q.required && !(fieldValues[q.key] || '').trim()) return false;
  }
  for (const doc of (formConfig.required_documents || [])) {
    if (doc.required && !documentFiles[doc.key]) return false;
  }
  return true;
}

function handleSubmit() {
  if (submitting) return;
  const formError = document.getElementById('formError');
  const credError = document.getElementById('credError');
  const selfieError = document.getElementById('selfieError');
  if (formError) formError.classList.remove('show');
  if (credError) credError.classList.remove('show');
  if (selfieError) selfieError.classList.remove('show');

  const cred = validateCredentials();
  if (cred.error) {
    if (credError) { credError.textContent = cred.error; credError.classList.add('show'); }
    return;
  }
  if (!selfieFile) {
    if (selfieError) {
      selfieError.textContent = t('student_preregister.selfie_required_error', 'Please take a selfie.');
      selfieError.classList.add('show');
    }
    return;
  }
  if (!validate()) {
    if (formError) {
      formError.textContent = t('student_preregister.required_fields_error', 'Please fill in every required field.');
      formError.classList.add('show');
    }
    return;
  }
  submitting = true;
  const btn = document.getElementById('submitBtn');
  if (btn) { btn.disabled = true; btn.classList.add('loading'); }

  const form = new FormData();
  form.append('school_id', schoolId);
  form.append('email', cred.email);
  form.append('password', cred.password);
  form.append('password_confirmation', cred.password);
  form.append('selfie', selfieFile, selfieFile.name || 'selfie.jpg');
  form.append('data', JSON.stringify(fieldValues));
  Object.keys(documentFiles).forEach(key => form.append('documents_' + key, documentFiles[key]));

  postMultipart('/public_student_preregistration_submit', form)
    .then(res => {
      const successBody = document.getElementById('successBody');
      if (successBody) {
        successBody.textContent =
          (res && res.message) || t('student_preregister.success_body', 'Your information has been sent to {school}. Please see the registrar to finish enrolling.').replace('{school}', formConfig.school_name);
      }
      showState('successWrap');
    })
    .catch(err => {
      showToast((err && err.message) || t('student_preregister.submit_failed', 'Could not submit. Please try again.'));
    })
    .finally(() => {
      submitting = false;
      if (btn) { btn.disabled = false; btn.classList.remove('loading'); }
    });
}
document.getElementById('submitBtn')?.addEventListener('click', handleSubmit);

runEntryGate();
