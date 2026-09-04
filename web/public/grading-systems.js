// Grading Systems builder, mirroring GradingSystemsScreen.tsx
// (adminAcademicCatalogService.ts: admin_grading_systems_*).

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(t('grading_systems.title', 'Grading Systems'), t('grading_systems.subtitle', 'Build grading systems and grade scales'), 'admin-dashboard.php');
}
renderHeaderText();
onLocaleChange(renderHeaderText);

const GRADING_SYSTEM_TYPES = [
  'percentage', 'letter', 'gpa', 'competency', 'pass_fail', 'memorization',
  'behavior', 'attendance', 'oral', 'written', 'practical',
  'islamic_studies', 'arabic', 'quarterly', 'custom',
];
function humanize(code) { return code.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }
function typeLabel(code) { return t('grading_systems.type_' + code, humanize(code)); }

let systems = [];
let gsBooted = false;
let gsToken = null;

function renderList(token) {
  const card = document.getElementById('gsCard');
  if (systems.length === 0) {
    card.innerHTML = '<div class="util-row"><span class="util-row-title" style="color:var(--subtle);">' + escapeHtml(t('grading_systems.empty', 'No grading systems yet.')) + '</span></div>';
    return;
  }
  card.innerHTML = '';
  systems.forEach(s => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'util-row';
    row.innerHTML =
      '<span class="util-row-icon">' + icon('gradcap', { size: 16, color: 'var(--ink)' }) + '</span>' +
      '<span class="util-row-title">' + escapeHtml(s.name) +
        (s.is_default ? ' <span class="mini-chip ok" style="margin-left:6px;">' + escapeHtml(t('grading_systems.default_chip', 'Default')) + '</span>' : '') +
        (s.status === 'inactive' ? ' <span class="mini-chip warn" style="margin-left:6px;">' + escapeHtml(t('grading_systems.inactive_chip', 'Inactive')) + '</span>' : '') + '</span>' +
      '<span class="util-row-value">' + escapeHtml(typeLabel(s.type)) + '</span>' +
      icon('chevron', { size: 18, color: 'var(--subtle)' });
    row.addEventListener('click', () => openActions(token, s));
    card.appendChild(row);
  });
}

function openActions(token, s) {
  openActionSheet(s.name, [
    { icon: 'gear', label: t('grading_systems.edit_label', 'Edit'), desc: t('grading_systems.edit_desc', 'Change name, type, or status'), onPress: () => openForm(token, s) },
    { icon: 'trash', label: t('grading_systems.delete_label', 'Delete'), desc: t('grading_systems.delete_desc', 'Remove this grading system'), onPress: () => {
      if (!confirm(t('grading_systems.delete_confirm', 'Delete "{name}"?').replace('{name}', s.name))) return;
      authedPost('/admin_grading_systems_delete', token, { grading_system_id: s.id }).then(() => {
        showToast(t('grading_systems.deleted_toast', 'Grading system deleted.')); load(token);
      }).catch(err => showToast(err.message || t('grading_systems.delete_failed', 'Could not delete. It may still have grade scales.')));
    }},
  ]);
}

function typeOptionsHtml(selected) {
  return GRADING_SYSTEM_TYPES.map(code => '<option value="' + code + '"' + (code === selected ? ' selected' : '') + '>' + escapeHtml(typeLabel(code)) + '</option>').join('');
}

function openForm(token, existing) {
  let backdrop = document.getElementById('gsFormBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'gsFormBackdrop';
    backdrop.className = 'sheet-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.classList.remove('open'); });
  }
  backdrop.innerHTML =
    '<div class="sheet-panel form">' +
      '<div class="sheet-handle"></div>' +
      '<div class="sheet-title-row"><span class="sheet-title">' + escapeHtml(existing ? t('grading_systems.edit_title', 'Edit Grading System') : t('grading_systems.add_title', 'Add Grading System')) + '</span>' +
        '<button type="button" class="sheet-close-btn" id="gsCloseBtn">' + icon('close', { size: 16, color: 'var(--subtle)' }) + '</button></div>' +
      '<label class="util-label" style="margin-top:0;">' + escapeHtml(t('grading_systems.name_label', 'Name')) + '</label>' +
      '<input type="text" id="gsName" class="util-input" placeholder="' + escapeHtml(t('grading_systems.name_placeholder', 'e.g. Standard Percentage')) + '" value="' + (existing ? escapeHtml(existing.name) : '') + '" />' +
      '<label class="util-label">' + escapeHtml(t('grading_systems.type_label', 'Type')) + '</label>' +
      '<select id="gsType" class="util-input">' + typeOptionsHtml(existing ? existing.type : 'percentage') + '</select>' +
      '<label class="util-label">' + escapeHtml(t('grading_systems.description_label', 'Description (optional)')) + '</label>' +
      '<input type="text" id="gsDesc" class="util-input" placeholder="' + escapeHtml(t('grading_systems.description_placeholder', 'Short description')) + '" value="' + (existing && existing.description ? escapeHtml(existing.description) : '') + '" />' +
      '<label class="util-row" style="padding:10px 0;">' +
        '<span class="util-row-title">' + escapeHtml(t('grading_systems.default_toggle_label', 'Default for new subjects')) + '</span>' +
        '<span class="switch"><input type="checkbox" id="gsDefault"' + (existing && existing.is_default ? ' checked' : '') + '><span class="switch-track"></span></span>' +
      '</label>' +
      '<div class="sheet-form-actions">' +
        '<button type="button" class="sheet-btn-secondary" id="gsCancelBtn">' + escapeHtml(t('common.cancel', 'Cancel')) + '</button>' +
        '<button type="button" class="sheet-btn-primary" id="gsSubmitBtn"><span id="gsSubmitLabel">' + escapeHtml(t('grading_systems.save', 'Save')) + '</span></button>' +
      '</div>' +
    '</div>';
  document.getElementById('gsCloseBtn').addEventListener('click', () => backdrop.classList.remove('open'));
  document.getElementById('gsCancelBtn').addEventListener('click', () => backdrop.classList.remove('open'));
  document.getElementById('gsSubmitBtn').addEventListener('click', () => {
    const name = document.getElementById('gsName').value.trim();
    if (!name) { showToast(t('grading_systems.name_required', 'A name is required.')); return; }
    const input = {
      name,
      type: document.getElementById('gsType').value,
      description: document.getElementById('gsDesc').value.trim() || null,
      is_default: document.getElementById('gsDefault').checked,
    };
    const btn = document.getElementById('gsSubmitBtn');
    const label = document.getElementById('gsSubmitLabel');
    btn.disabled = true; label.innerHTML = '<span class="util-spinner"></span>';
    const req = existing
      ? authedPost('/admin_grading_systems_update', token, { grading_system_id: existing.id, ...input })
      : authedPost('/admin_grading_systems_create', token, input);
    req.then(() => {
      backdrop.classList.remove('open');
      showToast(existing ? t('grading_systems.updated_toast', 'Grading system updated.') : t('grading_systems.added_toast', 'Grading system added.'));
      load(token);
      if (!existing) notifySetupItemSaved(token);
    }).catch(err => showToast(err.message || t('grading_systems.save_failed', 'Could not save.')))
      .finally(() => { btn.disabled = false; label.textContent = t('grading_systems.save', 'Save'); });
  });
  backdrop.classList.add('open');
}

function load(token) {
  document.getElementById('gsCard').innerHTML = '<div class="util-row"><span class="util-row-title" style="color:var(--subtle);">' + escapeHtml(t('common.loading', 'Loading…')) + '</span></div>';
  authedPost('/admin_grading_systems_list', token).then(d => {
    systems = d.grading_systems || [];
    renderList(token);
  }).catch(() => { document.getElementById('gsCard').innerHTML = '<div class="util-row"><span class="util-row-title" style="color:var(--subtle);">' + escapeHtml(t('grading_systems.load_failed', 'Could not load grading systems.')) + '</span></div>'; });
}

onLocaleChange(() => { if (gsBooted) renderList(gsToken); });

guardDashboard('admin', function (user, token) {
  gsToken = token;
  document.getElementById('routeGuardSplash')?.remove();
  document.getElementById('utilBody').style.display = '';
  document.getElementById('addGsBtn').addEventListener('click', () => openForm(token, null));
  load(token);
  gsBooted = true;
});
