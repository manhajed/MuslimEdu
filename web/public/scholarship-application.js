// Scholarship & Taqdim Assistant - the Taqdim application wizard itself.
// Reads application_id from the query string (linked from scholarship-
// detail.js's "Start Application" and scholarship-browse.js's "My
// Applications" sheet). This is where the spec's worked example lives:
// a checklist item flagged may_require_translation shows a
// "Translation Required" badge and a [Request Translation] button that
// calls ScholarshipTranslationController::requestCreate - the request
// then goes through the staff queue (scholarship-translations.js) and,
// once completed, the finished file appears back here automatically via
// the checklist item's translated_document_id (set server-side, no
// action needed on this page to "receive" it - just re-fetching the
// application after the student's next visit shows it).

function qsParam(name) { return new URLSearchParams(window.location.search).get(name); }
const applicationId = qsParam('application_id');

let currentApplication = null;
let myDocumentsById = {};       // document_id -> UserDocument, for showing filenames/status inline
let translationRequestsByItem = {}; // checklist_item_id -> latest ScholarshipTranslationRequest

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
function appStatusLabel(s) { return t('scholarship_translations.status_' + s, s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())); }
function appStatusChipClass(s) {
  if (s === 'approved') return 'ok';
  if (s === 'submitted' || s === 'under_review' || s === 'draft') return 'warn';
  return 'danger'; // missing_documents, rejected, withdrawn
}
function translationStatusLabel(s) { return t('scholarship_translations.status_' + s, s.charAt(0).toUpperCase() + s.slice(1)); }
function translationStatusChipClass(s) {
  if (s === 'completed') return 'ok';
  if (s === 'cancelled') return 'danger';
  return 'warn'; // requested, assigned, translating, review
}

// ── Status history ──
function renderHistoryHtml(history) {
  if (!history || history.length === 0) return '';
  const rows = history.slice().reverse().map(h =>
    '<div class="util-row" style="pointer-events:none;">' +
      '<span class="util-row-icon">' + icon('clock', { size: 15, color: 'var(--subtle)' }) + '</span>' +
      '<span class="util-row-title">' + (h.from_status ? escapeHtml(appStatusLabel(h.from_status)) + ' → ' : '') + escapeHtml(appStatusLabel(h.to_status)) +
        (h.note ? '<br><span style="font-weight:400;color:var(--subtle);font-size:12px;">' + escapeHtml(h.note) + '</span>' : '') + '</span>' +
      '<span class="util-row-value">' + escapeHtml(formatDateTime(h.created_at) || '') + '</span>' +
    '</div>'
  ).join('');
  return '<div class="util-section-title" style="margin-top:18px;">' + escapeHtml(t('scholarship_application.history_section', 'Status History')) + '</div><div class="util-card">' + rows + '</div>';
}

// ── Checklist item renderers ──
function requirementTypeLabel(rt) { return t('scholarship_programs.req_type_' + rt, (rt || '').charAt(0).toUpperCase() + (rt || '').slice(1)); }

function renderTranslationBlock(item) {
  // Any document-type item can request a translation (self-service isn't
  // gated to only staff-flagged items - see the may_require_translation
  // migration's doc comment), but the "Translation Required" badge itself
  // only shows when staff flagged it, so this block's *button* appears
  // more often than its *badge* does.
  if (item.requirement_type !== 'document') return '';
  if (item.translated_document_id) {
    const doc = myDocumentsById[item.translated_document_id];
    return '<div class="chip-row" style="margin-top:8px;">' +
      '<span class="mini-chip ok">' + icon('checkcircle', { size: 12, color: 'var(--emerald-deep)' }) + ' ' + escapeHtml(t('scholarship_application.translation_ready', 'Translated document ready')) + '</span>' +
      (doc ? '<a href="assets/uploads/user-documents/' + encodeURIComponent(doc.file_path || '') + '" target="_blank" class="mini-chip ok" style="text-decoration:none;">' + escapeHtml(t('scholarship_application.view_link', 'View')) + '</a>' : '') +
    '</div>';
  }
  const existing = translationRequestsByItem[item.id];
  if (existing && existing.status !== 'cancelled') {
    return '<div class="chip-row" style="margin-top:8px;">' +
      '<span class="mini-chip ' + translationStatusChipClass(existing.status) + '">' + escapeHtml(t('scholarship_application.translation_status_chip', 'Translation: {status}').replace('{status}', translationStatusLabel(existing.status))) + '</span>' +
      (['requested', 'assigned'].includes(existing.status)
        ? '<button type="button" class="mini-chip danger cancelTranslationBtn" data-request-id="' + existing.id + '" style="border:none;">' + escapeHtml(t('scholarship_application.cancel_translation_btn', 'Cancel')) + '</button>'
        : '') +
    '</div>';
  }
  return '<div style="margin-top:8px;">' +
    (item.may_require_translation ? '<span class="mini-chip danger" style="margin-bottom:6px;display:inline-block;">' + escapeHtml(t('scholarship_translations.translation_required_badge', 'Translation Required')) + '</span><br>' : '') +
    '<button type="button" class="sheet-btn-secondary requestTranslationBtn" data-item-id="' + item.id + '" style="padding:8px 14px;font-size:12.5px;">' + escapeHtml(t('scholarship_application.request_translation_btn', 'Request Translation')) + '</button>' +
  '</div>';
}

function renderChecklistItemHtml(item, editable) {
  const statusIcon = item.is_completed
    ? icon('checkcircle', { size: 18, color: 'var(--emerald-deep)' })
    : icon('close', { size: 18, color: item.is_required ? '#EF4444' : 'var(--subtle)' });

  let bodyHtml = '';
  if (item.requirement_type === 'document') {
    const doc = item.document_id ? myDocumentsById[item.document_id] : null;
    bodyHtml =
      (doc ? '<div class="list-card-meta" style="margin:4px 0;">' + escapeHtml(doc.title || t('scholarship_application.file_attached', 'File attached')) +
        ' · <a href="assets/uploads/user-documents/' + encodeURIComponent(doc.file_path || '') + '" target="_blank">' + escapeHtml(t('scholarship_application.view_link', 'View')) + '</a></div>' : '') +
      (editable ? '<div class="util-file-input-row" style="margin-top:6px;"><input type="file" class="itemFileInput" data-item-id="' + item.id + '" /></div>' +
        '<button type="button" class="util-save-btn pill itemUploadBtn" data-item-id="' + item.id + '" style="margin-top:8px;height:40px;font-size:13px;"><span class="itemUploadLabel">' + escapeHtml(doc ? t('scholarship_application.replace_btn', 'Replace File') : t('scholarship_application.upload_btn', 'Upload')) + '</span></button>' : '') +
      renderTranslationBlock(item);
  } else if (item.requirement_type === 'statement') {
    bodyHtml = editable
      ? '<textarea class="util-input itemStatementInput" data-item-id="' + item.id + '" placeholder="' + escapeHtml(t('scholarship_application.statement_placeholder', 'Write your statement here')) + '" style="margin-top:6px;">' + escapeHtml(item.statement_text || '') + '</textarea>' +
        '<button type="button" class="util-save-btn pill itemSaveStatementBtn" data-item-id="' + item.id + '" style="margin-top:8px;height:40px;font-size:13px;"><span class="itemSaveStatementLabel">' + escapeHtml(t('common.save', 'Save')) + '</span></button>'
      : (item.statement_text ? '<div class="list-card-meta" style="margin-top:4px;white-space:pre-wrap;">' + escapeHtml(item.statement_text) + '</div>' : '');
  } else { // criteria
    bodyHtml = editable
      ? '<label class="switch-row" style="border-bottom:none;padding:6px 0;">' +
          '<span class="switch-row-label">' + escapeHtml(t('scholarship_application.criteria_confirm', 'I confirm I meet this requirement')) + '</span>' +
          '<span class="switch"><input type="checkbox" class="itemCriteriaToggle" data-item-id="' + item.id + '"' + (item.is_completed ? ' checked' : '') + '><span class="switch-track"></span></span>' +
        '</label>'
      : '';
  }

  return (
    '<div class="util-card" style="padding:14px;margin-bottom:10px;">' +
      '<div style="display:flex;align-items:flex-start;gap:10px;">' +
        '<span style="flex-shrink:0;margin-top:1px;">' + statusIcon + '</span>' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-size:14px;font-weight:700;color:var(--ink);">' + escapeHtml(item.title) +
            (!item.is_required ? ' <span class="mini-chip warn">' + escapeHtml(t('scholarship_programs.optional_chip', 'Optional')) + '</span>' : '') + '</div>' +
          '<div style="font-size:11.5px;color:var(--subtle);margin-top:2px;">' + escapeHtml(requirementTypeLabel(item.requirement_type)) + '</div>' +
          bodyHtml +
        '</div>' +
      '</div>' +
    '</div>'
  );
}

// ── Translation request sheet ──
function openTranslationRequestSheet(token, item) {
  let backdrop = document.getElementById('trBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'trBackdrop';
    backdrop.className = 'sheet-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.classList.remove('open'); });
  }
  backdrop.innerHTML =
    '<div class="sheet-panel form">' +
      '<div class="sheet-handle"></div>' +
      '<div class="sheet-title-row"><span class="sheet-title">' + escapeHtml(t('scholarship_application.request_translation_title', 'Request Translation')) + '</span>' +
        '<button type="button" class="sheet-close-btn" id="trCloseBtn">' + icon('close', { size: 16, color: 'var(--subtle)' }) + '</button></div>' +
      '<div class="list-card-meta" style="margin-bottom:10px;">' + escapeHtml(item.title) + '</div>' +
      '<label class="util-label" style="margin-top:0;">' + escapeHtml(t('scholarship_application.source_language_label', 'Source language')) + '</label>' +
      '<input type="text" id="trSource" class="util-input" placeholder="' + escapeHtml(t('scholarship_application.source_language_placeholder', 'e.g. Arabic')) + '" />' +
      '<label class="util-label">' + escapeHtml(t('scholarship_application.target_language_label', 'Target language')) + '</label>' +
      '<input type="text" id="trTarget" class="util-input" value="' + escapeHtml(t('scholarship_application.target_language_default', 'English')) + '" />' +
      '<label class="util-label">' + escapeHtml(t('scholarship_application.translation_type_label', 'Translation type (optional)')) + '</label>' +
      '<input type="text" id="trType" class="util-input" placeholder="' + escapeHtml(t('scholarship_application.translation_type_placeholder', 'e.g. Certified, Notarized')) + '" />' +
      '<label class="util-label">' + escapeHtml(t('scholarship_application.instructions_label', 'Additional instructions (optional)')) + '</label>' +
      '<textarea id="trInstructions" class="util-input" placeholder="' + escapeHtml(t('scholarship_application.instructions_placeholder', 'Anything the translator should know')) + '"></textarea>' +
      '<div class="sheet-form-actions">' +
        '<button type="button" class="sheet-btn-secondary" id="trCancelBtn">' + escapeHtml(t('common.cancel', 'Cancel')) + '</button>' +
        '<button type="button" class="sheet-btn-primary" id="trSubmitBtn"><span id="trSubmitLabel">' + escapeHtml(t('scholarship_application.submit_request_btn', 'Send Request')) + '</span></button>' +
      '</div>' +
    '</div>';
  document.getElementById('trCloseBtn').addEventListener('click', () => backdrop.classList.remove('open'));
  document.getElementById('trCancelBtn').addEventListener('click', () => backdrop.classList.remove('open'));
  document.getElementById('trSubmitBtn').addEventListener('click', () => {
    const sourceLanguage = document.getElementById('trSource').value.trim();
    const targetLanguage = document.getElementById('trTarget').value.trim();
    if (!sourceLanguage || !targetLanguage) { showToast(t('scholarship_application.languages_required', 'Please fill in both languages.')); return; }
    const btn = document.getElementById('trSubmitBtn');
    const label = document.getElementById('trSubmitLabel');
    btn.disabled = true; label.innerHTML = '<span class="util-spinner"></span>';
    requestScholarshipTranslation(token, {
      application_id: applicationId,
      checklist_item_id: item.id,
      source_document_id: item.document_id || null,
      source_language: sourceLanguage,
      target_language: targetLanguage,
      translation_type: document.getElementById('trType').value.trim() || null,
      instructions: document.getElementById('trInstructions').value.trim() || null,
    }).then(() => {
      backdrop.classList.remove('open');
      showToast(t('scholarship_application.translation_requested_toast', 'Translation requested.'));
      loadApplication(token);
    }).catch(err => showToast(err && err.message ? err.message : t('scholarship_application.translation_request_failed', 'Could not send this request.')))
      .finally(() => { btn.disabled = false; label.textContent = t('scholarship_application.submit_request_btn', 'Send Request'); });
  });
  backdrop.classList.add('open');
}

// ── Main render ──
function renderApplication(token, app) {
  currentApplication = app;
  const editable = ['draft', 'missing_documents'].includes(app.status);
  const items = (app.checklistItems || []).slice().sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const checklistHtml = items.length === 0
    ? '<div class="util-row"><span class="util-row-title" style="color:var(--subtle);">' + escapeHtml(t('scholarship_application.no_checklist', 'This scholarship has no checklist items.')) + '</span></div>'
    : items.map(item => renderChecklistItemHtml(item, editable)).join('');

  document.getElementById('appContent').innerHTML =
    '<div style="padding:2px;">' +
      '<h1 style="font-size:18px;font-weight:800;color:var(--ink);margin:0 0 4px;">' + escapeHtml((app.program && app.program.title) || '') + '</h1>' +
      '<div class="chip-row" style="margin-top:6px;">' +
        '<span class="mini-chip ' + appStatusChipClass(app.status) + '">' + escapeHtml(appStatusLabel(app.status)) + '</span>' +
        '<span class="mini-chip ok">' + escapeHtml(app.reference_no || '') + '</span>' +
      '</div>' +
    '</div>' +
    (app.decision_note ? '<div class="util-label">' + escapeHtml(t('scholarship_application.decision_note_label', 'Note from staff')) + '</div><div class="list-card-meta" style="margin-bottom:10px;">' + escapeHtml(app.decision_note) + '</div>' : '') +
    '<div class="util-section-title" style="margin-top:14px;">' + escapeHtml(t('scholarship_application.checklist_section', 'Taqdim Checklist')) + '</div>' +
    checklistHtml +
    renderHistoryHtml(app.statusHistory) +
    (editable
      ? '<button type="button" class="util-save-btn pill" id="submitAppBtn" style="margin-top:20px;"><span id="submitAppLabel">' + escapeHtml(t('scholarship_application.submit_btn', 'Submit Application')) + '</span></button>'
      : '') +
    (!['approved', 'rejected', 'withdrawn'].includes(app.status)
      ? '<button type="button" class="sheet-btn-secondary" id="withdrawAppBtn" style="width:100%;margin-top:10px;">' + escapeHtml(t('scholarship_application.withdraw_btn', 'Withdraw Application')) + '</button>'
      : '');

  wireChecklistEvents(token);

  const submitBtn = document.getElementById('submitAppBtn');
  if (submitBtn) submitBtn.addEventListener('click', () => {
    const label = document.getElementById('submitAppLabel');
    submitBtn.disabled = true; label.innerHTML = '<span class="util-spinner"></span>';
    submitScholarshipApplication(token, applicationId).then(() => {
      showToast(t('scholarship_application.submitted_toast', 'Application submitted.'));
      loadApplication(token);
    }).catch(err => {
      // authedPost() only ever surfaces a plain Error with `.message` -
      // it doesn't preserve extra response fields like the `missing`
      // array applicationSubmit() also returns on a 422 - so `.message`
      // (the "Please complete every required checklist item..." string)
      // is all there is to show here.
      showToast(err && err.message ? err.message : t('scholarship_application.submit_failed', 'Could not submit your application.'));
      submitBtn.disabled = false; label.textContent = t('scholarship_application.submit_btn', 'Submit Application');
    });
  });

  const withdrawBtn = document.getElementById('withdrawAppBtn');
  if (withdrawBtn) withdrawBtn.addEventListener('click', () => {
    openActionSheet(t('scholarship_application.confirm_withdraw_title', 'Withdraw this application?'), [
      { icon: 'close', label: t('scholarship_application.confirm_withdraw_label', 'Yes, withdraw'), desc: t('scholarship_application.confirm_withdraw_desc', 'This cannot be undone'), onPress: () => {
        withdrawScholarshipApplication(token, applicationId).then(() => {
          showToast(t('scholarship_application.withdrawn_toast', 'Application withdrawn.'));
          loadApplication(token);
        }).catch(err => showToast(err && err.message ? err.message : t('scholarship_application.withdraw_failed', 'Could not withdraw this application.')));
      }},
      { icon: 'checkcircle', label: t('scholarship_application.keep_label', 'Keep application'), desc: '', onPress: () => {} },
    ]);
  });
}

function wireChecklistEvents(token) {
  document.querySelectorAll('.itemUploadBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      const itemId = btn.dataset.itemId;
      const fileInput = document.querySelector('.itemFileInput[data-item-id="' + itemId + '"]');
      const file = fileInput && fileInput.files && fileInput.files[0];
      if (!file) { showToast(t('scholarship_application.choose_file', 'Choose a file first.')); return; }
      const label = btn.querySelector('.itemUploadLabel');
      btn.disabled = true; label.innerHTML = '<span class="util-spinner"></span>';
      uploadScholarshipDocument(token, file).then(doc =>
        updateScholarshipChecklistItem(token, itemId, { document_id: doc.id, is_completed: true })
      ).then(() => {
        showToast(t('scholarship_application.uploaded_toast', 'File uploaded.'));
        loadApplication(token);
      }).catch(err => {
        showToast(err && err.message ? err.message : t('scholarship_application.upload_failed', 'Could not upload this file.'));
        btn.disabled = false; label.textContent = t('scholarship_application.upload_btn', 'Upload');
      });
    });
  });

  document.querySelectorAll('.itemSaveStatementBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      const itemId = btn.dataset.itemId;
      const textarea = document.querySelector('.itemStatementInput[data-item-id="' + itemId + '"]');
      const text = textarea.value.trim();
      const label = btn.querySelector('.itemSaveStatementLabel');
      btn.disabled = true; label.innerHTML = '<span class="util-spinner"></span>';
      updateScholarshipChecklistItem(token, itemId, { statement_text: text, is_completed: text.length > 0 }).then(() => {
        showToast(t('scholarship_application.statement_saved_toast', 'Statement saved.'));
        loadApplication(token);
      }).catch(err => {
        showToast(err && err.message ? err.message : t('scholarship_application.statement_save_failed', 'Could not save this statement.'));
        btn.disabled = false; label.textContent = t('common.save', 'Save');
      });
    });
  });

  document.querySelectorAll('.itemCriteriaToggle').forEach(cb => {
    cb.addEventListener('change', () => {
      const itemId = cb.dataset.itemId;
      cb.disabled = true;
      updateScholarshipChecklistItem(token, itemId, { is_completed: cb.checked }).then(() => {
        loadApplication(token);
      }).catch(err => {
        cb.checked = !cb.checked;
        cb.disabled = false;
        showToast(err && err.message ? err.message : t('scholarship_application.checklist_update_failed', 'Could not update this item.'));
      });
    });
  });

  document.querySelectorAll('.requestTranslationBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = (currentApplication.checklistItems || []).find(i => String(i.id) === btn.dataset.itemId);
      if (item) openTranslationRequestSheet(token, item);
    });
  });

  document.querySelectorAll('.cancelTranslationBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      const requestId = btn.dataset.requestId;
      cancelScholarshipTranslationRequest(token, requestId).then(() => {
        showToast(t('scholarship_application.translation_cancelled_toast', 'Translation request cancelled.'));
        loadApplication(token);
      }).catch(err => showToast(err && err.message ? err.message : t('scholarship_application.translation_cancel_failed', 'Could not cancel this request.')));
    });
  });
}

// ── Boot ──
function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(currentApplication && currentApplication.program ? currentApplication.program.title : t('scholarship_application.title', 'Taqdim Application'), '', 'scholarship-browse.php');
}
onLocaleChange(renderHeaderText);

function loadApplication(token) {
  Promise.all([
    fetchMyScholarshipApplication(token, applicationId),
    fetchMyScholarshipDocuments(token),
    fetchScholarshipTranslationRequests(token, applicationId),
  ]).then(([app, documents, translationRequests]) => {
    myDocumentsById = {};
    documents.forEach(d => { myDocumentsById[d.id] = d; });

    translationRequestsByItem = {};
    // Latest request per checklist item - requests are returned newest
    // first (orderByDesc('created_at') server-side), so the first match
    // per item_id wins here.
    translationRequests.forEach(r => {
      if (r.checklist_item_id && !translationRequestsByItem[r.checklist_item_id]) {
        translationRequestsByItem[r.checklist_item_id] = r;
      }
    });

    document.getElementById('utilBody').style.display = '';
    renderApplication(token, app);
    renderHeaderText();
  }).catch(() => {
    document.getElementById('utilBody').style.display = '';
    document.getElementById('appContent').innerHTML =
      '<div class="list-error">' + escapeHtml(t('scholarship_application.load_failed', 'Could not load this application.')) + '<br><button type="button" class="list-retry-btn" id="retryBtn">' + escapeHtml(t('common.retry', 'Try again')) + '</button></div>';
    document.getElementById('retryBtn')?.addEventListener('click', () => loadApplication(token));
  });
}

guardDashboard('student', function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  document.getElementById('bottomNavWrap').innerHTML = renderBottomNav('student');
  renderHeaderText();

  if (!applicationId) {
    document.getElementById('utilBody').style.display = '';
    document.getElementById('appContent').innerHTML = '<div class="list-empty"><div class="list-empty-title">' + escapeHtml(t('scholarship_application.missing_id', 'No application selected.')) + '</div></div>';
    return;
  }
  loadApplication(token);
});
