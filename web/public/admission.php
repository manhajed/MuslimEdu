<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>New Admission — MuslimEdu</title>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; worker-src 'self'; manifest-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob: https://manhaje.com; connect-src 'self' https://manhaje.com; base-uri 'none'; form-action 'none'; upgrade-insecure-requests" />
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
<body class="util-page">

<div id="routeGuardSplash" class="route-guard-splash"><div class="route-guard-spinner"></div></div>

<div class="adm-screen" id="admScreen" style="display:none;">
  <div class="page-header adm-page-header">
    <div class="page-header-row">
      <button type="button" class="page-back-btn" id="admTopBack" aria-label="Cancel"><span id="admTopBackIcon"></span></button>
    </div>
    <div class="page-title" data-i18n="admission.topbar_title">New Admission</div>
    <div class="page-subtitle" id="admStepCount"></div>
  </div>

  <div class="adm-progress-wrap">
    <div id="admStepper"></div>
  </div>

  <div class="adm-content" id="admContent"></div>

  <div class="adm-button-row">
    <button type="button" class="adm-back-btn" id="admBackBtn" data-i18n="admission.cancel">Cancel</button>
    <button type="button" class="adm-next-btn" id="admNextBtn" data-i18n="admission.next">Next</button>
  </div>
</div>

<!-- Success -->
<div class="adm-success-backdrop" id="admSuccessBackdrop">
  <div class="adm-success-panel">
    <div class="adm-success-icon" id="admSuccessIcon"></div>
    <div class="adm-success-title" data-i18n="admission.success_title">Student admitted successfully.</div>
    <div class="adm-success-sub"><span id="admSuccessName"></span> <span data-i18n="admission.success_sub_suffix">is now enrolled in your school.</span></div>
    <div class="adm-success-code" id="admSuccessCode"></div>
    <button type="button" class="adm-success-primary" id="admViewStudentBtn" data-i18n="admission.view_students_btn">View Students</button>
    <button type="button" class="adm-success-secondary" id="admAdmitAnotherBtn" data-i18n="admission.admit_another_btn">Admit Another Student</button>
  </div>
</div>

<script src="dashboard.js"></script>
<script src="admission.js"></script>
<script src="pwa.js" defer></script>
</body>
</html>
