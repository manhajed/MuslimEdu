// Scholarship & Taqdim Assistant - student document vault
// (ScholarshipDocumentController's student endpoints). Every document a
// student has ever uploaded across every application, in one place -
// the per-checklist-item upload in scholarship-application.js covers
// attaching a document to a specific requirement, but doesn't give a
// student a way to see or manage everything they've uploaded at a
// glance. This page is that view; uploading here adds to the vault
// without attaching it to anything yet (same as uploading fresh from a
// checklist item - attachment happens separately via
// applicationChecklistUpdate).

let allDocuments = [];

function documentStatusLabel(s) { return t('scholarship_document_review.status_' + s, s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())); }
function documentStatusChipClass(s) {
  if (s === 'approved') return 'ok';
  if (s === 'pending') return 'warn';
  return 'danger'; // rejected, revision_requested
}
function formatDateTime(d) {
  if (!d) return null;
  try { return new Date(d).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
  catch (e) { return d; }
}

function renderList(token) {
  const wrap = document.getElementById('listContent');
  if (allDocuments.length === 0) {
    wrap.innerHTML = '<div class="list-empty"><div class="list-empty-title">' +
      escapeHtml(t('scholarship_documents.no_documents', "You haven't uploaded any documents yet.")) + '</div></div>';
    return;
  }
  wrap.innerHTML = '';
  allDocuments.forEach(d => {
    const card = document.createElement('div');
    card.className = 'util-card';
    card.style.padding = '14px';
    card.style.marginBottom = '10px';
    card.innerHTML =
      '<div style="display:flex;align-items:flex-start;gap:10px;">' +
        '<span style="flex-shrink:0;">' + icon('filetext', { size: 18, color: 'var(--subtle)' }) + '</span>' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-size:14px;font-weight:700;color:var(--ink);">' + escapeHtml(d.title || t('scholarship_documents.untitled', 'Untitled document')) + '</div>' +
          '<div style="font-size:11.5px;color:var(--subtle);margin-top:2px;">' + escapeHtml(formatDateTime(d.created_at) || '') + '</div>' +
          '<div class="chip-row" style="margin-top:8px;">' +
            '<span class="mini-chip ' + documentStatusChipClass(d.status) + '">' + escapeHtml(documentStatusLabel(d.status)) + '</span>' +
          '</div>' +
          (d.review_note ? '<div style="font-size:12px;color:var(--subtle);margin-top:6px;">' + escapeHtml(d.review_note) + '</div>' : '') +
          '<div style="display:flex;gap:10px;margin-top:10px;">' +
            '<a href="' + d.file + '" target="_blank" class="mini-chip ok" style="text-decoration:none;">' + escapeHtml(t('scholarship_documents.view_link', 'View')) + '</a>' +
            (d.status !== 'approved' ? '<button type="button" class="mini-chip danger deleteDocBtn" data-doc-id="' + d.id + '" style="border:none;">' + escapeHtml(t('scholarship_documents.delete_link', 'Delete')) + '</button>' : '') +
          '</div>' +
        '</div>' +
      '</div>';
    wrap.appendChild(card);
  });

  document.querySelectorAll('.deleteDocBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      openActionSheet(t('scholarship_documents.confirm_delete_title', 'Delete this document?'), [
        { icon: 'trash', label: t('scholarship_documents.confirm_delete_label', 'Yes, delete'), desc: t('scholarship_documents.confirm_delete_desc', 'This cannot be undone'), onPress: () => {
          deleteScholarshipDocument(token, btn.dataset.docId).then(() => {
            showToast(t('scholarship_documents.deleted_toast', 'Document deleted.'));
            load(token);
          }).catch(err => showToast(err && err.message ? err.message : t('scholarship_documents.delete_failed', 'Could not delete this document. It may already be in use on an application.')));
        }},
        { icon: 'close', label: t('common.cancel', 'Cancel'), desc: '', onPress: () => {} },
      ]);
    });
  });
}

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(t('scholarship_documents.title', 'My Documents'), t('scholarship_documents.subtitle', 'Everything you have uploaded for scholarship applications'), 'scholarship-browse.php');
}
renderHeaderText();
onLocaleChange(renderHeaderText);

function load(token) {
  document.getElementById('listContent').innerHTML = '<div class="list-loading">' + escapeHtml(t('common.loading', 'Loading…')) + '</div>';
  fetchMyScholarshipDocuments(token).then(list => {
    allDocuments = list;
    renderList(token);
  }).catch(() => {
    document.getElementById('listContent').innerHTML = '<div class="list-error">' + escapeHtml(t('scholarship_documents.load_failed', 'Could not load your documents.')) + '</div>';
  });
}

guardDashboard('student', function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  document.getElementById('bottomNavWrap').innerHTML = renderBottomNav('student');
  document.getElementById('utilBody').style.display = '';
  load(token);

  document.getElementById('uploadBtn').addEventListener('click', () => {
    const fileInput = document.getElementById('uploadFileInput');
    const file = fileInput.files && fileInput.files[0];
    if (!file) { showToast(t('scholarship_documents.choose_file', 'Choose a file first.')); return; }
    const btn = document.getElementById('uploadBtn');
    const label = document.getElementById('uploadLabel');
    btn.disabled = true; label.innerHTML = '<span class="util-spinner"></span>';
    uploadScholarshipDocument(token, file).then(() => {
      showToast(t('scholarship_documents.uploaded_toast', 'Document uploaded.'));
      fileInput.value = '';
      load(token);
    }).catch(err => showToast(err && err.message ? err.message : t('scholarship_documents.upload_failed', 'Could not upload this file.')))
      .finally(() => { btn.disabled = false; label.textContent = t('scholarship_documents.upload_btn', 'Upload'); });
  });
});
