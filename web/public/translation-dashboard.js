// Translation Service landing page for the school admin - same shape as
// taqdim-dashboard.js, see that file's header comment. Links to the same
// two shared pages, parameterized by ?feature=translation instead.

const TINT = { gold: '#D4A64A', blue: '#0A84FF' };

function buildSections(pendingCount) {
  return [{ label: '', items: [
    { title: t('translation_dashboard.requirements_title', 'Manage Requirements'), desc: t('translation_dashboard.requirements_desc', 'Set up the documents and questions students must complete'), icon: 'clipboard', tint: TINT.gold, href: 'taqdim-translation-requirements.php?feature=translation' },
    { title: t('translation_dashboard.applications_title', 'Review Requests'), desc: pendingCount > 0 ? t('translation_dashboard.applications_desc_pending', '{count} awaiting your review').replace('{count}', pendingCount) : t('translation_dashboard.applications_desc', 'Review, assign, and decide on student requests'), icon: 'globe', tint: TINT.blue, href: 'taqdim-translation-applications.php?feature=translation' },
  ]}];
}

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
    document.getElementById('groupsWrap').innerHTML = buildSections(0).map(s => renderGroupSection(s.label, s.items)).join('');
    fetchAdminTaqdimTranslationApplications(token, { feature: 'translation', status: 'submitted' }).then(list => {
      document.getElementById('groupsWrap').innerHTML = buildSections(list.length).map(s => renderGroupSection(s.label, s.items)).join('');
    }).catch(() => {});
  }).catch(() => {
    window.location.href = 'admin-dashboard.php';
  });
});
