<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Languages — MuslimEdu</title>
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
  <div class="util-section-title">Languages</div>
  <div class="util-card" id="langCard"></div>
  <button type="button" class="util-save-btn pill" id="addLangBtn">+ Add Language</button>

  <div class="util-section-title" style="margin-top:24px;">Translations</div>
  <div class="chip-row" id="langChipRow"></div>
  <p class="util-hint" id="langHint">
    Word-by-word overrides for the selected language. These are platform-wide
    defaults — every school inherits them unless it sets its own override
    for the same key.
  </p>
  <div class="util-card" id="translationsCard" style="margin-top:10px;"></div>

  <div class="util-card" style="margin-top:16px; padding:14px;">
    <label class="util-label" style="margin-top:0;">Key</label>
    <input type="text" id="termKey" class="util-input" placeholder="e.g. superadmin_dashboard.schools_title" autocapitalize="off" autocorrect="off" />
    <label class="util-label">Text for this language</label>
    <input type="text" id="termValue" class="util-input" placeholder="Translated text" />
    <button type="button" class="util-save-btn pill" id="addTermBtn" style="margin-top:12px;">+ Add Term</button>
  </div>

  <button type="button" class="util-save-btn" id="saveTranslationsBtn" style="margin-top:16px;" disabled>Save Changes</button>
</div>

<script src="dashboard.js"></script>
<script src="superadmin-language.js"></script>
<script src="pwa.js" defer></script>
</body>
</html>
