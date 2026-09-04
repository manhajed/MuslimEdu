// Admin "Document Requests" (Activity & Requests group) - ported from
// StudentDocumentRequestsScreen.tsx: filter chips (requested/issued/
// rejected/all), a card per request with Issue / Reject actions, and a
// reason-required Reject sheet. Backend calls live in dashboard.js
// (fetchAdminDocumentRequests/issueAdminDocument/rejectAdminDocument).

const FILTERS = ['requested', 'issued', 'rejected', 'all'];
let requests = [];
let filter = 'requested';
let busyId = null;
let drBooted = false;

const STATUS_COLOR = { issued: 'var(--emerald)', rejected: '#BA1A1A', requested: '#B7791F' };
function statusColor(status) {
  return STATUS_COLOR[status] || STATUS_COLOR.requested;
}
function statusLabel(status) {
  const fallback = { requested: 'Requested', issued: 'Issued', rejected: 'Rejected' }[status] || (status.charAt(0).toUpperCase() + status.slice(1));
  return t('document_requests.status_' + status, fallback);
}
function deliveryLabel(method) {
  if (method === 'digital') return t('document_requests.delivery_digital', 'Digital copy');
  return t('document_requests.delivery_pickup', 'Pick up at office');
}

function renderFilterChips() {
  document.getElementById('filterChipRow').innerHTML = FILTERS.map(f =>
    '<button type="button" class="filter-chip' + (filter === f ? ' active' : '') + '" data-key="' + f + '">' +
      escapeHtml(f === 'all' ? t('document_requests.filter_all', 'All') : statusLabel(f)) + '</button>'
  ).join('');
  document.getElementById('filterChipRow').querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      filter = btn.dataset.key;
      renderFilterChips();
      renderList();
    });
  });
}

function renderList() {
  const wrap = document.getElementById('requestsContent');
  const visible = filter === 'all' ? requests : requests.filter(r => r.status === filter);

  if (visible.length === 0) {
    wrap.innerHTML = '<div class="doc-empty-card">' + escapeHtml(t('document_requests.empty', 'No requests in this view.')) + '</div>';
    return;
  }

  wrap.innerHTML = visible.map(req => {
    const student = req.student || {};
    const studentLine = escapeHtml(student.name || t('document_requests.unknown_student', 'Unknown student')) + (student.code ? ' · ' + escapeHtml(student.code) : '');
    const copiesLabel = req.copies === 1 ? t('document_requests.copy_singular', 'copy') : t('document_requests.copy_plural', 'copies');
    const reasonHtml = req.status === 'rejected' && req.rejected_reason
      ? '<div class="doc-row-sub" style="color:#BA1A1A;">' + escapeHtml(t('document_requests.reason_prefix', 'Reason: {reason}').replace('{reason}', req.rejected_reason)) + '</div>'
      : '';
    const purposeHtml = req.purpose
      ? '<div class="doc-row-sub">' + escapeHtml(t('document_requests.purpose_prefix', 'Purpose: {purpose}').replace('{purpose}', req.purpose)) + '</div>'
      : '';
    const actionsHtml = req.status === 'requested'
      ? (
          '<div class="req-actions-row">' +
            '<button type="button" class="req-action-link" data-action="issue" data-id="' + req.id + '"' + (busyId === req.id ? ' disabled' : '') + '>' +
              escapeHtml(busyId === req.id ? t('document_requests.working', 'Working…') : t('document_requests.issue_action', 'Issue')) +
            '</button>' +
            '<button type="button" class="req-action-link danger" data-action="reject" data-id="' + req.id + '"' + (busyId === req.id ? ' disabled' : '') + '>' + escapeHtml(t('document_requests.reject_action', 'Reject')) + '</button>' +
          '</div>'
        )
      : '';

    return (
      '<div class="doc-card">' +
        '<div class="doc-row-between">' +
          '<div style="min-width:0;flex:1;">' +
            '<div class="doc-row-title">' + escapeHtml(req.label) + '</div>' +
            '<div class="doc-row-sub">' + studentLine + '</div>' +
            '<div class="doc-row-sub">' + escapeHtml(req.reference_no) + ' · ' + req.copies + ' ' + escapeHtml(copiesLabel) + '</div>' +
            '<div class="doc-delivery-tag">' + icon(req.delivery_method === 'digital' ? 'download' : 'house', { size: 12, color: 'var(--ink)' }) + '<span>' + escapeHtml(deliveryLabel(req.delivery_method)) + '</span></div>' +
            purposeHtml + reasonHtml +
          '</div>' +
          '<span class="status-pill" style="background:' + statusColor(req.status) + '1A;color:' + statusColor(req.status) + ';">' +
            escapeHtml(statusLabel(req.status)) +
          '</span>' +
        '</div>' +
        actionsHtml +
      '</div>'
    );
  }).join('');

  wrap.querySelectorAll('[data-action="issue"]').forEach(btn => {
    btn.addEventListener('click', () => confirmIssue(Number(btn.dataset.id)));
  });
  wrap.querySelectorAll('[data-action="reject"]').forEach(btn => {
    btn.addEventListener('click', () => openRejectSheet(Number(btn.dataset.id)));
  });
}

function confirmIssue(id) {
  const req = requests.find(r => r.id === id);
  const token = getStoredToken();
  if (!req || !token) return;

  // A pickup request is fulfilled in person at the office - nothing to
  // attach here, same plain confirm as before. A digital request needs an
  // actual file or the student is left with nothing to download, so that
  // one opens a small sheet to attach it (optional - "not ready yet, mark
  // issued anyway" is still allowed, matching the backend's own file being
  // nullable on this endpoint).
  if (req.delivery_method === 'digital') {
    openIssueSheet(id);
    return;
  }

  const studentName = (req.student && req.student.name) || t('document_requests.this_student', 'this student');
  if (!confirm(t('document_requests.issue_confirm', 'Mark "{label}" as issued for {name}?').replace('{label}', req.label).replace('{name}', studentName))) return;
  runIssue(id, null);
}

// onSettled runs after the request finishes either way, before the shared
// busyId/list bookkeeping below - the Issue sheet uses it to reset its own
// submit button (and close on success), the plain list-row Issue link has
// nothing extra to reset so it passes nothing.
function runIssue(id, fileBlob, onSettled) {
  const token = getStoredToken();
  if (!token) return;
  busyId = id;
  renderList();
  issueAdminDocument(token, id, fileBlob).then((data) => {
    const updated = (data && data.document) || {};
    requests = requests.map(r => (r.id === id ? Object.assign({}, r, { status: 'issued' }, updated) : r));
    busyId = null;
    if (onSettled) onSettled(true);
    renderList();
    showToast(t('document_requests.issued_toast', 'Document issued.'));
  }).catch(err => {
    busyId = null;
    if (onSettled) onSettled(false);
    renderList();
    showToast(err && err.message ? err.message : t('document_requests.issue_failed', 'Could not issue.'));
  });
}

function openIssueSheet(id) {
  const req = requests.find(r => r.id === id);
  if (!req) return;

  let backdrop = document.getElementById('issueSheetBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'issueSheetBackdrop';
    backdrop.className = 'sheet-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) closeIssueSheet(); });
  }

  backdrop.innerHTML =
    '<div class="sheet-panel form">' +
      '<div class="sheet-handle"></div>' +
      '<div class="sheet-title-row"><span class="sheet-title">' + escapeHtml(t('document_requests.issue_sheet_title', 'Issue Digital Copy')) + '</span>' +
        '<button type="button" class="sheet-close-btn" id="issCloseBtn">' + icon('close', { size: 16, color: 'var(--subtle)' }) + '</button></div>' +

      '<div class="doc-row-sub" style="margin-bottom:8px;">' + escapeHtml(t('document_requests.issue_sheet_sub', '{label} for {name}').replace('{label}', req.label).replace('{name}', (req.student && req.student.name) || t('document_requests.this_student', 'this student'))) + '</div>' +
      '<label class="util-label" style="margin-top:0;">' + escapeHtml(t('document_requests.file_optional_label', 'File (optional)')) + '</label>' +
      '<div class="util-file-input-row"><input type="file" id="issFile" /></div>' +
      '<div class="es-action-row" style="margin-top:10px;">' +
        icon('lightbulb', { size: 14, color: 'var(--warn-yellow)' }) +
        '<p class="es-action-text">' + escapeHtml(t('document_requests.issue_sheet_hint', 'Attach the scanned document so the student can download it. You can also mark this issued without a file if it isn’t ready yet.')) + '</p>' +
      '</div>' +

      '<div class="sheet-form-actions">' +
        '<button type="button" class="sheet-btn-secondary" id="issCancelBtn">' + escapeHtml(t('common.cancel', 'Cancel')) + '</button>' +
        '<button type="button" class="sheet-btn-primary" id="issSubmitBtn"><span id="issSubmitLabel">' + escapeHtml(t('document_requests.mark_issued_btn', 'Mark Issued')) + '</span></button>' +
      '</div>' +
    '</div>';

  document.getElementById('issCloseBtn').addEventListener('click', closeIssueSheet);
  document.getElementById('issCancelBtn').addEventListener('click', closeIssueSheet);
  document.getElementById('issSubmitBtn').addEventListener('click', () => {
    const fileInput = document.getElementById('issFile');
    const file = fileInput.files && fileInput.files[0];

    const btn = document.getElementById('issSubmitBtn');
    const label = document.getElementById('issSubmitLabel');
    btn.disabled = true;
    label.innerHTML = '<span class="util-spinner"></span>';

    runIssue(id, file || null, (ok) => {
      if (ok) { closeIssueSheet(); return; }
      btn.disabled = false;
      label.textContent = t('document_requests.mark_issued_btn', 'Mark Issued');
    });
  });

  backdrop.classList.add('open');
}
function closeIssueSheet() {
  document.getElementById('issueSheetBackdrop')?.classList.remove('open');
}

function openRejectSheet(id) {
  const req = requests.find(r => r.id === id);
  if (!req) return;

  let backdrop = document.getElementById('rejectSheetBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'rejectSheetBackdrop';
    backdrop.className = 'sheet-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) closeRejectSheet(); });
  }

  backdrop.innerHTML =
    '<div class="sheet-panel form">' +
      '<div class="sheet-handle"></div>' +
      '<div class="sheet-title-row"><span class="sheet-title">' + escapeHtml(t('document_requests.reject_sheet_title', 'Reject Document Request')) + '</span>' +
        '<button type="button" class="sheet-close-btn" id="rejCloseBtn">' + icon('close', { size: 16, color: 'var(--subtle)' }) + '</button></div>' +

      '<label class="util-label" style="margin-top:0;">' + escapeHtml(t('document_requests.reason_label', 'Reason (shown to the student)')) + '</label>' +
      '<textarea id="rejReason" class="util-input" placeholder="' + escapeHtml(t('document_requests.reason_placeholder', 'e.g. outstanding balance, missing clearance')) + '"></textarea>' +

      '<div class="sheet-form-actions">' +
        '<button type="button" class="sheet-btn-secondary" id="rejCancelBtn">' + escapeHtml(t('common.cancel', 'Cancel')) + '</button>' +
        '<button type="button" class="sheet-btn-primary" id="rejSubmitBtn" style="background:#BA1A1A;"><span id="rejSubmitLabel">' + escapeHtml(t('document_requests.reject_action', 'Reject')) + '</span></button>' +
      '</div>' +
    '</div>';

  document.getElementById('rejCloseBtn').addEventListener('click', closeRejectSheet);
  document.getElementById('rejCancelBtn').addEventListener('click', closeRejectSheet);

  document.getElementById('rejSubmitBtn').addEventListener('click', () => {
    const token = getStoredToken();
    const reason = document.getElementById('rejReason').value.trim();
    if (!reason) { showToast(t('document_requests.reason_required', 'Tell the student why this request is being rejected.')); return; }
    if (!token) return;

    const btn = document.getElementById('rejSubmitBtn');
    const label = document.getElementById('rejSubmitLabel');
    btn.disabled = true;
    label.innerHTML = '<span class="util-spinner"></span>';

    rejectAdminDocument(token, id, reason).then(() => {
      requests = requests.map(r => (r.id === id ? Object.assign({}, r, { status: 'rejected', rejected_reason: reason }) : r));
      closeRejectSheet();
      renderList();
      showToast(t('document_requests.rejected_toast', 'Request rejected.'));
    }).catch(err => {
      showToast(err && err.message ? err.message : t('document_requests.reject_failed', 'Could not reject.'));
      btn.disabled = false;
      label.textContent = t('document_requests.reject_action', 'Reject');
    });
  });

  backdrop.classList.add('open');
}
function closeRejectSheet() {
  document.getElementById('rejectSheetBackdrop')?.classList.remove('open');
}

function load(token) {
  const wrap = document.getElementById('requestsContent');
  wrap.innerHTML = '<div class="list-loading">' + escapeHtml(t('document_requests.loading', 'Loading document requests…')) + '</div>';
  fetchAdminDocumentRequests(token).then(rows => {
    requests = rows;
    renderList();
  }).catch(err => {
    wrap.innerHTML = '<div class="list-error">' + escapeHtml(err && err.message ? err.message : t('document_requests.load_failed', 'Could not load document requests.')) + '</div>';
  });
}

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(t('document_requests.title', 'Document Requests'), t('document_requests.subtitle', 'Issue or reject student document requests'), 'admin-dashboard.php', null);
}
renderHeaderText();
onLocaleChange(() => {
  renderHeaderText();
  renderFilterChips();
  if (drBooted) renderList();
});

guardDashboard('admin', function (user, token) {
  document.getElementById('utilBody').style.display = '';
  document.getElementById('bottomNavWrap').innerHTML = renderBottomNav('admin');
  renderFilterChips();
  load(token);
  drBooted = true;
});
