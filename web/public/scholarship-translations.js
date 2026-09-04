// Scholarship & Taqdim Assistant - Translation Services staff queue
// (ScholarshipTranslationController's admin_* endpoints). Same shape as
// scholarship-applications.js - status filter chips refetch from the
// server, the search box filters the loaded page client-side by student
// name or application reference number, and each row opens a detail
// sheet with the actions available for that stage of the workflow.
//
// Access: primary SuperAdmin, or a platform-staff member granted
// translation responsibilities specifically - see
// requireScholarshipTranslationAccess() (dashboard.js). Narrower than
// scholarship-applications.php's requireScholarshipStaffAccess(): a
// Taqdim staffer without translation responsibilities cannot reach this
// queue at all, per the spec's org chart.

document.getElementById('searchIcon').innerHTML = icon('search', { size: 17, color: 'var(--subtle)' });

// requested -> assigned -> translating -> review -> completed, or
// cancelled at any point before completed - matches
// ScholarshipTranslationRequest::STATUSES exactly.
const TRANSLATION_STATUSES = ['requested', 'assigned', 'translating', 'review', 'completed', 'cancelled'];
// What ScholarshipTranslationController::ADVANCEABLE_STATUSES accepts -
// 'requested' and 'assigned' are reached only via creation/assignment,
// never set directly from this dropdown.
const TRANSLATION_ADVANCEABLE_STATUSES = ['translating', 'review', 'completed', 'cancelled'];

function translationStatusLabel(s) { return t('scholarship_translations.status_' + s, s.charAt(0).toUpperCase() + s.slice(1)); }
function translationStatusChipClass(s) {
  if (s === 'completed') return 'ok';
  if (s === 'requested' || s === 'assigned' || s === 'translating' || s === 'review') return 'warn';
  return 'danger'; // cancelled
}

let allRequests = [];
let allStaff = [];      // staff with translation responsibilities, for the Assign sheet
let currentUser = null;
let searchQuery = '';
let statusFilter = '';
let searchTimer = null;
let lastListRendered = false;

function formatDate(d) {
  if (!d) return null;
  try { return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch (e) { return d; }
}
function formatDateTime(d) {
  if (!d) return null;
  try { return new Date(d).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
  catch (e) { return d; }
}

// ── Filters ──
function renderStatusFilterRow(token) {
  const row = document.getElementById('statusFilterRow');
  const chips = [{ key: '', label: t('scholarship_translations.filter_all', 'All') }]
    .concat(TRANSLATION_STATUSES.map(s => ({ key: s, label: translationStatusLabel(s) })));
  row.innerHTML = chips.map(c =>
    '<button type="button" class="filter-chip' + (statusFilter === c.key ? ' active' : '') + '" data-status="' + escapeHtml(c.key) + '">' + escapeHtml(c.label) + '</button>'
  ).join('') +
    '<a href="scholarship-applications.php" class="filter-chip" style="margin-left:auto;">' + escapeHtml(t('scholarship_translations.applications_chip', 'Applications →')) + '</a>';
  row.querySelectorAll('button.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      statusFilter = chip.dataset.status;
      renderStatusFilterRow(token);
      reload(token);
    });
  });
}

document.getElementById('searchInput').addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { searchQuery = e.target.value; renderList(getStoredToken()); }, 200);
});

// ── List ──
function renderList(token) {
  lastListRendered = true;
  const wrap = document.getElementById('listContent');
  const q = searchQuery.trim().toLowerCase();
  const filtered = q
    ? allRequests.filter(r => {
        const studentName = (r.application && r.application.student && r.application.student.name) || '';
        const refNo = (r.application && r.application.reference_no) || '';
        return studentName.toLowerCase().includes(q) || refNo.toLowerCase().includes(q);
      })
    : allRequests;

  if (allRequests.length === 0) {
    wrap.innerHTML = '<div class="list-empty"><div class="list-empty-title">' +
      escapeHtml(t('scholarship_translations.no_requests', 'No translation requests match these filters.')) + '</div></div>';
    return;
  }
  if (filtered.length === 0) {
    wrap.innerHTML = '<div class="list-empty"><div class="list-empty-title">' +
      escapeHtml(t('scholarship_translations.no_matches', 'No requests match your search.')) + '</div></div>';
    return;
  }

  wrap.innerHTML = '';
  filtered.forEach(r => {
    const studentName = (r.application && r.application.student && r.application.student.name) || t('scholarship_translations.unknown_student', 'Unknown student');
    const programTitle = (r.application && r.application.program && r.application.program.title) || '';
    const refNo = (r.application && r.application.reference_no) || '';
    const initial = studentName.trim().charAt(0).toUpperCase() || '?';
    const assignedName = r.assignedTo ? r.assignedTo.name : null;
    const itemTitle = r.checklistItem ? r.checklistItem.title : null;

    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'list-card';
    card.innerHTML =
      '<span class="list-avatar-wrap"><span class="list-avatar-fallback">' + escapeHtml(initial) + '</span></span>' +
      '<span class="list-card-body">' +
        '<span class="list-card-name">' + escapeHtml(r.source_language) + ' → ' + escapeHtml(r.target_language) + (itemTitle ? ' · ' + escapeHtml(itemTitle) : '') + '</span>' +
        '<div class="list-card-meta">' + escapeHtml(studentName) + (programTitle ? ' · ' + escapeHtml(programTitle) : '') + '</div>' +
        '<div class="chip-row">' +
          '<span class="mini-chip ' + translationStatusChipClass(r.status) + '">' + escapeHtml(translationStatusLabel(r.status)) + '</span>' +
          (refNo ? '<span class="mini-chip ok">' + escapeHtml(refNo) + '</span>' : '') +
          (assignedName ? '<span class="mini-chip ok">' + escapeHtml(t('scholarship_translations.assigned_chip', '→ {name}').replace('{name}', assignedName)) + '</span>' : '') +
        '</div>' +
      '</span>' +
      icon('chevron', { size: 18, color: 'var(--subtle)' });
    card.addEventListener('click', () => openDetail(token, r.id));
    wrap.appendChild(card);
  });
}
onLocaleChange(() => { if (lastListRendered) { renderStatusFilterRow(getStoredToken()); renderList(getStoredToken()); } });

// ── Detail sheet ──
function renderDetailContent(req) {
  const studentName = (req.application && req.application.student && req.application.student.name) || t('scholarship_translations.unknown_student', 'Unknown student');
  const programTitle = (req.application && req.application.program && req.application.program.title) || '';
  const refNo = (req.application && req.application.reference_no) || '';
  const itemTitle = req.checklistItem ? req.checklistItem.title : null;
  const assignedName = req.assignedTo ? req.assignedTo.name : null;

  return (
    '<div class="sheet-title-row"><span class="sheet-title">' + escapeHtml(req.source_language) + ' → ' + escapeHtml(req.target_language) + '</span>' +
      '<button type="button" class="sheet-close-btn" id="tdCloseBtn">' + icon('close', { size: 16, color: 'var(--subtle)' }) + '</button></div>' +
    '<div class="list-card-meta" style="margin-bottom:2px;">' + escapeHtml(studentName) + (programTitle ? ' · ' + escapeHtml(programTitle) : '') + '</div>' +
    (refNo ? '<div class="list-card-meta" style="margin-bottom:8px;">' + escapeHtml(refNo) + (itemTitle ? ' · ' + escapeHtml(itemTitle) : '') + '</div>' : '') +
    '<div class="chip-row" style="margin-bottom:14px;">' +
      '<span class="mini-chip ' + translationStatusChipClass(req.status) + '">' + escapeHtml(translationStatusLabel(req.status)) + '</span>' +
      (req.translation_type ? '<span class="mini-chip ok">' + escapeHtml(req.translation_type) + '</span>' : '') +
      (assignedName ? '<span class="mini-chip ok">' + escapeHtml(t('scholarship_translations.assigned_chip', '→ {name}').replace('{name}', assignedName)) + '</span>' : '') +
    '</div>' +
    (req.instructions ? '<div class="util-label" style="margin-top:0;">' + escapeHtml(t('scholarship_translations.instructions_label', 'Instructions from student')) + '</div><div class="list-card-meta" style="margin-bottom:14px;">' + escapeHtml(req.instructions) + '</div>' : '') +
    '<div class="util-section-title" style="margin-top:0;">' + escapeHtml(t('scholarship_translations.files_section', 'Files')) + '</div>' +
    '<div class="util-card">' +
      '<div class="util-row" style="pointer-events:none;">' +
        '<span class="util-row-icon">' + icon('filetext', { size: 15, color: 'var(--subtle)' }) + '</span>' +
        '<span class="util-row-title">' + escapeHtml(t('scholarship_translations.source_file_label', 'Original document')) + '</span>' +
        '<span class="util-row-value">' + (req.sourceDocument ? escapeHtml(t('scholarship_translations.attached', 'Attached')) : escapeHtml(t('scholarship_translations.none', 'None'))) + '</span>' +
      '</div>' +
      '<div class="util-row" style="pointer-events:none;">' +
        '<span class="util-row-icon">' + icon('filetext', { size: 15, color: 'var(--subtle)' }) + '</span>' +
        '<span class="util-row-title">' + escapeHtml(t('scholarship_translations.translated_file_label', 'Translated document')) + '</span>' +
        '<span class="util-row-value">' + (req.translatedDocument ? escapeHtml(t('scholarship_translations.uploaded', 'Uploaded')) : escapeHtml(t('scholarship_translations.not_yet', 'Not yet'))) + '</span>' +
      '</div>' +
    '</div>' +
    (req.status !== 'completed' && req.status !== 'cancelled'
      ? '<label class="util-label">' + escapeHtml(t('scholarship_translations.upload_label', 'Upload translated file')) + '</label>' +
        '<div class="util-file-input-row"><input type="file" id="tdFile" /></div>' +
        '<button type="button" class="util-save-btn pill" id="tdUploadBtn" style="margin-top:10px;"><span id="tdUploadLabel">' + escapeHtml(t('scholarship_translations.upload_btn', 'Upload')) + '</span></button>'
      : '') +
    '<div class="sheet-form-actions">' +
      '<button type="button" class="sheet-btn-secondary" id="tdAssignBtn">' + escapeHtml(t('scholarship_translations.assign_btn', 'Assign')) + '</button>' +
      (req.status !== 'completed' && req.status !== 'cancelled'
        ? '<button type="button" class="sheet-btn-primary" id="tdAdvanceBtn">' + escapeHtml(t('scholarship_translations.advance_btn', 'Change Status')) + '</button>'
        : '')  +
    '</div>'
  );
}

function openDetail(token, requestId) {
  let backdrop = document.getElementById('tdBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'tdBackdrop';
    backdrop.className = 'sheet-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) closeDetail(); });
  }
  backdrop.innerHTML = '<div class="sheet-panel form" id="tdPanel"><div class="sheet-handle"></div><div class="list-loading">' + escapeHtml(t('common.loading', 'Loading…')) + '</div></div>';
  backdrop.classList.add('open');
  loadDetail(token, requestId);
}
function closeDetail() {
  document.getElementById('tdBackdrop')?.classList.remove('open');
}
function loadDetail(token, requestId) {
  fetchAdminTranslationRequest(token, requestId).then(req => {
    const panel = document.getElementById('tdPanel');
    if (!panel) return;
    panel.innerHTML = '<div class="sheet-handle"></div>' + renderDetailContent(req);
    document.getElementById('tdCloseBtn').addEventListener('click', closeDetail);
    document.getElementById('tdAssignBtn').addEventListener('click', () => openAssignSheet(token, req));
    const advanceBtn = document.getElementById('tdAdvanceBtn');
    if (advanceBtn) advanceBtn.addEventListener('click', () => openAdvanceStatusSheet(token, req));
    const uploadBtn = document.getElementById('tdUploadBtn');
    if (uploadBtn) uploadBtn.addEventListener('click', () => {
      const fileInput = document.getElementById('tdFile');
      const file = fileInput.files && fileInput.files[0];
      if (!file) { showToast(t('scholarship_translations.choose_file', 'Choose a file first.')); return; }
      const label = document.getElementById('tdUploadLabel');
      uploadBtn.disabled = true; label.innerHTML = '<span class="util-spinner"></span>';
      uploadScholarshipTranslationFile(token, req.id, file).then(() => {
        showToast(t('scholarship_translations.uploaded_toast', 'File uploaded.'));
        loadDetail(token, req.id);
        reload(token);
      }).catch(err => {
        showToast(err && err.message ? err.message : t('scholarship_translations.upload_failed', 'Could not upload this file.'));
        uploadBtn.disabled = false; label.textContent = t('scholarship_translations.upload_btn', 'Upload');
      });
    });
  }).catch(() => {
    const panel = document.getElementById('tdPanel');
    if (panel) panel.innerHTML = '<div class="sheet-handle"></div><div class="list-error">' + escapeHtml(t('scholarship_translations.detail_load_failed', 'Could not load this request.')) + '</div>';
  });
}

// ── Assign sheet ──
function openAssignSheet(token, req) {
  const options = [];
  options.push({
    icon: 'close', label: t('scholarship_translations.unassign_label', 'Unassign'), desc: t('scholarship_translations.unassign_desc', 'Remove the current translator'),
    onPress: () => doAssign(token, req, null),
  });
  if (currentUser && String(req.assigned_to) !== String(currentUser.id)) {
    options.push({
      icon: 'person', label: t('scholarship_translations.assign_me_label', 'Assign to me'), desc: currentUser.name || '',
      onPress: () => doAssign(token, req, currentUser.id),
    });
  }
  allStaff.filter(s => !currentUser || String(s.id) !== String(currentUser.id)).forEach(s => {
    options.push({
      icon: 'person', label: s.name || t('scholarship_translations.staff_fallback', 'Staff member'), desc: s.email || '',
      onPress: () => doAssign(token, req, s.id),
    });
  });
  openActionSheet(t('scholarship_translations.assign_title', 'Assign To'), options);
}
function doAssign(token, req, staffId) {
  assignScholarshipTranslationRequest(token, req.id, staffId).then(() => {
    showToast(t('scholarship_translations.assigned_toast', 'Assignment updated.'));
    loadDetail(token, req.id);
    reload(token);
  }).catch(err => showToast(err && err.message ? err.message : t('scholarship_translations.assign_failed', 'Could not update assignment.')));
}

// ── Advance status sheet ──
function openAdvanceStatusSheet(token, req) {
  let backdrop = document.getElementById('tsBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'tsBackdrop';
    backdrop.className = 'sheet-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.classList.remove('open'); });
  }
  const options = TRANSLATION_ADVANCEABLE_STATUSES.filter(s => s !== req.status);
  backdrop.innerHTML =
    '<div class="sheet-panel form">' +
      '<div class="sheet-handle"></div>' +
      '<div class="sheet-title-row"><span class="sheet-title">' + escapeHtml(t('scholarship_translations.advance_title', 'Change Status')) + '</span>' +
        '<button type="button" class="sheet-close-btn" id="tsCloseBtn">' + icon('close', { size: 16, color: 'var(--subtle)' }) + '</button></div>' +
      '<label class="util-label" style="margin-top:0;">' + escapeHtml(t('scholarship_translations.new_status_label', 'New status')) + '</label>' +
      '<select id="tsStatus" class="util-input">' + options.map(s => '<option value="' + s + '">' + escapeHtml(translationStatusLabel(s)) + '</option>').join('') + '</select>' +
      '<p style="font-size:12px;color:var(--subtle);margin:6px 2px 0;">' + escapeHtml(t('scholarship_translations.completed_hint', 'Marking Completed requires the translated file to already be uploaded.')) + '</p>' +
      '<label class="util-label">' + escapeHtml(t('scholarship_translations.note_label', 'Note (optional)')) + '</label>' +
      '<textarea id="tsNote" class="util-input" placeholder="' + escapeHtml(t('scholarship_translations.note_placeholder', 'Any details worth recording')) + '"></textarea>' +
      '<div class="sheet-form-actions">' +
        '<button type="button" class="sheet-btn-secondary" id="tsCancelBtn">' + escapeHtml(t('common.cancel', 'Cancel')) + '</button>' +
        '<button type="button" class="sheet-btn-primary" id="tsSubmitBtn"><span id="tsSubmitLabel">' + escapeHtml(t('scholarship_translations.advance_submit', 'Update')) + '</span></button>' +
      '</div>' +
    '</div>';
  document.getElementById('tsCloseBtn').addEventListener('click', () => backdrop.classList.remove('open'));
  document.getElementById('tsCancelBtn').addEventListener('click', () => backdrop.classList.remove('open'));
  document.getElementById('tsSubmitBtn').addEventListener('click', () => {
    const status = document.getElementById('tsStatus').value;
    const note = document.getElementById('tsNote').value.trim() || null;
    const btn = document.getElementById('tsSubmitBtn');
    const label = document.getElementById('tsSubmitLabel');
    btn.disabled = true; label.innerHTML = '<span class="util-spinner"></span>';
    advanceScholarshipTranslationRequestStatus(token, req.id, status, note).then(() => {
      backdrop.classList.remove('open');
      showToast(t('scholarship_translations.status_updated_toast', 'Status updated.'));
      loadDetail(token, req.id);
      reload(token);
    }).catch(err => showToast(err && err.message ? err.message : t('scholarship_translations.status_update_failed', 'Could not update status.')))
      .finally(() => { btn.disabled = false; label.textContent = t('scholarship_translations.advance_submit', 'Update'); });
  });
  backdrop.classList.add('open');
}

// ── Boot ──
function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(t('scholarship_translations.title', 'Translation Requests'), t('scholarship_translations.subtitle', 'Manage document translation requests for scholarship applications'), 'scholarship-applications.php');
}
renderHeaderText();
onLocaleChange(renderHeaderText);

function currentFilters() {
  const f = {};
  if (statusFilter) f.status = statusFilter;
  return f;
}
function reload(token) {
  document.getElementById('listContent').innerHTML = '<div class="list-loading">' + escapeHtml(t('common.loading', 'Loading…')) + '</div>';
  fetchAdminTranslationRequests(token, currentFilters()).then(list => {
    allRequests = list;
    renderList(token);
  }).catch(() => {
    lastListRendered = false;
    document.getElementById('listContent').innerHTML =
      '<div class="list-error">' + escapeHtml(t('scholarship_translations.load_failed', 'Failed to load translation requests.')) + '<br><button type="button" class="list-retry-btn" id="retryBtn">' + escapeHtml(t('common.retry', 'Try again')) + '</button></div>';
    document.getElementById('retryBtn')?.addEventListener('click', () => reload(token));
  });
}

guardDashboard(['superadmin', 'platform_staff'], function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  if (!requireScholarshipTranslationAccess(user)) return;
  currentUser = user;
  fetchScholarshipAccess(token).then(staff => {
    allStaff = staff.filter(s => s.scholarship_translation_access);
  }).catch(() => {});
  renderStatusFilterRow(token);
  reload(token);

  // Deep-link from a "Translation request assigned to you" notification
  // (notifications.js's NOTIF_ROUTE_TO_PAGE maps
  // ScholarshipTranslationRequestDetail here with ?request_id=) - opens
  // straight to that request's detail sheet instead of leaving the
  // person to find it in the list themselves.
  const initialRequestId = new URLSearchParams(window.location.search).get('request_id');
  if (initialRequestId) openDetail(token, initialRequestId);
});
