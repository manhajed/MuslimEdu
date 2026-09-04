// Ported from SyncStatusScreen.tsx - "what's downloaded (cached offline)
// vs what's still waiting to upload". Reads window.MuslimEduOffline
// (offline-data.js's own IndexedDB mirror of every cached read + queued
// write), same as SyncStatusScreen.tsx reads scanCachedDatasets()/
// useOfflineQueue() - just backed by IndexedDB instead of AsyncStorage.
// Reachable from both admin and teacher dashboards, since both roles'
// data flows feed the same underlying cache/queue.
//
// Uploading and downloading are both manual-only from this screen -
// "Upload Now" pushes the queued-writes list, "Download Now" refreshes
// the already-cached datasets list. Nothing here auto-fires on
// reconnect; offline-data.js no longer flushes the queue by itself.

function formatWhen(ms) {
  const diffMin = Math.round((Date.now() - ms) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return diffMin + 'm ago';
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return diffHr + 'h ago';
  return new Date(ms).toLocaleDateString();
}

// The banner is connection status only now (Online/Offline) - both
// actions live as buttons on their own section below instead, so there's
// one obvious place for each rather than a button that jumps in and out
// of the status pill.
function renderBanner() {
  const online = navigator.onLine;
  const wrap = document.getElementById('syncBannerWrap');
  wrap.innerHTML =
    '<div class="sync-banner ' + (online ? 'online' : 'offline') + '">' +
      '<span class="sync-dot" style="background:' + (online ? 'var(--emerald)' : '#EF4444') + '"></span>' +
      '<span class="sync-banner-text" style="color:' + (online ? 'var(--emerald-deep)' : '#B91C1C') + '">' + (online ? 'Online' : 'Offline') + '</span>' +
    '</div>';
}

function handleUploadNow() {
  const btn = document.getElementById('syncNowBtn');
  const label = document.getElementById('syncNowLabel');
  if (!btn) return;
  btn.disabled = true;
  label.innerHTML = '<span class="util-spinner"></span>';
  window.MuslimEduOffline.flush().then(() => {
    renderBanner();
    load();
  }).catch(() => {
    btn.disabled = false;
    label.textContent = 'Upload Now';
  });
}

function handleDownloadNow() {
  const btn = document.getElementById('downloadNowBtn');
  const label = document.getElementById('downloadNowLabel');
  if (!btn) return;
  btn.disabled = true;
  label.innerHTML = '<span class="util-spinner dark"></span>';
  window.MuslimEduOffline.refreshAll().then(() => {
    load();
  }).catch(() => {
    btn.disabled = false;
    label.textContent = 'Download Now';
  });
}

function load() {
  const api = window.MuslimEduOffline;
  const wrap = document.getElementById('syncContent');
  if (!api) {
    wrap.innerHTML = '<div class="doc-empty-card">Offline support isn\u2019t available in this browser.</div>';
    return;
  }

  wrap.innerHTML = '<div class="list-loading">Checking what\u2019s stored on this device…</div>';

  Promise.all([api.listCachedDatasets(), api.listQueuedActions()]).then(([datasets, queued]) => {
    const totalBytes = datasets.reduce((sum, d) => sum + d.bytes, 0);

    let html = '<div class="sync-section-header">' +
        '<div class="util-section-title" style="margin:0;">Downloaded (available offline)</div>' +
        '<button type="button" class="sync-now-btn outline" id="downloadNowBtn"' + (!navigator.onLine || !datasets.length ? ' disabled' : '') + '>' +
          '<span id="downloadNowLabel">Download Now</span>' +
        '</button>' +
      '</div>' +
      '<div class="step-hint" style="margin-top:-6px;margin-bottom:10px;">Data saved on this device so key screens still work without a connection. It refreshes itself automatically while you’re online - tap Download Now if you want the latest data right this second.</div>';

    if (!datasets.length) {
      html += '<div class="doc-empty-card">Nothing cached yet - open a few screens while online to build up an offline cache.</div>';
    } else {
      html += datasets.map(d =>
        '<div class="sync-item-row">' +
          '<span class="sync-item-icon-wrap">' + icon('download', { size: 17, color: '#111827' }) + '</span>' +
          '<div style="flex:1;min-width:0;">' +
            '<div class="sync-item-title">' + escapeHtml(d.label) + '</div>' +
            '<div class="sync-item-meta">' + (d.count > 1 ? d.count + ' snapshots · ' + d.bytesLabel : d.bytesLabel) + '</div>' +
          '</div>' +
          icon('checkcircle', { size: 18, color: '#111827' }) +
        '</div>'
      ).join('') +
      '<div class="sync-total-text">Total cached: ' + formatBytesLocal(totalBytes) + '</div>';
    }

    html += '<div class="sync-section-header" style="margin-top:24px;">' +
        '<div class="util-section-title" style="margin:0;">Waiting to Upload</div>' +
        '<button type="button" class="sync-now-btn" id="syncNowBtn"' + (!navigator.onLine || !queued.length ? ' disabled' : '') + '>' +
          '<span id="syncNowLabel">Upload Now</span>' +
        '</button>' +
      '</div>' +
      '<div class="step-hint" style="margin-top:-6px;margin-bottom:10px;">Actions taken offline stay queued here until you tap Upload Now - nothing sends on its own.</div>';

    if (!queued.length) {
      html += '<div class="doc-empty-card">Everything is uploaded - nothing waiting.</div>';
    } else {
      html += queued.map(q =>
        '<div class="sync-item-row">' +
          '<span class="sync-item-icon-wrap">' + icon('upload', { size: 17, color: '#111827' }) + '</span>' +
          '<div style="flex:1;min-width:0;">' +
            '<div class="sync-item-title">' + escapeHtml(q.label) + '</div>' +
            '<div class="sync-item-meta">' + q.count + ' pending · oldest ' + formatWhen(q.oldestTs) + '</div>' +
          '</div>' +
        '</div>'
      ).join('');
    }

    wrap.innerHTML = html;
    document.getElementById('downloadNowBtn')?.addEventListener('click', handleDownloadNow);
    document.getElementById('syncNowBtn')?.addEventListener('click', handleUploadNow);
  });
}

// formatBytes lives inside offline-data.js's closure, not on the exposed
// MuslimEduOffline surface - datasets already arrive with bytesLabel
// precomputed per-row, this is only needed for the summed total.
function formatBytesLocal(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Default assumes the common case (reached from the admin dashboard);
// corrected to the teacher dashboard inside the guard callback if needed,
// same "render immediately, don't wait on the network round-trip" pattern
// every other page here uses.
document.getElementById('utilHeaderWrap').innerHTML = renderUtilHeader('Offline & Sync', null, 'admin-dashboard.php', null);

guardDashboard(['admin', 'teacher'], function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  document.getElementById('utilBody').style.display = '';
  document.getElementById('bottomNavWrap').innerHTML = renderBottomNav(user.role);
  if (user.role === 'teacher') {
    document.getElementById('utilHeaderWrap').innerHTML = renderUtilHeader('Offline & Sync', null, 'teacher-dashboard.php', null);
  }
  renderBanner();
  load();
  window.addEventListener('online', () => { renderBanner(); load(); });
  window.addEventListener('offline', () => { renderBanner(); load(); });
  window.addEventListener('muslimedu:queued', () => { renderBanner(); load(); });
  window.addEventListener('muslimedu:synced', () => { renderBanner(); load(); });
  // Downloading is automatic now (offline-data.js refreshes cached data by
  // itself on reconnect / periodically) - without this, landing on this
  // screen right as one of those background refreshes finishes would keep
  // showing the pre-refresh timestamps/counts until something else
  // happened to trigger a reload.
  window.addEventListener('muslimedu:downloaded', () => { renderBanner(); load(); });
});
