<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>My Grades — MuslimEdu</title>
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
/* Scoped to this page — My Grades redesign. Monochrome only (black/gray/
   white), no tinted cards - the old amber "sample" banner, amber honors
   pill, and green AVG column are all gone in favor of weight/size
   hierarchy instead of color to tell things apart. */
.mg-notice { background: #F5F5F7; border-radius: 18px; padding: 16px 18px; margin-bottom: 20px; }
.mg-notice-title { font-size: 14px; font-weight: 700; color: #000; }
.mg-notice-sub { font-size: 12.5px; color: #6B6B70; margin-top: 3px; line-height: 1.45; }

.mg-summary-row { display: flex; gap: 12px; margin-top: 16px; }
.mg-summary-card { flex: 1; background: #fff; border-radius: 20px; padding: 18px 16px; border: 1px solid rgba(0,0,0,0.07); }
.mg-summary-label { font-size: 11px; font-weight: 700; color: #8E8E93; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
.mg-summary-value { font-size: 30px; font-weight: 800; color: #000; letter-spacing: -0.6px; line-height: 1; }
.mg-summary-sub { font-size: 12px; color: #8E8E93; margin-top: 6px; }
.mg-summary-dash { font-size: 22px; font-weight: 700; color: #C7C7CC; }
.mg-honors-pill { display: inline-flex; align-items: center; gap: 6px; background: linear-gradient(135deg, var(--pale-green), var(--emerald)); color: #fff; border-radius: 999px; padding: 7px 13px; font-size: 13px; font-weight: 700; box-shadow: 0 4px 12px rgba(31,174,100,0.28); }

.mg-table-card { background: #fff; border-radius: 20px; border: 1px solid rgba(0,0,0,0.07); overflow: hidden; }
.mg-table-row { display: flex; align-items: center; padding: 15px 18px; }
.mg-table-row + .mg-table-row { border-top: 1px solid rgba(0,0,0,0.06); }
.mg-table-row.mg-table-header { padding: 13px 18px 11px; }
.mg-table-header span { font-size: 10.5px; font-weight: 700; color: #8E8E93; text-transform: uppercase; letter-spacing: 0.5px; }
.mg-subject { flex: 1.7; font-size: 15px; font-weight: 600; color: #000; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mg-cell { flex: 1; text-align: center; font-size: 15px; color: #3C3C43; font-variant-numeric: tabular-nums; }
.mg-avg { font-weight: 800; color: #000; }
</style>
</head>
<body>

<div id="routeGuardSplash" class="route-guard-splash"><div class="route-guard-spinner"></div></div>

<div id="utilHeaderWrap"></div>

<div class="util-body" id="utilBody" style="display:none;">
  <div id="gradesContent"></div>
</div>

<div id="bottomNavWrap"></div>

<script src="dashboard.js"></script>
<script src="student-grades.js"></script>
<script src="pwa.js" defer></script>
</body>
</html>
