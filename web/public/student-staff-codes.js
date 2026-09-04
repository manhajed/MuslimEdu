// Ported from StudentStaffCodeSetupScreen.tsx - a Students/Staff tab,
// each an independent format + counter on the backend
// (StudentNumberFormat.target_type), so a student prefix like "STU" and
// a staff prefix like "STF" count on their own, never colliding.
// Defaults to the simple fields (prefix, starting number); the rest of
// the format power (digits, separator, yearly reset, included segments)
// sits behind "Advanced", same as the RN screen. Backend:
// /admin_student_number_format_show, _preview, _save.

const DEFAULT_DRAFT = {
  prefix: '', suffix: '', separator: '',
  include_campus_code: false, include_department_code: false,
  include_academic_year: false, include_admission_year: false,
  digit_length: 4, start_number: 1, reset_mode: 'never', year_format: 'full',
};

let activeTab = 'student';
let currentToken = null;
let currentDraft = { ...DEFAULT_DRAFT };
let currentConfig = null;
let advancedOpen = false;
let previewTimer = null;
let sscBooted = false;

function toggleSwitchHtml(id, on) {
  return '<button type="button" class="toggle-switch' + (on ? ' on' : '') + '" id="' + id + '"><span class="toggle-switch-knob"></span></button>';
}

function renderForm() {
  const wrap = document.getElementById('codeContent');
  const wasEverIssued = !!(currentConfig && currentConfig.updated_at);

  wrap.innerHTML =
    '<div class="preview-card">' +
      '<div class="preview-card-label">' + escapeHtml(activeTab === 'student' ? t('student_staff_codes.preview_label_student', 'Next student code will look like') : t('student_staff_codes.preview_label_staff', 'Next staff code will look like')) + '</div>' +
      '<div class="preview-card-value" id="previewValue">' + escapeHtml(currentPreview || '—') + '</div>' +
    '</div>' +

    '<label class="util-label" style="margin-top:0;">' + escapeHtml(t('student_staff_codes.prefix_label', 'Prefix letters')) + '</label>' +
    '<input type="text" id="fPrefix" class="util-input" maxlength="16" placeholder="' + (activeTab === 'student' ? 'STU' : 'STF') + '" value="' + escapeHtml(currentDraft.prefix) + '" />' +

    '<label class="util-label">' + escapeHtml(t('student_staff_codes.starting_number_label', 'Starting number')) + '</label>' +
    '<input type="number" id="fStart" class="util-input" min="0" value="' + currentDraft.start_number + '" />' +
    (wasEverIssued ? '<div class="helper-text">' + escapeHtml(t('student_staff_codes.starting_number_helper', 'Changing this only affects a counter that hasn’t issued anything yet - it never rewinds one that has.')) + '</div>' : '') +

    '<button type="button" class="advanced-toggle' + (advancedOpen ? ' open' : '') + '" id="advToggle">' +
      '<span class="advanced-toggle-text">' + escapeHtml(t('student_staff_codes.advanced', 'Advanced')) + '</span><span class="chev">' + icon('chevrondown', { size: 16, color: 'var(--subtle)' }) + '</span>' +
    '</button>' +

    '<div class="advanced-body' + (advancedOpen ? ' open' : '') + '" id="advBody">' +
      '<label class="util-label" style="margin-top:0;">' + escapeHtml(t('student_staff_codes.digits_label', 'Digits (zero-padded)')) + '</label>' +
      '<input type="number" id="fDigits" class="util-input" min="1" max="12" value="' + currentDraft.digit_length + '" />' +

      '<label class="util-label">' + escapeHtml(t('student_staff_codes.suffix_label', 'Suffix (optional)')) + '</label>' +
      '<input type="text" id="fSuffix" class="util-input" maxlength="16" value="' + escapeHtml(currentDraft.suffix) + '" />' +

      '<label class="util-label">' + escapeHtml(t('student_staff_codes.separator_label', 'Separator')) + '</label>' +
      '<div class="sep-chip-row" id="sepRow">' +
        ['', '-', '/', '.', '_'].map(sep =>
          '<button type="button" class="sep-chip' + (currentDraft.separator === sep ? ' active' : '') + '" data-sep="' + escapeHtml(sep) + '">' + (sep === '' ? escapeHtml(t('student_staff_codes.separator_none', 'None')) : escapeHtml(sep)) + '</button>'
        ).join('') +
      '</div>' +

      '<div class="switch-row">' +
        '<div><div class="switch-row-label">' + escapeHtml(t('student_staff_codes.reset_yearly_label', 'Reset counter every year')) + '</div><div class="switch-row-desc">' + escapeHtml(t('student_staff_codes.reset_yearly_desc', 'Off = the counter never resets (continuous).')) + '</div></div>' +
        toggleSwitchHtml('swReset', currentDraft.reset_mode === 'yearly') +
      '</div>' +

      (activeTab === 'student' ?
        '<div class="switch-row"><div class="switch-row-label">' + escapeHtml(t('student_staff_codes.include_admission_year_label', 'Include admission year')) + '</div>' + toggleSwitchHtml('swAdmission', currentDraft.include_admission_year) + '</div>'
        : '') +

      '<div class="switch-row"><div class="switch-row-label">' + escapeHtml(t('student_staff_codes.include_academic_year_label', 'Include current academic year')) + '</div>' + toggleSwitchHtml('swAcademicYear', currentDraft.include_academic_year) + '</div>' +
      '<div class="switch-row"><div class="switch-row-label">' + escapeHtml(t('student_staff_codes.include_campus_code_label', 'Include campus code')) + '</div>' + toggleSwitchHtml('swCampus', currentDraft.include_campus_code) + '</div>' +
      '<div class="switch-row"><div class="switch-row-label">' + escapeHtml(t('student_staff_codes.include_department_code_label', 'Include department code')) + '</div>' + toggleSwitchHtml('swDept', currentDraft.include_department_code) + '</div>' +
    '</div>' +

    '<button type="button" class="util-save-btn pill" id="saveBtn"><span id="saveLabel">' + escapeHtml(t('student_staff_codes.save', 'Save')) + '</span></button>';

  wireForm();
}

function wireForm() {
  document.getElementById('fPrefix').addEventListener('input', e => {
    currentDraft.prefix = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    e.target.value = currentDraft.prefix;
    schedulePreview();
  });
  document.getElementById('fStart').addEventListener('input', e => {
    currentDraft.start_number = Math.max(0, parseInt(e.target.value, 10) || 0);
    schedulePreview();
  });
  document.getElementById('advToggle').addEventListener('click', () => {
    advancedOpen = !advancedOpen;
    document.getElementById('advToggle').classList.toggle('open', advancedOpen);
    document.getElementById('advBody').classList.toggle('open', advancedOpen);
  });
  document.getElementById('fDigits')?.addEventListener('input', e => {
    currentDraft.digit_length = Math.min(12, Math.max(1, parseInt(e.target.value, 10) || 1));
    schedulePreview();
  });
  document.getElementById('fSuffix')?.addEventListener('input', e => {
    currentDraft.suffix = e.target.value;
    schedulePreview();
  });
  document.getElementById('sepRow')?.querySelectorAll('.sep-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      currentDraft.separator = chip.dataset.sep;
      document.getElementById('sepRow').querySelectorAll('.sep-chip').forEach(c => c.classList.toggle('active', c === chip));
      schedulePreview();
    });
  });
  bindSwitch('swReset', v => { currentDraft.reset_mode = v ? 'yearly' : 'never'; });
  bindSwitch('swAdmission', v => { currentDraft.include_admission_year = v; });
  bindSwitch('swAcademicYear', v => { currentDraft.include_academic_year = v; });
  bindSwitch('swCampus', v => { currentDraft.include_campus_code = v; });
  bindSwitch('swDept', v => { currentDraft.include_department_code = v; });

  document.getElementById('saveBtn').addEventListener('click', handleSave);
}
function bindSwitch(id, onChange) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.addEventListener('click', () => {
    const next = !btn.classList.contains('on');
    btn.classList.toggle('on', next);
    onChange(next);
    schedulePreview();
  });
}

let currentPreview = '';

function schedulePreview() {
  if (previewTimer) clearTimeout(previewTimer);
  previewTimer = setTimeout(() => {
    previewStudentNumber(currentToken, currentDraft, activeTab).then(sample => {
      currentPreview = sample;
      const el = document.getElementById('previewValue');
      if (el) el.textContent = sample || '—';
    }).catch(() => {});
  }, 350);
}

function handleSave() {
  const btn = document.getElementById('saveBtn');
  const label = document.getElementById('saveLabel');
  btn.disabled = true;
  label.innerHTML = '<span class="util-spinner"></span>';

  saveStudentNumberConfig(currentToken, currentDraft, activeTab).then(result => {
    currentConfig = result.config;
    currentPreview = result.preview;
    showToast(activeTab === 'student' ? t('student_staff_codes.saved_student_toast', 'Student codes will now follow this format.') : t('student_staff_codes.saved_staff_toast', 'Staff codes will now follow this format.'));
    renderForm();
    notifySetupItemSaved(currentToken);
  }).catch(err => {
    showToast((err && err.message) || t('student_staff_codes.save_failed', 'Please try again.'));
  }).finally(() => {
    btn.disabled = false;
    label.textContent = t('student_staff_codes.save', 'Save');
  });
}

function load(tab) {
  activeTab = tab;
  advancedOpen = false;
  document.getElementById('codeContent').innerHTML = '<div class="list-loading">' + escapeHtml(t('common.loading', 'Loading…')) + '</div>';
  fetchStudentNumberConfig(currentToken, tab).then(data => {
    currentConfig = data.config;
    currentDraft = {
      prefix: data.config.prefix, suffix: data.config.suffix, separator: data.config.separator,
      include_campus_code: data.config.include_campus_code, include_department_code: data.config.include_department_code,
      include_academic_year: data.config.include_academic_year, include_admission_year: data.config.include_admission_year,
      digit_length: data.config.digit_length, start_number: data.config.start_number,
      reset_mode: data.config.reset_mode, year_format: data.config.year_format,
    };
    currentPreview = data.preview;
    renderForm();
  }).catch(() => {
    document.getElementById('codeContent').innerHTML =
      '<div class="list-error">' + escapeHtml(t('student_staff_codes.load_failed', 'Failed to load this setting.')) + '<br><button type="button" class="list-retry-btn" id="retryBtn">' + escapeHtml(t('common.retry', 'Try again')) + '</button></div>';
    document.getElementById('retryBtn')?.addEventListener('click', () => load(tab));
  });
}

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML = renderUtilHeader(t('student_staff_codes.title', 'Student & Staff Codes'), null, 'admin-dashboard.php', null);
}
renderHeaderText();
onLocaleChange(() => { renderHeaderText(); if (sscBooted) renderForm(); });

document.getElementById('tabRow').querySelectorAll('.role-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.getElementById('tabRow').querySelectorAll('.role-tab').forEach(t => t.classList.toggle('active', t === tab));
    load(tab.dataset.tab);
  });
});

guardDashboard('admin', function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  document.getElementById('utilBody').style.display = '';
  document.getElementById('bottomNavWrap').innerHTML = renderBottomNav('admin');
  currentToken = token;
  load('student');
  sscBooted = true;
});
