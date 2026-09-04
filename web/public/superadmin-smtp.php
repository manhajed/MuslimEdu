<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>SMTP Settings — MuslimEdu</title>
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
/* Scoped to this page - Host/Port sit side by side (a lone Port field
   full-width looks odd), nothing else in dashboard.css has a two-up
   input row pattern yet. */
.smtp-row-2up { display: flex; gap: 10px; }
.smtp-row-2up > div { flex: 1; min-width: 0; }
.smtp-row-2up.uneven > div:first-child { flex: 2; }
</style>
</head>
<body>

<div id="routeGuardSplash" class="route-guard-splash"><div class="route-guard-spinner"></div></div>

<div id="utilHeaderWrap"></div>

<div class="util-body" id="utilBody" style="display:none;">
  <div class="util-hint" data-i18n="smtp_settings.hint">Platform-wide outgoing mail — used for password resets, admission confirmations, and every other system email across every school. One mail server for the whole MuslimEdu community, not per-school.</div>

  <div class="util-card padded">
    <label class="util-label" style="margin-top:0;" data-i18n="smtp_settings.host_label">SMTP Host</label>
    <input type="text" id="smtpHost" class="util-input" placeholder="e.g. smtp.mailgun.org" data-i18n-placeholder="smtp_settings.host_placeholder" autocapitalize="off" autocorrect="off" />

    <div class="smtp-row-2up uneven" style="margin-top:14px;">
      <div>
        <label class="util-label" style="margin-top:0;" data-i18n="smtp_settings.port_label">Port</label>
        <input type="number" id="smtpPort" class="util-input" placeholder="587" inputmode="numeric" />
      </div>
      <div>
        <label class="util-label" style="margin-top:0;" data-i18n="smtp_settings.encryption_label">Encryption</label>
        <select id="smtpEncryption" class="util-input">
          <option value="tls">TLS</option>
          <option value="ssl">SSL</option>
          <option value="none" data-i18n="smtp_settings.encryption_none">None</option>
        </select>
      </div>
    </div>

    <label class="util-label" data-i18n="smtp_settings.username_label">Username</label>
    <input type="text" id="smtpUsername" class="util-input" placeholder="e.g. postmaster@mg.muslimedu.com" data-i18n-placeholder="smtp_settings.username_placeholder" autocapitalize="off" autocorrect="off" autocomplete="off" />

    <label class="util-label" data-i18n="smtp_settings.password_label">Password</label>
    <input type="password" id="smtpPassword" class="util-input" placeholder="" data-i18n-placeholder="smtp_settings.password_placeholder" autocomplete="off" />
    <div class="util-hint" style="margin-top:4px;" data-i18n="smtp_settings.password_hint">Leave blank to keep the password already on file.</div>

    <label class="util-label" data-i18n="smtp_settings.from_address_label">From address</label>
    <input type="email" id="smtpFromAddress" class="util-input" placeholder="e.g. no-reply@muslimedu.com" data-i18n-placeholder="smtp_settings.from_address_placeholder" autocapitalize="off" autocorrect="off" />

    <label class="util-label" data-i18n="smtp_settings.from_name_label">From name</label>
    <input type="text" id="smtpFromName" class="util-input" placeholder="e.g. MuslimEdu" data-i18n-placeholder="smtp_settings.from_name_placeholder" />
  </div>

  <div class="util-card padded">
    <div class="util-section-title" style="margin-top:0;" data-i18n="smtp_settings.test_section_title">Send a test email</div>
    <div class="util-hint" data-i18n="smtp_settings.test_help">Sends a short test message using the settings currently saved on file — save your changes first if you just edited them.</div>
    <label class="util-label" data-i18n="smtp_settings.test_email_label">Send to</label>
    <input type="email" id="smtpTestEmail" class="util-input" placeholder="you@example.com" autocapitalize="off" autocorrect="off" />
    <button type="button" class="util-save-btn pill" id="smtpTestBtn" style="margin-top:12px;">
      <span id="smtpTestBtnLabel" data-i18n="smtp_settings.test_btn">Send Test Email</span>
    </button>
    <div class="util-hint" id="smtpTestResult" style="margin-top:10px; display:none;"></div>
  </div>

  <button type="button" class="util-save-btn pill" id="smtpSaveBtn">
    <span id="smtpSaveBtnLabel" data-i18n="smtp_settings.save_btn">Save SMTP Settings</span>
  </button>
</div>

<div id="bottomNavWrap"></div>

<script src="dashboard.js"></script>
<script src="superadmin-smtp.js"></script>
<script src="pwa.js" defer></script>
</body>
</html>
