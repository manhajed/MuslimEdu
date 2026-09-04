// "My Grades" — quarterly report card. Backend: POST /student_quarterly_report
// (see ApiController::student_quarterly_report's docblock for exactly how
// Q1-Q4 + general average + honors are computed). Same data source and
// shape as the RN app's StudentQuarterlyReportScreen.tsx, so this page and
// that screen read as the same feature, not two different implementations.
//
// IMPORTANT dependency: this only shows grades filed under a quarter-tagged
// ExamCategory (quarter 1-4). The teacher "Enter Grades" page no longer
// lets a teacher pick an exam category - every submit lands in the
// school's single auto-created "General" category, which has no quarter.
// So until quarter-tagged categories are actually in use for a class, this
// page will keep showing the sample banner below even after real grades
// are entered - that's expected, not a bug in this file.

const SAMPLE_SUBJECTS = [
  { subject_name: "Qur'an", q1: 90, q2: 92, q3: 94, q4: 96, avg: 93.0 },
  { subject_name: 'Hadith', q1: 93, q2: 95, q3: 97, q4: 89, avg: 93.5 },
  { subject_name: 'Tawheed', q1: 96, q2: 88, q3: 90, q4: 92, avg: 91.5 },
  { subject_name: 'Fiqh', q1: 89, q2: 91, q3: 93, q4: 95, avg: 92.0 },
  { subject_name: 'Arabic', q1: 92, q2: 94, q3: 96, q4: 88, avg: 92.5 },
  { subject_name: 'Akhlaq', q1: 95, q2: 97, q3: 89, q4: 91, avg: 93.0 },
];
const SAMPLE_GENERAL_AVERAGE = 92.58;
const SAMPLE_SESSION_LABEL = 'SY 2025-2026';
const SAMPLE_HONORS = { eligible: true, label: 'With Honors' };

function fmt2(n) {
  return n == null ? '—' : Number(n).toFixed(2);
}

function renderGradesTable(subjects) {
  const rows = subjects.map(s =>
    '<div class="mg-table-row">' +
      '<span class="mg-subject">' + escapeHtml(s.subject_name || '—') + '</span>' +
      '<span class="mg-cell">' + (s.q1 ?? '—') + '</span>' +
      '<span class="mg-cell">' + (s.q2 ?? '—') + '</span>' +
      '<span class="mg-cell">' + (s.q3 ?? '—') + '</span>' +
      '<span class="mg-cell">' + (s.q4 ?? '—') + '</span>' +
      '<span class="mg-cell mg-avg">' + fmt2(s.avg) + '</span>' +
    '</div>'
  ).join('');

  return (
    '<div class="mg-table-card">' +
      '<div class="mg-table-row mg-table-header">' +
        '<span class="mg-subject">' + escapeHtml(t('student_grades.subject_col', 'Subject')) + '</span>' +
        '<span class="mg-cell">Q1</span>' +
        '<span class="mg-cell">Q2</span>' +
        '<span class="mg-cell">Q3</span>' +
        '<span class="mg-cell">Q4</span>' +
        '<span class="mg-cell">' + escapeHtml(t('student_grades.avg_col', 'Avg')) + '</span>' +
      '</div>' +
      rows +
    '</div>'
  );
}

let lastGradesData = null;

function renderGrades(data) {
  lastGradesData = data;
  const wrap = document.getElementById('gradesContent');
  const hasReal = (data.subjects || []).length > 0;

  const subjects = hasReal ? data.subjects : SAMPLE_SUBJECTS;
  const generalAverage = hasReal ? data.general_average : SAMPLE_GENERAL_AVERAGE;
  const honors = hasReal ? (data.honors || { eligible: false, label: null }) : SAMPLE_HONORS;
  const sessionLabel = hasReal
    ? (data.session_id != null ? t('student_grades.sy_prefix', 'SY') + ' ' + escapeHtml(String(data.session_id)) : null)
    : SAMPLE_SESSION_LABEL;

  const bannerHtml = hasReal ? '' :
    '<div class="mg-notice">' +
      '<div class="mg-notice-title">' + escapeHtml(t('student_grades.sample_title', 'Sample grades')) + '</div>' +
      '<div class="mg-notice-sub">' + escapeHtml(t('student_grades.sample_sub', 'Your real grades will show here once your ustadh posts them.')) + '</div>' +
    '</div>';

  const honorsHtml = honors.eligible
    ? '<span class="mg-honors-pill">' +
        icon('star', { size: 12, color: '#fff' }) +
        '<span>' + escapeHtml(honors.label || t('student_grades.with_honors', 'With Honors')) + '</span>' +
      '</span>'
    : '<span class="mg-summary-dash">—</span>';

  wrap.innerHTML =
    bannerHtml +
    renderGradesTable(subjects) +
    '<div class="mg-summary-row">' +
      '<div class="mg-summary-card">' +
        '<div class="mg-summary-label">' + escapeHtml(t('student_grades.general_average_label', 'General Average')) + '</div>' +
        '<div class="mg-summary-value">' + fmt2(generalAverage) + '</div>' +
        (sessionLabel ? '<div class="mg-summary-sub">' + sessionLabel + '</div>' : '') +
      '</div>' +
      '<div class="mg-summary-card">' +
        '<div class="mg-summary-label">' + escapeHtml(t('student_grades.honors_label', 'Honors')) + '</div>' +
        honorsHtml +
      '</div>' +
    '</div>';
}

function load(token) {
  document.getElementById('gradesContent').innerHTML = '<div class="list-loading">' + escapeHtml(t('student_grades.loading', 'Loading your grades…')) + '</div>';
  fetchStudentQuarterlyReport(token).then(renderGrades).catch(() => {
    lastGradesData = null;
    document.getElementById('gradesContent').innerHTML =
      '<div class="list-error">' + escapeHtml(t('student_grades.load_error', 'Could not load your grades.')) + '<br><button type="button" class="list-retry-btn" id="retryBtn">' + escapeHtml(t('common.retry', 'Try again')) + '</button></div>';
    document.getElementById('retryBtn')?.addEventListener('click', () => load(token));
  });
}
onLocaleChange(() => { if (lastGradesData) renderGrades(lastGradesData); });

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML = renderUtilHeader(t('student_dashboard.my_grades_title', 'My Grades'), t('student_dashboard.my_grades_desc', 'Your quarterly grades and average.'), 'student-dashboard.php', null);
}
renderHeaderText();
onLocaleChange(renderHeaderText);

guardDashboard('student', function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  document.getElementById('utilBody').style.display = '';
  document.getElementById('bottomNavWrap').innerHTML = renderBottomNav('student');
  load(token);
});
