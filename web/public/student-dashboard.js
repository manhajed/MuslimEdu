// External file, not an inline <script> block - CSP is script-src 'self'
// with no 'unsafe-inline'. Loads after dashboard.js.
  document.getElementById('profileIcon').innerHTML = icon('person', { size: 22, color: 'rgba(255,255,255,0.85)' });
  document.getElementById('editBtn').innerHTML = icon('camera', { size: 16, color: 'rgba(255,255,255,0.85)' });
  document.getElementById('nameIcon').innerHTML = icon('person', { size: 16 });
  document.getElementById('mailIcon').innerHTML = icon('mail', { size: 16 });
  document.getElementById('codeIcon').innerHTML = icon('idcard', { size: 16 });

  // Copied from src/screens/dashboards/StudentDashboard.tsx's quickActions
  // array, INCLUDING the orphan/non-orphan split that array itself has
  // (isOrphanSchoolUser - an orphan child has no classes/subjects/grading
  // to have "progress", a "schedule" or "grades" on, so those tiles (and
  // Documents, which requests report cards/COR from a class-based record
  // that doesn't exist there) are hidden entirely; My Reports and an
  // orphan-worded Upload Documents take their place - same boundary
  // AdminDashboard.tsx/admin-dashboard.js and TeacherDashboard.tsx/
  // teacher-dashboard.js already draw). Grouped into the same tinted
  // list-row sections as the Admin/SuperAdmin menu instead of a tile
  // grid, so every role's dashboard reads the same way. Title/desc go
  // through t(key, englishFallback) - re-rendered on every locale change
  // (see onLocaleChange below) so switching language re-labels this menu
  // live.
  const TINT = {
    blue: '#0A84FF', indigo: '#5E5CE6', teal: '#2FA9B8', orange: '#FF9F0A',
    pink: '#FF3B72', red: '#FF453A', purple: '#BF5AF2', gray: '#8E8E93', gold: '#D4A64A',
  };

  function buildSections(isOrphan) {
    if (isOrphan) {
      return [
        { label: t('student_dashboard.group_reports', 'Reports'), items: [
          // No web page for the orphan monthly-report submission flow yet
          // (RN's OrphanReport/orphanService.fetchReportStatus) - toasts
          // "Feature not available" instead of a 404 until that's built.
          { title: t('student_dashboard.my_reports_title', 'My Reports'), desc: t('student_dashboard.my_reports_desc', 'View your report submissions'), icon: 'document', tint: TINT.pink },
        ]},
        { label: 'Identity & Documents', items: [
          { title: t('student_dashboard.upload_documents_title', 'Upload Documents'), desc: t('student_dashboard.upload_documents_desc_orphan', 'Submit your ID, guardian consent and other files'), icon: 'document', tint: TINT.teal, href: 'student-upload-documents.php' },
        ]},
        { label: 'Support', items: [
          { title: t('student_dashboard.services_title', 'Services'), desc: t('student_dashboard.services_desc', 'Guidance, counselling and other requests'), icon: 'clipboard', tint: TINT.pink, href: 'student-services.php' },
          { title: t('student_dashboard.scholarships_title', 'Scholarships'), desc: t('student_dashboard.scholarships_desc', 'Browse scholarships and manage your Taqdim applications'), icon: 'gradcap', tint: TINT.gold, href: 'scholarship-browse.php' },
          { title: t('student_dashboard.scholarship_documents_title', 'Scholarship Documents'), desc: t('student_dashboard.scholarship_documents_desc', 'Documents you have uploaded for scholarship applications'), icon: 'filetext', tint: TINT.teal, href: 'scholarship-documents.php' },
        ]},
        { label: t('alumni_dashboard.section_label', 'Account'), items: [
          { title: t('student_dashboard.notifications_title', 'Notifications'), desc: t('student_dashboard.notifications_desc', 'Stay updated with important alerts'), icon: 'bell', tint: TINT.blue, href: 'notifications.php' },
          { title: t('student_dashboard.settings_title', 'Settings'), desc: t('student_dashboard.settings_desc', 'Language, theme, privacy and password'), icon: 'gear', tint: TINT.gray, href: 'account-settings.php' },
        ]},
      ];
    }
    return [
      { label: 'My Learning', items: [
        { title: t('student_dashboard.my_progress_title', 'My Progress'), desc: t('student_dashboard.my_progress_desc', 'Track your learning progress'), icon: 'layers', tint: TINT.purple, href: 'student-progress.php' },
        { title: t('student_dashboard.my_schedule_title', 'My Schedule'), desc: t('student_dashboard.my_schedule_desc', 'See your weekly class timetable'), icon: 'calendar', tint: TINT.blue, href: 'student-schedule.php' },
        { title: t('student_dashboard.my_grades_title', 'My Grades'), desc: t('student_dashboard.my_grades_desc', 'See your grades and GPA by subject'), icon: 'star', tint: TINT.gold, href: 'student-grades.php' },
        { title: t('student_dashboard.quarterly_report_title', 'Quarterly Report'), desc: t('student_dashboard.quarterly_report_desc', 'Your Q1-Q4 grades and general average'), icon: 'document', tint: TINT.indigo, href: 'student-quarterly-report.php' },
      ]},
      { label: 'Identity & Documents', items: [
        { title: t('student_dashboard.my_id_card_title', 'My ID Card'), desc: t('student_dashboard.my_id_card_desc', 'View and export your QR ID card'), icon: 'idcard', tint: TINT.purple, href: 'student-id-card.php' },
        { title: t('student_dashboard.documents_title', 'Documents'), desc: t('student_dashboard.documents_desc', 'Request report cards, COR and certificates'), icon: 'document', tint: TINT.orange, href: 'student-documents.php' },
        { title: t('student_dashboard.upload_documents_title', 'Upload Documents'), desc: 'Submit your ID, medical records and other files', icon: 'document', tint: TINT.teal, href: 'student-upload-documents.php' },
      ]},
      { label: 'Support', items: [
        { title: t('student_dashboard.services_title', 'Services'), desc: t('student_dashboard.services_desc', 'Guidance, counselling and other requests'), icon: 'clipboard', tint: TINT.pink, href: 'student-services.php' },
        // Platform-wide, not tied to a class-based academic record - see
        // ScholarshipApplicationController's own header comment - so this
        // sits in Support for both orphan and non-orphan students rather
        // than gated behind My Learning.
        { title: t('student_dashboard.scholarships_title', 'Scholarships'), desc: t('student_dashboard.scholarships_desc', 'Browse scholarships and manage your Taqdim applications'), icon: 'gradcap', tint: TINT.gold, href: 'scholarship-browse.php' },
        { title: t('student_dashboard.scholarship_documents_title', 'Scholarship Documents'), desc: t('student_dashboard.scholarship_documents_desc', 'Documents you have uploaded for scholarship applications'), icon: 'filetext', tint: TINT.teal, href: 'scholarship-documents.php' },
      ]},
      { label: t('alumni_dashboard.section_label', 'Account'), items: [
        { title: t('student_dashboard.notifications_title', 'Notifications'), desc: t('student_dashboard.notifications_desc', 'Stay updated with important alerts'), icon: 'bell', tint: TINT.blue, href: 'notifications.php' },
        { title: t('student_dashboard.settings_title', 'Settings'), desc: t('student_dashboard.settings_desc', 'Language, theme, privacy and password'), icon: 'gear', tint: TINT.gray, href: 'account-settings.php' },
      ]},
    ];
  }

  let lastStudentUser = null;
  function renderSections() {
    const isOrphan = isOrphanSchoolUser(lastStudentUser);
    document.getElementById('groupsWrap').innerHTML = buildSections(isOrphan).map(s => renderGroupSection(s.label, s.items)).join('');
    document.getElementById('groupsWrap').insertAdjacentHTML('beforeend', renderLogoutFooter());
  }
  onLocaleChange(() => { if (lastStudentUser) renderSections(); });

  document.getElementById('bottomNavWrap').innerHTML = renderBottomNav('student');

  guardDashboard('student', function (user) {
    lastStudentUser = user;
    renderSections();

    const heroHeightPx =
      document.querySelector('.header-row').offsetHeight + document.querySelector('.glass-card').offsetHeight + 20;
    document.getElementById('heroBg').style.height = heroHeightPx + 'px';
    wireParallax('heroBg', heroHeightPx);
  });
