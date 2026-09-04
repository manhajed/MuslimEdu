// Ported from StudentScheduleScreen.tsx - a colored subject-card grid,
// a stats row (weekly meetings/subjects/hours), and the full day-grouped
// weekly timetable. Backend: POST /my_schedules, the same read
// UpcomingClassesCard/EnrollmentStatusCard already use.

const DAY_ORDER = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
function dayLabel(day) {
  return t('student_schedule.day_' + day, day.charAt(0).toUpperCase() + day.slice(1));
}
const DAY_ABBREV = { sunday: 'SU', monday: 'M', tuesday: 'T', wednesday: 'W', thursday: 'TH', friday: 'F', saturday: 'S' };
// Same 8-color preset as SubjectFormScreen.tsx's admin color picker /
// utils/subjectColor.ts's FALLBACK_PALETTE.
const SUBJECT_PALETTE = ['#4F46E5', '#0EA5E9', '#1C1C1E', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#14B8A6'];
function subjectColor(subjectId, adminColor) {
  if (adminColor) return adminColor;
  return SUBJECT_PALETTE[Math.abs(subjectId || 0) % SUBJECT_PALETTE.length];
}
function formatTime12h(hhmm) {
  const parts = (hhmm || '00:00').slice(0, 5).split(':');
  let h = parseInt(parts[0], 10) || 0;
  const m = parts[1] || '00';
  const suffix = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return h + ':' + m + ' ' + suffix;
}

function initialsOf(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Same <img>-with-onerror-fallback pattern dashboard.js uses for the
// account avatar (absoluteUrl() + swap to an initials div if the photo
// 404s or the person just has none on file).
function teacherAvatarHtml(photo, name, cssClass) {
  const initials = escapeHtml(initialsOf(name));
  if (photo) {
    return '<span class="' + cssClass + '"><img src="' + escapeHtml(absoluteUrl(photo)) + '" alt="" ' +
      'onerror="this.parentElement.innerHTML=\'' + initials + '\'" /></span>';
  }
  return '<span class="' + cssClass + '">' + initials + '</span>';
}

function buildSubjectCards(rows) {
  const bySubject = new Map();
  rows.forEach(r => {
    if (r.subject_id == null) return;
    const list = bySubject.get(r.subject_id) || [];
    list.push(r);
    bySubject.set(r.subject_id, list);
  });
  const cards = [];
  bySubject.forEach((meetings, subjectId) => {
    const sorted = [...meetings].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    const first = sorted[0];
    const dayAbbrevs = Array.from(new Set(meetings.map(m => DAY_ABBREV[m.day_of_week]))).join(' ');
    cards.push({
      subjectId,
      name: first.subject_name || first.code,
      teacherName: first.teacher_name || null,
      teacherPhoto: first.teacher_photo || null,
      color: subjectColor(subjectId, first.subject_color),
      dayLabel: dayAbbrevs,
      time: formatTime12h(first.starts_at),
    });
  });
  return cards.sort((a, b) => a.name.localeCompare(b.name));
}

// Subject Status detail page is a student-only screen (mirrors RN, where
// only StudentScheduleScreen's SubjectCard navigates to
// StudentSubjectDetail - TeacherMyScheduleScreen has no subject cards at
// all). This page is shared by both roles, so cards stay plain/inert for
// a teacher and only become links when role === 'student'.
function subjectStatusHref(card) {
  return 'student-subject-status.php' +
    '?subjectId=' + encodeURIComponent(card.subjectId) +
    '&name=' + encodeURIComponent(card.name) +
    '&color=' + encodeURIComponent(card.color) +
    '&teacher=' + encodeURIComponent(card.teacherName || '');
}

let lastRows = null;
let lastRole = null;
let scheduleView = 'card'; // 'card' | 'table'

function renderTimetableCards(grouped) {
  const todayKey = DAY_ORDER[new Date().getDay()];
  let html = '';
  grouped.forEach(g => {
    const todayTag = g.day === todayKey ? '<span class="today-tag">' + escapeHtml(t('student_schedule.today', 'Today')) + '</span>' : '';
    html += '<div class="day-group"><div class="day-group-title">' + escapeHtml(dayLabel(g.day)) + todayTag + '</div>';
    g.items.forEach(item => {
      const badges = [];
      if (item.room_name) badges.push('<span class="schedule-badge">' + icon('idcard', { size: 12, color: 'var(--subtle)' }) + escapeHtml(item.room_name) + '</span>');
      if (item.campus_name) badges.push('<span class="schedule-badge">' + escapeHtml(item.campus_name) + '</span>');
      if (item.section_name) badges.push('<span class="schedule-badge">' + escapeHtml(item.section_name) + '</span>');
      const teacherRow = item.teacher_name
        ? '<div class="schedule-teacher-row">' +
            teacherAvatarHtml(item.teacher_photo, item.teacher_name, 'schedule-teacher-avatar') +
            '<span class="schedule-teacher-name">' + escapeHtml(item.teacher_name) + '</span>' +
          '</div>'
        : '';
      html +=
        '<div class="schedule-card">' +
          '<div class="schedule-time">' +
            '<div class="schedule-time-text">' + escapeHtml((item.starts_at || '').slice(0, 5)) + '</div>' +
            '<div class="schedule-time-to">' + escapeHtml(t('student_schedule.time_to', 'to')) + '</div>' +
            '<div class="schedule-time-text">' + escapeHtml((item.ends_at || '').slice(0, 5)) + '</div>' +
          '</div>' +
          '<div class="schedule-line"></div>' +
          '<div style="flex:1;min-width:0;">' +
            '<div class="schedule-title">' + escapeHtml(item.subject_name || item.code) +
              ' <span class="schedule-badge code">' + escapeHtml(item.code) + '</span></div>' +
            teacherRow +
            '<div class="schedule-meta-row">' + badges.join('') + '</div>' +
          '</div>' +
        '</div>';
    });
    html += '</div>';
  });
  return html;
}

function renderTimetableTable(grouped) {
  let rowsHtml = '';
  grouped.forEach(g => {
    g.items.forEach((item, i) => {
      rowsHtml +=
        '<tr>' +
          (i === 0 ? '<td class="sched-day-cell" rowspan="' + g.items.length + '">' + escapeHtml(dayLabel(g.day)) + '</td>' : '') +
          '<td class="sched-time-cell">' + escapeHtml((item.starts_at || '').slice(0, 5)) + '–' + escapeHtml((item.ends_at || '').slice(0, 5)) + '</td>' +
          '<td class="sched-subject-cell">' + escapeHtml(item.subject_name || item.code) +
            '<span class="sched-code-pill">' + escapeHtml(item.code) + '</span></td>' +
          '<td>' + escapeHtml(item.teacher_name || '—') + '</td>' +
          '<td>' + escapeHtml(item.room_name || '—') + '</td>' +
          '<td>' + escapeHtml(item.building_name || '—') + '</td>' +
          '<td>' + escapeHtml(item.campus_name || '—') + '</td>' +
          '<td>' + escapeHtml(item.section_name || '—') + '</td>' +
        '</tr>';
    });
  });

  return (
    '<div class="sched-table-wrap"><table class="sched-table">' +
      '<thead><tr><th>' + escapeHtml(t('student_schedule.col_day', 'Day')) + '</th><th>' + escapeHtml(t('student_schedule.col_time', 'Time')) + '</th><th>' + escapeHtml(t('admin_dashboard.programs_subjects_title', 'Subject')) + '</th><th>' + escapeHtml(t('student_schedule.col_teacher', 'Teacher')) + '</th><th>' + escapeHtml(t('student_schedule.col_room', 'Room')) + '</th><th>' + escapeHtml(t('student_schedule.col_building', 'Building')) + '</th><th>' + escapeHtml(t('student_schedule.col_campus', 'Campus')) + '</th><th>' + escapeHtml(t('student_schedule.col_section', 'Section')) + '</th></tr></thead>' +
      '<tbody>' + rowsHtml + '</tbody>' +
    '</table></div>'
  );
}

function renderViewToggle() {
  return (
    '<div class="sched-view-toggle" id="schedViewToggle">' +
      '<button type="button" class="sched-view-btn' + (scheduleView === 'card' ? ' active' : '') + '" data-view="card">' + escapeHtml(t('student_schedule.view_card', 'Card')) + '</button>' +
      '<button type="button" class="sched-view-btn' + (scheduleView === 'table' ? ' active' : '') + '" data-view="table">' + escapeHtml(t('student_schedule.view_table', 'Table')) + '</button>' +
    '</div>'
  );
}

function renderSchedule(rows, role) {
  lastRows = rows;
  lastRole = role;
  const wrap = document.getElementById('scheduleContent');

  if (!rows.length) {
    wrap.innerHTML =
      '<div class="list-empty">' +
        '<div class="list-empty-title">' + escapeHtml(t('student_schedule.empty_title', 'No published schedule yet')) + '</div>' +
        '<div class="list-empty-sub">' + escapeHtml(t('student_schedule.empty_sub', 'Your weekly timetable will show up here once your school publishes it.')) + '</div>' +
      '</div>';
    return;
  }

  const subjectCards = buildSubjectCards(rows);
  const subjectCount = new Set(rows.map(r => r.subject_name || r.code)).size;
  let totalMinutes = 0;
  rows.forEach(r => {
    const s = (r.starts_at || '00:00').slice(0, 5).split(':').map(Number);
    const e = (r.ends_at || '00:00').slice(0, 5).split(':').map(Number);
    const mins = (e[0] * 60 + e[1]) - (s[0] * 60 + s[1]);
    if (Number.isFinite(mins) && mins > 0) totalMinutes += mins;
  });
  const hours = totalMinutes / 60;
  const hoursLabel = hours > 0 ? (Number.isInteger(hours) ? String(hours) : hours.toFixed(1)) : '—';

  const grouped = DAY_ORDER.map(day => ({
    day,
    items: rows.filter(r => r.day_of_week === day).sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
  })).filter(g => g.items.length > 0);

  let html = '';

  if (subjectCards.length) {
    const cardTag = role === 'student' ? 'a' : 'div';
    html += '<div class="util-section-title">' + escapeHtml(t('student_schedule.my_subjects', 'My Subjects')) + '</div><div class="subject-color-grid">' +
      subjectCards.map(c =>
        '<' + cardTag + ' class="subject-color-card" style="background:' + c.color + '"' +
          (role === 'student' ? ' href="' + escapeHtml(subjectStatusHref(c)) + '"' : '') + '>' +
          '<span class="subject-color-name">' + escapeHtml(c.name) + '</span>' +
          '<span class="subject-color-teacher-row">' +
            teacherAvatarHtml(c.teacherPhoto, c.teacherName, 'subject-color-avatar') +
            '<span class="subject-color-teacher-name">' + escapeHtml(c.teacherName || '—') + '</span>' +
          '</span>' +
          '<span class="subject-color-time">' + icon('clock', { size: 11, color: 'rgba(255,255,255,0.9)' }) + escapeHtml(c.dayLabel) + ' • ' + escapeHtml(c.time) + '</span>' +
        '</' + cardTag + '>'
      ).join('') +
      '</div>';
  }

  html +=
    '<div class="stats-row">' +
      '<div class="stat-box"><div class="stat-value">' + rows.length + '</div><div class="stat-label">' + escapeHtml(t('student_schedule.weekly_meetings', 'Weekly meetings')) + '</div></div>' +
      '<div class="stat-box"><div class="stat-value">' + subjectCount + '</div><div class="stat-label">' + escapeHtml(t('admin_dashboard.programs_subjects_title', 'Subjects')) + '</div></div>' +
      '<div class="stat-box"><div class="stat-value">' + hoursLabel + '</div><div class="stat-label">' + escapeHtml(t('student_schedule.hours_per_week', 'Hours / week')) + '</div></div>' +
    '</div>';

  html += '<div class="util-section-title">' + escapeHtml(t('student_schedule.weekly_timetable', 'Weekly Timetable')) + '</div>';
  html += renderViewToggle();
  html += '<div id="timetableBody">' + (scheduleView === 'table' ? renderTimetableTable(grouped) : renderTimetableCards(grouped)) + '</div>';

  wrap.innerHTML = html;

  document.getElementById('schedViewToggle').querySelectorAll('.sched-view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.view === scheduleView) return;
      scheduleView = btn.dataset.view;
      document.getElementById('schedViewToggle').querySelectorAll('.sched-view-btn').forEach(b => b.classList.toggle('active', b === btn));
      document.getElementById('timetableBody').innerHTML = scheduleView === 'table' ? renderTimetableTable(grouped) : renderTimetableCards(grouped);
    });
  });
}
onLocaleChange(() => { if (lastRows) renderSchedule(lastRows, lastRole); });

function load(token, role) {
  document.getElementById('scheduleContent').innerHTML = '<div class="list-loading">' + escapeHtml(t('student_schedule.loading', 'Loading your schedule…')) + '</div>';
  fetchMySchedule(token).then(rows => renderSchedule(rows, role)).catch(() => {
    lastRows = null;
    document.getElementById('scheduleContent').innerHTML =
      '<div class="list-error">' + escapeHtml(t('student_schedule.load_error', 'Could not load your schedule.')) + '<br><button type="button" class="list-retry-btn" id="retryBtn">' + escapeHtml(t('common.retry', 'Try again')) + '</button></div>';
    document.getElementById('retryBtn')?.addEventListener('click', () => load(token, role));
  });
}

// Shared by both StudentScheduleScreen and TeacherMyScheduleScreen on the
// RN side - both just read the caller's own /my_schedules (the backend
// resolves teacher-vs-student rows from the token, this page doesn't need
// to know which). No expectedRole passed to guardDashboard (same pattern
// as notifications.js) so either role can land here; backHref is left null
// so the header's back button uses real browser history instead of a
// hardcoded destination that would be wrong for one of the two roles, and
// the bottom nav renders using the signed-in user's own role once known.
function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML = renderUtilHeader(t('student_dashboard.my_schedule_title', 'My Schedule'), t('student_schedule.subtitle', 'Your weekly timetable'), null, null);
}
renderHeaderText();
onLocaleChange(renderHeaderText);

guardDashboard(null, function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  document.getElementById('utilBody').style.display = '';
  document.getElementById('bottomNavWrap').innerHTML = renderBottomNav(user.role);
  load(token, user.role);
});
