// Scholarship & Taqdim Assistant - Providers. The organizations/sponsors
// behind scholarship programs (a program always belongs to one provider -
// see ScholarshipProgram::provider()). Flat CRUD list, same shape as
// grading-systems.js: a single util-card of rows plus a bottom "+ Add"
// pill, no search/filter since a school's provider list is expected to
// stay short. Reached from scholarship-programs.php's "Manage Providers"
// row and from the dashboard tile in superadmin-dashboard.js.
//
// Access: primary SuperAdmin, or a platform-staff member (role_id 13)
// granted scholarship_access - see requireScholarshipStaffAccess()
// (dashboard.js) and ScholarshipProgramController::requireScholarshipStaff()
// server-side.

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(t('scholarship_providers.title', 'Scholarship Providers'), t('scholarship_providers.subtitle', 'Organizations and sponsors behind scholarship programs'), 'scholarship-programs.php');
}
renderHeaderText();
onLocaleChange(renderHeaderText);

let providers = [];
let spBooted = false;
let spToken = null;

function renderList(token) {
  const card = document.getElementById('spCard');
  if (providers.length === 0) {
    card.innerHTML = '<div class="util-row"><span class="util-row-title" style="color:var(--subtle);">' + escapeHtml(t('scholarship_providers.empty', 'No providers yet.')) + '</span></div>';
    return;
  }
  card.innerHTML = '';
  providers.forEach(p => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'util-row';
    row.innerHTML =
      '<span class="util-row-icon">' + icon('banknote', { size: 16, color: 'var(--ink)' }) + '</span>' +
      '<span class="util-row-title">' + escapeHtml(p.name) +
        (!p.is_active ? ' <span class="mini-chip danger" style="margin-left:6px;">' + escapeHtml(t('scholarship_providers.inactive_chip', 'Inactive')) + '</span>' : '') + '</span>' +
      '<span class="util-row-value">' + escapeHtml(t('scholarship_providers.programs_count', '{n} programs').replace('{n}', String(p.programs_count || 0))) + '</span>' +
      icon('chevron', { size: 18, color: 'var(--subtle)' });
    row.addEventListener('click', () => openActions(token, p));
    card.appendChild(row);
  });
}

function openActions(token, p) {
  openActionSheet(p.name, [
    { icon: 'pencil', label: t('scholarship_providers.edit_label', 'Edit'), desc: t('scholarship_providers.edit_desc', 'Change name, contact info, or status'), onPress: () => openForm(token, p) },
    { icon: 'trash', label: t('scholarship_providers.delete_label', 'Delete'), desc: t('scholarship_providers.delete_desc', 'Remove this provider'), onPress: () => confirmDelete(token, p) },
  ]);
}

function confirmDelete(token, p) {
  openActionSheet(t('scholarship_providers.confirm_delete_title', 'Delete this provider?'), [
    { icon: 'trash', label: t('scholarship_providers.confirm_delete_label', 'Yes, delete'), desc: t('scholarship_providers.confirm_delete_desc', 'This cannot be undone'), onPress: () => {
      deleteScholarshipProvider(token, p.id).then(() => {
        showToast(t('scholarship_providers.deleted_toast', 'Provider deleted.'));
        load(token);
      }).catch(err => showToast(err && err.message ? err.message : t('scholarship_providers.delete_failed', 'Could not delete. It may still have scholarship programs.')));
    }},
    { icon: 'close', label: t('common.cancel', 'Cancel'), desc: t('scholarship_providers.keep_desc', 'Keep this provider as-is'), onPress: () => {} },
  ]);
}

function openForm(token, existing) {
  let backdrop = document.getElementById('spFormBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'spFormBackdrop';
    backdrop.className = 'sheet-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.classList.remove('open'); });
  }
  backdrop.innerHTML =
    '<div class="sheet-panel form">' +
      '<div class="sheet-handle"></div>' +
      '<div class="sheet-title-row"><span class="sheet-title">' + escapeHtml(existing ? t('scholarship_providers.edit_title', 'Edit Provider') : t('scholarship_providers.add_title', 'Add Provider')) + '</span>' +
        '<button type="button" class="sheet-close-btn" id="spCloseBtn">' + icon('close', { size: 16, color: 'var(--subtle)' }) + '</button></div>' +
      '<label class="util-label" style="margin-top:0;">' + escapeHtml(t('scholarship_providers.name_label', 'Name')) + '</label>' +
      '<input type="text" id="spName" class="util-input" placeholder="' + escapeHtml(t('scholarship_providers.name_placeholder', 'e.g. Al-Noor Education Fund')) + '" value="' + (existing ? escapeHtml(existing.name) : '') + '" />' +
      '<label class="util-label">' + escapeHtml(t('scholarship_providers.description_label', 'Description (optional)')) + '</label>' +
      '<textarea id="spDescription" class="util-input" placeholder="' + escapeHtml(t('scholarship_providers.description_placeholder', 'A short description of this provider')) + '">' + (existing && existing.description ? escapeHtml(existing.description) : '') + '</textarea>' +
      '<label class="util-label">' + escapeHtml(t('scholarship_providers.website_label', 'Website (optional)')) + '</label>' +
      '<input type="text" id="spWebsite" class="util-input" placeholder="https://" value="' + (existing && existing.website ? escapeHtml(existing.website) : '') + '" />' +
      '<label class="util-label">' + escapeHtml(t('scholarship_providers.contact_email_label', 'Contact email (optional)')) + '</label>' +
      '<input type="email" id="spEmail" class="util-input" placeholder="contact@example.com" autocapitalize="none" value="' + (existing && existing.contact_email ? escapeHtml(existing.contact_email) : '') + '" />' +
      '<label class="util-label">' + escapeHtml(t('scholarship_providers.contact_phone_label', 'Contact phone (optional)')) + '</label>' +
      '<input type="tel" id="spPhone" class="util-input" value="' + (existing && existing.contact_phone ? escapeHtml(existing.contact_phone) : '') + '" />' +
      '<label class="util-row" style="padding:10px 0;">' +
        '<span class="util-row-title">' + escapeHtml(t('scholarship_providers.active_toggle_label', 'Active')) + '</span>' +
        '<span class="switch"><input type="checkbox" id="spActive"' + (!existing || existing.is_active ? ' checked' : '') + '><span class="switch-track"></span></span>' +
      '</label>' +
      '<div class="sheet-form-actions">' +
        '<button type="button" class="sheet-btn-secondary" id="spCancelBtn">' + escapeHtml(t('common.cancel', 'Cancel')) + '</button>' +
        '<button type="button" class="sheet-btn-primary" id="spSubmitBtn"><span id="spSubmitLabel">' + escapeHtml(t('common.save', 'Save')) + '</span></button>' +
      '</div>' +
    '</div>';
  document.getElementById('spCloseBtn').addEventListener('click', () => backdrop.classList.remove('open'));
  document.getElementById('spCancelBtn').addEventListener('click', () => backdrop.classList.remove('open'));
  document.getElementById('spSubmitBtn').addEventListener('click', () => {
    const name = document.getElementById('spName').value.trim();
    if (!name) { showToast(t('scholarship_providers.name_required', 'A name is required.')); return; }
    const input = {
      name,
      description: document.getElementById('spDescription').value.trim() || null,
      website: document.getElementById('spWebsite').value.trim() || null,
      contact_email: document.getElementById('spEmail').value.trim() || null,
      contact_phone: document.getElementById('spPhone').value.trim() || null,
      is_active: document.getElementById('spActive').checked,
    };
    const btn = document.getElementById('spSubmitBtn');
    const label = document.getElementById('spSubmitLabel');
    btn.disabled = true; label.innerHTML = '<span class="util-spinner"></span>';
    const req = existing
      ? updateScholarshipProvider(token, existing.id, input)
      : createScholarshipProvider(token, input);
    req.then(() => {
      backdrop.classList.remove('open');
      showToast(existing ? t('scholarship_providers.updated_toast', 'Provider updated.') : t('scholarship_providers.added_toast', 'Provider added.'));
      load(token);
    }).catch(err => showToast(err && err.message ? err.message : t('scholarship_providers.save_failed', 'Could not save.')))
      .finally(() => { btn.disabled = false; label.textContent = t('common.save', 'Save'); });
  });
  backdrop.classList.add('open');
}

function load(token) {
  document.getElementById('spCard').innerHTML = '<div class="util-row"><span class="util-row-title" style="color:var(--subtle);">' + escapeHtml(t('common.loading', 'Loading…')) + '</span></div>';
  fetchScholarshipProviders(token).then(list => {
    providers = list;
    renderList(token);
  }).catch(() => {
    document.getElementById('spCard').innerHTML = '<div class="util-row"><span class="util-row-title" style="color:var(--subtle);">' + escapeHtml(t('scholarship_providers.load_failed', 'Could not load providers.')) + '</span></div>';
  });
}

onLocaleChange(() => { if (spBooted) renderList(spToken); });

guardDashboard(['superadmin', 'platform_staff'], function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  if (!requireScholarshipStaffAccess(user)) return;
  spToken = token;
  document.getElementById('utilBody').style.display = '';
  document.getElementById('addSpBtn').addEventListener('click', () => openForm(token, null));
  load(token);
  spBooted = true;
});
