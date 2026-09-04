<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Admin — MuslimEdu</title>
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
<style>
/* Scoped to this page - Subscription + Sync status cards, ported from
   SubscriptionStatusCard.tsx / SyncStatusCard.tsx (RN app). Sit at the
   top of the white body panel, above the "Manage" section label, same
   placement as RN's AdminDashboard. */
.status-card {
  display: flex; align-items: center; border-radius: 20px; padding: 16px;
  margin-bottom: 12px; text-align: left; width: 100%; border: none; font-family: inherit;
}
.status-card.dark {
  background: linear-gradient(135deg, #1A1C1F, #0A0B0C);
  border: 1px solid rgba(255,255,255,0.06);
  box-shadow: 0 6px 16px rgba(11,61,46,0.08);
}
.status-card.light { background: #fff; box-shadow: var(--shadow); }
.status-card-icon {
  width: 44px; height: 44px; border-radius: 14px; flex-shrink: 0; margin-right: 12px;
  display: flex; align-items: center; justify-content: center;
}
.status-card-body { flex: 1; min-width: 0; }
.status-card-title-row { display: flex; align-items: center; gap: 8px; }
.status-card-title { font-size: 15px; font-weight: 800; letter-spacing: -0.2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status-card.dark .status-card-title { color: #fff; }
.status-card.light .status-card-title { color: var(--ink); }
.status-card-subtitle { font-size: 12.5px; margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status-card.dark .status-card-subtitle { color: rgba(255,255,255,0.55); }
.status-card.light .status-card-subtitle { color: var(--subtle); }
.status-pill { display: flex; align-items: center; gap: 5px; border-radius: 999px; padding: 3px 9px; flex-shrink: 0; }
.status-pill-dot { width: 6px; height: 6px; border-radius: 3px; }
.status-pill-text { font-size: 10.5px; font-weight: 800; }
.status-card-chevron {
  width: 28px; height: 28px; border-radius: 14px; flex-shrink: 0; margin-left: 4px;
  display: flex; align-items: center; justify-content: center;
}
.status-card.dark .status-card-chevron { background: rgba(255,255,255,0.08); }
.status-card.light .status-card-chevron { background: #F3F4F6; }
.status-card-badge {
  min-width: 24px; height: 24px; border-radius: 12px; background: #EF4444; flex-shrink: 0; margin-left: 4px;
  display: flex; align-items: center; justify-content: center; padding: 0 7px;
  font-size: 11.5px; font-weight: 700; color: #fff;
}
</style>
</head>
<body>

<div id="routeGuardSplash" class="route-guard-splash"><div class="route-guard-spinner"></div></div>

<div class="screen">
  <div class="hero-bg" id="heroBg" style="height:300px;">
    <div class="hero-glow"></div>
  </div>

  <div class="header-row">
    <div>
      <div class="greeting-small" data-i18n="admin_dashboard.greeting">Assalamu Alaykum,</div>
      <div class="greeting-name" id="greetingName">&nbsp;</div>
    </div>
    <div class="header-right" style="display:flex;align-items:center;gap:10px;">
      <a class="icon-btn" href="account-settings.php" aria-label="Settings"></a>
      <div class="avatar-wrap" id="avatarWrap"></div>
    </div>
  </div>

  <div id="analyticsCardWrap"></div>

  <div class="body">
    <div id="statusCardsWrap"></div>
    <div class="section-label" data-i18n="admin_dashboard.manage_section">Manage</div>

    <div class="search-bar" id="searchBar">
      <span id="searchIcon"></span>
      <input type="text" id="searchInput" placeholder="Search menu" data-i18n-placeholder="admin_dashboard.search_placeholder" autocomplete="off" />
      <button class="search-clear" type="button" id="searchClearBtn" aria-label="Clear search"></button>
    </div>

    <div id="featuredWrap"></div>

    <div id="groupsWrap"></div>

    <div class="no-results" id="noResults" style="display:none;" data-i18n="admin_dashboard.search_no_results">No results. Try a different search.</div>
  </div>
</div>

<div id="bottomNavWrap"></div>

<script src="dashboard.js"></script>
<script src="admin-dashboard.js"></script>
<script src="pwa.js" defer></script>
</body>
</html>
