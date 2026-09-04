// Offline data layer. Loaded first on every page, before dashboard.js, so
// window.fetch is already wrapped by the time any page code calls it.
//
// Why this exists: every API call in this app is a POST, and the Cache API
// cannot key on POST requests — the service worker physically cannot cache
// them. So reads are mirrored into IndexedDB here, in page context, and
// replayed when the network is gone. That is also what lets guardDashboard()
// survive offline: its POST /me resolves from this cache instead of failing,
// so the route guard renders the page rather than showing its error screen.
(function (global) {
  'use strict';

  var API_BASE = 'https://manhaje.com/apps/api';
  var DB_NAME = 'muslimedu-offline';
  var DB_VERSION = 1;
  var STORE_API = 'api';      // cached read responses
  var STORE_QUEUE = 'queue';  // writes made while offline

  // Endpoints that must never be served from cache or queued — the user has
  // to get a truthful answer from the server for these.
  var NEVER = ['/login', '/logout', '/school_registration_submit', '/alumni_registration_submit', '/public_student_preregistration_submit'];

  // Reads are cacheable; anything else mutates server state.
  var READ_RE = /(_list|_show|_detail|_profile|_overview|_dashboard|_roster|_summary|_report|_catalog|_preview|_status|_trend|_statuses|_classes|_reference_data|_locks_list|_buildings|_rooms)$/;
  var READ_EXACT = ['/me', '/attendance', '/marks', '/my_schedules', '/my_school_branding', '/public_school_list'];

  function isRead(path) {
    return READ_EXACT.indexOf(path) !== -1 || READ_RE.test(path);
  }
  function isNever(path) {
    return NEVER.indexOf(path) !== -1;
  }

  // ---- IndexedDB helpers ---------------------------------------------
  var dbPromise = null;
  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!global.indexedDB) { reject(new Error('no indexedDB')); return; }
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE_API)) db.createObjectStore(STORE_API);
        if (!db.objectStoreNames.contains(STORE_QUEUE)) {
          db.createObjectStore(STORE_QUEUE, { keyPath: 'id', autoIncrement: true });
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbPromise;
  }

  function tx(store, mode, fn) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(store, mode);
        var req = fn(t.objectStore(store));
        t.oncomplete = function () { resolve(req && req.result); };
        t.onerror = function () { reject(t.error); };
        t.onabort = function () { reject(t.error); };
      });
    });
  }

  var idbGet = function (store, key) { return tx(store, 'readonly', function (s) { return s.get(key); }); };
  var idbPut = function (store, val, key) { return tx(store, 'readwrite', function (s) { return s.put(val, key); }); };
  var idbAll = function (store) { return tx(store, 'readonly', function (s) { return s.getAll(); }); };
  var idbDel = function (store, key) { return tx(store, 'readwrite', function (s) { return s.delete(key); }); };

  // Cache key: endpoint plus request body, so per-student/per-class reads
  // don't collide with each other.
  function cacheKey(path, body) {
    var b = typeof body === 'string' ? body : '';
    return path + '|' + b;
  }

  function jsonResponse(text, extraHeaders) {
    var headers = { 'Content-Type': 'application/json' };
    for (var k in extraHeaders) headers[k] = extraHeaders[k];
    return new Response(text, { status: 200, statusText: 'OK', headers: headers });
  }

  // ---- Listeners for UI (pwa.js subscribes to these) -------------------
  var listeners = [];
  function emit(type, detail) {
    listeners.forEach(function (fn) { try { fn(type, detail); } catch (e) {} });
    try {
      global.dispatchEvent(new CustomEvent('muslimedu:' + type, { detail: detail }));
    } catch (e) {}
  }

  // ---- The fetch wrapper ----------------------------------------------
  var nativeFetch = global.fetch ? global.fetch.bind(global) : null;
  if (!nativeFetch) return;

  function apiPath(url) {
    if (typeof url !== 'string' || url.indexOf(API_BASE) !== 0) return null;
    return url.slice(API_BASE.length).split('?')[0];
  }

  global.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url);
    var path = apiPath(url);

    // Not our API (fonts, images, anything else) — pass straight through.
    if (!path || isNever(path)) return nativeFetch(input, init);

    init = init || {};
    var body = init.body;
    var read = isRead(path);
    var key = cacheKey(path, typeof body === 'string' ? body : null);

    return nativeFetch(input, init).then(function (res) {
      // Mirror successful reads into IndexedDB for later offline replay.
      // reqBody is kept alongside so a manual "Download Now" refresh
      // (sync-status.js) can replay this exact same request later.
      if (read && res.ok) {
        res.clone().text().then(function (text) {
          idbPut(STORE_API, { path: path, body: text, reqBody: typeof body === 'string' ? body : null, ts: Date.now() }, key).catch(function () {});
        }).catch(function () {});
      }
      return res;
    }, function (networkError) {
      // The request never reached the server (offline, DNS, timeout).
      if (read) {
        return idbGet(STORE_API, key).then(function (hit) {
          if (hit && typeof hit.body === 'string') {
            emit('served-from-cache', { path: path, ts: hit.ts });
            return jsonResponse(hit.body, {
              'X-MuslimEdu-Offline': 'cache',
              'X-MuslimEdu-Cached-At': String(hit.ts)
            });
          }
          throw networkError;   // never fetched online — nothing to show
        }, function () { throw networkError; });
      }

      // A write. FormData (file uploads) can't be replayed reliably, so
      // those fail honestly rather than pretending to have been saved.
      var canQueue = typeof body === 'string' || body == null;
      if (!canQueue) throw networkError;

      var entry = {
        path: path, method: init.method || 'POST',
        headers: serializeHeaders(init.headers), body: body == null ? null : String(body),
        ts: Date.now()
      };
      return idbPut(STORE_QUEUE, entry).then(function () {
        return pendingCount();
      }).then(function (n) {
        emit('queued', { path: path, pending: n });
        return jsonResponse(JSON.stringify({
          queued: true, offline: true, pending: n,
          message: 'Saved on this device — go to Offline & Sync and tap Upload Now once you’re back online.'
        }), { 'X-MuslimEdu-Offline': 'queued' });
      }, function () { throw networkError; });
    });
  };

  function serializeHeaders(h) {
    if (!h) return {};
    if (typeof Headers !== 'undefined' && h instanceof Headers) {
      var o = {};
      h.forEach(function (v, k) { o[k] = v; });
      return o;
    }
    return Object.assign({}, h);
  }

  // ---- Replaying queued writes ----------------------------------------
  function pendingCount() {
    return idbAll(STORE_QUEUE).then(function (all) { return (all || []).length; }, function () { return 0; });
  }

  var flushing = false;
  function flush() {
    if (flushing || !global.navigator.onLine) return Promise.resolve({ synced: 0, failed: [] });
    flushing = true;
    return idbAll(STORE_QUEUE).then(function (all) {
      all = all || [];
      var synced = 0, failed = [];
      // Sequential, in the order the user made them — later edits may
      // depend on earlier ones.
      return all.reduce(function (chain, entry) {
        return chain.then(function () {
          return nativeFetch(API_BASE + entry.path, {
            method: entry.method, headers: entry.headers, body: entry.body
          }).then(function (res) {
            if (res.ok) { synced++; return idbDel(STORE_QUEUE, entry.id); }
            // Server rejected it (validation, expired token). Drop it and
            // tell the user — silently retrying forever would be worse.
            failed.push({ path: entry.path, status: res.status });
            return idbDel(STORE_QUEUE, entry.id);
          }, function () { /* still offline — keep it queued */ });
        });
      }, Promise.resolve()).then(function () {
        flushing = false;
        if (synced || failed.length) emit('synced', { synced: synced, failed: failed });
        return { synced: synced, failed: failed };
      });
    }, function () { flushing = false; return { synced: 0, failed: [] }; });
  }

  // Count of distinct cached read responses - the web analog of the RN
  // app's scanCachedDatasets(token).length (SyncStatusCard.tsx). Each
  // STORE_API entry is one (endpoint + request body) pair already mirrored
  // by a successful read above, so this is "how much is available for
  // offline use right now" without re-deriving that list a second way.
  function cachedCount() {
    return idbAll(STORE_API).then(function (rows) { return (rows || []).length; });
  }

  // Human labels for sync-status.js (SyncStatusScreen.tsx's port) - covers
  // the endpoints most likely to actually get cached/queued in normal use;
  // prettifyPath() below is the fallback for anything not listed, so this
  // never needs to be exhaustive.
  var READ_LABELS = {
    '/me': 'Your Profile',
    '/attendance': 'Attendance',
    '/marks': 'Grades',
    '/my_schedules': 'My Schedule',
    '/my_school_branding': 'School Branding',
    '/notifications': 'Notifications',
    '/admin_children_list': 'Students',
    '/admin_teacher_list': 'Teachers',
    '/admin_accountant_list': 'Cashiers',
    '/admin_registrar_list': 'Registrars',
    '/admin_academic_analytics_dashboard': 'Academic Analytics',
    '/admin_academic_analytics_attendance_trend': 'Attendance Trend',
    '/admin_school_setup_status': 'School Setup',
    '/admin_subscription_status': 'Subscription Status',
    '/admin_subscription_packages': 'Subscription Packages',
    '/admin_attendance_dashboard': 'Attendance Dashboard',
    '/admin_student_document_list': 'Document Requests',
    '/teacher_attendance_classes': 'My Classes',
    '/teacher_attendance_roster': 'Class Roster',
    '/student_progress_summary': 'My Progress',
    '/student_quarterly_report': 'Quarterly Report',
    '/student_document_list': 'My Documents',
    '/student_document_upload_list': 'Uploaded Documents',
    '/student_service_catalog': 'Services'
  };
  var WRITE_LABELS = {
    '/attendance': 'Attendance Submission',
    '/teacher_attendance_submit': 'Attendance Submission',
    '/teacher_attendance_scan': 'QR Attendance Scan',
    '/marks': 'Examination Grades',
    '/admin_student_document_issue': 'Document Issued',
    '/admin_student_document_reject': 'Document Rejected',
    '/admin_orphan_report_overview': 'Orphan Report',
    '/student_document_request': 'Document Request',
    '/student_document_upload_store': 'Document Upload'
  };
  function prettifyPath(path, labels) {
    if (labels[path]) return labels[path];
    var s = path.replace(/^\//, '').replace(/_/g, ' ');
    return s.replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }
  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
  function byteLength(str) {
    try { return new Blob([str]).size; } catch (e) { return (str || '').length; }
  }

  // Grouped by endpoint (not by individual cache key) - a class roster
  // cached for 5 different sections is one dataset row with count:5, same
  // grouping SyncStatusScreen.tsx does for its own duplicate snapshots.
  function listCachedDatasets() {
    return idbAll(STORE_API).then(function (rows) {
      var groups = {};
      (rows || []).forEach(function (r) {
        var path = r && r.path;
        if (!path) return; // pre-upgrade entries with no stored path - skip rather than mislabel
        var g = groups[path] || (groups[path] = { path: path, count: 0, bytes: 0, newestTs: 0 });
        g.count += 1;
        g.bytes += byteLength(r.body || '');
        if (r.ts > g.newestTs) g.newestTs = r.ts;
      });
      return Object.keys(groups).map(function (path) {
        var g = groups[path];
        return { key: path, label: prettifyPath(path, READ_LABELS), count: g.count, bytes: g.bytes, bytesLabel: formatBytes(g.bytes), ts: g.newestTs };
      }).sort(function (a, b) { return b.ts - a.ts; });
    }, function () { return []; });
  }

  // Grouped by endpoint, oldest-first within each group - mirrors
  // SyncStatusScreen.tsx's pendingByKind grouping (there, by QueuedActionKind;
  // here, by endpoint, since this queue never tagged writes with a kind).
  function listQueuedActions() {
    return idbAll(STORE_QUEUE).then(function (rows) {
      var groups = {};
      (rows || []).forEach(function (r) {
        var path = r && r.path;
        if (!path) return;
        var g = groups[path] || (groups[path] = { path: path, count: 0, oldestTs: Infinity });
        g.count += 1;
        if (r.ts < g.oldestTs) g.oldestTs = r.ts;
      });
      return Object.keys(groups).map(function (path) {
        var g = groups[path];
        return { key: path, label: prettifyPath(path, WRITE_LABELS), count: g.count, oldestTs: g.oldestTs };
      }).sort(function (a, b) { return a.oldestTs - b.oldestTs; });
    }, function () { return []; });
  }

  // Uploading queued writes is manual-only (Offline & Sync's "Upload Now")
  // - no auto-flush on reconnect or on load. Downloaded reads still cache
  // themselves passively as the user browses (that's what lets a page
  // that was never visited offline-first still load without a network),
  // but pushing the write queue back to the server is always a deliberate
  // action from that screen now, never something that happens silently in
  // the background the moment a connection reappears.

  // ---- Manual "Download Now" - re-fetch what's already cached ----------
  // Replays the exact original request (path + reqBody) for every row of
  // a cached dataset, refreshing its stored snapshot in place. Only
  // touches rows cached after reqBody started being recorded above; older
  // pre-upgrade rows (reqBody undefined) are left as-is rather than
  // guessed at.
  function refreshDataset(path) {
    if (!global.navigator.onLine) return Promise.resolve({ ok: 0, failed: 0 });
    return idbAll(STORE_API).then(function (rows) {
      var targets = (rows || []).filter(function (r) { return r && r.path === path && r.reqBody !== undefined; });
      var ok = 0, failed = 0;
      return targets.reduce(function (chain, row) {
        return chain.then(function () {
          var key = cacheKey(path, row.reqBody);
          return nativeFetch(API_BASE + path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: row.reqBody
          }).then(function (res) {
            if (!res.ok) { failed++; return; }
            return res.text().then(function (text) {
              return idbPut(STORE_API, { path: path, body: text, reqBody: row.reqBody, ts: Date.now() }, key).then(function () { ok++; });
            });
          }, function () { failed++; });
        });
      }, Promise.resolve()).then(function () { return { ok: ok, failed: failed }; });
    }, function () { return { ok: 0, failed: 0 }; });
  }
  function refreshAll() {
    if (!global.navigator.onLine) return Promise.resolve({ ok: 0, failed: 0 });
    return listCachedDatasets().then(function (datasets) {
      var ok = 0, failed = 0;
      return datasets.reduce(function (chain, d) {
        return chain.then(function () {
          return refreshDataset(d.key).then(function (r) { ok += r.ok; failed += r.failed; });
        });
      }, Promise.resolve()).then(function () {
        if (ok || failed) emit('downloaded', { ok: ok, failed: failed });
        return { ok: ok, failed: failed };
      });
    });
  }

  // ---- Automatic background download (upload stays manual) -------------
  // Refreshing what's already cached used to be entirely manual (Offline &
  // Sync's "Download Now"). Uploading queued writes stays that way on
  // purpose - it's this device's pending changes, and pushing them without
  // an explicit tap risks surprising someone. But there's no equivalent
  // reason to make *downloading* wait for a tap: refreshing already-cached
  // reads can't lose anything or surprise anyone, so it now happens by
  // itself at the two moments it's actually useful -
  //   1. the instant the device comes back online (the "resync" moment),
  //      always, since any stretch of being offline is reason enough, and
  //   2. once per app load while already online, throttled below so
  //      routine page-to-page navigation doesn't refetch every cached
  //      dataset on every click.
  // "Download Now" on the Sync screen still exists for a deliberate
  // refresh-right-now outside either of those, and now actually works
  // (see dashboard.css's .util-spinner fix) instead of looking stuck.
  var LAST_AUTO_REFRESH_KEY = 'muslimedu_last_auto_download';
  var AUTO_REFRESH_MIN_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
  function autoRefreshAll(force) {
    if (!global.navigator.onLine) return;
    if (!force) {
      var last = 0;
      try { last = parseInt(localStorage.getItem(LAST_AUTO_REFRESH_KEY) || '0', 10) || 0; } catch (e) { /* private browsing etc. */ }
      if (Date.now() - last < AUTO_REFRESH_MIN_INTERVAL_MS) return;
    }
    try { localStorage.setItem(LAST_AUTO_REFRESH_KEY, String(Date.now())); } catch (e) { /* best-effort throttle only */ }
    refreshAll();
  }
  global.addEventListener('online', function () { autoRefreshAll(true); });
  // Deferred, not called inline at script-load: this file loads first on
  // every page, before the rest of the page's own markup/scripts run, so
  // firing a burst of POSTs here would compete with everything the page
  // itself is about to fetch. A short delay lets the page's own requests
  // go first.
  setTimeout(function () { autoRefreshAll(false); }, 3000);

  global.MuslimEduOffline = {
    flush: flush,
    refreshDataset: refreshDataset,
    refreshAll: refreshAll,
    pendingCount: pendingCount,
    cachedCount: cachedCount,
    listCachedDatasets: listCachedDatasets,
    listQueuedActions: listQueuedActions,
    isRead: isRead,
    onEvent: function (fn) { listeners.push(fn); },
    // opts.reads / opts.queue select which stores to wipe; omitting opts
    // clears both. The split matters on sign-out: the cached reads are
    // this user's data and shouldn't sit on the device afterwards, but the
    // queue holds work they performed and haven't synced yet, so dropping
    // it would silently destroy it. Only a genuine account change (see
    // login.js) is grounds for clearing the queue.
    clearCache: function (opts) {
      var o = opts || { reads: true, queue: true };
      var jobs = [];
      if (o.reads) jobs.push(tx(STORE_API, 'readwrite', function (s) { return s.clear(); }));
      if (o.queue) jobs.push(tx(STORE_QUEUE, 'readwrite', function (s) { return s.clear(); }));
      return Promise.all(jobs);
    }
  };
})(window);
