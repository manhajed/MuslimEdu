// Taqdim Assistant / Translation Service - school admin's review queue
// (TaqdimTranslationApplicationController's admin_* endpoints). Same
// shape as the platform-wide scholarship-applications.js, simplified:
// no program filter (a school has exactly one checklist per feature -
// see taqdim-translation-requirements.js) and no staff picker (Assign
// only offers "assign to me" / "unassign" - there is no existing
// school-staff-list endpoint to build a full picker on, and a small
// school's admin team rarely needs one). Any admin can see and assign
// unassigned applications - see the "Unassigned" filter and the assign
// button, which stays available to every admin regardless of who else
// is looking at the queue.
//
// Drafts never appear here - they're the student's private working copy
// until submitted (filtered server-side in adminApplicationList).
//
// Chat: once an application is assigned, the admin gets an integrated
// support chat with the student (taqdim-translation-chat.js) where they
// can send required files, share studyinsaudi portal credentials, and
// lock the conversation - see openChatModal() below.

function qsParam(name) { return new URLSearchParams(window.location.search).get(name); }
const APPS_FEATURE = qsParam('feature') === 'translation' ? 'translation' : 'taqdim';

const APPLICATION_STATUSES = ['submitted', 'under_review', 'approved', 'rejected', 'withdrawn'];
const ADVANCEABLE_STATUSES = ['submitted', 'under_review', 'approved', 'rejected'];

function appStatusLabel(s) { return t('taqdim_translation_applications.status_' + s, s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())); }
function appStatusChipClass(s) {
  if (s === 'approved') return 'ok';
  if (s === 'submitted' || s === 'under_review') return 'warn';
  return 'danger'; // rejected, withdrawn
}
function requirementTypeLabelLocal(rt) { return t('taqdim_translation_applications.req_type_' + rt, (rt || '').charAt(0).toUpperCase() + (rt || '').slice(1)); }
function featureTitle() {
  return APPS_FEATURE === 'translation'
    ? t('taqdim_translation_applications.translation_title', 'Translation Applications')
    : t('taqdim_translation_applications.taqdim_title', 'Taqdim Applications');
}

let allApplications = [];
let currentUser = null;
let statusFilter = '';
let unassignedOnly = false;
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
  const chips = [{ key: '', label: t('taqdim_translation_applications.filter_all', 'All') }]
    .concat(APPLICATION_STATUSES.map(s => ({ key: s, label: appStatusLabel(s) })));
  row.innerHTML = chips.map(c =>
    '<button type="button" class="filter-chip' + (statusFilter === c.key ? ' active' : '') + '" data-status="' + escapeHtml(c.key) + '">' + escapeHtml(c.label) + '</button>'
  ).join('') +
  '<button type="button" class="filter-chip' + (unassignedOnly ? ' active' : '') + '" id="unassignedOnlyChip">' + escapeHtml(t('taqdim_translation_applications.filter_unassigned', 'Unassigned only')) + '</button>';
  row.querySelectorAll('button.filter-chip[data-status]').forEach(chip => {
    chip.addEventListener('click', () => {
      statusFilter = chip.dataset.status;
      renderStatusFilterRow(token);
      reload(token);
    });
  });

  document.getElementById('unassignedOnlyChip')?.addEventListener('click', () => {
    unassignedOnly = !unassignedOnly;
    renderStatusFilterRow(token);
    reload(token);
  });
}

// ── List ──
function renderList(token) {
  lastListRendered = true;
  const wrap = document.getElementById('listContent');
  if (allApplications.length === 0) {
    wrap.innerHTML = '<div class="list-empty"><div class="list-empty-title">' +
      escapeHtml(t('taqdim_translation_applications.no_applications', 'No applications match these filters.')) + '</div></div>';
    return;
  }
  wrap.innerHTML = '';
  allApplications.forEach(a => {
    const studentName = (a.student && a.student.name) || t('taqdim_translation_applications.unknown_student', 'Unknown student');
    const initial = studentName.trim().charAt(0).toUpperCase() || '?';
    const submitted = formatDate(a.submitted_at);

    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'list-card';
    card.innerHTML =
      '<span class="list-avatar-wrap"><span class="list-avatar-fallback">' + escapeHtml(initial) + '</span></span>' +
      '<span class="list-card-body">' +
        '<span class="list-card-name">' + escapeHtml(studentName) + '</span>' +
        '<div class="chip-row">' +
          '<span class="mini-chip ' + appStatusChipClass(a.status) + '">' + escapeHtml(appStatusLabel(a.status)) + '</span>' +
          '<span class="mini-chip ok">' + escapeHtml(a.reference_no || '') + '</span>' +
          (submitted ? '<span class="mini-chip warn">' + escapeHtml(t('taqdim_translation_applications.submitted_chip', 'Sent {date}').replace('{date}', submitted)) + '</span>' : '') +
          (!a.assigned_to ? '<span class="mini-chip danger">' + escapeHtml(t('taqdim_translation_applications.unassigned_chip', 'Unassigned')) + '</span>' : '') +
        '</div>' +
      '</span>' +
      icon('chevron', { size: 18, color: 'var(--subtle)' });
    card.addEventListener('click', () => openApplicationDetail(token, a.id));
    wrap.appendChild(card);
  });
}
onLocaleChange(() => { if (lastListRendered) { renderStatusFilterRow(getStoredToken()); renderList(getStoredToken()); } });

// ── Detail sheet ──
function renderDetailContent(token, app) {
  const studentName = (app.student && app.student.name) || t('taqdim_translation_applications.unknown_student', 'Unknown student');
  const studentEmail = (app.student && app.student.email) || '';
  const items = app.checklistItems || [];
  const history = (app.statusHistory || []).slice().reverse();

  const checklistHtml = items.length === 0
    ? '<div class="util-row"><span class="util-row-title" style="color:var(--subtle);">' + escapeHtml(t('taqdim_translation_applications.no_checklist_items', 'No checklist items.')) + '</span></div>'
    : items.map(it =>
        '<button type="button" class="util-row appChecklistRow" data-item-id="' + it.id + '">' +
          '<span class="util-row-icon">' + (it.is_completed ? icon('checkcircle', { size: 16, color: 'var(--emerald-deep)' }) : icon('close', { size: 16, color: it.is_required ? '#EF4444' : 'var(--subtle)' })) + '</span>' +
          '<span class="util-row-title">' + escapeHtml(it.title) +
            (it.is_required ? '' : ' <span class="mini-chip warn">' + escapeHtml(t('taqdim_translation_applications.optional_chip', 'Optional')) + '</span>') +
            '<br><span style="font-weight:400;color:var(--subtle);font-size:12px;">' + escapeHtml(requirementTypeLabelLocal(it.requirement_type)) + (it.statement_text ? ' · ' + escapeHtml(t('taqdim_translation_applications.has_statement', 'Answer provided')) : '') + (it.document_id ? ' · ' + escapeHtml(t('taqdim_translation_applications.has_document', 'Document uploaded')) : '') + (it.notes ? '<br><span style="color:#EF4444;">' + escapeHtml(t('taqdim_translation_applications.your_note_prefix', 'Your note:')) + ' ' + escapeHtml(it.notes) + '</span>' : '') + '</span>' +
          '</span>' +
        '</button>'
      ).join('');

  const historyHtml = history.length === 0
    ? '<div class="util-row"><span class="util-row-title" style="color:var(--subtle);">' + escapeHtml(t('taqdim_translation_applications.no_history', 'No status changes yet.')) + '</span></div>'
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
    (studentEmail ? '<div class="list-card-meta" style="margin-bottom:8px;">' + escapeHtml(studentEmail) + '</div>' : '') +
    '<div class="chip-row" style="margin-bottom:14px;">' +
      '<span class="mini-chip ' + appStatusChipClass(app.status) + '">' + escapeHtml(appStatusLabel(app.status)) + '</span>' +
      '<span class="mini-chip ok">' + escapeHtml(app.reference_no || '') + '</span>' +
      (app.submitted_at ? '<span class="mini-chip warn">' + escapeHtml(t('taqdim_translation_applications.submitted_chip', 'Sent {date}').replace('{date}', formatDate(app.submitted_at))) + '</span>' : '') +
      (app.assignee ? '<span class="mini-chip ok">' + escapeHtml(t('taqdim_translation_applications.assigned_chip', '→ {name}').replace('{name}', app.assignee.name)) + '</span>' : '<span class="mini-chip danger">' + escapeHtml(t('taqdim_translation_applications.unassigned_chip', 'Unassigned')) + '</span>') +
    '</div>' +
    (app.decision_note ? '<div class="util-label" style="margin-top:0;">' + escapeHtml(t('taqdim_translation_applications.decision_note_label', 'Decision note')) + '</div><div class="list-card-meta" style="margin-bottom:14px;">' + escapeHtml(app.decision_note) + '</div>' : '') +
    '<div class="util-section-title" style="margin-top:0;">' + escapeHtml(t('taqdim_translation_applications.checklist_section', 'Checklist — tap an item to review it')) + '</div>' +
    '<div class="util-card" id="adChecklistCard">' + checklistHtml + '</div>' +
    (app.assigned_to
      ? '<button type="button" id="openChatBtn" class="sheet-btn-secondary" style="width:100%;margin-top:10px;">' + escapeHtml(t('taqdim_translation_applications.support_chat_btn', 'Open Support Chat')) + '</button>'
      : '<div class="list-card-meta" style="margin-top:10px;text-align:center;">' + escapeHtml(t('taqdim_translation_applications.assign_to_chat_hint', 'Assign this application to start a support chat with the student.')) + '</div>') +
    '<div class="util-section-title">' + escapeHtml(t('taqdim_translation_applications.history_section', 'Status History')) + '</div>' +
    '<div class="util-card">' + historyHtml + '</div>' +
    '<div class="sheet-form-actions">' +
      '<button type="button" class="sheet-btn-secondary" id="adAssignBtn">' + escapeHtml(t('taqdim_translation_applications.assign_btn', 'Assign')) + '</button>' +
      '<button type="button" class="sheet-btn-primary" id="adAdvanceBtn">' + escapeHtml(t('taqdim_translation_applications.advance_btn', 'Change Status')) + '</button>' +
    '</div>'
  );
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
  TaqdimTranslationChat.closeTaqdimChat();
}
function loadApplicationDetail(token, applicationId) {
  fetchAdminTaqdimTranslationApplication(token, applicationId).then(app => {
    const panel = document.getElementById('adPanel');
    if (!panel) return;
    panel.innerHTML = '<div class="sheet-handle"></div>' + renderDetailContent(token, app);
    document.getElementById('adCloseBtn').addEventListener('click', closeApplicationDetail);
    document.getElementById('adAssignBtn').addEventListener('click', () => openAssignSheet(token, app));
    document.getElementById('adAdvanceBtn').addEventListener('click', () => openAdvanceStatusSheet(token, app));
    document.getElementById('openChatBtn')?.addEventListener('click', () => openChatModal(token, app));
    panel.querySelectorAll('.appChecklistRow').forEach(row => {
      row.addEventListener('click', () => {
        const item = (app.checklistItems || []).find(i => String(i.id) === row.dataset.itemId);
        if (item) openChecklistItemReviewSheet(token, app, item);
      });
    });
  }).catch(() => {
    const panel = document.getElementById('adPanel');
    if (panel) panel.innerHTML = '<div class="sheet-handle"></div><div class="list-error">' + escapeHtml(t('taqdim_translation_applications.detail_load_failed', 'Could not load this application.')) + '</div>';
  });
}

// ── Support chat modal (admin side - can send files, lock, share credentials) ──
function openChatModal(token, app) {
  const studentId = app.student && app.student.id;
  const studentName = (app.student && app.student.name) || t('taqdim_translation_applications.unknown_student', 'Unknown student');
  if (!studentId) return;

  const overlay = document.createElement('div');
  overlay.className = 'taqdim-chat-overlay';
  overlay.innerHTML = '<div class="taqdim-chat-modal">' +
    '<div class="taqdim-chat-close"><button type="button" id="closeChatBtn" style="background:none;border:none;cursor:pointer;padding:0;font-size:24px;color:var(--subtle);">×</button></div>' +
    TaqdimTranslationChat.renderChatInterface(studentName) +
  '</div>';
  document.body.appendChild(overlay);

  document.getElementById('closeChatBtn')?.addEventListener('click', () => {
    overlay.remove();
    TaqdimTranslationChat.closeTaqdimChat();
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
      TaqdimTranslationChat.closeTaqdimChat();
    }
  });

  TaqdimTranslationChat.initializeTaqdimChat(token, studentId, studentName, true);
}

// ── Checklist item review sheet (admin's per-item notes) ──
function openChecklistItemReviewSheet(token, app, item) {
  let backdrop = document.getElementById('irBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'irBackdrop';
    backdrop.className = 'sheet-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.classList.remove('open'); });
  }
  backdrop.innerHTML =
    '<div class="sheet-panel form">' +
      '<div class="sheet-handle"></div>' +
      '<div class="sheet-title-row"><span class="sheet-title">' + escapeHtml(item.title) + '</span>' +
        '<button type="button" class="sheet-close-btn" id="irCloseBtn">' + icon('close', { size: 16, color: 'var(--subtle)' }) + '</button></div>' +
      (item.statement_text ? '<div class="list-card-meta" style="white-space:pre-wrap;margin-bottom:10px;">' + escapeHtml(item.statement_text) + '</div>' : '') +
      (item.document_url ? '<div class="list-card-meta" style="margin-bottom:10px;"><a href="' + escapeHtml(item.document_url) + '" target="_blank">' + escapeHtml(t('taqdim_translation_applications.document_view_link', 'View uploaded document')) + '</a></div>' : '') +
      '<label class="util-row" style="padding:10px 0;">' +
        '<span class="util-row-title">' + escapeHtml(t('taqdim_translation_applications.mark_completed_toggle', 'Mark as completed')) + '</span>' +
        '<span class="switch"><input type="checkbox" id="irCompleted"' + (item.is_completed ? ' checked' : '') + '><span class="switch-track"></span></span>' +
      '</label>' +
      '<label class="util-label">' + escapeHtml(t('taqdim_translation_applications.note_label', 'Note (optional, visible to the student)')) + '</label>' +
      '<textarea id="irNotes" class="util-input" placeholder="' + escapeHtml(t('taqdim_translation_applications.note_placeholder', 'e.g. Please re-upload, image is unreadable')) + '">' + escapeHtml(item.notes || '') + '</textarea>' +
      '<div class="sheet-form-actions">' +
        '<button type="button" class="sheet-btn-secondary" id="irCancelBtn">' + escapeHtml(t('common.cancel', 'Cancel')) + '</button>' +
        '<button type="button" class="sheet-btn-primary" id="irSubmitBtn"><span id="irSubmitLabel">' + escapeHtml(t('common.save', 'Save')) + '</span></button>' +
      '</div>' +
    '</div>';
  document.getElementById('irCloseBtn').addEventListener('click', () => backdrop.classList.remove('open'));
  document.getElementById('irCancelBtn').addEventListener('click', () => backdrop.classList.remove('open'));
  document.getElementById('irSubmitBtn').addEventListener('click', () => {
    const isCompleted = document.getElementById('irCompleted').checked;
    const notes = document.getElementById('irNotes').value.trim() || null;
    const btn = document.getElementById('irSubmitBtn');
    const label = document.getElementById('irSubmitLabel');
    btn.disabled = true; label.innerHTML = '<span class="util-spinner"></span>';
    reviewTaqdimTranslationChecklistItem(token, item.id, isCompleted, notes).then(() => {
      backdrop.classList.remove('open');
      showToast(t('taqdim_translation_applications.item_reviewed_toast', 'Item updated.'));
      loadApplicationDetail(token, app.id);
      reload(token);
    }).catch(err => showToast(err && err.message ? err.message : t('taqdim_translation_applications.item_review_failed', 'Could not update this item.')))
      .finally(() => { btn.disabled = false; label.textContent = t('common.save', 'Save'); });
  });
  backdrop.classList.add('open');
}

// ── Assign sheet (assign to me / unassign only - see file header) ──
// Available to every admin regardless of who else is looking at the
// queue - there's no "claiming" lock, so whichever free admin gets to
// it first can assign it to themself immediately.
function openAssignSheet(token, app) {
  const options = [];
  if (app.assigned_to) {
    options.push({ icon: 'close', label: t('taqdim_translation_applications.unassign_label', 'Unassign'), desc: t('taqdim_translation_applications.unassign_desc', 'Remove the current reviewer'), onPress: () => doAssign(token, app, null) });
  }
  if (!currentUser || String(app.assigned_to) !== String(currentUser.id)) {
    options.push({ icon: 'person', label: t('taqdim_translation_applications.assign_me_label', 'Assign to me'), desc: currentUser ? (currentUser.name || '') : '', onPress: () => doAssign(token, app, currentUser.id) });
  }
  openActionSheet(t('taqdim_translation_applications.assign_title', 'Assign To'), options);
}
function doAssign(token, app, staffId) {
  assignTaqdimTranslationApplication(token, app.id, staffId).then(() => {
    showToast(t('taqdim_translation_applications.assigned_toast', 'Assignment updated.'));
    loadApplicationDetail(token, app.id);
    reload(token);
  }).catch(err => showToast(err && err.message ? err.message : t('taqdim_translation_applications.assign_failed', 'Could not update assignment.')));
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
      '<div class="sheet-title-row"><span class="sheet-title">' + escapeHtml(t('taqdim_translation_applications.advance_title', 'Change Status')) + '</span>' +
        '<button type="button" class="sheet-close-btn" id="asCloseBtn">' + icon('close', { size: 16, color: 'var(--subtle)' }) + '</button></div>' +
      '<label class="util-label" style="margin-top:0;">' + escapeHtml(t('taqdim_translation_applications.new_status_label', 'New status')) + '</label>' +
      '<select id="asStatus" class="util-input">' + options.map(s => '<option value="' + s + '">' + escapeHtml(appStatusLabel(s)) + '</option>').join('') + '</select>' +
      '<label class="util-label">' + escapeHtml(t('taqdim_translation_applications.note_label_decision', 'Note (optional, visible to the student)')) + '</label>' +
      '<textarea id="asNote" class="util-input" placeholder="' + escapeHtml(t('taqdim_translation_applications.note_placeholder_decision', 'e.g. reason for the decision')) + '"></textarea>' +
      '<div class="sheet-form-actions">' +
        '<button type="button" class="sheet-btn-secondary" id="asCancelBtn">' + escapeHtml(t('common.cancel', 'Cancel')) + '</button>' +
        '<button type="button" class="sheet-btn-primary" id="asSubmitBtn"><span id="asSubmitLabel">' + escapeHtml(t('taqdim_translation_applications.advance_submit', 'Update')) + '</span></button>' +
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
    advanceTaqdimTranslationApplicationStatus(token, app.id, status, note).then(() => {
      backdrop.classList.remove('open');
      showToast(t('taqdim_translation_applications.status_updated_toast', 'Status updated.'));
      loadApplicationDetail(token, app.id);
      reload(token);
    }).catch(err => showToast(err && err.message ? err.message : t('taqdim_translation_applications.status_update_failed', 'Could not update status.')))
      .finally(() => { btn.disabled = false; label.textContent = t('taqdim_translation_applications.advance_submit', 'Update'); });
  });
  backdrop.classList.add('open');
}

// ── Boot ──
function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(featureTitle(), t('taqdim_translation_applications.subtitle', 'Review, assign, and decide on submitted applications'), APPS_FEATURE === 'translation' ? 'translation-dashboard.php' : 'taqdim-dashboard.php');
}
renderHeaderText();
onLocaleChange(renderHeaderText);

function reload(token) {
  document.getElementById('listContent').innerHTML = '<div class="list-loading">' + escapeHtml(t('common.loading', 'Loading…')) + '</div>';
  const filters = { feature: APPS_FEATURE };
  if (statusFilter) filters.status = statusFilter;
  // No unassigned_only param on the backend (adminApplicationList only
  // recognizes feature/status/assigned_to) - filtered client-side below.
  fetchAdminTaqdimTranslationApplications(token, filters).then(list => {
    allApplications = unassignedOnly ? list.filter(a => !a.assigned_to) : list;
    renderList(token);
  }).catch(() => {
    lastListRendered = false;
    document.getElementById('listContent').innerHTML =
      '<div class="list-error">' + escapeHtml(t('taqdim_translation_applications.load_failed', 'Failed to load applications.')) + '<br><button type="button" class="list-retry-btn" id="retryBtn">' + escapeHtml(t('common.retry', 'Try again')) + '</button></div>';
    document.getElementById('retryBtn')?.addEventListener('click', () => reload(token));
  });
}

guardDashboard('admin', function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  if (!user.school_features || !user.school_features[APPS_FEATURE]) {
    window.location.href = 'admin-dashboard.php';
    return;
  }
  currentUser = user;
  // Deep-link support: admin-dashboard.php's pending-requests card can
  // link here with ?unassigned=1 to jump straight to the unclaimed queue.
  if (qsParam('unassigned') === '1') unassignedOnly = true;
  renderStatusFilterRow(token);
  reload(token);
});
