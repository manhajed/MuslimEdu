// ── Connect Messenger card ──────────────────────────────────────────
// Shown only when the school has actually set up its own Facebook Page
// integration (MessengerIntegrationController::connectionStatus's
// `available` flag) - nothing to connect to otherwise, so the whole card
// is just absent rather than showing a dead button. See
// MessengerIntegrationController.php and MessengerWebhookController.php
// for the account-linking and notification-forwarding this connects to.
let messengerPollTimer = null;

function renderMessengerConnectCard(token, status, connectUrl) {
  const wrap = document.getElementById('messengerConnectWrap');
  if (!status || !status.available) {
    wrap.innerHTML = '';
    return;
  }

  const connected = !!status.connected;
  // Names the linked Facebook account, so "Connected" says WHICH one is
  // receiving notifications - a household can have several, and there is
  // otherwise no way to tell from inside the app. Falls back to a generic
  // label when the name couldn't be fetched (see fetchProfileName).
  const account = status.messenger_name || t('notifications.messenger_account_fallback', 'Messenger account');

  // A REAL <a href> when connecting, not a scripted window.open().
  // window.open() from inside the /messenger_connect_link promise callback
  // is outside the user-gesture window, so mobile browsers block it as a
  // popup - silently. The tap appeared to do nothing, people reached the
  // conversation some other way (Messenger's chat-head bubble, say), and
  // that route carries no ref, so nothing ever linked. A native link click
  // is never popup-blocked and hands off to the Messenger app properly.
  // The connected state stays a <button>: it opens the disconnect
  // confirmation and must not navigate anywhere.
  const asLink = !connected && !!connectUrl;
  const openTag = asLink
    ? '<a class="messenger-connect-card" id="messengerConnectBtn" href="' + escapeHtml(connectUrl) + '" target="_blank" rel="noopener">'
    : '<button type="button" class="messenger-connect-card' + (connected ? ' connected' : '') + '" id="messengerConnectBtn">';

  wrap.innerHTML =
    openTag +
      '<span class="messenger-connect-icon">' + icon('message', { size: 22, color: '#0084FF', filled: true, gradient: ['#00B2FF', '#8B5CF6'] }) + '</span>' +
      '<span class="messenger-connect-label">' +
        escapeHtml(t('notifications.messenger_connect_label', 'Get notifications on Messenger')) +
        (connected ? '<span class="messenger-connect-sub">' + escapeHtml(account) + '</span>' : '') +
      '</span>' +
      '<span class="messenger-connect-action">' +
        (connected
          ? icon('checkcircle', { size: 18, color: '#1FAE64' }) + escapeHtml(t('notifications.messenger_connected', 'Connected'))
          : escapeHtml(t('notifications.messenger_connect_cta', 'Connect'))) +
      '</span>' +
    (asLink ? '</a>' : '</button>');

  document.getElementById('messengerConnectBtn').addEventListener('click', () => {
    if (connected) {
      confirmMessengerDisconnect(token, account);
    } else if (asLink) {
      // The browser handles the navigation itself; this only starts the
      // poll that flips the row to "Connected" when they come back.
      pollMessengerConnection(token);
    } else {
      // No pre-fetched url (the request failed) - fall back to fetching on
      // demand. Still subject to popup blocking, but better than a dead
      // button.
      handleMessengerConnect(token);
    }
  });
}

// Tapping a connected row used to disconnect instantly, which made an
// accidental tap silently stop someone's notifications with no warning and
// no obvious way back. Confirm first, naming the account being unlinked.
// Dismissing the sheet (backdrop tap) is the cancel path.
function confirmMessengerDisconnect(token, account) {
  openActionSheet(t('notifications.messenger_disconnect_title', 'Disconnect Messenger?'), [
    {
      icon: 'message',
      label: t('notifications.messenger_disconnect_confirm', 'Disconnect') + ' ' + account,
      desc: t('notifications.messenger_disconnect_desc', "You'll stop getting your notifications in Messenger. You can reconnect any time."),
      onPress: () => handleMessengerDisconnect(token),
    },
  ]);
}

function loadMessengerConnectCard(token) {
  authedPost('/messenger_connection_status', token).then(status => {
    if (!status || !status.available || status.connected) {
      renderMessengerConnectCard(token, status);
      return;
    }
    // Fetch the m.me link NOW, while rendering, so the Connect control can
    // be a real <a href> rather than a scripted popup on tap - see the
    // comment in renderMessengerConnectCard. One token per page load is
    // correct: it's single-use and expires in 24h server-side.
    authedPost('/messenger_connect_link', token)
      .then(res => renderMessengerConnectCard(token, status, res && res.url))
      .catch(() => renderMessengerConnectCard(token, status));
  }).catch(() => {
    // Silent - this card is a bonus feature, not core to the notification
    // list itself, so a failure here shouldn't show an error card above
    // it. It just won't appear this load; the next visit tries again.
  });
}

// The link happens on Facebook's side, in another tab/app entirely - there
// is no event to listen for, so poll a few times in case they come back to
// this tab. If they don't, their next visit picks up the state anyway.
function pollMessengerConnection(token) {
  clearInterval(messengerPollTimer);
  let attempts = 0;
  messengerPollTimer = setInterval(() => {
    attempts++;
    authedPost('/messenger_connection_status', token).then(status => {
      if (status && status.connected) {
        clearInterval(messengerPollTimer);
        renderMessengerConnectCard(token, status);
        showToast(t('notifications.messenger_connected_toast', 'Messenger connected.'));
      } else if (attempts >= 10) {
        clearInterval(messengerPollTimer);
      }
    }).catch(() => {});
  }, 4000);
}

// Fallback path only - used when the URL couldn't be pre-fetched at render
// time. window.open() here sits inside a promise callback, so a mobile
// browser may block it as a popup; that is exactly the bug the <a href>
// route avoids, and why this is no longer the primary path.
function handleMessengerConnect(token) {
  authedPost('/messenger_connect_link', token).then(res => {
    if (!res || !res.url) return;
    const opened = window.open(res.url, '_blank', 'noopener');
    if (!opened) {
      // Popup blocked - navigating the current tab still works, and is
      // better than appearing to do nothing at all.
      window.location.href = res.url;
      return;
    }
    pollMessengerConnection(token);
  }).catch(err => {
    showToast((err && err.message) || t('notifications.messenger_connect_failed', 'Could not start Messenger connection.'));
  });
}

function handleMessengerDisconnect(token) {
  authedPost('/messenger_disconnect', token).then(() => {
    loadMessengerConnectCard(token);
    showToast(t('notifications.messenger_disconnected_toast', 'Messenger disconnected.'));
  }).catch(err => {
    showToast((err && err.message) || t('notifications.messenger_disconnect_failed', 'Could not disconnect.'));
  });
}

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return t('notifications.time_now', 'now');
  if (mins < 60) return mins + 'm';
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + 'h';
  return Math.floor(hours / 24) + 'd';
}

// Icon + color per row, picked from the most specific signal available:
// subject_type first (tells apart the three things category 'message'
// covers - a post like, a comment, and a chat message all look
// different, same as Facebook's heart/bubble/messenger badges), category
// otherwise. Matches NotificationController::CATEGORIES on the backend.
function notifIconMeta(item) {
  const st = item.subject_type;
  if (st === 'post') return { icon: 'heart', color: '#EF4444' };
  if (st === 'post_comment') return { icon: 'message', color: '#3B82F6' };
  if (st === 'chat') return { icon: 'message', color: '#1FAE64' };

  const byCategory = {
    grade: { icon: 'checkcircle', color: '#8B5CF6' },
    examination: { icon: 'gradcap', color: '#8B5CF6' },
    assessment: { icon: 'clipboard', color: '#8B5CF6' },
    attendance: { icon: 'calendar', color: '#EF4444' },
    announcement: { icon: 'megaphone', color: '#3B82F6' },
    document: { icon: 'document', color: '#D97706' },
    service_request: { icon: 'message', color: '#D97706' },
    lesson_plan: { icon: 'book', color: '#0F7A3D' },
    material: { icon: 'book', color: '#0F7A3D' },
    enrollment: { icon: 'idcard', color: '#1FAE64' },
    orphan_report: { icon: 'idcard', color: '#EF4444' },
    system: { icon: 'calendar', color: '#1FAE64' },
    message: { icon: 'message', color: '#1FAE64' },
    // Matches the tint scholarship-browse.php's dashboard tile and
    // scholarship-programs.js's card icon already use, so a scholarship
    // notification is visually recognizable before you even read it.
    scholarships: { icon: 'gradcap', color: '#D97706' },
  };
  return byCategory[item.category] || { icon: 'bell', color: '#1FAE64' };
}

// Where tapping a card should go - only for route_names that actually
// have a page on the web dashboard today. A route_name with no entry
// here (assessments/lesson plans/materials/orphan reports don't have web
// pages yet) just marks the notification read on tap, same as before -
// nothing crashes or dead-ends, it just doesn't navigate anywhere.
const NOTIF_ROUTE_TO_PAGE = {
  PostComments: () => 'newsfeed.php',
  ChatBox: (p) => {
    if (!p || !p.userId) return 'messages.php';
    const qs = new URLSearchParams();
    if (p.threadId) qs.set('threadId', p.threadId);
    qs.set('userId', p.userId);
    qs.set('name', p.name || '');
    return 'chat-box.php?' + qs.toString();
  },
  TeacherMySchedule: () => 'student-schedule.php',
  StudentSchedule: () => 'student-schedule.php',
  EnrollmentStatus: () => 'enrollment-status.php',
  StudentServices: () => 'student-services.php',
  StudentDocuments: () => 'student-documents.php',
  AdminAlumniApplications: () => 'alumni-applications.php',
  AdminPreregistrationQueue: () => 'preregistrations.php',
  // Web has no per-invoice deep link (cashier-fees.php's payment sheet only
  // opens from a clicked row, not a query param) - lands on the invoice
  // list itself, still far better than nothing. SuperAdminPendingRegistrations
  // has no web page at all yet (RN-only screen) - deliberately left
  // unmapped, same mark-as-read-only fallback as every other RN-only route.
  RecordFeePayment: () => 'cashier-fees.php',
  // Scholarship & Taqdim Assistant - the four route_names
  // ScholarshipNotificationService actually sends (see that file):
  // applicationStatusChanged and translationCompleted both target the
  // student and share ScholarshipApplicationDetail; deadlineReminder
  // targets the student too, at the program rather than the
  // application, since it may fire before they've started one.
  // translationAssigned targets staff, landing on the translation queue
  // - deep-linking to the specific request (not just the queue) is
  // handled by scholarship-translations.js itself reading ?request_id=
  // from the URL on load, same query-string pattern used throughout the
  // scholarship pages (see qsParam() in scholarship-detail.js etc).
  ScholarshipApplicationDetail: (p) => 'scholarship-application.php?application_id=' + (p && p.application_id),
  ScholarshipProgramDetail: (p) => 'scholarship-detail.php?program_id=' + (p && p.program_id),
  ScholarshipTranslationRequestDetail: (p) => 'scholarship-translations.php' + (p && p.request_id ? '?request_id=' + p.request_id : ''),
  // documentReviewed has no per-document deep link on web (same
  // reasoning as RecordFeePayment above) - lands on the student's vault.
  ScholarshipDocumentVault: () => 'scholarship-documents.php',
};
function notifTargetUrl(item) {
  const fn = NOTIF_ROUTE_TO_PAGE[item.route_name];
  return fn ? fn(item.route_params || {}) : null;
}

function renderNotifRow(item, token) {
  const row = document.createElement('button');
  row.type = 'button';
  row.className = 'notif-row' + (item.is_read ? '' : ' unread');
  const meta = notifIconMeta(item);
  row.innerHTML =
    '<span class="notif-icon" style="background:' + meta.color + '1f;">' + icon(meta.icon, { size: 18, color: meta.color }) + '</span>' +
    '<span class="notif-text">' +
      '<span class="notif-title">' + escapeHtml(item.title || t('notifications.default_title', 'Notification')) + '</span>' +
      (item.body ? '<div class="notif-body">' + escapeHtml(item.body) + '</div>' : '') +
    '</span>' +
    '<span class="notif-right">' +
      '<span class="notif-time">' + timeAgo(item.created_at) + '</span>' +
      (!item.is_read ? '<span class="notif-unread-dot"></span>' : '') +
    '</span>';
  row.addEventListener('click', () => {
    const url = notifTargetUrl(item);
    if (!item.is_read) {
      markNotificationRead(token, item.id).then(() => refreshNotifBadge(token)).catch(() => {});
    }
    if (url) window.location.href = url;
    else {
      item.is_read = true;
      row.classList.remove('unread');
      row.querySelector('.notif-unread-dot')?.remove();
    }
  });
  return row;
}

let lastNotifToken = null;
function load(token) {
  lastNotifToken = token;
  const list = document.getElementById('notifList');
  list.innerHTML = '<div class="notif-loading">' + escapeHtml(t('common.loading', 'Loading…')) + '</div>';
  fetchNotifications(token).then((data) => {
    const items = data.notifications || [];
    list.innerHTML = '';
    if (items.length === 0) {
      list.innerHTML =
        '<div class="notif-empty">' +
          '<div class="notif-empty-title">' + escapeHtml(t('notifications.empty_title', 'No notifications yet')) + '</div>' +
          '<div class="notif-empty-sub">' + escapeHtml(t('notifications.empty_sub', 'New posts, comments, and updates will show up here.')) + '</div>' +
        '</div>';
      document.getElementById('markAllBtn').style.display = 'none';
      return;
    }

    // "New" (unread) / "Earlier" (read) sections, same grouping as most
    // social apps' notification screens - unread items get their own
    // header so they don't blend into the scroll of everything else.
    const unread = items.filter(i => !i.is_read);
    const read = items.filter(i => i.is_read);

    if (unread.length) {
      const h = document.createElement('div');
      h.className = 'notif-section-title';
      h.textContent = t('notifications.section_new', 'New');
      list.appendChild(h);
      unread.forEach(item => list.appendChild(renderNotifRow(item, token)));
    }
    if (read.length) {
      const h = document.createElement('div');
      h.className = 'notif-section-title';
      h.textContent = t('notifications.section_earlier', 'Earlier');
      list.appendChild(h);
      read.forEach(item => list.appendChild(renderNotifRow(item, token)));
    }

    const markAllBtn = document.getElementById('utilHeaderActionBtn');
    if (markAllBtn) markAllBtn.style.display = (data.unread_count || 0) > 0 ? '' : 'none';
  }).catch(() => {
    list.innerHTML = '<div class="notif-loading">' + escapeHtml(t('notifications.load_error', 'Could not load notifications.')) + '</div>';
  });
}
onLocaleChange(() => { if (lastNotifToken) load(lastNotifToken); });

function markAllRead() {
  const token = getStoredToken();
  if (!token) return;
  markAllNotificationsRead(token).then(() => { load(token); refreshNotifBadge(token); }).catch(() => {
    showToast(t('notifications.mark_all_failed', 'Could not mark all as read.'));
  });
}

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(t('notifications.title', 'Notifications'), null, null, { label: t('notifications.mark_all_read', 'Mark all read'), onClick: markAllRead });
  // Hidden until load() confirms there's actually something unread to mark.
  requestAnimationFrame(() => {
    const btn = document.getElementById('utilHeaderActionBtn');
    if (btn) btn.style.display = 'none';
  });
}
renderHeaderText();
onLocaleChange(renderHeaderText);

guardDashboard(null, function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  document.getElementById('utilBody').style.display = '';
  document.getElementById('bottomNavWrap').innerHTML = renderBottomNav(user.role, 'Alerts');
  load(token);
  loadMessengerConnectCard(token);
});
