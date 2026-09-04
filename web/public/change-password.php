<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Change Password — MuslimEdu</title>
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

<div class="util-body" id="utilBody" style="display:none;">
  <div class="util-hint" data-i18n="change_password.hint">Choose a new password you haven't used before.</div>

  <div class="util-card padded">
    <label class="util-label" style="margin-top:0;" data-i18n="change_password.current_label">Current password</label>
    <div class="util-input-row">
      <input type="password" id="currentPw" class="util-input" placeholder="Current password" data-i18n-placeholder="change_password.current_label" />
      <button type="button" class="util-eye-btn" id="toggleCurrentPw" aria-label="Show password"></button>
    </div>

    <label class="util-label" data-i18n="change_password.new_label">New password</label>
    <div class="util-input-row">
      <input type="password" id="newPw" class="util-input" placeholder="New password" data-i18n-placeholder="change_password.new_label" />
      <button type="button" class="util-eye-btn" id="toggleNewPw" aria-label="Show password"></button>
    </div>

    <label class="util-label" data-i18n="change_password.confirm_label">Confirm new password</label>
    <div class="util-input-row">
      <input type="password" id="confirmPw" class="util-input" placeholder="Re-type new password" data-i18n-placeholder="change_password.confirm_placeholder" />
      <button type="button" class="util-eye-btn" id="toggleConfirmPw" aria-label="Show password"></button>
    </div>
  </div>

  <button type="button" class="util-save-btn pill" id="saveBtn">
    <span id="saveBtnLabel" data-i18n="change_password.save_btn">Change password</span>
  </button>
</div>

<script src="dashboard.js"></script>
<script src="change-password.js"></script>
<script src="pwa.js" defer></script>
</body>
</html>
