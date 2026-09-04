// Admin: Admission Management - configure what the walk-in pre-
// registration form (student-preregister.php) asks for, and show the QR
// code that opens it. A student scans the QR with their OWN phone
// camera (no in-app scanner needed - it just encodes a normal URL),
// fills the form in themselves, and it lands in preregistrations.php
// for the registrar to review and carry into admission.php - the
// registrar never types the student's info by hand.

const STANDARD_FIELDS = [
  { key: 'name', label: () => t('admission_management.field_name', 'Full Name') },
  { key: 'name_ar', label: () => t('admission_management.field_name_ar', 'Arabic Name') },
  { key: 'phone', label: () => t('admission_management.field_phone', 'Phone') },
  { key: 'address', label: () => t('admission_management.field_address', 'Address') },
  { key: 'emergency_contact_name', label: () => t('admission_management.field_emergency_name', 'Emergency Contact Name') },
  { key: 'emergency_contact_phone', label: () => t('admission_management.field_emergency_phone', 'Emergency Contact Phone') },
  { key: 'gender', label: () => t('admission_management.field_gender', 'Gender') },
  { key: 'birthday', label: () => t('admission_management.field_birthday', 'Birthday') },
];

let admConfig = null; // { fields_config, custom_questions, required_documents }
let admToken = null;
let admUser = null;
let admDirty = false;

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(t('admission_management.title', 'Admission Management'), t('admission_management.subtitle', 'Configure your walk-in pre-registration form.'), 'admin-dashboard.php', null);
}
renderHeaderText();
onLocaleChange(() => { renderHeaderText(); if (admConfig) render(); });

function fieldStateLabel(rule) {
  if (!rule || !rule.enabled) return t('admission_management.state_hidden', 'Hidden');
  return rule.required ? t('admission_management.state_required', 'Required') : t('admission_management.state_optional', 'Optional');
}
function fieldStateChipClass(rule) {
  if (!rule || !rule.enabled) return '';
  return rule.required ? 'ok' : 'warn';
}

function qrTargetUrl() {
  const dir = window.location.pathname.replace(/[^/]*$/, '');
  return window.location.origin + dir + 'student-preregister.php?school_id=' + admUser.school_id;
}

function renderQr() {
  const wrap = document.getElementById('admQrWrap');
  if (!wrap || typeof qrcode === 'undefined') return;
  const qr = qrcode(0, 'M');
  qr.addData(qrTargetUrl());
  qr.make();
  wrap.innerHTML = qr.createSvgTag({ cellSize: 5, margin: 2 });
}

function render() {
  const wrap = document.getElementById('admContent');
  let html =
    '<div class="util-section-title" style="margin-top:0;">' + escapeHtml(t('admission_management.qr_section_title', 'Walk-in Admission QR')) + '</div>' +
    '<div class="adm-qr-card">' +
      '<div class="adm-qr-svg-wrap" id="admQrWrap"></div>' +
      '<div class="adm-qr-hint">' + escapeHtml(t('admission_management.qr_hint', 'Show this at your front desk. Any phone camera can scan it - students go straight to your form and fill it in themselves.')) + '</div>' +
      '<button type="button" class="adm-copy-link-btn" id="admCopyLinkBtn">' + escapeHtml(t('admission_management.copy_link', 'Copy Link')) + '</button>' +
    '</div>' +

    '<div class="util-section-title">' + escapeHtml(t('admission_management.fields_section_title', 'Standard Fields')) + '</div>' +
    '<div class="step-hint" style="margin-top:-6px;margin-bottom:10px;">' + escapeHtml(t('admission_management.fields_section_hint', 'Choose what to ask on your pre-registration form. Name matches what admission.php already asks for.')) + '</div>' +
    STANDARD_FIELDS.map(f => {
      const rule = admConfig.fields_config[f.key] || { enabled: true, required: false };
      return '<div class="switch-row">' +
          '<div class="switch-row-label">' + escapeHtml(f.label()) + '</div>' +
          '<button type="button" class="mini-chip ' + fieldStateChipClass(rule) + ' adm-field-state-btn" data-field="' + f.key + '">' + escapeHtml(fieldStateLabel(rule)) + '</button>' +
        '</div>';
    }).join('') +

    '<div class="util-section-title">' + escapeHtml(t('admission_management.questions_section_title', 'Custom Questions')) + '</div>' +
    (admConfig.custom_questions.length
      ? admConfig.custom_questions.map((q, i) =>
          '<div class="adm-list-row">' +
            '<div class="adm-list-row-text"><div class="adm-list-row-title">' + escapeHtml(q.label) + '</div>' +
              '<div class="adm-list-row-meta">' + escapeHtml(q.required ? t('admission_management.state_required', 'Required') : t('admission_management.state_optional', 'Optional')) + '</div></div>' +
            '<button type="button" class="adm-list-row-delete" data-remove-question="' + i + '">' + icon('trash', { size: 16, color: '#EF4444' }) + '</button>' +
          '</div>').join('')
      : '<div class="doc-empty-card">' + escapeHtml(t('admission_management.no_custom_questions', 'No custom questions yet.')) + '</div>') +
    '<button type="button" class="adm-add-btn" id="admAddQuestionBtn">' + icon('plus', { size: 14, color: 'var(--emerald-deep)' }) + ' ' + escapeHtml(t('admission_management.add_question', 'Add Question')) + '</button>' +

    '<div class="util-section-title">' + escapeHtml(t('admission_management.documents_section_title', 'Required Documents')) + '</div>' +
    (admConfig.required_documents.length
      ? admConfig.required_documents.map((d, i) =>
          '<div class="adm-list-row">' +
            '<div class="adm-list-row-text"><div class="adm-list-row-title">' + escapeHtml(d.label) + '</div>' +
              '<div class="adm-list-row-meta">' + escapeHtml(d.required ? t('admission_management.state_required', 'Required') : t('admission_management.state_optional', 'Optional')) + '</div></div>' +
            '<button type="button" class="adm-list-row-delete" data-remove-document="' + i + '">' + icon('trash', { size: 16, color: '#EF4444' }) + '</button>' +
          '</div>').join('')
      : '<div class="doc-empty-card">' + escapeHtml(t('admission_management.no_documents', 'No required documents yet.')) + '</div>') +
    '<button type="button" class="adm-add-btn" id="admAddDocumentBtn">' + icon('plus', { size: 14, color: 'var(--emerald-deep)' }) + ' ' + escapeHtml(t('admission_management.add_document', 'Add Document')) + '</button>' +

    '<button type="button" class="sheet-btn-primary adm-save-btn" id="admSaveBtn" style="margin-top:24px;"><span id="admSaveLabel">' + escapeHtml(t('admission_management.save_btn', 'Save Changes')) + '</span></button>';

  wrap.innerHTML = html;
  renderQr();

  document.querySelectorAll('.adm-field-state-btn').forEach(btn => {
    btn.addEventListener('click', () => openFieldStateSheet(btn.dataset.field));
  });
  document.querySelectorAll('[data-remove-question]').forEach(btn => {
    btn.addEventListener('click', () => { admConfig.custom_questions.splice(+btn.dataset.removeQuestion, 1); admDirty = true; render(); });
  });
  document.querySelectorAll('[data-remove-document]').forEach(btn => {
    btn.addEventListener('click', () => { admConfig.required_documents.splice(+btn.dataset.removeDocument, 1); admDirty = true; render(); });
  });
  document.getElementById('admAddQuestionBtn').addEventListener('click', openAddQuestionSheet);
  document.getElementById('admAddDocumentBtn').addEventListener('click', openAddDocumentSheet);
  document.getElementById('admCopyLinkBtn').addEventListener('click', copyQrLink);
  document.getElementById('admSaveBtn').addEventListener('click', saveConfig);
}

function copyQrLink() {
  const url = qrTargetUrl();
  const done = () => showToast(t('admission_management.link_copied', 'Link copied.'));
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(done).catch(() => showToast(url));
  } else {
    showToast(url);
  }
}

function openFieldStateSheet(fieldKey) {
  const field = STANDARD_FIELDS.find(f => f.key === fieldKey);
  const opts = [
    { key: 'hidden', label: t('admission_management.state_hidden', 'Hidden') },
    { key: 'optional', label: t('admission_management.state_optional', 'Optional') },
    { key: 'required', label: t('admission_management.state_required', 'Required') },
  ];
  const rule = admConfig.fields_config[fieldKey] || { enabled: true, required: false };
  const currentKey = !rule.enabled ? 'hidden' : (rule.required ? 'required' : 'optional');
  openOptionSheet(field.label(), opts, currentKey, (key) => {
    admConfig.fields_config[fieldKey] = { enabled: key !== 'hidden', required: key === 'required' };
    admDirty = true;
    render();
    return Promise.resolve();
  });
}

// ── Add Question / Add Document sheets ──
function openAddQuestionSheet() {
  let backdrop = document.getElementById('addQuestionBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'addQuestionBackdrop';
    backdrop.className = 'sheet-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) closeAddQuestionSheet(); });
  }
  backdrop.innerHTML =
    '<div class="sheet-panel form">' +
      '<div class="sheet-handle"></div>' +
      '<div class="sheet-title-row"><span class="sheet-title">' + escapeHtml(t('admission_management.add_question', 'Add Question')) + '</span>' +
        '<button type="button" class="sheet-close-btn" id="aqCloseBtn">' + icon('close', { size: 16, color: 'var(--subtle)' }) + '</button></div>' +
      '<label class="util-label" style="margin-top:0;">' + escapeHtml(t('admission_management.question_label', 'Question')) + '</label>' +
      '<input type="text" id="aqLabel" class="util-input" placeholder="' + escapeHtml(t('admission_management.question_placeholder', 'e.g. Previous school attended')) + '" />' +
      '<label class="util-label">' + escapeHtml(t('admission_management.answer_type_label', 'Answer type')) + '</label>' +
      '<select id="aqType" class="util-input">' +
        '<option value="text">' + escapeHtml(t('admission_management.answer_type_text', 'Short answer')) + '</option>' +
        '<option value="textarea">' + escapeHtml(t('admission_management.answer_type_textarea', 'Long answer')) + '</option>' +
      '</select>' +
      '<div class="switch-row" style="margin-top:6px;"><div class="switch-row-label">' + escapeHtml(t('admission_management.state_required', 'Required')) + '</div>' +
        '<span class="switch"><input type="checkbox" id="aqRequired"><span class="switch-track"></span></span></div>' +
      '<div class="sheet-form-actions">' +
        '<button type="button" class="sheet-btn-secondary" id="aqCancelBtn">' + escapeHtml(t('common.cancel', 'Cancel')) + '</button>' +
        '<button type="button" class="sheet-btn-primary" id="aqAddBtn">' + escapeHtml(t('admission_management.add_btn', 'Add')) + '</button>' +
      '</div>' +
    '</div>';
  document.getElementById('aqCloseBtn').addEventListener('click', closeAddQuestionSheet);
  document.getElementById('aqCancelBtn').addEventListener('click', closeAddQuestionSheet);
  document.getElementById('aqAddBtn').addEventListener('click', () => {
    const label = document.getElementById('aqLabel').value.trim();
    if (!label) { showToast(t('admission_management.question_required', 'Enter a question.')); return; }
    admConfig.custom_questions.push({
      key: 'q_' + Date.now().toString(36),
      label,
      type: document.getElementById('aqType').value,
      required: document.getElementById('aqRequired').checked,
    });
    admDirty = true;
    closeAddQuestionSheet();
    render();
  });
  backdrop.classList.add('open');
}
function closeAddQuestionSheet() {
  document.getElementById('addQuestionBackdrop')?.classList.remove('open');
}

function openAddDocumentSheet() {
  let backdrop = document.getElementById('addDocumentBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'addDocumentBackdrop';
    backdrop.className = 'sheet-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) closeAddDocumentSheet(); });
  }
  backdrop.innerHTML =
    '<div class="sheet-panel form">' +
      '<div class="sheet-handle"></div>' +
      '<div class="sheet-title-row"><span class="sheet-title">' + escapeHtml(t('admission_management.add_document', 'Add Document')) + '</span>' +
        '<button type="button" class="sheet-close-btn" id="adCloseBtn">' + icon('close', { size: 16, color: 'var(--subtle)' }) + '</button></div>' +
      '<label class="util-label" style="margin-top:0;">' + escapeHtml(t('admission_management.document_label_label', 'Document name')) + '</label>' +
      '<input type="text" id="adLabel" class="util-input" placeholder="' + escapeHtml(t('admission_management.document_label_placeholder', 'e.g. Birth Certificate')) + '" />' +
      '<div class="switch-row" style="margin-top:6px;"><div class="switch-row-label">' + escapeHtml(t('admission_management.state_required', 'Required')) + '</div>' +
        '<span class="switch"><input type="checkbox" id="adRequired"><span class="switch-track"></span></span></div>' +
      '<div class="sheet-form-actions">' +
        '<button type="button" class="sheet-btn-secondary" id="adCancelBtn">' + escapeHtml(t('common.cancel', 'Cancel')) + '</button>' +
        '<button type="button" class="sheet-btn-primary" id="adAddBtn">' + escapeHtml(t('admission_management.add_btn', 'Add')) + '</button>' +
      '</div>' +
    '</div>';
  document.getElementById('adCloseBtn').addEventListener('click', closeAddDocumentSheet);
  document.getElementById('adCancelBtn').addEventListener('click', closeAddDocumentSheet);
  document.getElementById('adAddBtn').addEventListener('click', () => {
    const label = document.getElementById('adLabel').value.trim();
    if (!label) { showToast(t('admission_management.document_label_required', 'Enter a document name.')); return; }
    admConfig.required_documents.push({
      key: 'd_' + Date.now().toString(36),
      label,
      required: document.getElementById('adRequired').checked,
    });
    admDirty = true;
    closeAddDocumentSheet();
    render();
  });
  backdrop.classList.add('open');
}
function closeAddDocumentSheet() {
  document.getElementById('addDocumentBackdrop')?.classList.remove('open');
}

function saveConfig() {
  const btn = document.getElementById('admSaveBtn');
  const label = document.getElementById('admSaveLabel');
  btn.disabled = true;
  label.innerHTML = '<span class="util-spinner"></span>';
  updatePreregistrationConfig(admToken, {
    fields_config: admConfig.fields_config,
    custom_questions: admConfig.custom_questions,
    required_documents: admConfig.required_documents,
  }).then(() => {
    admDirty = false;
    showToast(t('admission_management.save_success', 'Admission form updated.'));
  }).catch(err => {
    showToast((err && err.message) || t('admission_management.save_failed', 'Could not save changes.'));
  }).finally(() => {
    btn.disabled = false;
    label.textContent = t('admission_management.save_btn', 'Save Changes');
  });
}

guardDashboard('admin', function (user, token) {
  admUser = user;
  admToken = token;
  document.getElementById('routeGuardSplash')?.remove();
  document.getElementById('utilBody').style.display = '';
  document.getElementById('bottomNavWrap').innerHTML = renderBottomNav(user.role);
  document.getElementById('admContent').innerHTML = '<div class="list-loading">' + escapeHtml(t('common.loading', 'Loading…')) + '</div>';
  fetchPreregistrationConfig(token).then(cfg => {
    admConfig = cfg;
    render();
  }).catch(() => {
    document.getElementById('admContent').innerHTML =
      '<div class="list-error">' + escapeHtml(t('admission_management.load_failed', 'Failed to load the admission form.')) + '</div>';
  });
});
