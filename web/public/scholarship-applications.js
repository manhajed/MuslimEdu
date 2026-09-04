// Scholarship & Taqdim Assistant - Staff review queue
// (ScholarshipApplicationController's admin_* endpoints). Drafts never
// appear here - they're the student's private working copy until
// submitted (filtered server-side). Status/program filters are sent to
// the server on every change; the search box filters the currently
// loaded page client-side by student name or reference number, same
// division of labor as scholarship-programs.js's status filter vs. its
// own client-side title search.
//
// Access: primary SuperAdmin, or a platform-staff member (role_id 13)
// granted scholarship_access - see requireScholarshipStaffAccess()
// (dashboard.js).

document.getElementById('searchIcon').innerHTML = icon('search', { size: 17, color: 'var(--subtle)' });

// Excludes 'draft' (never returned to this queue - see adminApplicationList)
// and 'withdrawn' is included as a filterable/viewable state, but not
// offered as something staff can *set* - see ADVANCEABLE_STATUSES below.
const APPLICATION_STATUSES = ['submitted', 'under_review', 'missing_documents', 'approved', 'rejected', 'withdrawn'];
// Statuses staff may move an application to via Advance Status. Withdrawn
// is student-initiated only (applicationWithdraw) - staff can still see a
// withdrawn application here (read-only, effectively), just not set it.
const ADVANCEABLE_STATUSES = ['submitted', 'under_review', 'missing_documents', 'approved', 'rejected'];

function appStatusLabel(s) { return t('scholarship_applications.status_' + s, s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())); }
function appStatusChipClass(s) {
  if (s === 'approved') return 'ok';
  if (s === 'submitted' || s === 'under_review') return 'warn';
  return 'danger'; // missing_documents, rejected, withdrawn
}

let allApplications = [];
let allPrograms = [];
let allStaff = [];      // granted scholarship staff, for the Assign sheet
let currentUser = null;
let searchQuery = '';
let statusFilter = '';
let programFilter = '';
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
function staffNameById(id) {
  if (!id) return null;
  if (currentUser && String(currentUser.id) === String(id)) return currentUser.name || t('scholarship_applications.you', 'You');
  const s = allStaff.find(s => String(s.id) === String(id));
  return s ? s.name : t('scholarship_applications.staff_fallback', 'Staff member');
}

// ── Filters ──
function renderStatusFilterRow(token) {
  const row = document.getElementById('statusFilterRow');
  const chips = [{ key: '', label: t('scholarship_applications.filter_all', 'All') }]
    .concat(APPLICATION_STATUSES.map(s => ({ key: s, label: appStatusLabel(s) })));
  row.innerHTML = chips.map(c =>
    '<button type="button" class="filter-chip' + (statusFilter === c.key ? ' active' : '') + '" data-status="' + escapeHtml(c.key) + '">' + escapeHtml(c.label) + '</button>'
  ).join('') +
    '<a href="scholarship-programs.php" class="filter-chip" style="margin-left:auto;">' + escapeHtml(t('scholarship_applications.programs_chip', 'Programs →')) + '</a>';
  row.querySelectorAll('button.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      statusFilter = chip.dataset.status;
      renderStatusFilterRow(token);
      reload(token);
    });
  });
}
function renderProgramFilterOptions(token) {
  const sel = document.getElementById('programFilterSelect');
  sel.innerHTML = '<option value="">' + escapeHtml(t('scholarship_applications.all_programs', 'All Programs')) + '</option>' +
    allPrograms.map(p => '<option value="' + p.id + '">' + escapeHtml(p.title) + '</option>').join('');
  sel.value = programFilter;
  sel.onchange = () => { programFilter = sel.value; reload(token); };
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
    ? allApplications.filter(a => {
        const studentName = (a.student && a.student.name) || '';
        return studentName.toLowerCase().includes(q) || (a.reference_no || '').toLowerCase().includes(q);
      })
    : allApplications;

  if (allApplications.length === 0) {
    wrap.innerHTML = '<div class="list-empty"><div class="list-empty-title">' +
      escapeHtml(t('scholarship_applications.no_applications', 'No applications match these filters.')) + '</div></div>';
    return;
  }
  if (filtered.length === 0) {
    wrap.innerHTML = '<div class="list-empty"><div class="list-empty-title">' +
      escapeHtml(t('scholarship_applications.no_matches', 'No applications match your search.')) + '</div></div>';
    return;
  }

  wrap.innerHTML = '';
  filtered.forEach(a => {
    const studentName = (a.student && a.student.name) || t('scholarship_applications.unknown_student', 'Unknown student');
    const programTitle = (a.program && a.program.title) || t('scholarship_applications.unknown_program', 'Unknown program');
    const initial = studentName.trim().charAt(0).toUpperCase() || '?';
    const submitted = formatDate(a.submitted_at);
    const assignedName = a.assigned_to ? staffNameById(a.assigned_to) : null;

    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'list-card';
    card.innerHTML =
      '<span class="list-avatar-wrap"><span class="list-avatar-fallback">' + escapeHtml(initial) + '</span></span>' +
      '<span class="list-card-body">' +
        '<span class="list-card-name">' + escapeHtml(studentName) + '</span>' +
        '<div class="list-card-meta">' + escapeHtml(programTitle) + '</div>' +
        '<div class="chip-row">' +
          '<span class="mini-chip ' + appStatusChipClass(a.status) + '">' + escapeHtml(appStatusLabel(a.status)) + '</span>' +
          '<span class="mini-chip ok">' + escapeHtml(a.reference_no || '') + '</span>' +
          (submitted ? '<span class="mini-chip warn">' + escapeHtml(t('scholarship_applications.submitted_chip', 'Sent {date}').replace('{date}', submitted)) + '</span>' : '') +
          (assignedName ? '<span class="mini-chip ok">' + escapeHtml(t('scholarship_applications.assigned_chip', '→ {name}').replace('{name}', assignedName)) + '</span>' : '') +
        '</div>' +
      '</span>' +
      icon('chevron', { size: 18, color: 'var(--subtle)' });
    card.addEventListener('click', () => openApplicationDetail(token, a.id));
    wrap.appendChild(card);
  });
}
onLocaleChange(() => { if (lastListRendered) { renderStatusFilterRow(getStoredToken()); renderList(getStoredToken()); } });

// ── Detail sheet ──
function requirementTypeIcon(rt) { return rt === 'document' ? 'filetext' : 'clipboard'; }

function renderDetailContent(token, app) {
  const studentName = (app.student && app.student.name) || t('scholarship_applications.unknown_student', 'Unknown student');
  const studentEmail = (app.student && app.student.email) || '';
  const programTitle = (app.program && app.program.title) || '';
  const items = app.checklistItems || [];
  const history = (app.statusHistory || []).slice().reverse(); // newest first

  const checklistHtml = items.length === 0
    ? '<div class="util-row"><span class="util-row-title" style="color:var(--subtle);">' + escapeHtml(t('scholarship_applications.no_checklist_items', 'No checklist items.')) + '</span></div>'
    : items.map(it =>
        '<label class="switch-row">' +
          '<span class="switch-row-label">' +
            escapeHtml(it.title) +
            (it.is_required ? '' : ' <span class="mini-chip warn">' + escapeHtml(t('scholarship_applications.optional_chip', 'Optional')) + '</span>') +
            '<br><span style="font-weight:400;color:var(--subtle);font-size:12px;">' + escapeHtml(requirementTypeLabelLocal(it.requirement_type)) + (it.statement_text ? ' · ' + escapeHtml(t('scholarship_applications.has_statement', 'Statement provided')) : '') + (it.document_id ? ' · ' + escapeHtml(t('scholarship_applications.has_document', 'Document uploaded')) : '') + '</span>' +
          '</span>' +
          '<span class="switch"><input type="checkbox" class="appChecklistToggle" data-item-id="' + it.id + '"' + (it.is_completed ? ' checked' : '') + '><span class="switch-track"></span></span>' +
        '</label>'
      ).join('');

  const historyHtml = history.length === 0
    ? '<div class="util-row"><span class="util-row-title" style="color:var(--subtle);">' + escapeHtml(t('scholarship_applications.no_history', 'No status changes yet.')) + '</span></div>'
    : history.map(h =>
        '<div class="util-row" style="pointer-events:none;">' +
          '<span class="util-row-icon">' + icon('clock', { size: 15, color: 'var(--subtle)' }) + '</span>' +
          '<span class="util-row-title">' + (h.from_status ? escapeHtml(appStatusLabel(h.from_status)) + ' → ' : '') + escapeHtml(appStatusLabel(h.to_status)) +
            (h.note ? '<br><span style="font-weight:400;color:var(--subtle);font-size:12px;">' + escapeHtml(h.note) + '</span>' : '') + '</span>' +
          '<span class="util-row-value">' + escapeHtml(formatDateTime(h.created_at) || '') + '</span>' +
        '</div>'
      ).join('');

  return (
    '<div class="sheet-title-row"><span class="sheet-title">' + escapeHtml(studentName) + '</span>' +
      '<button type="button" class="sheet-close-btn" id="adCloseBtn">' + icon('close', { size: 16, color: 'var(--subtle)' }) + '</button></div>' +
    '<div class="list-card-meta" style="margin-bottom:2px;">' + escapeHtml(programTitle) + '</div>' +
    (studentEmail ? '<div class="list-card-meta" style="margin-bottom:8px;">' + escapeHtml(studentEmail) + '</div>' : '') +
    '<div class="chip-row" style="margin-bottom:14px;">' +
      '<span class="mini-chip ' + appStatusChipClass(app.status) + '">' + escapeHtml(appStatusLabel(app.status)) + '</span>' +
      '<span class="mini-chip ok">' + escapeHtml(app.reference_no || '') + '</span>' +
      (app.submitted_at ? '<span class="mini-chip warn">' + escapeHtml(t('scholarship_applications.submitted_chip', 'Sent {date}').replace('{date}', formatDate(app.submitted_at))) + '</span>' : '') +
      (app.assigned_to ? '<span class="mini-chip ok">' + escapeHtml(t('scholarship_applications.assigned_chip', '→ {name}').replace('{name}', staffNameById(app.assigned_to))) + '</span>' : '') +
    '</div>' +
    (app.decision_note ? '<div class="util-label" style="margin-top:0;">' + escapeHtml(t('scholarship_applications.decision_note_label', 'Decision note')) + '</div><div class="list-card-meta" style="margin-bottom:14px;">' + escapeHtml(app.decision_note) + '</div>' : '') +
    '<div class="util-section-title" style="margin-top:0;">' + escapeHtml(t('scholarship_applications.checklist_section', 'Checklist')) + '</div>' +
    '<div class="util-card" id="adChecklistCard">' + checklistHtml + '</div>' +
    '<div class="util-section-title">' + escapeHtml(t('scholarship_applications.history_section', 'Status History')) + '</div>' +
    '<div class="util-card">' + historyHtml + '</div>' +
    '<div class="sheet-form-actions">' +
      '<button type="button" class="sheet-btn-secondary" id="adAssignBtn">' + escapeHtml(t('scholarship_applications.assign_btn', 'Assign')) + '</button>' +
      '<button type="button" class="sheet-btn-primary" id="adAdvanceBtn">' + escapeHtml(t('scholarship_applications.advance_btn', 'Change Status')) + '</button>' +
    '</div>'
  );
}
// Local copy of ScholarshipProgramController::requirement type labels -
// scholarship-programs.js has the same map, but checklist items are
// snapshotted copies (see ScholarshipApplicationController::seedChecklist)
// rather than live ScholarshipRequirement rows, and this page doesn't
// otherwise depend on scholarship-programs.js loading first.
function requirementTypeLabelLocal(rt) {
  return t('scholarship_programs.req_type_' + rt, (rt || '').charAt(0).toUpperCase() + (rt || '').slice(1));
}

function openApplicationDetail(token, applicationId) {
  let backdrop = document.getElementById('adBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'adBackdrop';
    backdrop.className = 'sheet-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) closeApplicationDetail(); });
  }
  backdrop.innerHTML = '<div class="sheet-panel form" id="adPanel"><div class="sheet-handle"></div><div class="list-loading">' + escapeHtml(t('common.loading', 'Loading…')) + '</div></div>';
  backdrop.classList.add('open');
  loadApplicationDetail(token, applicationId);
}
function closeApplicationDetail() {
  document.getElementById('adBackdrop')?.classList.remove('open');
}
function loadApplicationDetail(token, applicationId) {
  fetchAdminScholarshipApplication(token, applicationId).then(app => {
    const panel = document.getElementById('adPanel');
    if (!panel) return;
    panel.innerHTML = '<div class="sheet-handle"></div>' + renderDetailContent(token, app);
    document.getElementById('adCloseBtn').addEventListener('click', closeApplicationDetail);
    document.getElementById('adAssignBtn').addEventListener('click', () => openAssignSheet(token, app));
    document.getElementById('adAdvanceBtn').addEventListener('click', () => openAdvanceStatusSheet(token, app));
    panel.querySelectorAll('.appChecklistToggle').forEach(cb => {
      cb.addEventListener('change', () => {
        const itemId = cb.dataset.itemId;
        const checked = cb.checked;
        cb.disabled = true;
        reviewScholarshipChecklistItem(token, itemId, checked, null).then(() => {
          showToast(checked ? t('scholarship_applications.item_completed_toast', 'Marked complete.') : t('scholarship_applications.item_incomplete_toast', 'Marked incomplete.'));
        }).catch(err => {
          cb.checked = !checked; // revert on failure
          showToast(err && err.message ? err.message : t('scholarship_applications.item_review_failed', 'Could not update this item.'));
        }).finally(() => { cb.disabled = false; });
      });
    });
  }).catch(() => {
    const panel = document.getElementById('adPanel');
    if (panel) panel.innerHTML = '<div class="sheet-handle"></div><div class="list-error">' + escapeHtml(t('scholarship_applications.detail_load_failed', 'Could not load this application.')) + '</div>';
  });
}

// ── Assign sheet ──
function openAssignSheet(token, app) {
  const options = [];
  options.push({
    icon: 'close', label: t('scholarship_applications.unassign_label', 'Unassign'), desc: t('scholarship_applications.unassign_desc', 'Remove the current reviewer'),
    onPress: () => doAssign(token, app, null),
  });
  if (currentUser && String(app.assigned_to) !== String(currentUser.id)) {
    options.push({
      icon: 'person', label: t('scholarship_applications.assign_me_label', 'Assign to me'), desc: currentUser.name || '',
      onPress: () => doAssign(token, app, currentUser.id),
    });
  }
  allStaff.filter(s => !currentUser || String(s.id) !== String(currentUser.id)).forEach(s => {
    options.push({
      icon: 'person', label: s.name || t('scholarship_applications.staff_fallback', 'Staff member'), desc: s.email || '',
      onPress: () => doAssign(token, app, s.id),
    });
  });
  openActionSheet(t('scholarship_applications.assign_title', 'Assign To'), options);
}
function doAssign(token, app, staffId) {
  assignScholarshipApplication(token, app.id, staffId).then(() => {
    showToast(t('scholarship_applications.assigned_toast', 'Assignment updated.'));
    loadApplicationDetail(token, app.id);
    reload(token);
  }).catch(err => showToast(err && err.message ? err.message : t('scholarship_applications.assign_failed', 'Could not update assignment.')));
}

// ── Advance status sheet ──
function openAdvanceStatusSheet(token, app) {
  let backdrop = document.getElementById('asBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'asBackdrop';
    backdrop.className = 'sheet-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.classList.remove('open'); });
  }
  const options = ADVANCEABLE_STATUSES.filter(s => s !== app.status);
  backdrop.innerHTML =
    '<div class="sheet-panel form">' +
      '<div class="sheet-handle"></div>' +
      '<div class="sheet-title-row"><span class="sheet-title">' + escapeHtml(t('scholarship_applications.advance_title', 'Change Status')) + '</span>' +
        '<button type="button" class="sheet-close-btn" id="asCloseBtn">' + icon('close', { size: 16, color: 'var(--subtle)' }) + '</button></div>' +
      '<label class="util-label" style="margin-top:0;">' + escapeHtml(t('scholarship_applications.new_status_label', 'New status')) + '</label>' +
      '<select id="asStatus" class="util-input">' + options.map(s => '<option value="' + s + '">' + escapeHtml(appStatusLabel(s)) + '</option>').join('') + '</select>' +
      '<label class="util-label">' + escapeHtml(t('scholarship_applications.note_label', 'Note (optional)')) + '</label>' +
      '<textarea id="asNote" class="util-input" placeholder="' + escapeHtml(t('scholarship_applications.note_placeholder', 'Visible to the student, e.g. reason for the decision')) + '"></textarea>' +
      '<div class="sheet-form-actions">' +
        '<button type="button" class="sheet-btn-secondary" id="asCancelBtn">' + escapeHtml(t('common.cancel', 'Cancel')) + '</button>' +
        '<button type="button" class="sheet-btn-primary" id="asSubmitBtn"><span id="asSubmitLabel">' + escapeHtml(t('scholarship_applications.advance_submit', 'Update')) + '</span></button>' +
      '</div>' +
    '</div>';
  document.getElementById('asCloseBtn').addEventListener('click', () => backdrop.classList.remove('open'));
  document.getElementById('asCancelBtn').addEventListener('click', () => backdrop.classList.remove('open'));
  document.getElementById('asSubmitBtn').addEventListener('click', () => {
    const status = document.getElementById('asStatus').value;
    const note = document.getElementById('asNote').value.trim() || null;
    const btn = document.getElementById('asSubmitBtn');
    const label = document.getElementById('asSubmitLabel');
    btn.disabled = true; label.innerHTML = '<span class="util-spinner"></span>';
    advanceScholarshipApplicationStatus(token, app.id, status, note).then(() => {
      backdrop.classList.remove('open');
      showToast(t('scholarship_applications.status_updated_toast', 'Status updated.'));
      loadApplicationDetail(token, app.id);
      reload(token);
    }).catch(err => showToast(err && err.message ? err.message : t('scholarship_applications.status_update_failed', 'Could not update status.')))
      .finally(() => { btn.disabled = false; label.textContent = t('scholarship_applications.advance_submit', 'Update'); });
  });
  backdrop.classList.add('open');
}

// ── Boot ──
function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(t('scholarship_applications.title', 'Scholarship Applications'), t('scholarship_applications.subtitle', 'Review, assign, and decide on submitted Taqdim applications'), 'scholarship-programs.php');
}
renderHeaderText();
onLocaleChange(renderHeaderText);

function currentFilters() {
  const f = {};
  if (statusFilter) f.status = statusFilter;
  if (programFilter) f.program_id = programFilter;
  return f;
}
function reload(token) {
  document.getElementById('listContent').innerHTML = '<div class="list-loading">' + escapeHtml(t('common.loading', 'Loading…')) + '</div>';
  fetchAdminScholarshipApplications(token, currentFilters()).then(list => {
    allApplications = list;
    renderList(token);
  }).catch(() => {
    lastListRendered = false;
    document.getElementById('listContent').innerHTML =
      '<div class="list-error">' + escapeHtml(t('scholarship_applications.load_failed', 'Failed to load applications.')) + '<br><button type="button" class="list-retry-btn" id="retryBtn">' + escapeHtml(t('common.retry', 'Try again')) + '</button></div>';
    document.getElementById('retryBtn')?.addEventListener('click', () => reload(token));
  });
}

guardDashboard(['superadmin', 'platform_staff'], function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  if (!requireScholarshipStaffAccess(user)) return;
  currentUser = user;
  // Deep-link support for scholarship-reports.js's "top programs" list -
  // pre-selects the program filter instead of landing on the unfiltered
  // queue. Harmless no-op for every other entry point into this page,
  // which never set this param.
  const initialProgramId = new URLSearchParams(window.location.search).get('program_id');
  if (initialProgramId) programFilter = initialProgramId;
  Promise.all([fetchScholarshipPrograms(token), fetchScholarshipAccess(token)]).then(([programs, staff]) => {
    allPrograms = programs;
    allStaff = staff.filter(s => s.scholarship_access);
    renderProgramFilterOptions(token);
  }).catch(() => {});
  renderStatusFilterRow(token);
  reload(token);
});
