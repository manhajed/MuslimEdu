// Registrar (role_id 12) dashboard - web port of RegistrarDashboard.tsx.
// Scoped to the enrollment pipeline plus the teacher timetable, same
// pattern as cashier-dashboard.js: only rows that actually go somewhere
// real, nothing here is a not-wired placeholder except where noted below.
// Same tinted list-row sections as the Admin/SuperAdmin menu.
document.getElementById('profileIcon').innerHTML = icon('person', { size: 22, color: 'rgba(255,255,255,0.85)' });
document.getElementById('editBtn').innerHTML = icon('camera', { size: 16, color: 'rgba(255,255,255,0.85)' });
document.getElementById('nameIcon').innerHTML = icon('person', { size: 16 });
document.getElementById('mailIcon').innerHTML = icon('mail', { size: 16 });
document.getElementById('codeIcon').innerHTML = icon('idcard', { size: 16 });

// Class Schedule is real (class-schedule.php, and its guard now accepts
// admin-or-registrar to match AcademicScheduleController's own write
// guard). Enrollment Pipeline - the actual per-student "advance to next
// stage" workflow (RN's EnrollmentWorkflowList/Detail) - has no web port
// yet, so it toasts rather than pointing at enrollment-stages.php, which
// is a different screen (defining the stage list, admin-only). Title/desc
// go through t(key, englishFallback) - re-rendered on every locale change
// (see onLocaleChange below) so switching language re-labels this menu live.
const TINT = { red: '#FF453A', indigo: '#5E5CE6', blue: '#0A84FF', gray: '#8E8E93' };

function buildSections() {
  return [
    { label: t('registrar_dashboard.section_label', 'Enrollment'), items: [
      { title: t('registrar_dashboard.pipeline_title', 'Enrollment Pipeline'), desc: t('registrar_dashboard.pipeline_desc', 'View students and advance them to the next stage'), icon: 'clipboard', tint: TINT.red },
      { title: t('registrar_dashboard.walkin_admissions_title', 'Walk-in Admissions'), desc: t('registrar_dashboard.walkin_admissions_desc', 'Review students who pre-registered by QR and admit them'), icon: 'scan', tint: TINT.indigo, href: 'preregistrations.php' },
      { title: t('registrar_dashboard.schedule_title', 'Class Schedule'), desc: "Build each teacher's weekly timetable", icon: 'calendar', tint: TINT.indigo, href: 'class-schedule.php' },
    ]},
    { label: t('alumni_dashboard.section_label', 'Account'), items: [
      { title: t('registrar_dashboard.notifications_title', 'Notifications'), desc: t('registrar_dashboard.notifications_desc', 'Stay updated with important alerts'), icon: 'bell', tint: TINT.blue, href: 'notifications.php' },
      { title: t('registrar_dashboard.settings_title', 'Settings'), desc: t('registrar_dashboard.settings_desc', 'Language, theme, privacy and password'), icon: 'gear', tint: TINT.gray, href: 'account-settings.php' },
    ]},
  ];
}

function renderSections() {
  document.getElementById('groupsWrap').innerHTML = buildSections().map(s => renderGroupSection(s.label, s.items)).join('');
  document.getElementById('groupsWrap').insertAdjacentHTML('beforeend', renderLogoutFooter());
}
renderSections();
onLocaleChange(renderSections);

document.getElementById('bottomNavWrap').innerHTML = renderBottomNav('registrar');

guardDashboard('registrar', function () {
  const heroHeightPx =
    document.querySelector('.header-row').offsetHeight + document.querySelector('.glass-card').offsetHeight + 20;
  document.getElementById('heroBg').style.height = heroHeightPx + 'px';
  wireParallax('heroBg', heroHeightPx);
});
