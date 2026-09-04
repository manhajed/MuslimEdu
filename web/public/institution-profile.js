// Institution Profile - web port of InstitutionProfileScreen.tsx. A
// numbered step wizard (Branding -> Basic Info -> Localization -> Schedule)
// editing an EXISTING school profile. Institution Type and Academic Year
// Structure are one-time onboarding choices and live only in the setup
// wizard now - not here. Unlike the onboarding wizard, nothing saves per
// step here; the whole accumulated form
// only hits the network once, on the final step's "Save Changes"
// (saveInstitutionProfile / admin_school_profile_update, same as the RN
// screen). Entry points: the pencil icon on the admin dashboard's
// Academic Analytics / orphan identity cards.

const DAY_CODES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_FALLBACK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function dayLabel(i) { return t('institution_profile.day_' + DAY_CODES[i], DAY_FALLBACK[i]); }
// Common IANA zones for schools using this app - Asia/Manila first and
// pre-selected by default, since most schools on this platform are in the
// Philippines. Free-text was error-prone (typos silently break any
// timezone-aware feature), so this is now a fixed picker instead.
const COMMON_TIMEZONES = [
  'Asia/Manila', 'Asia/Karachi', 'Asia/Dhaka', 'Asia/Kolkata', 'Asia/Jakarta',
  'Asia/Kuala_Lumpur', 'Asia/Singapore', 'Asia/Dubai', 'Asia/Riyadh', 'Asia/Istanbul',
  'Africa/Cairo', 'Africa/Lagos', 'Europe/London', 'America/New_York', 'UTC',
];
function timezoneOptionsHtml(selected) {
  const zones = COMMON_TIMEZONES.includes(selected) || !selected ? COMMON_TIMEZONES : [selected, ...COMMON_TIMEZONES];
  return zones.map(z => '<option value="' + escapeHtml(z) + '"' + (z === (selected || 'Asia/Manila') ? ' selected' : '') + '>' + escapeHtml(z) + '</option>').join('');
}
const INSTITUTION_TYPE_FALLBACK = { mahad: 'Mahad', madrasa: 'Madrasa', markaz: 'Markaz', regular_school: 'Regular School', orphanage: 'Orphan School', online_class: 'Online Class' };
function institutionTypeLabel(code) { return t('institution_profile.type_' + code, INSTITUTION_TYPE_FALLBACK[code] || code); }
const CALENDAR_TYPE_FALLBACK = { gregorian: 'Gregorian', hijri: 'Hijri', dual: 'Dual (Hijri + Gregorian)' };
function calendarTypeLabel(code) { return t('institution_profile.calendar_' + code, CALENDAR_TYPE_FALLBACK[code] || code); }
const YEAR_STRUCTURE_FALLBACK = { semester: 'Semester', trimester: 'Trimester', quarter: 'Quarter', continuous: 'Continuous', custom: 'Custom' };
function yearStructureLabel(code) { return t('institution_profile.structure_' + code, YEAR_STRUCTURE_FALLBACK[code] || code); }
const PROGRAM_DURATION_FALLBACK = { one_year: 'One Year', three_year: 'Three Years' };
function programDurationLabel(code) { return t('institution_profile.duration_' + code, PROGRAM_DURATION_FALLBACK[code] || code); }

const STEP_KEYS = ['branding', 'basic', 'localization', 'schedule'];
function stepLabel(key) {
  const fallback = { branding: 'Branding', basic: 'Basic Info', localization: 'Localization', schedule: 'Schedule' }[key];
  return t('institution_profile.step_' + key, fallback);
}

const MAX_PHOTO_BYTES = 200 * 1024; // 200KB, matches the RN app's own compression target

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML = renderUtilHeader(t('institution_profile.title', 'Institution Profile'), null, 'admin-dashboard.php');
}
renderHeaderText();
onLocaleChange(() => { renderHeaderText(); if (status) renderStep(); });

// ── State ──
let status = null;
let step = 0;
let submitting = false;
let stepError = null;
let loadError = null;
let photoError = null;
let pickingField = null; // 'logo' | 'seal' | null

const form = {
  name: '', name_ar: '', sec_reg: '', email: '', phone: '', address: '', address_ar: '', sec_reg_ar: '', description: '',
  institution_type: null, timezone: '', default_language: '', secondary_language: '',
  calendar_type: null, working_days: [], school_hours_start: '', school_hours_end: '',
  academic_year_structure: null, program_duration: null,
};
let existingLogoUrl = null;
let existingSealUrl = null;
let newLogoFile = null; // File (already compressed) or null
let newSealFile = null;
let newLogoPreviewUrl = null;
let newSealPreviewUrl = null;

// Institution type and academic year structure are one-time choices made
// at registration/onboarding (the setup wizard) - changing type here would
// be re-founding the school as something else, not editing a profile
// field, so both steps live only in the wizard now. This screen still
// loads and re-saves their current values unchanged (see onSave) so
// nothing already set is lost.
function visibleStepKeys() {
  return STEP_KEYS;
}
function currentStepKey() {
  return visibleStepKeys()[step];
}
function validateHours(v) {
  return v === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}

// ── Image compression (canvas-based, no external library - CSP is
// script-src 'self' so a CDN like the RN app's image-manipulation lib
// isn't an option). Resizes to a max dimension, then compresses down until
// under MAX_PHOTO_BYTES, same target the RN app's prepareProfilePhoto()
// compresses to.
//
// PNG sources stay PNG instead of always going out as JPEG. A logo or seal
// is very often a transparent PNG, and JPEG has no alpha channel at all -
// canvas.toBlob() with 'image/jpeg' silently flattens every transparent
// pixel onto an opaque BLACK background before encoding, which is why a
// transparent logo used to come back with a black box behind it after
// upload. PNG has no quality knob the way JPEG does, so instead of
// stepping quality down to hit the size target, PNGs step the max
// dimension down instead - fewer pixels is the only lever PNG has. ──
function compressImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpeg|jpg)$/.test(file.type)) {
      reject(new Error(t('institution_profile.err_image_type', 'Please choose a JPG, JPEG, or PNG image.')));
      return;
    }
    const isPng = file.type === 'image/png';
    const outputType = isPng ? 'image/png' : 'image/jpeg';
    const outputExt = isPng ? '.png' : '.jpg';

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
      const failProcess = () => reject(new Error(t('institution_profile.err_image_process', 'Could not process that image. Please try a different one.')));

      if (isPng) {
        const tryDim = (maxDim) => {
          drawAt(maxDim).toBlob(blob => {
            if (!blob) { failProcess(); return; }
            if (blob.size <= MAX_PHOTO_BYTES || maxDim <= 200) finish(blob);
            else tryDim(Math.round(maxDim * 0.75));
          }, outputType);
        };
        tryDim(800);
      } else {
        const canvas = drawAt(800);
        const tryQuality = (q) => {
          canvas.toBlob(blob => {
            if (!blob) { failProcess(); return; }
            if (blob.size <= MAX_PHOTO_BYTES || q <= 0.4) finish(blob);
            else tryQuality(q - 0.15);
          }, outputType, q);
        };
        tryQuality(0.85);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error(t('institution_profile.err_image_process', 'Could not process that image. Please try a different one.'))); };
    img.src = objectUrl;
  });
}

function pickPhoto(field) {
  photoError = null;
  document.getElementById(field === 'logo' ? 'logoFileInput' : 'sealFileInput').click();
}

function onPhotoChosen(field, file) {
  if (!file) return;
  pickingField = field;
  renderStep();
  compressImageFile(file).then(compressed => {
    const previewUrl = URL.createObjectURL(compressed);
    if (field === 'logo') {
      if (newLogoPreviewUrl) URL.revokeObjectURL(newLogoPreviewUrl);
      newLogoFile = compressed;
      newLogoPreviewUrl = previewUrl;
    } else {
      if (newSealPreviewUrl) URL.revokeObjectURL(newSealPreviewUrl);
      newSealFile = compressed;
      newSealPreviewUrl = previewUrl;
    }
  }).catch(err => {
    photoError = err.message || t('institution_profile.err_image_process', 'Could not process that image. Please try a different one.');
  }).finally(() => {
    pickingField = null;
    renderStep();
  });
}

document.getElementById('logoFileInput').addEventListener('change', (e) => onPhotoChosen('logo', e.target.files[0]));
document.getElementById('sealFileInput').addEventListener('change', (e) => onPhotoChosen('seal', e.target.files[0]));

// ── Stepper header ──
function renderStepper() {
  const keys = visibleStepKeys();
  document.getElementById('ipStepperWrap').innerHTML =
    '<div class="ip-stepper">' +
      keys.map((k, i) => '<div class="ip-step-dot ' + (i < step ? 'done' : i === step ? 'active' : '') + '"></div>').join('') +
    '</div>';
  document.getElementById('ipStepLabelWrap').innerHTML =
    '<div class="ip-step-label">' + escapeHtml(t('institution_profile.step_label_template', 'Step {n} of {total}:').replace('{n}', step + 1).replace('{total}', keys.length)) + ' <strong>' + escapeHtml(stepLabel(keys[step])) + '</strong></div>';
}

// ── Chip helper ──
function renderChip(label, selected) {
  return '<button type="button" class="chip' + (selected ? ' selected' : '') + '" data-chip-label="' + escapeHtml(label) + '">' + escapeHtml(label) + '</button>';
}

// ── Step content ──
function renderStep() {
  renderStepper();
  const content = document.getElementById('ipContent');
  const key = currentStepKey();

  if (key === 'branding') {
    const logoSrc = newLogoPreviewUrl || existingLogoUrl;
    const sealSrc = newSealPreviewUrl || existingSealUrl;
    content.innerHTML =
      '<div class="ip-hero">' +
        '<div class="ip-avatar-wrap">' +
          '<div class="ip-avatar-circle" id="ipLogoTap">' +
            (logoSrc ? '<img src="' + escapeHtml(logoSrc) + '" alt="" />' : icon('school', { size: 30, color: 'var(--ink)' })) +
          '</div>' +
          '<div class="ip-avatar-edit-badge">' + (pickingField === 'logo' ? '<span class="util-spinner" style="width:14px;height:14px;"></span>' : icon('pencil', { size: 13, color: '#fff' })) + '</div>' +
        '</div>' +
        '<div class="ip-hero-name">' + escapeHtml(form.name || t('institution_profile.name_placeholder', 'Institution Name')) + '</div>' +
        '<div class="ip-hero-hint">' + escapeHtml(t('institution_profile.tap_logo_hint', 'Tap the logo to change it')) + '</div>' +
      '</div>' +
      '<div class="util-section-title">' + escapeHtml(t('institution_profile.branding_section', 'Branding')) + '</div>' +
      '<div class="util-card">' +
        '<div class="ip-seal-row" id="ipSealTap">' +
          '<div class="ip-seal-thumb">' +
            (sealSrc ? '<img src="' + escapeHtml(sealSrc) + '" alt="" />' : (pickingField === 'seal' ? '<span class="util-spinner dark"></span>' : '<span class="ip-seal-plus">+</span>')) +
          '</div>' +
          '<div style="flex:1;margin-left:14px;">' +
            '<div class="ip-seal-title">' + escapeHtml(t('institution_profile.official_seal', 'Official Seal')) + '</div>' +
            '<div class="ip-seal-subtitle">' + escapeHtml(sealSrc ? t('institution_profile.uploaded', 'Uploaded') : t('institution_profile.not_added_yet', 'Not added yet')) + '</div>' +
          '</div>' +
          '<div class="ip-seal-action">' + escapeHtml(sealSrc ? t('institution_profile.change', 'Change') : t('institution_profile.add', 'Add')) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="util-hint">' + escapeHtml(t('institution_profile.photo_hint', 'Max 200 KB - larger images are compressed automatically. JPG, JPEG, or PNG.')) + '</div>' +
      (photoError ? '<div class="ip-photo-error">' + escapeHtml(photoError) + '</div>' : '');
    document.getElementById('ipLogoTap').addEventListener('click', () => pickPhoto('logo'));
    document.getElementById('ipSealTap').addEventListener('click', () => pickPhoto('seal'));
  }

  else if (key === 'basic') {
    content.innerHTML =
      '<div class="ip-step-heading">' + escapeHtml(t('institution_profile.basic_heading', 'Basic Information')) + '</div>' +
      '<div class="util-card padded">' +
        '<label class="util-label" style="margin-top:0;">' + escapeHtml(t('institution_profile.name_label', 'Institution Name')) + '</label>' +
        '<input type="text" class="util-input" id="fName" placeholder="' + escapeHtml(t('institution_profile.name_field_placeholder', 'Institution name')) + '" value="' + escapeHtml(form.name) + '" />' +
        '<label class="util-label">' + escapeHtml(t('institution_profile.email_label', 'Email (optional)')) + '</label>' +
        '<input type="email" class="util-input" id="fEmail" placeholder="school@example.com" value="' + escapeHtml(form.email) + '" />' +
        '<label class="util-label">' + escapeHtml(t('institution_profile.phone_label', 'Phone (optional)')) + '</label>' +
        '<input type="tel" class="util-input" id="fPhone" placeholder="' + escapeHtml(t('institution_profile.phone_placeholder', 'Phone number')) + '" value="' + escapeHtml(form.phone) + '" />' +
        '<label class="util-label">' + escapeHtml(t('institution_profile.address_label', 'Address (optional)')) + '</label>' +
        '<textarea class="util-input" id="fAddress" placeholder="' + escapeHtml(t('institution_profile.address_placeholder', 'Address')) + '">' + escapeHtml(form.address) + '</textarea>' +
        '<label class="util-label">' + escapeHtml(t('institution_profile.sec_reg_label', 'SEC Registration No. (optional)')) + '</label>' +
        '<input type="text" class="util-input" id="fSecReg" placeholder="e.g. 038473838" value="' + escapeHtml(form.sec_reg) + '" />' +
        '<div class="util-hint">' + escapeHtml(t('institution_profile.sec_reg_hint', 'Shown on printed ID cards, under the school address.')) + '</div>' +
        '<label class="util-label">' + escapeHtml(t('institution_profile.description_label', 'Description (optional)')) + '</label>' +
        '<textarea class="util-input" id="fDescription" placeholder="' + escapeHtml(t('institution_profile.description_placeholder', 'Institution description')) + '">' + escapeHtml(form.description) + '</textarea>' +
      '</div>' +

      // Every field that feeds the right-hand (Arabic) column of the ID
      // card header, grouped in one place so it's clear what is being
      // typed and where it shows up. Each one left blank falls back to its
      // English counterpart on the card, so a half-filled section still
      // produces a balanced header rather than a blank right side.
      '<div class="ip-step-heading">' + escapeHtml(t('institution_profile.arabic_heading', 'Arabic — shown on ID cards')) + '</div>' +
      '<div class="util-card padded">' +
        '<div class="util-hint" style="margin-top:0;margin-bottom:4px;">' + escapeHtml(t('institution_profile.arabic_intro', 'This is the right-hand side of every printed ID card. Leave a field blank to reuse the English one.')) + '</div>' +
        '<label class="util-label">' + escapeHtml(t('institution_profile.name_ar_label', 'Arabic Name (optional)')) + '</label>' +
        '<input type="text" class="util-input" id="fNameAr" dir="rtl" placeholder="الاسم بالعربية" value="' + escapeHtml(form.name_ar) + '" />' +
        '<label class="util-label">' + escapeHtml(t('institution_profile.address_ar_label', 'Arabic Address (optional)')) + '</label>' +
        '<textarea class="util-input" id="fAddressAr" dir="rtl" placeholder="العنوان بالعربية">' + escapeHtml(form.address_ar) + '</textarea>' +
        '<label class="util-label">' + escapeHtml(t('institution_profile.sec_reg_ar_label', 'Arabic SEC Registration No. (optional)')) + '</label>' +
        '<input type="text" class="util-input" id="fSecRegAr" dir="rtl" placeholder="٠٣٨٤٧٣٨٣٨" value="' + escapeHtml(form.sec_reg_ar) + '" />' +
        '<div class="util-hint">' + escapeHtml(t('institution_profile.sec_reg_ar_hint', 'Use this if you print the number in Arabic-Indic digits. Blank reuses the number above.')) + '</div>' +
      '</div>';
    ['fName:name', 'fNameAr:name_ar', 'fSecReg:sec_reg', 'fEmail:email', 'fPhone:phone', 'fAddress:address', 'fAddressAr:address_ar', 'fSecRegAr:sec_reg_ar', 'fDescription:description'].forEach(pair => {
      const [id, key2] = pair.split(':');
      document.getElementById(id).addEventListener('input', (e) => { form[key2] = e.target.value; });
    });
  }

  else if (key === 'localization') {
    content.innerHTML =
      '<div class="ip-step-heading">' + escapeHtml(t('institution_profile.localization_heading', 'Localization & Calendar')) + '</div>' +
      '<div class="util-card padded">' +
        '<label class="util-label" style="margin-top:0;">' + escapeHtml(t('institution_profile.timezone_label', 'Timezone')) + '</label>' +
        '<select class="util-input" id="fTimezone">' + timezoneOptionsHtml(form.timezone) + '</select>' +
        '<label class="util-label">' + escapeHtml(t('institution_profile.default_language_label', 'Default Language')) + '</label>' +
        '<input type="text" class="util-input" id="fDefaultLang" placeholder="e.g. en" value="' + escapeHtml(form.default_language) + '" />' +
        '<label class="util-label">' + escapeHtml(t('institution_profile.secondary_language_label', 'Secondary Language (optional)')) + '</label>' +
        '<input type="text" class="util-input" id="fSecondaryLang" placeholder="e.g. ar" value="' + escapeHtml(form.secondary_language) + '" />' +
      '</div>' +
      '<div class="util-card" style="margin-top:12px;">' +
        '<div class="util-label" style="margin:14px 14px 0;">' + escapeHtml(t('institution_profile.calendar_type_label', 'Calendar Type')) + '</div>' +
        '<div class="ip-chip-row" id="calendarChipRow">' +
          status.calendar_types.map(code => renderChip(calendarTypeLabel(code), form.calendar_type === code)).join('') +
        '</div>' +
      '</div>';
    document.getElementById('fTimezone').addEventListener('change', e => { form.timezone = e.target.value; });
    document.getElementById('fDefaultLang').addEventListener('input', e => { form.default_language = e.target.value; });
    document.getElementById('fSecondaryLang').addEventListener('input', e => { form.secondary_language = e.target.value; });
    document.getElementById('calendarChipRow').querySelectorAll('.chip').forEach((btn, i) => {
      btn.addEventListener('click', () => { form.calendar_type = status.calendar_types[i]; renderStep(); });
    });
  }

  else if (key === 'schedule') {
    content.innerHTML =
      '<div class="ip-step-heading">' + escapeHtml(t('institution_profile.schedule_heading', 'Working Days & Hours')) + '</div>' +
      '<div class="util-card">' +
        '<div class="ip-chip-row" id="dayChipRow">' +
          DAY_CODES.map((_, i) => renderChip(dayLabel(i), form.working_days.includes(i))).join('') +
        '</div>' +
        '<div class="ip-hours-row" style="border-top:1px solid var(--card-border);">' +
          '<div class="ip-hours-field">' +
            '<label class="util-label" style="margin-top:0;">' + escapeHtml(t('institution_profile.start_hours_label', 'Start (24h)')) + '</label>' +
            '<input type="text" class="util-input" id="fHoursStart" placeholder="08:00" value="' + escapeHtml(form.school_hours_start) + '" />' +
          '</div>' +
          '<div class="ip-hours-divider"></div>' +
          '<div class="ip-hours-field">' +
            '<label class="util-label" style="margin-top:0;">' + escapeHtml(t('institution_profile.end_hours_label', 'End (24h)')) + '</label>' +
            '<input type="text" class="util-input" id="fHoursEnd" placeholder="15:00" value="' + escapeHtml(form.school_hours_end) + '" />' +
          '</div>' +
        '</div>' +
      '</div>';
    document.getElementById('dayChipRow').querySelectorAll('.chip').forEach((btn, i) => {
      btn.addEventListener('click', () => {
        form.working_days = form.working_days.includes(i) ? form.working_days.filter(d => d !== i) : [...form.working_days, i].sort();
        renderStep();
      });
    });
    document.getElementById('fHoursStart').addEventListener('input', e => { form.school_hours_start = e.target.value; });
    document.getElementById('fHoursEnd').addEventListener('input', e => { form.school_hours_end = e.target.value; });
  }

  renderFooter();
  document.getElementById('ipStepErrorWrap').innerHTML = stepError ? '<div class="ip-step-error">' + escapeHtml(stepError) + '</div>' : '';
}

function renderFooter() {
  const keys = visibleStepKeys();
  const isLast = step === keys.length - 1;
  document.getElementById('ipFooterWrap').innerHTML =
    '<div class="ip-footer">' +
      (step > 0 ? '<button type="button" class="ip-back-btn" id="ipBackBtn">' + escapeHtml(t('institution_profile.back', 'Back')) + '</button>' : '') +
      '<button type="button" class="ip-continue-btn" id="ipContinueBtn" ' + (submitting ? 'disabled' : '') + '>' +
        (submitting ? '<span class="util-spinner"></span>' : escapeHtml(isLast ? t('institution_profile.save_changes', 'Save Changes') : t('institution_profile.continue', 'Continue'))) +
      '</button>' +
    '</div>';
  document.getElementById('ipBackBtn')?.addEventListener('click', goBack);
  document.getElementById('ipContinueBtn').addEventListener('click', goNext);
}

function goBack() {
  stepError = null;
  step = Math.max(0, step - 1);
  renderStep();
}

function goNext() {
  stepError = null;
  const key = currentStepKey();
  if (key === 'basic' && !form.name.trim()) {
    stepError = t('institution_profile.err_name_required', 'Institution name is required.');
    renderStep();
    return;
  }
  if (key === 'schedule' && (!validateHours(form.school_hours_start) || !validateHours(form.school_hours_end))) {
    stepError = t('institution_profile.err_hours_format', 'School hours must be in 24-hour HH:MM format, e.g. 08:00.');
    renderStep();
    return;
  }
  const keys = visibleStepKeys();
  if (step === keys.length - 1) {
    onSave();
  } else {
    step = Math.min(keys.length - 1, step + 1);
    renderStep();
    window.scrollTo(0, 0);
  }
}

let authToken = null;

function onSave() {
  if (!authToken) { showToast(t('institution_profile.session_expired', 'Your session expired. Please log in again.')); return; }
  if (!form.name.trim()) { showToast(t('institution_profile.err_name_required', 'Institution name is required.')); return; }
  if (!validateHours(form.school_hours_start) || !validateHours(form.school_hours_end)) {
    showToast(t('institution_profile.err_hours_format', 'School hours must be in 24-hour HH:MM format, e.g. 08:00.'));
    return;
  }

  submitting = true;
  renderFooter();

  const input = {
    name: form.name.trim(),
    name_ar: form.name_ar.trim() || undefined,
    // sec_reg: no backend column for this yet (checked - it's not in any
    // service in src/). Sent anyway so nothing has to change here once the
    // backend adds it; until then this key is just ignored on save, and
    // load() below leaves form.sec_reg blank since s.sec_reg never comes
    // back either.
    sec_reg: form.sec_reg.trim() || undefined,
    email: form.email.trim() || undefined,
    phone: form.phone.trim() || undefined,
    address: form.address.trim() || undefined,
    address_ar: form.address_ar.trim() || undefined,
    sec_reg_ar: form.sec_reg_ar.trim() || undefined,
    description: form.description.trim() || undefined,
    institution_type: form.institution_type || undefined,
    timezone: form.timezone.trim() || undefined,
    default_language: form.default_language.trim() || undefined,
    secondary_language: form.secondary_language.trim() || undefined,
    calendar_type: form.calendar_type || undefined,
    working_days: form.working_days,
    school_hours_start: form.school_hours_start || undefined,
    school_hours_end: form.school_hours_end || undefined,
    academic_year_structure: form.academic_year_structure || undefined,
    program_duration: form.institution_type === 'markaz' ? (form.program_duration || undefined) : undefined,
  };

  saveInstitutionProfile(authToken, input, { logo: newLogoFile, seal: newSealFile })
    .then(() => {
      showToast(t('institution_profile.saved_toast', 'Institution profile updated.'));
      window.location.href = 'admin-dashboard.php';
    })
    .catch(err => {
      showToast(err.message || t('institution_profile.save_failed', 'Could not save the institution profile.'));
    })
    .finally(() => {
      submitting = false;
      renderFooter();
    });
}

function renderLoadError() {
  document.getElementById('ipErrorBannerWrap').innerHTML =
    '<div class="ip-error-banner">' +
      '<div class="ip-error-banner-text">' + escapeHtml(loadError) + '</div>' +
      '<button type="button" class="ip-error-banner-retry" id="ipRetryBtn">' + escapeHtml(t('common.retry', 'Try again')) + '</button>' +
    '</div>';
  document.getElementById('ipRetryBtn').addEventListener('click', () => load(authToken));
}

function load(token) {
  loadError = null;
  fetchAdminSetupStatus(token).then(data => {
    status = data;
    const s = data.school;
    form.name = s.name || '';
    form.name_ar = s.name_ar || '';
    form.sec_reg = s.sec_reg || '';
    form.email = s.email || '';
    form.phone = s.phone || '';
    form.address = s.address || '';
    form.address_ar = s.address_ar || '';
    form.sec_reg_ar = s.sec_reg_ar || '';
    form.description = s.description || '';
    form.institution_type = s.institution_type || null;
    form.timezone = s.timezone || 'Asia/Manila';
    form.default_language = s.default_language || '';
    form.secondary_language = s.secondary_language || '';
    form.calendar_type = s.calendar_type || null;
    form.working_days = s.working_days || [];
    form.school_hours_start = s.school_hours_start || '';
    form.school_hours_end = s.school_hours_end || '';
    form.academic_year_structure = s.academic_year_structure || null;
    form.program_duration = s.program_duration || null;
    existingLogoUrl = absoluteUrl(s.logo);
    existingSealUrl = absoluteUrl(s.seal);

    document.getElementById('ipErrorBannerWrap').innerHTML = '';
    document.getElementById('ipRoot').style.display = '';
    document.getElementById('routeGuardSplash')?.remove();
    step = 0;
    renderStep();
  }).catch(err => {
    loadError = err.message || t('institution_profile.load_failed', 'Failed to load institution profile.');
    document.getElementById('ipRoot').style.display = '';
    document.getElementById('routeGuardSplash')?.remove();
    renderLoadError();
  });
}

guardDashboard('admin', function (user, token) {
  authToken = token;
  load(token);
});
