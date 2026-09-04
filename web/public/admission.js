// Admin: New Admission — web port of src/screens/admin/AdmissionScreen.tsx
// (+ its admission/components/{Stepper,FormField,ChipGroup,PhotoField,
// SuccessModal} and components/SignaturePad). One field per step,
// Typeform-style, same step order and same validation rules as RN.
// Backend: ApiController::admin_admission_single (multipart - it reads the
// photo/signature via $request->hasFile()).
//
// Not ported: the orphan-school "Orphan Information" step. RN shows it for
// orphanage-type schools, but admin_admission_single never persists those
// fields (there is no OrphanProfile::create in it - they're saved
// separately by admin_child_orphan_profile_update), so the step would
// collect guardian/health details the backend silently discards. Orphan
// schools still admit fine here; the Class & Section step is skipped for
// them exactly as it is in RN.

/* ── Field definitions (mirrors BASE_FIELDS / the `steps` array in RN) ── */
const ADM_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ADM_MAX_PHOTO_BYTES = 200 * 1024;            // matches imagePrep.ts
const ADM_ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

function admBaseFields() {
  const fields = [
    { key: 'name', label: t('admission.field_name_label', 'Full name'), subtitle: t('admission.field_name_subtitle', 'The student’s full legal name.'), required: true, autocap: 'words' },
    { key: 'name_ar', label: t('admission.field_name_ar_label', 'Arabic name'), subtitle: t('admission.field_name_ar_subtitle', 'The student’s name in Arabic.'), required: true, dir: 'rtl' },
    { key: 'email', label: t('admission.field_email_label', 'Email'), subtitle: t('admission.field_email_subtitle', 'Used to sign in to the student portal.'), required: true, type: 'email' },
    { key: 'password', label: t('admission.field_password_label', 'Password'), subtitle: t('admission.field_password_subtitle', 'At least 6 characters - the student will use this to log in.'), required: true, type: 'password' },
    { key: 'phone', label: t('admission.field_phone_label', 'Phone'), subtitle: t('admission.field_phone_subtitle', 'A contact number for the student.'), required: true, type: 'tel' },
    { key: 'address', label: t('admission.field_address_label', 'Address'), subtitle: t('admission.field_address_subtitle', 'Where the student currently lives.'), required: true },
    { key: 'emergency_contact_name', label: t('admission.field_emergency_name_label', 'Emergency contact name'), subtitle: t('admission.field_emergency_name_subtitle', 'Who to reach in an emergency.'), required: true, autocap: 'words' },
    { key: 'emergency_contact_phone', label: t('admission.field_emergency_phone_label', 'Emergency contact phone'), subtitle: t('admission.field_emergency_phone_subtitle', 'Their phone number.'), required: true, type: 'tel' },
  ];
  // A walk-in carried over from preregistrations.php already has its own
  // email + password (the student set both on the public pre-registration
  // form) - admin_admission_single reuses that password hash directly via
  // preregistration_id, so asking the registrar to set one here would
  // just silently overwrite what the student can actually log in with.
  // admPreregistrationHasCredentials (not just admPreregistrationId) gates
  // this: a submission from before email/password collection existed has
  // neither on file, and still needs the registrar to set them normally.
  return admPreregistrationHasCredentials ? fields.filter(f => f.key !== 'email' && f.key !== 'password') : fields;
}
function admGenderOptions() {
  return [{ id: 'male', name: t('admission.gender_male', 'Male') }, { id: 'female', name: t('admission.gender_female', 'Female') }];
}

/* ── State ── */
let admToken = null;
let admUser = null;
let admIsOrphanSchool = false;
let admSteps = [];
let admStepIndex = 0;
let admForm = {};
let admFieldErrors = {};
let admPhotoFile = null;      // compressed File, ready to upload
let admPhotoMeta = null;      // { size, wasCompressed } for the hint line
let admPhotoPreviewUrl = null;
let admSignatureBlob = null;
let admSubmitting = false;
let admSubmitError = null;
// Set when this page was opened from preregistrations.php's "Continue to
// Admission" - see admLoadPreregistrationHandoff() below. Lets admSubmit()
// close the loop on that submission once the account is actually created.
let admPreregistrationId = null;
// True only when the carried-over submission actually has email+password
// on file (every submission does going forward - see
// StudentPreregistrationController::public_student_preregistration_submit -
// but a row submitted before that existed won't). Separate from
// admPreregistrationId itself, which stays set either way so the
// mark-admitted bookkeeping call still fires once the student is created.
let admPreregistrationHasCredentials = false;
// True when the carried-over submission also has a selfie on file
// (student-preregister.php's anti-bot "Selfie Verification" field) - that
// image is reused directly as the student's profile photo, so the photo
// step is skipped too. Independent of admPreregistrationHasCredentials:
// a row submitted between the email/password rollout and this one has
// credentials but no selfie yet.
let admPreregistrationHasSelfie = false;
let admClasses = [];
let admSections = [];
let admSigCtx = null;         // live signature canvas context, per render
let admSigHasInk = false;

function admBuildSteps() {
  const steps = admBaseFields().map(f => ({ key: f.key, title: f.label, subtitle: f.subtitle }));
  steps.push({ key: 'gender', title: t('admission.gender_step_title', 'Gender'), subtitle: t('admission.gender_step_subtitle', 'Select the student’s gender.') });
  steps.push({ key: 'birthday', title: t('admission.birthday_step_title', 'Birthday'), subtitle: t('admission.birthday_step_subtitle', 'The student’s date of birth.') });
  // Skipped when the pre-registration's own selfie is being reused as the
  // profile photo - see admPreregistrationHasSelfie.
  if (!admPreregistrationHasSelfie) {
    steps.push({ key: 'photo', title: t('admission.photo_step_title', 'Profile Picture'), subtitle: t('admission.photo_step_subtitle', 'A clear photo helps staff recognize this student.') });
  }
  steps.push({ key: 'signature', title: t('admission.signature_step_title', 'Signature'), subtitle: t('admission.signature_step_subtitle', 'Draw the student’s signature for their ID card - optional, skip if unavailable.') });
  // Orphan schools don't organize children by class/section (RN skips this
  // step for them too) - they're identified by the student code instead.
  if (!admIsOrphanSchool) {
    steps.push({ key: 'class', title: t('admission.class_step_title', 'Class & Section'), subtitle: t('admission.class_step_subtitle', 'Where this student will be enrolled.') });
  }
  return steps;
}

/* ── Photo: validate + compress to the same 200KB budget as imagePrep.ts ── */
function admFormatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
function admLoadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(t('admission.err_image_read', 'Could not read that image.'))); };
    img.src = url;
  });
}
function admCanvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error(t('admission.err_image_encode', 'Could not encode the image.')))), type, quality);
  });
}
// Downscale to at most 1024px on the long edge, then step JPEG quality down
// until the result fits ADM_MAX_PHOTO_BYTES. Mirrors prepareProfilePhoto().
function admPrepareProfilePhoto(file) {
  const typeOk = ADM_ALLOWED_PHOTO_TYPES.indexOf((file.type || '').toLowerCase()) !== -1;
  if (!typeOk) {
    return Promise.reject(new Error(t('admission.err_photo_type', 'Only JPG, JPEG or PNG images are allowed.')));
  }
  if (file.size <= ADM_MAX_PHOTO_BYTES) {
    return Promise.resolve({ file, size: file.size, wasCompressed: false });
  }
  return admLoadImage(file).then(img => {
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
    // JPEG has no alpha - paint white first so a transparent PNG doesn't
    // come out with a black background after conversion.
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const qualities = [0.82, 0.7, 0.6, 0.5, 0.4, 0.3];
    let i = 0;
    function attempt() {
      return admCanvasToBlob(canvas, 'image/jpeg', qualities[i]).then(blob => {
        if (blob.size <= ADM_MAX_PHOTO_BYTES || i === qualities.length - 1) {
          const name = (file.name || 'profile').replace(/\.[^.]+$/, '') + '.jpg';
          return {
            file: new File([blob], name, { type: 'image/jpeg' }),
            size: blob.size,
            wasCompressed: true,
          };
        }
        i++;
        return attempt();
      });
    }
    return attempt();
  });
}

/* ── Signature canvas (Pointer Events - touch-first, same reasoning as the
      drag-reorder in enrollment-stages.js; the HTML5 mouse-only path would
      never fire on a phone). Backed by a DPR-scaled canvas so strokes stay
      crisp, exported as a PNG blob on Next. ── */
function admWireSignaturePad() {
  const canvas = document.getElementById('admSigCanvas');
  if (!canvas) return;
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);
  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#1C1C1E';
  admSigCtx = ctx;

  // Re-draw whatever was already captured, so stepping away and back
  // doesn't silently lose the signature.
  if (admSignatureBlob) {
    const url = URL.createObjectURL(admSignatureBlob);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, rect.width, rect.height);
      URL.revokeObjectURL(url);
    };
    img.src = url;
    admSigHasInk = true;
  } else {
    admSigHasInk = false;
  }
  admUpdateSigPlaceholder();

  let drawing = false;
  function pos(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    drawing = true;
    admSigHasInk = true;
    admUpdateSigPlaceholder();
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    // A single tap with no movement should still leave a visible dot.
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    e.preventDefault();
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  });
  const end = () => { drawing = false; };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', end);

  document.getElementById('admSigClear').addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    admSigHasInk = false;
    admSignatureBlob = null;
    admUpdateSigPlaceholder();
  });
}
function admUpdateSigPlaceholder() {
  const ph = document.getElementById('admSigPlaceholder');
  if (ph) ph.style.display = admSigHasInk ? 'none' : '';
}
// Called on Next while the signature step is showing. Resolves either way -
// admission can proceed without a signature (it's optional in RN too).
function admCaptureSignature() {
  const canvas = document.getElementById('admSigCanvas');
  if (!canvas || !admSigHasInk) return Promise.resolve();
  return admCanvasToBlob(canvas, 'image/png')
    .then(blob => { admSignatureBlob = blob; })
    .catch(() => { /* best-effort, same as RN's silent catch */ });
}

/* ── Validation (one step's worth at a time, like validateBasicStep) ── */
function admValidateStep(key) {
  const errs = {};
  const field = admBaseFields().find(f => f.key === key);
  if (field) {
    const value = (admForm[field.key] || '').trim();
    if (field.required && !value) {
      errs[field.key] = t('admission.required_suffix', '{label} is required.').replace('{label}', field.label);
    } else if (field.key === 'email' && value && !ADM_EMAIL_RE.test(value)) {
      errs.email = t('admission.err_email_invalid', 'Enter a valid email address, e.g. name@example.com');
    } else if (field.key === 'password' && value && value.length < 6) {
      errs.password = t('admission.err_password_short', 'Use at least 6 characters.');
    }
    return errs;
  }
  if (key === 'gender' && !admForm.gender) errs.gender = t('admission.err_gender_required', 'Gender is required.');
  if (key === 'birthday' && !(admForm.birthday || '').trim()) errs.birthday = t('admission.err_birthday_required', 'Birthday is required.');
  // 'class' is optional either way, matching RN's validateClass().
  return errs;
}

/* ── Render ── */
function admRenderStepper() {
  const step = admSteps[admStepIndex];
  const pct = Math.round(((admStepIndex + 1) / admSteps.length) * 100);
  document.getElementById('admStepper').innerHTML =
    '<div class="adm-progress-track"><div class="adm-progress-fill" style="width:' + pct + '%;"></div></div>';
  document.getElementById('admStepCount').textContent =
    t('admission.step_count', 'Step {n} of {total}').replace('{n}', admStepIndex + 1).replace('{total}', admSteps.length);
  document.getElementById('admTopBack').setAttribute('aria-label', admStepIndex === 0 ? t('admission.cancel', 'Cancel') : t('admission.back', 'Back'));
  document.getElementById('admBackBtn').textContent = admStepIndex === 0 ? t('admission.cancel', 'Cancel') : t('admission.back', 'Back');
  const nextBtn = document.getElementById('admNextBtn');
  const isLast = admStepIndex === admSteps.length - 1;
  nextBtn.innerHTML = admSubmitting
    ? '<span class="util-spinner"></span>'
    : escapeHtml(isLast ? t('admission.admit_student', 'Admit Student') : t('admission.next', 'Next'));
  nextBtn.disabled = admSubmitting;
  document.getElementById('admBackBtn').disabled = admSubmitting;
  return step;
}

function admFieldHtml(field) {
  const value = admForm[field.key] || '';
  const err = admFieldErrors[field.key];
  const emailValue = (admForm.email || '').trim();
  const showEmailOk = field.key === 'email' && emailValue.length > 0 && !err && ADM_EMAIL_RE.test(emailValue);
  return (
    '<label class="util-label" for="admField">' + escapeHtml(field.label) +
      (field.required ? '<span class="adm-req">*</span>' : '') + '</label>' +
    '<input id="admField" class="util-input' + (err ? ' adm-input-error' : '') + '"' +
      ' type="' + (field.type || 'text') + '"' +
      (field.dir ? ' dir="' + field.dir + '"' : '') +
      ' autocomplete="off"' +
      (field.autocap ? ' autocapitalize="' + field.autocap + '"' : ' autocapitalize="none"') +
      ' value="' + escapeHtml(value) + '" />' +
    (showEmailOk ? '<div class="adm-ok-row">' + icon('check', { size: 14, color: 'var(--ink)' }) + '<span>' + escapeHtml(t('admission.looks_good', 'Looks good')) + '</span></div>' : '') +
    (err ? '<div class="adm-error">' + escapeHtml(err) + '</div>' : '')
  );
}

function admChipGroupHtml(label, options, selectedId, name, emptyHint, err) {
  return (
    '<label class="util-label">' + escapeHtml(label) + '</label>' +
    (options.length === 0
      ? '<div class="adm-empty-hint">' + escapeHtml(emptyHint) + '</div>'
      : '<div class="adm-chip-row" data-chip-group="' + name + '">' +
          options.map(o =>
            '<button type="button" class="adm-chip' + (String(o.id) === String(selectedId) ? ' active' : '') + '" data-id="' + escapeHtml(String(o.id)) + '">' +
              escapeHtml(o.name) + '</button>'
          ).join('') +
        '</div>') +
    (err ? '<div class="adm-error">' + escapeHtml(err) + '</div>' : '')
  );
}

function admRenderBody(step) {
  const wrap = document.getElementById('admContent');
  let body = '';

  const field = admBaseFields().find(f => f.key === step.key);
  if (field) {
    body = admFieldHtml(field);
  } else if (step.key === 'gender') {
    body = admChipGroupHtml(t('admission.gender_step_title', 'Gender'), admGenderOptions(), admForm.gender, 'gender', '', admFieldErrors.gender);
  } else if (step.key === 'birthday') {
    body =
      '<label class="util-label" for="admField">' + escapeHtml(t('admission.birthday_step_title', 'Birthday')) + '<span class="adm-req">*</span></label>' +
      '<input id="admField" class="util-input' + (admFieldErrors.birthday ? ' adm-input-error' : '') + '" type="date" max="' + new Date().toISOString().split('T')[0] + '" value="' + escapeHtml(admForm.birthday || '') + '" />' +
      (admFieldErrors.birthday ? '<div class="adm-error">' + escapeHtml(admFieldErrors.birthday) + '</div>' : '') +
      '<div class="adm-helper">' + escapeHtml(t('admission.birthday_helper', 'A student code will be assigned automatically, based on your Student & Staff Codes setup.')) + '</div>';
  } else if (step.key === 'photo') {
    body =
      '<div class="adm-photo-wrap">' +
        '<button type="button" class="adm-photo-btn" id="admPhotoBtn" aria-label="' + escapeHtml(admPhotoFile ? t('admission.change_photo_aria', 'Change photo') : t('admission.add_photo_aria', 'Add photo')) + '">' +
          (admPhotoPreviewUrl
            ? '<img class="adm-photo-circle" src="' + escapeHtml(admPhotoPreviewUrl) + '" alt="" />'
            : '<span class="adm-photo-circle adm-photo-placeholder' + (admFieldErrors.photo ? ' error' : '') + '">' + icon('person', { size: 52, color: 'var(--subtle)' }) + '</span>') +
          '<span class="adm-photo-badge">' + icon('camera', { size: 17, color: '#fff' }) + '</span>' +
        '</button>' +
        '<input type="file" id="admPhotoInput" accept="image/jpeg,image/jpg,image/png" hidden />' +
        '<div class="adm-photo-hint" id="admPhotoHint">' +
          escapeHtml(admPhotoFile ? t('admission.photo_hint_tap_change', 'Tap the photo to choose a different one.') : t('admission.photo_hint_required', 'Required. JPG, JPEG, or PNG.')) +
        '</div>' +
        '<div class="adm-photo-meta" id="admPhotoMeta">' +
          (admPhotoMeta
            ? escapeHtml(t('admission.photo_meta_compressed', '{size} · compressed to fit {limit} limit').replace('{size}', admFormatBytes(admPhotoMeta.size)).replace('{limit}', admFormatBytes(ADM_MAX_PHOTO_BYTES)))
            : escapeHtml(t('admission.photo_meta_default', 'Max {limit} - larger photos are compressed automatically.').replace('{limit}', admFormatBytes(ADM_MAX_PHOTO_BYTES)))) +
        '</div>' +
        (admFieldErrors.photo ? '<div class="adm-error" style="text-align:center;">' + escapeHtml(admFieldErrors.photo) + '</div>' : '') +
        (admPhotoFile ? '<button type="button" class="adm-photo-remove" id="admPhotoRemove">' + escapeHtml(t('admission.remove_photo', 'Remove photo')) + '</button>' : '') +
      '</div>';
  } else if (step.key === 'signature') {
    body =
      '<div class="adm-sig-wrap">' +
        '<div class="adm-sig-canvas-wrap">' +
          '<canvas id="admSigCanvas" class="adm-sig-canvas"></canvas>' +
          '<span class="adm-sig-placeholder" id="admSigPlaceholder">' + escapeHtml(t('admission.sign_here', 'Sign here')) + '</span>' +
        '</div>' +
        '<div class="adm-sig-clear-row"><button type="button" class="adm-sig-clear" id="admSigClear">' + icon('trash', { size: 15, color: 'var(--ink)' }) + '<span>' + escapeHtml(t('admission.clear', 'Clear')) + '</span></button></div>' +
        '<div class="adm-helper">' + escapeHtml(t('admission.signature_helper', 'Optional - leave blank if the student isn’t here to sign. It appears on their ID card.')) + '</div>' +
      '</div>';
  } else if (step.key === 'class') {
    body =
      admChipGroupHtml(t('admission.class_label', 'Class'), admClasses, admForm.class_id, 'class_id',
        t('admission.no_classes_hint', 'No classes found yet - you can still admit the student and assign a class later.'), admFieldErrors.class_id) +
      admChipGroupHtml(t('admission.section_label', 'Section'), admSections, admForm.section_id, 'section_id',
        t('admission.pick_class_first_hint', 'Pick a class first, or continue without one.'), admFieldErrors.section_id);
  }

  wrap.innerHTML =
    '<div class="adm-card">' +
      '<div class="adm-card-title">' + escapeHtml(step.title) + '</div>' +
      '<div class="adm-card-subtitle">' + escapeHtml(step.subtitle) + '</div>' +
      body +
    '</div>' +
    (admSubmitError ? '<div class="adm-submit-error">' + escapeHtml(admSubmitError) + '</div>' : '');

  admWireBody(step);
}

function admWireBody(step) {
  const field = admBaseFields().find(f => f.key === step.key);
  const input = document.getElementById('admField');

  if (field && input) {
    input.addEventListener('input', (e) => {
      admForm[field.key] = e.target.value;
      if (admFieldErrors[field.key]) { delete admFieldErrors[field.key]; }
      // Only the email step has live feedback to repaint as they type;
      // re-rendering every keystroke elsewhere would lose the caret.
      if (field.key === 'email') admRefreshEmailOk();
    });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') admGoNext(); });
    // Not while the success modal is up - the wizard behind it is being
    // reset to step 1, and stealing focus out of the dialog traps keyboard
    // users behind it.
    if (!document.getElementById('admSuccessBackdrop').classList.contains('open')) input.focus();
  } else if (step.key === 'birthday' && input) {
    input.addEventListener('input', (e) => {
      admForm.birthday = e.target.value;
      delete admFieldErrors.birthday;
    });
  }

  document.querySelectorAll('[data-chip-group]').forEach(group => {
    const name = group.dataset.chipGroup;
    group.querySelectorAll('.adm-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        if (name === 'class_id') {
          // Changing class invalidates the previously picked section.
          admForm.class_id = id;
          admForm.section_id = undefined;
          delete admFieldErrors.class_id;
          admLoadSections(id).then(() => admRender());
          return;
        }
        admForm[name] = id;
        delete admFieldErrors[name];
        admRender();
      });
    });
  });

  if (step.key === 'photo') {
    const fileInput = document.getElementById('admPhotoInput');
    document.getElementById('admPhotoBtn').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      document.getElementById('admPhotoHint').textContent = t('admission.optimizing_image', 'Optimizing image…');
      delete admFieldErrors.photo;
      admPrepareProfilePhoto(file).then(prepared => {
        if (admPhotoPreviewUrl) URL.revokeObjectURL(admPhotoPreviewUrl);
        admPhotoFile = prepared.file;
        admPhotoMeta = { size: prepared.size, wasCompressed: prepared.wasCompressed };
        admPhotoPreviewUrl = URL.createObjectURL(prepared.file);
        admRender();
      }).catch(err => {
        admFieldErrors.photo = (err && err.message) || t('admission.err_photo_process', 'Could not process that image. Please try a different photo.');
        admRender();
      });
    });
    document.getElementById('admPhotoRemove')?.addEventListener('click', () => {
      if (admPhotoPreviewUrl) URL.revokeObjectURL(admPhotoPreviewUrl);
      admPhotoFile = null;
      admPhotoMeta = null;
      admPhotoPreviewUrl = null;
      admRender();
    });
  }

  if (step.key === 'signature') admWireSignaturePad();
}

// Repaints just the "Looks good" row, so typing an email doesn't re-render
// the input (which would drop focus and the caret position).
function admRefreshEmailOk() {
  const card = document.querySelector('.adm-card');
  if (!card) return;
  const existing = card.querySelector('.adm-ok-row');
  const value = (admForm.email || '').trim();
  const ok = value.length > 0 && ADM_EMAIL_RE.test(value);
  if (ok && !existing) {
    document.getElementById('admField').insertAdjacentHTML('afterend',
      '<div class="adm-ok-row">' + icon('check', { size: 14, color: 'var(--ink)' }) + '<span>' + escapeHtml(t('admission.looks_good', 'Looks good')) + '</span></div>');
  } else if (!ok && existing) {
    existing.remove();
  }
  card.querySelector('.adm-error')?.remove();
}

function admRender() {
  const step = admRenderStepper();
  admRenderBody(step);
}

/* ── Navigation ── */
function admGoNext() {
  if (admSubmitting) return;
  const step = admSteps[admStepIndex];

  if (step.key === 'photo' && !admPhotoFile) {
    admFieldErrors.photo = t('admission.err_photo_required', 'A profile picture is required.');
    admRender();
    return;
  }

  const finish = () => {
    const errs = admValidateStep(step.key);
    if (Object.keys(errs).length > 0) {
      admFieldErrors = errs;
      admRender();
      return;
    }
    admFieldErrors = {};
    if (admStepIndex === admSteps.length - 1) { admSubmit(); return; }
    admStepIndex++;
    admRender();
    window.scrollTo(0, 0);
  };

  // Rasterize the drawn strokes before leaving the signature step.
  if (step.key === 'signature') { admCaptureSignature().then(finish); return; }
  finish();
}

function admGoBack() {
  if (admSubmitting) return;
  if (admStepIndex === 0) { window.location.href = 'admin-dashboard.php'; return; }
  // Keep whatever is on the signature canvas when stepping backwards off it.
  const step = admSteps[admStepIndex];
  const done = () => { admStepIndex--; admFieldErrors = {}; admRender(); window.scrollTo(0, 0); };
  if (step.key === 'signature') { admCaptureSignature().then(done); return; }
  done();
}

/* ── Submit ── */
function admSubmit() {
  // admPreregistrationHasSelfie means there's no 'photo' step at all (see
  // admBuildSteps()) - the backend reuses the pre-registration's selfie as
  // the profile photo instead, via preregistration_id.
  if (!admPhotoFile && !admPreregistrationHasSelfie) {
    admFieldErrors.photo = t('admission.err_photo_required', 'A profile picture is required.');
    admStepIndex = admSteps.findIndex(s => s.key === 'photo');
    admRender();
    return;
  }
  admSubmitError = null;
  admSubmitting = true;
  admRender();

  admitStudent(admToken, admForm, admPhotoFile, admSignatureBlob).then(student => {
    admSubmitting = false;
    if (admPreregistrationId && student && student.id) {
      // Closes the loop on the review queue - never blocks the success
      // screen on this, it's just bookkeeping so the submission drops
      // out of "pending" instead of looking stuck forever.
      markPreregistrationAdmitted(admToken, admPreregistrationId, student.id).catch(() => {});
    }
    admShowSuccess(student && student.name ? student.name : admForm.name, student && student.code);
  }).catch(err => {
    admSubmitting = false;
    admSubmitError = (err && err.message) || t('admission.generic_submit_error', 'Something went wrong. Please try again.');
    admRender();
  });
}

function admResetForm() {
  admForm = {};
  admFieldErrors = {};
  admPreregistrationId = null;
  admPreregistrationHasCredentials = false;
  admPreregistrationHasSelfie = false;
  // A prior submission may have been carried over from preregistrations.php
  // (admSteps built without the email/password/photo steps for it) -
  // "Admit Another Student" starts a normal admission, which needs those
  // steps back, so the step list has to be rebuilt now that the prereg
  // flags are cleared, not just left as whatever it was for the previous
  // student.
  admSteps = admBuildSteps();
  if (admPhotoPreviewUrl) URL.revokeObjectURL(admPhotoPreviewUrl);
  admPhotoFile = null;
  admPhotoMeta = null;
  admPhotoPreviewUrl = null;
  admSignatureBlob = null;
  admSigHasInk = false;
  admSubmitError = null;
  admStepIndex = 0;
  admSections = [];
}

function admShowSuccess(name, code) {
  document.getElementById('admSuccessName').textContent = name || t('admission.default_student_name', 'The student');
  const codeEl = document.getElementById('admSuccessCode');
  if (code) {
    codeEl.textContent = t('admission.student_code_prefix', 'Student code: {code}').replace('{code}', code);
    codeEl.style.display = '';
  } else {
    codeEl.style.display = 'none';
  }
  document.getElementById('admSuccessBackdrop').classList.add('open');
  admResetForm();
  // Repaint the wizard behind the modal so it's already back at a clean
  // step 1 - otherwise the submit spinner stays frozen on the Next button
  // in the gap around the dialog.
  admRender();
}

/* ── Sections load ── */
function admLoadSections(classId) {
  if (admIsOrphanSchool) { admSections = []; return Promise.resolve(); }
  return fetchSections(admToken, classId)
    .then(list => { admSections = list; })
    .catch(() => { admSections = []; });
}

/* ── Wiring ── */
document.getElementById('admTopBackIcon').innerHTML = icon('chevronleft', { size: 22, color: 'var(--ink)' });
document.getElementById('admSuccessIcon').innerHTML = icon('check', { size: 26, color: 'var(--ink)' });
onLocaleChange(() => { if (admSteps.length) admRender(); });
document.getElementById('admTopBack').addEventListener('click', admGoBack);
document.getElementById('admBackBtn').addEventListener('click', admGoBack);
document.getElementById('admNextBtn').addEventListener('click', admGoNext);
document.getElementById('admViewStudentBtn').addEventListener('click', () => {
  window.location.href = 'students-list.php';
});
document.getElementById('admAdmitAnotherBtn').addEventListener('click', () => {
  document.getElementById('admSuccessBackdrop').classList.remove('open');
  admRender();
  window.scrollTo(0, 0);
});

// One-time sessionStorage handoff from preregistrations.php's "Continue
// to Admission" button (same pattern as newsfeed.js's editPost handoff -
// there's no "fetch one preregistration" step needed here since the
// review queue already has the full record in hand when it navigates
// over). Keys match admForm's own field names 1:1 by design - see
// STANDARD_FIELDS in StudentPreregistrationController.php - so this is a
// straight copy, not a translation.
//
// email/password are handled differently: the student chose both
// themselves on the public pre-registration form, so this only copies
// email in for display and sets admForm.preregistration_id - the
// password itself is never sent to (or seen by) the registrar's browser
// at all. admBaseFields() drops the email/password steps entirely
// whenever admPreregistrationId is set, and admin_admission_single
// reuses that submission's stored password hash directly. Same idea for
// the selfie the student took on the public form (anti-bot check) - it's
// reused as the profile photo, so the photo step is dropped too.
function admLoadPreregistrationHandoff() {
  let raw = null;
  try { raw = sessionStorage.getItem('admissionPreregistration'); } catch (e) {}
  if (!raw) return;
  try { sessionStorage.removeItem('admissionPreregistration'); } catch (e) {}
  let payload;
  try { payload = JSON.parse(raw); } catch (e) { return; }
  if (!payload || !payload.id) return;
  admPreregistrationId = payload.id;
  admPreregistrationHasCredentials = !!payload.email;
  admPreregistrationHasSelfie = admPreregistrationHasCredentials && !!payload.has_selfie;
  if (admPreregistrationHasCredentials) {
    admForm.preregistration_id = payload.id;
    admForm.email = payload.email;
  }
  const data = payload.data || {};
  ['name', 'name_ar', 'phone', 'address', 'emergency_contact_name', 'emergency_contact_phone', 'gender', 'birthday'].forEach(key => {
    if (data[key]) admForm[key] = data[key];
  });
}

// "1-tap": land on the first step this submission didn't already answer
// (name/phone/etc. above, or whichever ones the school's Admission
// Management form actually collects) instead of making the registrar
// click Next through every already-filled field just to reach the one
// thing a phone form genuinely can't capture - the photo. Called after
// admSteps is built, since it needs the (possibly email/password-filtered)
// step list to know what's actually left to answer.
function admJumpToFirstOpenStep() {
  if (!admPreregistrationId) return;
  const firstOpenIndex = admSteps.findIndex(s => !admForm[s.key]);
  if (firstOpenIndex !== -1) admStepIndex = firstOpenIndex;
}

// 'registrar' added so a registrar can finish a walk-in admission from
// preregistrations.php's "Continue to Admission" handoff - the backend
// (admin_admission_single/admin_class_list/admin_section_list) now
// accepts registrar too, see ApiController::requireAdminOrRegistrar().
guardDashboard(['admin', 'superadmin', 'registrar'], function (user, token) {
  admToken = token;
  admUser = user;
  admIsOrphanSchool = isOrphanSchoolUser(user);
  // Must run before admBuildSteps(): it sets admPreregistrationId, which
  // decides whether the email/password steps belong in the wizard at all.
  admLoadPreregistrationHandoff();
  admSteps = admBuildSteps();
  admJumpToFirstOpenStep();

  document.getElementById('routeGuardSplash')?.remove();
  document.getElementById('admScreen').style.display = '';
  admRender();

  // Classes power the Class & Section step only - orphan schools never see
  // it, so skip the call for them entirely (same as RN).
  if (!admIsOrphanSchool) {
    fetchClasses(token).then(list => {
      admClasses = list;
      if (admSteps[admStepIndex].key === 'class') admRender();
    }).catch(() => { /* silent - picker stays empty, admin can still submit */ });
    admLoadSections(undefined).then(() => {
      if (admSteps[admStepIndex].key === 'class') admRender();
    });
  }
});
