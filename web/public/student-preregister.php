<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Student Pre-Registration — MuslimEdu</title>
<meta name="description" content="Fill in your information ahead of time so the school doesn't have to type it for you." />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; worker-src 'self'; manifest-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob: https://manhaje.com; connect-src 'self' https://manhaje.com; base-uri 'none'; form-action 'none'; upgrade-insecure-requests" />
<meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
<meta name="color-scheme" content="light" />
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
<style>
  /* Same token set/shell as alumni-registration.php - this is the page a
     school's walk-in admission QR (Admission Management, admin-facing)
     opens on the student's OWN phone, so it needs to read as the same
     product, not a separate site. */
  :root {
    /* Chrome for Android auto-darkens/desaturates pages that never say
       otherwise - the ghost-green selfie circle background and dashed
       border are exactly the kind of soft, near-white tone that heuristic
       tends to mute or invert. The <meta name="color-scheme"> tag in
       <head> is the one that actually stops Chrome's own force-dark
       feature; this property is the standards-track version of the same
       signal (and covers Firefox/Safari's own light/dark form-control
       theming), kept here too so the page doesn't rely on just one of them. */
    color-scheme: light;
    --bg:           #E5F8F5;
    --surface:      #F5FBF8;
    --surface-2:    #FFFFFF;
    --accent:       #0F7A3D;
    --accent-mid:   #1FAE64;
    --accent-light: #7FD9A8;
    --accent-ghost: rgba(15,122,61,0.08);
    --accent-border:rgba(15,122,61,0.15);
    --text-1:       #1C1C1E;
    --text-2:       #4B5754;
    --text-3:       #8E8E93;
    --border:       rgba(28,28,30,0.08);
    --danger:       #D9534F;
    --shadow-sm:    0 2px 12px rgba(13,30,28,0.06);
    --shadow-md:    0 8px 32px rgba(13,30,28,0.10);
    --shadow-lg:    0 24px 64px rgba(13,30,28,0.16);
    --radius:       16px;
    --radius-lg:    24px;
  }
  * , *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; }
  body {
    font-family: 'DM Sans', sans-serif;
    background: radial-gradient(circle at 30% 20%, #F0FBF5, var(--bg) 60%);
    color: var(--text-1);
    width: 100vw;
    min-height: 100vh; min-height: 100dvh;
  }

  /* Unlike register.php/login.php/alumni-registration.php's own .screen
     (a fixed one-viewport wizard frame with its OWN internal-only scroll
     region - appropriate there since each step is meant to read as a
     single screen), this is one plain scrolling form with a dynamic,
     admin-configured field count that can run arbitrarily long. Fighting
     for a fixed-height nested-flex scroll container here bought nothing
     and was fragile; the page just scrolls normally instead, with the
     submit button pinned near the bottom via position:sticky rather than
     a flex footer. */
  .screen {
    width: 100%; max-width: 480px;
    min-height: 100vh; min-height: 100dvh;
    margin: 0 auto; background: #EEF3F1;
    position: relative; display: flex; flex-direction: column;
  }

  .topbar { display: flex; align-items: center; gap: 12px; padding: 18px 20px 4px; flex-shrink: 0; }
  .topbar-title { font-size: 16px; font-weight: 800; color: var(--text-1); letter-spacing: -0.3px; }
  .topbar-subtitle { font-size: 12px; color: var(--text-3); margin-top: 2px; }
  .topbar .spacer { flex: 1; }
  .lang-chip {
    display: flex; align-items: center; gap: 5px;
    background: rgba(255,255,255,0.6);
    border: 1px solid rgba(255,255,255,0.7);
    padding: 7px 11px; border-radius: 100px;
    font-size: 12px; font-weight: 700; color: var(--text-1);
    box-shadow: var(--shadow-sm);
    cursor: pointer; user-select: none; transition: transform .15s ease;
    flex-shrink: 0;
  }
  .lang-chip:active { transform: scale(0.94); }

  .body-scroll { flex: 1; padding: 14px 20px 20px; }

  .school-card {
    display: flex; align-items: center; gap: 12px; background: var(--surface-2);
    border-radius: var(--radius-lg); padding: 14px; margin-bottom: 16px;
    box-shadow: var(--shadow-sm);
  }
  .school-card-logo {
    width: 48px; height: 48px; border-radius: 14px; flex-shrink: 0;
    background: var(--accent-ghost); display: flex; align-items: center; justify-content: center;
    overflow: hidden; font-size: 18px; font-weight: 800; color: var(--accent);
  }
  .school-card-logo img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .school-card-text { flex: 1; min-width: 0; }
  .school-card-eyebrow { font-size: 11px; font-weight: 700; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.5px; }
  .school-card-name { font-size: 15.5px; font-weight: 800; color: var(--text-1); margin-top: 2px; }

  .card {
    margin-bottom: 16px; background: rgba(255,255,255,0.65);
    backdrop-filter: blur(18px) saturate(180%); -webkit-backdrop-filter: blur(18px) saturate(180%);
    border-radius: var(--radius-lg); border: 1px solid rgba(255,255,255,0.6);
    padding: 20px; box-shadow: var(--shadow-md);
  }
  .field-label { font-size: 12px; font-weight: 800; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 10px; }
  .field-label:not(:first-child) { margin-top: 18px; }
  .field-label .opt { text-transform: none; font-weight: 600; letter-spacing: 0; color: var(--text-3); opacity: 0.8; }
  .input-row {
    display: flex; align-items: center; gap: 12px; height: 52px;
    border-radius: 14px; border: 1.5px solid var(--border);
    background: rgba(255,255,255,0.7); padding: 0 16px;
    transition: border-color .15s ease, box-shadow .15s ease;
  }
  .input-row:focus-within { border-color: var(--accent-mid); box-shadow: 0 0 0 3px var(--accent-ghost); }
  .input-row input, .input-row select { flex: 1; min-width: 0; font-family: inherit; font-size: 15.5px; color: var(--text-1); background: transparent; border: none; outline: none; }
  .input-row input::placeholder { color: #9CA3AF; }
  .input-row.multiline { height: auto; align-items: flex-start; padding: 12px 16px; }
  .input-row.multiline textarea { flex: 1; min-width: 0; min-height: 76px; resize: vertical; font-family: inherit; font-size: 15.5px; line-height: 1.4; color: var(--text-1); background: transparent; border: none; outline: none; }

  .doc-row { display: flex; align-items: center; gap: 12px; border-radius: 14px; border: 1.5px dashed var(--border); background: rgba(255,255,255,0.5); padding: 12px 14px; }
  .doc-row.attached { border-style: solid; border-color: var(--accent-mid); background: var(--accent-ghost); }
  .doc-row-icon { width: 36px; height: 36px; border-radius: 10px; background: var(--surface-2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .doc-row-text { flex: 1; min-width: 0; }
  .doc-row-name { font-size: 13px; font-weight: 700; color: var(--text-1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .doc-row-hint { font-size: 11.5px; color: var(--text-3); margin-top: 1px; }
  .doc-choose-btn { flex-shrink: 0; font-family: inherit; font-size: 12.5px; font-weight: 700; color: var(--accent); background: var(--surface-2); border: 1px solid var(--accent-border); border-radius: 100px; padding: 8px 14px; cursor: pointer; }

  .error-text { color: var(--danger); font-size: 12.5px; font-weight: 600; margin-top: 8px; display: none; }
  .error-text.show { display: block; }
  .field-hint { font-size: 11.5px; color: var(--text-3); margin-top: 8px; line-height: 1.4; }

  .selfie-wrap { display: flex; flex-direction: column; align-items: center; text-align: center; }
  .selfie-btn { position: relative; width: 100px; height: 100px; border: none; background: none; padding: 0; cursor: pointer; flex-shrink: 0; }
  .selfie-circle {
    width: 100px; height: 100px; border-radius: 50px; overflow: hidden;
    background: var(--accent-ghost); display: flex; align-items: center; justify-content: center;
    border: 2px dashed var(--accent-border);
  }
  .selfie-circle.filled { border-style: solid; border-color: var(--accent-mid); }
  .selfie-circle img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .selfie-badge {
    position: absolute; right: -2px; bottom: -2px; width: 32px; height: 32px; border-radius: 16px;
    background: var(--accent); display: flex; align-items: center; justify-content: center;
    border: 2px solid var(--surface-2);
  }

  .gradient-btn {
    width: 100%; height: 54px; border: none; border-radius: 999px;
    background: linear-gradient(135deg, var(--accent-light), var(--accent));
    color: #fff; font-family: inherit; font-size: 15.5px; font-weight: 800;
    box-shadow: 0 8px 20px rgba(15,122,61,0.30); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: transform .12s ease, opacity .15s ease;
  }
  .gradient-btn:active { transform: scale(0.98); }
  .gradient-btn:disabled { opacity: 0.5; cursor: default; }
  .gradient-btn .spinner {
    width: 16px; height: 16px; border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff;
    animation: spin .7s linear infinite; margin-right: 8px; display: none;
  }
  .gradient-btn.loading .spinner { display: inline-block; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .footer {
    position: sticky; bottom: 0; padding: 14px 16px calc(16px + env(safe-area-inset-bottom));
    background: var(--surface); border-top: 1px solid var(--border);
  }

  .center-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 30px; text-align: center; }
  .center-state-text { font-size: 13.5px; color: var(--text-3); margin-top: 12px; }
  .retry-btn { margin-top: 14px; font-family: inherit; font-size: 13px; font-weight: 700; color: var(--accent); background: var(--accent-ghost); border: none; border-radius: 100px; padding: 9px 18px; cursor: pointer; }

  .success-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 40px 28px 24px; text-align: center; }
  .success-icon { width: 76px; height: 76px; border-radius: 38px; background: var(--accent-ghost); display: flex; align-items: center; justify-content: center; }
  .success-title { font-size: 20px; font-weight: 800; color: var(--text-1); margin-top: 20px; }
  .success-body { font-size: 14px; color: var(--text-2); margin-top: 12px; line-height: 1.5; }

  .toast {
    position: absolute; left: 50%; bottom: 28px; z-index: 40; transform: translate(-50%, 16px);
    background: var(--text-1); color: #fff; padding: 11px 18px; border-radius: 100px;
    font-size: 13px; font-weight: 700; opacity: 0; pointer-events: none;
    transition: all .25s ease; box-shadow: var(--shadow-md); white-space: nowrap;
  }
  .toast.show { opacity: 1; transform: translate(-50%, 0); }
</style>
</head>
<body>

<div class="screen">

  <div class="topbar">
    <div>
      <div class="topbar-title" id="topbarTitle" data-i18n="student_preregister.topbar_title">Student Pre-Registration</div>
      <div class="topbar-subtitle" id="topbarSubtitle" data-i18n="student_preregister.topbar_subtitle">Fill this in - the school won't have to type it for you.</div>
    </div>
    <div class="spacer"></div>
    <div class="lang-chip" id="langChip">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#1C1C1E" stroke-width="1.6"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.7-3.8-9s1.3-6.4 3.8-9z" stroke="#1C1C1E" stroke-width="1.4"/></svg>
      <span id="langChipText">EN</span>
    </div>
  </div>

  <div id="loadingState" class="center-state" style="display:none;">
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#1FAE64" stroke-width="2.4" stroke-dasharray="40" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/></circle></svg>
    <div class="center-state-text" id="loadingStateText" data-i18n="student_preregister.loading">Loading the form…</div>
  </div>

  <div id="errorState" class="center-state" style="display:none;">
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#D9534F" stroke-width="1.8"/><line x1="12" y1="8" x2="12" y2="12" stroke="#D9534F" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="16" x2="12.01" y2="16" stroke="#D9534F" stroke-width="2" stroke-linecap="round"/></svg>
    <div class="center-state-text" id="errorStateText" data-i18n="student_preregister.load_error">This link couldn't be opened.</div>
    <button type="button" class="retry-btn" id="retryBtn" data-i18n="student_preregister.try_again">Try again</button>
  </div>

  <div id="formWrap" style="display:none; flex-direction:column; flex:1;">
    <div class="body-scroll" id="bodyScroll">
      <div class="school-card" id="schoolCard">
        <span class="school-card-logo" id="schoolCardLogo"></span>
        <div class="school-card-text">
          <div class="school-card-eyebrow" data-i18n="student_preregister.registering_with">Registering with</div>
          <div class="school-card-name" id="schoolCardName"></div>
        </div>
      </div>
      <div class="card" id="credentialsCard">
        <div class="field-label" data-i18n="student_preregister.login_section_title">Email</div>
        <div class="input-row"><input type="email" id="credEmail" autocomplete="email" inputmode="email" /></div>

        <div class="field-label" data-i18n="student_preregister.password_label">Password</div>
        <div class="input-row"><input type="password" id="credPassword" autocomplete="new-password" /></div>

        <div class="field-label" data-i18n="student_preregister.password_confirm_label">Confirm Password</div>
        <div class="input-row"><input type="password" id="credPasswordConfirm" autocomplete="new-password" /></div>

        <div class="field-hint" data-i18n="student_preregister.password_hint">Use at least 6 characters. You'll use this to sign in once the school approves your registration.</div>
        <div class="error-text" id="credError"></div>
      </div>

      <div class="card" id="selfieCard">
        <div class="field-label" data-i18n="student_preregister.selfie_section_title">Selfie Verification</div>
        <div class="selfie-wrap">
          <button type="button" class="selfie-btn" id="selfieBtn" aria-label="Take a selfie">
            <span class="selfie-circle" id="selfieCircle">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none"><path d="M4 8a2 2 0 012-2h1.2a1 1 0 00.86-.49l.8-1.34A2 2 0 0110.5 3h3a2 2 0 011.64 1.17l.8 1.34a1 1 0 00.86.49H18a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" stroke="#0F7A3D" stroke-width="1.7" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.4" stroke="#0F7A3D" stroke-width="1.7"/></svg>
            </span>
            <span class="selfie-badge">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 8a2 2 0 012-2h1.2a1 1 0 00.86-.49l.8-1.34A2 2 0 0110.5 3h3a2 2 0 011.64 1.17l.8 1.34a1 1 0 00.86.49H18a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="13" r="3" stroke="#fff" stroke-width="2"/></svg>
            </span>
          </button>
          <input type="file" id="selfieInput" accept="image/*" capture="user" hidden />
          <div class="field-hint" id="selfieHint" data-i18n="student_preregister.selfie_hint">Take a clear selfie so the school can confirm a real person submitted this.</div>
        </div>
        <div class="error-text" id="selfieError"></div>
      </div>

      <div class="card" id="fieldsCard"></div>
      <div class="error-text" id="formError"></div>
    </div>
    <div class="footer">
      <button type="button" class="gradient-btn" id="submitBtn">
        <span class="spinner"></span>
        <span id="submitBtnLabel" data-i18n="student_preregister.submit_btn">Submit</span>
      </button>
    </div>
  </div>

  <div id="successWrap" class="success-wrap" style="display:none;">
    <div class="success-icon"><svg width="34" height="34" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#0F7A3D" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    <div class="success-title" id="successTitle" data-i18n="student_preregister.success_title">Sent!</div>
    <div class="success-body" id="successBody"></div>
    <a href="login.php" class="gradient-btn" style="text-decoration:none;max-width:280px;margin-top:28px;" data-i18n="student_preregister.login_btn">Login</a>
  </div>

  <div class="toast" id="toast"></div>
</div>

<script src="student-preregister.js?v=6"></script>
<script src="pwa.js" defer></script>
</body>
</html>
