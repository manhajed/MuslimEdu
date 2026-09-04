<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Alumni — MuslimEdu</title>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; worker-src 'self'; manifest-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: https://manhaje.com; connect-src 'self' https://manhaje.com; base-uri 'none'; form-action 'none'; upgrade-insecure-requests" />
<meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
<script src="pwa-guard.js"></script>
<script src="offline-data.js"></script>
<meta http-equiv="Cache-Control" content="no-store" />
<link rel="icon" href="assets/icons/favicon-32.png" sizes="32x32" />
<link rel="icon" href="assets/icons/favicon-16.png" sizes="16x16" />
<link rel="icon" href="assets/icons/icon-192.png" sizes="192x192" />
<link rel="manifest" href="manifest.webmanifest" />
<meta name="theme-color" content="#1A7A6E" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="MuslimEdu" />
<link rel="apple-touch-icon" href="assets/icons/apple-touch-icon.png" />
<link rel="stylesheet" href="assets/fonts.css" />
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
      <div class="greeting-small" data-i18n="dashboard_shell.greeting">Assalamu Alaykum,</div>
      <div class="greeting-name" id="greetingName">&nbsp;</div>
    </div>
    <div class="avatar-wrap" id="avatarWrap"></div>
  </div>

  <div class="glass-card">
    <div class="glass-header-row">
      <div class="glass-header-left">
        <span class="glass-icon-circle" id="profileIcon"></span>
        <div><div class="glass-title" data-i18n="alumni_dashboard.profile_title">Alumni Profile</div><div class="glass-subtitle">Your personal information</div></div>
      </div>
      <a class="edit-btn" id="editBtn" href="edit-profile.php" aria-label="Edit profile"></a>
    </div>
    <div class="glass-divider"></div>
    <div class="glass-row"><span class="glass-row-icon" id="nameIcon"></span>
      <span><span class="glass-row-label" data-i18n="student_dashboard.name_label">Name</span><br><span class="glass-row-value" data-user-name>&nbsp;</span></span></div>
    <div class="glass-divider"></div>
    <div class="glass-row"><span class="glass-row-icon" id="mailIcon"></span>
      <span><span class="glass-row-label" data-i18n="student_dashboard.email_label">Email</span><br><span class="glass-row-value" data-user-email>&nbsp;</span></span></div>
  </div>

  <div class="body" style="margin-top:16px;">
    <div class="placeholder-center" style="margin-bottom:8px;">
      <div class="placeholder-title" style="font-size:18px;">Welcome back to your school community</div>
      <div class="placeholder-subtitle">More alumni features — a directory, events, and giving — are on the way.</div>
    </div>
    <div class="section-header-row">
      <div class="section-label" style="margin-bottom:0;" data-i18n="student_dashboard.quick_actions">Quick Actions</div>
    </div>
    <div id="groupsWrap"></div>
  </div>
</div>

<div id="bottomNavWrap"></div>

<script src="dashboard.js"></script>
<script src="alumni-dashboard.js"></script>
<script src="pwa.js" defer></script>
</body>
</html>
