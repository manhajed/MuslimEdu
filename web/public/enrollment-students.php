<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Enrollment Records — MuslimEdu</title>
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

<div id="utilHeaderWrap"></div>

<div class="util-body" id="utilBody" style="display:none;padding-bottom:24px;">
  <div class="ew-toolbar" id="ewToolbar"></div>
  <div class="filter-chip-row" id="ewFilterRow"></div>
  <div id="ewListWrap"></div>
</div>

<!-- Start Workflow picker -->
<div class="sheet-backdrop" id="ewStartBackdrop">
  <div class="sheet-panel">
    <div class="sheet-handle"></div>
    <div class="sheet-title-row"><span class="sheet-title" data-i18n="enrollment_students.start_workflow_title">Start Enrollment Workflow</span>
      <button type="button" class="sheet-close-btn" id="ewStartCloseBtn"></button></div>
    <input type="text" id="ewStartSearch" class="util-input" placeholder="Search students..." data-i18n-placeholder="enrollment_students.search_students_placeholder" autocomplete="off" />
    <div id="ewStartList" style="max-height:340px;overflow-y:auto;margin-top:8px;"></div>
  </div>
</div>

<!-- Full-screen record detail -->
<div class="ew-detail-overlay" id="ewDetailOverlay">
  <div class="page-header">
    <div class="page-header-row">
      <button type="button" class="page-back-btn" id="ewDetailBackBtn" aria-label="Back"></button>
    </div>
    <div class="page-hero-fade">
      <div class="page-title" data-i18n="enrollment_students.record_title">Enrollment Record</div>
    </div>
  </div>
  <div class="ew-detail-scroll" id="ewDetailContent"></div>
</div>

<!-- Move to Stage picker -->
<div class="sheet-backdrop" id="ewStageBackdrop">
  <div class="sheet-panel">
    <div class="sheet-handle"></div>
    <div class="sheet-title-row"><span class="sheet-title" data-i18n="enrollment_students.move_to_stage_title">Move to Stage</span>
      <button type="button" class="sheet-close-btn" id="ewStageCloseBtn"></button></div>
    <div id="ewStageList" style="max-height:360px;overflow-y:auto;"></div>
  </div>
</div>

<!-- Place in Section (class, then section) -->
<div class="sheet-backdrop" id="ewPlaceBackdrop">
  <div class="sheet-panel">
    <div class="sheet-handle"></div>
    <div class="sheet-title-row"><span class="sheet-title" id="ewPlaceTitle" data-i18n="enrollment_students.select_class_title">Select Class</span>
      <button type="button" class="sheet-close-btn" id="ewPlaceCloseBtn"></button></div>
    <div id="ewPlaceList" style="max-height:360px;overflow-y:auto;"></div>
  </div>
</div>

<!-- Payment edit -->
<div class="sheet-backdrop" id="ewPaymentBackdrop">
  <div class="sheet-panel form">
    <div class="sheet-handle"></div>
    <div class="sheet-title-row"><span class="sheet-title" id="ewPaymentTitle" data-i18n="enrollment_students.fee_fallback">Fee</span>
      <button type="button" class="sheet-close-btn" id="ewPaymentCloseBtn"></button></div>
    <div id="ewPaymentForm"></div>
  </div>
</div>

<script src="dashboard.js"></script>
<script src="enrollment-students.js"></script>
<script src="pwa.js" defer></script>
</body>
</html>
