// Ported from StudentProgressScreen.tsx - attendance rate hero, a
// present/late/excused/absent breakdown grid, and released subject
// averages. Backend: POST /student_progress_summary.

let lastProgressData = null;

function renderProgress(data) {
  lastProgressData = data;
  const rate = data.attendance_rate == null ? '-' : data.attendance_rate + '%';
  const total = data.attendance_total || 0;

  const metrics = [
    { label: t('student_progress.present', 'Present'), value: data.present || 0 },
    { label: t('student_progress.late', 'Late'), value: data.late || 0 },
    { label: t('student_progress.excused', 'Excused'), value: data.excused || 0 },
    { label: t('student_progress.absent', 'Absent'), value: data.absent || 0 },
  ];

  let subjectsHtml;
  if (data.grades_available && data.subject_averages && data.subject_averages.length) {
    subjectsHtml = data.subject_averages.map(x =>
      '<div class="subject-row"><span class="subject-row-name">' + escapeHtml(x.subject_name) + '</span>' +
        '<span class="subject-row-score">' + escapeHtml(String(x.average)) + '%</span></div>'
    ).join('');
  } else {
    subjectsHtml = '<div class="doc-row-sub">' + escapeHtml(data.grades_note || t('student_progress.no_averages', 'No released subject averages yet.')) + '</div>';
  }

  document.getElementById('progressContent').innerHTML =
    '<div class="stat-hero">' +
      '<div class="stat-hero-label">' + escapeHtml(t('admin_dashboard.attendance_rate_label', 'Attendance rate')) + '</div>' +
      '<div class="stat-hero-value">' + escapeHtml(rate) + '</div>' +
      '<div class="stat-hero-sub">' + escapeHtml(t('student_progress.recorded_entries', '{count} recorded attendance entries').replace('{count}', total)) + '</div>' +
    '</div>' +
    '<div class="util-card padded">' +
      '<div class="util-section-title" style="margin-top:0;">' + escapeHtml(t('student_progress.breakdown_label', 'Attendance breakdown')) + '</div>' +
      '<div class="metric-grid">' +
        metrics.map(m =>
          '<div class="metric-cell"><div class="metric-value">' + m.value + '</div><div class="metric-label">' + escapeHtml(m.label) + '</div></div>'
        ).join('') +
      '</div>' +
    '</div>' +
    '<div class="util-card padded">' +
      '<div class="util-section-title" style="margin-top:0;">' + escapeHtml(t('student_progress.subject_averages_label', 'Subject averages')) + '</div>' +
      subjectsHtml +
    '</div>';
}

function load(token) {
  document.getElementById('progressContent').innerHTML = '<div class="list-loading">' + escapeHtml(t('student_progress.loading', 'Loading your progress…')) + '</div>';
  fetchStudentProgress(token).then(renderProgress).catch(() => {
    lastProgressData = null;
    document.getElementById('progressContent').innerHTML =
      '<div class="list-error">' + escapeHtml(t('student_progress.load_error', 'Could not load progress.')) + '<br><button type="button" class="list-retry-btn" id="retryBtn">' + escapeHtml(t('common.retry', 'Try again')) + '</button></div>';
    document.getElementById('retryBtn')?.addEventListener('click', () => load(token));
  });
}
onLocaleChange(() => { if (lastProgressData) renderProgress(lastProgressData); });

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML = renderUtilHeader(t('student_dashboard.my_progress_title', 'My Progress'), null, 'student-dashboard.php', null);
}
renderHeaderText();
onLocaleChange(renderHeaderText);

guardDashboard('student', function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  document.getElementById('utilBody').style.display = '';
  document.getElementById('bottomNavWrap').innerHTML = renderBottomNav('student');
  load(token);
});
