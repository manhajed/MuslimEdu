// Scholarship & Taqdim Assistant - staff document review
// (ScholarshipDocumentController's admin_* endpoints). Separate from
// Translation Services (scholarship-translations.js): this is the plain
// approve/reject/revision-request pass on documents that don't need
// translating (a passport scan, a transcript already in English).
// Gated on hasScholarshipAccess() alone, not the narrower translation
// sub-permission - see requireScholarshipStaffAccess() (dashboard.js).

const DOCUMENT_STATUSES = ['pending', 'approved', 'rejected', 'revision_requested'];
function documentStatusLabel(s) { return t('scholarship_document_review.status_' + s, s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())); }
function documentStatusChipClass(s) {
  if (s === 'approved') return 'ok';
  if (s === 'pending') return 'warn';
  return 'danger'; // rejected, revision_requested
}

let allDocuments = [];
let statusFilter = 'pending';
let lastListRendered = false;

function formatDateTime(d) {
  if (!d) return null;
  try { return new Date(d).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
  catch (e) { return d; }
}

function renderStatusFilterRow(token) {
  const row = document.getElementById('statusFilterRow');
  row.innerHTML = DOCUMENT_STATUSES.map(s =>
    '<button type="button" class="filter-chip' + (statusFilter === s ? ' active' : '') + '" data-status="' + escapeHtml(s) + '">' + escapeHtml(documentStatusLabel(s)) + '</button>'
  ).join('');
  row.querySelectorAll('button.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      statusFilter = chip.dataset.status;
      renderStatusFilterRow(token);
      reload(token);
    });
  });
}

function renderList(token) {
  lastListRendered = true;
  const wrap = document.getElementById('listContent');
  if (allDocuments.length === 0) {
    wrap.innerHTML = '<div class="list-empty"><div class="list-empty-title">' +
      escapeHtml(t('scholarship_document_review.no_documents', 'No documents in this queue.')) + '</div></div>';
    return;
  }
  wrap.innerHTML = '';
  allDocuments.forEach(d => {
    const studentName = (d.user && d.user.name) || t('scholarship_document_review.unknown_student', 'Unknown student');
    const initial = studentName.trim().charAt(0).toUpperCase() || '?';
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'list-card';
    card.innerHTML =
      '<span class="list-avatar-wrap"><span class="list-avatar-fallback">' + escapeHtml(initial) + '</span></span>' +
      '<span class="list-card-body">' +
        '<span class="list-card-name">' + escapeHtml(d.title || t('scholarship_document_review.untitled', 'Untitled document')) + '</span>' +
        '<div class="list-card-meta">' + escapeHtml(studentName) + ' · ' + escapeHtml(formatDateTime(d.created_at) || '') + '</div>' +
        '<div class="chip-row">' +
          '<span class="mini-chip ' + documentStatusChipClass(d.status) + '">' + escapeHtml(documentStatusLabel(d.status)) + '</span>' +
        '</div>' +
      '</span>' +
      icon('chevron', { size: 18, color: 'var(--subtle)' });
    card.addEventListener('click', () => openReviewSheet(token, d));
    wrap.appendChild(card);
  });
}
onLocaleChange(() => { if (lastListRendered) { renderStatusFilterRow(getStoredToken()); renderList(getStoredToken()); } });

function fileUrl(d) {
  // UserDocument's file_path is served straight from the public upload
  // dir - same convention ScholarshipDocumentController::documentPayload
  // builds server-side via asset(), reconstructed here since raw
  // paginated documents (this queue) aren't passed through that payload
  // helper.
  return 'assets/uploads/user-documents/' + encodeURIComponent(d.file_path || '');
}

function openReviewSheet(token, d) {
  const studentName = (d.user && d.user.name) || t('scholarship_document_review.unknown_student', 'Unknown student');
  let backdrop = document.getElementById('drBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'drBackdrop';
    backdrop.className = 'sheet-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.classList.remove('open'); });
  }
  backdrop.innerHTML =
    '<div class="sheet-panel form">' +
      '<div class="sheet-handle"></div>' +
      '<div class="sheet-title-row"><span class="sheet-title">' + escapeHtml(d.title || t('scholarship_document_review.untitled', 'Untitled document')) + '</span>' +
        '<button type="button" class="sheet-close-btn" id="drCloseBtn">' + icon('close', { size: 16, color: 'var(--subtle)' }) + '</button></div>' +
      '<div class="list-card-meta" style="margin-bottom:10px;">' + escapeHtml(studentName) + '</div>' +
      '<a href="' + fileUrl(d) + '" target="_blank" class="sheet-btn-secondary" style="display:block;text-align:center;text-decoration:none;margin-bottom:14px;">' + escapeHtml(t('scholarship_document_review.view_file_btn', 'View File')) + '</a>' +
      (d.review_note ? '<div class="util-label" style="margin-top:0;">' + escapeHtml(t('scholarship_document_review.previous_note_label', 'Previous note')) + '</div><div class="list-card-meta" style="margin-bottom:10px;">' + escapeHtml(d.review_note) + '</div>' : '') +
      '<label class="util-label" style="margin-top:0;">' + escapeHtml(t('scholarship_document_review.note_label', 'Note (optional)')) + '</label>' +
      '<textarea id="drNote" class="util-input" placeholder="' + escapeHtml(t('scholarship_document_review.note_placeholder', 'Visible to the student')) + '"></textarea>' +
      '<div class="sheet-form-actions" style="flex-direction:column;gap:8px;">' +
        '<button type="button" class="util-save-btn pill" id="drApproveBtn" style="margin-top:0;height:44px;">' + escapeHtml(t('scholarship_document_review.approve_btn', 'Approve')) + '</button>' +
        '<button type="button" class="sheet-btn-secondary" id="drRevisionBtn" style="width:100%;">' + escapeHtml(t('scholarship_document_review.revision_btn', 'Request Revision')) + '</button>' +
        '<button type="button" class="sheet-btn-secondary" id="drRejectBtn" style="width:100%;color:#EF4444;">' + escapeHtml(t('scholarship_document_review.reject_btn', 'Reject')) + '</button>' +
      '</div>' +
    '</div>';
  document.getElementById('drCloseBtn').addEventListener('click', () => backdrop.classList.remove('open'));

  const doReview = (status) => {
    const note = document.getElementById('drNote').value.trim() || null;
    reviewScholarshipDocument(token, d.id, status, note).then(() => {
      backdrop.classList.remove('open');
      showToast(t('scholarship_document_review.reviewed_toast', 'Document updated.'));
      reload(token);
    }).catch(err => showToast(err && err.message ? err.message : t('scholarship_document_review.review_failed', 'Could not update this document.')));
  };
  document.getElementById('drApproveBtn').addEventListener('click', () => doReview('approved'));
  document.getElementById('drRevisionBtn').addEventListener('click', () => doReview('revision_requested'));
  document.getElementById('drRejectBtn').addEventListener('click', () => doReview('rejected'));

  backdrop.classList.add('open');
}

// ── Boot ──
function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(t('scholarship_document_review.title', 'Document Review'), t('scholarship_document_review.subtitle', "Approve, reject, or request revisions on students' uploaded documents"), 'scholarship-programs.php');
}
renderHeaderText();
onLocaleChange(renderHeaderText);

function reload(token) {
  document.getElementById('listContent').innerHTML = '<div class="list-loading">' + escapeHtml(t('common.loading', 'Loading…')) + '</div>';
  fetchAdminScholarshipDocumentQueue(token, statusFilter).then(list => {
    allDocuments = list;
    renderList(token);
  }).catch(() => {
    lastListRendered = false;
    document.getElementById('listContent').innerHTML =
      '<div class="list-error">' + escapeHtml(t('scholarship_document_review.load_failed', 'Failed to load documents.')) + '<br><button type="button" class="list-retry-btn" id="retryBtn">' + escapeHtml(t('common.retry', 'Try again')) + '</button></div>';
    document.getElementById('retryBtn')?.addEventListener('click', () => reload(token));
  });
}

guardDashboard(['superadmin', 'platform_staff'], function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  if (!requireScholarshipStaffAccess(user)) return;
  renderStatusFilterRow(token);
  reload(token);
});
