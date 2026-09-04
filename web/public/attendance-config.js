// Attendance status + capture-method builder, mirroring
// AttendanceConfigScreen.tsx (attendanceConfigService.ts:
// admin_attendance_status_*, admin_attendance_method_*).

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(t('attendance_config.title', 'Attendance Config'), t('attendance_config.subtitle', 'Statuses and capture methods for your school'), 'admin-dashboard.php');
}
renderHeaderText();
onLocaleChange(renderHeaderText);

let statuses = [];
let methods = [];
let acBooted = false;
let acToken = null;

function codeFromLabel(label) { return label.trim().toLowerCase().replace(/\s+/g, '_'); }

// ── Statuses ──
function renderStatuses(token) {
  const card = document.getElementById('statusesCard');
  if (statuses.length === 0) {
    card.innerHTML = '<div class="util-row"><span class="util-row-title" style="color:var(--subtle);">' + escapeHtml(t('attendance_config.no_statuses', 'No attendance statuses yet.')) + '</span></div>';
    return;
  }
  card.innerHTML = '';
  statuses.forEach(s => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'util-row';
    const dotColor = s.color || 'var(--emerald)';
    row.innerHTML =
      '<span class="util-row-icon" style="background:' + dotColor + '22;color:' + dotColor + ';">' + icon('flag', { size: 15, color: dotColor }) + '</span>' +
      '<span class="util-row-title">' + escapeHtml(s.label) +
        (s.counts_as_present ? ' <span class="mini-chip ok" style="margin-left:6px;">' + escapeHtml(t('attendance_config.present_chip', 'Present')) + '</span>' : '') +
        (!s.is_active ? ' <span class="mini-chip warn" style="margin-left:6px;">' + escapeHtml(t('attendance_config.inactive_chip', 'Inactive')) + '</span>' : '') +
        (s.is_system_default ? ' <span class="mini-chip" style="margin-left:6px;background:#EFEFF1;color:var(--subtle);">' + escapeHtml(t('attendance_config.default_chip', 'Default')) + '</span>' : '') + '</span>' +
      icon('chevron', { size: 18, color: 'var(--subtle)' });
    row.addEventListener('click', () => openStatusActions(token, s));
    card.appendChild(row);
  });
}

function openStatusActions(token, s) {
  const actions = [{ icon: 'gear', label: t('attendance_config.edit_label', 'Edit'), desc: t('attendance_config.edit_status_desc', 'Change label, color, or behavior'), onPress: () => openStatusForm(token, s) }];
  if (!s.is_system_default) {
    actions.push({ icon: 'trash', label: t('attendance_config.delete_label', 'Delete'), desc: t('attendance_config.delete_status_desc', 'Remove this status'), onPress: () => {
      if (!confirm(t('attendance_config.delete_confirm', 'Delete "{name}"?').replace('{name}', s.label))) return;
      authedPost('/admin_attendance_status_delete', token, { id: s.id }).then(() => { showToast(t('attendance_config.status_deleted_toast', 'Status deleted.')); loadStatuses(token); })
        .catch(err => showToast(err.message || t('attendance_config.delete_failed', 'Could not delete.')));
    }});
  }
  openActionSheet(s.label, actions);
}

function openStatusForm(token, existing) {
  let backdrop = document.getElementById('statusFormBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'statusFormBackdrop';
    backdrop.className = 'sheet-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.classList.remove('open'); });
  }
  backdrop.innerHTML =
    '<div class="sheet-panel form">' +
      '<div class="sheet-handle"></div>' +
      '<div class="sheet-title-row"><span class="sheet-title">' + escapeHtml(existing ? t('attendance_config.edit_status_title', 'Edit Status') : t('attendance_config.add_status_title', 'Add Status')) + '</span>' +
        '<button type="button" class="sheet-close-btn" id="asCloseBtn">' + icon('close', { size: 16, color: 'var(--subtle)' }) + '</button></div>' +
      '<label class="util-label" style="margin-top:0;">' + escapeHtml(t('attendance_config.label_field', 'Label')) + '</label>' +
      '<input type="text" id="asLabel" class="util-input" placeholder="' + escapeHtml(t('attendance_config.status_label_placeholder', 'e.g. Excused Absence')) + '" value="' + (existing ? escapeHtml(existing.label) : '') + '" />' +
      '<label class="util-label">' + escapeHtml(t('attendance_config.color_field', 'Color')) + '</label>' +
      '<input type="color" id="asColor" class="util-input" style="height:44px;padding:4px;" value="' + (existing && existing.color ? existing.color : '#1C1C1E') + '" />' +
      '<label class="util-row" style="padding:10px 0;">' +
        '<span class="util-row-title">' + escapeHtml(t('attendance_config.counts_present_label', 'Counts as present')) + '</span>' +
        '<span class="switch"><input type="checkbox" id="asPresent"' + (existing && existing.counts_as_present ? ' checked' : '') + '><span class="switch-track"></span></span>' +
      '</label>' +
      '<label class="util-row" style="padding:10px 0;border-top:1px solid var(--card-border);">' +
        '<span class="util-row-title">' + escapeHtml(t('attendance_config.requires_remark_label', 'Requires remark')) + '</span>' +
        '<span class="switch"><input type="checkbox" id="asRemark"' + (existing && existing.requires_remark ? ' checked' : '') + '><span class="switch-track"></span></span>' +
      '</label>' +
      '<label class="util-row" style="padding:10px 0;border-top:1px solid var(--card-border);">' +
        '<span class="util-row-title">' + escapeHtml(t('attendance_config.active_label', 'Active')) + '</span>' +
        '<span class="switch"><input type="checkbox" id="asActive"' + (!existing || existing.is_active ? ' checked' : '') + '><span class="switch-track"></span></span>' +
      '</label>' +
      '<div class="sheet-form-actions">' +
        '<button type="button" class="sheet-btn-secondary" id="asCancelBtn">' + escapeHtml(t('common.cancel', 'Cancel')) + '</button>' +
        '<button type="button" class="sheet-btn-primary" id="asSubmitBtn"><span id="asSubmitLabel">' + escapeHtml(t('attendance_config.save', 'Save')) + '</span></button>' +
      '</div>' +
    '</div>';
  document.getElementById('asCloseBtn').addEventListener('click', () => backdrop.classList.remove('open'));
  document.getElementById('asCancelBtn').addEventListener('click', () => backdrop.classList.remove('open'));
  document.getElementById('asSubmitBtn').addEventListener('click', () => {
    const label = document.getElementById('asLabel').value.trim();
    if (!label) { showToast(t('attendance_config.label_required', 'A label is required.')); return; }
    const draft = {
      id: existing ? existing.id : undefined,
      code: existing ? undefined : codeFromLabel(label),
      label,
      color: document.getElementById('asColor').value,
      counts_as_present: document.getElementById('asPresent').checked,
      requires_remark: document.getElementById('asRemark').checked,
      is_active: document.getElementById('asActive').checked,
    };
    const btn = document.getElementById('asSubmitBtn');
    const lbl = document.getElementById('asSubmitLabel');
    btn.disabled = true; lbl.innerHTML = '<span class="util-spinner"></span>';
    authedPost('/admin_attendance_status_save', token, draft).then(() => {
      backdrop.classList.remove('open');
      showToast(existing ? t('attendance_config.status_updated_toast', 'Status updated.') : t('attendance_config.status_added_toast', 'Status added.'));
      loadStatuses(token);
    }).catch(err => showToast(err.message || t('attendance_config.save_failed', 'Could not save.')))
      .finally(() => { btn.disabled = false; lbl.textContent = t('attendance_config.save', 'Save'); });
  });
  backdrop.classList.add('open');
}

function loadStatuses(token) {
  document.getElementById('statusesCard').innerHTML = '<div class="util-row"><span class="util-row-title" style="color:var(--subtle);">' + escapeHtml(t('common.loading', 'Loading…')) + '</span></div>';
  authedPost('/admin_attendance_status_list', token).then(d => {
    statuses = d.statuses || [];
    renderStatuses(token);
  }).catch(() => { document.getElementById('statusesCard').innerHTML = '<div class="util-row"><span class="util-row-title" style="color:var(--subtle);">' + escapeHtml(t('attendance_config.load_statuses_failed', 'Could not load statuses.')) + '</span></div>'; });
}

// ── Methods ──
function renderMethods(token) {
  const card = document.getElementById('methodsCard');
  if (methods.length === 0) {
    card.innerHTML = '<div class="util-row"><span class="util-row-title" style="color:var(--subtle);">' + escapeHtml(t('attendance_config.no_methods', 'No capture methods yet.')) + '</span></div>';
    return;
  }
  card.innerHTML = '';
  methods.forEach(m => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'util-row';
    row.innerHTML =
      '<span class="util-row-icon">' + icon('camera', { size: 15, color: 'var(--ink)' }) + '</span>' +
      '<span class="util-row-title">' + escapeHtml(m.label) +
        (!m.is_active ? ' <span class="mini-chip warn" style="margin-left:6px;">' + escapeHtml(t('attendance_config.inactive_chip', 'Inactive')) + '</span>' : '') +
        (m.is_system_default ? ' <span class="mini-chip" style="margin-left:6px;background:#EFEFF1;color:var(--subtle);">' + escapeHtml(t('attendance_config.default_chip', 'Default')) + '</span>' : '') + '</span>' +
      icon('chevron', { size: 18, color: 'var(--subtle)' });
    row.addEventListener('click', () => openMethodActions(token, m));
    card.appendChild(row);
  });
}

function openMethodActions(token, m) {
  const actions = [
    { icon: 'gear', label: t('attendance_config.edit_label', 'Edit'), desc: t('attendance_config.edit_method_desc', 'Change label or active state'), onPress: () => openMethodForm(token, m) },
    { icon: m.is_active ? 'eyeoff' : 'eye', label: m.is_active ? t('attendance_config.deactivate_label', 'Deactivate') : t('attendance_config.activate_label', 'Activate'), desc: m.is_active ? t('attendance_config.deactivate_desc', 'Hide from attendance capture') : t('attendance_config.activate_desc', 'Allow this capture method'), onPress: () => {
      authedPost('/admin_attendance_method_save', token, { id: m.id, label: m.label, is_active: !m.is_active }).then(() => { showToast(t('attendance_config.updated_toast', 'Updated.')); loadMethods(token); })
        .catch(err => showToast(err.message || t('attendance_config.update_failed', 'Could not update.')));
    }},
  ];
  if (!m.is_system_default) {
    actions.push({ icon: 'trash', label: t('attendance_config.delete_label', 'Delete'), desc: t('attendance_config.delete_method_desc', 'Remove this capture method'), onPress: () => {
      if (!confirm(t('attendance_config.delete_confirm', 'Delete "{name}"?').replace('{name}', m.label))) return;
      authedPost('/admin_attendance_method_delete', token, { id: m.id }).then(() => { showToast(t('attendance_config.method_deleted_toast', 'Method deleted.')); loadMethods(token); })
        .catch(err => showToast(err.message || t('attendance_config.delete_failed', 'Could not delete.')));
    }});
  }
  openActionSheet(m.label, actions);
}

function openMethodForm(token, existing) {
  let backdrop = document.getElementById('methodFormBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'methodFormBackdrop';
    backdrop.className = 'sheet-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.classList.remove('open'); });
  }
  backdrop.innerHTML =
    '<div class="sheet-panel form">' +
      '<div class="sheet-handle"></div>' +
      '<div class="sheet-title-row"><span class="sheet-title">' + escapeHtml(existing ? t('attendance_config.edit_method_title', 'Edit Method') : t('attendance_config.add_method_title', 'Add Method')) + '</span>' +
        '<button type="button" class="sheet-close-btn" id="amCloseBtn">' + icon('close', { size: 16, color: 'var(--subtle)' }) + '</button></div>' +
      '<label class="util-label" style="margin-top:0;">' + escapeHtml(t('attendance_config.label_field', 'Label')) + '</label>' +
      '<input type="text" id="amLabel" class="util-input" placeholder="' + escapeHtml(t('attendance_config.method_label_placeholder', 'e.g. QR Scan')) + '" value="' + (existing ? escapeHtml(existing.label) : '') + '" />' +
      '<label class="util-row" style="padding:10px 0;">' +
        '<span class="util-row-title">' + escapeHtml(t('attendance_config.active_label', 'Active')) + '</span>' +
        '<span class="switch"><input type="checkbox" id="amActive"' + (!existing || existing.is_active ? ' checked' : '') + '><span class="switch-track"></span></span>' +
      '</label>' +
      '<div class="sheet-form-actions">' +
        '<button type="button" class="sheet-btn-secondary" id="amCancelBtn">' + escapeHtml(t('common.cancel', 'Cancel')) + '</button>' +
        '<button type="button" class="sheet-btn-primary" id="amSubmitBtn"><span id="amSubmitLabel">' + escapeHtml(t('attendance_config.save', 'Save')) + '</span></button>' +
      '</div>' +
    '</div>';
  document.getElementById('amCloseBtn').addEventListener('click', () => backdrop.classList.remove('open'));
  document.getElementById('amCancelBtn').addEventListener('click', () => backdrop.classList.remove('open'));
  document.getElementById('amSubmitBtn').addEventListener('click', () => {
    const label = document.getElementById('amLabel').value.trim();
    if (!label) { showToast(t('attendance_config.label_required', 'A label is required.')); return; }
    const draft = {
      id: existing ? existing.id : undefined,
      code: existing ? undefined : codeFromLabel(label),
      label,
      is_active: document.getElementById('amActive').checked,
    };
    const btn = document.getElementById('amSubmitBtn');
    const lbl = document.getElementById('amSubmitLabel');
    btn.disabled = true; lbl.innerHTML = '<span class="util-spinner"></span>';
    authedPost('/admin_attendance_method_save', token, draft).then(() => {
      backdrop.classList.remove('open');
      showToast(existing ? t('attendance_config.method_updated_toast', 'Method updated.') : t('attendance_config.method_added_toast', 'Method added.'));
      loadMethods(token);
      if (!existing) notifySetupItemSaved(token);
    }).catch(err => showToast(err.message || t('attendance_config.save_failed', 'Could not save.')))
      .finally(() => { btn.disabled = false; lbl.textContent = t('attendance_config.save', 'Save'); });
  });
  backdrop.classList.add('open');
}

function loadMethods(token) {
  document.getElementById('methodsCard').innerHTML = '<div class="util-row"><span class="util-row-title" style="color:var(--subtle);">' + escapeHtml(t('common.loading', 'Loading…')) + '</span></div>';
  authedPost('/admin_attendance_method_list', token).then(d => {
    methods = d.methods || [];
    renderMethods(token);
  }).catch(() => { document.getElementById('methodsCard').innerHTML = '<div class="util-row"><span class="util-row-title" style="color:var(--subtle);">' + escapeHtml(t('attendance_config.load_methods_failed', 'Could not load methods.')) + '</span></div>'; });
}

onLocaleChange(() => {
  if (!acBooted) return;
  renderStatuses(acToken);
  renderMethods(acToken);
});

guardDashboard('admin', function (user, token) {
  acToken = token;
  document.getElementById('routeGuardSplash')?.remove();
  document.getElementById('utilBody').style.display = '';
  document.getElementById('addStatusBtn').addEventListener('click', () => openStatusForm(token, null));
  document.getElementById('addMethodBtn').addEventListener('click', () => openMethodForm(token, null));
  loadStatuses(token);
  loadMethods(token);
  acBooted = true;
});
