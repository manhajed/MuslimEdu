// Teacher: Take Attendance — web port of the RN app's
// TeacherAttendanceClassesScreen -> AttendanceMethodChooserScreen ->
// TeacherAttendanceRosterScreen / AttendanceScanScreen flow, now laid out
// as a proper step wizard (Class & Date -> Method -> Attendance) using the
// same stepper/footer convention as institution-profile.js, instead of
// one long scrolling page.
// Backend: AttendanceApi trait (teacher_attendance_classes / _statuses /
// _roster / _submit / _scan).

let acClasses = [];
let acStatuses = [];
let selectedClass = null;      // one entry from acClasses (section_id+subject_id pair)
let selectedDate = todayStr();
let method = null;             // 'manual' | 'scan' | null
let roster = null;             // current teacher_attendance_roster response
let statusMap = new Map();     // student_id -> status code, seeded from roster then edited
let noteMap = new Map();       // student_id -> remarks text, seeded from roster then edited
let noteOpenFor = null;        // student_id currently showing its remarks field, or null
let swipeIndex = 0;            // index into roster.students of the card currently on top
let swipeDirs = null;          // { right, left, up, down, rest } - built from acStatuses

// Scan-mode state
let scanning = false;
let mediaStream = null;
let barcodeDetector = null;
let detectTimer = null;
let scannedList = [];          // this-session log, most recent first
let lastScanTimes = {};        // code -> ms timestamp, dedupes the same card held in frame

// Wizard state
let step = 0; // 0 = Class & Date, 1 = Method, 2 = Attendance
let taToken = null;
let taBooted = false;
function stepLabels() {
  return [
    t('teacher_attendance.step_class_date', 'Class & Date'),
    t('teacher_attendance.step_method', 'Method'),
    t('teacher_attendance.step_attendance', 'Attendance'),
  ];
}

function todayStr() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + mm + '-' + dd;
}
function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function formatDateLong(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}
function formatTimeOnly(hhmm) {
  if (!hhmm) return '';
  const parts = String(hhmm).slice(0, 5).split(':');
  let h = parseInt(parts[0], 10) || 0;
  const m = parts[1] || '00';
  const suffix = h >= 12 ? 'PM' : 'AM';
  h = h % 12; if (h === 0) h = 12;
  return h + ':' + m + ' ' + suffix;
}

function classKey(c) {
  return c.section_id + ':' + c.subject_id;
}
function classLabel(c) {
  return (c.subject_name || t('teacher_attendance.subject_fallback', 'Subject')) + ' — ' + (c.section_name || t('teacher_attendance.section_fallback', 'Section')) + (c.class_name ? ' (' + c.class_name + ')' : '');
}
function statusByCode(code) {
  return acStatuses.find(s => s.code === code) || null;
}

function fetchAttendanceClasses(token) {
  return authedPost('/teacher_attendance_classes', token).then(d => d.classes || []);
}
function fetchAttendanceStatuses(token) {
  return authedPost('/teacher_attendance_statuses', token).then(d => d.statuses || []);
}
function fetchAttendanceRoster(token, sectionId, subjectId, date) {
  return authedPost('/teacher_attendance_roster', token, { section_id: sectionId, subject_id: subjectId, date: date });
}
function submitAttendance(token, sectionId, subjectId, date, records) {
  return authedPost('/teacher_attendance_submit', token, {
    section_id: sectionId, subject_id: subjectId, date: date, source: 'manual', records: records,
  });
}
function scanAttendance(token, sectionId, subjectId, date, code) {
  return authedPost('/teacher_attendance_scan', token, { section_id: sectionId, subject_id: subjectId, date: date, code: code });
}

// ── Wizard shell ───────────────────────────────────────────────────────

function renderStepper() {
  const labels = stepLabels();
  document.getElementById('taStepperWrap').innerHTML =
    '<div class="ip-stepper">' +
      labels.map((_, i) => '<div class="ip-step-dot ' + (i < step ? 'done' : i === step ? 'active' : '') + '"></div>').join('') +
    '</div>';
  const dynamicLabel = step === 2 ? (method === 'scan' ? t('teacher_attendance.step_scan_id', 'Scan ID Card') : t('teacher_attendance.step_mark_attendance', 'Mark Attendance')) : labels[step];
  document.getElementById('taStepLabelWrap').innerHTML =
    '<div class="ip-step-label">' + escapeHtml(t('teacher_attendance.step_label_template', 'Step {n} of 3:').replace('{n}', step + 1)) + ' <strong>' + escapeHtml(dynamicLabel) + '</strong></div>';
}

function renderFooter(token) {
  const wrap = document.getElementById('taFooterWrap');
  const backBtn = step > 0 ? '<button type="button" class="ip-back-btn" id="taBackBtn">' + escapeHtml(t('teacher_attendance.back', 'Back')) + '</button>' : '';

  if (step === 0) {
    const canContinue = !!(selectedClass && selectedDate);
    wrap.innerHTML =
      '<div class="ip-footer">' + backBtn +
        '<button type="button" class="ip-continue-btn" id="taContinueBtn"' + (canContinue ? '' : ' disabled') + '>' + escapeHtml(t('teacher_attendance.continue', 'Continue')) + '</button>' +
      '</div>';
    document.getElementById('taContinueBtn').addEventListener('click', () => { if (canContinue) goToStep(1, token); });
  } else if (step === 1) {
    wrap.innerHTML = '<div class="ip-footer">' + backBtn + '</div>';
  } else {
    const showSave = method === 'manual' && roster && !roster.locked;
    wrap.innerHTML =
      '<div class="ip-footer">' + backBtn +
        (showSave
          ? '<button type="button" class="ip-continue-btn" id="taSaveBtn"><span id="taSaveLabel">' + escapeHtml(t('teacher_attendance.save_attendance', 'Save Attendance')) + '</span></button>'
          : (method === 'scan' ? '<button type="button" class="ip-continue-btn" id="taDoneBtn">' + escapeHtml(t('teacher_attendance.done', 'Done')) + '</button>' : '')) +
      '</div>';
    document.getElementById('taSaveBtn')?.addEventListener('click', () => saveAttendance(token));
    document.getElementById('taDoneBtn')?.addEventListener('click', () => { window.location.href = 'teacher-dashboard.php'; });
  }
  document.getElementById('taBackBtn')?.addEventListener('click', () => goBack(token));
}

function goToStep(n, token) {
  step = n;
  renderStep(token);
  window.scrollTo(0, 0);
}

function goBack(token) {
  if (step === 2) { stopCamera(); }
  step = Math.max(0, step - 1);
  renderStep(token);
  window.scrollTo(0, 0);
}

function renderStep(token) {
  renderStepper();
  const content = document.getElementById('taContent');

  if (step === 0) {
    content.innerHTML =
      '<div class="ip-step-heading">' + escapeHtml(t('teacher_attendance.pick_class_date', 'Pick a class and date')) + '</div>' +
      '<div class="util-card padded" id="pickerCard">' +
        '<div class="util-row" id="classRow" style="cursor:pointer;"><span class="util-row-title">' + escapeHtml(t('teacher_attendance.class_subject_label', 'Class & Subject')) + '</span></div>' +
        '<div class="util-row" id="dateRow"><span class="util-row-title">' + escapeHtml(t('teacher_attendance.date_label', 'Date')) + '</span></div>' +
      '</div>' +
      '<div id="noClassesWrap"></div>';
    renderPickerRows(token);
    if (!acClasses.length) {
      document.getElementById('noClassesWrap').innerHTML =
        '<div class="list-empty"><div class="list-empty-title">' + escapeHtml(t('teacher_attendance.no_classes_title', 'No classes assigned')) + '</div>' +
        '<div class="list-empty-sub">' + escapeHtml(t('teacher_attendance.no_classes_sub', 'Ask your admin to assign you to a class and subject, or check your schedule.')) + '</div></div>';
    }
  }

  else if (step === 1) {
    content.innerHTML =
      '<div class="ip-step-heading">' + escapeHtml(selectedClass ? classLabel(selectedClass) : '') + ' · ' + escapeHtml(formatDateLong(selectedDate)) + '</div>' +
      '<div class="method-grid">' +
        '<button type="button" class="method-tile' + (method === 'manual' ? ' active' : '') + '" id="methodManualBtn">' +
          '<span class="method-tile-icon">' + icon('clipboard', { size: 20 }) + '</span>' +
          '<span class="flex1"><span class="method-tile-title">' + escapeHtml(t('teacher_attendance.method_manual_title', 'Manual Entry')) + '</span>' +
          '<div class="method-tile-desc">' + escapeHtml(t('teacher_attendance.method_manual_desc', 'Check off present, late, absent and more from the roster')) + '</div></span>' +
        '</button>' +
        '<button type="button" class="method-tile' + (method === 'scan' ? ' active' : '') + '" id="methodScanBtn">' +
          '<span class="method-tile-icon">' + icon('scan', { size: 20 }) + '</span>' +
          '<span class="flex1"><span class="method-tile-title">' + escapeHtml(t('teacher_attendance.method_scan_title', 'Scan QR / ID Card')) + '</span>' +
          '<div class="method-tile-desc">' + escapeHtml(t('teacher_attendance.method_scan_desc', 'Scan each student’s ID card to mark them present instantly')) + '</div></span>' +
        '</button>' +
      '</div>';
    document.getElementById('methodManualBtn').addEventListener('click', () => chooseMethod(token, 'manual'));
    document.getElementById('methodScanBtn').addEventListener('click', () => chooseMethod(token, 'scan'));
  }

  else if (step === 2) {
    content.innerHTML = '<div id="attendanceContent"></div>';
    if (method === 'manual') loadRoster(token);
    else { scannedList = []; renderScanUI(token); }
  }

  renderFooter(token);
}

function chooseMethod(token, m) {
  method = m;
  roster = null;
  statusMap = new Map();
  noteMap = new Map();
  noteOpenFor = null;
  swipeIndex = 0;
  goToStep(2, token);
}

// Assigns up to 4 attendance statuses to the 4 swipe directions. Common
// codes get their conventional edge (present -> right, absent -> left,
// late -> up, excused -> down); anything else fills the remaining edges
// in list order. A 5th+ status (e.g. "leave") has no edge of its own and
// falls into `rest`, reachable from the card's "More" button instead.
function buildSwipeDirections(statuses) {
  const byCode = (code) => statuses.find(s => s.code === code) || null;
  const used = new Set();
  const take = (preferred) => {
    let s = preferred && !used.has(preferred) ? preferred : null;
    if (!s) s = statuses.find(x => !used.has(x)) || null;
    if (s) used.add(s);
    return s;
  };
  const right = take(byCode('present'));
  const left = take(byCode('absent'));
  const up = take(byCode('late'));
  const down = take(byCode('excused'));
  const rest = statuses.filter(s => !used.has(s));
  return { right, left, up, down, rest };
}

// ── Pickers (step 0) ──────────────────────────────────────────────────

function renderPickerRows(token) {
  const classRow = document.getElementById('classRow');
  classRow.innerHTML =
    '<span class="util-row-title">' + escapeHtml(t('teacher_attendance.class_subject_label', 'Class & Subject')) + '</span>' +
    '<span class="util-row-value">' + escapeHtml(selectedClass ? classLabel(selectedClass) : t('teacher_attendance.select', 'Select')) + '</span>' +
    icon('chevron', { size: 18, color: 'var(--subtle)' });
  classRow.onclick = () => {
    if (!acClasses.length) { showToast(t('teacher_attendance.no_class_assigned_toast', 'You are not assigned to any classes yet.')); return; }
    openOptionSheet(
      t('teacher_attendance.class_subject_label', 'Class & Subject'),
      acClasses.map(c => ({ key: classKey(c), label: classLabel(c) })),
      selectedClass ? classKey(selectedClass) : null,
      (key) => {
        selectedClass = acClasses.find(c => classKey(c) === key) || null;
        onSelectionChanged(token);
      }
    );
  };

  const dateRow = document.getElementById('dateRow');
  dateRow.innerHTML =
    '<span class="util-row-title">' + escapeHtml(t('teacher_attendance.date_label', 'Date')) + '</span>' +
    '<input type="date" id="attDateInput" class="att-date-input" value="' + escapeHtml(selectedDate) + '" max="' + escapeHtml(todayStr()) + '" />';
  document.getElementById('attDateInput').addEventListener('change', (e) => {
    selectedDate = e.target.value || todayStr();
    onSelectionChanged(token);
  });
}

function onSelectionChanged(token) {
  stopCamera();
  method = null;
  roster = null;
  statusMap = new Map();
  noteOpenFor = null;
  scannedList = [];
  renderStep(token);
}

// ── Manual roster (step 2) ────────────────────────────────────────────

function loadRoster(token) {
  const wrap = document.getElementById('attendanceContent');
  wrap.innerHTML = '<div class="list-loading">' + escapeHtml(t('teacher_attendance.loading_roster', 'Loading roster…')) + '</div>';

  fetchAttendanceRoster(token, selectedClass.section_id, selectedClass.subject_id, selectedDate)
    .then(data => {
      roster = data;
      statusMap = new Map();
      noteMap = new Map();
      (roster.students || []).forEach(s => {
        if (s.status) statusMap.set(s.student_id, s.status);
        if (s.remarks) noteMap.set(s.student_id, s.remarks);
      });
      swipeDirs = buildSwipeDirections(acStatuses);
      renderManualRoster(token);
      renderFooter(token);
    })
    .catch((err) => {
      wrap.innerHTML =
        '<div class="list-error">' + escapeHtml((err && err.message) || t('teacher_attendance.load_roster_error', 'Could not load the roster.')) + '<br>' +
        '<button type="button" class="list-retry-btn" id="rosterRetryBtn">' + escapeHtml(t('common.retry', 'Try again')) + '</button></div>';
      document.getElementById('rosterRetryBtn')?.addEventListener('click', () => loadRoster(token));
    });
}

function renderSummaryRow(containerId, summary) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!summary || !acStatuses.length) { el.innerHTML = ''; return; }
  el.innerHTML = acStatuses.map(s =>
    '<span class="att-summary-item"><span class="att-summary-dot" style="background:' + escapeHtml(s.color || '#8E8E93') + '"></span>' +
    escapeHtml(s.label) + ' ' + (summary[s.code] || 0) + '</span>'
  ).join('');
}

function renderManualRoster(token) {
  const wrap = document.getElementById('attendanceContent');
  const students = roster.students || [];
  const locked = !!roster.locked;

  if (!students.length) {
    wrap.innerHTML = '<div class="list-empty"><div class="list-empty-title">' + escapeHtml(t('teacher_attendance.no_students', 'No students in this class')) + '</div></div>';
    return;
  }

  if (locked) {
    renderLockedRosterList(wrap, students);
    return;
  }

  renderSwipeStage(token, wrap, students);
}

// Read-only fallback once attendance is locked — swiping doesn't make
// sense when nothing can change, so this just lists each student's final
// status the same way the old roster view did.
function renderLockedRosterList(wrap, students) {
  const by = roster.locked_by_name ? t('teacher_attendance.locked_by_suffix', ' by {name}').replace('{name}', roster.locked_by_name) : '';
  const on = roster.locked_at ? t('teacher_attendance.locked_on_suffix', ' on {date}').replace('{date}', formatDateTime(roster.locked_at)) : '';
  let html =
    '<div class="att-locked-banner">' +
      '<span class="att-locked-banner-icon">' + icon('lock', { size: 18 }) + '</span>' +
      '<span><div class="att-locked-banner-title">' + escapeHtml(t('teacher_attendance.locked_title', 'Attendance locked')) + '</div>' +
      '<div class="att-locked-banner-sub">' + escapeHtml(t('teacher_attendance.locked_sub', 'Submitted{by}{on}. Ask an admin to unlock it to make changes.').replace('{by}', by).replace('{on}', on)) +
      '</div></span>' +
    '</div>' +
    '<div id="attSummaryRow" class="att-summary-row"></div><div id="rosterList"></div>';
  wrap.innerHTML = html;
  renderSummaryRow('attSummaryRow', roster.summary);

  const listEl = document.getElementById('rosterList');
  students.forEach(s => {
    const initial = (s.student_name || '?').trim().charAt(0).toUpperCase();
    const st = statusByCode(statusMap.get(s.student_id));
    const row = document.createElement('div');
    row.className = 'list-card';
    row.style.opacity = '0.7';
    row.innerHTML =
      '<span class="list-avatar-wrap">' +
        (s.photo ? '<img class="list-avatar" src="' + escapeHtml(absoluteUrl(s.photo)) + '" alt="" />' : '<span class="list-avatar-fallback">' + escapeHtml(initial) + '</span>') +
      '</span>' +
      '<span class="list-card-body">' +
        '<div class="list-card-name">' + escapeHtml(s.student_name || '') + '</div>' +
        (st ? '<span class="mini-chip" style="background:' + escapeHtml(st.color || '#8E8E93') + '22;color:' + escapeHtml(st.color || '#8E8E93') + ';margin-top:4px;">' + escapeHtml(st.label) + '</span>' : '') +
      '</span>';
    listEl.appendChild(row);
  });
}

// ── Swipeable roster cards ──────────────────────────────────────────────

function renderSwipeStage(token, wrap, students) {
  if (swipeIndex >= students.length) {
    wrap.innerHTML =
      '<div class="att-swipe-complete">' +
        '<span class="att-swipe-complete-icon">' + icon('checkcircle', { size: 34, color: 'var(--ink)' }) + '</span>' +
        '<div class="att-swipe-complete-title">' + escapeHtml(t('teacher_attendance.swipe_all_reviewed_title', 'All students reviewed')) + '</div>' +
        '<div class="att-swipe-complete-sub">' + escapeHtml(t('teacher_attendance.swipe_all_reviewed_sub', 'Save below, or go back to double-check anyone.')) + '</div>' +
        '<button type="button" class="att-swipe-skip" id="swipeReviewBtn">' + escapeHtml(t('teacher_attendance.swipe_review_btn', 'Go back and review')) + '</button>' +
        '<div id="attSummaryRow" class="att-summary-row" style="justify-content:center;margin-top:18px;"></div>' +
      '</div>';
    renderSummaryRow('attSummaryRow', roster.summary);
    document.getElementById('swipeReviewBtn').addEventListener('click', () => { swipeIndex = 0; renderManualRoster(token); });
    return;
  }

  const s = students[swipeIndex];
  const initial = (s.student_name || '?').trim().charAt(0).toUpperCase();
  const currentCode = statusMap.get(s.student_id) || null;
  const currentStatus = statusByCode(currentCode);
  const noteVisible = noteOpenFor === s.student_id;
  const dirs = swipeDirs;

  const edgeHtml = (pos) => {
    const st = dirs[pos];
    if (!st) return '';
    const arrowIcon = pos === 'up' ? 'chevronup' : pos === 'down' ? 'chevrondown' : pos === 'left' ? 'chevronleft' : 'arrow';
    return '<span class="att-swipe-edge ' + pos + '" id="swipeEdge' + pos + '" style="--edge-color:' + escapeHtml(st.color || '#1C1C1E') + '">' +
      (pos === 'left' || pos === 'up' ? icon(arrowIcon, { size: 13 }) : '') +
      '<span>' + escapeHtml(st.label) + '</span>' +
      (pos === 'right' || pos === 'down' ? icon(arrowIcon, { size: 13 }) : '') +
    '</span>';
  };

  wrap.innerHTML =
    '<div class="att-swipe-progress">' + escapeHtml(t('teacher_attendance.swipe_progress', 'Student {current} of {total}').replace('{current}', swipeIndex + 1).replace('{total}', students.length)) +
      (swipeIndex > 0 ? ' &nbsp;·&nbsp; <button type="button" class="att-swipe-undo" id="swipeUndoBtn">' + icon('refresh', { size: 12 }) + ' ' + escapeHtml(t('teacher_attendance.back', 'Back')) + '</button>' : '') +
    '</div>' +
    '<div class="att-swipe-wrap">' +
      edgeHtml('right') + edgeHtml('left') + edgeHtml('up') + edgeHtml('down') +
      '<div class="att-swipe-card-stage">' +
        '<div class="att-swipe-card" id="swipeCard">' +
          (dirs.rest.length ? '<button type="button" class="att-swipe-more-btn" id="swipeMoreBtn">' + escapeHtml(t('teacher_attendance.more', 'More')) + '</button>' : '') +
          '<button type="button" class="att-swipe-note-btn' + (noteVisible || noteMap.get(s.student_id) ? ' active' : '') + '" id="swipeNoteBtn">' + icon('pencil', { size: 14 }) + '</button>' +
          '<span class="att-swipe-avatar">' +
            (s.photo ? '<img src="' + escapeHtml(absoluteUrl(s.photo)) + '" alt="" />' : '<span class="att-swipe-avatar-fallback">' + escapeHtml(initial) + '</span>') +
          '</span>' +
          '<div class="att-swipe-name">' + escapeHtml(s.student_name || '') + '</div>' +
          (currentStatus ? '<span class="att-swipe-current-status" style="background:' + escapeHtml(currentStatus.color || '#8E8E93') + '22;color:' + escapeHtml(currentStatus.color || '#8E8E93') + ';">' + escapeHtml(t('teacher_attendance.currently_prefix', 'Currently: {status}').replace('{status}', currentStatus.label)) + '</span>' : '') +
        '</div>' +
      '</div>' +
    '</div>' +
    '<textarea class="util-input att-swipe-note-area" id="swipeNoteArea" placeholder="' + escapeHtml(t('teacher_attendance.note_placeholder', 'Optional note for this student')) + '" style="' + (noteVisible ? '' : 'display:none;') + '">' + escapeHtml(noteMap.get(s.student_id) || '') + '</textarea>' +
    '<button type="button" class="att-swipe-skip" id="swipeSkipBtn">' + escapeHtml(t('teacher_attendance.skip_for_now', 'Skip for now')) + '</button>' +
    '<div id="attSummaryRow" class="att-summary-row" style="justify-content:center;"></div>';

  renderSummaryRow('attSummaryRow', roster.summary);

  const noteArea = document.getElementById('swipeNoteArea');
  noteArea.addEventListener('input', (e) => { noteMap.set(s.student_id, e.target.value); });
  document.getElementById('swipeNoteBtn').addEventListener('click', () => {
    noteOpenFor = noteOpenFor === s.student_id ? null : s.student_id;
    renderSwipeStage(token, wrap, students);
  });
  document.getElementById('swipeMoreBtn')?.addEventListener('click', () => {
    openOptionSheet(t('teacher_attendance.status_sheet_title', 'Status'), dirs.rest.map(st => ({ key: st.code, label: st.label })), currentCode, (key) => {
      statusMap.set(s.student_id, key);
      advanceSwipe(token);
      return Promise.resolve();
    });
  });
  document.getElementById('swipeSkipBtn').addEventListener('click', () => advanceSwipe(token));
  document.getElementById('swipeUndoBtn')?.addEventListener('click', () => {
    swipeIndex = Math.max(0, swipeIndex - 1);
    renderSwipeStage(token, wrap, students);
  });

  attachSwipeHandlers(document.getElementById('swipeCard'), s, token);
}

function advanceSwipe(token) {
  noteOpenFor = null;
  swipeIndex += 1;
  renderManualRoster(token);
}

function attachSwipeHandlers(card, student, token) {
  if (!card) return;
  const THRESH = 88;
  let dragging = false;
  let startX = 0, startY = 0, curX = 0, curY = 0;

  function setEdgeActive(pos) {
    ['right', 'left', 'up', 'down'].forEach(p => {
      const el = document.getElementById('swipeEdge' + p);
      if (!el) return;
      el.classList.toggle('active', p === pos);
      el.style.background = p === pos ? 'var(--edge-color)' : '';
      el.style.color = p === pos ? '#fff' : '';
    });
  }

  function onDown(e) {
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    card.classList.add('dragging');
    card.setPointerCapture(e.pointerId);
  }
  function onMove(e) {
    if (!dragging) return;
    curX = e.clientX - startX;
    curY = e.clientY - startY;
    card.style.transform = 'translate(' + curX + 'px,' + curY + 'px) rotate(' + (curX / 18) + 'deg)';

    const absX = Math.abs(curX), absY = Math.abs(curY);
    if (absX < 24 && absY < 24) { setEdgeActive(null); return; }
    if (absX >= absY) setEdgeActive(curX > 0 ? 'right' : 'left');
    else setEdgeActive(curY > 0 ? 'down' : 'up');
  }
  function onUp() {
    if (!dragging) return;
    dragging = false;
    card.classList.remove('dragging');
    const absX = Math.abs(curX), absY = Math.abs(curY);
    let dir = null;
    if (absX > THRESH && absX >= absY) dir = curX > 0 ? 'right' : 'left';
    else if (absY > THRESH && absY > absX) dir = curY > 0 ? 'down' : 'up';

    if (dir && swipeDirs[dir]) {
      const flyX = dir === 'right' ? 600 : dir === 'left' ? -600 : curX;
      const flyY = dir === 'down' ? 600 : dir === 'up' ? -600 : curY;
      card.style.transition = 'transform .22s ease, opacity .22s ease';
      card.style.transform = 'translate(' + flyX + 'px,' + flyY + 'px) rotate(' + (flyX / 18) + 'deg)';
      card.style.opacity = '0';
      setTimeout(() => {
        statusMap.set(student.student_id, swipeDirs[dir].code);
        advanceSwipe(token);
      }, 200);
    } else {
      card.style.transition = 'transform .25s cubic-bezier(.2,.8,.2,1)';
      card.style.transform = '';
      setEdgeActive(null);
    }
    curX = 0; curY = 0;
  }

  card.addEventListener('pointerdown', onDown);
  card.addEventListener('pointermove', onMove);
  card.addEventListener('pointerup', onUp);
  card.addEventListener('pointercancel', onUp);
}

function collectRecords() {
  const students = (roster && roster.students) || [];
  const records = [];

  students.forEach(s => {
    const code = statusMap.get(s.student_id);
    if (!code) return;
    const remarks = noteMap.get(s.student_id) || '';
    records.push({ student_id: s.student_id, status: code, remarks: remarks || null });
  });

  return records;
}

function saveAttendance(token) {
  if (!selectedClass || !roster) return;

  const records = collectRecords();
  if (!records.length) { showToast(t('teacher_attendance.mark_one_first', 'Mark at least one student first.')); return; }

  const btn = document.getElementById('taSaveBtn');
  const label = document.getElementById('taSaveLabel');
  btn.disabled = true;
  label.innerHTML = '<span class="util-spinner"></span>';

  submitAttendance(token, selectedClass.section_id, selectedClass.subject_id, selectedDate, records)
    .then(() => {
      showToast(t('teacher_attendance.saved_toast', 'Attendance saved.'));
      loadRoster(token);
    })
    .catch(err => {
      showToast(err && err.message ? err.message : t('teacher_attendance.save_failed', 'Could not save attendance.'));
    })
    .finally(() => {
      if (btn) { btn.disabled = false; }
      if (label) { label.textContent = t('teacher_attendance.save_attendance', 'Save Attendance'); }
    });
}

// ── Scan mode (step 2) ────────────────────────────────────────────────

function renderScanUI(token) {
  const wrap = document.getElementById('attendanceContent');
  wrap.innerHTML =
    '<div class="att-scan-video-wrap">' +
      '<video id="attScanVideo" autoplay playsinline muted style="display:none;"></video>' +
      '<div class="att-scan-frame" id="attScanFrame" style="display:none;"></div>' +
      '<div class="att-scan-status-pill" id="attScanStatusPill" style="display:none;"></div>' +
      '<div class="att-scan-off" id="attScanOff">' +
        icon('camera', { size: 30, color: 'rgba(255,255,255,0.7)' }) +
        '<div class="att-scan-off-text" id="attScanOffText">' + t('teacher_attendance.scan_off_text', 'Start the camera to scan a student’s ID card,<br>or enter their code below.') + '</div>' +
      '</div>' +
    '</div>' +
    '<button type="button" class="att-scan-toggle-btn" id="attScanToggleBtn">' + icon('camera', { size: 18, color: '#fff' }) + ' <span id="attScanToggleLabel">' + escapeHtml(t('teacher_attendance.start_camera', 'Start Camera')) + '</span></button>' +
    '<div id="attSummaryRow" class="att-summary-row"></div>' +
    '<div class="att-scan-manual-label" id="attScanManualLabel">' + escapeHtml(t('teacher_attendance.no_camera_label', 'No camera? Enter the student’s ID code')) + '</div>' +
    '<div class="att-scan-manual-row">' +
      '<div class="util-input-row"><input type="text" class="util-input" id="attScanCodeInput" placeholder="' + escapeHtml(t('teacher_attendance.code_placeholder', 'Student ID code')) + '" autocomplete="off" /></div>' +
      '<button type="button" class="att-scan-manual-btn" id="attScanCodeBtn">' + escapeHtml(t('teacher_attendance.mark_present_btn', 'Mark Present')) + '</button>' +
    '</div>' +
    '<div class="att-scanned-title" id="attScannedTitle">' + escapeHtml(t('teacher_attendance.scanned_session_title', 'Scanned this session')) + '</div>' +
    '<div id="attScannedList"></div>';

  document.getElementById('attScanToggleBtn').addEventListener('click', () => {
    if (scanning) stopCamera(); else startCamera(token);
  });
  document.getElementById('attScanCodeBtn').addEventListener('click', () => {
    const input = document.getElementById('attScanCodeInput');
    handleScannedCode(token, input.value);
  });
  document.getElementById('attScanCodeInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleScannedCode(token, e.target.value); }
  });

  updateScanToggleUI();
  renderScannedList();
}

// Refreshes only the fixed text nodes of the scan UI (not the video/camera
// state) so a locale change mid-scan doesn't tear down an active stream.
function renderScanTexts() {
  const offText = document.getElementById('attScanOffText');
  if (offText) offText.innerHTML = t('teacher_attendance.scan_off_text', 'Start the camera to scan a student’s ID card,<br>or enter their code below.');
  const manualLabel = document.getElementById('attScanManualLabel');
  if (manualLabel) manualLabel.textContent = t('teacher_attendance.no_camera_label', 'No camera? Enter the student’s ID code');
  const codeInput = document.getElementById('attScanCodeInput');
  if (codeInput) codeInput.placeholder = t('teacher_attendance.code_placeholder', 'Student ID code');
  const codeBtn = document.getElementById('attScanCodeBtn');
  if (codeBtn) codeBtn.textContent = t('teacher_attendance.mark_present_btn', 'Mark Present');
  const scannedTitle = document.getElementById('attScannedTitle');
  if (scannedTitle) scannedTitle.textContent = t('teacher_attendance.scanned_session_title', 'Scanned this session');
  updateScanToggleUI();
  renderScannedList();
}

function updateScanToggleUI() {
  const btn = document.getElementById('attScanToggleBtn');
  const video = document.getElementById('attScanVideo');
  const frame = document.getElementById('attScanFrame');
  const pill = document.getElementById('attScanStatusPill');
  const off = document.getElementById('attScanOff');
  if (!btn) return;

  btn.classList.toggle('stop', scanning);
  btn.innerHTML = scanning
    ? icon('close', { size: 18, color: '#fff' }) + ' ' + escapeHtml(t('teacher_attendance.stop_camera', 'Stop Camera'))
    : icon('camera', { size: 18, color: '#fff' }) + ' ' + escapeHtml(t('teacher_attendance.start_camera', 'Start Camera'));

  if (video) video.style.display = scanning ? '' : 'none';
  if (frame) frame.style.display = scanning ? '' : 'none';
  if (pill) pill.style.display = scanning ? '' : 'none';
  if (off) off.style.display = scanning ? 'none' : '';
}

function setScanStatusPill(text) {
  const el = document.getElementById('attScanStatusPill');
  if (el) el.textContent = text;
}

function startCamera(token) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showToast(t('teacher_attendance.camera_unavailable', 'Camera is not available in this browser.'));
    return;
  }
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(stream => {
      mediaStream = stream;
      const video = document.getElementById('attScanVideo');
      if (!video) { stream.getTracks().forEach(t => t.stop()); return; }
      video.srcObject = stream;
      scanning = true;
      updateScanToggleUI();
      setScanStatusPill(t('teacher_attendance.point_camera', 'Point the camera at a student’s ID card'));

      if ('BarcodeDetector' in window) {
        barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] });
        runDetectLoop(token, video);
      } else {
        setScanStatusPill(t('teacher_attendance.scan_unsupported', 'Live scanning isn’t supported here — use the code field below'));
      }
    })
    .catch(() => showToast(t('teacher_attendance.camera_permission_error', 'Could not access the camera. Check your browser permission.')));
}

function runDetectLoop(token, video) {
  if (!scanning || !barcodeDetector) return;
  barcodeDetector.detect(video)
    .then(codes => {
      if (codes && codes.length && scanning) {
        handleScannedCode(token, codes[0].rawValue);
      }
    })
    .catch(() => {})
    .finally(() => {
      if (scanning) detectTimer = setTimeout(() => runDetectLoop(token, video), 500);
    });
}

function stopCamera() {
  scanning = false;
  clearTimeout(detectTimer);
  detectTimer = null;
  barcodeDetector = null;
  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop());
    mediaStream = null;
  }
  updateScanToggleUI();
}

function handleScannedCode(token, rawCode) {
  const code = (rawCode || '').trim();
  if (!code || !selectedClass) return;

  const now = Date.now();
  if (lastScanTimes[code] && now - lastScanTimes[code] < 3000) return; // same card still in frame
  lastScanTimes[code] = now;

  setScanStatusPill(t('teacher_attendance.checking', 'Checking…'));
  scanAttendance(token, selectedClass.section_id, selectedClass.subject_id, selectedDate, code)
    .then(res => {
      showToast(res.message || t('teacher_attendance.marked_present_default', 'Marked present.'));
      if (res.student) {
        scannedList = scannedList.filter(s => s.student_id !== res.student.student_id);
        scannedList.unshift(res.student);
        renderScannedList();
      }
      if (res.summary) renderSummaryRow('attSummaryRow', res.summary);
      const input = document.getElementById('attScanCodeInput');
      if (input) input.value = '';
      setScanStatusPill(scanning ? t('teacher_attendance.point_camera_next', 'Point the camera at the next student') : '');
    })
    .catch(err => {
      showToast((err && err.message) || t('teacher_attendance.mark_present_failed', 'Could not mark that code present.'));
      setScanStatusPill(scanning ? t('teacher_attendance.point_camera', 'Point the camera at a student’s ID card') : '');
    });
}

function renderScannedList() {
  const el = document.getElementById('attScannedList');
  if (!el) return;
  if (!scannedList.length) {
    el.innerHTML = '<div class="list-empty-sub" style="text-align:left;padding:0;">' + escapeHtml(t('teacher_attendance.nothing_scanned', 'Nothing scanned yet.')) + '</div>';
    return;
  }
  el.innerHTML = scannedList.map(s => {
    const initial = (s.student_name || '?').trim().charAt(0).toUpperCase();
    return (
      '<div class="att-scanned-item">' +
        '<span class="list-avatar-wrap">' +
          (s.photo
            ? '<img class="list-avatar" src="' + escapeHtml(absoluteUrl(s.photo)) + '" alt="" />'
            : '<span class="list-avatar-fallback">' + escapeHtml(initial) + '</span>') +
        '</span>' +
        '<span class="att-scanned-item-body">' +
          '<div class="att-scanned-item-name">' + escapeHtml(s.student_name || '') + '</div>' +
          '<div class="att-scanned-item-time">' + escapeHtml(formatTimeOnly(s.check_in_time)) + '</div>' +
        '</span>' +
        '<span class="att-scanned-item-check">' + icon('check', { size: 14 }) + '</span>' +
      '</div>'
    );
  }).join('');
}

// ── Boot ────────────────────────────────────────────────────────────────

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(t('teacher_attendance.title', 'Take Attendance'), t('teacher_attendance.subtitle', 'Mark attendance manually or by scanning ID cards.'), 'teacher-dashboard.php', null);
}
renderHeaderText();

onLocaleChange(() => {
  renderHeaderText();
  if (!taBooted || !taToken) return;
  if (step === 0 || step === 1) { renderStep(taToken); return; }
  renderStepper();
  renderFooter(taToken);
  if (method === 'manual' && roster) renderManualRoster(taToken);
  else if (method === 'scan') renderScanTexts();
});

guardDashboard('teacher', function (user, token) {
  taToken = token;
  document.getElementById('routeGuardSplash')?.remove();
  document.getElementById('taRoot').style.display = '';
  document.getElementById('taContent').innerHTML = '<div class="list-loading">' + escapeHtml(t('teacher_attendance.loading_classes', 'Loading your classes…')) + '</div>';

  Promise.all([fetchAttendanceClasses(token), fetchAttendanceStatuses(token)])
    .then(([classes, statuses]) => {
      acClasses = classes;
      acStatuses = statuses;
      taBooted = true;
      renderStep(token);
    })
    .catch(() => {
      document.getElementById('taContent').innerHTML =
        '<div class="list-error">' + escapeHtml(t('teacher_attendance.load_classes_error', 'Could not load your classes.')) + '<br><button type="button" class="list-retry-btn" id="classesRetryBtn">' + escapeHtml(t('common.retry', 'Try again')) + '</button></div>';
      document.getElementById('classesRetryBtn')?.addEventListener('click', () => location.reload());
    });
});

window.addEventListener('beforeunload', stopCamera);
