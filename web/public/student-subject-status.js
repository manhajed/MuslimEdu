// Ported from StudentSubjectDetailScreen.tsx - reached by tapping a
// subject card on StudentScheduleScreen ("show all details of his grades,
// attendance and many more" for one subject). Entirely client-side
// filtering over data the other student tabs already fetch: fetchMySchedule
// for meeting times/room/units, fetchStudentGrades (/marks) for this
// subject's released marks by exam category, fetchStudentAttendance
// (/attendance) for this month's subject-tagged attendance marks. No new
// backend endpoint, same as those tabs.

const DAY_ORDER = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_FALLBACK = { sunday: 'Sunday', monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday' };
function dayLabel(day) { return t('student_schedule.day_' + day, DAY_FALLBACK[day] || ''); }
// Same 8-color preset as student-schedule.js/SubjectFormScreen.tsx's admin
// color picker / utils/subjectColor.ts's FALLBACK_PALETTE.
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

// Route params, read the same way student-schedule.js built the link:
// ?subjectId=&name=&color=&teacher= - used for an instant header/hero
// before the network responses land, same role real navigation params
// play in the RN screen.
const routeParams = new URLSearchParams(window.location.search);
const subjectId = parseInt(routeParams.get('subjectId'), 10);
const paramName = routeParams.get('name') || '';
const paramColor = routeParams.get('color') || '';
const paramTeacher = routeParams.get('teacher') || '';
let lastLoadArgs = null;

function renderSubjectStatus(schedule, grades, attendance) {
  lastLoadArgs = [schedule, grades, attendance];
  const wrap = document.getElementById('subjectStatusContent');

  const scheduleRows = DAY_ORDER
    .map(day => schedule.filter(r => r.day_of_week === day && r.subject_id === subjectId))
    .flat()
    .sort((a, b) => DAY_ORDER.indexOf(a.day_of_week) - DAY_ORDER.indexOf(b.day_of_week) || a.starts_at.localeCompare(b.starts_at));

  const subjectName = paramName || scheduleRows[0]?.subject_name || scheduleRows[0]?.code || t('student_subject_status.subject_fallback', 'Subject');
  const color = paramColor || subjectColor(subjectId, scheduleRows[0]?.subject_color);
  const teacherName = paramTeacher || scheduleRows[0]?.teacher_name || null;
  const units = scheduleRows[0]?.units;

  const subjectAttendance = attendance.filter(a => a.subject_id === subjectId);
  const counts = { present: 0, late: 0, absent: 0, excused: 0 };
  subjectAttendance.forEach(a => {
    const s = (a.status || '').toLowerCase();
    if (s === 'present') counts.present++;
    else if (s === 'late') counts.late++;
    else if (s === 'absent') counts.absent++;
    else if (s === 'excused') counts.excused++;
  });
  const attendanceTotal = counts.present + counts.late + counts.absent + counts.excused;
  const attendanceRateLabel = attendanceTotal > 0 ? Math.round((counts.present / attendanceTotal) * 100) + '%' : '—';

  const gradeRows = (grades.exam_marks || [])
    .map(cat => {
      const subj = (cat.subjects || []).find(s => s.subject_id === subjectId);
      return subj ? { categoryName: cat.exam_category_name || t('student_subject_status.exam_fallback', 'Exam'), marks: subj.marks } : null;
    })
    .filter(Boolean);

  let html = '';

  // Overview hero
  html +=
    '<div class="subject-status-hero" style="background:' + color + '">' +
      '<div class="subject-status-hero-top">' +
        '<span class="subject-status-avatar">' + escapeHtml(initialsOf(teacherName)) + '</span>' +
        '<div class="subject-status-hero-info">' +
          '<div class="subject-status-hero-name">' + escapeHtml(subjectName) + '</div>' +
          '<div class="subject-status-hero-teacher">' + icon('person', { size: 12, color: 'rgba(255,255,255,0.9)' }) + escapeHtml(teacherName || t('student_subject_status.teacher_unassigned', 'Teacher not assigned')) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="subject-status-stats-row">' +
        '<div class="subject-status-stat"><div class="subject-status-stat-value">' + scheduleRows.length + '</div><div class="subject-status-stat-label">' + escapeHtml(t('student_subject_status.meetings_per_week', 'Meetings / wk')) + '</div></div>' +
        '<div class="subject-status-stat-divider"></div>' +
        '<div class="subject-status-stat"><div class="subject-status-stat-value">' + (units != null ? escapeHtml(String(units)) : '—') + '</div><div class="subject-status-stat-label">' + escapeHtml(t('student_subject_status.units', 'Units')) + '</div></div>' +
        '<div class="subject-status-stat-divider"></div>' +
        '<div class="subject-status-stat"><div class="subject-status-stat-value">' + attendanceRateLabel + '</div><div class="subject-status-stat-label">' + escapeHtml(t('student_subject_status.attendance', 'Attendance')) + '</div></div>' +
      '</div>' +
    '</div>';

  // Weekly schedule
  html += '<div class="util-section-title">' + escapeHtml(t('student_subject_status.weekly_schedule', 'Weekly Schedule')) + '</div>';
  if (!scheduleRows.length) {
    html += '<div class="util-card padded"><div class="doc-row-sub" style="text-align:center;">' + escapeHtml(t('student_subject_status.no_schedule', 'No published class times for this subject yet.')) + '</div></div>';
  } else {
    scheduleRows.forEach(item => {
      const badges = [];
      if (item.room_name) badges.push('<span class="schedule-badge">' + icon('idcard', { size: 12, color: 'var(--subtle)' }) + escapeHtml(item.room_name) + '</span>');
      if (item.campus_name) badges.push('<span class="schedule-badge">' + escapeHtml(item.campus_name) + '</span>');
      html +=
        '<div class="schedule-card">' +
          '<div class="schedule-time">' +
            '<div class="schedule-time-text">' + escapeHtml((item.starts_at || '').slice(0, 5)) + '</div>' +
            '<div class="schedule-time-to">' + escapeHtml(t('student_schedule.time_to', 'to')) + '</div>' +
            '<div class="schedule-time-text">' + escapeHtml((item.ends_at || '').slice(0, 5)) + '</div>' +
          '</div>' +
          '<div class="schedule-line"></div>' +
          '<div style="flex:1;min-width:0;">' +
            '<div class="schedule-title">' + escapeHtml(dayLabel(item.day_of_week)) + '</div>' +
            '<div class="schedule-meta-row">' + badges.join('') + '</div>' +
          '</div>' +
        '</div>';
    });
  }

  // Grades
  html += '<div class="util-section-title">' + escapeHtml(t('student_subject_status.grades', 'Grades')) + '</div>';
  if (!gradeRows.length) {
    html += '<div class="util-card padded"><div class="doc-row-sub" style="text-align:center;">' + escapeHtml(t('student_subject_status.no_grades', 'No grades recorded for this subject yet.')) + '</div></div>';
  } else {
    html += '<div class="exam-card">' +
      gradeRows.map(g =>
        '<div class="subject-row"><span class="subject-row-name">' + escapeHtml(g.categoryName) + '</span>' +
          '<span class="subject-row-score">' + escapeHtml(String(g.marks)) + '</span></div>'
      ).join('') +
      '</div>';
  }

  // Attendance
  html += '<div class="util-section-title">' + escapeHtml(t('student_subject_status.attendance_this_month', 'Attendance This Month')) + '</div>';
  html +=
    '<div class="util-card padded">' +
      '<div class="metric-grid">' +
        '<div class="metric-cell"><div class="metric-value">' + counts.present + '</div><div class="metric-label">' + escapeHtml(t('student_progress.present', 'Present')) + '</div></div>' +
        '<div class="metric-cell"><div class="metric-value">' + counts.late + '</div><div class="metric-label">' + escapeHtml(t('student_progress.late', 'Late')) + '</div></div>' +
        '<div class="metric-cell"><div class="metric-value">' + counts.excused + '</div><div class="metric-label">' + escapeHtml(t('student_progress.excused', 'Excused')) + '</div></div>' +
        '<div class="metric-cell"><div class="metric-value">' + counts.absent + '</div><div class="metric-label">' + escapeHtml(t('student_progress.absent', 'Absent')) + '</div></div>' +
      '</div>' +
      (attendanceTotal === 0 ? '<div class="doc-row-sub" style="text-align:center;">' + escapeHtml(t('student_subject_status.no_attendance', 'No subject-specific attendance recorded this month.')) + '</div>' : '') +
    '</div>';

  wrap.innerHTML = html;
}

function load(token) {
  if (!Number.isFinite(subjectId)) {
    document.getElementById('subjectStatusContent').innerHTML =
      '<div class="list-empty">' +
        '<div class="list-empty-title">' + escapeHtml(t('student_subject_status.not_found_title', 'Subject not found')) + '</div>' +
        '<div class="list-empty-sub">' + escapeHtml(t('student_subject_status.not_found_sub', 'Open this page by tapping a subject card on My Schedule.')) + '</div>' +
      '</div>';
    return;
  }
  document.getElementById('subjectStatusContent').innerHTML = '<div class="list-loading">' + escapeHtml(t('student_subject_status.loading', 'Loading subject…')) + '</div>';
  const now = new Date();
  Promise.all([
    fetchMySchedule(token),
    fetchStudentGrades(token),
    fetchStudentAttendance(token, now.getMonth() + 1, now.getFullYear()),
  ]).then(([schedule, grades, attendance]) => renderSubjectStatus(schedule, grades, attendance))
    .catch(() => {
      document.getElementById('subjectStatusContent').innerHTML =
        '<div class="list-error">' + escapeHtml(t('student_subject_status.load_failed', 'Could not load this subject.')) + '<br><button type="button" class="list-retry-btn" id="retryBtn">' + escapeHtml(t('common.retry', 'Try again')) + '</button></div>';
      document.getElementById('retryBtn')?.addEventListener('click', () => load(token));
    });
}

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML = renderUtilHeader(paramName || t('student_subject_status.subject_fallback', 'Subject'), t('student_subject_status.header_subtitle', 'Grades, attendance and schedule'), 'student-schedule.php', null);
}
renderHeaderText();
onLocaleChange(() => { renderHeaderText(); if (lastLoadArgs) renderSubjectStatus(...lastLoadArgs); });

guardDashboard('student', function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  document.getElementById('utilBody').style.display = '';
  document.getElementById('bottomNavWrap').innerHTML = renderBottomNav(user.role);
  load(token);
});
