// Ported from StudentUploadDocumentsScreen.tsx - a student's own uploaded
// files (ID, medical records, etc.), the reverse direction of
// student-documents.js's "request a document FROM the school" flow.
// Backend: POST /student_document_upload_list, /student_document_upload_store
// (multipart: title, file), /student_document_upload_delete.

let currentUploads = [];
let currentToken = null;
let sudBooted = false;

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function renderUploads(docs) {
  const wrap = document.getElementById('uploadsContent');
  if (!docs.length) {
    wrap.innerHTML = '<div class="doc-empty-card">' + escapeHtml(t('student_upload_documents.empty', 'You haven’t uploaded any documents yet.')) + '</div>';
    return;
  }
  wrap.innerHTML = docs.map(doc =>
    '<div class="doc-card">' +
      '<div class="doc-row-between">' +
        '<div style="display:flex;gap:12px;align-items:center;flex:1;min-width:0;">' +
          '<span class="doc-file-icon">' + icon('document', { size: 18, color: 'var(--ink)' }) + '</span>' +
          '<div style="min-width:0;">' +
            '<div class="doc-row-title">' + escapeHtml(doc.title) + '</div>' +
            '<div class="doc-row-sub">' + escapeHtml(formatDate(doc.created_at)) + '</div>' +
            '<a class="doc-file-link" href="' + escapeHtml(absoluteUrl(doc.file)) + '" target="_blank" rel="noopener">' + escapeHtml(t('student_upload_documents.view_file', 'View file')) + '</a>' +
          '</div>' +
        '</div>' +
        '<button type="button" class="doc-cancel-link" style="border-top:none;padding-top:0;margin-top:0;" data-delete="' + doc.id + '">' + escapeHtml(t('student_upload_documents.delete', 'Delete')) + '</button>' +
      '</div>' +
    '</div>'
  ).join('');

  wrap.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => confirmDelete(parseInt(btn.dataset.delete, 10)));
  });
}

function load(token) {
  currentToken = token;
  document.getElementById('uploadsContent').innerHTML = '<div class="list-loading">' + escapeHtml(t('student_upload_documents.loading', 'Loading your documents…')) + '</div>';
  fetchMyUploadedDocuments(token).then(docs => {
    currentUploads = docs;
    renderUploads(currentUploads);
  }).catch(() => {
    document.getElementById('uploadsContent').innerHTML =
      '<div class="list-error">' + escapeHtml(t('student_upload_documents.load_failed', 'Could not load your documents.')) + '<br><button type="button" class="list-retry-btn" id="retryBtn">' + escapeHtml(t('common.retry', 'Try again')) + '</button></div>';
    document.getElementById('retryBtn')?.addEventListener('click', () => load(token));
  });
}

function confirmDelete(docId) {
  const doc = currentUploads.find(d => d.id === docId);
  if (!doc) return;
  if (!window.confirm(t('student_upload_documents.delete_confirm', 'Delete "{title}"? This cannot be undone.').replace('{title}', doc.title))) return;
  deleteMyDocument(currentToken, docId).then(() => {
    currentUploads = currentUploads.filter(d => d.id !== docId);
    renderUploads(currentUploads);
  }).catch(() => showToast(t('common.cancel_failed', 'Could not cancel. Please try again.')));
}

// ── Upload sheet ──
function openUploadSheet() {
  let backdrop = document.getElementById('uploadDocBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'uploadDocBackdrop';
    backdrop.className = 'sheet-backdrop';
    backdrop.innerHTML =
      '<div class="sheet-panel form">' +
        '<div class="sheet-handle"></div>' +
        '<div class="sheet-title-row"><span class="sheet-title">' + escapeHtml(t('student_upload_documents.sheet_title', 'Upload a Document')) + '</span>' +
          '<button type="button" class="sheet-close-btn" id="upDocCloseBtn">' + icon('close', { size: 16, color: 'var(--subtle)' }) + '</button></div>' +
        '<label class="util-label" style="margin-top:0;">' + escapeHtml(t('student_upload_documents.title_label', 'Title')) + '</label>' +
        '<input type="text" id="upDocTitle" class="util-input" placeholder="' + escapeHtml(t('student_upload_documents.title_placeholder', 'e.g. National ID, Medical Record')) + '" />' +
        '<label class="util-label">' + escapeHtml(t('student_upload_documents.file_label', 'File')) + '</label>' +
        '<div class="util-file-input-row"><input type="file" id="upDocFile" /></div>' +
        '<div class="sheet-form-actions">' +
          '<button type="button" class="sheet-btn-secondary" id="upDocCancelBtn">' + escapeHtml(t('common.cancel', 'Cancel')) + '</button>' +
          '<button type="button" class="sheet-btn-primary" id="upDocSubmitBtn"><span id="upDocSubmitLabel">' + escapeHtml(t('student_upload_documents.upload_btn', 'Upload')) + '</span></button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) closeUploadSheet(); });
    document.getElementById('upDocCloseBtn').addEventListener('click', closeUploadSheet);
    document.getElementById('upDocCancelBtn').addEventListener('click', closeUploadSheet);
    document.getElementById('upDocSubmitBtn').addEventListener('click', submitUpload);
  }
  document.getElementById('upDocTitle').value = '';
  document.getElementById('upDocFile').value = '';
  backdrop.classList.add('open');
}
function closeUploadSheet() {
  document.getElementById('uploadDocBackdrop')?.classList.remove('open');
}
function submitUpload() {
  const title = document.getElementById('upDocTitle').value.trim();
  const fileInput = document.getElementById('upDocFile');
  const file = fileInput.files && fileInput.files[0];

  if (!title) { showToast(t('student_upload_documents.title_required', 'Give this document a title.')); return; }
  if (!file) { showToast(t('student_upload_documents.file_required', 'Choose a file to upload.')); return; }

  const btn = document.getElementById('upDocSubmitBtn');
  const label = document.getElementById('upDocSubmitLabel');
  btn.disabled = true;
  label.innerHTML = '<span class="util-spinner"></span>';

  uploadMyDocument(currentToken, title, file).then(doc => {
    currentUploads = [doc, ...currentUploads];
    renderUploads(currentUploads);
    closeUploadSheet();
  }).catch(err => {
    showToast((err && err.message) || t('student_upload_documents.upload_failed', 'Could not upload. Please try again.'));
  }).finally(() => {
    btn.disabled = false;
    label.textContent = t('student_upload_documents.upload_btn', 'Upload');
  });
}

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML = renderUtilHeader(
    t('student_upload_documents.title', 'Upload Documents'),
    t('student_upload_documents.subtitle', 'Submit your ID, medical records and other files'),
    'student-dashboard.php',
    { label: t('student_upload_documents.upload_action', '+ Upload'), onClick: openUploadSheet }
  );
}
renderHeaderText();
onLocaleChange(() => { renderHeaderText(); if (sudBooted) renderUploads(currentUploads); });

guardDashboard('student', function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  document.getElementById('utilBody').style.display = '';
  document.getElementById('bottomNavWrap').innerHTML = renderBottomNav('student');
  load(token);
  sudBooted = true;
});
