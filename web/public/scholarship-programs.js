// Scholarship & Taqdim Assistant - Programs. Main staff catalog screen:
// list/search/filter programs, create/edit them, change their status, and
// manage each program's requirements checklist. Providers are a separate,
// simpler CRUD screen (scholarship-providers.js) since a program can't be
// created without one existing first - this page links out to it rather
// than duplicating that form here.
//
// Access: primary SuperAdmin, or a platform-staff member (role_id 13)
// granted scholarship_access - see requireScholarshipStaffAccess()
// (dashboard.js) and ScholarshipProgramController::requireScholarshipStaff()
// server-side. Backed by ScholarshipProgramController's program*/
// requirement* endpoints.

document.getElementById('searchIcon').innerHTML = icon('search', { size: 17, color: 'var(--subtle)' });

const PROGRAM_STATUSES = ['draft', 'published', 'closed', 'archived'];
function statusLabel(s) { return t('scholarship_programs.status_' + s, s.charAt(0).toUpperCase() + s.slice(1)); }
// Only 3 mini-chip color variants exist (ok/warn/danger) for 4 statuses -
// archived reuses danger's muted tone since both read as "not currently
// live", just for different reasons (closed on purpose vs. retired).
function statusChipClass(s) {
  if (s === 'published') return 'ok';
  if (s === 'draft') return 'warn';
  return 'danger'; // closed, archived
}

// Kept short and generic rather than trying to enumerate every school
// system's own grade structure - matches how scholarship_type (free text
// on the backend) is handled below, not a fixed enum either.
const EDUCATION_LEVELS = ['elementary', 'middle_school', 'high_school', 'undergraduate', 'graduate'];
function levelLabel(l) { return t('scholarship_programs.level_' + l, l.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())); }

let allPrograms = [];
let allProviders = [];
let searchQuery = '';
let statusFilter = '';
let searchTimer = null;
let lastListRendered = false;

function formatDate(d) {
  if (!d) return null;
  try { return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch (e) { return d; }
}
function formatMoney(amount, currency) {
  if (amount === null || amount === undefined || amount === '') return null;
  const n = Number(amount);
  return (currency || '') + ' ' + (Number.isFinite(n) ? n.toLocaleString() : amount);
}

function renderStatusFilterRow(token) {
  const row = document.getElementById('statusFilterRow');
  const chips = [{ key: '', label: t('scholarship_programs.filter_all', 'All') }]
    .concat(PROGRAM_STATUSES.map(s => ({ key: s, label: statusLabel(s) })));
  row.innerHTML = chips.map(c =>
    '<button type="button" class="filter-chip' + (statusFilter === c.key ? ' active' : '') + '" data-status="' + escapeHtml(c.key) + '">' + escapeHtml(c.label) + '</button>'
  ).join('') +
    '<a href="scholarship-providers.php" class="filter-chip" style="margin-left:auto;">' + escapeHtml(t('scholarship_programs.providers_chip', 'Providers →')) + '</a>' +
    '<a href="scholarship-applications.php" class="filter-chip">' + escapeHtml(t('scholarship_programs.applications_chip', 'Applications →')) + '</a>';
  row.querySelectorAll('button.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      statusFilter = chip.dataset.status;
      renderStatusFilterRow(token);
      renderList(token);
    });
  });
}

function renderList(token) {
  lastListRendered = true;
  const wrap = document.getElementById('listContent');
  const q = searchQuery.trim().toLowerCase();
  const filtered = allPrograms.filter(p => {
    if (statusFilter && p.status !== statusFilter) return false;
    if (!q) return true;
    const providerName = (p.provider && p.provider.name) || '';
    return (p.title || '').toLowerCase().includes(q) || providerName.toLowerCase().includes(q);
  });

  if (allPrograms.length === 0) {
    wrap.innerHTML =
      '<div class="list-empty"><div class="list-empty-title">' +
      escapeHtml(t('scholarship_programs.no_programs', 'No scholarship programs yet. Tap + Add to create one.')) +
      '</div></div>';
    return;
  }
  if (filtered.length === 0) {
    wrap.innerHTML = '<div class="list-empty"><div class="list-empty-title">' +
      escapeHtml(t('scholarship_programs.no_matches', 'No programs match your search or filter.')) + '</div></div>';
    return;
  }

  wrap.innerHTML = '';
  filtered.forEach(p => {
    const providerName = (p.provider && p.provider.name) || t('scholarship_programs.no_provider', 'No provider');
    const money = formatMoney(p.coverage_amount, p.currency);
    const deadline = formatDate(p.application_deadline);
    const appsCount = p.applications_count || 0;

    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'list-card';
    card.innerHTML =
      '<span class="list-avatar-wrap">' +
        '<span class="list-avatar-fallback">' + icon('gradcap', { size: 18, color: '#fff' }) + '</span>' +
      '</span>' +
      '<span class="list-card-body">' +
        '<span class="list-card-name">' + escapeHtml(p.title) + '</span>' +
        '<div class="list-card-meta">' + escapeHtml(providerName) + (p.academic_year ? ' · ' + escapeHtml(p.academic_year) : '') + '</div>' +
        '<div class="chip-row">' +
          '<span class="mini-chip ' + statusChipClass(p.status) + '">' + escapeHtml(statusLabel(p.status)) + '</span>' +
          (money ? '<span class="mini-chip ok">' + escapeHtml(money) + '</span>' : '') +
          (deadline ? '<span class="mini-chip warn">' + escapeHtml(t('scholarship_programs.deadline_chip', 'Due {date}').replace('{date}', deadline)) + '</span>' : '') +
          '<span class="mini-chip ok">' + escapeHtml(t('scholarship_programs.applicants_chip', '{n} applied').replace('{n}', String(appsCount))) + '</span>' +
        '</div>' +
      '</span>' +
      icon('chevron', { size: 18, color: 'var(--subtle)' });
    card.addEventListener('click', () => openProgramActions(token, p));
    wrap.appendChild(card);
  });
}
onLocaleChange(() => { if (lastListRendered) { renderStatusFilterRow(getStoredToken()); renderList(getStoredToken()); } });

document.getElementById('searchInput').addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { searchQuery = e.target.value; renderList(getStoredToken()); }, 200);
});

// ── Program action sheet ──
function openProgramActions(token, p) {
  const actions = [
    { icon: 'pencil', label: t('scholarship_programs.edit_label', 'Edit Program'), desc: t('scholarship_programs.edit_desc', 'Change details, dates, or coverage'), onPress: () => openProgramForm(token, p) },
    { icon: 'clipboard', label: t('scholarship_programs.requirements_label', 'Manage Requirements'), desc: t('scholarship_programs.requirements_desc', 'Documents and criteria applicants must submit'), onPress: () => openRequirementsSheet(token, p) },
    { icon: 'refresh', label: t('scholarship_programs.change_status_label', 'Change Status'), desc: t('scholarship_programs.change_status_desc', 'Currently: ') + statusLabel(p.status), onPress: () => openStatusSheet(token, p) },
    { icon: 'trash', label: t('scholarship_programs.delete_label', 'Delete Program'), desc: t('scholarship_programs.delete_desc', 'Only possible if it has no applications yet'), onPress: () => confirmDeleteProgram(token, p) },
  ];
  openActionSheet(p.title, actions);
}

function openStatusSheet(token, p) {
  const actions = PROGRAM_STATUSES.filter(s => s !== p.status).map(s => ({
    icon: 'checkcircle',
    label: statusLabel(s),
    desc: t('scholarship_programs.set_status_desc', 'Set this program to {status}').replace('{status}', statusLabel(s)),
    onPress: () => {
      setScholarshipProgramStatus(token, p.id, s).then(() => {
        showToast(t('scholarship_programs.status_updated_toast', 'Status updated.'));
        load(token);
      }).catch(err => showToast(err && err.message ? err.message : t('scholarship_programs.status_update_failed', 'Could not update status.')));
    },
  }));
  openActionSheet(t('scholarship_programs.change_status_label', 'Change Status'), actions);
}

function confirmDeleteProgram(token, p) {
  openActionSheet(t('scholarship_programs.confirm_delete_title', 'Delete this program?'), [
    { icon: 'trash', label: t('scholarship_programs.confirm_delete_label', 'Yes, delete'), desc: t('scholarship_programs.confirm_delete_desc', 'This cannot be undone'), onPress: () => {
      deleteScholarshipProgram(token, p.id).then(() => {
        showToast(t('scholarship_programs.deleted_toast', 'Program deleted.'));
        load(token);
      }).catch(err => showToast(err && err.message ? err.message : t('scholarship_programs.delete_failed', 'Could not delete this program.')));
    }},
    { icon: 'close', label: t('common.cancel', 'Cancel'), desc: t('scholarship_programs.keep_desc', 'Keep this program as-is'), onPress: () => {} },
  ]);
}

// ── Add/Edit Program form sheet ──
function providerOptionsHtml(selectedId) {
  return allProviders.map(pr =>
    '<option value="' + pr.id + '"' + (existingSelected(pr.id, selectedId) ? ' selected' : '') + '>' + escapeHtml(pr.name) + '</option>'
  ).join('');
}
function existingSelected(id, selectedId) { return selectedId != null && String(id) === String(selectedId); }

function levelChipsHtml(selectedLevels) {
  const sel = Array.isArray(selectedLevels) ? selectedLevels : [];
  return EDUCATION_LEVELS.map(l =>
    '<button type="button" class="filter-chip pfLevelChip' + (sel.includes(l) ? ' active' : '') + '" data-level="' + escapeHtml(l) + '">' + escapeHtml(levelLabel(l)) + '</button>'
  ).join('');
}
function wireLevelChips(container) {
  container.querySelectorAll('.pfLevelChip').forEach(chip => {
    chip.addEventListener('click', () => chip.classList.toggle('active'));
  });
}
function collectLevelChips(container) {
  return Array.from(container.querySelectorAll('.pfLevelChip.active')).map(c => c.dataset.level);
}

function statusOptionsHtml(selected) {
  return PROGRAM_STATUSES.map(s => '<option value="' + s + '"' + (s === selected ? ' selected' : '') + '>' + escapeHtml(statusLabel(s)) + '</option>').join('');
}

function openProgramForm(token, existing) {
  if (allProviders.length === 0) {
    showToast(t('scholarship_programs.no_providers_toast', 'Add a provider first before creating a program.'));
    return;
  }
  let backdrop = document.getElementById('pfBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'pfBackdrop';
    backdrop.className = 'sheet-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) closeProgramForm(); });
  }
  const dOpen = existing && existing.application_open_at ? String(existing.application_open_at).slice(0, 10) : '';
  const dDeadline = existing && existing.application_deadline ? String(existing.application_deadline).slice(0, 10) : '';

  backdrop.innerHTML =
    '<div class="sheet-panel form">' +
      '<div class="sheet-handle"></div>' +
      '<div class="sheet-title-row"><span class="sheet-title">' + escapeHtml(existing ? t('scholarship_programs.edit_title', 'Edit Program') : t('scholarship_programs.add_title', 'Add Program')) + '</span>' +
        '<button type="button" class="sheet-close-btn" id="pfCloseBtn">' + icon('close', { size: 16, color: 'var(--subtle)' }) + '</button></div>' +

      '<label class="util-label" style="margin-top:0;">' + escapeHtml(t('scholarship_programs.provider_label', 'Provider')) + '</label>' +
      '<select id="pfProvider" class="util-input">' + providerOptionsHtml(existing && existing.provider_id) + '</select>' +

      '<label class="util-label">' + escapeHtml(t('scholarship_programs.title_label', 'Title')) + '</label>' +
      '<input type="text" id="pfTitle" class="util-input" placeholder="' + escapeHtml(t('scholarship_programs.title_placeholder', 'e.g. Hifz Excellence Scholarship')) + '" value="' + (existing ? escapeHtml(existing.title) : '') + '" />' +

      '<label class="util-label">' + escapeHtml(t('scholarship_programs.summary_label', 'Summary (optional)')) + '</label>' +
      '<input type="text" id="pfSummary" class="util-input" placeholder="' + escapeHtml(t('scholarship_programs.summary_placeholder', 'One line shown in listings')) + '" value="' + (existing && existing.summary ? escapeHtml(existing.summary) : '') + '" />' +

      '<label class="util-label">' + escapeHtml(t('scholarship_programs.description_label', 'Description (optional)')) + '</label>' +
      '<textarea id="pfDescription" class="util-input" placeholder="' + escapeHtml(t('scholarship_programs.description_placeholder', 'Full details shown on the program page')) + '">' + (existing && existing.description ? escapeHtml(existing.description) : '') + '</textarea>' +

      '<label class="util-label">' + escapeHtml(t('scholarship_programs.type_label', 'Scholarship type (optional)')) + '</label>' +
      '<input type="text" id="pfType" class="util-input" placeholder="' + escapeHtml(t('scholarship_programs.type_placeholder', 'e.g. Merit-based, Need-based')) + '" value="' + (existing && existing.scholarship_type ? escapeHtml(existing.scholarship_type) : '') + '" />' +

      '<label class="util-label">' + escapeHtml(t('scholarship_programs.coverage_label', 'Coverage amount (optional)')) + '</label>' +
      '<div style="display:flex;gap:8px;">' +
        '<input type="number" id="pfAmount" class="util-input" min="0" step="0.01" style="flex:2;" placeholder="0.00" value="' + (existing && existing.coverage_amount !== null && existing.coverage_amount !== undefined ? escapeHtml(String(existing.coverage_amount)) : '') + '" />' +
        '<input type="text" id="pfCurrency" class="util-input" style="flex:1;" placeholder="USD" value="' + (existing && existing.currency ? escapeHtml(existing.currency) : 'USD') + '" />' +
      '</div>' +

      '<label class="util-label">' + escapeHtml(t('scholarship_programs.levels_label', 'Education levels (optional)')) + '</label>' +
      '<div class="filter-chip-row" id="pfLevelsRow">' + levelChipsHtml(existing && existing.education_levels) + '</div>' +

      '<label class="util-label">' + escapeHtml(t('scholarship_programs.academic_year_label', 'Academic year (optional)')) + '</label>' +
      '<input type="text" id="pfAcademicYear" class="util-input" placeholder="' + escapeHtml(t('scholarship_programs.academic_year_placeholder', 'e.g. 2026-2027')) + '" value="' + (existing && existing.academic_year ? escapeHtml(existing.academic_year) : '') + '" />' +

      '<label class="util-label">' + escapeHtml(t('scholarship_programs.open_date_label', 'Applications open (optional)')) + '</label>' +
      '<input type="date" id="pfOpenAt" class="util-input" value="' + dOpen + '" />' +

      '<label class="util-label">' + escapeHtml(t('scholarship_programs.deadline_label', 'Application deadline (optional)')) + '</label>' +
      '<input type="date" id="pfDeadline" class="util-input" value="' + dDeadline + '" />' +

      '<label class="util-label">' + escapeHtml(t('scholarship_programs.max_applicants_label', 'Max applicants (optional)')) + '</label>' +
      '<input type="number" id="pfMaxApplicants" class="util-input" min="1" placeholder="' + escapeHtml(t('scholarship_programs.max_applicants_placeholder', 'Leave blank for unlimited')) + '" value="' + (existing && existing.max_applicants ? escapeHtml(String(existing.max_applicants)) : '') + '" />' +

      '<label class="util-label">' + escapeHtml(t('scholarship_programs.status_label', 'Status')) + '</label>' +
      '<select id="pfStatus" class="util-input">' + statusOptionsHtml(existing ? existing.status : 'draft') + '</select>' +

      '<div class="sheet-form-actions">' +
        '<button type="button" class="sheet-btn-secondary" id="pfCancelBtn">' + escapeHtml(t('common.cancel', 'Cancel')) + '</button>' +
        '<button type="button" class="sheet-btn-primary" id="pfSubmitBtn"><span id="pfSubmitLabel">' + escapeHtml(t('common.save', 'Save')) + '</span></button>' +
      '</div>' +
    '</div>';

  wireLevelChips(document.getElementById('pfLevelsRow'));
  document.getElementById('pfCloseBtn').addEventListener('click', closeProgramForm);
  document.getElementById('pfCancelBtn').addEventListener('click', closeProgramForm);
  document.getElementById('pfSubmitBtn').addEventListener('click', () => submitProgramForm(token, existing));
  backdrop.classList.add('open');
}
function closeProgramForm() {
  document.getElementById('pfBackdrop')?.classList.remove('open');
}
function submitProgramForm(token, existing) {
  const title = document.getElementById('pfTitle').value.trim();
  if (!title) { showToast(t('scholarship_programs.title_required', 'A title is required.')); return; }

  const amountRaw = document.getElementById('pfAmount').value.trim();
  const maxRaw = document.getElementById('pfMaxApplicants').value.trim();

  const input = {
    provider_id: parseInt(document.getElementById('pfProvider').value, 10),
    title,
    summary: document.getElementById('pfSummary').value.trim() || null,
    description: document.getElementById('pfDescription').value.trim() || null,
    scholarship_type: document.getElementById('pfType').value.trim() || null,
    coverage_amount: amountRaw ? Number(amountRaw) : null,
    currency: document.getElementById('pfCurrency').value.trim() || null,
    education_levels: collectLevelChips(document.getElementById('pfLevelsRow')),
    academic_year: document.getElementById('pfAcademicYear').value.trim() || null,
    application_open_at: document.getElementById('pfOpenAt').value || null,
    application_deadline: document.getElementById('pfDeadline').value || null,
    max_applicants: maxRaw ? parseInt(maxRaw, 10) : null,
    status: document.getElementById('pfStatus').value,
  };

  const btn = document.getElementById('pfSubmitBtn');
  const label = document.getElementById('pfSubmitLabel');
  btn.disabled = true; label.innerHTML = '<span class="util-spinner"></span>';

  const req = existing
    ? updateScholarshipProgram(token, existing.id, input)
    : createScholarshipProgram(token, input);

  req.then(() => {
    closeProgramForm();
    showToast(existing ? t('scholarship_programs.updated_toast', 'Program updated.') : t('scholarship_programs.added_toast', 'Program added.'));
    load(token);
  }).catch(err => showToast(err && err.message ? err.message : t('scholarship_programs.save_failed', 'Could not save this program.')))
    .finally(() => { btn.disabled = false; label.textContent = t('common.save', 'Save'); });
}

// ── Requirements sub-screen (per program) ──
let currentRequirementsProgram = null;
let currentRequirements = [];

const REQUIREMENT_TYPES = ['document', 'statement', 'criteria'];
function requirementTypeLabel(rt) { return t('scholarship_programs.req_type_' + rt, rt.charAt(0).toUpperCase() + rt.slice(1)); }

function openRequirementsSheet(token, program) {
  currentRequirementsProgram = program;
  let backdrop = document.getElementById('reqBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'reqBackdrop';
    backdrop.className = 'sheet-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) closeRequirementsSheet(); });
  }
  backdrop.innerHTML =
    '<div class="sheet-panel form">' +
      '<div class="sheet-handle"></div>' +
      '<div class="sheet-title-row"><span class="sheet-title">' + escapeHtml(t('scholarship_programs.requirements_title', 'Requirements')) + ' — ' + escapeHtml(program.title) + '</span>' +
        '<button type="button" class="sheet-close-btn" id="reqCloseBtn">' + icon('close', { size: 16, color: 'var(--subtle)' }) + '</button></div>' +
      '<div id="reqListWrap"></div>' +
      '<button type="button" class="util-save-btn pill" id="reqAddBtn" style="margin-top:12px;">' + escapeHtml(t('scholarship_programs.add_requirement_btn', '+ Add Requirement')) + '</button>' +
    '</div>';
  document.getElementById('reqCloseBtn').addEventListener('click', closeRequirementsSheet);
  document.getElementById('reqAddBtn').addEventListener('click', () => openRequirementForm(token, program, null));
  backdrop.classList.add('open');
  loadRequirements(token, program);
}
function closeRequirementsSheet() {
  document.getElementById('reqBackdrop')?.classList.remove('open');
}
function loadRequirements(token, program) {
  const wrap = document.getElementById('reqListWrap');
  if (!wrap) return;
  wrap.innerHTML = '<div class="list-loading">' + escapeHtml(t('common.loading', 'Loading…')) + '</div>';
  fetchScholarshipRequirements(token, program.id).then(list => {
    currentRequirements = list;
    renderRequirementsList(token);
  }).catch(() => {
    wrap.innerHTML = '<div class="list-error">' + escapeHtml(t('scholarship_programs.requirements_load_failed', 'Could not load requirements.')) + '</div>';
  });
}
function renderRequirementsList(token) {
  const wrap = document.getElementById('reqListWrap');
  if (!wrap) return;
  if (currentRequirements.length === 0) {
    wrap.innerHTML = '<div class="util-row"><span class="util-row-title" style="color:var(--subtle);">' + escapeHtml(t('scholarship_programs.no_requirements', 'No requirements yet.')) + '</span></div>';
    return;
  }
  wrap.innerHTML = '';
  currentRequirements.forEach(r => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'util-row';
    row.innerHTML =
      '<span class="util-row-icon">' + icon(r.requirement_type === 'document' ? 'filetext' : 'clipboard', { size: 16, color: 'var(--ink)' }) + '</span>' +
      '<span class="util-row-title">' + escapeHtml(r.title) +
        (!r.is_required ? ' <span class="mini-chip warn" style="margin-left:6px;">' + escapeHtml(t('scholarship_programs.optional_chip', 'Optional')) + '</span>' : '') +
        (r.may_require_translation ? ' <span class="mini-chip danger" style="margin-left:6px;">' + escapeHtml(t('scholarship_programs.translation_badge', 'Translation')) + '</span>' : '') + '</span>' +
      '<span class="util-row-value">' + escapeHtml(requirementTypeLabel(r.requirement_type)) + '</span>' +
      icon('chevron', { size: 18, color: 'var(--subtle)' });
    row.addEventListener('click', () => openRequirementActions(token, r));
    wrap.appendChild(row);
  });
}
function openRequirementActions(token, r) {
  openActionSheet(r.title, [
    { icon: 'pencil', label: t('scholarship_programs.edit_requirement_label', 'Edit'), desc: t('scholarship_programs.edit_requirement_desc', 'Change title, type, or whether it is required'), onPress: () => openRequirementForm(token, currentRequirementsProgram, r) },
    { icon: 'trash', label: t('scholarship_programs.delete_requirement_label', 'Delete'), desc: t('scholarship_programs.delete_requirement_desc', 'Remove this requirement'), onPress: () => {
      deleteScholarshipRequirement(token, r.id).then(() => {
        showToast(t('scholarship_programs.requirement_deleted_toast', 'Requirement deleted.'));
        loadRequirements(token, currentRequirementsProgram);
        // Re-opening this program's action sheet was already closed by the
        // click above; the requirements backdrop itself was left open the
        // whole time (only the actionSheet on top of it closes), so no
        // need to re-open anything else here.
      }).catch(err => showToast(err && err.message ? err.message : t('scholarship_programs.delete_requirement_failed', 'Could not delete this requirement.')));
    }},
  ]);
}

function requirementTypeOptionsHtml(selected) {
  return REQUIREMENT_TYPES.map(rt => '<option value="' + rt + '"' + (rt === selected ? ' selected' : '') + '>' + escapeHtml(requirementTypeLabel(rt)) + '</option>').join('');
}
function openRequirementForm(token, program, existing) {
  let backdrop = document.getElementById('rfBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'rfBackdrop';
    backdrop.className = 'sheet-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.classList.remove('open'); });
  }
  backdrop.innerHTML =
    '<div class="sheet-panel form">' +
      '<div class="sheet-handle"></div>' +
      '<div class="sheet-title-row"><span class="sheet-title">' + escapeHtml(existing ? t('scholarship_programs.edit_requirement_title', 'Edit Requirement') : t('scholarship_programs.add_requirement_title', 'Add Requirement')) + '</span>' +
        '<button type="button" class="sheet-close-btn" id="rfCloseBtn">' + icon('close', { size: 16, color: 'var(--subtle)' }) + '</button></div>' +
      '<label class="util-label" style="margin-top:0;">' + escapeHtml(t('scholarship_programs.requirement_title_label', 'Title')) + '</label>' +
      '<input type="text" id="rfTitle" class="util-input" placeholder="' + escapeHtml(t('scholarship_programs.requirement_title_placeholder', 'e.g. Proof of enrollment')) + '" value="' + (existing ? escapeHtml(existing.title) : '') + '" />' +
      '<label class="util-label">' + escapeHtml(t('scholarship_programs.requirement_description_label', 'Description (optional)')) + '</label>' +
      '<textarea id="rfDescription" class="util-input" placeholder="' + escapeHtml(t('scholarship_programs.requirement_description_placeholder', 'Extra detail shown to applicants')) + '">' + (existing && existing.description ? escapeHtml(existing.description) : '') + '</textarea>' +
      '<label class="util-label">' + escapeHtml(t('scholarship_programs.requirement_type_label', 'Type')) + '</label>' +
      '<select id="rfType" class="util-input">' + requirementTypeOptionsHtml(existing ? existing.requirement_type : 'document') + '</select>' +
      '<label class="util-row" style="padding:10px 0;">' +
        '<span class="util-row-title">' + escapeHtml(t('scholarship_programs.requirement_required_toggle', 'Required')) + '</span>' +
        '<span class="switch"><input type="checkbox" id="rfRequired"' + (!existing || existing.is_required ? ' checked' : '') + '><span class="switch-track"></span></span>' +
      '</label>' +
      '<label class="util-row" style="padding:10px 0;">' +
        '<span class="util-row-title">' + escapeHtml(t('scholarship_programs.requirement_translation_toggle', 'May require translation')) +
          '<br><span style="font-weight:400;color:var(--subtle);font-size:12px;">' + escapeHtml(t('scholarship_programs.requirement_translation_hint', 'Shows a translation-required badge to applicants')) + '</span></span>' +
        '<span class="switch"><input type="checkbox" id="rfMayRequireTranslation"' + (existing && existing.may_require_translation ? ' checked' : '') + '><span class="switch-track"></span></span>' +
      '</label>' +
      '<div class="sheet-form-actions">' +
        '<button type="button" class="sheet-btn-secondary" id="rfCancelBtn">' + escapeHtml(t('common.cancel', 'Cancel')) + '</button>' +
        '<button type="button" class="sheet-btn-primary" id="rfSubmitBtn"><span id="rfSubmitLabel">' + escapeHtml(t('common.save', 'Save')) + '</span></button>' +
      '</div>' +
    '</div>';
  document.getElementById('rfCloseBtn').addEventListener('click', () => backdrop.classList.remove('open'));
  document.getElementById('rfCancelBtn').addEventListener('click', () => backdrop.classList.remove('open'));
  document.getElementById('rfSubmitBtn').addEventListener('click', () => {
    const title = document.getElementById('rfTitle').value.trim();
    if (!title) { showToast(t('scholarship_programs.requirement_title_required', 'A title is required.')); return; }
    const input = {
      program_id: program.id,
      title,
      description: document.getElementById('rfDescription').value.trim() || null,
      requirement_type: document.getElementById('rfType').value,
      is_required: document.getElementById('rfRequired').checked,
      may_require_translation: document.getElementById('rfMayRequireTranslation').checked,
    };
    const btn = document.getElementById('rfSubmitBtn');
    const label = document.getElementById('rfSubmitLabel');
    btn.disabled = true; label.innerHTML = '<span class="util-spinner"></span>';
    const req = existing
      ? updateScholarshipRequirement(token, existing.id, input)
      : createScholarshipRequirement(token, input);
    req.then(() => {
      backdrop.classList.remove('open');
      showToast(existing ? t('scholarship_programs.requirement_updated_toast', 'Requirement updated.') : t('scholarship_programs.requirement_added_toast', 'Requirement added.'));
      loadRequirements(token, program);
    }).catch(err => showToast(err && err.message ? err.message : t('scholarship_programs.requirement_save_failed', 'Could not save this requirement.')))
      .finally(() => { btn.disabled = false; label.textContent = t('common.save', 'Save'); });
  });
  backdrop.classList.add('open');
}

// ── Boot ──
function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(t('scholarship_programs.title', 'Scholarship Programs'), t('scholarship_programs.subtitle', 'Manage scholarship programs, their requirements, and deadlines'), 'superadmin-dashboard.php', {
      label: t('scholarship_programs.add_action', '+ Add'), onClick: () => openProgramForm(getStoredToken(), null),
    });
}
renderHeaderText();
onLocaleChange(renderHeaderText);

function load(token) {
  document.getElementById('listContent').innerHTML = '<div class="list-loading">' + escapeHtml(t('common.loading', 'Loading…')) + '</div>';
  Promise.all([fetchScholarshipPrograms(token), fetchScholarshipProviders(token)]).then(([programs, providers]) => {
    allPrograms = programs;
    allProviders = providers;
    renderList(token);
  }).catch(() => {
    lastListRendered = false;
    document.getElementById('listContent').innerHTML =
      '<div class="list-error">' + escapeHtml(t('scholarship_programs.load_failed', 'Failed to load scholarship programs.')) + '<br><button type="button" class="list-retry-btn" id="retryBtn">' + escapeHtml(t('common.retry', 'Try again')) + '</button></div>';
    document.getElementById('retryBtn')?.addEventListener('click', () => load(token));
  });
}

guardDashboard(['superadmin', 'platform_staff'], function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  if (!requireScholarshipStaffAccess(user)) return;
  renderStatusFilterRow(token);
  load(token);
});
