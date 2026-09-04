// Academic Analytics - web port of AcademicAnalyticsScreen.tsx. Read-only
// school performance overview reached from the admin dashboard's
// AnalyticsCard "View Analytics" link. Same two calls as the RN screen
// (admin_academic_analytics_dashboard + _attendance_trend), plus the
// school profile for the print report's header.
//
// The RN screen's per-metric drill-down (AcademicMetricDetailScreen) and
// hand-rolled PDF writer aren't ported - the 4 snapshot cards are static
// here (their breakdown numbers already sit right below the value/sub
// text via the month/status tables), and "Export" opens the browser's own
// print dialog with a print stylesheet (@media print in dashboard.css)
// instead of building a PDF client-side, since CSP (script-src 'self')
// rules out pulling in a PDF library from a CDN. "Save as PDF" in any
// browser's print dialog gets the same end result.

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(t('academic_analytics.title', 'Academic Analytics'), t('academic_analytics.subtitle', 'Read-only school performance overview'), 'admin-dashboard.php');
}
renderHeaderText();

// renderUtilHeader has no small icon-button slot, only a full pill
// action - so the export button is appended manually, same pattern
// admin-dashboard.js already uses for its own header buttons.
const exportBtn = document.createElement('button');
exportBtn.type = 'button';
exportBtn.className = 'aa-export-btn';
exportBtn.id = 'aaExportBtn';
exportBtn.setAttribute('aria-label', t('academic_analytics.export_aria', 'Export'));
exportBtn.disabled = true;
exportBtn.innerHTML = icon('download', { size: 17, color: 'var(--ink)' });
document.querySelector('.page-header-row').appendChild(exportBtn);
exportBtn.addEventListener('click', () => { if (!exportBtn.disabled) window.print(); });

function labelize(v) {
  return v ? v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' ') : v;
}

function renderSkeletonGrid() {
  return (
    '<div class="aa-section">' + escapeHtml(t('academic_analytics.school_snapshot', 'SCHOOL SNAPSHOT')) + '</div>' +
    '<div class="aa-grid">' +
      [0, 1, 2, 3].map(() =>
        '<div class="aa-metric"><div class="aa-metric-top-row"><div class="aa-metric-icon-wrap"></div></div>' +
        '<div style="height:26px;"></div><div style="height:13px;width:70%;background:var(--card-border);border-radius:4px;"></div></div>'
      ).join('') +
    '</div>'
  );
}

function metricCard(iconKey, label, value, sub) {
  return (
    '<div class="aa-metric">' +
      '<div class="aa-metric-top-row"><span class="aa-metric-icon-wrap">' + icon(iconKey, { size: 18, color: 'var(--ink)' }) + '</span></div>' +
      '<div class="aa-metric-value">' + escapeHtml(value) + '</div>' +
      '<div class="aa-metric-label">' + escapeHtml(label) + '</div>' +
      '<div class="aa-metric-sub">' + escapeHtml(sub) + '</div>' +
    '</div>'
  );
}

function renderAnalytics(data, trend, school) {
  const content = document.getElementById('aaContent');
  const statusValues = Object.values(data.enrollment.statuses);
  const maxStatusCount = statusValues.length ? Math.max(1, ...statusValues) : 1;

  let html =
    '<div class="aa-section">' + escapeHtml(t('academic_analytics.school_snapshot', 'SCHOOL SNAPSHOT')) + '</div>' +
    '<div class="aa-grid">' +
      metricCard('users', t('academic_analytics.students', 'Students'), String(data.summary.students), t('academic_analytics.enrolled_users', 'enrolled users')) +
      metricCard('school', t('academic_analytics.teachers', 'Teachers'), String(data.summary.teachers), t('academic_analytics.teaching_users', 'teaching users')) +
      metricCard('calendar', t('academic_analytics.attendance', 'Attendance'), data.summary.attendance_rate == null ? '—' : data.summary.attendance_rate + '%', t('academic_analytics.records_count', '{n} records').replace('{n}', data.attendance.total)) +
      metricCard('star', t('academic_analytics.grade_average', 'Grade average'), data.summary.grade_average == null ? '—' : String(data.summary.grade_average), t('academic_analytics.grades_count', '{n} grades').replace('{n}', data.grades.graded_records)) +
    '</div>' +

    '<div class="aa-section">' + escapeHtml(t('academic_analytics.attendance_by_month', 'ATTENDANCE BY MONTH')) + '</div>';

  if (trend.length === 0) {
    html += '<div class="aa-muted">' + escapeHtml(t('academic_analytics.no_attendance_yet', 'No attendance records yet. Analytics stays blank instead of inventing performance.')) + '</div>';
  } else {
    html +=
      '<div class="aa-card">' +
        '<div class="aa-legend-row">' +
          '<span class="aa-legend-item"><span class="aa-legend-dot" style="background:var(--ink);"></span><span class="aa-legend-text">' + escapeHtml(t('academic_analytics.present_late', 'Present / late')) + '</span></span>' +
          '<span class="aa-legend-item"><span class="aa-legend-dot" style="background:#E2E8E4;"></span><span class="aa-legend-text">' + escapeHtml(t('academic_analytics.absent_excused', 'Absent / excused')) + '</span></span>' +
        '</div>' +
        trend.map((x, i) => {
          const total = Math.max(1, x.present + x.late + x.absent + x.excused);
          const pct = Math.min(100, ((x.present + x.late) / total) * 100);
          return (
            '<div class="aa-bar-row' + (i !== trend.length - 1 ? ' aa-row-divider' : '') + '">' +
              '<span class="aa-bar-month">' + escapeHtml(x.month) + '</span>' +
              '<span class="aa-bar-track"><span class="aa-bar-fill" style="width:' + pct + '%;"></span></span>' +
              '<span class="aa-bar-value">' + (x.present + x.late) + '/' + total + '</span>' +
            '</div>'
          );
        }).join('') +
      '</div>';
  }

  html += '<div class="aa-section">' + escapeHtml(t('academic_analytics.enrollment_statuses', 'ENROLLMENT STATUSES')) + '</div><div class="aa-card">' +
    '<div class="aa-status-head-row"><div class="aa-status-big">' + data.enrollment.active + '</div>' +
      '<div class="aa-muted" style="margin-top:2px;">' + escapeHtml(t('academic_analytics.authoritative_source', 'records returned from the authoritative enrollment source')) + '</div></div>';

  const statusEntries = Object.entries(data.enrollment.statuses);
  if (statusEntries.length === 0) {
    html += '<div class="aa-muted" style="padding:14px;">' + escapeHtml(t('academic_analytics.no_enrollment_yet', 'No enrollment records yet.')) + '</div>';
  } else {
    html += statusEntries.map(([k, v], i) =>
      '<div class="aa-status-row' + (i !== statusEntries.length - 1 ? ' aa-row-divider' : '') + '">' +
        '<span class="aa-status-name">' + escapeHtml(labelize(k)) + '</span>' +
        '<span class="aa-status-track"><span class="aa-status-fill" style="width:' + Math.max(6, (v / maxStatusCount) * 100) + '%;"></span></span>' +
        '<span class="aa-status-value">' + v + '</span>' +
      '</div>'
    ).join('');
  }
  html += '</div>';

  // Same "Feb 6, 2001" date style used everywhere else in the app
  // (academic-setup.js, students-list.js, etc.) instead of the browser's
  // raw default toLocaleString() format, plus a short time since this is
  // a "generated at" timestamp rather than a plain date.
  const generated = new Date(data.generated_at);
  const generatedLabel = generated.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ', ' + generated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  html += '<div class="aa-foot">' + escapeHtml(t('academic_analytics.generated_prefix', 'Generated {date}').replace('{date}', generatedLabel)) + '</div>';

  content.innerHTML = html;
}

let lastAnalyticsArgs = null;

function load(token) {
  document.getElementById('aaContent').innerHTML = renderSkeletonGrid();

  Promise.all([
    fetchAdminAcademicAnalytics(token),
    fetchAdminAttendanceTrend(token),
    fetchAdminSchoolProfile(token).catch(() => null),
  ]).then(([data, trend, school]) => {
    document.title = t('academic_analytics.title', 'Academic Analytics') + ' — ' + (school?.name || 'MuslimEdu');
    lastAnalyticsArgs = [data, trend, school];
    renderAnalytics(data, trend, school);
    document.getElementById('aaExportBtn').disabled = false;
  }).catch(() => {
    // Read-only overview - same fail-open as the RN screen (no separate
    // error UI, the section just stays on its skeleton/empty state).
    document.getElementById('aaContent').innerHTML =
      '<div class="list-error">' + escapeHtml(t('academic_analytics.load_failed', 'Could not load analytics.')) + '<br><button type="button" class="list-retry-btn" id="aaRetryBtn">' + escapeHtml(t('common.retry', 'Try again')) + '</button></div>';
    document.getElementById('aaRetryBtn').addEventListener('click', () => load(token));
  });
}

onLocaleChange(() => {
  renderHeaderText();
  if (lastAnalyticsArgs) renderAnalytics(...lastAnalyticsArgs);
});

guardDashboard('admin', function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  document.getElementById('aaBody').style.display = '';
  load(token);
});
