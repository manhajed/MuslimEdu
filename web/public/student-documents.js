// Ported from StudentDocumentsScreen.tsx - request report cards/COR/
// certificates, track their status, cancel a pending request. Backend:
// StudentPortalController::documentList/documentRequest/documentCancel
// (POST /student_document_list, /student_document_request,
// /student_document_cancel).

let allDocumentTypes = [];
let selectedType = null;
let selectedDelivery = 'pickup';
let currentDocuments = [];
let currentToken = null;
let lastDocsRendered = false;

function deliveryMethods() {
  return [
    { key: 'pickup', icon: 'house', title: t('student_documents.pickup_title', 'Pick up at office'), sub: t('student_documents.pickup_sub', 'Collect a printed copy') },
    { key: 'digital', icon: 'download', title: t('student_documents.digital_title', 'Digital copy'), sub: t('student_documents.digital_sub', 'Download from your portal') },
  ];
}
function deliveryMeta(method) {
  const methods = deliveryMethods();
  return methods.find(d => d.key === method) || methods[0];
}

function statusClass(status) {
  if (status === 'issued') return 'ok';
  if (status === 'rejected') return 'danger';
  return 'warn';
}
function statusLabel(status) {
  if (status === 'issued') return t('student_documents.status_issued', 'Issued');
  if (status === 'rejected') return t('student_documents.status_rejected', 'Rejected');
  return t('student_documents.status_requested', 'Requested');
}

function renderDocs(documents) {
  lastDocsRendered = true;
  const wrap = document.getElementById('docsContent');
  if (!documents.length) {
    wrap.innerHTML = '<div class="doc-empty-card">' + escapeHtml(t('student_documents.empty', 'You haven’t requested any documents yet.')) + '</div>';
    return;
  }
  wrap.innerHTML = documents.map(doc => {
    const copiesLabel = doc.copies === 1 ? t('student_documents.copy_singular', 'copy') : t('student_documents.copy_plural', 'copies');
    let sub = escapeHtml(doc.reference_no) + ' · ' + doc.copies + ' ' + escapeHtml(copiesLabel);
    if (doc.purpose) sub += '<br>' + escapeHtml(t('student_documents.purpose_prefix', 'Purpose:')) + ' ' + escapeHtml(doc.purpose);
    if (doc.status === 'rejected' && doc.rejected_reason) {
      sub += '<br><span style="color:#BA1A1A;">' + escapeHtml(t('student_documents.reason_prefix', 'Reason:')) + ' ' + escapeHtml(doc.rejected_reason) + '</span>';
    }
    const delivery = deliveryMeta(doc.delivery_method);
    const downloadHtml = doc.status === 'issued' && doc.download_url
      ? '<a class="doc-file-link" href="' + escapeHtml(doc.download_url) + '" target="_blank" rel="noopener">' + escapeHtml(t('student_documents.download_link', 'Download')) + '</a>'
      : '';
    return (
      '<div class="doc-card" data-id="' + doc.id + '">' +
        '<div class="doc-row-between">' +
          '<div style="flex:1;min-width:0;">' +
            '<div class="doc-row-title">' + escapeHtml(doc.label) + '</div>' +
            '<div class="doc-row-sub">' + sub + '</div>' +
          '</div>' +
          '<span class="mini-chip ' + statusClass(doc.status) + '">' + escapeHtml(statusLabel(doc.status)) + '</span>' +
        '</div>' +
        '<div class="doc-delivery-tag">' + icon(delivery.icon, { size: 12, color: 'var(--ink)' }) + '<span>' + escapeHtml(delivery.title) + '</span></div>' +
        downloadHtml +
        (doc.status === 'requested' ? '<button type="button" class="doc-cancel-link" data-cancel="' + doc.id + '">' + escapeHtml(t('common.cancel_request', 'Cancel request')) + '</button>' : '') +
      '</div>'
    );
  }).join('');

  wrap.querySelectorAll('[data-cancel]').forEach(btn => {
    btn.addEventListener('click', () => confirmCancel(parseInt(btn.dataset.cancel, 10)));
  });
}
onLocaleChange(() => { if (lastDocsRendered) renderDocs(currentDocuments); });

function load(token) {
  currentToken = token;
  document.getElementById('docsContent').innerHTML = '<div class="list-loading">' + escapeHtml(t('student_documents.loading', 'Loading your documents…')) + '</div>';
  fetchStudentDocuments(token).then(data => {
    currentDocuments = data.documents || [];
    allDocumentTypes = data.document_types || [];
    renderDocs(currentDocuments);
  }).catch((err) => {
    // authedPost already digs the real reason out of the response (a
    // validator message, or 'Request failed (500)' when the body isn't
    // even JSON) - this was discarding all of that and always showing the
    // same generic line, so a real backend failure (e.g. a migration that
    // hasn't been run yet for student_document_requests) looked identical
    // to a plain network hiccup with no way to tell them apart.
    lastDocsRendered = false;
    document.getElementById('docsContent').innerHTML =
      '<div class="list-error">' + escapeHtml((err && err.message) || t('student_documents.load_error', 'Could not load your documents.')) + '<br><button type="button" class="list-retry-btn" id="retryBtn">' + escapeHtml(t('common.retry', 'Try again')) + '</button></div>';
    document.getElementById('retryBtn')?.addEventListener('click', () => load(token));
  });
}

function confirmCancel(docId) {
  const doc = currentDocuments.find(d => d.id === docId);
  if (!doc) return;
  if (!window.confirm(t('student_documents.confirm_cancel', 'Cancel your request for "{label}"?').replace('{label}', doc.label))) return;
  cancelStudentDocument(currentToken, docId).then(() => {
    currentDocuments = currentDocuments.filter(d => d.id !== docId);
    renderDocs(currentDocuments);
  }).catch(() => showToast(t('common.cancel_failed', 'Could not cancel. Please try again.')));
}

// ── Request Document sheet ──
function openRequestSheet() {
  let backdrop = document.getElementById('reqDocBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'reqDocBackdrop';
    backdrop.className = 'sheet-backdrop';
    backdrop.innerHTML =
      '<div class="sheet-panel form">' +
        '<div class="sheet-handle"></div>' +
        '<div class="sheet-title-row"><span class="sheet-title">' + escapeHtml(t('student_documents.sheet_title', 'Request a Document')) + '</span>' +
          '<button type="button" class="sheet-close-btn" id="reqDocCloseBtn">' + icon('close', { size: 16, color: 'var(--subtle)' }) + '</button></div>' +
        '<label class="util-label" style="margin-top:0;">' + escapeHtml(t('student_documents.doc_type_label', 'Document type')) + '</label>' +
        '<div class="filter-chip-row" id="reqDocTypeRow"></div>' +
        '<label class="util-label">' + escapeHtml(t('student_documents.purpose_label', 'Purpose (optional)')) + '</label>' +
        '<input type="text" id="reqDocPurpose" class="util-input" placeholder="' + escapeHtml(t('student_documents.purpose_placeholder', 'e.g. scholarship application')) + '" />' +
        '<label class="util-label">' + escapeHtml(t('student_documents.copies_label', 'Copies')) + '</label>' +
        '<input type="number" id="reqDocCopies" class="util-input" min="1" value="1" />' +
        '<label class="util-label">' + escapeHtml(t('student_documents.delivery_label', 'Delivery')) + '</label>' +
        '<div class="doc-delivery-row" id="reqDocDeliveryRow"></div>' +
        '<div class="sheet-form-actions">' +
          '<button type="button" class="sheet-btn-secondary" id="reqDocCancelBtn">' + escapeHtml(t('common.cancel', 'Cancel')) + '</button>' +
          '<button type="button" class="sheet-btn-primary" id="reqDocSubmitBtn"><span id="reqDocSubmitLabel">' + escapeHtml(t('common.submit', 'Submit')) + '</span></button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) closeRequestSheet(); });
    document.getElementById('reqDocCloseBtn').addEventListener('click', closeRequestSheet);
    document.getElementById('reqDocCancelBtn').addEventListener('click', closeRequestSheet);
    document.getElementById('reqDocSubmitBtn').addEventListener('click', submitRequest);
  }
  selectedType = allDocumentTypes[0] || null;
  document.getElementById('reqDocTypeRow').innerHTML = allDocumentTypes.map(dt =>
    '<button type="button" class="filter-chip' + (dt === selectedType ? ' active' : '') + '" data-type="' + escapeHtml(dt) + '">' + escapeHtml(dt) + '</button>'
  ).join('');
  document.getElementById('reqDocTypeRow').querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      selectedType = chip.dataset.type;
      document.getElementById('reqDocTypeRow').querySelectorAll('.filter-chip').forEach(c => c.classList.toggle('active', c === chip));
    });
  });
  document.getElementById('reqDocPurpose').value = '';
  document.getElementById('reqDocCopies').value = '1';
  selectedDelivery = 'pickup';
  renderDeliveryRow();
  backdrop.classList.add('open');
}
function renderDeliveryRow() {
  document.getElementById('reqDocDeliveryRow').innerHTML = deliveryMethods().map(d =>
    '<button type="button" class="doc-delivery-option' + (d.key === selectedDelivery ? ' active' : '') + '" data-method="' + d.key + '">' +
      icon(d.icon, { size: 18, color: d.key === selectedDelivery ? '#fff' : 'var(--ink)' }) +
      '<span class="doc-delivery-option-title">' + escapeHtml(d.title) + '</span>' +
      '<span class="doc-delivery-option-sub">' + escapeHtml(d.sub) + '</span>' +
    '</button>'
  ).join('');
  document.getElementById('reqDocDeliveryRow').querySelectorAll('.doc-delivery-option').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedDelivery = btn.dataset.method;
      renderDeliveryRow();
    });
  });
}
function closeRequestSheet() {
  document.getElementById('reqDocBackdrop')?.classList.remove('open');
}
function submitRequest() {
  if (!selectedType) { showToast(t('student_documents.choose_type_first', 'Choose which document you need first.')); return; }
  const purpose = document.getElementById('reqDocPurpose').value.trim();
  const copies = Math.max(1, parseInt(document.getElementById('reqDocCopies').value, 10) || 1);

  const btn = document.getElementById('reqDocSubmitBtn');
  const label = document.getElementById('reqDocSubmitLabel');
  btn.disabled = true;
  label.innerHTML = '<span class="util-spinner"></span>';

  requestStudentDocument(currentToken, selectedType, purpose || undefined, copies, selectedDelivery).then(result => {
    currentDocuments = [result.document, ...currentDocuments];
    renderDocs(currentDocuments);
    closeRequestSheet();
  }).catch(err => {
    showToast((err && err.message) || t('common.submit_failed', 'Could not submit request.'));
  }).finally(() => {
    btn.disabled = false;
    label.textContent = t('common.submit', 'Submit');
  });
}

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML = renderUtilHeader(
    t('student_documents.title', 'My Documents'),
    t('student_dashboard.documents_desc', 'Request report cards, transcripts, COR and certificates'),
    'student-dashboard.php',
    { label: t('student_documents.request_action', '+ Request'), onClick: openRequestSheet }
  );
}
renderHeaderText();
onLocaleChange(renderHeaderText);

guardDashboard('student', function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  document.getElementById('utilBody').style.display = '';
  document.getElementById('bottomNavWrap').innerHTML = renderBottomNav('student');
  load(token);
});
