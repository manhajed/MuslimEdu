// Taqdim Assistant landing page for the school admin. Reachable only if
// admin-dashboard.js showed the row at all (user.school_features.taqdim),
// and re-checked here both client-side (redirect away if the school's
// feature was switched off after this page was linked/bookmarked) and
// server-side by SchoolFeatureController::taqdimOverview's
// requireFeatureAccess() call. The actual case-management workflow lives
// on the two pages this links to: taqdim-translation-requirements.php
// (checklist setup) and taqdim-translation-applications.php (review
// queue) - both parameterized by ?feature=taqdim.

const TINT = { gold: '#D4A64A', blue: '#0A84FF' };

function buildSections(pendingCount) {
  return [{ label: '', items: [
    { title: t('taqdim_dashboard.requirements_title', 'Manage Requirements'), desc: t('taqdim_dashboard.requirements_desc', 'Set up the documents and questions students must complete'), icon: 'clipboard', tint: TINT.gold, href: 'taqdim-translation-requirements.php?feature=taqdim' },
    { title: t('taqdim_dashboard.applications_title', 'Review Applications'), desc: pendingCount > 0 ? t('taqdim_dashboard.applications_desc_pending', '{count} awaiting your review').replace('{count}', pendingCount) : t('taqdim_dashboard.applications_desc', 'Review, assign, and decide on student applications'), icon: 'gradcap', tint: TINT.blue, href: 'taqdim-translation-applications.php?feature=taqdim' },
  ]}];
}

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(t('taqdim_dashboard.header_title', 'Taqdim Assistant'), t('taqdim_dashboard.header_subtitle', 'Scholarship & university application assistance'), 'admin-dashboard.php');
}
renderHeaderText();
onLocaleChange(renderHeaderText);

guardDashboard('admin', function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  if (!user.school_features || !user.school_features.taqdim) {
    window.location.href = 'admin-dashboard.php';
    return;
  }
  fetchTaqdimOverview(token).then(() => {
    document.getElementById('utilBody').style.display = '';
    document.getElementById('groupsWrap').innerHTML = buildSections(0).map(s => renderGroupSection(s.label, s.items)).join('');
    // Pending count is a nice-to-have, not load-blocking - a failed/slow
    // count fetch still leaves the two navigation rows usable.
    fetchAdminTaqdimTranslationApplications(token, { feature: 'taqdim', status: 'submitted' }).then(list => {
      document.getElementById('groupsWrap').innerHTML = buildSections(list.length).map(s => renderGroupSection(s.label, s.items)).join('');
    }).catch(() => {});
  }).catch(() => {
    window.location.href = 'admin-dashboard.php';
  });
});
