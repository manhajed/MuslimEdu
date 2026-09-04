// External file, not an inline <script> block - CSP is script-src 'self'
// with no 'unsafe-inline'. Loads after dashboard.js.
document.getElementById('profileIcon').innerHTML = icon('person', { size: 22, color: 'rgba(255,255,255,0.85)' });
document.getElementById('editBtn').innerHTML = icon('camera', { size: 16, color: 'rgba(255,255,255,0.85)' });
document.getElementById('nameIcon').innerHTML = icon('person', { size: 16 });
document.getElementById('mailIcon').innerHTML = icon('mail', { size: 16 });

// Alumni has no self-service endpoints of its own on the backend yet
// beyond /me - only the role-agnostic utility pages every dashboard links
// to are real here. No not-wired filler rows for features that don't
// exist anywhere (not even in the app), unlike the other dashboards which
// mirror screens that already exist on mobile. Same tinted list-row
// section as the Admin/SuperAdmin menu. Title/desc go through
// t(key, englishFallback) - re-rendered on every locale change (see
// onLocaleChange below) so switching language re-labels this menu live.
const TINT = { blue: '#0A84FF', gray: '#8E8E93' };

function buildSections() {
  return [
    { label: t('alumni_dashboard.section_label', 'Account'), items: [
      { title: t('alumni_dashboard.notifications_title', 'Notifications'), desc: t('alumni_dashboard.notifications_desc', 'Stay updated with important alerts'), icon: 'bell', tint: TINT.blue, href: 'notifications.php' },
      { title: t('alumni_dashboard.settings_title', 'Settings'), desc: t('alumni_dashboard.settings_desc', 'Language, theme, privacy and password'), icon: 'gear', tint: TINT.gray, href: 'account-settings.php' },
    ]},
  ];
}

function renderSections() {
  document.getElementById('groupsWrap').innerHTML = buildSections().map(s => renderGroupSection(s.label, s.items)).join('');
  document.getElementById('groupsWrap').insertAdjacentHTML('beforeend', renderLogoutFooter());
}
renderSections();
onLocaleChange(renderSections);

document.getElementById('bottomNavWrap').innerHTML = renderBottomNav('alumni');

guardDashboard('alumni', function () {
  const heroHeightPx =
    document.querySelector('.header-row').offsetHeight + document.querySelector('.glass-card').offsetHeight + 20;
  document.getElementById('heroBg').style.height = heroHeightPx + 'px';
  wireParallax('heroBg', heroHeightPx);
});
