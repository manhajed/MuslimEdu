<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Super Admin — MuslimEdu</title>
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
  <!-- Shared DashboardShell hero (used by SuperAdmin/Cashier/Registrar/
       Alumni/Placeholder, per src/screens/dashboards/DashboardShell.tsx) -
       shorter than Admin/Teacher/Student's own custom hero since it has no
       glass profile card underneath it. -->
  <div class="hero-bg" id="heroBg" style="height:220px;">
    <div class="hero-glow"></div>
  </div>

  <div class="header-row">
    <div>
      <div class="greeting-small">Assalamu Alaykum,</div>
      <div class="greeting-name" id="greetingName">&nbsp;</div>
      <div class="role-badge">Super Admin</div>
    </div>
    <div class="header-right" style="display:flex;align-items:center;gap:10px;">
      <button class="icon-btn" type="button" onclick="notWiredYet()" aria-label="Settings"></button>
      <div class="avatar-wrap" id="avatarWrap"></div>
    </div>
  </div>

  <div class="body">
    <div class="section-label">Platform</div>
    <div class="grid-2" id="gridWrap"></div>
    <div style="margin-top:8px;" id="footerWrap"></div>
  </div>
</div>

<script src="dashboard.js"></script>
<script>
  document.querySelector('.icon-btn').innerHTML = icon('gear', { size: 18, color: '#fff' });

  // Copied from src/screens/dashboards/SuperAdminDashboard.tsx's platform
  // grid - the summary stat row above it (schools/users/posts/API keys)
  // needed /superadmin_dashboard_overview, which isn't an endpoint this
  // page has access to, so it's left out entirely rather than shown with
  // fake numbers (same as the RN screen: no `overview` data, no stat row).
  const cards = [
    { title: 'Schools', desc: 'Add, edit, disable schools and manage their admins', icon: 'school' },
    { title: 'Subscription Plans', desc: 'Manage plans, pricing, and per-school fee status', icon: 'banknote' },
    { title: 'Subscription Requests', desc: 'Review and approve schools that self-served a plan', icon: 'inbox' },
    { title: 'API Locker', desc: 'Issue and revoke 3rd-party API keys', icon: 'key' },
    { title: 'Backend Status', desc: 'Database, cache, queue and disk health', icon: 'activity' },
    { title: 'Post Moderation', desc: 'Review and remove posts/comments, any school', icon: 'flag' },
    { title: 'Activity Log', desc: 'What every school and admin has changed', icon: 'clock' },
    { title: 'Trash', desc: 'Deleted schools/admins — restore or purge within 30 days', icon: 'trash' },
    { title: 'Feed Widget Announcements', desc: 'Upload image cards shown to every role in the Home feed', icon: 'images' },
    { title: 'Pending Registrations', desc: 'Review and approve self-service school signups', icon: 'clipboard' },
    { title: 'Firebase Configuration', desc: 'Set up real-time push notification credentials', icon: 'bell' },
  ];

  document.getElementById('gridWrap').innerHTML = cards.map(c =>
    '<button class="grid-card" type="button" onclick="notWiredYet()">' +
      '<span class="grid-card-icon">' + icon(c.icon, { size: 22, color: 'var(--emerald)' }) + '</span>' +
      '<div class="grid-card-title">' + c.title + '</div><div class="grid-card-desc">' + c.desc + '</div>' +
      '<div class="grid-card-arrow">' + icon('arrow', { size: 16, color: 'var(--emerald)' }) + '</div>' +
    '</button>'
  ).join('');

  document.getElementById('footerWrap').innerHTML = renderLogoutFooter();

  guardDashboard('superadmin', function () {
    document.getElementById('heroBg').style.height = document.querySelector('.header-row').offsetHeight + 'px';
  });
</script>
</body>
</html>
