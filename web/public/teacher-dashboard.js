// External file, not an inline <script> block - CSP is script-src 'self'
// with no 'unsafe-inline'. Loads after dashboard.js.
  document.getElementById('profileIcon').innerHTML = icon('person', { size: 22, color: 'rgba(255,255,255,0.85)' });
  document.getElementById('editBtn').innerHTML = icon('camera', { size: 16, color: 'rgba(255,255,255,0.85)' });
  document.getElementById('nameIcon').innerHTML = icon('person', { size: 16 });
  document.getElementById('mailIcon').innerHTML = icon('mail', { size: 16 });
  document.getElementById('codeIcon').innerHTML = icon('idcard', { size: 16 });

  // Copied from src/screens/dashboards/TeacherDashboard.tsx's quickActions
  // array, INCLUDING the orphan/non-orphan split that array itself has
  // (isOrphanSchoolUser - a teacher at an orphan school has no classes,
  // subjects, grading, curriculum, lesson plans, exams or attendance to
  // manage, since there's no class-based academic subsystem there at all
  // - same boundary AdminDashboard.tsx and admin-dashboard.js already
  // draw). Grouped into the same tinted list-row sections as the Admin/
  // SuperAdmin menu instead of a tile grid, so every role's dashboard
  // reads the same way. Title/desc go through t(key, englishFallback) -
  // re-rendered on every locale change (see onLocaleChange below) so
  // switching language re-labels this menu live.
  const TINT = {
    blue: '#0A84FF', indigo: '#5E5CE6', teal: '#2FA9B8', orange: '#FF9F0A',
    pink: '#FF3B72', red: '#FF453A', purple: '#BF5AF2', gray: '#8E8E93', gold: '#D4A64A',
  };

  function buildSections(isOrphan, isQuranTrackingSchool) {
    if (isOrphan) {
      return [
        { label: t('teacher_dashboard.group_reports', 'Reports'), items: [
          // No web page for the orphan monthly-report submission flow yet
          // (RN's Reports/orphanService.fetchReportStatus) - toasts
          // "Feature not available" instead of a 404 until that's built.
          { title: t('teacher_dashboard.my_reports_title', 'My Reports'), desc: t('teacher_dashboard.my_reports_desc', 'View your report submissions'), icon: 'document', tint: TINT.pink },
        ]},
        { label: t('alumni_dashboard.section_label', 'Account'), items: [
          { title: t('teacher_dashboard.notifications_title', 'Notifications'), desc: t('teacher_dashboard.notifications_desc', 'Stay updated with important alerts'), icon: 'bell', tint: TINT.blue, href: 'notifications.php' },
          { title: t('teacher_dashboard.security_title', 'Security'), desc: t('teacher_dashboard.security_desc', 'Two-factor authentication and device sessions'), icon: 'lock', tint: TINT.red },
          { title: t('teacher_dashboard.settings_title', 'Settings'), desc: t('teacher_dashboard.settings_desc', 'Language, theme, privacy and password'), icon: 'gear', tint: TINT.gray, href: 'account-settings.php' },
        ]},
      ];
    }
    return [
      { label: 'Classroom', items: [
        { title: t('teacher_dashboard.my_schedule_title', 'My Schedule'), desc: t('teacher_dashboard.my_schedule_desc', 'See your weekly class timetable'), icon: 'calendar', tint: TINT.blue, href: 'student-schedule.php' },
        { title: t('teacher_dashboard.take_attendance_title', 'Take Attendance'), desc: "Mark today's attendance for your classes", icon: 'clipboard', tint: TINT.teal, href: 'teacher-attendance.php' },
        { title: t('teacher_dashboard.enter_grades_title', 'Enter Grades'), desc: t('teacher_dashboard.enter_grades_desc', 'Record marks for your assigned subjects'), icon: 'star', tint: TINT.gold, href: 'teacher-grades.php' },
      ]},
      { label: 'Communication', items: [
        { title: t('teacher_dashboard.announcements_title', 'Announcements'), desc: t('teacher_dashboard.announcements_desc', 'Post updates to your classes'), icon: 'megaphone', tint: TINT.indigo },
        { title: t('teacher_dashboard.behavior_title', 'Behavior & Discipline'), desc: t('teacher_dashboard.behavior_desc', 'Log and track student behavior incidents'), icon: 'clipboard', tint: TINT.red },
      ]},
      { label: t('admin_dashboard.group_academics', 'Academics'), items: [
        { title: t('teacher_dashboard.student_progress_title', 'Student Progress'), desc: isQuranTrackingSchool ? t('teacher_dashboard.student_progress_desc_quran', 'Attendance, grades, behavior, memorization in one view') : t('teacher_dashboard.student_progress_desc', 'Attendance, grades, and behavior in one view'), icon: 'layers', tint: TINT.purple },
        { title: t('teacher_dashboard.lesson_plans_title', 'Lesson Plans'), desc: t('teacher_dashboard.lesson_plans_desc', 'Draft, submit, and revise your lesson plans'), icon: 'document', tint: TINT.orange },
        { title: t('teacher_dashboard.assessments_title', 'Assessments'), desc: 'Create assignments, quizzes, and grade submissions', icon: 'clipboard', tint: TINT.pink },
        { title: t('teacher_dashboard.assessment_grades_title', 'Assessment Grades'), desc: t('teacher_dashboard.assessment_grades_desc', 'Weighted grade breakdown for your sections'), icon: 'star', tint: TINT.gold },
        { title: t('teacher_dashboard.materials_title', 'Materials'), desc: 'Share lecture notes, slides, and other resources', icon: 'document', tint: TINT.gray },
      ]},
      { label: t('alumni_dashboard.section_label', 'Account'), items: [
        { title: t('teacher_dashboard.notifications_title', 'Notifications'), desc: t('teacher_dashboard.notifications_desc', 'Stay updated with important alerts'), icon: 'bell', tint: TINT.blue, href: 'notifications.php' },
        { title: t('teacher_dashboard.security_title', 'Security'), desc: t('teacher_dashboard.security_desc', 'Two-factor authentication and device sessions'), icon: 'lock', tint: TINT.red },
        { title: t('teacher_dashboard.settings_title', 'Settings'), desc: t('teacher_dashboard.settings_desc', 'Language, theme, privacy and password'), icon: 'gear', tint: TINT.gray, href: 'account-settings.php' },
      ]},
    ];
  }

  let lastTeacherUser = null;
  function renderSections() {
    const isOrphan = isOrphanSchoolUser(lastTeacherUser);
    const isQuranTrackingSchool = isQuranTrackingSchoolUser(lastTeacherUser);
    document.getElementById('groupsWrap').innerHTML = buildSections(isOrphan, isQuranTrackingSchool).map(s => renderGroupSection(s.label, s.items)).join('');
    document.getElementById('groupsWrap').insertAdjacentHTML('beforeend', renderLogoutFooter());
  }
  onLocaleChange(() => { if (lastTeacherUser) renderSections(); });

  document.getElementById('bottomNavWrap').innerHTML = renderBottomNav('teacher');

  guardDashboard('teacher', function (user) {
    lastTeacherUser = user;
    renderSections();

    const heroHeightPx =
      document.querySelector('.header-row').offsetHeight + document.querySelector('.glass-card').offsetHeight + 20;
    document.getElementById('heroBg').style.height = heroHeightPx + 'px';
    wireParallax('heroBg', heroHeightPx);
  });
