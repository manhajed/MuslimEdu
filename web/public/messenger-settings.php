<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Messenger Integration — MuslimEdu</title>
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
/* Scoped to this page - the read-only "paste this into Facebook" fields
   (webhook URL, verify token) need a copy button next to them, which
   nothing else in dashboard.css has a pattern for yet. */
.ms-readonly-row { display: flex; align-items: center; gap: 8px; }
.ms-readonly-row .util-input { background: #F5F5F7; color: var(--subtle); }
.ms-copy-btn { flex-shrink: 0; width: 40px; height: 40px; border-radius: 10px; background: var(--emerald-gradient-soft); color: var(--emerald-deep); display: flex; align-items: center; justify-content: center; }
</style>
</head>
<body>

<div id="routeGuardSplash" class="route-guard-splash"><div class="route-guard-spinner"></div></div>

<div id="utilHeaderWrap"></div>

<div class="util-body" id="utilBody" style="display:none;">
  <div class="util-hint" data-i18n="messenger_settings.hint">Connect MuslimEdu's own Facebook Page so any user, at any school, can get their notifications echoed to Messenger too. This is platform-wide, not per-school - one Page for the whole MuslimEdu community. Requires a Facebook Page and a Facebook Developer App with the Messenger Platform enabled - see the setup guide if you haven't created those yet.</div>

  <div class="util-card padded">
    <label class="util-label" style="margin-top:0;" data-i18n="messenger_settings.page_id_label">Facebook Page ID</label>
    <input type="text" id="msPageId" class="util-input" placeholder="e.g. 102938475610234" data-i18n-placeholder="messenger_settings.page_id_placeholder" />

    <label class="util-label" data-i18n="messenger_settings.page_username_label">Page username (for your m.me link)</label>
    <input type="text" id="msPageUsername" class="util-input" placeholder="e.g. muslim3du" data-i18n-placeholder="messenger_settings.page_username_placeholder" />
    <div class="util-hint" style="margin-top:4px;" data-i18n="messenger_settings.page_username_hint">Just the username — the part after facebook.com/ in your Page's URL. Pasting the whole link works too; it gets trimmed down on save.</div>

    <label class="util-label" data-i18n="messenger_settings.token_label">Page Access Token</label>
    <input type="password" id="msPageAccessToken" class="util-input" placeholder="" data-i18n-placeholder="messenger_settings.token_placeholder" autocomplete="off" />
    <div class="util-hint" style="margin-top:4px;" data-i18n="messenger_settings.token_hint">Leave blank to keep the token already on file.</div>

    <label class="util-label" data-i18n="messenger_settings.secret_label">App Secret</label>
    <input type="password" id="msAppSecret" class="util-input" placeholder="" data-i18n-placeholder="messenger_settings.secret_placeholder" autocomplete="off" />
    <div class="util-hint" style="margin-top:4px;" data-i18n="messenger_settings.secret_hint">Leave blank to keep the secret already on file. Used only to verify that webhook calls really came from Meta.</div>

    <label class="util-label" data-i18n="messenger_settings.verify_token_label">Webhook verify token</label>
    <input type="text" id="msVerifyToken" class="util-input" placeholder="Choose any string - you'll paste it into Facebook too" data-i18n-placeholder="messenger_settings.verify_token_placeholder" />
  </div>

  <div class="util-card padded">
    <div class="util-section-title" style="margin-top:0;" data-i18n="messenger_settings.webhook_section_title">Paste these into your Facebook App's Webhooks setup</div>

    <label class="util-label" style="margin-top:0;" data-i18n="messenger_settings.webhook_url_label">Webhook URL</label>
    <div class="ms-readonly-row">
      <input type="text" id="msWebhookUrl" class="util-input" readonly />
      <button type="button" class="ms-copy-btn" id="msCopyUrlBtn" aria-label="Copy"></button>
    </div>

    <div class="util-hint" style="margin-top:10px;" data-i18n="messenger_settings.webhook_help">In Meta's App Dashboard: Messenger &gt; Settings &gt; Webhooks &gt; Add Callback URL. Use the URL above, the verify token you set here, and subscribe to the "messages", "messaging_postbacks", "messaging_optins", and "messaging_referrals" fields.</div>
  </div>

  <div class="util-card padded">
    <div class="util-section-title" style="margin-top:0;" data-i18n="messenger_settings.subscribe_section_title">Connect the Page to this webhook</div>
    <div class="util-hint" data-i18n="messenger_settings.subscribe_help">Subscribing to webhook fields in Meta's dashboard tells Meta which events to send. This tells it to send them for your Page — a separate step, and the usual reason a correct-looking setup receives nothing at all. Safe to run again any time; it just re-confirms.</div>
    <button type="button" class="util-save-btn pill" id="msSubscribeBtn" style="margin-top:12px;">
      <span id="msSubscribeBtnLabel" data-i18n="messenger_settings.subscribe_btn">Subscribe Page to webhook</span>
    </button>
    <div class="util-hint" id="msSubscribeResult" style="margin-top:10px; display:none;"></div>
  </div>

  <button type="button" class="util-save-btn pill" id="msSaveBtn">
    <span id="msSaveBtnLabel" data-i18n="messenger_settings.save_btn">Save Messenger settings</span>
  </button>
</div>

<div id="bottomNavWrap"></div>

<script src="dashboard.js"></script>
<script src="messenger-settings.js"></script>
<script src="pwa.js" defer></script>
</body>
</html>
