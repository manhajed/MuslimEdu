// Scholarship & Taqdim Assistant - staff announcements
// (ScholarshipProgramController's announcement* endpoints - backend
// already existed, this is its first frontend). An announcement can be
// platform-wide (program_id null) or scoped to one program; students see
// the platform-wide + per-program ones on scholarship-detail.js and via
// ScholarshipController::announcementFeed.

let allAnnouncements = [];
let allPrograms = [];

function formatDate(d) {
  if (!d) return null;
  try { return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch (e) { return d; }
}

function renderList(token) {
  const wrap = document.getElementById('listContent');
  if (allAnnouncements.length === 0) {
    wrap.innerHTML = '<div class="list-empty"><div class="list-empty-title">' +
      escapeHtml(t('scholarship_announcements.no_announcements', 'No announcements yet.')) + '</div></div>';
    return;
  }
  wrap.innerHTML = '';
  allAnnouncements.forEach(a => {
    const programTitle = a.program ? a.program.title : t('scholarship_announcements.platform_wide', 'Platform-wide');
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'list-card';
    row.innerHTML =
      '<span class="list-avatar-wrap"><span class="list-avatar-fallback">' + icon('megaphone', { size: 17, color: '#fff' }) + '</span></span>' +
      '<span class="list-card-body">' +
        '<span class="list-card-name">' + escapeHtml(a.title) + (a.is_pinned ? ' <span class="mini-chip warn">' + escapeHtml(t('scholarship_announcements.pinned_chip', 'Pinned')) + '</span>' : '') + '</span>' +
        '<div class="list-card-meta">' + escapeHtml(programTitle) + (a.published_at ? ' · ' + escapeHtml(formatDate(a.published_at)) : '') + '</div>' +
      '</span>' +
      icon('chevron', { size: 18, color: 'var(--subtle)' });
    row.addEventListener('click', () => openActions(token, a));
    wrap.appendChild(row);
  });
}

function openActions(token, a) {
  openActionSheet(a.title, [
    { icon: 'pencil', label: t('scholarship_announcements.edit_label', 'Edit'), desc: t('scholarship_announcements.edit_desc', 'Change the announcement text or pin it'), onPress: () => openForm(token, a) },
    { icon: 'trash', label: t('scholarship_announcements.delete_label', 'Delete'), desc: t('scholarship_announcements.delete_desc', 'Remove this announcement'), onPress: () => confirmDelete(token, a) },
  ]);
}
function confirmDelete(token, a) {
  openActionSheet(t('scholarship_announcements.confirm_delete_title', 'Delete this announcement?'), [
    { icon: 'trash', label: t('scholarship_announcements.confirm_delete_label', 'Yes, delete'), desc: t('scholarship_announcements.confirm_delete_desc', 'This cannot be undone'), onPress: () => {
      deleteScholarshipAnnouncement(token, a.id).then(() => {
        showToast(t('scholarship_announcements.deleted_toast', 'Announcement deleted.'));
        load(token);
      }).catch(err => showToast(err && err.message ? err.message : t('scholarship_announcements.delete_failed', 'Could not delete this announcement.')));
    }},
    { icon: 'close', label: t('common.cancel', 'Cancel'), desc: '', onPress: () => {} },
  ]);
}

function programOptionsHtml(selectedId) {
  return '<option value="">' + escapeHtml(t('scholarship_announcements.platform_wide', 'Platform-wide')) + '</option>' +
    allPrograms.map(p => '<option value="' + p.id + '"' + (selectedId && String(p.id) === String(selectedId) ? ' selected' : '') + '>' + escapeHtml(p.title) + '</option>').join('');
}

function openForm(token, existing) {
  let backdrop = document.getElementById('anBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'anBackdrop';
    backdrop.className = 'sheet-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.classList.remove('open'); });
  }
  backdrop.innerHTML =
    '<div class="sheet-panel form">' +
      '<div class="sheet-handle"></div>' +
      '<div class="sheet-title-row"><span class="sheet-title">' + escapeHtml(existing ? t('scholarship_announcements.edit_title', 'Edit Announcement') : t('scholarship_announcements.add_title', 'Add Announcement')) + '</span>' +
        '<button type="button" class="sheet-close-btn" id="anCloseBtn">' + icon('close', { size: 16, color: 'var(--subtle)' }) + '</button></div>' +
      '<label class="util-label" style="margin-top:0;">' + escapeHtml(t('scholarship_announcements.scope_label', 'Scope')) + '</label>' +
      '<select id="anProgram" class="util-input">' + programOptionsHtml(existing ? existing.program_id : null) + '</select>' +
      '<label class="util-label">' + escapeHtml(t('scholarship_announcements.title_label', 'Title')) + '</label>' +
      '<input type="text" id="anTitle" class="util-input" value="' + (existing ? escapeHtml(existing.title) : '') + '" />' +
      '<label class="util-label">' + escapeHtml(t('scholarship_announcements.body_label', 'Message')) + '</label>' +
      '<textarea id="anBody" class="util-input" style="min-height:100px;">' + (existing ? escapeHtml(existing.body) : '') + '</textarea>' +
      '<label class="util-label">' + escapeHtml(t('scholarship_announcements.expires_label', 'Expires (optional)')) + '</label>' +
      '<input type="date" id="anExpires" class="util-input" value="' + (existing && existing.expires_at ? String(existing.expires_at).slice(0, 10) : '') + '" />' +
      '<label class="util-row" style="padding:10px 0;">' +
        '<span class="util-row-title">' + escapeHtml(t('scholarship_announcements.pin_toggle', 'Pin to top')) + '</span>' +
        '<span class="switch"><input type="checkbox" id="anPinned"' + (existing && existing.is_pinned ? ' checked' : '') + '><span class="switch-track"></span></span>' +
      '</label>' +
      '<div class="sheet-form-actions">' +
        '<button type="button" class="sheet-btn-secondary" id="anCancelBtn">' + escapeHtml(t('common.cancel', 'Cancel')) + '</button>' +
        '<button type="button" class="sheet-btn-primary" id="anSubmitBtn"><span id="anSubmitLabel">' + escapeHtml(t('common.save', 'Save')) + '</span></button>' +
      '</div>' +
    '</div>';
  document.getElementById('anCloseBtn').addEventListener('click', () => backdrop.classList.remove('open'));
  document.getElementById('anCancelBtn').addEventListener('click', () => backdrop.classList.remove('open'));
  document.getElementById('anSubmitBtn').addEventListener('click', () => {
    const title = document.getElementById('anTitle').value.trim();
    const body = document.getElementById('anBody').value.trim();
    if (!title || !body) { showToast(t('scholarship_announcements.fields_required', 'Title and message are required.')); return; }
    const input = {
      program_id: document.getElementById('anProgram').value || null,
      title, body,
      is_pinned: document.getElementById('anPinned').checked,
      expires_at: document.getElementById('anExpires').value || null,
    };
    const btn = document.getElementById('anSubmitBtn');
    const label = document.getElementById('anSubmitLabel');
    btn.disabled = true; label.innerHTML = '<span class="util-spinner"></span>';
    const req = existing ? updateScholarshipAnnouncement(token, existing.id, input) : createScholarshipAnnouncement(token, input);
    req.then(() => {
      backdrop.classList.remove('open');
      showToast(existing ? t('scholarship_announcements.updated_toast', 'Announcement updated.') : t('scholarship_announcements.added_toast', 'Announcement posted.'));
      load(token);
    }).catch(err => showToast(err && err.message ? err.message : t('scholarship_announcements.save_failed', 'Could not save this announcement.')))
      .finally(() => { btn.disabled = false; label.textContent = t('common.save', 'Save'); });
  });
  backdrop.classList.add('open');
}

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(t('scholarship_announcements.title', 'Announcements'), t('scholarship_announcements.subtitle', 'Post updates for students browsing or applying to scholarships'), 'scholarship-programs.php');
}
renderHeaderText();
onLocaleChange(renderHeaderText);

function load(token) {
  document.getElementById('listContent').innerHTML = '<div class="list-loading">' + escapeHtml(t('common.loading', 'Loading…')) + '</div>';
  fetchScholarshipAnnouncements(token).then(list => {
    allAnnouncements = list;
    renderList(token);
  }).catch(() => {
    document.getElementById('listContent').innerHTML = '<div class="list-error">' + escapeHtml(t('scholarship_announcements.load_failed', 'Could not load announcements.')) + '</div>';
  });
}

guardDashboard(['superadmin', 'platform_staff'], function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  if (!requireScholarshipStaffAccess(user)) return;
  document.getElementById('utilBody').style.display = '';
  document.getElementById('addBtn').addEventListener('click', () => openForm(token, null));
  fetchScholarshipPrograms(token).then(list => { allPrograms = list; }).catch(() => {});
  load(token);
});
