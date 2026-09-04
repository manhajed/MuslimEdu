// Ported from StudentQuarterlyReportScreen.tsx - general average hero
// (with an Honors pill when the school's quarterly grading system flags
// the average honors_eligible), and a per-subject Q1-Q4 breakdown.
// Backend: POST /student_quarterly_report.

let lastReportData = null;

function renderReport(data) {
  lastReportData = data;
  const wrap = document.getElementById('reportContent');
  const avg = data.general_average != null ? data.general_average.toFixed(1) : '—';
  const honors = data.honors || {};
  const subjects = data.subjects || [];

  let html =
    '<div class="qr-hero">' +
      '<div class="qr-hero-avg-label">' + escapeHtml(t('student_grades.general_average_label', 'General average')) + '</div>' +
      '<div class="qr-hero-avg">' + escapeHtml(avg) + '</div>' +
      (honors.eligible
        ? '<div class="qr-honors-pill">' + icon('star', { size: 13, color: '#FDE68A' }) + escapeHtml(honors.label || t('student_grades.honors_label', 'Honors')) + '</div>'
        : '') +
    '</div>';

  if (!subjects.length) {
    html += '<div class="doc-empty-card">' + escapeHtml(t('quarterly_report.empty', 'No quarterly results released yet.')) + '</div>';
  } else {
    html += '<div class="util-section-title">' + escapeHtml(t('admin_dashboard.programs_subjects_title', 'Subjects')) + '</div>';
    subjects.forEach(s => {
      const quarters = [
        { label: 'Q1', value: s.q1 },
        { label: 'Q2', value: s.q2 },
        { label: 'Q3', value: s.q3 },
        { label: 'Q4', value: s.q4 },
      ];
      html +=
        '<div class="qr-subject-card">' +
          '<div class="qr-subject-header-row">' +
            '<span class="qr-subject-name">' + escapeHtml(s.subject_name || '—') + '</span>' +
            '<span class="qr-avg-pill">' + (s.avg != null ? s.avg.toFixed(1) : '—') + '</span>' +
          '</div>' +
          '<div class="qr-quarter-row">' +
            quarters.map(q =>
              '<div class="qr-quarter-cell"><div class="qr-quarter-label">' + q.label + '</div>' +
                '<div class="qr-quarter-value' + (q.value == null ? ' empty' : '') + '">' + (q.value == null ? '—' : q.value) + '</div></div>'
            ).join('') +
          '</div>' +
        '</div>';
    });
  }

  wrap.innerHTML = html;
}

function load(token) {
  document.getElementById('reportContent').innerHTML = '<div class="list-loading">' + escapeHtml(t('quarterly_report.loading', 'Loading your report…')) + '</div>';
  fetchStudentQuarterlyReport(token).then(renderReport).catch(() => {
    lastReportData = null;
    document.getElementById('reportContent').innerHTML =
      '<div class="list-error">' + escapeHtml(t('quarterly_report.load_error', 'Could not load your quarterly report.')) + '<br><button type="button" class="list-retry-btn" id="retryBtn">' + escapeHtml(t('common.retry', 'Try again')) + '</button></div>';
    document.getElementById('retryBtn')?.addEventListener('click', () => load(token));
  });
}
onLocaleChange(() => { if (lastReportData) renderReport(lastReportData); });

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML = renderUtilHeader(t('student_dashboard.quarterly_report_title', 'Quarterly Report'), t('student_dashboard.quarterly_report_desc', 'Your Q1-Q4 grades and general average'), 'student-dashboard.php', null);
}
renderHeaderText();
onLocaleChange(renderHeaderText);

guardDashboard('student', function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  document.getElementById('utilBody').style.display = '';
  document.getElementById('bottomNavWrap').innerHTML = renderBottomNav('student');
  load(token);
});
