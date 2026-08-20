<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Admin — MuslimEdu</title>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https://manhaje.com; connect-src 'self' https://manhaje.com; base-uri 'none'; form-action 'none'; upgrade-insecure-requests" />
<meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
<meta http-equiv="Cache-Control" content="no-store" />
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%95%8C%3C/text%3E%3C/svg%3E" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="dashboard.css" />
</head>
<body>

<div id="routeGuardSplash" class="route-guard-splash"><div class="route-guard-spinner"></div></div>

<div class="screen">
  <div class="hero-bg" id="heroBg" style="height:300px;">
    <div class="hero-glow"></div>
  </div>

  <div class="header-row">
    <div>
      <div class="greeting-small">Assalamu Alaykum,</div>
      <div class="greeting-name" id="greetingName">&nbsp;</div>
    </div>
    <div class="header-right" style="display:flex;align-items:center;gap:10px;">
      <button class="icon-btn" type="button" onclick="notWiredYet()" aria-label="Settings"></button>
      <div class="avatar-wrap" id="avatarWrap"></div>
    </div>
  </div>

  <div class="body">
    <div class="section-label">Manage</div>

    <div class="search-bar" id="searchBar">
      <span id="searchIcon"></span>
      <input type="text" id="searchInput" placeholder="Search menu" autocomplete="off" />
      <button class="search-clear" type="button" id="searchClearBtn" aria-label="Clear search"></button>
    </div>

    <div id="featuredWrap"></div>

    <div id="groupsWrap"></div>

    <div class="no-results" id="noResults" style="display:none;">No results. Try a different search.</div>
  </div>
</div>

<script src="dashboard.js"></script>
<script>
  document.getElementById('searchIcon').innerHTML = icon('search', { size: 17, color: 'var(--subtle)' });
  document.getElementById('searchClearBtn').innerHTML =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--subtle)" stroke-width="2.4" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>';
  document.querySelector('.icon-btn').innerHTML = icon('gear', { size: 18, color: '#fff' });

  // ── Real (non-hidden) menu content, copied from
  //    src/screens/dashboards/AdminDashboard.tsx's `items` array, minus
  //    everything currently in that file's HIDDEN_FOR_NOW_KEYS set and the
  //    orphan-only / quran-tracker conditional tiles. Deep sub-screens
  //    (StudentsList, GradingSystems, etc.) only exist in the RN app so
  //    far, so every tile below opens the "not built on web yet" toast
  //    instead of a broken link - see dashboard.js's notWiredYet(). ──
  const TINT = {
    blue: '#0A84FF', indigo: '#5E5CE6', teal: '#2FA9B8', orange: '#FF9F0A',
    pink: '#FF3B72', red: '#FF453A', purple: '#BF5AF2', gray: '#8E8E93', gold: '#D4A64A',
  };

  const hero = { title: 'Students', desc: 'View and manage all students', icon: 'users' };
  const secondary = [
    { title: 'Setup Checklist', desc: 'Everything needed before your portals are ready', icon: 'clipboard', tint: TINT.gold, stat: '—' },
    { title: 'Fee Reports', desc: 'Total collected', icon: 'banknote', tint: '#1FAE64', stat: '—' },
  ];

  const sections = [
    { label: 'People', items: [
      { title: 'Teachers', desc: 'Manage teachers and permissions', icon: 'presentation', tint: TINT.blue },
      { title: 'Cashiers', desc: 'Add and manage cashier accounts', icon: 'idcard', tint: TINT.teal },
      { title: 'Registrars', desc: 'Add and manage registrar accounts', icon: 'idcard', tint: TINT.indigo },
    ]},
    { label: 'Identity & Codes', items: [
      { title: 'ID Cards', desc: 'View and export every student’s QR ID card', icon: 'idcard', tint: TINT.purple },
      { title: 'Staff ID Cards', desc: 'View and export teacher, cashier, and registrar ID cards', icon: 'idcard', tint: TINT.purple },
      { title: 'Student & Staff Codes', desc: 'Set the code format for new students and staff', icon: 'idcard', tint: TINT.pink },
    ]},
    { label: 'Academics', items: [
      { title: 'Classes & Sections', desc: 'Create classes and sections for this school', icon: 'book', tint: TINT.orange },
      { title: 'Class Schedule', desc: 'Build the weekly timetable', icon: 'calendar', tint: TINT.indigo },
      { title: 'Enrollment', desc: 'Configure enrollment stages', icon: 'layers', tint: TINT.pink },
      { title: 'Academic Setup', desc: 'Manage academic years and terms', icon: 'gear', tint: TINT.gray },
      { title: 'Grading Systems', desc: 'Build grading systems and grade scales', icon: 'gradcap', tint: TINT.red },
      { title: 'Subjects', desc: 'Manage the school’s subject catalog', icon: 'layers', tint: TINT.blue },
      { title: 'Facilities', desc: 'Buildings, rooms and learning spaces', icon: 'layers', tint: TINT.gray },
      { title: 'Attendance Config', desc: 'Statuses and capture methods for your school', icon: 'gear', tint: TINT.teal },
    ]},
    { label: 'Activity & Requests', items: [
      { title: 'Attendance', desc: 'Track daily attendance', icon: 'calendar', tint: '#1FAE64' },
      { title: 'Document Requests', desc: 'Issue or reject student document requests', icon: 'document', tint: TINT.blue },
      { title: 'Alumni Applications', desc: 'Review and approve self-service alumni signups', icon: 'gradcap', tint: TINT.indigo },
    ]},
    { label: 'Settings', items: [
      { title: 'Account Settings', desc: 'Language, theme, privacy and password', icon: 'gear', tint: TINT.gray },
    ]},
  ];

  document.getElementById('featuredWrap').innerHTML =
    '<button class="hero-card" id="heroCard" type="button" onclick="notWiredYet()">' +
      '<div class="hero-card-top"><span class="hero-card-icon">' + icon(hero.icon, { size: 22, color: '#fff' }) + '</span>' +
      '<span class="hero-card-arrow">' + icon('arrow', { size: 17, color: '#fff' }) + '</span></div>' +
      '<div class="hero-card-title">' + hero.title + '</div><div class="hero-card-desc">' + hero.desc + '</div>' +
    '</button>' +
    '<div class="secondary-row" id="secondaryRow">' +
      secondary.map(s =>
        '<button class="secondary-card" type="button" onclick="notWiredYet()">' +
          '<span class="secondary-icon" style="background:' + s.tint + '">' + icon(s.icon, { size: 18, color: '#fff' }) + '</span>' +
          '<span class="secondary-num">' + s.stat + '</span>' +
          '<span class="secondary-title">' + s.title + '</span><span class="secondary-desc">' + s.desc + '</span>' +
        '</button>'
      ).join('') +
    '</div>';

  document.getElementById('groupsWrap').innerHTML = sections.map(s => renderGroupSection(s.label, s.items)).join('');
  document.getElementById('groupsWrap').insertAdjacentHTML('beforeend', renderLogoutFooter());

  wireSearch('searchInput', { hideWhileSearching: ['heroCard', 'secondaryRow'] });

  guardDashboard('admin', function (user) {
    // Parallax: measure real hero height so the dark layer's bottom edge
    // lines up with the header content, same as AdminDashboard's onLayout.
    const heroBg = document.getElementById('heroBg');
    heroBg.style.height = document.querySelector('.header-row').offsetHeight + 'px';
  });
</script>
</body>
</html>
