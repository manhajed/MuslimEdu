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
// Which checklist requirement the wizard is showing. Survives the reload
// that follows an upload, so the student stays on the step they were on.
let wizardStep = 0;
let wizardResumed = false;

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

// ── Checklist item renderer (read-only view, once the request is sent) ──
function renderChecklistItemHtml(item) {
  const statusIcon = item.is_completed
    ? icon('checkcircle', { size: 18, color: 'var(--emerald-deep)' })
    : icon('close', { size: 18, color: item.is_required ? '#EF4444' : 'var(--subtle)' });

  let bodyHtml = '';
  if (item.requirement_type === 'document') {
    const doc = item.document_id ? myDocumentsById[item.document_id] : null;
    bodyHtml = doc
      ? '<div class="list-card-meta" style="margin:4px 0;">' + escapeHtml(doc.title || t('taqdim_translation_application.file_attached', 'File attached')) +
        ' · <a href="' + escapeHtml(doc.file) + '" target="_blank">' + escapeHtml(t('taqdim_translation_application.view_link', 'View')) + '</a></div>'
      : '';
  } else { // statement
    bodyHtml = item.statement_text
      ? '<div class="list-card-meta" style="margin-top:4px;white-space:pre-wrap;">' + escapeHtml(item.statement_text) + '</div>'
      : '';
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

// ── Wizard (editable view) ──
// The school's checklist is walked one requirement at a time instead of
// dumped as one long form: a document step uploads as soon as a file is
// picked, and Continue moves to the next requirement the admin configured.
const TT_UPLOAD_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>';

function renderWizardItemCard(item, total) {
  const badge = item.is_completed
    ? '<span class="tt-badge tt-badge-done">' + icon('checkcircle', { size: 12, color: '#0F7A3D' }) + escapeHtml(t('taqdim_translation_application.completed_chip', 'Completed')) + '</span>'
    : (item.is_required
      ? '<span class="tt-badge tt-badge-required">' + escapeHtml(t('taqdim_translation_application.required_chip', 'Required')) + '</span>'
      : '<span class="tt-badge tt-badge-optional">' + escapeHtml(t('taqdim_translation_application.optional_chip', 'Optional')) + '</span>');

  let bodyHtml = '';
  if (item.requirement_type === 'document') {
    const doc = item.document_id ? myDocumentsById[item.document_id] : null;
    bodyHtml =
      (doc
        ? '<div class="tt-file-chip">' +
            '<span class="tt-file-check">' + icon('checkcircle', { size: 15, color: '#0F7A3D' }) + '</span>' +
            '<span class="tt-file-name">' + escapeHtml(doc.title || t('taqdim_translation_application.file_attached', 'File attached')) + '</span>' +
            (doc.file ? '<a class="tt-file-view" href="' + escapeHtml(doc.file) + '" target="_blank" rel="noopener">' + escapeHtml(t('taqdim_translation_application.view_link', 'View')) + '</a>' : '') +
          '</div>'
        : '') +
      '<label class="tt-dropzone" data-item-id="' + item.id + '">' +
        '<input type="file" class="itemFileInput" data-item-id="' + item.id + '" hidden />' +
        '<span class="tt-dropzone-icon">' + TT_UPLOAD_ICON_SVG + '</span>' +
        '<span class="tt-dropzone-title">' + escapeHtml(doc
          ? t('taqdim_translation_application.dropzone_replace', 'Tap to replace this file')
          : t('taqdim_translation_application.dropzone_choose', 'Tap to choose a file')) + '</span>' +
        '<span class="tt-dropzone-hint">' + escapeHtml(t('taqdim_translation_application.dropzone_hint', 'It uploads as soon as you pick it')) + '</span>' +
      '</label>';
  } else { // statement
    bodyHtml =
      '<textarea class="tt-wizard-textarea itemStatementInput" data-item-id="' + item.id + '" placeholder="' + escapeHtml(t('taqdim_translation_application.statement_placeholder', 'Write your answer here')) + '">' + escapeHtml(item.statement_text || '') + '</textarea>' +
      '<button type="button" class="tt-wizard-save itemSaveStatementBtn" data-item-id="' + item.id + '"><span class="itemSaveStatementLabel">' + escapeHtml(t('common.save', 'Save')) + '</span></button>';
  }

  return (
    '<div class="tt-wizard-caption">' + escapeHtml(t('taqdim_translation_application.wizard_step', 'Step {n} of {total}').replace('{n}', String(wizardStep + 1)).replace('{total}', String(total))) + '</div>' +
    '<div class="tt-wizard-title">' + escapeHtml(item.title) + '</div>' +
    '<div class="tt-wizard-sub">' + badge + '<span>' + escapeHtml(requirementTypeLabel(item.requirement_type)) + '</span></div>' +
    (item.notes ? '<div class="tt-wizard-note">' + escapeHtml(t('taqdim_translation_application.revision_note_prefix', 'Staff note:')) + ' ' + escapeHtml(item.notes) + '</div>' : '') +
    bodyHtml
  );
}

function renderWizardHtml(items) {
  const item = items[wizardStep];
  const isLast = wizardStep === items.length - 1;
  const blocked = item.is_required && !item.is_completed;

  const segments = items.map((it, i) =>
    '<span class="tt-wizard-seg' + (it.is_completed ? ' is-done' : (i === wizardStep ? ' is-current' : '')) + '"></span>'
  ).join('');

  return (
    '<div class="tt-wizard">' +
      '<div class="tt-wizard-progress">' + segments + '</div>' +
      renderWizardItemCard(item, items.length) +
      '<div class="tt-wizard-nav">' +
        (wizardStep > 0 ? '<button type="button" class="tt-wizard-back" id="wizardBackBtn">' + escapeHtml(t('taqdim_translation_application.wizard_back', 'Back')) + '</button>' : '') +
        (isLast ? '' : '<button type="button" class="tt-wizard-next" id="wizardNextBtn"' + (blocked ? ' disabled' : '') + '>' + escapeHtml(t('taqdim_translation_application.wizard_continue', 'Continue')) + '</button>') +
      '</div>' +
      (blocked && !isLast ? '<div class="tt-wizard-hint">' + escapeHtml(t('taqdim_translation_application.wizard_blocked', 'This one is required before you can continue.')) + '</div>' : '') +
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

  // While the draft is still being filled in, the checklist is a wizard -
  // one requirement at a time. Once it's sent it becomes a plain summary
  // list, since then the point is seeing everything at a glance.
  const useWizard = editable && items.length > 0;
  if (useWizard) {
    // Resume on the first unfinished requirement, but only when the page
    // first loads - later re-renders must keep the step the student is on.
    if (!wizardResumed) {
      wizardResumed = true;
      const firstIncomplete = items.findIndex(it => !it.is_completed);
      wizardStep = firstIncomplete === -1 ? items.length - 1 : firstIncomplete;
    }
    wizardStep = Math.min(Math.max(wizardStep, 0), items.length - 1);
  }
  const onLastStep = !useWizard || wizardStep === items.length - 1;

  const checklistHtml = items.length === 0
    ? '<div class="util-row"><span class="util-row-title" style="color:var(--subtle);">' + escapeHtml(t('taqdim_translation_application.no_checklist', 'Your school has not set up a checklist for this yet.')) + '</span></div>'
    : (useWizard ? renderWizardHtml(items) : items.map(renderChecklistItemHtml).join(''));

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
      '<div class="chip-row">' +
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
    (editable && onLastStep
      ? '<button type="button" class="util-save-btn pill" id="submitAppBtn" style="margin-top:20px;"' + (app.all_required_completed ? '' : ' disabled') + '><span id="submitAppLabel">' + escapeHtml(t('taqdim_translation_application.submit_btn', 'Send Request')) + '</span></button>' +
        (app.all_required_completed
          ? ''
          : '<div class="list-card-meta" style="margin-top:8px;text-align:center;">' +
              escapeHtml(t('taqdim_translation_application.submit_blocked_hint', 'Complete every required item to send your request.')) +
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

// Applies a saved checklist item to the copy already in memory so the
// step can re-render from local state - no second round-trip refetching
// the whole application just to show what we already know changed.
function patchLocalItem(itemId, changes) {
  const item = (currentApplication.checklistItems || []).find(it => String(it.id) === String(itemId));
  if (item) Object.assign(item, changes);
  currentApplication.all_required_completed =
    (currentApplication.checklistItems || []).every(it => !it.is_required || it.is_completed);
}

function wireChecklistEvents(token) {
  // No separate Upload button: picking a file uploads it straight away,
  // and the step updates in place from the response.
  document.querySelectorAll('.itemFileInput').forEach(input => {
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const itemId = input.dataset.itemId;
      const zone = document.querySelector('.tt-dropzone[data-item-id="' + itemId + '"]');
      if (zone) {
        zone.classList.add('is-uploading');
        zone.innerHTML =
          '<span class="tt-dropzone-icon"><span class="util-spinner"></span></span>' +
          '<span class="tt-dropzone-title">' + escapeHtml(t('taqdim_translation_application.uploading', 'Uploading…')) + '</span>' +
          '<span class="tt-dropzone-hint">' + escapeHtml(file.name) + '</span>';
      }
      let uploaded = null;
      uploadTaqdimTranslationDocument(token, APP_FEATURE, file).then(doc => {
        uploaded = doc;
        return updateTaqdimTranslationChecklistItem(token, itemId, { document_id: doc.id, is_completed: true });
      }).then(() => {
        myDocumentsById[uploaded.id] = uploaded;
        patchLocalItem(itemId, { document_id: uploaded.id, is_completed: true });
        showToast(t('taqdim_translation_application.uploaded_toast', 'File uploaded.'));
        renderApplication(token, currentApplication);
      }).catch(err => {
        showToast(err && err.message ? err.message : t('taqdim_translation_application.upload_failed', 'Could not upload this file.'));
        renderApplication(token, currentApplication);
      });
    });
  });

  document.getElementById('wizardBackBtn')?.addEventListener('click', () => {
    wizardStep -= 1;
    renderApplication(token, currentApplication);
  });

  document.getElementById('wizardNextBtn')?.addEventListener('click', () => {
    wizardStep += 1;
    renderApplication(token, currentApplication);
  });

  document.querySelectorAll('.itemSaveStatementBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      const itemId = btn.dataset.itemId;
      const textarea = document.querySelector('.itemStatementInput[data-item-id="' + itemId + '"]');
      const text = textarea.value.trim();
      const label = btn.querySelector('.itemSaveStatementLabel');
      btn.disabled = true; label.innerHTML = '<span class="util-spinner"></span>';
      updateTaqdimTranslationChecklistItem(token, itemId, { statement_text: text, is_completed: text.length > 0 }).then(() => {
        patchLocalItem(itemId, { statement_text: text, is_completed: text.length > 0 });
        showToast(t('taqdim_translation_application.statement_saved_toast', 'Saved.'));
        renderApplication(token, currentApplication);
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
