<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Create Alumni Account — MuslimEdu</title>
<meta name="description" content="Reconnect with your school and alumni community on MuslimEdu." />
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
<style>
  /* Same token set as login.php (already retinted to the dashboards'
     emerald palette) so this page reads as the very next step of that
     flow, not a separate product. */
  :root {
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
    overflow: hidden;
    display: flex; align-items: center; justify-content: center;
  }

  .screen {
    /* height/max-height subtract --meo-bar-h (0px when pwa.js's offline
       banner is hidden) so the card shrinks to fit below it instead of
       running past the viewport and getting clipped by overflow:hidden. */
    width: 100%; max-width: 480px;
    height: calc(100vh - var(--meo-bar-h, 0px)); height: calc(100dvh - var(--meo-bar-h, 0px));
    max-height: calc(960px - var(--meo-bar-h, 0px));
    margin: 0 auto; background: #EEF3F1; overflow: hidden;
    position: relative; display: flex; flex-direction: column;
  }

  .topbar { display: flex; align-items: center; gap: 12px; padding: 18px 20px 4px; flex-shrink: 0; }
  .back-btn {
    width: 38px; height: 38px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    background: var(--surface-2); border: 1px solid var(--border);
    cursor: pointer; transition: transform .15s ease; flex-shrink: 0;
  }
  .back-btn:active { transform: scale(0.92); }
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

  .body-scroll { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 0 20px; }
  .body-scroll::-webkit-scrollbar { display: none; }

  .step-dots { display: flex; gap: 6px; margin-top: 12px; margin-bottom: 18px; }
  .step-dots .dot { width: 7px; height: 7px; border-radius: 3.5px; background: var(--border); transition: all .2s ease; }
  .step-dots .dot.active { width: 24px; background: var(--accent); }
  .step-dots .dot.done { background: var(--accent-light); }

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
  .input-row svg { flex-shrink: 0; }
  .input-row input { flex: 1; min-width: 0; font-family: inherit; font-size: 15.5px; color: var(--text-1); background: transparent; border: none; outline: none; }
  .input-row input::placeholder { color: #9CA3AF; }
  .input-row.multiline { height: auto; align-items: flex-start; padding: 12px 16px; }
  .input-row.multiline textarea { flex: 1; min-width: 0; min-height: 76px; resize: vertical; font-family: inherit; font-size: 15.5px; line-height: 1.4; color: var(--text-1); background: transparent; border: none; outline: none; }
  .input-row.multiline textarea::placeholder { color: #9CA3AF; }
  .eye-btn { display: flex; cursor: pointer; padding: 2px; flex-shrink: 0; }

  .error-text { color: var(--danger); font-size: 12.5px; font-weight: 600; margin-top: 8px; display: none; }
  .error-text.show { display: block; }

  .school-search-wrap { margin-top: 4px; margin-bottom: 14px; }
  .school-row {
    display: flex; align-items: center; background: var(--surface-2);
    border-radius: 16px; border: 1.5px solid var(--border); padding: 12px; margin-bottom: 10px;
    cursor: pointer; transition: border-color .15s ease, background .15s ease;
  }
  .school-row.active { border-color: var(--accent); background: var(--accent-ghost); }
  .school-logo-wrap {
    width: 44px; height: 44px; border-radius: 12px; background: var(--accent-ghost);
    display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0;
  }
  .school-logo-wrap img { width: 100%; height: 100%; object-fit: cover; }
  .school-info { flex: 1; min-width: 0; margin-left: 12px; }
  .school-name { font-size: 14.5px; font-weight: 700; color: var(--text-1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .school-type { font-size: 12px; color: var(--text-3); margin-top: 2px; text-transform: capitalize; }
  .school-check { width: 24px; height: 24px; border-radius: 12px; background: var(--accent); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .school-empty, .school-loading { font-size: 13.5px; color: var(--text-3); text-align: center; padding: 30px 10px; }

  .school-banner {
    display: flex; align-items: center; gap: 8px; background: var(--accent-ghost);
    border-radius: 14px; padding: 12px 14px; margin-bottom: 14px;
  }
  .school-banner-text { flex: 1; min-width: 0; font-size: 13.5px; font-weight: 700; color: var(--accent); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .review-section-title { font-size: 12.5px; font-weight: 800; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.5px; margin: 18px 0 10px; }
  .review-section-title:first-child { margin-top: 0; }
  .review-row { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--border); }
  .review-row:last-child { border-bottom: none; }
  .review-label { font-size: 12.5px; color: var(--text-3); flex-shrink: 0; }
  .review-value { font-size: 13.5px; color: var(--text-1); font-weight: 700; text-align: right; }

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

  .footer { padding: 14px 16px 16px; flex-shrink: 0; background: var(--surface); border-top: 1px solid var(--border); }

  .success-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 40px 28px 24px; text-align: center; }
  .success-icon { width: 76px; height: 76px; border-radius: 38px; background: var(--accent-ghost); display: flex; align-items: center; justify-content: center; }
  .success-title { font-size: 20px; font-weight: 800; color: var(--text-1); margin-top: 20px; }
  .success-body { font-size: 14px; color: var(--text-2); margin-top: 12px; line-height: 1.5; }
  .pending-badge { background: var(--accent-ghost); border-radius: 999px; padding: 9px 16px; margin-top: 20px; margin-bottom: 30px; }
  .pending-badge span { color: var(--accent); font-weight: 700; font-size: 13px; }

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
    <div class="back-btn" id="backBtn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#1C1C1E" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    <div>
      <div class="topbar-title" data-i18n="alumni_registration.topbar_title">Create Alumni Account</div>
      <div class="topbar-subtitle" data-i18n="alumni_registration.topbar_subtitle">Reconnect with your school community</div>
    </div>
    <div class="spacer"></div>
    <div class="lang-chip" id="langChip">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#1C1C1E" stroke-width="1.6"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.7-3.8-9s1.3-6.4 3.8-9z" stroke="#1C1C1E" stroke-width="1.4"/></svg>
      <span id="langChipText">EN</span>
    </div>
  </div>

  <div class="body-scroll" id="bodyScroll">

    <div id="wizardWrap">
      <div class="step-dots" id="stepDots">
        <div class="dot active"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div>
      </div>

      <!-- Step 1: School -->
      <div id="step1">
        <div class="input-row" style="margin-bottom:14px;">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="#8E8E93" stroke-width="2"/><path d="M21 21l-4.3-4.3" stroke="#8E8E93" stroke-width="2" stroke-linecap="round"/></svg>
          <input type="text" id="schoolSearchInput" placeholder="Search for your school" data-i18n-placeholder="alumni_registration.school_search_placeholder" autocomplete="off" />
        </div>
        <div id="schoolListWrap"></div>
      </div>

      <!-- Step 2: Basic Info -->
      <div id="step2" style="display:none;">
        <div class="school-banner" id="selectedSchoolBanner"></div>
        <div class="card">
          <div class="field-label" data-i18n="alumni_registration.full_name_label">Full Name</div>
          <div class="input-row"><input type="text" id="nameInput" placeholder="As it appears on your records" data-i18n-placeholder="alumni_registration.full_name_placeholder" /></div>

          <div class="field-label" data-i18n="alumni_registration.email_label">Email</div>
          <div class="input-row"><input type="email" id="emailInput" placeholder="you@example.com" data-i18n-placeholder="alumni_registration.email_placeholder" autocapitalize="none" /></div>

          <div class="field-label"><span data-i18n="alumni_registration.phone_label">Phone</span> <span class="opt" data-i18n="alumni_registration.optional_suffix">(optional)</span></div>
          <div class="input-row"><input type="tel" id="phoneInput" placeholder="+63 912 345 6789" data-i18n-placeholder="alumni_registration.phone_placeholder" /></div>

          <div class="field-label" data-i18n="alumni_registration.password_label">Password</div>
          <div class="input-row">
            <input type="password" id="passwordInput" placeholder="At least 8 characters" data-i18n-placeholder="alumni_registration.password_placeholder" />
            <span class="eye-btn" id="passwordEyeBtn"><svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#8E8E93" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="#8E8E93" stroke-width="1.7"/></svg></span>
          </div>

          <div class="field-label" data-i18n="alumni_registration.confirm_password_label">Confirm Password</div>
          <div class="input-row">
            <input type="password" id="confirmPasswordInput" placeholder="Re-enter your password" data-i18n-placeholder="alumni_registration.confirm_password_placeholder" />
            <span class="eye-btn" id="confirmEyeBtn"><svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#8E8E93" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="#8E8E93" stroke-width="1.7"/></svg></span>
          </div>
          <div class="error-text" id="passwordError" data-i18n="alumni_registration.passwords_dont_match">Passwords don't match.</div>
        </div>
      </div>

      <!-- Step 3: Graduation -->
      <div id="step3" style="display:none;">
        <div class="card">
          <div class="field-label" data-i18n="alumni_registration.graduation_year_label">Graduation Year</div>
          <div class="input-row"><input type="text" inputmode="numeric" id="gradYearInput" placeholder="2024" maxlength="4" /></div>

          <div class="field-label"><span data-i18n="alumni_registration.program_label">Program / Degree</span> <span class="opt" data-i18n="alumni_registration.optional_suffix">(optional)</span></div>
          <div class="input-row"><input type="text" id="programInput" placeholder="e.g. Hifz Program, High School Diploma" data-i18n-placeholder="alumni_registration.program_placeholder" /></div>

          <div class="field-label"><span data-i18n="alumni_registration.anything_else_label">Anything else?</span> <span class="opt" data-i18n="alumni_registration.optional_suffix">(optional)</span></div>
          <div class="input-row multiline"><textarea id="notesInput" placeholder="Optional note for the school admin reviewing your application" data-i18n-placeholder="alumni_registration.notes_placeholder"></textarea></div>
        </div>
      </div>

      <!-- Step 4: Review -->
      <div id="step4" style="display:none;">
        <div class="card">
          <div class="review-section-title" data-i18n="alumni_registration.review_school_section">School</div>
          <div class="review-row"><span class="review-label" data-i18n="alumni_registration.review_school_label">School</span><span class="review-value" id="reviewSchool">—</span></div>

          <div class="review-section-title" data-i18n="alumni_registration.review_your_info_section">Your Info</div>
          <div class="review-row"><span class="review-label" data-i18n="alumni_registration.review_full_name_label">Full Name</span><span class="review-value" id="reviewName">—</span></div>
          <div class="review-row"><span class="review-label" data-i18n="alumni_registration.review_email_label">Email</span><span class="review-value" id="reviewEmail">—</span></div>
          <div class="review-row" id="reviewPhoneRow" style="display:none;"><span class="review-label" data-i18n="alumni_registration.review_phone_label">Phone</span><span class="review-value" id="reviewPhone">—</span></div>

          <div class="review-section-title" data-i18n="alumni_registration.review_graduation_section">Graduation</div>
          <div class="review-row"><span class="review-label" data-i18n="alumni_registration.review_graduation_year_label">Graduation Year</span><span class="review-value" id="reviewGradYear">—</span></div>
          <div class="review-row" id="reviewProgramRow" style="display:none;"><span class="review-label" data-i18n="alumni_registration.review_program_label">Program / Degree</span><span class="review-value" id="reviewProgram">—</span></div>
          <div class="review-row" id="reviewNotesRow" style="display:none;"><span class="review-label" data-i18n="alumni_registration.review_notes_label">Notes</span><span class="review-value" id="reviewNotes">—</span></div>
        </div>
        <div class="error-text" id="submitError" data-i18n="alumni_registration.submit_error_default">Something went wrong.</div>
      </div>
    </div>

    <!-- Success -->
    <div class="success-wrap" id="successWrap" style="display:none;">
      <div class="success-icon"><svg width="38" height="38" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#0F7A3D" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      <div class="success-title" data-i18n="alumni_registration.success_title">Application submitted</div>
      <div class="success-body" id="successBody" data-i18n="alumni_registration.success_body_default">Your alumni account is pending review. You'll be able to sign in once it's approved.</div>
      <div class="pending-badge"><span data-i18n="alumni_registration.pending_approval_badge">Status: Pending Approval</span></div>
      <a href="login.php" class="gradient-btn" style="text-decoration:none;max-width:280px;" data-i18n="alumni_registration.back_to_login">Back to Login</a>
    </div>

  </div>

  <div class="footer" id="pageFooter">
    <button type="button" class="gradient-btn" id="nextBtn" disabled>
      <span class="spinner"></span><span id="nextBtnLabel">Next</span>
    </button>
  </div>

  <div class="toast" id="toast"></div>
</div>

<script src="alumni-registration.js"></script>
<script src="pwa.js" defer></script>
</body>
</html>
