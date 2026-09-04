// External file, not an inline <script> block - CSP is script-src 'self'
// with no 'unsafe-inline', so an inline block is blocked outright. Loads
// after dashboard.js.
  document.getElementById('searchIcon').innerHTML = icon('search', { size: 17, color: 'var(--subtle)' });
  document.getElementById('searchClearBtn').innerHTML =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--subtle)" stroke-width="2.4" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>';
  document.querySelector('.icon-btn').innerHTML = icon('gear', { size: 18, color: '#fff' });

  // Deep sub-screens that don't exist on the web yet toast instead of
  // linking to a 404.
  const TINT = {
    blue: '#0A84FF', indigo: '#5E5CE6', teal: '#2FA9B8', orange: '#FF9F0A',
    pink: '#FF3B72', red: '#FF453A', purple: '#BF5AF2', gray: '#8E8E93', gold: '#D4A64A',
  };

  // Same set AdminDashboard.tsx's ACADEMIC_ADMIN_TILE_KEYS uses to hide the
  // class-based academic subsystem from orphan-school admins (they run on
  // a separate sponsorship/monthly-report model instead - see
  // AnalyticsCard.tsx's own comment on this exact boundary). Kept as the
  // full RN set, not just the subset currently wired on web, so future
  // tiles inherit the right gating by just reusing one of these keys.
  const ACADEMIC_ADMIN_TILE_KEYS = new Set([
    'setupChecklist',
    'classes', 'classesSections', 'classSchedule', 'academicSetup', 'gradingSystems', 'examCategories',
    'gradebookReview', 'announcementReview', 'lessonPlanReview',
    'assessmentReview', 'assessmentGrades', 'materialsReview',
    'programsSubjects', 'timetableConflicts', 'attendanceConfig',
    'academicFacilities', 'academicSchedule', 'academicCalendar',
    'academicAnalytics', 'completionHub', 'graduation', 'promotionPolicy',
    'documentTemplates', 'gradeRelease', 'orgStructure', 'behaviorIncidents',
    'examinations', 'studentProgress', 'analyticsExtended', 'attendance',
    'enrollment', 'studentLifecycle',
    'permissions', 'integrationSettings', 'localizationSettings',
    'authorizationAudit', 'fees', 'studentDocumentRequests',
    'studentServiceRequests', 'cashiers', 'registrars', 'idCards',
    'alumniApplications', 'notifications',
  ]);

  // title/desc go through t(key, englishFallback) - dashboard.js's t()
  // returns the fallback until a real translation loads, so this renders
  // fine before/without one. buildHero()/buildSections() are re-called
  // from renderAdminMenu() on every locale change (see onLocaleChange
  // below), not just once at load, so switching language re-labels every
  // tile without a page reload.
  function buildHero() {
    return {
      key: 'students',
      title: t('admin_dashboard.students_title', 'Students'),
      desc: t('admin_dashboard.students_desc', 'View and manage all {childLabel}').replace('{childLabel}', t('admin_dashboard.students_label', 'students')),
      icon: 'users',
    };
  }

  // Taqdim Assistant / Translation Service - regular-school features now,
  // toggled per school by the SuperAdmin (see superadmin-schools.js's
  // "Manage Features" sheet and School::getFeatures()). `school_features`
  // is added to the login/me payload by ApiController::buildUserPayload -
  // a school with neither on simply gets no "Services" group at all
  // (empty items are dropped by the s.items.length > 0 filter below).
  function buildSections(user) {
    const features = (user && user.school_features) || {};
    const serviceItems = [];
    if (features.taqdim) {
      serviceItems.push({ key: 'taqdimAssistant', title: t('admin_dashboard.taqdim_title', 'Taqdim Assistant'), desc: t('admin_dashboard.taqdim_desc', 'Manage scholarship/university application requests'), icon: 'gradcap', tint: TINT.gold, href: 'taqdim-dashboard.php' });
    }
    if (features.translation) {
      serviceItems.push({ key: 'translationService', title: t('admin_dashboard.translation_title', 'Translation Service'), desc: t('admin_dashboard.translation_desc', 'Manage document translation requests'), icon: 'globe', tint: TINT.blue, href: 'translation-dashboard.php' });
    }
    return [
      { label: t('admin_dashboard.group_people', 'People'), items: [
        { key: 'admission', title: t('admin_dashboard.admission_title', 'New Admission'), desc: t('admin_dashboard.admission_desc', 'Admit a new student into your school'), icon: 'plus', tint: TINT.pink, href: 'admission.php' },
        { key: 'walkinAdmissions', title: t('admin_dashboard.walkin_admissions_title', 'Walk-in Admissions'), desc: t('admin_dashboard.walkin_admissions_desc', 'Review students who pre-registered by QR'), icon: 'scan', tint: TINT.red, href: 'preregistrations.php' },
        { key: 'admissionManagement', title: t('admin_dashboard.admission_management_title', 'Admission Management'), desc: t('admin_dashboard.admission_management_desc', 'Configure your walk-in pre-registration QR form'), icon: 'gear', tint: TINT.orange, href: 'admission-management.php' },
        { key: 'teachers', title: t('admin_dashboard.teachers_title', 'Teachers'), desc: t('admin_dashboard.teachers_desc', 'Manage teachers and permissions'), icon: 'presentation', tint: TINT.blue, href: 'teachers-list.php' },
        { key: 'cashiers', title: t('admin_dashboard.cashiers_title', 'Cashiers'), desc: t('admin_dashboard.cashiers_desc', 'Add and manage cashier accounts'), icon: 'idcard', tint: TINT.teal, href: 'cashier-list.php' },
        { key: 'registrars', title: t('admin_dashboard.registrars_title', 'Registrars'), desc: t('admin_dashboard.registrars_desc', 'Add and manage registrar accounts'), icon: 'idcard', tint: TINT.indigo, href: 'registrar-list.php' },
        { key: 'alumni', title: t('admin_dashboard.alumni_title', 'Alumni'), desc: t('admin_dashboard.alumni_desc', 'Manage alumni accounts for this school'), icon: 'gradcap', tint: TINT.gold, href: 'alumni-list.php' },
      ]},
      { label: t('admin_dashboard.group_identity', 'Identity & Codes'), items: [
        { key: 'idCards', title: t('admin_dashboard.id_cards_title', 'ID Cards'), desc: t('admin_dashboard.id_cards_desc', 'View and export every student’s QR ID card'), icon: 'idcard', tint: TINT.purple, href: 'student-id-cards.php' },
        { key: 'staffIdCards', title: t('admin_dashboard.staff_id_cards_title', 'Staff ID Cards'), desc: t('admin_dashboard.staff_id_cards_desc', 'View and export teacher, cashier, and registrar ID cards'), icon: 'idcard', tint: TINT.purple, href: 'staff-id-cards.php' },
        { key: 'studentStaffCodes', title: t('admin_dashboard.student_staff_codes_title', 'Student & Staff Codes'), desc: t('admin_dashboard.student_staff_codes_desc', 'Set the code format for new students and staff'), icon: 'idcard', tint: TINT.pink, href: 'student-staff-codes.php' },
      ]},
      { label: t('admin_dashboard.group_academics', 'Academics'), items: [
        { key: 'classesSections', title: t('admin_dashboard.classes_sections_title', 'Classes & Sections'), desc: t('admin_dashboard.classes_sections_desc', 'Create classes and sections for this school'), icon: 'book', tint: TINT.orange, href: 'classes-sections.php' },
        { key: 'classSchedule', title: t('admin_dashboard.class_schedule_title', 'Class Schedule'), desc: t('admin_dashboard.class_schedule_desc', 'Build the weekly timetable'), icon: 'calendar', tint: TINT.indigo, href: 'class-schedule.php' },
        { key: 'enrollment', title: t('admin_dashboard.enrollment_title', 'Enrollment'), desc: t('admin_dashboard.enrollment_desc', 'Configure enrollment stages'), icon: 'layers', tint: TINT.pink, href: 'enrollment-stages.php' },
        { key: 'academicSetup', title: t('admin_dashboard.academic_setup_title', 'Academic Setup'), desc: t('admin_dashboard.academic_setup_desc', 'Manage academic years and terms'), icon: 'gear', tint: TINT.gray, href: 'academic-setup.php' },
        { key: 'gradingSystems', title: t('admin_dashboard.grading_systems_title', 'Grading Systems'), desc: t('admin_dashboard.grading_systems_desc', 'Build grading systems and grade scales'), icon: 'gradcap', tint: TINT.red, href: 'grading-systems.php' },
        { key: 'programsSubjects', title: t('admin_dashboard.programs_subjects_title', 'Subjects'), desc: t('admin_dashboard.programs_subjects_desc', 'Manage the school’s subject catalog'), icon: 'layers', tint: TINT.blue, href: 'subjects.php' },
        { key: 'academicFacilities', title: t('admin_dashboard.academic_facilities_title', 'Facilities'), desc: t('admin_dashboard.academic_facilities_desc', 'Buildings, rooms and learning spaces'), icon: 'layers', tint: TINT.gray, href: 'facilities.php' },
        { key: 'attendanceConfig', title: t('admin_dashboard.attendance_config_title', 'Attendance Config'), desc: t('admin_dashboard.attendance_config_desc', 'Statuses and capture methods for your school'), icon: 'gear', tint: TINT.teal, href: 'attendance-config.php' },
      ]},
      { label: t('admin_dashboard.group_activity', 'Activity & Requests'), items: [
        { key: 'attendance', title: t('admin_dashboard.attendance_title', 'Attendance'), desc: t('admin_dashboard.attendance_desc', 'Track daily attendance'), icon: 'calendar', tint: '#1C1C1E', href: 'attendance.php' },
        { key: 'studentDocumentRequests', title: t('admin_dashboard.student_document_requests_title', 'Document Requests'), desc: t('admin_dashboard.student_document_requests_desc', 'Issue or reject student document requests'), icon: 'document', tint: TINT.blue, href: 'document-requests.php' },
        { key: 'alumniApplications', title: t('admin_dashboard.alumni_applications_title', 'Alumni Applications'), desc: t('admin_dashboard.alumni_applications_desc', 'Review and approve self-service alumni signups'), icon: 'gradcap', tint: TINT.indigo, href: 'alumni-applications.php' },
      ]},
      { label: t('admin_dashboard.group_services', 'Services'), items: serviceItems },
      { label: t('admin_dashboard.group_settings', 'Settings'), items: [
        { key: 'accountSettings', title: t('admin_dashboard.account_settings_title', 'Account Settings'), desc: t('admin_dashboard.account_settings_desc', 'Language, theme, privacy and password'), icon: 'gear', tint: TINT.gray, href: 'account-settings.php' },
      ]},
    ];
  }

  // Renders the searchable menu for the signed-in user - called once
  // guardDashboard resolves who that is, since orphan-school admins need
  // every academic-tagged tile (and the Setup Checklist / Fee Reports
  // secondary cards, which run on the same boundary) filtered out first.
  // Also re-called on every locale change (see onLocaleChange below) with
  // the same `user`, so switching language re-renders every tile without
  // losing the orphan-school filtering.
  let lastMenuUser = null;
  function renderAdminMenu(user) {
    lastMenuUser = user;
    const hideAcademic = isOrphanSchoolUser(user);
    const visibleSections = buildSections(user)
      .map(s => ({ label: s.label, items: hideAcademic ? s.items.filter(i => !ACADEMIC_ADMIN_TILE_KEYS.has(i.key)) : s.items }))
      .filter(s => s.items.length > 0);

    const showChecklist = !hideAcademic;
    const showFees = !hideAcademic;
    const hero = buildHero();

    document.getElementById('featuredWrap').innerHTML =
      '<a class="hero-card" id="heroCard" href="students-list.php">' +
        '<div class="hero-card-top"><span class="hero-card-icon">' + icon(hero.icon, { size: 22, color: '#fff' }) + '</span>' +
        '<span class="hero-card-arrow">' + icon('arrow', { size: 17, color: '#fff' }) + '</span></div>' +
        '<div class="hero-card-title">' + hero.title + '</div><div class="hero-card-desc">' + hero.desc + '</div>' +
      '</a>' +
      (showChecklist || showFees
        ? '<div class="secondary-row" id="secondaryRow">' +
            (showChecklist
              ? '<a class="secondary-card" href="setup-checklist.php">' +
                  '<span class="ring-row" id="checklistRing">' + progressRing(0) + '<span class="secondary-num">…</span></span>' +
                  '<span class="secondary-title">' + escapeHtml(t('admin_dashboard.setup_checklist_title', 'Setup Checklist')) + '</span><span class="secondary-desc" id="checklistDesc">' + escapeHtml(t('admin_dashboard.setup_checklist_loading', 'Checking…')) + '</span>' +
                '</a>'
              : '') +
            (showFees
              ? '<a class="secondary-card" href="fee-reports.php">' +
                  '<span class="secondary-icon" style="background:var(--emerald-gradient)">' + icon('banknote', { size: 18, color: '#fff' }) + '</span>' +
                  '<span class="secondary-num" id="feeTotal">…</span>' +
                  '<span class="secondary-title">' + escapeHtml(t('admin_dashboard.fees_title', 'Fee Reports')) + '</span><span class="secondary-desc">' + escapeHtml(t('admin_dashboard.fees_collected_total', 'Total collected')) + '</span>' +
                '</a>'
              : '') +
          '</div>'
        : '');

    document.getElementById('groupsWrap').innerHTML = visibleSections.map(s => renderGroupSection(s.label, s.items)).join('');
    document.getElementById('groupsWrap').insertAdjacentHTML('beforeend', renderLogoutFooter());

    wireSearch('searchInput', { hideWhileSearching: ['heroCard', 'secondaryRow'] });

    // Re-render whatever numbers the checklist/fees fetches already
    // resolved once (see guardDashboard below) - the fresh markup above
    // just replaced them with placeholder text.
    if (showChecklist && lastChecklistProgress) renderChecklistProgress(lastChecklistProgress);
    if (showFees && lastFeeTotal != null) renderFeeTotal(lastFeeTotal);

    return { showChecklist, showFees };
  }

  onLocaleChange(() => { if (lastMenuUser) renderAdminMenu(lastMenuUser); });

  // Cached so a locale change (renderAdminMenu re-running above) can
  // redraw these with the already-fetched numbers instead of going back
  // to "…"/"Checking…" until the next poll.
  let lastChecklistProgress = null;
  let lastFeeTotal = null;
  function renderChecklistProgress({ doneCount, total }) {
    const percent = total > 0 ? (doneCount / total) * 100 : 0;
    const stepsLeft = Math.max(total - doneCount, 0);
    const ring = document.getElementById('checklistRing');
    const desc = document.getElementById('checklistDesc');
    if (ring) ring.innerHTML = progressRing(percent) + '<span class="secondary-num">' + doneCount + '/' + total + '</span>';
    if (desc) desc.textContent = stepsLeft === 0
      ? t('admin_dashboard.setup_checklist_complete', 'All set')
      : t('admin_dashboard.setup_checklist_steps_left', '{count} steps left').replace('{count}', stepsLeft);
  }
  function renderFeeTotal(total) {
    const el = document.getElementById('feeTotal');
    if (el) el.textContent = formatCompactCurrency(total);
  }

  document.getElementById('bottomNavWrap').innerHTML = renderBottomNav('admin');

// ── Academic Analytics widget (School Analytics / "Academic Analytics"
// card) — ported from AnalyticsCard.tsx. Renders into #analyticsCardWrap,
// which sits in the dark hero region between the header and the white
// body panel, same spot RN shows it right below the greeting.
function analyticsSchoolInitials(name) {
  if (!name) return '';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

// Cached so a locale change (onLocaleChange below) can redraw whichever
// state is currently showing - loading/error/loaded - with the new
// language's strings instead of waiting for the next network round-trip.
let analyticsState = null; // { type: 'loading' } | { type: 'error', token } | { type: 'data', data, school }

function renderAnalyticsError(token) {
  analyticsState = { type: 'error', token };
  document.getElementById('analyticsCardWrap').innerHTML =
    '<div class="glass-card">' +
      '<div class="analytics-error-text">' + escapeHtml(t('admin_dashboard.analytics_failed', 'Failed to load analytics.')) + '</div>' +
      '<button type="button" class="analytics-retry-btn" id="analyticsRetryBtn">' + escapeHtml(t('common.retry', 'Try again')) + '</button>' +
    '</div>';
  document.getElementById('analyticsRetryBtn').addEventListener('click', () => loadAnalyticsCard(token));
  resizeHeroForAnalytics();
}

function renderAnalyticsCard(data, school) {
  analyticsState = { type: 'data', data, school };
  const summary = data.summary || {};
  const students = summary.students || 0;
  const teachers = summary.teachers || 0;
  const sections = summary.sections || 0;
  const subjects = summary.subjects || 0;
  const attendanceRate = summary.attendance_rate == null ? null : summary.attendance_rate;
  const hasData = students > 0 || attendanceRate != null;
  const hasSchoolInfo = teachers > 0 || sections > 0 || subjects > 0;

  let html = '<div class="glass-card">';

  if (school) {
    html +=
      '<div class="analytics-school-strip">' +
        (school.logo
          ? '<img class="analytics-school-logo" src="' + escapeHtml(absoluteUrl(school.logo)) + '" alt="" />'
          : '<span class="analytics-school-logo-fallback">' +
              (school.name ? escapeHtml(analyticsSchoolInitials(school.name)) : icon('school', { size: 18, color: '#FFFFFF' })) +
            '</span>') +
        '<span class="analytics-school-info">' +
          '<div class="analytics-school-name">' + escapeHtml(school.name || t('admin_dashboard.your_school', 'Your school')) + '</div>' +
          (school.address ? '<div class="analytics-school-address">' + escapeHtml(school.address) + '</div>' : '') +
        '</span>' +
        '<a class="edit-btn" href="institution-profile.php" id="analyticsEditBtn" aria-label="Edit school profile">' + icon('pencil', { size: 15, color: '#FFFFFF' }) + '</a>' +
      '</div>';
  }

  html +=
    '<a class="analytics-header-row" href="academic-analytics.php" id="analyticsGoLink">' +
      '<span class="analytics-icon-box">' + icon('chart', { size: 24, color: '#FFFFFF' }) + '</span>' +
      '<span class="analytics-header-text">' +
        '<div class="analytics-label">' + escapeHtml(t('admin_dashboard.school_analytics_label', 'School Analytics')) + '</div>' +
        '<div class="analytics-title">' + escapeHtml(t('admin_dashboard.academic_analytics_card_title', 'Academic Analytics')) + '</div>' +
      '</span>' +
      '<span class="analytics-arrow-circle">' + icon('arrow', { size: 17, color: '#FFFFFF' }) + '</span>' +
    '</a>' +
    '<div class="analytics-subtitle">' + escapeHtml(t('admin_dashboard.analytics_subtitle', 'Students, attendance, and grades at a glance.')) + '</div>';

  if (hasData) {
    html +=
      '<div class="analytics-stats-row">' +
        '<span class="analytics-stat-chip"><span class="analytics-stat-icon-wrap">' + icon('users', { size: 15, color: '#FFFFFF' }) + '</span>' +
          '<span><div class="analytics-stat-value">' + students + '</div><div class="analytics-stat-label">' + escapeHtml(t('admin_dashboard.students_label', 'Students')) + '</div></span></span>' +
        '<span class="analytics-stat-chip"><span class="analytics-stat-icon-wrap">' + icon('calendar', { size: 15, color: '#FFFFFF' }) + '</span>' +
          '<span><div class="analytics-stat-value">' + (attendanceRate == null ? '—' : attendanceRate + '%') + '</div><div class="analytics-stat-label">' + escapeHtml(t('admin_dashboard.attendance_title', 'Attendance')) + '</div></span></span>' +
      '</div>';

    if (hasSchoolInfo) {
      html +=
        '<div class="analytics-overview">' +
          '<div class="analytics-overview-label">' + escapeHtml(t('admin_dashboard.school_overview_label', 'School Overview')) + '</div>' +
          '<div class="analytics-mini-row">' +
            '<span class="analytics-mini-stat">' + icon('gradcap', { size: 15, color: '#FFFFFF' }) + '<span class="analytics-mini-value">' + teachers + '</span><span class="analytics-mini-label">' + escapeHtml(t('admin_dashboard.teachers_title', 'Teachers')) + '</span></span>' +
            '<span class="analytics-mini-divider"></span>' +
            '<span class="analytics-mini-stat">' + icon('layers', { size: 15, color: '#FFFFFF' }) + '<span class="analytics-mini-value">' + sections + '</span><span class="analytics-mini-label">' + escapeHtml(t('admin_dashboard.sections_label', 'Sections')) + '</span></span>' +
            '<span class="analytics-mini-divider"></span>' +
            '<span class="analytics-mini-stat">' + icon('book', { size: 15, color: '#FFFFFF' }) + '<span class="analytics-mini-value">' + subjects + '</span><span class="analytics-mini-label">' + escapeHtml(t('admin_dashboard.programs_subjects_title', 'Subjects')) + '</span></span>' +
          '</div>' +
        '</div>';
    }

    if (attendanceRate != null) {
      html +=
        '<div class="analytics-progress">' +
          '<div class="analytics-progress-label-row"><span class="analytics-progress-label">' + escapeHtml(t('admin_dashboard.attendance_rate_label', 'Attendance rate')) + '</span><span class="analytics-progress-pct">' + attendanceRate + '%</span></div>' +
          '<div class="analytics-progress-track"><div class="analytics-progress-fill" id="analyticsProgressFill"></div></div>' +
        '</div>';
    }
  } else {
    html += '<div class="analytics-empty">' + escapeHtml(t('admin_dashboard.analytics_empty', 'No academic activity yet - stats will show up here once there is.')) + '</div>';
  }

  html +=
    '<a class="analytics-manage-btn" href="academic-analytics.php" id="analyticsManageLink">' +
      '<span class="analytics-manage-btn-text">' + escapeHtml(t('admin_dashboard.view_analytics', 'View Analytics')) + '</span>' + icon('arrow', { size: 15, color: 'var(--ink)' }) +
    '</a>';

  html += '</div>';

  document.getElementById('analyticsCardWrap').innerHTML = html;

  if (attendanceRate != null) {
    const fill = document.getElementById('analyticsProgressFill');
    requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.width = attendanceRate + '%'; }));
  }

  resizeHeroForAnalytics();
}

function resizeHeroForAnalytics() {
  const heroBg = document.getElementById('heroBg');
  const heroHeightPx = document.querySelector('.header-row').offsetHeight + document.getElementById('analyticsCardWrap').offsetHeight;
  heroBg.style.height = heroHeightPx + 'px';
  wireParallax('heroBg', heroHeightPx);
}

function loadAnalyticsCard(token) {
  analyticsState = { type: 'loading' };
  document.getElementById('analyticsCardWrap').innerHTML =
    '<div class="glass-card"><div class="analytics-loading-text">' + escapeHtml(t('admin_dashboard.analytics_loading', 'Loading analytics…')) + '</div></div>';
  resizeHeroForAnalytics();
  Promise.all([
    fetchAdminAcademicAnalytics(token),
    fetchAdminSchoolProfile(token).catch(() => null),
  ]).then(([data, school]) => renderAnalyticsCard(data, school))
    .catch(() => renderAnalyticsError(token));
}

// Re-render whichever analytics state is currently showing with the new
// language's strings - avoids waiting for the next network round-trip
// (or worse, staying stuck in English) just because the numbers
// themselves haven't changed.
onLocaleChange(() => {
  if (!analyticsState) return;
  if (analyticsState.type === 'data') renderAnalyticsCard(analyticsState.data, analyticsState.school);
  else if (analyticsState.type === 'error') renderAnalyticsError(analyticsState.token);
  else if (analyticsState.type === 'loading') {
    document.getElementById('analyticsCardWrap').innerHTML =
      '<div class="glass-card"><div class="analytics-loading-text">' + escapeHtml(t('admin_dashboard.analytics_loading', 'Loading analytics…')) + '</div></div>';
  }
});

// ── Orphan-school admin dashboard cards — ported from SchoolIdentityCard.tsx
// + MonthlyReportsCard.tsx. Orphan schools have no class-based academic
// data (no AnalyticsCard), so they get this pairing instead: a standalone
// school-identity strip, then a live Monthly Reports summary with real
// submitted/missing counts via /admin_orphan_report_overview - same data
// source as AdminOrphanOverviewScreen in the app, so the numbers here match
// what a teacher/admin sees when they open that screen.

function renderOrphanIdentityCard(school) {
  if (!school) return '';
  return (
    '<div class="glass-card" style="margin-bottom:16px;">' +
      '<div class="analytics-school-strip" style="border-bottom:none;padding-bottom:0;margin-bottom:0;">' +
        (school.logo
          ? '<img class="analytics-school-logo" src="' + escapeHtml(absoluteUrl(school.logo)) + '" alt="" />'
          : '<span class="analytics-school-logo-fallback">' +
              (school.name ? escapeHtml(analyticsSchoolInitials(school.name)) : icon('school', { size: 18, color: 'var(--ink)' })) +
            '</span>') +
        '<span class="analytics-school-info">' +
          '<div class="analytics-school-name">' + escapeHtml(school.name || 'Your school') + '</div>' +
          (school.address ? '<div class="analytics-school-address">' + escapeHtml(school.address) + '</div>' : '') +
        '</span>' +
        '<a class="edit-btn" href="institution-profile.php" id="orphanIdentityEditBtn" aria-label="Edit school profile">' + icon('pencil', { size: 15, color: 'var(--ink)' }) + '</a>' +
      '</div>' +
    '</div>'
  );
}

function renderOrphanReportsCard(overview) {
  const total = overview.total_count || 0;
  const submitted = overview.submitted_count || 0;
  const missing = Math.max(total - submitted, 0);
  const pct = total > 0 ? Math.round((submitted / total) * 100) : 0;

  let html = '<div class="glass-card">' +
    '<a class="analytics-header-row" href="#" id="orphanReportsGoLink">' +
      '<span class="analytics-icon-box">' + icon('filetext', { size: 24, color: 'var(--ink)' }) + '</span>' +
      '<span class="analytics-header-text">' +
        '<div class="analytics-label">MONTHLY REPORTS</div>' +
        '<div class="analytics-title">Monthly Orphan Reports</div>' +
      '</span>' +
      '<span class="analytics-arrow-circle">' + icon('arrow', { size: 17, color: 'var(--ink)' }) + '</span>' +
    '</a>' +
    '<div class="analytics-subtitle">Monitor submissions, review what\'s pending, or add a report on a guardian\'s behalf.</div>';

  if (total > 0) {
    html +=
      '<div class="analytics-stats-row">' +
        '<span class="analytics-stat-chip"><span class="analytics-stat-icon-wrap">' + icon('checkcircle', { size: 15, color: 'rgba(255,255,255,0.85)' }) + '</span>' +
          '<span><div class="analytics-stat-value">' + submitted + '</div><div class="analytics-stat-label">Submitted</div></span></span>' +
        '<span class="analytics-stat-chip"><span class="analytics-stat-icon-wrap" style="background:rgba(244,167,167,0.15);">' + icon('alertcircle', { size: 15, color: '#F4A7A7' }) + '</span>' +
          '<span><div class="analytics-stat-value">' + missing + '</div><div class="analytics-stat-label">Missing</div></span></span>' +
      '</div>' +
      '<div class="analytics-progress">' +
        '<div class="analytics-progress-label-row"><span class="analytics-progress-label">Monthly completion</span><span class="analytics-progress-pct">' + pct + '%</span></div>' +
        '<div class="analytics-progress-track"><div class="analytics-progress-fill" id="orphanReportsProgressFill"></div></div>' +
      '</div>';
  } else {
    html += '<div class="analytics-empty">No children assigned yet - reports will show up here once they are.</div>';
  }

  html +=
    '<a class="analytics-manage-btn" href="#" id="orphanReportsManageLink">' +
      '<span class="analytics-manage-btn-text">Manage Reports</span>' + icon('arrow', { size: 15, color: 'var(--ink)' }) +
    '</a>' +
  '</div>';

  return { html, pct, total };
}

function renderOrphanCardsError(token) {
  document.getElementById('analyticsCardWrap').innerHTML =
    '<div class="glass-card">' +
      '<div class="analytics-error-text">Failed to load report stats.</div>' +
      '<button type="button" class="analytics-retry-btn" id="orphanCardsRetryBtn">Try again</button>' +
    '</div>';
  document.getElementById('orphanCardsRetryBtn').addEventListener('click', () => loadOrphanDashboardCards(token));
  resizeHeroForAnalytics();
}

function loadOrphanDashboardCards(token) {
  document.getElementById('analyticsCardWrap').innerHTML =
    '<div class="glass-card"><div class="analytics-loading-text">Loading…</div></div>';
  resizeHeroForAnalytics();

  Promise.all([
    fetchAdminSchoolProfile(token).catch(() => null),
    fetchAdminOrphanReportOverview(token),
  ]).then(([school, overview]) => {
    const identityHtml = renderOrphanIdentityCard(school);
    const { html: reportsHtml, pct, total } = renderOrphanReportsCard(overview);
    document.getElementById('analyticsCardWrap').innerHTML = identityHtml + reportsHtml;

    // No AdminOrphanOverview screen on the web yet, so these toast instead
    // of linking to a page that doesn't exist - same pattern as
    // AnalyticsCard's own not-yet-wired deep links.
    document.getElementById('orphanReportsGoLink')?.addEventListener('click', (e) => { e.preventDefault(); notWiredYet(); });
    document.getElementById('orphanReportsManageLink')?.addEventListener('click', (e) => { e.preventDefault(); notWiredYet(); });

    if (total > 0) {
      const fill = document.getElementById('orphanReportsProgressFill');
      requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.width = pct + '%'; }));
    }

    resizeHeroForAnalytics();
  }).catch(() => renderOrphanCardsError(token));
}

// ── Subscription + Sync status cards — ported from SubscriptionStatusCard.tsx
// / SyncStatusCard.tsx. Sit at the top of the white body panel, above the
// "Manage" section label, for every admin regardless of orphan-school
// status (unlike the hero-area analytics cards, which do branch on that).

function subscriptionCardHtml(status, loadFailed) {
  if (loadFailed) {
    return (
      '<button type="button" class="status-card dark" id="subCardRetry">' +
        '<span class="status-card-icon" style="background:linear-gradient(135deg,var(--emerald),var(--emerald-deep));">' +
          icon('creditcard', { size: 20, color: '#fff' }) +
        '</span>' +
        '<span class="status-card-body">' +
          '<div class="status-card-title">' + escapeHtml(t('admin_dashboard.subscription_unavailable', 'Subscription status unavailable')) + '</div>' +
          '<div class="status-card-subtitle">' + escapeHtml(t('admin_dashboard.tap_to_retry', 'Tap to try again.')) + '</div>' +
        '</span>' +
        '<span class="status-card-chevron">' + icon('chevron', { size: 14, color: 'rgba(255,255,255,0.7)' }) + '</span>' +
      '</button>'
    );
  }

  if (!status) return ''; // still loading - stay quiet, same as RN

  if (status.pending_request) {
    const requestedDate = new Date(status.pending_request.requested_at).toLocaleDateString();
    return (
      '<div class="status-card dark">' +
        '<span class="status-card-icon" style="background:linear-gradient(135deg,#F59E0B,#B45309);">' +
          icon('clock', { size: 20, color: '#fff' }) +
        '</span>' +
        '<span class="status-card-body">' +
          '<span class="status-card-title-row">' +
            // status.pending_request.package is a subscription plan NAME
            // from the backend (e.g. "Free 6 Months") - real data, not UI
            // copy, so it's never run through t().
            '<span class="status-card-title">' + escapeHtml(status.pending_request.package || t('admin_dashboard.subscription_fallback', 'Subscription')) + '</span>' +
            '<span class="status-pill" style="background:rgba(255,255,255,0.08);">' +
              '<span class="status-pill-dot" style="background:#F59E0B;"></span>' +
              '<span class="status-pill-text" style="color:#F59E0B;">' + escapeHtml(t('admin_dashboard.pending_review', 'Pending review')) + '</span>' +
            '</span>' +
          '</span>' +
          '<div class="status-card-subtitle">' + escapeHtml(t('admin_dashboard.requested_prefix', 'Requested')) + ' ' + escapeHtml(requestedDate) + '</div>' +
        '</span>' +
      '</div>'
    );
  }

  const expireDate = status.expire_date != null ? Number(status.expire_date) : null;
  const isLifetime = expireDate === 0;

  let pillLabel, dotColor;
  if (status.reason === 'no_subscription') { pillLabel = t('admin_dashboard.no_subscription', 'No subscription'); dotColor = 'rgba(255,255,255,0.6)'; }
  else if (status.active) { pillLabel = t('admin_dashboard.subscription_active', 'Active'); dotColor = '#34D399'; }
  else { pillLabel = t('admin_dashboard.subscription_expired', 'Expired'); dotColor = '#F87171'; }

  let expiryLine = null;
  if (status.reason !== 'no_subscription' && expireDate != null) {
    if (isLifetime) {
      expiryLine = t('admin_dashboard.never_expires', 'Never expires');
    } else {
      const expiryDateObj = new Date(expireDate * 1000);
      const daysDiff = Math.round((expireDate * 1000 - Date.now()) / 86400000);
      const formatted = expiryDateObj.toLocaleDateString();
      if (status.active) {
        expiryLine = daysDiff <= 0
          ? (t('admin_dashboard.expires_today_prefix', 'Expires today') + ' · ' + formatted)
          : (t('admin_dashboard.renews_in_days', 'Renews in {days} days').replace('{days}', daysDiff) + ' · ' + formatted);
      } else {
        const overdueDays = Math.max(1, -daysDiff);
        expiryLine = t('admin_dashboard.expired_days_ago', 'Expired {days} days ago').replace('{days}', overdueDays) + ' · ' + formatted;
      }
    }
  }

  const iconGradient = status.active ? 'linear-gradient(135deg,var(--emerald),var(--emerald-deep))'
    : (status.reason === 'no_subscription' ? 'linear-gradient(135deg,#4B5563,#282C31)' : 'linear-gradient(135deg,#F87171,#B91C1C)');
  const subtitle = expiryLine || (status.active ? '' : t('admin_dashboard.contact_account_owner', 'Contact your account owner to activate a plan.'));

  return (
    '<a class="status-card dark" href="subscription.php" id="subCardMain">' +
      '<span class="status-card-icon" style="background:' + iconGradient + ';">' + icon('creditcard', { size: 20, color: '#fff' }) + '</span>' +
      '<span class="status-card-body">' +
        '<span class="status-card-title-row">' +
          // status.package is a subscription plan NAME from the backend -
          // real data, not UI copy, so it's never run through t() either.
          '<span class="status-card-title">' + escapeHtml(status.package || t('admin_dashboard.subscription_fallback', 'Subscription')) + '</span>' +
          '<span class="status-pill" style="background:rgba(255,255,255,0.08);">' +
            '<span class="status-pill-dot" style="background:' + dotColor + ';"></span>' +
            '<span class="status-pill-text" style="color:' + dotColor + ';">' + escapeHtml(pillLabel) + '</span>' +
          '</span>' +
        '</span>' +
        '<div class="status-card-subtitle">' + escapeHtml(subtitle) + '</div>' +
      '</span>' +
      '<span class="status-card-chevron">' + icon('chevron', { size: 14, color: 'rgba(255,255,255,0.7)' }) + '</span>' +
    '</a>'
  );
}

function syncCardHtml(isOnline, pendingCount, cachedCount) {
  const statusColor = isOnline ? 'var(--emerald)' : '#EF4444';
  const statusSoft = isOnline ? 'var(--emerald-soft)' : 'rgba(239,68,68,0.1)';
  const hasPending = pendingCount > 0;
  return (
    '<a class="status-card light" href="sync-status.php" id="syncCard">' +
      '<span class="status-card-icon" style="background:' + statusSoft + ';">' + icon('checkcircle', { size: 20, color: statusColor }) + '</span>' +
      '<span class="status-card-body">' +
        '<span class="status-card-title-row">' +
          '<span class="status-card-title">' + escapeHtml(t('admin_dashboard.offline_sync_title', 'Offline & Sync')) + '</span>' +
          '<span class="status-pill" style="background:' + statusSoft + ';">' +
            '<span class="status-pill-dot" style="background:' + statusColor + ';"></span>' +
            '<span class="status-pill-text" style="color:' + statusColor + ';">' + escapeHtml(isOnline ? t('admin_dashboard.online_status', 'Online') : t('admin_dashboard.offline_status', 'Offline')) + '</span>' +
          '</span>' +
        '</span>' +
        '<div class="status-card-subtitle">' + cachedCount + ' ' + escapeHtml(t('admin_dashboard.cached_label', 'cached')) + ' · ' + pendingCount + ' ' + escapeHtml(t('admin_dashboard.pending_upload_label', 'pending upload')) + '</div>' +
      '</span>' +
      (hasPending
        ? '<span class="status-card-badge">' + pendingCount + '</span>'
        : '<span class="status-card-chevron">' + icon('chevron', { size: 14, color: 'var(--subtle)' }) + '</span>') +
    '</a>'
  );
}

function loadSubscriptionCard(token) {
  return fetchAdminSubscriptionStatus(token).then(status => {
    subCardState.status = status;
    subCardState.failed = false;
    renderStatusCards();
  }).catch(() => {
    subCardState.status = null;
    subCardState.failed = true;
    renderStatusCards();
  });
}

function refreshSyncCard() {
  const api = window.MuslimEduOffline;
  const online = navigator.onLine;
  if (!api) { syncCardState = { online, pending: 0, cached: 0 }; renderStatusCards(); return; }
  Promise.all([api.pendingCount(), api.cachedCount()]).then(([pending, cached]) => {
    syncCardState = { online, pending, cached };
    renderStatusCards();
  }).catch(() => {
    syncCardState = { online, pending: 0, cached: 0 };
    renderStatusCards();
  });
}

let subCardState = { status: null, failed: false };
let syncCardState = { online: navigator.onLine, pending: 0, cached: 0 };

function renderStatusCards() {
  const wrap = document.getElementById('statusCardsWrap');
  wrap.innerHTML =
    subscriptionCardHtml(subCardState.status, subCardState.failed) +
    syncCardHtml(syncCardState.online, syncCardState.pending, syncCardState.cached);

  document.getElementById('subCardRetry')?.addEventListener('click', () => {
    subCardState = { status: null, failed: false };
    renderStatusCards();
    loadSubscriptionCard(currentToken);
  });
  // subCardMain and syncCard are plain <a href> now (subscription.php /
  // sync-status.php) - no click handler needed.
}
onLocaleChange(renderStatusCards);

let currentToken = null;
window.addEventListener('online', refreshSyncCard);
window.addEventListener('offline', refreshSyncCard);
window.addEventListener('muslimedu:queued', refreshSyncCard);
window.addEventListener('muslimedu:synced', refreshSyncCard);

  guardDashboard('admin', function (user, token) {
    // Measure real hero height so the dark layer's bottom edge lines up
    // with the header content.
    const heroBg = document.getElementById('heroBg');
    const heroHeightPx = document.querySelector('.header-row').offsetHeight;
    heroBg.style.height = heroHeightPx + 'px';
    wireParallax('heroBg', heroHeightPx);

    const orphan = isOrphanSchoolUser(user);
    const { showChecklist, showFees } = renderAdminMenu(user);

    currentToken = token;
    renderStatusCards();
    loadSubscriptionCard(token);
    refreshSyncCard();

    if (orphan) {
      loadOrphanDashboardCards(token);
    } else {
      loadAnalyticsCard(token);
    }

    if (showChecklist) {
      fetchSetupChecklistProgress(token).then((progress) => {
        lastChecklistProgress = progress;
        renderChecklistProgress(progress);
      }).catch(() => {
        const desc = document.getElementById('checklistDesc');
        if (desc) desc.textContent = t('admin_dashboard.setup_checklist_title', 'Setup Checklist');
      });
    }

    if (showFees) {
      fetchAdminFeeTotal(token).then((total) => {
        lastFeeTotal = total;
        renderFeeTotal(total);
      });
    }
  });
