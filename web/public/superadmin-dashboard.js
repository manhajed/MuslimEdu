// External file, not an inline <script> block - CSP is script-src 'self'
// with no 'unsafe-inline'. Loads after dashboard.js.
  document.querySelector('.icon-btn').innerHTML = icon('gear', { size: 18, color: '#fff' });

  // Same tinted list-row sections as the Admin dashboard menu, instead of
  // the plain 2-up tile grid this used to be. Titles/descs go through
  // t(key, englishFallback) - dashboard.js's t() returns the fallback
  // until a real translation loads, so this renders fine before/without
  // one. renderSections() re-runs on every locale change (see
  // onLocaleChange below) to pick up whatever just loaded.
  const TINT = {
    blue: '#0A84FF', indigo: '#5E5CE6', teal: '#2FA9B8', orange: '#FF9F0A',
    pink: '#FF3B72', red: '#FF453A', purple: '#BF5AF2', gray: '#8E8E93', gold: '#D4A64A',
  };

  // Set once guardDashboard resolves who's actually looking at this page -
  // see guardDashboard() below. Every render function reads this instead
  // of taking a parameter, since renderSections() is also called bare from
  // onLocaleChange().
  let currentUser = null;

  // A platform_staff member (role_id 13) only sees the Platform/Operations/
  // Moderation rows that match a scope they were actually granted in Team &
  // Staff (see SuperAdminApiController::STAFF_PERMISSIONS) - full_access
  // (or being the real superadmin) sees everything, same short-circuit as
  // requireTeamManage() on the backend. Before this, every row rendered for
  // every staff member regardless of what was checked when they were
  // added - a support-only account looked exactly like a full Super Admin
  // because nothing here ever read `permissions` at all.
  function hasScope(scope) {
    if (!currentUser || currentUser.role !== 'platform_staff') return true; // real SuperAdmin
    if (currentUser.full_access) return true;
    return Array.isArray(currentUser.permissions) && currentUser.permissions.includes(scope);
  }

  function buildSections() {
    const schoolsItems = [];
    if (hasScope('schools')) {
      schoolsItems.push(
        { key: 'schools', title: t('superadmin_dashboard.schools_title', 'Schools'), desc: t('superadmin_dashboard.schools_desc', 'Add, edit, disable schools and manage their features'), icon: 'school', tint: TINT.blue, href: 'superadmin-schools.php' },
        { key: 'pending_registrations', title: t('superadmin_dashboard.pending_registrations_title', 'Pending Registrations'), desc: t('superadmin_dashboard.pending_registrations_desc', 'Review and approve self-service school signups'), icon: 'clipboard', tint: TINT.gold }
      );
    }
    const subscriptionItems = [];
    if (hasScope('subscriptions')) {
      subscriptionItems.push(
        { key: 'subscription_packages', title: t('superadmin_dashboard.subscription_packages_title', 'Subscription Plans'), desc: t('superadmin_dashboard.subscription_packages_desc', 'Manage plans, pricing, and per-school fee status'), icon: 'banknote', tint: TINT.teal },
        { key: 'subscription_requests', title: t('superadmin_dashboard.subscription_requests_title', 'Subscription Requests'), desc: t('superadmin_dashboard.subscription_requests_desc', 'Review and approve schools that self-served a plan'), icon: 'inbox', tint: TINT.indigo }
      );
    }
    return [
      { label: t('superadmin_dashboard.section_label', 'Platform'), items: [
        ...schoolsItems,
        ...subscriptionItems,
        // "Team & Staff" (superadmin-staff.php) was removed from the
        // product - its backend (role_id 13 platform_staff, activation
        // toggle, permission scopes) is kept internally but there is no
        // longer a user-facing entry point to the old screen.
        // Taqdim/Translation are now regular school features toggled per
        // school (see superadmin-schools-detail.js), not a separate
        // staff-permission screen - the old "Scholarship & Taqdim Access"
        // row that lived here has been removed accordingly.
        // Visible to both roles here, same as every other row in this
        // section - scholarship-programs.php does its own further check
        // (user.scholarship_access, true for SuperAdmin or a granted
        // platform-staff member) and redirects anyone else away, rather
        // than this list trying to know who has access up front.
        { key: 'scholarship_programs', title: t('superadmin_dashboard.scholarship_programs_title', 'Scholarship Programs'), desc: t('superadmin_dashboard.scholarship_programs_desc', 'Manage providers, programs, and their requirements'), icon: 'clipboard', tint: TINT.teal, href: 'scholarship-programs.php' },
        // Same visibility reasoning as scholarship_programs above -
        // scholarship-applications.php does the real scholarship_access
        // check itself.
        { key: 'scholarship_applications', title: t('superadmin_dashboard.scholarship_applications_title', 'Scholarship Applications'), desc: t('superadmin_dashboard.scholarship_applications_desc', "Review, assign, and decide on students' Taqdim applications"), icon: 'inbox', tint: TINT.orange, href: 'scholarship-applications.php' },
        // Same visibility reasoning as the two rows above - a staff
        // member without translation responsibilities (checked via
        // requireScholarshipTranslationAccess(), not just
        // requireScholarshipStaffAccess()) is redirected away by the
        // page itself, same pattern as scholarship_access being
        // SuperAdmin-only despite this dashboard being shared.
        { key: 'scholarship_translations', title: t('superadmin_dashboard.scholarship_translations_title', 'Translation Requests'), desc: t('superadmin_dashboard.scholarship_translations_desc', 'Manage document translation requests for scholarship applications'), icon: 'globe', tint: TINT.blue, href: 'scholarship-translations.php' },
        { key: 'scholarship_document_review', title: t('superadmin_dashboard.scholarship_document_review_title', 'Document Review'), desc: t('superadmin_dashboard.scholarship_document_review_desc', 'Approve, reject, or request revisions on uploaded documents'), icon: 'filetext', tint: TINT.orange, href: 'scholarship-document-review.php' },
        { key: 'scholarship_announcements', title: t('superadmin_dashboard.scholarship_announcements_title', 'Scholarship Announcements'), desc: t('superadmin_dashboard.scholarship_announcements_desc', 'Post updates for students browsing or applying to scholarships'), icon: 'megaphone', tint: TINT.purple, href: 'scholarship-announcements.php' },
        { key: 'scholarship_reports', title: t('superadmin_dashboard.scholarship_reports_title', 'Scholarship Reports'), desc: t('superadmin_dashboard.scholarship_reports_desc', 'Read-only snapshot of scholarship activity'), icon: 'chart', tint: TINT.teal, href: 'scholarship-reports.php' },
      ]},
      // Gated on 'settings' as a whole block, not row-by-row - every item
      // here is a platform-wide system credential/config screen
      // (STAFF_PERMISSIONS' 'settings' desc: "System, SMTP, languages, and
      // integrations"), not a partial scope a support/schools-only staffer
      // would ever need a taste of.
      { label: t('superadmin_dashboard.operations_section_label', 'Operations'), items: !hasScope('settings') ? [] : [
        { key: 'backend_status', title: t('superadmin_dashboard.backend_status_title', 'Backend Status'), desc: t('superadmin_dashboard.backend_status_desc', 'Database, cache, queue and disk health'), icon: 'activity', tint: TINT.red },
        { key: 'activity_log', title: t('superadmin_dashboard.activity_log_title', 'Activity Log'), desc: t('superadmin_dashboard.activity_log_desc', 'What every school and admin has changed'), icon: 'clock', tint: TINT.gray },
        { key: 'api_locker', title: t('superadmin_dashboard.api_locker_title', 'API Locker'), desc: t('superadmin_dashboard.api_locker_desc', 'Issue and revoke 3rd-party API keys'), icon: 'key', tint: TINT.purple },
        { key: 'firebase_config', title: t('superadmin_dashboard.firebase_config_title', 'Firebase Configuration'), desc: t('superadmin_dashboard.firebase_config_desc', 'Set up real-time push notification credentials'), icon: 'bell', tint: TINT.orange },
        // Sits next to Firebase Configuration/Messenger Integration for the
        // same reason - a platform-wide delivery credential set up once
        // here, not per-school. superadmin-smtp.php is itself guarded to
        // superadmin, same as messenger-settings.php.
        { key: 'smtp_config', title: t('superadmin_dashboard.smtp_config_title', 'SMTP Settings'), desc: t('superadmin_dashboard.smtp_config_desc', 'Set up the outgoing mail server for password resets and system email'), icon: 'mail', tint: TINT.gold, href: 'superadmin-smtp.php' },
        // Sits next to Firebase Configuration deliberately - both are
        // platform-wide notification *delivery* credentials, set up once
        // here by a superadmin rather than per-school. href makes this a
        // real link (see renderRow); messenger-settings.php is itself
        // guarded to superadmin, so this row is never a way in for anyone
        // who couldn't already open that page directly.
        { key: 'messenger_integration', title: t('superadmin_dashboard.messenger_title', 'Messenger Integration'), desc: t('superadmin_dashboard.messenger_desc', "Connect MuslimEdu's Facebook Page to echo notifications"), icon: 'message', tint: TINT.blue, href: 'messenger-settings.php' },
        { key: 'languages', title: t('superadmin_dashboard.languages_title', 'Languages'), desc: t('superadmin_dashboard.languages_desc', 'Platform-wide language list and word-by-word translations'), icon: 'globe', tint: TINT.teal, href: 'superadmin-language.php' },
      ]},
      // Gated on 'support' ("Review posts, respond to reports").
      { label: t('superadmin_dashboard.moderation_section_label', 'Moderation'), items: !hasScope('support') ? [] : [
        { key: 'post_moderation', title: t('superadmin_dashboard.post_moderation_title', 'Post Moderation'), desc: t('superadmin_dashboard.post_moderation_desc', 'Review and remove posts/comments, any school'), icon: 'flag', tint: TINT.pink },
        { key: 'announcements', title: t('superadmin_dashboard.announcements_title', 'Feed Widget Announcements'), desc: t('superadmin_dashboard.announcements_desc', 'Upload image cards shown to every role in the Home feed'), icon: 'images', tint: TINT.indigo },
        { key: 'trash', title: trashRowTitle(), desc: t('superadmin_dashboard.trash_desc', 'Deleted schools/admins — restore or purge within 30 days'), icon: 'trash', tint: TINT.gray },
      ]},
    ];
  }

  // Set once the overview loads (see guardDashboard below) - kept outside
  // buildSections() so a locale change can re-render the Trash row's count
  // without re-fetching the overview.
  let lastTrashCount = 0;
  function trashRowTitle() {
    const base = t('superadmin_dashboard.trash_title', 'Trash');
    return lastTrashCount > 0 ? base + ' (' + lastTrashCount + ')' : base;
  }

  function renderSections() {
    document.getElementById('groupsWrap').innerHTML = buildSections().map(s => renderGroupSection(s.label, s.items)).join('');
    document.getElementById('groupsWrap').insertAdjacentHTML('beforeend', renderLogoutFooter());
  }
  // Deliberately NOT called yet, and NOT filled in for the bottom nav below
  // either - both need currentUser (and platform_staff's granted scopes)
  // to render correctly, so both are done once inside guardDashboard's
  // callback instead, where user is known. Rendering the unfiltered
  // (SuperAdmin) menu here first and narrowing it a moment later would
  // still flash every row at a limited staff member on every page load.
  onLocaleChange(renderSections);

  guardDashboard(['superadmin', 'platform_staff'], function (user, token) {
    currentUser = user;

    // The role badge is static "Super Admin" markup in
    // superadmin-dashboard.php (data-i18n="superadmin_dashboard.role_label")
    // - correct for the real SuperAdmin, but every platform_staff account
    // was showing that exact same badge too, which is a big part of why a
    // support-only staffer's account "looked like" a Super Admin's.
    // Re-pointing data-i18n (not just textContent) means this stays correct
    // across a later locale change too, since applyStaticI18n() re-reads
    // this attribute on every locale load.
    const roleBadge = document.querySelector('.role-badge');
    if (roleBadge) {
      const isStaff = user.role === 'platform_staff';
      const key = isStaff ? 'superadmin_dashboard.role_label_staff' : 'superadmin_dashboard.role_label';
      const fallback = isStaff ? 'Team Member' : 'Super Admin';
      roleBadge.setAttribute('data-i18n', key);
      roleBadge.setAttribute('data-i18n-original', fallback);
      roleBadge.textContent = t(key, fallback);
    }
    document.title = (user.role === 'platform_staff' ? 'Team Member' : 'Super Admin') + ' — MuslimEdu';

    renderSections();
    document.getElementById('bottomNavWrap').innerHTML = renderBottomNav(user.role);

    const heroHeightPx = document.querySelector('.header-row').offsetHeight;
    document.getElementById('heroBg').style.height = heroHeightPx + 'px';
    wireParallax('heroBg', heroHeightPx);

    // Real platform summary row - same /superadmin_dashboard_overview call
    // as SuperAdminDashboard.tsx. A failed fetch just leaves the stat row
    // hidden and the Trash row's title unchanged, same fail-open behavior
    // as the RN screen (the menu below still works either way).
    let lastOverview = null;
    function renderStats() {
      if (!lastOverview) return;
      const overview = lastOverview;
      const userTotal = Object.values(overview.users_by_role || {}).reduce((a, b) => a + b, 0);
      document.getElementById('statsRow').style.display = '';
      document.getElementById('statsRow').innerHTML =
        '<div class="stat-box"><div class="stat-value">' + overview.schools.total + '</div><div class="stat-label">' + escapeHtml(t('superadmin_dashboard.schools', 'Schools')) + '</div></div>' +
        '<div class="stat-box"><div class="stat-value">' + userTotal + '</div><div class="stat-label">' + escapeHtml(t('superadmin_dashboard.users', 'Users')) + '</div></div>' +
        '<div class="stat-box"><div class="stat-value">' + overview.posts.total + '</div><div class="stat-label">' + escapeHtml(t('superadmin_dashboard.posts', 'Posts')) + '</div></div>' +
        '<div class="stat-box"><div class="stat-value">' + overview.api_keys_active + '</div><div class="stat-label">' + escapeHtml(t('superadmin_dashboard.api_keys', 'Active Keys')) + '</div></div>';
    }
    onLocaleChange(renderStats);

    fetchSuperAdminOverview(token).then((overview) => {
      lastOverview = overview;
      renderStats();
      lastTrashCount = (overview.trash.schools || 0) + (overview.trash.admins || 0);
      if (lastTrashCount > 0) {
        // data-key is a stable, untranslated identifier for this row
        // (see renderRow in dashboard.js) - data-title would stop
        // matching the moment the locale changes the displayed text.
        const trashRow = document.querySelector('.row[data-key="trash"] .row-title');
        if (trashRow) trashRow.textContent = trashRowTitle();
      }
    }).catch(() => {
      // Summary row is a nice-to-have - the menu still works without it.
    });
  });
