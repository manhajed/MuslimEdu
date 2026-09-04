<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Dashboard — MuslimEdu</title>
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

<div id="bottomNavWrap"></div>

<script src="dashboard.js"></script>
<script src="placeholder-dashboard.js"></script>
<script src="pwa.js" defer></script>
</body>
</html>
