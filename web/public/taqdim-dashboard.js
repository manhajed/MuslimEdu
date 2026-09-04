// Taqdim Assistant landing page. Reachable only if admin-dashboard.js
// showed the row at all (user.school_features.taqdim), and re-checked
// here both client-side (redirect away if the school's feature was
// switched off after this page was linked/bookmarked) and server-side by
// SchoolFeatureController::taqdimOverview's requireFeatureAccess() call -
// see that controller's docblock for why this is just a landing page and
// not the full case-management workflow.

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
  }).catch(() => {
    window.location.href = 'admin-dashboard.php';
  });
});
