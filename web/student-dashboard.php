<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Student — MuslimEdu</title>
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
  <div class="hero-bg" id="heroBg" style="height:340px;">
    <div class="hero-glow"></div>
  </div>

  <div class="header-row">
    <div>
      <div class="greeting-small">Assalamu Alaykum,</div>
      <div class="greeting-name" id="greetingName">&nbsp;</div>
    </div>
    <div class="avatar-wrap" id="avatarWrap"></div>
  </div>

  <div class="glass-card">
    <div class="glass-header-row">
      <div class="glass-header-left">
        <span class="glass-icon-circle" id="profileIcon"></span>
        <div><div class="glass-title">Profile</div><div class="glass-subtitle">Your personal information</div></div>
      </div>
      <button class="edit-btn" type="button" id="editBtn" onclick="notWiredYet()" aria-label="Edit profile"></button>
    </div>
    <div class="glass-divider"></div>
    <div class="glass-row"><span class="glass-row-icon" id="nameIcon"></span>
      <span><span class="glass-row-label">Name</span><br><span class="glass-row-value" data-user-name>&nbsp;</span></span></div>
    <div class="glass-divider"></div>
    <div class="glass-row"><span class="glass-row-icon" id="mailIcon"></span>
      <span><span class="glass-row-label">Email</span><br><span class="glass-row-value" data-user-email>&nbsp;</span></span></div>
    <div class="glass-divider" data-user-code-row></div>
    <div class="glass-row" data-user-code-row><span class="glass-row-icon" id="codeIcon"></span>
      <span><span class="glass-row-label">Student Code</span><br><span class="glass-row-value" data-user-code>&nbsp;</span></span></div>
  </div>

  <div class="body" style="margin-top:16px;">
    <div class="section-header-row">
      <div class="section-label" style="margin-bottom:0;">Quick Actions</div>
      <button class="view-all" type="button" id="viewAllBtn" onclick="notWiredYet()">View All</button>
    </div>
    <div class="quick-grid" id="quickGrid"></div>
    <div id="footerWrap"></div>
  </div>
</div>

<script src="dashboard.js"></script>
<script>
  document.getElementById('profileIcon').innerHTML = icon('person', { size: 22, color: 'var(--pale-green)' });
  document.getElementById('editBtn').innerHTML = icon('camera', { size: 16, color: 'var(--pale-green)' });
  document.getElementById('nameIcon').innerHTML = icon('person', { size: 16 });
  document.getElementById('mailIcon').innerHTML = icon('mail', { size: 16 });
  document.getElementById('codeIcon').innerHTML = icon('idcard', { size: 16 });
  document.getElementById('viewAllBtn').insertAdjacentHTML('beforeend', icon('chevron', { size: 14 }));

  // Copied from src/screens/dashboards/StudentDashboard.tsx's non-orphan
  // quickActions array ("My Reports"/Monthly Report/upload-documents
  // variants are orphan-only, skipped - see the same note on
  // teacher-dashboard.php). First tile renders solid/featured.
  const actions = [
    { title: 'My Progress', desc: 'Track your learning progress', icon: 'layers' },
    { title: 'My Schedule', desc: 'See your weekly class timetable', icon: 'calendar' },
    { title: 'My ID Card', desc: 'View and export your QR ID card', icon: 'idcard' },
    { title: 'My Grades', desc: 'See your grades and GPA by subject', icon: 'star' },
    { title: 'Quarterly Report', desc: 'Your Q1-Q4 grades and general average', icon: 'document' },
    { title: 'Documents', desc: 'Request report cards, COR and certificates', icon: 'document' },
    { title: 'Services', desc: 'Guidance, counselling and other requests', icon: 'clipboard' },
    { title: 'Notifications', desc: 'Stay updated with important alerts', icon: 'bell' },
    { title: 'Settings', desc: 'Language, theme, privacy and password', icon: 'gear' },
  ];

  document.getElementById('quickGrid').innerHTML = actions.map((a, i) => {
    const solid = i === 0;
    const iconColor = solid ? '#fff' : 'var(--emerald)';
    return (
      '<button class="quick-card' + (solid ? ' solid' : '') + '" type="button" onclick="notWiredYet()">' +
        '<span class="quick-card-icon">' + icon(a.icon, { size: 18, color: iconColor }) + '</span>' +
        '<div class="quick-card-title">' + a.title + '</div><div class="quick-card-desc">' + a.desc + '</div>' +
      '</button>'
    );
  }).join('');

  document.getElementById('footerWrap').innerHTML = renderLogoutFooter();

  guardDashboard('student', function () {
    document.getElementById('heroBg').style.height =
      (document.querySelector('.header-row').offsetHeight + document.querySelector('.glass-card').offsetHeight + 20) + 'px';
  });
</script>
</body>
</html>
