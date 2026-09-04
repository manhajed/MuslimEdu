<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Student ID Cards — MuslimEdu</title>
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
  @media print {
    #utilHeaderWrap, #bottomNavWrap, #idListWrap, #idToolbarWrap, .select-bar { display: none !important; }
  }
</style>
</head>
<body>

<div id="routeGuardSplash" class="route-guard-splash"><div class="route-guard-spinner"></div></div>

<div id="utilHeaderWrap"></div>

<div class="util-body" id="utilBody" style="display:none;padding-bottom:80px;">
  <div class="id-toolbar" id="idToolbarWrap"></div>
  <div id="idListWrap"></div>
</div>

<div id="bottomNavWrap"></div>

<div class="idcard-modal-backdrop" id="cardModal">
  <button type="button" class="idcard-modal-close" id="cardModalClose">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
  </button>
  <div class="idcard-modal-inner" id="cardModalInner"></div>
</div>

<!-- Populated only while exporting - see downloadAllCardsPdf() in
     student-id-cards.js. Hidden on screen; shown only under
     @media print, and only while body carries .printing-batch. -->
<div id="idBatchPrintWrap"></div>

<script src="qr.js"></script>
<script src="dashboard.js"></script>
<script src="student-id-cards.js"></script>
<script src="pwa.js" defer></script>
</body>
</html>
