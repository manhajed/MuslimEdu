// Admin: Class Schedule — web port of src/screens/admin/AdminClassScheduleScreen.tsx
// (scheduleService.ts: admin_schedule_list/_store/_update/_delete). Reuses
// fromBackendSchedule() and the .day-group/.schedule-card markup already
// built for student-schedule.js (dashboard.js) - same backend row shape,
// just an admin builder on top instead of a read-only view.

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(t('class_schedule.title', 'Class Schedule'), t('class_schedule.subtitle', 'Assign subject, teacher, room and time for each entry.'), 'admin-dashboard.php', {
      label: t('class_schedule.add_action', '+ Add'), onClick: () => openScheduleSheet(getStoredToken()),
    });
}
renderHeaderText();
onLocaleChange(renderHeaderText);

const SCHED_DAY_ORDER = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const SCHED_DAY_TO_INT = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
const SCHED_DAY_FALLBACK = { sunday: 'Sunday', monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday' };
function schedDayLabel(day) {
  return t('student_schedule.day_' + day, SCHED_DAY_FALLBACK[day]);
}

let allSchedules = [];
let dayFilter = null; // null = all days
let pickers = { teachers: [], subjects: [], rooms: [] };
let schedToken = null;
let schedBooted = false;

// ── Data ──
function fetchAdminSchedules(token, day) {
  const body = day ? { day_of_week: SCHED_DAY_TO_INT[day] } : {};
  return authedPost('/admin_schedule_list', token, body).then(d => (d.schedules || []).map(fromBackendSchedule));
}
function fetchTeachersPicker(token) {
  return authedPost('/admin_class_teacher_list', token, {}).then(d => d.teachers || []);
}
function fetchSubjectsPicker(token) {
  return authedPost('/admin_subjects_catalog_list', token, {}).then(d => d.subjects || []);
}
function fetchRoomsPicker(token) {
  return authedPost('/admin_facilities_rooms', token, {}).then(d => (d.rooms && d.rooms.data) || []);
}
function saveScheduleRow(token, input) {
  return authedPost('/admin_schedule_store', token, {
    period_label: input.code,
    day_of_week: SCHED_DAY_TO_INT[input.day],
    start_time: input.starts_at,
    end_time: input.ends_at,
    room_id: input.room_id || undefined,
    teacher_id: input.teacher_id || undefined,
    subject_id: input.subject_id || undefined,
  });
}
function updateScheduleRow(token, id, input) {
  return authedPost('/admin_schedule_update', token, {
    id,
    period_label: input.code,
    day_of_week: SCHED_DAY_TO_INT[input.day],
    start_time: input.starts_at,
    end_time: input.ends_at,
    room_id: input.room_id || undefined,
    teacher_id: input.teacher_id || undefined,
    subject_id: input.subject_id || undefined,
  });
}
function deleteScheduleRow(token, id) {
  return authedPost('/admin_schedule_delete', token, { id });
}

// ── Day filter chips ──
function renderDayFilter(token) {
  const wrap = document.getElementById('dayFilterRow');
  const chips = [{ key: null, label: t('class_schedule.all_days', 'All Days') }, ...SCHED_DAY_ORDER.map(d => ({ key: d, label: schedDayLabel(d) }))];
  wrap.innerHTML = chips.map(c =>
    '<button type="button" class="filter-chip' + (c.key === dayFilter ? ' active' : '') + '" data-key="' + (c.key || '') + '">' + escapeHtml(c.label) + '</button>'
  ).join('');
  wrap.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      dayFilter = btn.dataset.key || null;
      renderDayFilter(token);
      loadSchedules(token);
    });
  });
}

// ── List ──
function renderSchedule(token) {
  const wrap = document.getElementById('scheduleContent');
  if (!allSchedules.length) {
    wrap.innerHTML =
      '<div class="list-empty">' +
        '<div class="list-empty-title">' + escapeHtml(t('class_schedule.empty_title', 'No schedule entries yet')) + '</div>' +
        '<div class="list-empty-sub">' + escapeHtml(t('class_schedule.empty_sub', 'Add your first class meeting to start building the weekly timetable.')) + '</div>' +
      '</div>';
    return;
  }

  const grouped = SCHED_DAY_ORDER
    .map(day => ({ day, items: allSchedules.filter(r => r.day_of_week === day).sort((a, b) => a.starts_at.localeCompare(b.starts_at)) }))
    .filter(g => g.items.length > 0);

  const unassigned = t('class_schedule.unassigned', 'Unassigned');
  let html = '';
  grouped.forEach(g => {
    html += '<div class="day-group"><div class="day-group-title">' + escapeHtml(schedDayLabel(g.day)) + '</div>';
    g.items.forEach(item => {
      // Teacher, Room, Building (campus_name) and Section each get their
      // own small titled field - same uppercase-label treatment as the
      // .day-group-title headers above, instead of unlabeled pill badges,
      // so it's clear at a glance which value is which.
      const metaFields = [
        { label: t('class_schedule.meta_teacher', 'Teacher'), value: item.teacher_name, iconName: 'person' },
        { label: t('class_schedule.meta_room', 'Room'), value: item.room_name, iconName: 'idcard' },
        { label: t('class_schedule.meta_building', 'Building'), value: item.campus_name, iconName: null },
        { label: t('class_schedule.meta_section', 'Section'), value: item.section_name, iconName: null },
      ];
      html +=
        '<button type="button" class="schedule-card" data-id="' + item.id + '" style="width:100%;text-align:left;cursor:pointer;align-items:flex-start;">' +
          '<div class="schedule-time">' +
            '<div class="schedule-time-text">' + escapeHtml((item.starts_at || '').slice(0, 5)) + '</div>' +
            '<div class="schedule-time-to">' + escapeHtml(t('class_schedule.time_to', 'to')) + '</div>' +
            '<div class="schedule-time-text">' + escapeHtml((item.ends_at || '').slice(0, 5)) + '</div>' +
          '</div>' +
          '<div class="schedule-line"></div>' +
          '<div style="flex:1;min-width:0;">' +
            '<div class="schedule-title">' + escapeHtml(item.subject_name || item.code) +
              ' <span class="schedule-badge code">' + escapeHtml(item.code) + '</span></div>' +
            '<div class="schedule-meta-grid">' +
              metaFields.map(f =>
                '<div class="schedule-meta-item"><div class="schedule-meta-label">' + escapeHtml(f.label) + '</div>' +
                  '<div class="schedule-meta-value' + (f.value ? '' : ' muted') + '">' +
                    (f.value && f.iconName ? icon(f.iconName, { size: 12, color: 'var(--subtle)' }) : '') +
                    escapeHtml(f.value || unassigned) +
                  '</div></div>'
              ).join('') +
            '</div>' +
          '</div>' +
          icon('chevron', { size: 16, color: 'var(--subtle)' }) +
        '</button>';
    });
    html += '</div>';
  });
  wrap.innerHTML = html;

  wrap.querySelectorAll('.schedule-card').forEach(card => {
    card.addEventListener('click', () => {
      const row = allSchedules.find(r => r.id === Number(card.dataset.id));
      if (row) openScheduleActions(token, row);
    });
  });
}

function openScheduleActions(token, row) {
  openActionSheet(row.subject_name || row.code, [
    { icon: 'gear', label: t('class_schedule.edit_label', 'Edit'), desc: t('class_schedule.edit_desc', 'Change day, time, or assignment'), onPress: () => openScheduleSheet(token, row) },
    { icon: 'trash', label: t('class_schedule.delete_label', 'Delete'), desc: t('class_schedule.delete_desc', 'Remove this schedule entry'), onPress: () => {
      if (!confirm(t('class_schedule.delete_confirm', 'Delete this schedule entry?'))) return;
      deleteScheduleRow(token, row.id).then(() => { showToast(t('class_schedule.deleted_toast', 'Schedule entry deleted.')); loadSchedules(token); })
        .catch(err => showToast(err && err.message ? err.message : t('class_schedule.delete_failed', 'Could not delete.')));
    }},
  ]);
}

function loadSchedules(token) {
  document.getElementById('scheduleContent').innerHTML = '<div class="list-loading">' + escapeHtml(t('common.loading', 'Loading…')) + '</div>';
  fetchAdminSchedules(token, dayFilter).then(rows => {
    allSchedules = rows;
    renderSchedule(token);
  }).catch(() => {
    document.getElementById('scheduleContent').innerHTML =
      '<div class="list-error">' + escapeHtml(t('class_schedule.load_failed', 'Failed to load the schedule.')) + '<br><button type="button" class="list-retry-btn" id="schedRetryBtn">' + escapeHtml(t('common.retry', 'Try again')) + '</button></div>';
    document.getElementById('schedRetryBtn')?.addEventListener('click', () => loadSchedules(token));
  });
}

// ── Add / Edit sheet ──
function chipRowHtml2(idPrefix, options, selectedValue) {
  return '<div class="stage-chip-row" id="' + idPrefix + 'Row">' +
    options.map(o =>
      '<button type="button" class="stage-chip' + (o.value === selectedValue ? ' selected' : '') + '" data-value="' + escapeHtml(o.value) + '">' + escapeHtml(o.label) + '</button>'
    ).join('') +
  '</div>';
}
function wireChipRow2(idPrefix, onSelect) {
  const row = document.getElementById(idPrefix + 'Row');
  row.querySelectorAll('.stage-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      row.querySelectorAll('.stage-chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      onSelect(chip.dataset.value);
    });
  });
}
function pickerRowHtml(id, labelText) {
  return '<button type="button" class="util-row" style="border:1px solid var(--card-border);border-radius:12px;background:#FAFBFA;" id="' + id + 'Btn">' +
    '<span class="util-row-title" id="' + id + 'Label">' + escapeHtml(labelText) + '</span>' + icon('chevron', { size: 16, color: 'var(--subtle)' }) +
  '</button>';
}

function ensurePickersLoaded(token) {
  if (pickers.teachers.length || pickers.subjects.length || pickers.rooms.length) return Promise.resolve(pickers);
  return Promise.all([fetchTeachersPicker(token), fetchSubjectsPicker(token), fetchRoomsPicker(token)])
    .then(([teachers, subjects, rooms]) => { pickers = { teachers, subjects, rooms }; return pickers; });
}

function openScheduleSheet(token, existing) {
  let backdrop = document.getElementById('schedSheetBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'schedSheetBackdrop';
    backdrop.className = 'sheet-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) closeScheduleSheet(); });
  }
  backdrop.innerHTML = '<div class="sheet-panel form"><div class="sheet-handle"></div><div class="sheet-title">' + escapeHtml(t('common.loading', 'Loading…')) + '</div></div>';
  backdrop.classList.add('open');

  ensurePickersLoaded(token).then(() => renderScheduleForm(token, backdrop, existing)).catch((err) => {
    closeScheduleSheet();
    showToast(err && err.message ? err.message : t('class_schedule.could_not_load_pickers', 'Could not load pickers.'));
  });
}
function closeScheduleSheet() {
  document.getElementById('schedSheetBackdrop')?.classList.remove('open');
}

function renderScheduleForm(token, backdrop, existing) {
  const isEditing = !!existing;
  let day = existing ? existing.day_of_week : 'monday';
  let subjectId = existing ? existing.subject_id : null;
  let teacherId = existing ? existing.teacher_id : null;
  let roomId = existing ? existing.room_id : null;

  const noneLabel = t('class_schedule.none', 'None');
  const unassignedLabel = t('class_schedule.unassigned', 'Unassigned');

  const subjectLabel = () => { const s = pickers.subjects.find(s => s.id === subjectId); return s ? s.name : noneLabel; };
  const teacherLabel = () => { const t = pickers.teachers.find(t => t.id === teacherId); return t ? t.name : unassignedLabel; };
  const roomLabel = () => { const r = pickers.rooms.find(r => r.id === roomId); return r ? r.name : noneLabel; };

  const dayOptions = SCHED_DAY_ORDER.map(d => ({ value: d, label: schedDayLabel(d) }));

  backdrop.innerHTML =
    '<div class="sheet-panel form">' +
      '<div class="sheet-handle"></div>' +
      '<div class="sheet-title-row"><span class="sheet-title">' + escapeHtml(isEditing ? t('class_schedule.edit_entry_title', 'Edit Schedule Entry') : t('class_schedule.add_entry_title', 'Add Schedule Entry')) + '</span>' +
        '<button type="button" class="sheet-close-btn" id="schCloseBtn">' + icon('close', { size: 16, color: 'var(--subtle)' }) + '</button></div>' +

      '<label class="util-label" style="margin-top:0;">' + escapeHtml(t('class_schedule.day_label', 'Day')) + '</label>' + chipRowHtml2('schDay', dayOptions, day) +

      '<label class="util-label">' + escapeHtml(t('class_schedule.start_time_label', 'Start Time')) + '</label>' +
      '<input type="time" id="schStart" class="util-input" value="' + (existing ? existing.starts_at.slice(0, 5) : '') + '" />' +
      '<label class="util-label">' + escapeHtml(t('class_schedule.end_time_label', 'End Time')) + '</label>' +
      '<input type="time" id="schEnd" class="util-input" value="' + (existing ? existing.ends_at.slice(0, 5) : '') + '" />' +

      '<label class="util-label">' + escapeHtml(t('class_schedule.subject_optional_label', 'Subject (optional)')) + '</label>' + pickerRowHtml('schSubject', subjectLabel()) +
      '<label class="util-label">' + escapeHtml(t('class_schedule.teacher_optional_label', 'Teacher (optional)')) + '</label>' + pickerRowHtml('schTeacher', teacherLabel()) +
      '<label class="util-label">' + escapeHtml(t('class_schedule.room_optional_label', 'Room (optional)')) + '</label>' + pickerRowHtml('schRoom', roomLabel()) +

      '<label class="util-label">' + escapeHtml(t('class_schedule.code_optional_label', 'Code (optional)')) + '</label>' +
      '<input type="text" id="schCode" class="util-input" placeholder="' + escapeHtml(t('class_schedule.code_placeholder', 'Auto-generated from the times if left blank')) + '" value="' + (existing && existing.code ? escapeHtml(existing.code) : '') + '" />' +

      '<div class="sheet-form-error" id="schFormError">' + icon('warning', { size: 14, color: '#B3261E' }) + '<span></span></div>' +

      '<div class="sheet-form-actions">' +
        '<button type="button" class="sheet-btn-secondary" id="schCancelBtn">' + escapeHtml(t('common.cancel', 'Cancel')) + '</button>' +
        '<button type="button" class="sheet-btn-primary" id="schSubmitBtn"><span id="schSubmitLabel">' + escapeHtml(isEditing ? t('class_schedule.save_changes', 'Save Changes') : t('class_schedule.add_entry', 'Add Entry')) + '</span></button>' +
      '</div>' +
    '</div>';

  document.getElementById('schCloseBtn').addEventListener('click', closeScheduleSheet);
  document.getElementById('schCancelBtn').addEventListener('click', closeScheduleSheet);
  wireChipRow2('schDay', v => { day = v; });

  document.getElementById('schSubjectBtn').addEventListener('click', () => {
    const opts = [{ key: '', label: noneLabel }, ...pickers.subjects.map(s => ({ key: String(s.id), label: s.name }))];
    openOptionSheet(t('class_schedule.subject_label', 'Subject'), opts, subjectId ? String(subjectId) : '', (key) => {
      subjectId = key ? Number(key) : null;
      document.getElementById('schSubjectLabel').textContent = subjectLabel();
      return Promise.resolve();
    });
  });
  document.getElementById('schTeacherBtn').addEventListener('click', () => {
    const opts = [{ key: '', label: unassignedLabel }, ...pickers.teachers.map(t => ({ key: String(t.id), label: t.name }))];
    openOptionSheet(t('class_schedule.meta_teacher', 'Teacher'), opts, teacherId ? String(teacherId) : '', (key) => {
      teacherId = key ? Number(key) : null;
      document.getElementById('schTeacherLabel').textContent = teacherLabel();
      return Promise.resolve();
    });
  });
  document.getElementById('schRoomBtn').addEventListener('click', () => {
    const opts = [{ key: '', label: noneLabel }, ...pickers.rooms.map(r => ({ key: String(r.id), label: r.name }))];
    openOptionSheet(t('class_schedule.meta_room', 'Room'), opts, roomId ? String(roomId) : '', (key) => {
      roomId = key ? Number(key) : null;
      document.getElementById('schRoomLabel').textContent = roomLabel();
      return Promise.resolve();
    });
  });

  document.getElementById('schSubmitBtn').addEventListener('click', () => {
    const start = document.getElementById('schStart').value;
    const end = document.getElementById('schEnd').value;
    const errorEl = document.getElementById('schFormError');
    const setError = (msg) => { errorEl.querySelector('span').textContent = msg; errorEl.classList.add('show'); };
    errorEl.classList.remove('show');
    if (!start || !end) { setError(t('class_schedule.err_times_required', 'Start and end times are required.')); return; }

    const code = document.getElementById('schCode').value.trim() || (start + '-' + end);
    const input = { code, day, starts_at: start, ends_at: end, subject_id: subjectId, teacher_id: teacherId, room_id: roomId };

    const btn = document.getElementById('schSubmitBtn');
    const label = document.getElementById('schSubmitLabel');
    btn.disabled = true;
    label.innerHTML = '<span class="util-spinner"></span>';

    const req = isEditing ? updateScheduleRow(token, existing.id, input) : saveScheduleRow(token, input);
    req.then(() => {
      closeScheduleSheet();
      showToast(isEditing ? t('class_schedule.updated_toast', 'Schedule entry updated.') : t('class_schedule.added_toast', 'Schedule entry added.'));
      loadSchedules(token);
      if (!isEditing) notifySetupItemSaved(token);
    }).catch((err) => {
      const msg = err && err.message ? err.message : t('class_schedule.save_conflict_error', 'Could not save. Check for a scheduling conflict.');
      setError(msg);
      showToast(msg);
    }).finally(() => {
      btn.disabled = false;
      label.textContent = isEditing ? t('class_schedule.save_changes', 'Save Changes') : t('class_schedule.add_entry', 'Add Entry');
    });
  });
}

onLocaleChange(() => {
  if (!schedBooted || !schedToken) return;
  renderDayFilter(schedToken);
  renderSchedule(schedToken);
});

guardDashboard(['admin', 'registrar'], function (user, token) {
  schedToken = token;
  document.getElementById('routeGuardSplash')?.remove();
  // AcademicScheduleController's write guard is admin-or-registrar (see the
  // comment on RegistrarDashboard.tsx's own Class Schedule tile), so this
  // page is reachable by both roles now - fix the back arrow to go to
  // whichever dashboard the signed-in user actually has, not always admin's.
  document.querySelector('.page-back-btn')?.setAttribute('href', dashboardUrlForRole(user.role));
  renderDayFilter(token);
  loadSchedules(token);
  schedBooted = true;
});
