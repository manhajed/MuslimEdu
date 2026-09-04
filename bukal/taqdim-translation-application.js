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
// Chat support: once every required item is completed
// (all_required_completed, computed server-side by
// TaqdimTranslationApplication::allRequiredItemsCompleted()), a "Support Chat"
// button appears once the school admin has assigned someone to review.
// This opens an integrated chat interface where the admin can send files,
// lock the conversation, and share credentials. Students can respond until
// the conversation is locked by the admin.

function qsParam(name) { return new URLSearchParams(window.location.search).get(name); }
const APP_FEATURE = qsParam('feature') === 'translation' ? 'translation' : 'taqdim';

let currentApplication = null;
let myDocumentsById = {};
// Set when the student has just sent their request, so the reload that
// follows drops them straight into the support chat.
let openChatAfterRender = false;

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

// ── Chat modal ──
// The uploaded requirements travel with the student into the chat as a
// pinned list, so the assigned admin sees everything that was submitted
// without leaving the conversation. Statement items have no file, so
// they're listed as a written answer rather than a broken link.
function buildChatAttachments(app) {
  return (app.checklistItems || [])
    .filter(it => it.is_completed)
    .slice()
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map(it => {
      const doc = it.requirement_type === 'document' && it.document_id ? myDocumentsById[it.document_id] : null;
      return { title: it.title, url: doc ? doc.file : null };
    });
}

function openChatModal(token, app) {
  const assigneeName = (app.assignee && app.assignee.name) || '';
  const overlay = document.createElement('div');
  overlay.className = 'taqdim-chat-overlay';
  overlay.innerHTML = '<div class="taqdim-chat-modal">' +
    '<div class="taqdim-chat-close"><button type="button" id="closeChatBtn" style="background:none;border:none;cursor:pointer;padding:0;font-size:24px;color:var(--subtle);">×</button></div>' +
    TaqdimTranslationChat.renderChatInterface(assigneeName, {
      attachments: buildChatAttachments(app),
      waiting: !app.assigned_to,
    }) +
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

  TaqdimTranslationChat.initializeTaqdimChat(token, app.assigned_to, assigneeName, false);
}

// ── Main render ──
function renderApplication(token, app) {
  currentApplication = app;
  const editable = (TaqdimTranslationApplicationOpenStatuses()).includes(app.status);
  const items = (app.checklistItems || []).slice().sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const checklistHtml = items.length === 0
    ? '<div class="util-row"><span class="util-row-title" style="color:var(--subtle);">' + escapeHtml(t('taqdim_translation_application.no_checklist', 'Your school has not set up a checklist for this yet.')) + '</span></div>'
    : items.map(item => renderChecklistItemHtml(item, editable)).join('');

  // Once the request has been sent, the support chat is where this
  // request lives - openable straight away, showing the waiting notice
  // until an assistant is assigned (see taqdimChatRenderWaiting).
  let chatHtml = '';
  if (app.status !== 'draft') {
    chatHtml = '<button type="button" id="openChatBtn" class="util-save-btn pill" style="margin-top:16px;width:100%;height:44px;font-size:13px;">' +
      escapeHtml(t('taqdim_translation_application.support_chat_btn', 'Open Support Chat')) + '</button>' +
      (app.assigned_to
        ? ''
        : '<div class="list-card-meta" style="margin-top:8px;text-align:center;">' +
            escapeHtml(t('taqdim_translation_application.waiting_for_reviewer', 'Waiting for an assistant to be assigned — this can take some time.')) +
          '</div>');
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
    // Send stays disabled until every required item is done - the
    // backend rejects an incomplete submit with a 422 anyway
    // (applicationSubmit), so this just surfaces that rule up front
    // instead of letting the student hit an error.
    (editable
      ? '<button type="button" class="util-save-btn pill" id="submitAppBtn" style="margin-top:20px;"' + (app.all_required_completed ? '' : ' disabled') + '><span id="submitAppLabel">' + escapeHtml(t('taqdim_translation_application.submit_btn', 'Send Request')) + '</span></button>' +
        (app.all_required_completed
          ? ''
          : '<div class="list-card-meta" style="margin-top:8px;text-align:center;">' +
              escapeHtml(t('taqdim_translation_application.submit_blocked_hint', 'Complete every required item above to send your request.')) +
            '</div>')
      : '') +
    (!['approved', 'rejected', 'withdrawn'].includes(app.status)
      ? '<button type="button" class="sheet-btn-secondary" id="withdrawAppBtn" style="width:100%;margin-top:10px;">' + escapeHtml(t('taqdim_translation_application.withdraw_btn', 'Withdraw')) + '</button>'
      : '');

  wireChecklistEvents(token);
  wireChatButton(token, app);
  wireSubmitEvents(token);
  wireWithdrawButton(token);

  if (openChatAfterRender) {
    openChatAfterRender = false;
    openChatModal(token, app);
  }
}

function wireChatButton(token, app) {
  const chatBtn = document.getElementById('openChatBtn');
  if (chatBtn) {
    chatBtn.addEventListener('click', () => {
      openChatModal(token, app);
    });
  }
}

function wireSubmitEvents(token) {
  const submitBtn = document.getElementById('submitAppBtn');
  if (submitBtn) submitBtn.addEventListener('click', () => {
    const label = document.getElementById('submitAppLabel');
    submitBtn.disabled = true; label.innerHTML = '<span class="util-spinner"></span>';
    submitTaqdimTranslationApplication(token, currentApplication.id).then(() => {
      showToast(t('taqdim_translation_application.submitted_toast', 'Request sent.'));
      // Land the student straight in the support chat, which opens in
      // its waiting state until an assistant is assigned.
      openChatAfterRender = true;
      loadApplication(token);
    }).catch(err => {
      showToast(err && err.message ? err.message : t('taqdim_translation_application.submit_failed', 'Could not send your request.'));
      submitBtn.disabled = false; label.textContent = t('taqdim_translation_application.submit_btn', 'Send Request');
    });
  });
}

function wireWithdrawButton(token) {
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
