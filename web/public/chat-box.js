// Chat thread - web port of src/screens/chat/ChatBoxScreen.tsx. Same
// short-poll approach the RN screen uses instead of a socket ("start
// simple" - see that file's own comment) - swapping this for real-time
// later doesn't need to change anything else here.

const CHAT_POLL_MS = 2500;

function qsParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

let cbToken = null;
let cbThreadId = null;
let cbUserId = null;
let cbName = '';
let cbPhoto = null;
let cbMessages = [];
let cbLastId = undefined;
let cbPollId = null;
let cbSending = false;

function formatBubbleTime(iso) {
  const date = new Date(iso.replace(' ', 'T'));
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function renderMessages() {
  const wrap = document.getElementById('cbMessagesWrap');
  wrap.innerHTML = cbMessages.length
    ? cbMessages.map(m =>
        '<div class="bubble-row ' + (m.is_mine ? 'mine' : 'theirs') + '">' +
          '<div class="bubble">' + escapeHtml(m.message) + '</div>' +
          '<div class="bubble-time">' + escapeHtml(formatBubbleTime(m.created_at)) + '</div>' +
        '</div>'
      ).join('')
    : '<div class="list-empty"><div class="list-empty-sub">' + escapeHtml(t('chat_box.empty', 'Say hello to start the conversation 👋')) + '</div></div>';
  wrap.scrollTop = wrap.scrollHeight;
}

function poll() {
  if (!cbToken || !cbThreadId) return;
  fetchChatMessages(cbToken, cbThreadId, cbLastId).then(newOnes => {
    if (newOnes.length) {
      cbLastId = newOnes[newOnes.length - 1].id;
      cbMessages = cbMessages.concat(newOnes);
      renderMessages();
    }
  }).catch(() => { /* silent - tries again next tick */ });
}

function loadHistory() {
  if (!cbToken || !cbThreadId) {
    renderMessages();
    return;
  }
  fetchChatMessages(cbToken, cbThreadId).then(history => {
    cbMessages = history;
    cbLastId = history.length ? history[history.length - 1].id : undefined;
    renderMessages();
  });
}

function updateSendBtnState() {
  const input = document.getElementById('cbInput');
  const btn = document.getElementById('cbSendBtn');
  btn.disabled = !input.value.trim() || cbSending;
}

function onSend() {
  const input = document.getElementById('cbInput');
  const text = input.value.trim();
  if (!text || !cbToken || cbSending) return;
  cbSending = true;
  input.value = '';
  updateSendBtnState();

  const tempId = -Date.now();
  cbMessages.push({ id: tempId, message: text, is_mine: true, created_at: new Date().toISOString() });
  renderMessages();

  sendChatMessage(cbToken, { threadId: cbThreadId, userId: cbThreadId ? undefined : cbUserId, message: text }).then(result => {
    if (!cbThreadId) cbThreadId = result.thread_id;
    cbLastId = result.chat.id;
    cbMessages = cbMessages.map(m => (m.id === tempId ? result.chat : m));
    renderMessages();
  }).catch(() => {
    cbMessages = cbMessages.map(m => (m.id === tempId ? Object.assign({}, m, { message: text + ' ' + t('chat_box.failed_to_send', '(failed to send)') }) : m));
    renderMessages();
  }).finally(() => {
    cbSending = false;
    updateSendBtnState();
  });
}

function renderHeader() {
  const center = document.getElementById('cbHeaderCenter');
  center.innerHTML =
    postAvatarHtml(cbPhoto, cbName, 32) +
    '<span class="chatbox-header-name">' + escapeHtml(cbName) + '</span>';
  center.onclick = () => { window.location.href = 'newsfeed.php?viewProfile=' + encodeURIComponent(cbUserId); };
  document.getElementById('cbInput').placeholder = t('chat_box.placeholder', 'Type a message');
  document.getElementById('cbSendBtn').textContent = t('chat_box.send', 'Send');
}
onLocaleChange(() => { renderHeader(); if (cbMessages) renderMessages(); });

guardDashboard(null, function (user, token) {
  cbToken = token;
  cbThreadId = qsParam('threadId') ? parseInt(qsParam('threadId'), 10) : undefined;
  cbUserId = parseInt(qsParam('userId'), 10);
  cbName = qsParam('name') || '';
  cbPhoto = qsParam('photo') || null;

  document.getElementById('cbRoot').style.display = '';
  document.getElementById('routeGuardSplash')?.remove();
  renderHeader();
  loadHistory();

  const input = document.getElementById('cbInput');
  input.addEventListener('input', updateSendBtnState);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }
  });
  document.getElementById('cbSendBtn').addEventListener('click', onSend);

  cbPollId = setInterval(poll, CHAT_POLL_MS);
  window.addEventListener('beforeunload', () => { if (cbPollId) clearInterval(cbPollId); });
});
