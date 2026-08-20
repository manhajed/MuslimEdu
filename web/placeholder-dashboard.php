<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Dashboard — MuslimEdu</title>
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
  <div class="hero-bg" id="heroBg" style="height:220px;">
    <div class="hero-glow"></div>
  </div>

  <div class="header-row">
    <div>
      <div class="greeting-small">Assalamu Alaykum,</div>
      <div class="greeting-name" id="greetingName">&nbsp;</div>
      <div class="role-badge" id="roleBadge">&nbsp;</div>
    </div>
    <div class="avatar-wrap" id="avatarWrap"></div>
  </div>

  <div class="body">
    <div class="placeholder-center">
      <div class="placeholder-title" id="placeholderTitle">Dashboard</div>
      <div class="placeholder-subtitle">This dashboard hasn't been built yet — login and logout already work for this role, we just haven't added the features.</div>
    </div>
    <div id="footerWrap" style="margin-top:32px;"></div>
  </div>
</div>

<script src="dashboard.js"></script>
<script>
  // Same copy/behavior as src/screens/dashboards/PlaceholderDashboard.tsx
  // (used there for parent/librarian/warden, and any role with no
  // dedicated screen). This page has no expected role of its own - any
  // signed-in user with a role that isn't admin/superadmin/teacher/student
  // lands here (see dashboardUrlForRole in dashboard.js).
  document.getElementById('footerWrap').innerHTML = renderLogoutFooter();

  guardDashboard(null, function (user) {
    const label = (user.role || 'Account').replace(/(^|_)([a-z])/g, (_, sep, c) => (sep ? ' ' : '') + c.toUpperCase());
    document.getElementById('roleBadge').textContent = label;
    document.getElementById('placeholderTitle').textContent = label + ' dashboard';
    document.getElementById('heroBg').style.height = document.querySelector('.header-row').offsetHeight + 'px';
  });
</script>
</body>
</html>
