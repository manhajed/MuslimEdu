// Scholarship & Taqdim Assistant - basic reports
// (ScholarshipProgramController::reportsSummary). Read-only snapshot,
// same aa-metric/aa-grid/aa-section visual pattern academic-analytics.js
// already established for this platform rather than introducing a new
// chart style - simple counts, not a chart library (this app's CSP is
// script-src 'self', so no CDN charting library could load here anyway,
// same constraint academic-analytics.js's own comment notes for why it
// prints instead of exporting a PDF).

function statusLabel(prefix, s) { return t(prefix + '.status_' + s, s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())); }

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

function breakdownTableHtml(counts, labelPrefix, order) {
  const keys = order || Object.keys(counts);
  const total = Object.values(counts).reduce((a, b) => a + Number(b || 0), 0);
  if (total === 0) {
    return '<div class="aa-muted">' + escapeHtml(t('scholarship_reports.no_data', 'No data yet.')) + '</div>';
  }
  return '<div class="util-card">' + keys.filter(k => counts[k]).map(k =>
    '<div class="util-row" style="pointer-events:none;">' +
      '<span class="util-row-title">' + escapeHtml(statusLabel(labelPrefix, k)) + '</span>' +
      '<span class="util-row-value">' + escapeHtml(String(counts[k])) + '</span>' +
    '</div>'
  ).join('') + '</div>';
}

function topProgramsHtml(list) {
  if (!list || list.length === 0) {
    return '<div class="aa-muted">' + escapeHtml(t('scholarship_reports.no_programs', 'No programs yet.')) + '</div>';
  }
  return '<div class="util-card">' + list.map(p =>
    '<a class="util-row" href="scholarship-applications.php?program_id=' + p.id + '">' +
      '<span class="util-row-title">' + escapeHtml(p.title) + '</span>' +
      '<span class="util-row-value">' + escapeHtml(t('scholarship_reports.applications_count', '{n} applications').replace('{n}', String(p.applications_count))) + '</span>' +
      icon('chevron', { size: 16, color: 'var(--subtle)' }) +
    '</a>'
  ).join('') + '</div>';
}

function renderReports(data) {
  const wrap = document.getElementById('reportsContent');
  wrap.innerHTML =
    '<div class="aa-section">' + escapeHtml(t('scholarship_reports.snapshot_section', 'SNAPSHOT')) + '</div>' +
    '<div class="aa-grid">' +
      metricCard('clipboard', t('scholarship_reports.programs_label', 'Programs'), String(data.totals.programs), t('scholarship_reports.programs_sub', 'scholarship programs')) +
      metricCard('inbox', t('scholarship_reports.applications_label', 'Applications'), String(data.totals.applications), t('scholarship_reports.applications_sub', 'Taqdim applications')) +
      metricCard('globe', t('scholarship_reports.translations_label', 'Translations'), String(data.totals.translations), t('scholarship_reports.translations_sub', 'requests total')) +
      metricCard('filetext', t('scholarship_reports.pending_documents_label', 'Pending Review'), String(data.pending_documents), t('scholarship_reports.pending_documents_sub', 'documents waiting')) +
    '</div>' +

    '<div class="aa-section">' + escapeHtml(t('scholarship_reports.applications_by_status_section', 'APPLICATIONS BY STATUS')) + '</div>' +
    breakdownTableHtml(data.applications_by_status, 'scholarship_translations', ['submitted', 'under_review', 'missing_documents', 'approved', 'rejected', 'withdrawn']) +

    '<div class="aa-section">' + escapeHtml(t('scholarship_reports.translations_by_status_section', 'TRANSLATIONS BY STATUS')) + '</div>' +
    breakdownTableHtml(data.translations_by_status, 'scholarship_translations', ['requested', 'assigned', 'translating', 'review', 'completed', 'cancelled']) +

    '<div class="aa-section">' + escapeHtml(t('scholarship_reports.programs_by_status_section', 'PROGRAMS BY STATUS')) + '</div>' +
    breakdownTableHtml(data.programs_by_status, 'scholarship_programs', ['draft', 'published', 'closed', 'archived']) +

    '<div class="aa-section">' + escapeHtml(t('scholarship_reports.top_programs_section', 'TOP PROGRAMS BY APPLICATIONS')) + '</div>' +
    topProgramsHtml(data.top_programs);
}

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(t('scholarship_reports.title', 'Reports'), t('scholarship_reports.subtitle', 'Read-only snapshot of scholarship activity'), 'scholarship-programs.php');
}
renderHeaderText();
onLocaleChange(renderHeaderText);

guardDashboard(['superadmin', 'platform_staff'], function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  if (!requireScholarshipStaffAccess(user)) return;
  document.getElementById('utilBody').style.display = '';
  document.getElementById('reportsContent').innerHTML = '<div class="list-loading">' + escapeHtml(t('common.loading', 'Loading…')) + '</div>';
  fetchScholarshipReportsSummary(token).then(data => {
    renderReports(data);
  }).catch(() => {
    document.getElementById('reportsContent').innerHTML = '<div class="list-error">' + escapeHtml(t('scholarship_reports.load_failed', 'Could not load reports.')) + '</div>';
  });
});
