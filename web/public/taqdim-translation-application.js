// Taqdim Assistant / Translation Service - a student's own application
// against their school's checklist for one feature (TaqdimTranslation-
// RequirementController / TaqdimTranslationApplicationController). Unlike
// the platform-wide Scholarship & Taqdim flow (scholarship-application.js)
// there is no separate "browse programs" step - a school has exactly one
// checklist per feature, so this page calls applicationStart() itself
// (find-or-create, same idempotent shape as
// ScholarshipApplicationController::applicationStart) rather than
// expecting an application_id in the query string.
//
// Chat unlock: once every required item is completed
// (all_required_completed, computed server-side by
// TaqdimTranslationApplication::allRequiredItemsCompleted()), a "Message"
// button appears once the school admin has assigned someone to review -
// it opens the existing generic chat-box.php thread with that admin, the
// same messaging system every other user-to-user chat in the app uses.
// There is no dedicated messaging table for this feature.

function qsParam(name) { return new URLSearchParams(window.location.search).get(name); }
const APP_FEATURE = qsParam('feature') === 'translation' ? 'translation' : 'taqdim';

let currentApplication = null;
let myDocumentsById = {};

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
function featureTitle() {
  return APP_FEATURE === 'translation'
    ? t('taqdim_translation_application.translation_title', 'Translation Request')
    : t('taqdim_translation_application.taqdim_title', 'Taqdim Application');
}
function appStatusLabel(s) { return t('taqdim_translation_application.status_' + s, s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())); }
function appStatusChipClass(s) {
  if (s === 'approved') return 'ok';
  if (s === 'submitted' || s === 'under_review' || s === 'draft') return 'warn';
  return 'danger'; // rejected, withdrawn
}
function requirementTypeLabel(rt) { return t('taqdim_translation_application.req_type_' + rt, (rt || '').charAt(0).toUpperCase() + (rt || '').slice(1)); }

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
  return '<div class="util-section-title" style="margin-top:18px;">' + escapeHtml(t('taqdim_translation_application.history_section', 'Status History')) + '</div><div class="util-card">' + rows + '</div>';
}

// ── Checklist item renderer ──
function renderChecklistItemHtml(item, editable) {
  const statusIcon = item.is_completed
    ? icon('checkcircle', { size: 18, color: 'var(--emerald-deep)' })
    : icon('close', { size: 18, color: item.is_required ? '#EF4444' : 'var(--subtle)' });

  let bodyHtml = '';
  if (item.requirement_type === 'document') {
    const doc = item.document_id ? myDocumentsById[item.document_id] : null;
    bodyHtml =
      (doc ? '<div class="list-card-meta" style="margin:4px 0;">' + escapeHtml(doc.title || t('taqdim_translation_application.file_attached', 'File attached')) +
        ' · <a href="' + escapeHtml(doc.file) + '" target="_blank">' + escapeHtml(t('taqdim_translation_application.view_link', 'View')) + '</a></div>' : '') +
      (editable ? '<div class="util-file-input-row" style="margin-top:6px;"><input type="file" class="itemFileInput" data-item-id="' + item.id + '" /></div>' +
        '<button type="button" class="util-save-btn pill itemUploadBtn" data-item-id="' + item.id + '" style="margin-top:8px;height:40px;font-size:13px;"><span class="itemUploadLabel">' + escapeHtml(doc ? t('taqdim_translation_application.replace_btn', 'Replace File') : t('taqdim_translation_application.upload_btn', 'Upload')) + '</span></button>' : '');
  } else { // statement
    bodyHtml = editable
      ? '<textarea class="util-input itemStatementInput" data-item-id="' + item.id + '" placeholder="' + escapeHtml(t('taqdim_translation_application.statement_placeholder', 'Write your answer here')) + '" style="margin-top:6px;">' + escapeHtml(item.statement_text || '') + '</textarea>' +
        '<button type="button" class="util-save-btn pill itemSaveStatementBtn" data-item-id="' + item.id + '" style="margin-top:8px;height:40px;font-size:13px;"><span class="itemSaveStatementLabel">' + escapeHtml(t('common.save', 'Save')) + '</span></button>'
      : (item.statement_text ? '<div class="list-card-meta" style="margin-top:4px;white-space:pre-wrap;">' + escapeHtml(item.statement_text) + '</div>' : '');
  }

  return (
    '<div class="util-card" style="padding:14px;margin-bottom:10px;">' +
      '<div style="display:flex;align-items:flex-start;gap:10px;">' +
        '<span style="flex-shrink:0;margin-top:1px;">' + statusIcon + '</span>' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-size:14px;font-weight:700;color:var(--ink);">' + escapeHtml(item.title) +
            (!item.is_required ? ' <span class="mini-chip warn">' + escapeHtml(t('taqdim_translation_application.optional_chip', 'Optional')) + '</span>' : '') + '</div>' +
          '<div style="font-size:11.5px;color:var(--subtle);margin-top:2px;">' + escapeHtml(requirementTypeLabel(item.requirement_type)) + '</div>' +
          (item.notes ? '<div class="list-card-meta" style="margin-top:6px;color:#EF4444;">' + escapeHtml(t('taqdim_translation_application.revision_note_prefix', 'Staff note:')) + ' ' + escapeHtml(item.notes) + '</div>' : '') +
          bodyHtml +
        '</div>' +
      '</div>' +
    '</div>'
  );
}

// ── Main render ──
function renderApplication(token, app) {
  currentApplication = app;
  const editable = (TaqdimTranslationApplicationOpenStatuses()).includes(app.status);
  const items = (app.checklistItems || []).slice().sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const checklistHtml = items.length === 0
    ? '<div class="util-row"><span class="util-row-title" style="color:var(--subtle);">' + escapeHtml(t('taqdim_translation_application.no_checklist', 'Your school has not set up a checklist for this yet.')) + '</span></div>'
    : items.map(item => renderChecklistItemHtml(item, editable)).join('');

  let chatHtml = '';
  if (app.all_required_completed && app.status !== 'draft') {
    if (app.assigned_to && app.assignee) {
      chatHtml = '<a href="chat-box.php?userId=' + encodeURIComponent(app.assigned_to) + '&name=' + encodeURIComponent(app.assignee.name || '') + '" class="util-save-btn pill" style="margin-top:16px;text-decoration:none;display:block;text-align:center;">' + escapeHtml(t('taqdim_translation_application.message_btn', 'Message {name}').replace('{name}', app.assignee.name || '')) + '</a>';
    } else {
      chatHtml = '<div class="list-card-meta" style="margin-top:16px;text-align:center;">' + escapeHtml(t('taqdim_translation_application.waiting_for_reviewer', 'Your submission is complete. Waiting for a staff member to review it.')) + '</div>';
    }
  }

  document.getElementById('appContent').innerHTML =
    '<div style="padding:2px;">' +
      '<h1 style="font-size:18px;font-weight:800;color:var(--ink);margin:0 0 4px;">' + escapeHtml(featureTitle()) + '</h1>' +
      '<div class="chip-row" style="margin-top:6px;">' +
        '<span class="mini-chip ' + appStatusChipClass(app.status) + '">' + escapeHtml(appStatusLabel(app.status)) + '</span>' +
        '<span class="mini-chip ok">' + escapeHtml(app.reference_no || '') + '</span>' +
      '</div>' +
    '</div>' +
    (app.decision_note ? '<div class="util-label">' + escapeHtml(t('taqdim_translation_application.decision_note_label', 'Note from staff')) + '</div><div class="list-card-meta" style="margin-bottom:10px;">' + escapeHtml(app.decision_note) + '</div>' : '') +
    '<div class="util-section-title" style="margin-top:14px;">' + escapeHtml(t('taqdim_translation_application.checklist_section', 'Checklist')) + '</div>' +
    checklistHtml +
    chatHtml +
    renderHistoryHtml(app.statusHistory) +
    (editable
      ? '<button type="button" class="util-save-btn pill" id="submitAppBtn" style="margin-top:20px;"><span id="submitAppLabel">' + escapeHtml(t('taqdim_translation_application.submit_btn', 'Submit')) + '</span></button>'
      : '') +
    (!['approved', 'rejected', 'withdrawn'].includes(app.status)
      ? '<button type="button" class="sheet-btn-secondary" id="withdrawAppBtn" style="width:100%;margin-top:10px;">' + escapeHtml(t('taqdim_translation_application.withdraw_btn', 'Withdraw')) + '</button>'
      : '');

  wireChecklistEvents(token);

  const submitBtn = document.getElementById('submitAppBtn');
  if (submitBtn) submitBtn.addEventListener('click', () => {
    const label = document.getElementById('submitAppLabel');
    submitBtn.disabled = true; label.innerHTML = '<span class="util-spinner"></span>';
    submitTaqdimTranslationApplication(token, currentApplication.id).then(() => {
      showToast(t('taqdim_translation_application.submitted_toast', 'Submitted.'));
      loadApplication(token);
    }).catch(err => {
      showToast(err && err.message ? err.message : t('taqdim_translation_application.submit_failed', 'Could not submit.'));
      submitBtn.disabled = false; label.textContent = t('taqdim_translation_application.submit_btn', 'Submit');
    });
  });

  const withdrawBtn = document.getElementById('withdrawAppBtn');
  if (withdrawBtn) withdrawBtn.addEventListener('click', () => {
    openActionSheet(t('taqdim_translation_application.confirm_withdraw_title', 'Withdraw this application?'), [
      { icon: 'close', label: t('taqdim_translation_application.confirm_withdraw_label', 'Yes, withdraw'), desc: t('taqdim_translation_application.confirm_withdraw_desc', 'This cannot be undone'), onPress: () => {
        withdrawTaqdimTranslationApplication(token, currentApplication.id).then(() => {
          showToast(t('taqdim_translation_application.withdrawn_toast', 'Withdrawn.'));
          loadApplication(token);
        }).catch(err => showToast(err && err.message ? err.message : t('taqdim_translation_application.withdraw_failed', 'Could not withdraw.')));
      }},
      { icon: 'checkcircle', label: t('taqdim_translation_application.keep_label', 'Keep application'), desc: '', onPress: () => {} },
    ]);
  });
}
function TaqdimTranslationApplicationOpenStatuses() { return ['draft', 'under_review']; }

function wireChecklistEvents(token) {
  document.querySelectorAll('.itemUploadBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      const itemId = btn.dataset.itemId;
      const fileInput = document.querySelector('.itemFileInput[data-item-id="' + itemId + '"]');
      const file = fileInput && fileInput.files && fileInput.files[0];
      if (!file) { showToast(t('taqdim_translation_application.choose_file', 'Choose a file first.')); return; }
      const label = btn.querySelector('.itemUploadLabel');
      btn.disabled = true; label.innerHTML = '<span class="util-spinner"></span>';
      uploadTaqdimTranslationDocument(token, APP_FEATURE, file).then(doc =>
        updateTaqdimTranslationChecklistItem(token, itemId, { document_id: doc.id, is_completed: true })
      ).then(() => {
        showToast(t('taqdim_translation_application.uploaded_toast', 'File uploaded.'));
        loadApplication(token);
      }).catch(err => {
        showToast(err && err.message ? err.message : t('taqdim_translation_application.upload_failed', 'Could not upload this file.'));
        btn.disabled = false; label.textContent = t('taqdim_translation_application.upload_btn', 'Upload');
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
      updateTaqdimTranslationChecklistItem(token, itemId, { statement_text: text, is_completed: text.length > 0 }).then(() => {
        showToast(t('taqdim_translation_application.statement_saved_toast', 'Saved.'));
        loadApplication(token);
      }).catch(err => {
        showToast(err && err.message ? err.message : t('taqdim_translation_application.statement_save_failed', 'Could not save.'));
        btn.disabled = false; label.textContent = t('common.save', 'Save');
      });
    });
  });
}

// ── Boot ──
function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(featureTitle(), '', 'student-dashboard.php');
}
renderHeaderText();
onLocaleChange(renderHeaderText);

function loadApplication(token) {
  startTaqdimTranslationApplication(token, APP_FEATURE).then(started =>
    Promise.all([
      fetchMyTaqdimTranslationApplication(token, started.id),
      fetchMyTaqdimTranslationDocuments(token, APP_FEATURE),
    ])
  ).then(([app, documents]) => {
    myDocumentsById = {};
    documents.forEach(d => { myDocumentsById[d.id] = d; });

    document.getElementById('utilBody').style.display = '';
    renderApplication(token, app);
    renderHeaderText();
  }).catch(err => {
    document.getElementById('utilBody').style.display = '';
    document.getElementById('appContent').innerHTML =
      '<div class="list-error">' + escapeHtml((err && err.message) || t('taqdim_translation_application.load_failed', 'Could not load this application.')) + '<br><button type="button" class="list-retry-btn" id="retryBtn">' + escapeHtml(t('common.retry', 'Try again')) + '</button></div>';
    document.getElementById('retryBtn')?.addEventListener('click', () => loadApplication(token));
  });
}

guardDashboard('student', function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  if (!user.school_features || !user.school_features[APP_FEATURE]) {
    window.location.href = 'student-dashboard.php';
    return;
  }
  document.getElementById('bottomNavWrap').innerHTML = renderBottomNav('student');
  loadApplication(token);
});
