// Admin: Enrollment Records — web port of
// src/screens/admin/{EnrollmentWorkflowListScreen,EnrollmentWorkflowDetailScreen}.tsx.
// A student's progress through the stages configured in Enrollment Stages -
// reachable from that page's "Students" quicklink. Backend:
// EnrollmentWorkflowController (admin_enrollment_workflow_*).
//
// Scoped admin-only, unlike the RN screens (which also let cashier/registrar
// share this view, narrowed to their own stage queue - see the controller's
// requireApprover/approverRoleFor). Every other admin-*.php page in this app
// gates on role 'admin' exclusively with no dual-role access built anywhere
// yet, so this follows that same convention rather than being the first
// page to introduce it. If cashier/registrar access to this page is wanted
// later, the backend already supports it - only this page's guardDashboard
// role list and the cashier-specific stage-gating in the RN detail screen
// would need porting.

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(t('enrollment_students.title', 'Enrollment Records'), t('enrollment_students.subtitle', 'Students moving through your enrollment stages.'), 'enrollment-stages.php', null);
}
renderHeaderText();

/* ── Data ── */
function fetchWorkflowList(token, status) {
  return authedPost('/admin_enrollment_workflow_list', token, status && status !== 'all' ? { status } : {})
    .then(d => (d.records || []).map(r => ({
      ...r,
      student: r.student ? { ...r.student, photo: absoluteUrl(r.student.photo) } : r.student,
    })));
}
function fetchWorkflowStagesActive(token) {
  return authedPost('/admin_enrollment_stages_list', token, { status: 'active' }).then(d => d.stages || []);
}
function startWorkflow(token, userId, sessionId, archivePrevious) {
  return authedPost('/admin_enrollment_workflow_start', token, {
    user_id: userId,
    session_id: sessionId,
    archive_previous_data: !!archivePrevious,
  });
}
// Records already started for the CURRENT session only (any status), so
// the Start picker can tell whether a picked student is a fresh start vs.
// a restart of a completed/withdrawn record before calling startWorkflow -
// admin_enrollment_workflow_start itself makes the same restart-vs-create
// decision server-side, this is just enough to warn the admin first.
function fetchWorkflowListForSession(token, sessionId) {
  return authedPost('/admin_enrollment_workflow_list', token, { session_id: sessionId })
    .then(d => d.records || []);
}
function advanceWorkflow(token, recordId, stageId) {
  return authedPost('/admin_enrollment_workflow_advance', token, { record_id: recordId, stage_id: stageId }).then(d => d.record);
}
function withdrawWorkflow(token, recordId) {
  return authedPost('/admin_enrollment_workflow_withdraw', token, { record_id: recordId }).then(d => d.record);
}
function fetchWorkflowHistory(token, recordId) {
  return authedPost('/admin_enrollment_workflow_history', token, { record_id: recordId });
}
function placeInSection(token, recordId, classId, sectionId) {
  return authedPost('/admin_enrollment_workflow_place_in_section', token, { record_id: recordId, class_id: classId, section_id: sectionId });
}
function fetchWorkflowPayments(token, recordId) {
  return authedPost('/admin_enrollment_workflow_payments_list', token, { record_id: recordId }).then(d => d.payments || []);
}
function updateWorkflowPayment(token, recordId, feeTypeId, input) {
  const form = new FormData();
  form.append('record_id', String(recordId));
  form.append('fee_type_id', String(feeTypeId));
  form.append('status', input.status);
  if (input.amount != null) form.append('amount', String(input.amount));
  if (input.payment_mode) form.append('payment_mode', input.payment_mode);
  if (input.receipt_number) form.append('receipt_number', input.receipt_number);
  if (input.receiptPhotoFile) form.append('receipt_photo', input.receiptPhotoFile, input.receiptPhotoFile.name || 'receipt.jpg');
  return fetch(API_BASE_URL + '/admin_enrollment_workflow_payment_update', {
    method: 'POST',
    headers: { Accept: 'application/json', Authorization: 'Bearer ' + token },
    body: form,
  }).then(res => res.json().catch(() => ({})).then(data => {
    if (!res.ok) throw new Error((data && data.message) || firstValidationError(data) || t('enrollment_students.request_failed', 'Request failed ({status})').replace('{status}', res.status));
    return data.payment;
  }));
}

/* ── Helpers ── */
function formatMoney(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num)) return null;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatHistoryDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) { return iso; }
}
function workflowStatusLabel(s) {
  const fallback = (s || '').replace(/_/g, ' ');
  return t('enrollment_students.status_' + s, fallback);
}
function paymentStatusLabel(s) {
  const fallback = { unpaid: 'unpaid', paid: 'paid', waived: 'waived' }[s] || s;
  return t('enrollment_students.pay_status_' + s, fallback);
}
function modeLabel(m) {
  const fallback = (m || '').replace(/_/g, ' ');
  return t('enrollment_students.pay_mode_' + m, fallback);
}
const STATUS_FILTERS = ['in_progress', 'completed', 'withdrawn', 'all'];
const PAYMENT_STATUSES = ['unpaid', 'paid', 'waived'];
const PAYMENT_MODES = ['cash', 'bank_transfer', 'gcash', 'check', 'other'];

/* ── State ── */
let currentToken = null;
let statusFilter = 'in_progress';
let allRecords = [];
let currentSession = null;
let sessionChecked = false;
let sessionRecordsByUserId = {};
let ewBooted = false;

let activeRecord = null;
let activeHistory = [];
let activeStages = [];
let activePayments = [];

let placeClasses = [];
let placeSections = [];
let placeSelectedClass = null;

let activePayment = null;
let activePaymentPhotoFile = null;

/* ── List ── */
function renderFilterRow() {
  const wrap = document.getElementById('ewFilterRow');
  wrap.innerHTML = STATUS_FILTERS.map(s =>
    '<button type="button" class="filter-chip' + (statusFilter === s ? ' active' : '') + '" data-status="' + s + '">' +
      escapeHtml(s === 'all' ? t('enrollment_students.filter_all', 'All') : workflowStatusLabel(s)) +
    '</button>'
  ).join('');
  wrap.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      statusFilter = btn.dataset.status;
      load(currentToken);
    });
  });
}

function renderToolbar() {
  const wrap = document.getElementById('ewToolbar');
  wrap.innerHTML = '<button type="button" class="ew-start-btn" id="ewStartBtn">' + escapeHtml(t('enrollment_students.start_action', '+ Start')) + '</button>';
  document.getElementById('ewStartBtn').addEventListener('click', openStartPicker);
}

function renderRecordList() {
  const wrap = document.getElementById('ewListWrap');

  const banner = (sessionChecked && !currentSession)
    ? '<div class="ew-warn-banner">' + escapeHtml(t('enrollment_students.no_session_banner', 'No academic year is set as current yet - set one before starting workflows.')) + '</div>'
    : '';

  if (allRecords.length === 0) {
    wrap.innerHTML = banner +
      '<div class="list-empty">' +
        '<div class="list-empty-title">' + escapeHtml(t('enrollment_students.empty_title', 'No records here')) + '</div>' +
        '<div class="list-empty-sub">' +
          (statusFilter === 'all'
            ? escapeHtml(t('enrollment_students.empty_sub_all', 'No students have been started in the enrollment workflow yet.'))
            : escapeHtml(t('enrollment_students.empty_sub_filtered', 'No {status} records right now.').replace('{status}', workflowStatusLabel(statusFilter)))) +
        '</div>' +
      '</div>';
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'ew-record-grid';
  allRecords.forEach(r => {
    const name = (r.student && r.student.name) || t('enrollment_students.student_fallback', 'Student #{id}').replace('{id}', r.user_id);
    const initial = name.trim().charAt(0).toUpperCase() || '?';
    const placed = !!r.section_name;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'ew-record-card';
    card.innerHTML =
      '<div class="ew-record-top">' +
        (r.student && r.student.photo
          ? '<img class="ew-record-avatar" src="' + escapeHtml(r.student.photo) + '" alt="" />'
          : '<span class="ew-record-avatar-fallback">' + escapeHtml(initial) + '</span>') +
        '<span class="ew-record-status ' + escapeHtml(r.status) + '">' + escapeHtml(workflowStatusLabel(r.status)) + '</span>' +
      '</div>' +
      '<div class="ew-record-name">' + escapeHtml(name) + '</div>' +
      '<div class="ew-record-stage">' + escapeHtml((r.current_stage && r.current_stage.name) || t('enrollment_students.unknown_stage', 'Unknown stage')) + '</div>' +
      (placed
        ? '<span class="ew-record-chip ok">' + icon('layers', { size: 12, color: 'var(--emerald-deep)' }) + '<span class="ellip">' + escapeHtml([r.class_name, r.section_name].filter(Boolean).join(' - ')) + '</span></span>'
        : '<span class="ew-record-chip warn">' + icon('warning', { size: 12, color: '#B91C1C' }) + '<span class="ellip">' + escapeHtml(r.status === 'completed' ? t('enrollment_students.needs_section', 'Needs section') : t('enrollment_students.not_placed', 'Not placed')) + '</span></span>');
    card.addEventListener('click', () => openDetail(r.id));
    grid.appendChild(card);
  });

  wrap.innerHTML = '';
  if (banner) wrap.insertAdjacentHTML('beforeend', banner);
  wrap.appendChild(grid);
}

function load(token) {
  document.getElementById('ewListWrap').innerHTML = '<div class="list-loading">' + escapeHtml(t('common.loading', 'Loading…')) + '</div>';
  renderFilterRow();

  const tasks = [fetchWorkflowList(token, statusFilter)];
  tasks.push(
    fetchAcademicSessions(token).then(sessions => { currentSession = pickCurrentSession(sessions); })
      .catch(() => { currentSession = null; })
      .finally(() => { sessionChecked = true; })
  );

  Promise.all(tasks).then(([records]) => {
    allRecords = records;
    renderRecordList();
  }).catch(() => {
    document.getElementById('ewListWrap').innerHTML =
      '<div class="list-error">' + escapeHtml(t('enrollment_students.load_failed', 'Failed to load enrollment records.')) + '<br><button type="button" class="list-retry-btn" id="ewRetryBtn">' + escapeHtml(t('common.retry', 'Try again')) + '</button></div>';
    document.getElementById('ewRetryBtn')?.addEventListener('click', () => load(token));
  });
}

/* ── Start Workflow picker ── */
function openStartPicker() {
  if (!currentSession) {
    alert(t('enrollment_students.no_year_alert', 'No Academic Year Set\n\nSet a current academic year before starting enrollment workflows for students.'));
    return;
  }
  document.getElementById('ewStartSearch').value = '';
  document.getElementById('ewStartBackdrop').classList.add('open');
  searchStartStudents('');

  sessionRecordsByUserId = {};
  fetchWorkflowListForSession(currentToken, currentSession.id).then(records => {
    records.forEach(r => { sessionRecordsByUserId[r.user_id] = r; });
  }).catch(() => {
    // Leave the map empty on failure - onStartStudent then treats every
    // pick as a fresh start, same as before this feature existed. The
    // backend's own duplicate-in_progress check (422) still catches the
    // one case that actually matters if this silently missed something.
  });
}
function closeStartPicker() {
  document.getElementById('ewStartBackdrop').classList.remove('open');
}
function searchStartStudents(q) {
  const listEl = document.getElementById('ewStartList');
  listEl.innerHTML = '<div class="ew-picker-empty">' + escapeHtml(t('common.loading', 'Loading…')) + '</div>';
  fetchStudents(currentToken, q).then(students => {
    if (students.length === 0) {
      listEl.innerHTML = '<div class="ew-picker-empty">' + escapeHtml(t('enrollment_students.no_match', 'No students match "{q}".').replace('{q}', q)) + '</div>';
      return;
    }
    listEl.innerHTML = students.map(s =>
      '<button type="button" class="ew-picker-row" data-id="' + s.id + '"><span>' + escapeHtml(s.name) + '</span></button>'
    ).join('');
    listEl.querySelectorAll('.ew-picker-row').forEach(btn => {
      btn.addEventListener('click', () => onStartStudent(parseInt(btn.dataset.id, 10), btn));
    });
  }).catch(() => {
    listEl.innerHTML = '<div class="ew-picker-empty">' + escapeHtml(t('enrollment_students.load_students_failed', 'Could not load students.')) + '</div>';
  });
}
function onStartStudent(studentId, btn) {
  const existing = sessionRecordsByUserId[studentId];
  let archivePrevious = false;
  const sessionTitle = currentSession.session_title || t('enrollment_students.this_session', 'this session');

  if (existing && existing.status === 'in_progress') {
    // Same block the backend itself enforces (422) - caught here first so
    // the admin isn't left waiting on a round trip for something the list
    // already knows.
    alert(t('enrollment_students.already_active_alert', 'This student already has an active enrollment workflow for {session}.').replace('{session}', sessionTitle));
    return;
  }

  if (existing && existing.status === 'completed') {
    // A 'completed' record is a closed, official enrollment - the backend
    // itself now rejects starting one again (422), so this is blocked here
    // too rather than only surfacing that as a caught error after the fact.
    alert(t('enrollment_students.already_enrolled_alert', 'This student is already enrolled for {session} and cannot be enrolled again.').replace('{session}', sessionTitle));
    return;
  }

  if (existing) {
    // Only a 'withdrawn' record reaches here (in_progress/completed both
    // return above) - a withdrawn student re-applying is the one case the
    // backend still allows to restart, going through the archive step.
    const proceed = confirm(
      t('enrollment_students.withdrawn_restart_confirm', 'This student has a withdrawn enrollment workflow record for {session}.\n\nContinuing will archive their current grades and class schedule as a document under their profile (visible in Documents), then restart their enrollment from the first stage. Their grades and schedule themselves are not deleted.\n\nContinue?').replace('{session}', sessionTitle)
    );
    if (!proceed) return;
    archivePrevious = true;
  }

  const startingLabel = btn.textContent;
  btn.disabled = true;
  btn.innerHTML = '<span>' + escapeHtml(t('enrollment_students.starting', 'Starting…')) + '</span><span class="util-spinner"></span>';
  startWorkflow(currentToken, studentId, currentSession.id, archivePrevious).then((data) => {
    closeStartPicker();
    showToast(data && data.archived_document
      ? t('enrollment_students.started_archived_toast', 'Enrollment workflow started. Previous record archived to Documents.')
      : t('enrollment_students.started_toast', 'Enrollment workflow started.'));
    load(currentToken);
  }).catch(err => {
    alert((err && err.message) || t('enrollment_students.start_failed', 'Could not start the workflow.'));
    btn.disabled = false;
    btn.innerHTML = '<span>' + escapeHtml(startingLabel) + '</span>';
  });
}

/* ── Detail overlay ── */
function openDetail(recordId) {
  document.getElementById('ewDetailOverlay').classList.add('open');
  document.getElementById('ewDetailContent').innerHTML = '<div class="list-loading">' + escapeHtml(t('common.loading', 'Loading…')) + '</div>';
  loadDetail(recordId);
}
function closeDetail() {
  document.getElementById('ewDetailOverlay').classList.remove('open');
  activeRecord = null;
}
function loadDetail(recordId) {
  Promise.all([
    fetchWorkflowHistory(currentToken, recordId),
    fetchWorkflowStagesActive(currentToken),
    fetchWorkflowPayments(currentToken, recordId),
  ]).then(([historyData, stages, payments]) => {
    activeRecord = historyData.record;
    activeHistory = historyData.history || [];
    activeStages = stages;
    activePayments = payments;
    renderDetail();
  }).catch((err) => {
    document.getElementById('ewDetailContent').innerHTML =
      '<div class="list-error">' + escapeHtml((err && err.message) || t('enrollment_students.load_record_failed', 'Failed to load this record.')) + '<br><button type="button" class="list-retry-btn" id="ewDetailRetryBtn">' + escapeHtml(t('common.retry', 'Try again')) + '</button></div>';
    document.getElementById('ewDetailRetryBtn')?.addEventListener('click', () => loadDetail(recordId));
  });
}

function renderDetail() {
  const r = activeRecord;
  const name = (r.student && r.student.name) || t('enrollment_students.student_fallback', 'Student #{id}').replace('{id}', r.user_id);
  const isInProgress = r.status === 'in_progress';

  let html = '<div class="ew-summary-card">' +
    '<div class="ew-summary-name">' + escapeHtml(name) + '</div>' +
    '<span class="ew-record-status ' + escapeHtml(r.status) + '">' + escapeHtml(workflowStatusLabel(r.status)) + '</span>' +
    '<div class="ew-summary-label">' + escapeHtml(t('enrollment_students.current_stage_label', 'Current Stage')) + '</div>' +
    '<div class="ew-summary-stage">' + escapeHtml((r.current_stage && r.current_stage.name) || '—') + '</div>' +
    (r.notes ? '<div class="ew-summary-label">' + escapeHtml(t('enrollment_students.notes_label', 'Notes')) + '</div><div class="ew-summary-notes">' + escapeHtml(r.notes) + '</div>' : '') +
  '</div>';

  if (activePayments.length > 0) {
    html += '<div class="ew-section-label">' + escapeHtml(t('enrollment_students.fees_label', 'Fees')) + '</div>';

    const outstanding = activePayments.filter(p => p.status === 'unpaid');
    if (outstanding.length > 0) {
      const totalDue = outstanding.reduce((sum, p) => {
        const val = p.amount != null ? p.amount : (p.feeType && p.feeType.amount);
        const num = val != null ? parseFloat(val) : 0;
        return sum + (Number.isNaN(num) ? 0 : num);
      }, 0);
      html += '<div class="ew-total-due"><span class="ew-total-due-label">' + escapeHtml(t('enrollment_students.total_due_label', 'Total due ({n} unpaid)').replace('{n}', outstanding.length)) + '</span><span class="ew-total-due-value">' + (formatMoney(totalDue) || '0.00') + '</span></div>';
    }

    activePayments.forEach(p => {
      const feeName = (p.feeType && p.feeType.name) || t('enrollment_students.fee_fallback', 'Fee');
      const displayAmount = formatMoney(p.amount != null ? p.amount : (p.feeType && p.feeType.amount));
      const suggested = p.amount == null && p.feeType && p.feeType.amount != null;
      const metaParts = [];
      if (p.payment_mode) metaParts.push(modeLabel(p.payment_mode));
      if (p.receipt_number) metaParts.push('#' + p.receipt_number);
      html +=
        '<button type="button" class="ew-fee-row" data-payment-id="' + p.id + '">' +
          '<span style="flex:1;min-width:0;">' +
            '<span class="ew-fee-name-row"><span class="ew-fee-name">' + escapeHtml(feeName) + '</span>' +
              (p.feeType && p.feeType.is_required ? '<span class="ew-fee-required-tag">' + escapeHtml(t('enrollment_students.required_tag', 'Required')) + '</span>' : '') +
            '</span>' +
            (displayAmount ? '<div class="ew-fee-amount">' + escapeHtml(displayAmount) + (suggested ? ' ' + escapeHtml(t('enrollment_students.suggested_suffix', '(suggested)')) : '') + '</div>' : '') +
            (metaParts.length ? '<div class="ew-fee-meta">' + escapeHtml(metaParts.join(' · ')) + '</div>' : '') +
            (p.recordedBy && p.recordedBy.name ? '<div class="ew-fee-meta">' + escapeHtml(t('enrollment_students.recorded_by', 'Recorded by {name}').replace('{name}', p.recordedBy.name)) + '</div>' : '') +
          '</span>' +
          '<span class="ew-fee-status ' + escapeHtml(p.status) + '">' + escapeHtml(paymentStatusLabel(p.status)) + '</span>' +
        '</button>';
    });
  }

  if (isInProgress) {
    html += '<div class="ew-actions-row">' +
      '<button type="button" class="ew-action-btn advance" id="ewAdvanceBtn">' + escapeHtml(t('enrollment_students.move_to_stage_btn', 'Move to Stage...')) + '</button>' +
      '<button type="button" class="ew-action-btn withdraw" id="ewWithdrawBtn">' + escapeHtml(t('enrollment_students.withdraw_btn', 'Withdraw')) + '</button>' +
    '</div>';
  } else if (r.status === 'completed') {
    html += '<div class="ew-actions-row">' +
      '<button type="button" class="ew-action-btn advance" id="ewPlaceBtn">' + escapeHtml(t('enrollment_students.place_in_section_btn', 'Place in Section...')) + '</button>' +
    '</div>';
  }

  html += '<div class="ew-section-label">' + escapeHtml(t('enrollment_students.history_label', 'History')) + '</div>';
  if (activeHistory.length === 0) {
    html += '<div class="ew-picker-empty" style="text-align:left;padding:0;">' + escapeHtml(t('enrollment_students.no_history', 'No stage changes recorded yet.')) + '</div>';
  } else {
    activeHistory.slice().reverse().forEach(h => {
      html += '<div class="ew-history-row"><div class="ew-history-dot"></div><div style="flex:1;min-width:0;">' +
        '<div class="ew-history-text">' + escapeHtml((h.from_stage && h.from_stage.name) || t('enrollment_students.started_label', 'Started')) + ' <span class="ew-history-arrow">→</span> ' + escapeHtml((h.to_stage && h.to_stage.name) || '—') + '</div>' +
        '<div class="ew-history-meta">' + escapeHtml(formatHistoryDate(h.created_at)) + (h.changed_by_user && h.changed_by_user.name ? ' ' + escapeHtml(t('enrollment_students.by_suffix', '· by {name}').replace('{name}', h.changed_by_user.name)) : '') + '</div>' +
        (h.notes ? '<div class="ew-history-notes">' + escapeHtml(h.notes) + '</div>' : '') +
      '</div></div>';
    });
  }

  document.getElementById('ewDetailContent').innerHTML = html;

  document.getElementById('ewAdvanceBtn')?.addEventListener('click', openAdvanceModal);
  document.getElementById('ewWithdrawBtn')?.addEventListener('click', onWithdraw);
  document.getElementById('ewPlaceBtn')?.addEventListener('click', openPlaceModal);
  document.querySelectorAll('[data-payment-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const payment = activePayments.find(p => p.id === parseInt(btn.dataset.paymentId, 10));
      if (payment) openPaymentModal(payment);
    });
  });
}

/* ── Move to Stage ── */
function openAdvanceModal() {
  const listEl = document.getElementById('ewStageList');
  if (activeStages.length === 0) {
    listEl.innerHTML = '<div class="ew-picker-empty">' + escapeHtml(t('enrollment_students.no_active_stages', 'No active stages are configured for this school yet.')) + '</div>';
  } else {
    listEl.innerHTML = activeStages.map(s => {
      const isCurrent = s.id === activeRecord.current_stage_id;
      return '<button type="button" class="ew-picker-row' + (isCurrent ? ' ew-picker-row-current' : '') + '" data-stage-id="' + s.id + '" ' + (isCurrent ? 'disabled' : '') + '>' +
        '<span>' + escapeHtml(s.name) + (isCurrent ? ' ' + escapeHtml(t('enrollment_students.current_suffix', '(current)')) : '') + '</span>' +
      '</button>';
    }).join('');
    listEl.querySelectorAll('.ew-picker-row:not(:disabled)').forEach(btn => {
      btn.addEventListener('click', () => onAdvance(parseInt(btn.dataset.stageId, 10), btn));
    });
  }
  document.getElementById('ewStageBackdrop').classList.add('open');
}
function closeAdvanceModal() {
  document.getElementById('ewStageBackdrop').classList.remove('open');
}
function onAdvance(stageId, btn) {
  document.querySelectorAll('#ewStageList .ew-picker-row').forEach(b => b.disabled = true);
  if (btn) btn.innerHTML = '<span>' + escapeHtml(t('enrollment_students.moving', 'Moving…')) + '</span><span class="util-spinner"></span>';
  advanceWorkflow(currentToken, activeRecord.id, stageId).then(() => {
    closeAdvanceModal();
    loadDetail(activeRecord.id);
    load(currentToken);
  }).catch(err => {
    alert((err && err.message) || t('enrollment_students.advance_failed', 'Could not update the stage.'));
    openAdvanceModal();
  });
}

function onWithdraw() {
  const name = (activeRecord.student && activeRecord.student.name) || t('enrollment_students.this_student', 'this student');
  if (!confirm(t('enrollment_students.withdraw_confirm', 'Withdraw {name} from the enrollment workflow? A new workflow must be started to re-enter them.').replace('{name}', name))) return;
  withdrawWorkflow(currentToken, activeRecord.id).then(() => {
    showToast(t('enrollment_students.withdrawn_toast', 'Student withdrawn.'));
    loadDetail(activeRecord.id);
    load(currentToken);
  }).catch(err => alert((err && err.message) || t('enrollment_students.withdraw_failed', 'Could not withdraw the student.')));
}

/* ── Place in Section (class, then section) ──
   No web UI exists yet to CREATE sections (only classes - see
   classes-sections.js); RN's own "no sections found" empty state links to
   a section-creation screen this app doesn't have a web port of, so that
   case here is informational only rather than a dead link. */
function openPlaceModal() {
  placeSelectedClass = null;
  placeSections = [];
  document.getElementById('ewPlaceTitle').textContent = t('enrollment_students.select_class_title', 'Select Class');
  const listEl = document.getElementById('ewPlaceList');
  listEl.innerHTML = '<div class="ew-picker-empty">' + escapeHtml(t('common.loading', 'Loading…')) + '</div>';
  document.getElementById('ewPlaceBackdrop').classList.add('open');

  if (placeClasses.length > 0) {
    renderPlaceClassList();
    return;
  }
  fetchClasses(currentToken).then(classes => {
    placeClasses = classes;
    renderPlaceClassList();
  }).catch(() => {
    listEl.innerHTML = '<div class="ew-picker-empty">' + escapeHtml(t('enrollment_students.load_classes_failed', 'Could not load classes.')) + '</div>';
  });
}
function closePlaceModal() {
  document.getElementById('ewPlaceBackdrop').classList.remove('open');
}
function renderPlaceClassList() {
  const listEl = document.getElementById('ewPlaceList');
  if (placeClasses.length === 0) {
    listEl.innerHTML = '<div class="ew-picker-empty">' + escapeHtml(t('enrollment_students.no_classes_found', 'No classes found.')) + '<br><a href="classes-sections.php" class="ew-picker-change-link">' + escapeHtml(t('enrollment_students.go_to_classes_link', 'Go to Classes & Sections')) + '</a></div>';
    return;
  }
  listEl.innerHTML = placeClasses.map(c =>
    '<button type="button" class="ew-picker-row" data-class-id="' + c.id + '"><span>' + escapeHtml(c.name) + '</span></button>'
  ).join('');
  listEl.querySelectorAll('.ew-picker-row').forEach(btn => {
    btn.addEventListener('click', () => onPickClass(parseInt(btn.dataset.classId, 10)));
  });
}
function onPickClass(classId) {
  placeSelectedClass = placeClasses.find(c => c.id === classId);
  document.getElementById('ewPlaceTitle').textContent = t('enrollment_students.select_section_title', 'Select Section');
  const listEl = document.getElementById('ewPlaceList');
  listEl.innerHTML = '<div class="ew-picker-empty">' + escapeHtml(t('common.loading', 'Loading…')) + '</div>';
  fetchSections(currentToken, classId).then(sections => {
    placeSections = sections;
    renderPlaceSectionList();
  }).catch(() => {
    listEl.innerHTML = '<div class="ew-picker-empty">' + escapeHtml(t('enrollment_students.load_sections_failed', 'Could not load sections.')) + '</div>';
  });
}
function renderPlaceSectionList() {
  const listEl = document.getElementById('ewPlaceList');
  const changeLink = '<a href="#" class="ew-picker-change-link" id="ewPlaceChangeClass">&lsaquo; ' + escapeHtml(t('enrollment_students.change_class_link', 'Change class')) + '</a>';
  if (placeSections.length === 0) {
    listEl.innerHTML = changeLink + '<div class="ew-picker-empty">' + escapeHtml(t('enrollment_students.no_sections_found', 'No sections found for this class yet.')) + '</div>';
  } else {
    listEl.innerHTML = changeLink + placeSections.map(s =>
      '<button type="button" class="ew-picker-row" data-section-id="' + s.id + '"><span>' + escapeHtml(s.name) + '</span></button>'
    ).join('');
    listEl.querySelectorAll('.ew-picker-row').forEach(btn => {
      btn.addEventListener('click', () => onPickSection(parseInt(btn.dataset.sectionId, 10), btn));
    });
  }
  document.getElementById('ewPlaceChangeClass').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('ewPlaceTitle').textContent = t('enrollment_students.select_class_title', 'Select Class');
    renderPlaceClassList();
  });
}
function onPickSection(sectionId, btn) {
  if (btn) { btn.disabled = true; btn.innerHTML = '<span>' + escapeHtml(t('enrollment_students.placing', 'Placing…')) + '</span><span class="util-spinner"></span>'; }
  const section = placeSections.find(s => s.id === sectionId);
  placeInSection(currentToken, activeRecord.id, placeSelectedClass.id, sectionId).then(() => {
    closePlaceModal();
    return loadDetail(activeRecord.id);
  }).then(() => {
    load(currentToken);
    alert(t('enrollment_students.placed_alert', '{name} has been added to {class} - {section}.').replace('{name}', (activeRecord.student && activeRecord.student.name) || t('enrollment_students.the_student', 'The student')).replace('{class}', placeSelectedClass.name).replace('{section}', section ? section.name : ''));
  }).catch(err => {
    alert((err && err.message) || t('enrollment_students.place_failed', 'Could not place the student in that section.'));
    renderPlaceSectionList();
  });
}

/* ── Payment edit ── */
function openPaymentModal(payment) {
  activePayment = payment;
  activePaymentPhotoFile = null;
  document.getElementById('ewPaymentTitle').textContent = (payment.feeType && payment.feeType.name) || t('enrollment_students.fee_fallback', 'Fee');

  const suggestedAmount = payment.feeType && payment.feeType.amount != null ? payment.feeType.amount : null;
  const amountValue = payment.amount != null ? payment.amount : '';

  document.getElementById('ewPaymentForm').innerHTML =
    '<label class="util-label" style="margin-top:0;">' + escapeHtml(t('enrollment_students.status_field_label', 'Status')) + '</label>' +
    '<div class="stage-chip-row" id="ewPayStatusRow">' +
      PAYMENT_STATUSES.map(s => '<button type="button" class="stage-chip' + (payment.status === s ? ' selected' : '') + '" data-value="' + s + '">' + escapeHtml(paymentStatusLabel(s)) + '</button>').join('') +
    '</div>' +
    '<label class="util-label">' + escapeHtml(t('enrollment_students.amount_field_label', 'Amount')) + '</label>' +
    '<input type="text" inputmode="decimal" id="ewPayAmount" class="util-input" placeholder="' + (suggestedAmount != null ? escapeHtml(String(suggestedAmount)) : 'e.g. 5000') + '" value="' + escapeHtml(String(amountValue)) + '" />' +
    (suggestedAmount != null ? '<div class="ew-amount-hint">' + escapeHtml(t('enrollment_students.suggested_amount_hint', 'School’s suggested amount: {amount}').replace('{amount}', formatMoney(suggestedAmount) || String(suggestedAmount))) + '</div>' : '') +
    '<label class="util-label">' + escapeHtml(t('enrollment_students.payment_mode_label', 'Payment Mode')) + '</label>' +
    '<div class="stage-chip-row" id="ewPayModeRow">' +
      PAYMENT_MODES.map(m => '<button type="button" class="stage-chip' + (payment.payment_mode === m ? ' selected' : '') + '" data-value="' + m + '">' + escapeHtml(modeLabel(m)) + '</button>').join('') +
    '</div>' +
    '<label class="util-label">' + escapeHtml(t('enrollment_students.receipt_number_label', 'Receipt / OR Number')) + '</label>' +
    '<input type="text" id="ewPayReceiptNo" class="util-input" placeholder="e.g. OR-00123" value="' + (payment.receipt_number ? escapeHtml(payment.receipt_number) : '') + '" />' +
    '<label class="util-label">' + escapeHtml(t('enrollment_students.receipt_photo_label', 'Receipt Photo (optional)')) + '</label>' +
    '<div class="ew-photo-picker" id="ewPayPhotoPicker">' +
      (payment.receipt_photo
        ? '<img id="ewPayPhotoPreview" src="' + escapeHtml(absoluteUrl(payment.receipt_photo)) + '" alt="" />'
        : '<span class="ew-photo-picker-text" id="ewPayPhotoText">' + escapeHtml(t('enrollment_students.attach_photo_hint', 'Tap to attach a photo')) + '</span>') +
    '</div>' +
    '<input type="file" id="ewPayPhotoInput" accept="image/*" style="display:none;" />' +
    '<div class="sheet-form-error" id="ewPayFormError">' + icon('warning', { size: 14, color: '#B3261E' }) + '<span></span></div>' +
    '<button type="button" class="util-save-btn pill" id="ewPaySaveBtn" style="margin-top:20px;">' + escapeHtml(t('enrollment_students.save_payment_btn', 'Save Payment')) + '</button>';

  let selectedStatus = payment.status;
  let selectedMode = payment.payment_mode;

  document.getElementById('ewPayStatusRow').querySelectorAll('.stage-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      selectedStatus = chip.dataset.value;
      document.getElementById('ewPayStatusRow').querySelectorAll('.stage-chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
    });
  });
  document.getElementById('ewPayModeRow').querySelectorAll('.stage-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      selectedMode = (selectedMode === chip.dataset.value) ? null : chip.dataset.value;
      document.getElementById('ewPayModeRow').querySelectorAll('.stage-chip').forEach(c => c.classList.remove('selected'));
      if (selectedMode) chip.classList.add('selected');
    });
  });
  document.getElementById('ewPayPhotoPicker').addEventListener('click', () => document.getElementById('ewPayPhotoInput').click());
  document.getElementById('ewPayPhotoInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    activePaymentPhotoFile = file;
    const picker = document.getElementById('ewPayPhotoPicker');
    picker.innerHTML = '<img id="ewPayPhotoPreview" src="' + URL.createObjectURL(file) + '" alt="" />';
  });

  document.getElementById('ewPaySaveBtn').addEventListener('click', () => {
    const errorEl = document.getElementById('ewPayFormError');
    const setError = (msg) => { errorEl.querySelector('span').textContent = msg; errorEl.classList.add('show'); };
    errorEl.classList.remove('show');

    const amountRaw = document.getElementById('ewPayAmount').value.trim();
    const amount = amountRaw ? Number(amountRaw) : null;
    if (amountRaw && Number.isNaN(amount)) { setError(t('enrollment_students.amount_invalid', 'Amount must be a valid number.')); return; }

    const btn = document.getElementById('ewPaySaveBtn');
    btn.disabled = true;
    const originalLabel = btn.textContent;
    btn.innerHTML = '<span class="util-spinner"></span>';

    updateWorkflowPayment(currentToken, activeRecord.id, activePayment.fee_type_id, {
      status: selectedStatus,
      amount,
      payment_mode: selectedMode,
      receipt_number: document.getElementById('ewPayReceiptNo').value.trim() || null,
      receiptPhotoFile: activePaymentPhotoFile,
    }).then(() => {
      closePaymentModal();
      return fetchWorkflowPayments(currentToken, activeRecord.id);
    }).then((payments) => {
      activePayments = payments;
      renderDetail();
      showToast(t('enrollment_students.payment_saved_toast', 'Payment saved.'));
    }).catch(err => {
      const msg = (err && err.message) || t('enrollment_students.payment_save_failed', 'Could not save this payment.');
      setError(msg);
      btn.disabled = false;
      btn.textContent = originalLabel;
    });
  });

  document.getElementById('ewPaymentBackdrop').classList.add('open');
}
function closePaymentModal() {
  document.getElementById('ewPaymentBackdrop').classList.remove('open');
}

/* ── Wiring ── */
document.querySelectorAll('.sheet-close-btn').forEach(btn => { btn.innerHTML = icon('close', { size: 16, color: 'var(--subtle)' }); });
document.getElementById('ewDetailBackBtn').innerHTML = icon('chevronleft', { size: 22, color: 'var(--ink)' });

document.getElementById('ewStartCloseBtn').addEventListener('click', closeStartPicker);
document.getElementById('ewStartBackdrop').addEventListener('click', e => { if (e.target.id === 'ewStartBackdrop') closeStartPicker(); });
document.getElementById('ewStartSearch').addEventListener('input', (e) => searchStartStudents(e.target.value));

document.getElementById('ewDetailBackBtn').addEventListener('click', closeDetail);

document.getElementById('ewStageCloseBtn').addEventListener('click', closeAdvanceModal);
document.getElementById('ewStageBackdrop').addEventListener('click', e => { if (e.target.id === 'ewStageBackdrop') closeAdvanceModal(); });

document.getElementById('ewPlaceCloseBtn').addEventListener('click', closePlaceModal);
document.getElementById('ewPlaceBackdrop').addEventListener('click', e => { if (e.target.id === 'ewPlaceBackdrop') closePlaceModal(); });

document.getElementById('ewPaymentCloseBtn').addEventListener('click', closePaymentModal);
document.getElementById('ewPaymentBackdrop').addEventListener('click', e => { if (e.target.id === 'ewPaymentBackdrop') closePaymentModal(); });

onLocaleChange(() => {
  renderHeaderText();
  if (!ewBooted) return;
  renderToolbar();
  renderFilterRow();
  renderRecordList();
  if (activeRecord) renderDetail();
});

guardDashboard('admin', function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  document.getElementById('utilBody').style.display = '';
  currentToken = token;
  renderToolbar();
  load(token);
  ewBooted = true;
});
