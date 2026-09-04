<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Edit Profile — MuslimEdu</title>
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
<body>

<div id="routeGuardSplash" class="route-guard-splash"><div class="route-guard-spinner"></div></div>

<div id="utilHeaderWrap"></div>

<div class="util-body" id="utilBody" style="display:none;">
  <div class="util-card padded">
    <div class="util-avatar-wrap">
      <div class="util-avatar-btn" id="avatarBtn">
        <span class="util-avatar-photo-wrap" id="avatarPreviewWrap"></span>
        <input type="file" id="photoInput" class="util-avatar-input" accept="image/png,image/jpeg,image/jpg" />
        <span class="util-avatar-edit-badge">
          <span id="avatarEditIcon"></span>
        </span>
      </div>
      <div class="util-avatar-hint" data-i18n="edit_profile.photo_hint">Max 5 MB — larger images are compressed automatically. JPG, JPEG, or PNG.</div>
      <div class="util-error-text" id="photoError" style="display:none;"></div>
    </div>

    <div class="util-card-divider"></div>

    <label class="util-label" style="margin-top:0;" data-i18n="edit_profile.name_label">Name</label>
    <input type="text" id="nameInput" class="util-input" placeholder="Your full name" data-i18n-placeholder="edit_profile.name_placeholder" />
    <label class="util-label" data-i18n="edit_profile.name_ar_label">Arabic Name (optional)</label>
    <input type="text" id="nameArInput" class="util-input" dir="rtl" />
    <label class="util-label" data-i18n="edit_profile.email_label">Email</label>
    <input type="email" id="emailInput" class="util-input" placeholder="you@example.com" autocapitalize="none" />
    <label class="util-label" data-i18n="edit_profile.phone_label">Phone (optional)</label>
    <input type="tel" id="phoneInput" class="util-input" />
    <label class="util-label" data-i18n="edit_profile.address_label">Address (optional)</label>
    <textarea id="addressInput" class="util-input" placeholder="Your address" data-i18n-placeholder="edit_profile.address_placeholder"></textarea>
    <label class="util-label" data-i18n="edit_profile.gender_label">Gender (optional)</label>
    <select id="genderInput" class="util-input">
      <option value="" data-i18n="common.select">Select…</option>
      <option value="male" data-i18n="admission.gender_male">Male</option>
      <option value="female" data-i18n="admission.gender_female">Female</option>
    </select>
    <label class="util-label" data-i18n="edit_profile.birthday_label">Birthday (optional)</label>
    <input type="date" id="birthdayInput" class="util-input" />
    <label class="util-label" data-i18n="edit_profile.emergency_contact_name_label">Emergency Contact Name (optional)</label>
    <input type="text" id="emergencyNameInput" class="util-input" />
    <label class="util-label" data-i18n="edit_profile.emergency_contact_phone_label">Emergency Contact Phone (optional)</label>
    <input type="tel" id="emergencyPhoneInput" class="util-input" />
  </div>

  <button type="button" class="util-save-btn" id="saveBtn">
    <span id="saveBtnLabel" data-i18n="edit_profile.save_btn">Save Changes</span>
  </button>
</div>

<script src="dashboard.js"></script>
<script src="edit-profile.js"></script>
<script src="pwa.js" defer></script>
</body>
</html>
