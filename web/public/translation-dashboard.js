// Translation Service landing page - same shape/reasoning as
// taqdim-dashboard.js, see that file's header comment.

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(t('translation_dashboard.header_title', 'Translation Service'), t('translation_dashboard.header_subtitle', 'Document translation request management'), 'admin-dashboard.php');
}
renderHeaderText();
onLocaleChange(renderHeaderText);

guardDashboard('admin', function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  if (!user.school_features || !user.school_features.translation) {
    window.location.href = 'admin-dashboard.php';
    return;
  }
  fetchTranslationOverview(token).then(() => {
    document.getElementById('utilBody').style.display = '';
  }).catch(() => {
    window.location.href = 'admin-dashboard.php';
  });
});
