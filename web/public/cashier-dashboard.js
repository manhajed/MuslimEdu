// External file, not an inline <script> block - CSP is script-src 'self'
// with no 'unsafe-inline'. Loads after dashboard.js.
document.getElementById('profileIcon').innerHTML = icon('person', { size: 22, color: 'rgba(255,255,255,0.85)' });
document.getElementById('editBtn').innerHTML = icon('camera', { size: 16, color: 'rgba(255,255,255,0.85)' });
document.getElementById('nameIcon').innerHTML = icon('person', { size: 16 });
document.getElementById('mailIcon').innerHTML = icon('mail', { size: 16 });
document.getElementById('codeIcon').innerHTML = icon('idcard', { size: 16 });

// Cashier/accountant only has one real permission on the backend today
// (requireAdminOrAccountant on admin_fee_list / admin_fee_record_payment -
// "day-to-day collection", per ApiController's own comment on that guard),
// so that's the one featured row. The rest are the same role-agnostic
// utility pages every dashboard links to - nothing here is a not-wired
// placeholder. Same tinted list-row sections as the Admin/SuperAdmin menu.
// Title/desc go through t(key, englishFallback) - re-rendered on every
// locale change (see onLocaleChange below) so switching language
// re-labels this menu live.
const TINT = { emerald: '#1C1C1E', blue: '#0A84FF', gray: '#8E8E93' };

function buildSections() {
  return [
    { label: t('cashier_dashboard.section_label', 'Fees'), items: [
      { title: t('cashier_dashboard.record_payment_title', 'Collect Fees'), desc: t('cashier_dashboard.record_payment_desc', 'Look up an invoice and record a payment'), icon: 'banknote', tint: TINT.emerald, href: 'cashier-fees.php' },
    ]},
    { label: t('alumni_dashboard.section_label', 'Account'), items: [
      { title: t('cashier_dashboard.notifications_title', 'Notifications'), desc: t('cashier_dashboard.notifications_desc', 'Stay updated with important alerts'), icon: 'bell', tint: TINT.blue, href: 'notifications.php' },
      { title: t('cashier_dashboard.settings_title', 'Settings'), desc: t('cashier_dashboard.settings_desc', 'Language, theme, privacy and password'), icon: 'gear', tint: TINT.gray, href: 'account-settings.php' },
    ]},
  ];
}

function renderSections() {
  document.getElementById('groupsWrap').innerHTML = buildSections().map(s => renderGroupSection(s.label, s.items)).join('');
  document.getElementById('groupsWrap').insertAdjacentHTML('beforeend', renderLogoutFooter());
}
renderSections();
onLocaleChange(renderSections);

document.getElementById('bottomNavWrap').innerHTML = renderBottomNav('accountant');

guardDashboard('accountant', function () {
  const heroHeightPx =
    document.querySelector('.header-row').offsetHeight + document.querySelector('.glass-card').offsetHeight + 20;
  document.getElementById('heroBg').style.height = heroHeightPx + 'px';
  wireParallax('heroBg', heroHeightPx);
});
