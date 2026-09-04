// School admin's checklist setup for Taqdim Assistant / Translation
// Service (TaqdimTranslationRequirementController). Same shape as
// scholarship-programs.js's per-program "Manage Requirements" sheet, but
// standalone (no program wrapper) since a school has exactly one
// checklist per feature - see that page's requirementList/Create/Update/
// Delete handlers for the pattern this mirrors.

function qsParam(name) { return new URLSearchParams(window.location.search).get(name); }
const REQ_FEATURE = qsParam('feature') === 'translation' ? 'translation' : 'taqdim';
const REQUIREMENT_TYPES = ['document', 'statement'];

let currentRequirements = [];
let lastRendered = false;

function requirementTypeLabel(rt) { return t('taqdim_translation_requirements.req_type_' + rt, rt.charAt(0).toUpperCase() + rt.slice(1)); }
function featureTitle() {
  return REQ_FEATURE === 'translation'
    ? t('taqdim_translation_requirements.translation_title', 'Translation Requirements')
    : t('taqdim_translation_requirements.taqdim_title', 'Taqdim Requirements');
}

function renderRequirementsList(token) {
  lastRendered = true;
  const wrap = document.getElementById('requirementsList');
  if (currentRequirements.length === 0) {
    wrap.innerHTML = '<div class="util-row"><span class="util-row-title" style="color:var(--subtle);">' + escapeHtml(t('taqdim_translation_requirements.no_requirements', 'No requirements yet. Students will see an empty checklist until you add some.')) + '</span></div>';
    return;
  }
  wrap.innerHTML = '';
  currentRequirements.forEach(r => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'util-row';
    row.innerHTML =
      '<span class="util-row-icon">' + icon(r.requirement_type === 'document' ? 'filetext' : 'clipboard', { size: 16, color: 'var(--ink)' }) + '</span>' +
      '<span class="util-row-title">' + escapeHtml(r.title) + (!r.is_required ? ' <span class="mini-chip warn">' + escapeHtml(t('taqdim_translation_requirements.optional_chip', 'Optional')) + '</span>' : '') + '</span>' +
      '<span class="util-row-value">' + escapeHtml(requirementTypeLabel(r.requirement_type)) + '</span>';
    row.addEventListener('click', () => openRequirementActions(token, r));
    wrap.appendChild(row);
  });
}
onLocaleChange(() => { if (lastRendered) renderRequirementsList(getStoredToken()); });

function openRequirementActions(token, r) {
  openActionSheet(r.title, [
    { icon: 'pencil', label: t('taqdim_translation_requirements.edit_label', 'Edit'), desc: t('taqdim_translation_requirements.edit_desc', 'Change title, type, or whether it is required'), onPress: () => openRequirementForm(token, r) },
    { icon: 'trash', label: t('taqdim_translation_requirements.delete_label', 'Delete'), desc: t('taqdim_translation_requirements.delete_desc', 'Remove this requirement'), onPress: () => {
      deleteTaqdimTranslationRequirement(token, r.id).then(() => {
        showToast(t('taqdim_translation_requirements.deleted_toast', 'Requirement deleted.'));
        loadRequirements(token);
      }).catch(err => showToast(err && err.message ? err.message : t('taqdim_translation_requirements.delete_failed', 'Could not delete this requirement.')));
    }},
  ]);
}

function requirementTypeOptionsHtml(selected) {
  return REQUIREMENT_TYPES.map(rt => '<option value="' + rt + '"' + (rt === selected ? ' selected' : '') + '>' + escapeHtml(requirementTypeLabel(rt)) + '</option>').join('');
}
function openRequirementForm(token, existing) {
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
      '<div class="sheet-title-row"><span class="sheet-title">' + escapeHtml(existing ? t('taqdim_translation_requirements.edit_title', 'Edit Requirement') : t('taqdim_translation_requirements.add_title', 'Add Requirement')) + '</span>' +
        '<button type="button" class="sheet-close-btn" id="rfCloseBtn">' + icon('close', { size: 16, color: 'var(--subtle)' }) + '</button></div>' +
      '<label class="util-label" style="margin-top:0;">' + escapeHtml(t('taqdim_translation_requirements.title_label', 'Title')) + '</label>' +
      '<input type="text" id="rfTitle" class="util-input" placeholder="' + escapeHtml(t('taqdim_translation_requirements.title_placeholder', 'e.g. CV, Motivation Letter')) + '" value="' + (existing ? escapeHtml(existing.title) : '') + '" />' +
      '<label class="util-label">' + escapeHtml(t('taqdim_translation_requirements.description_label', 'Description (optional)')) + '</label>' +
      '<textarea id="rfDescription" class="util-input" placeholder="' + escapeHtml(t('taqdim_translation_requirements.description_placeholder', 'Extra detail shown to students')) + '">' + (existing && existing.description ? escapeHtml(existing.description) : '') + '</textarea>' +
      '<label class="util-label">' + escapeHtml(t('taqdim_translation_requirements.type_label', 'Type')) + '</label>' +
      '<select id="rfType" class="util-input">' + requirementTypeOptionsHtml(existing ? existing.requirement_type : 'document') + '</select>' +
      '<label class="util-row" style="padding:10px 0;">' +
        '<span class="util-row-title">' + escapeHtml(t('taqdim_translation_requirements.required_toggle', 'Required')) + '</span>' +
        '<span class="switch"><input type="checkbox" id="rfRequired"' + (!existing || existing.is_required ? ' checked' : '') + '><span class="switch-track"></span></span>' +
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
    if (!title) { showToast(t('taqdim_translation_requirements.title_required', 'A title is required.')); return; }
    const input = {
      feature: REQ_FEATURE,
      title,
      description: document.getElementById('rfDescription').value.trim() || null,
      requirement_type: document.getElementById('rfType').value,
      is_required: document.getElementById('rfRequired').checked,
    };
    const btn = document.getElementById('rfSubmitBtn');
    const label = document.getElementById('rfSubmitLabel');
    btn.disabled = true; label.innerHTML = '<span class="util-spinner"></span>';
    const req = existing
      ? updateTaqdimTranslationRequirement(token, existing.id, input)
      : createTaqdimTranslationRequirement(token, input);
    req.then(() => {
      backdrop.classList.remove('open');
      showToast(existing ? t('taqdim_translation_requirements.updated_toast', 'Requirement updated.') : t('taqdim_translation_requirements.added_toast', 'Requirement added.'));
      loadRequirements(token);
    }).catch(err => showToast(err && err.message ? err.message : t('taqdim_translation_requirements.save_failed', 'Could not save this requirement.')))
      .finally(() => { btn.disabled = false; label.textContent = t('common.save', 'Save'); });
  });
  backdrop.classList.add('open');
}

// ── Boot ──
function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(featureTitle(), t('taqdim_translation_requirements.subtitle', 'Documents and questions students must complete'), REQ_FEATURE === 'translation' ? 'translation-dashboard.php' : 'taqdim-dashboard.php');
}
renderHeaderText();
onLocaleChange(renderHeaderText);

function loadRequirements(token) {
  document.getElementById('requirementsList').innerHTML = '<div class="list-loading">' + escapeHtml(t('common.loading', 'Loading…')) + '</div>';
  fetchTaqdimTranslationRequirements(token, REQ_FEATURE).then(list => {
    currentRequirements = list;
    renderRequirementsList(token);
  }).catch(() => {
    lastRendered = false;
    document.getElementById('requirementsList').innerHTML =
      '<div class="list-error">' + escapeHtml(t('taqdim_translation_requirements.load_failed', 'Failed to load requirements.')) + '<br><button type="button" class="list-retry-btn" id="retryBtn">' + escapeHtml(t('common.retry', 'Try again')) + '</button></div>';
    document.getElementById('retryBtn')?.addEventListener('click', () => loadRequirements(token));
  });
}

guardDashboard('admin', function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  if (!user.school_features || !user.school_features[REQ_FEATURE]) {
    window.location.href = 'admin-dashboard.php';
    return;
  }
  document.getElementById('utilBody').style.display = '';
  document.getElementById('addRequirementBtn').addEventListener('click', () => openRequirementForm(token, null));
  loadRequirements(token);
});
