// Taqdim Assistant / Translation Service - integrated support chat.
// Layered on top of the app's existing generic messaging endpoints
// (message_thread_start / message_chat_send / message_chat_list, wrapped
// by dashboard.js as startMessageThread / sendChatMessage /
// fetchChatMessages - same functions chat-box.js uses) rather than a new
// dedicated messaging table.
//
// Files, credentials, and conversation locking are NOT separate backend
// concepts yet - there is no file/lock column on the chat table. Instead
// the admin embeds a structured marker in the message text itself:
//   [FILE:filename]              - "I'm sending you this file" note
//   [CREDS:username:password]    - studyinsaudi portal credentials
//   [LOCK_NOTE:reason]           - locks the conversation client-side
//   [UNLOCK]                     - unlocks it again
// Every client that renders this thread (renderChatMessage below) parses
// these markers back out for display. Lock state is derived by replaying
// the message history in order - the most recent LOCK_NOTE/UNLOCK marker
// wins - so it's consistent for anyone opening the thread, not just
// whoever sent it. This is a UI-layer convention, not enforced by the
// backend: a determined student could still POST to message_chat_send
// directly while "locked". If that gap matters, the follow-up is a real
// `locked_at`/`locked_note` column on the thread and a server-side check
// in ChatController - out of scope for this pass.

const TAQDIM_CHAT_POLL_MS = 3000;
const TAQDIM_CHAT_MAX_MESSAGE_LENGTH = 4000;

let taqdimChatState = {
  threadId: null,
  otherUserId: null,
  otherUserName: null,
  isAdmin: false,
  isLocked: false,
  lockedNote: null,
  messages: [],
  lastId: undefined,
  pollId: null,
};

function taqdimChatFormatTime(iso) {
  try { return new Date(iso.replace(' ', 'T')).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
  catch (e) { return iso; }
}

// Replays messages in order and returns the lock state as of the last
// LOCK_NOTE/UNLOCK marker seen - so a student opening the thread fresh
// sees the same lock state the admin left it in, not just today's sender.
function taqdimChatDeriveLockState(messages) {
  let locked = false;
  let note = null;
  messages.forEach(m => {
    const lockMatch = m.message && m.message.match(/\[LOCK_NOTE:([^\]]+)\]/);
    if (lockMatch) { locked = true; note = lockMatch[1]; return; }
    if (m.message && m.message.indexOf('[UNLOCK]') !== -1) { locked = false; note = null; }
  });
  return { locked, note };
}

function taqdimChatRenderMessageBody(text) {
  const fileMatch = text.match(/\[FILE:([^\]]+)\]/);
  const credsMatch = text.match(/\[CREDS:([^\]]+)\]/);
  const isLockMarker = /\[LOCK_NOTE:[^\]]+\]/.test(text) || text.indexOf('[UNLOCK]') !== -1;

  // Strip the raw markers out of the plain-text bubble - they're rendered
  // as their own styled block below instead of shown as literal text.
  const cleanText = text
    .replace(/\[FILE:[^\]]+\]/g, '')
    .replace(/\[CREDS:[^\]]+\]/g, '')
    .replace(/\[LOCK_NOTE:[^\]]+\]/g, '')
    .replace(/\[UNLOCK\]/g, '')
    .trim();

  let html = cleanText ? '<div class="taqdim-chat-msg-text">' + escapeHtml(cleanText) + '</div>' : '';

  if (fileMatch) {
    html += '<div class="taqdim-chat-special-item taqdim-chat-file">' +
      icon('filetext', { size: 15, color: '#1E40AF' }) +
      '<span>' + escapeHtml(t('taqdim_translation_chat.file_shared', 'File: {name}').replace('{name}', fileMatch[1])) + '</span>' +
    '</div>';
  }
  if (credsMatch) {
    const parts = credsMatch[1].split(':');
    const username = parts[0] || '';
    const password = parts.slice(1).join(':') || '';
    html += '<div class="taqdim-chat-special-item taqdim-chat-creds">' +
      icon('lock', { size: 14, color: '#831843' }) +
      '<span>' + escapeHtml(t('taqdim_translation_chat.credentials_shared', 'studyinsaudi.com portal login')) + '<br>' +
        '<span style="font-family:monospace;">' + escapeHtml(t('taqdim_translation_chat.creds_username', 'User')) + ': ' + escapeHtml(username) + '</span><br>' +
        '<span style="font-family:monospace;">' + escapeHtml(t('taqdim_translation_chat.creds_password', 'Pass')) + ': ' + escapeHtml(password) + '</span>' +
      '</span>' +
    '</div>';
  }
  if (isLockMarker) {
    const lockMatch = text.match(/\[LOCK_NOTE:([^\]]+)\]/);
    html += lockMatch
      ? '<div class="taqdim-chat-special-item taqdim-chat-lock-marker">' + icon('lock', { size: 14, color: '#991B1B' }) + '<span>' + escapeHtml(t('taqdim_translation_chat.locked_marker', 'Conversation locked: {note}').replace('{note}', lockMatch[1])) + '</span></div>'
      : '<div class="taqdim-chat-special-item taqdim-chat-unlock-marker">' + icon('checkcircle', { size: 14, color: '#065F46' }) + '<span>' + escapeHtml(t('taqdim_translation_chat.unlocked_marker', 'Conversation unlocked')) + '</span></div>';
  }

  return html || '<div class="taqdim-chat-msg-text">&nbsp;</div>';
}

function taqdimChatRenderMessage(msg) {
  const isOwn = !!msg.is_mine;
  const senderLabel = isOwn ? t('taqdim_translation_chat.you', 'You') : (taqdimChatState.otherUserName || t('taqdim_translation_chat.them', 'Them'));
  return '<div class="taqdim-chat-msg ' + (isOwn ? 'taqdim-chat-msg-own' : 'taqdim-chat-msg-other') + '">' +
    '<div class="taqdim-chat-msg-sender">' + escapeHtml(senderLabel) + ' · ' + escapeHtml(taqdimChatFormatTime(msg.created_at) || '') + '</div>' +
    taqdimChatRenderMessageBody(msg.message || '') +
  '</div>';
}

function taqdimChatRenderMessages() {
  const wrap = document.getElementById('taqdimChatMessages');
  if (!wrap) return;
  wrap.innerHTML = taqdimChatState.messages.length
    ? taqdimChatState.messages.map(taqdimChatRenderMessage).join('')
    : '<div class="list-card-meta" style="text-align:center;padding:16px;">' + escapeHtml(t('taqdim_translation_chat.empty', 'No messages yet. Say hello to start the conversation.')) + '</div>';
  wrap.scrollTop = wrap.scrollHeight;
}

function taqdimChatRenderLockBar() {
  const bar = document.getElementById('taqdimChatLockBar');
  if (!bar) return;
  if (!taqdimChatState.isLocked) { bar.innerHTML = ''; bar.style.display = 'none'; return; }
  bar.style.display = '';
  bar.innerHTML = icon('lock', { size: 14, color: '#EF4444' }) +
    '<span>' + escapeHtml(t('taqdim_translation_chat.conversation_locked', 'Conversation locked')) +
    (taqdimChatState.lockedNote ? ' — ' + escapeHtml(taqdimChatState.lockedNote) : '') + '</span>';
}

function taqdimChatRenderInputArea() {
  const area = document.getElementById('taqdimChatInputArea');
  if (!area) return;
  const disabled = taqdimChatState.isLocked && !taqdimChatState.isAdmin;
  if (disabled) {
    area.innerHTML = '<div class="taqdim-chat-input-locked">' + escapeHtml(t('taqdim_translation_chat.locked_cannot_reply', 'This conversation is locked and you cannot reply.')) + '</div>';
    return;
  }
  area.innerHTML =
    '<textarea id="taqdimChatInput" class="taqdim-chat-input" placeholder="' + escapeHtml(t('taqdim_translation_chat.type_message', 'Type a message…')) + '" maxlength="' + TAQDIM_CHAT_MAX_MESSAGE_LENGTH + '"></textarea>' +
    (taqdimChatState.isAdmin
      ? '<div style="font-size:11px;color:var(--subtle);margin-top:4px;">' +
          escapeHtml(t('taqdim_translation_chat.admin_hint', 'Tip: [FILE:name.pdf] to note a file, [CREDS:user:pass] to share portal login, [LOCK_NOTE:reason] to lock, [UNLOCK] to unlock.')) +
        '</div>'
      : '') +
    '<button type="button" id="taqdimChatSendBtn" class="util-save-btn pill" style="margin-top:8px;width:100%;height:40px;font-size:13px;">' + escapeHtml(t('common.send', 'Send')) + '</button>';

  document.getElementById('taqdimChatSendBtn').addEventListener('click', taqdimChatSend);
  document.getElementById('taqdimChatInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); taqdimChatSend(); }
  });
}

function taqdimChatSend() {
  const input = document.getElementById('taqdimChatInput');
  if (!input) return;
  const text = input.value.trim();
  if (!text) { showToast(t('taqdim_translation_chat.empty_message', 'Please type a message.')); return; }
  if (taqdimChatState.isLocked && !taqdimChatState.isAdmin) { showToast(t('taqdim_translation_chat.conversation_is_locked', 'This conversation is locked.')); return; }

  const btn = document.getElementById('taqdimChatSendBtn');
  if (btn) btn.disabled = true;
  input.disabled = true;

  sendChatMessage(taqdimChatState.token, {
    threadId: taqdimChatState.threadId,
    userId: taqdimChatState.threadId ? undefined : taqdimChatState.otherUserId,
    message: text,
  }).then(result => {
    if (!taqdimChatState.threadId) taqdimChatState.threadId = result.thread_id;
    taqdimChatState.lastId = result.chat.id;
    taqdimChatState.messages.push(result.chat);
    const lockState = taqdimChatDeriveLockState(taqdimChatState.messages);
    taqdimChatState.isLocked = lockState.locked;
    taqdimChatState.lockedNote = lockState.note;
    input.value = '';
    taqdimChatRenderMessages();
    taqdimChatRenderLockBar();
    taqdimChatRenderInputArea();
  }).catch(err => {
    showToast(err && err.message ? err.message : t('taqdim_translation_chat.send_failed', 'Could not send message.'));
    if (btn) btn.disabled = false;
    if (input) input.disabled = false;
  });
}

function taqdimChatPoll() {
  if (!taqdimChatState.token || !taqdimChatState.threadId) return;
  fetchChatMessages(taqdimChatState.token, taqdimChatState.threadId, taqdimChatState.lastId).then(newOnes => {
    if (newOnes && newOnes.length) {
      taqdimChatState.lastId = newOnes[newOnes.length - 1].id;
      taqdimChatState.messages = taqdimChatState.messages.concat(newOnes);
      const lockState = taqdimChatDeriveLockState(taqdimChatState.messages);
      const lockChanged = lockState.locked !== taqdimChatState.isLocked;
      taqdimChatState.isLocked = lockState.locked;
      taqdimChatState.lockedNote = lockState.note;
      taqdimChatRenderMessages();
      taqdimChatRenderLockBar();
      if (lockChanged) taqdimChatRenderInputArea();
    }
  }).catch(() => { /* silent - tries again next tick, same as chat-box.js */ });
}

// opts.attachments: [{ title, url }] - the requirement documents the
// student already uploaded, pinned above the conversation so the
// assigned admin sees everything that was submitted without leaving the
// chat. Built from data each side already holds (the admin's
// adminApplicationShow payload carries document_url per checklist item;
// the student resolves their own vault), so it can't duplicate or drift
// the way an auto-posted "here are my files" message would.
// opts.waiting: true when nobody is assigned yet - there is no one to
// open a thread with, so the conversation area shows the waiting notice
// instead.
function renderChatInterface(otherUserName, opts) {
  opts = opts || {};
  const attachments = opts.attachments || [];

  const attachmentsHtml = attachments.length
    ? '<div class="taqdim-chat-attachments">' +
        '<div class="taqdim-chat-attachments-title">' + escapeHtml(t('taqdim_translation_chat.attachments_title', 'Submitted requirements')) + '</div>' +
        attachments.map(a =>
          '<div class="taqdim-chat-attachment-row">' +
            icon(a.url ? 'filetext' : 'clipboard', { size: 14, color: '#1E40AF' }) +
            '<span class="taqdim-chat-attachment-name">' + escapeHtml(a.title || '') + '</span>' +
            (a.url
              ? '<a href="' + escapeHtml(a.url) + '" target="_blank" rel="noopener" class="taqdim-chat-attachment-link">' + escapeHtml(t('taqdim_translation_chat.attachment_view', 'View')) + '</a>'
              : '<span class="taqdim-chat-attachment-kind">' + escapeHtml(t('taqdim_translation_chat.attachment_text_answer', 'Written answer')) + '</span>') +
          '</div>'
        ).join('') +
      '</div>'
    : '';

  return (
    '<div class="taqdim-chat-container">' +
      '<div class="taqdim-chat-header">' +
        '<span style="font-weight:700;color:var(--ink);">' + escapeHtml(t('taqdim_translation_chat.title', 'Support Chat')) + '</span>' +
        '<span style="font-size:12px;color:var(--subtle);">' + escapeHtml(otherUserName || t('taqdim_translation_chat.not_assigned_yet', 'No assistant assigned yet')) + '</span>' +
      '</div>' +
      '<div class="taqdim-chat-lock-status" id="taqdimChatLockBar" style="display:none;"></div>' +
      attachmentsHtml +
      '<div class="taqdim-chat-messages" id="taqdimChatMessages">' +
        (opts.waiting ? '' : '<div class="list-loading">' + escapeHtml(t('common.loading', 'Loading…')) + '</div>') +
      '</div>' +
      '<div class="taqdim-chat-input-area" id="taqdimChatInputArea"></div>' +
    '</div>'
  );
}

// Nobody assigned yet: message_thread_start needs a reciver_id, so there
// is literally no thread to open until an admin picks the request up.
// Show what the student is waiting on instead of an empty conversation.
function taqdimChatRenderWaiting() {
  const wrap = document.getElementById('taqdimChatMessages');
  if (wrap) {
    wrap.innerHTML =
      '<div class="taqdim-chat-waiting">' +
        icon('clock', { size: 24, color: 'var(--subtle)' }) +
        '<div class="taqdim-chat-waiting-title">' + escapeHtml(t('taqdim_translation_chat.waiting_title', 'Request sent')) + '</div>' +
        '<div class="taqdim-chat-waiting-note">' + escapeHtml(t('taqdim_translation_chat.waiting_note', 'Your documents have been sent to the team. An assistant will be assigned to you shortly — this can take some time. Once someone is assigned you can chat with them here.')) + '</div>' +
      '</div>';
  }
  const area = document.getElementById('taqdimChatInputArea');
  if (area) {
    area.innerHTML = '<div class="taqdim-chat-input-locked">' +
      escapeHtml(t('taqdim_translation_chat.waiting_input', 'You can send messages once an assistant is assigned.')) + '</div>';
  }
}

function initializeTaqdimChat(token, otherUserId, otherUserName, isAdmin) {
  taqdimChatState = {
    token,
    threadId: null,
    otherUserId,
    otherUserName,
    isAdmin,
    isLocked: false,
    lockedNote: null,
    messages: [],
    lastId: undefined,
    pollId: null,
  };

  if (!otherUserId) {
    taqdimChatRenderWaiting();
    return;
  }

  startMessageThread(token, otherUserId).then(threadId => {
    taqdimChatState.threadId = threadId;
    return fetchChatMessages(token, threadId);
  }).then(history => {
    taqdimChatState.messages = history || [];
    taqdimChatState.lastId = taqdimChatState.messages.length ? taqdimChatState.messages[taqdimChatState.messages.length - 1].id : undefined;
    const lockState = taqdimChatDeriveLockState(taqdimChatState.messages);
    taqdimChatState.isLocked = lockState.locked;
    taqdimChatState.lockedNote = lockState.note;
    taqdimChatRenderMessages();
    taqdimChatRenderLockBar();
    taqdimChatRenderInputArea();
    taqdimChatState.pollId = setInterval(taqdimChatPoll, TAQDIM_CHAT_POLL_MS);
  }).catch(err => {
    const wrap = document.getElementById('taqdimChatMessages');
    if (wrap) wrap.innerHTML = '<div class="list-error">' + escapeHtml((err && err.message) || t('taqdim_translation_chat.load_failed', 'Could not load chat.')) + '</div>';
  });
}

function closeTaqdimChat() {
  if (taqdimChatState.pollId) { clearInterval(taqdimChatState.pollId); }
  taqdimChatState = {
    threadId: null, otherUserId: null, otherUserName: null, isAdmin: false,
    isLocked: false, lockedNote: null, messages: [], lastId: undefined, pollId: null,
  };
}

window.TaqdimTranslationChat = {
  renderChatInterface,
  initializeTaqdimChat,
  closeTaqdimChat,
};
