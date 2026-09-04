<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Register Your School — MuslimEdu</title>
<meta name="description" content="Register your mahad, madrasa, markaz, regular school, or orphanage on MuslimEdu. Your application is reviewed by MuslimEdu staff before your account goes live." />
<!-- Application-layer hardening. See web/SECURITY.md for what this does and
     does NOT cover - frame-ancestors/X-Frame-Options, HSTS, and X-Content-
     Type-Options are silently ignored (or unsupported) via <meta> and need
     real HTTP headers from whatever serves this file. img-src/connect-src
     include blob: and manhaje.com for the on-device photo preview + the
     multipart upload to school_registration_submit. -->
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; worker-src 'self'; manifest-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; connect-src 'self' https://manhaje.com; base-uri 'none'; form-action 'none'; upgrade-insecure-requests" />
<meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
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
  :root {
    /* Re-themed to match the dashboards' emerald palette (dashboard.css)
       instead of this page's old standalone teal — same token names, new
       values, so every existing var(--accent)/var(--text-1)/etc. usage
       below picks it up with no other changes. */
    --bg:           #E5F8F5; /* = dashboard --emerald-soft */
    --surface:      #F5FBF8;
    --surface-2:    #FFFFFF;
    --accent:       #0F7A3D; /* = dashboard --emerald-deep */
    --accent-mid:   #1FAE64; /* = dashboard --emerald */
    --accent-light: #7FD9A8; /* = dashboard --pale-green */
    --accent-ghost: rgba(15,122,61,0.08);
    --accent-border:rgba(15,122,61,0.15);
    --text-1:       #1C1C1E; /* = dashboard --ink */
    --text-2:       #4B5754;
    --text-3:       #8E8E93; /* = dashboard --subtle */
    --border:       rgba(28,28,30,0.08);
    --danger:       #D9534F;
    --gold:         #D4A64A;
    --shadow-sm:    0 2px 12px rgba(13,30,28,0.06);
    --shadow-md:    0 8px 32px rgba(13,30,28,0.10);
    --shadow-lg:    0 24px 64px rgba(13,30,28,0.16);
    --radius:       16px;
    --radius-lg:    24px;
  }
  * , *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; overflow: hidden; background: #F5FBF8; }
  body {
    font-family: 'DM Sans', sans-serif;
    background: radial-gradient(circle at 30% 20%, #F0FBF5, var(--bg) 60%);
    color: var(--text-1);
    width: 100vw;
    min-height: 100vh; min-height: 100dvh;
    display: flex; align-items: center; justify-content: center;
  }
  em { font-style: italic; font-family: 'Playfair Display', serif; color: var(--accent); }

  .screen {
    width: 100%;
    max-width: 480px;
    /* Shrinks by exactly as much space as pwa.js's offline banner is
       currently reserving via body's padding-top (--meo-bar-h, 0px when
       hidden) - keeps the card's bottom from running past the viewport
       and getting clipped by this element's own overflow:hidden below. */
    height: calc(100vh - var(--meo-bar-h, 0px));
    height: calc(100dvh - var(--meo-bar-h, 0px));
    max-height: calc(960px - var(--meo-bar-h, 0px));
    margin: 0 auto;
    background: #F5FBF8;
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;
  }

  /* ── STATUS / TOPBAR ── */
  .topbar {
    display: flex; align-items: center; gap: 12px;
    padding: 14px 20px 4px;
    flex-shrink: 0;
  }
  .logo-mark {
    width: 32px; height: 32px; border-radius: 9px;
    overflow: hidden; flex-shrink: 0;
    box-shadow: var(--shadow-sm);
  }
  .logo-mark img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .topbar-title { font-size: 15px; font-weight: 800; color: var(--text-1); letter-spacing: -0.3px; }
  .topbar .spacer { flex: 1; }
  .lang-chip {
    display: flex; align-items: center; gap: 5px;
    background: rgba(255,255,255,0.6);
    border: 1px solid rgba(255,255,255,0.7);
    padding: 7px 11px; border-radius: 100px;
    font-size: 12px; font-weight: 700; color: var(--text-1);
    box-shadow: var(--shadow-sm);
    cursor: pointer; user-select: none; transition: transform .15s ease;
  }
  .lang-chip:active { transform: scale(0.94); }
  .back-btn {
    width: 36px; height: 36px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    background: var(--surface-2);
    border: 1px solid var(--border);
    cursor: pointer; transition: transform .15s ease;
    flex-shrink: 0;
  }
  .back-btn:active { transform: scale(0.92); }

  /* ── BODY ──
     The app shell itself (.screen) is a fixed one-viewport frame with no
     page-level scroll or bounce - each step is meant to read as a single
     screen, not a scrolling form. .body-scroll is the safety valve: on a
     step whose content fits (nearly all of them), it never engages and
     is visually inert. On a step that's genuinely taller than the
     viewport (e.g. Administrator Account with the password hint
     expanded on a shorter phone), it scrolls internally so the Continue
     button is always reachable - it must be overflow-y:auto here, not
     hidden, or content past the fold becomes permanently unreachable. */
  .body-scroll {
    flex: 1; overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding: 0 20px;
  }
  .body-scroll::-webkit-scrollbar { display: none; }

  .panel { opacity: 0; transform: translateX(28px); }
  .panel.enter { animation: panelIn .38s cubic-bezier(.2,.7,.3,1) forwards; }
  .panel.enter-back { animation: panelInBack .38s cubic-bezier(.2,.7,.3,1) forwards; }
  @keyframes panelIn { to { opacity: 1; transform: translateX(0); } }
  @keyframes panelInBack { from { opacity: 0; transform: translateX(-28px); } to { opacity: 1; transform: translateX(0); } }

  /* ── HERO ── */
  .hero { margin-top: 16px; }
  .hero-title {
    font-size: 34px; font-weight: 800; line-height: 39px; letter-spacing: -0.5px; color: var(--text-1);
  }
  .hero-title .accent { color: var(--accent); }
  .hero-subtitle-row { margin-top: 8px; font-size: 15px; line-height: 21px; color: var(--text-2); }
  .hero-subtitle-row .accent { color: var(--accent); font-weight: 700; }

  .hero-row { display: flex; align-items: center; gap: 10px; margin-top: 14px; }
  .hero-row .hero-title-compact {
    font-size: 27px; font-weight: 800; line-height: 32px; letter-spacing: -0.4px; color: var(--text-1);
  }
  .hero-row .hero-text-col { flex: 1; min-width: 0; }
  .hero-illustration { flex-shrink: 0; width: 130px; }
  .hero-illustration img { width: 100%; height: auto; display: block; }

  .email-chip {
    display: inline-flex; align-items: center; gap: 8px;
    margin-top: 12px;
    padding: 8px 14px;
    border-radius: 100px;
    background: var(--accent-ghost);
    border: 1px solid var(--accent-border);
  }
  .email-chip span {
    font-size: 13px; font-weight: 700; color: var(--accent);
    max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }

  /* ── CARD ── */
  .card {
    margin-top: 14px;
    background: rgba(255,255,255,0.55);
    backdrop-filter: blur(18px) saturate(180%);
    -webkit-backdrop-filter: blur(18px) saturate(180%);
    border-radius: var(--radius-lg);
    border: 1px solid rgba(255,255,255,0.6);
    padding: 16px;
    box-shadow: var(--shadow-md);
  }
  .field-label {
    font-size: 15px; font-weight: 700; color: var(--text-1);
    margin-bottom: 8px;
  }
  .input-row {
    display: flex; align-items: center; gap: 12px;
    height: 46px;
    border-radius: 14px;
    border: none;
    background: #F2F2F7;
    padding: 0 16px;
    transition: background-color .15s ease;
  }
  .input-row:focus-within { background: #EAEAEE; }
  .input-row svg { flex-shrink: 0; }
  .input-row input {
    flex: 1; min-width: 0;
    font-family: inherit; font-size: 16px; color: var(--text-1);
    background: transparent; border: none; outline: none;
  }
  .input-row input::placeholder { color: var(--text-3); }
  .eye-btn { display: flex; cursor: pointer; padding: 2px; flex-shrink: 0; }

  .error-text { color: var(--danger); font-size: 12.5px; font-weight: 600; margin-top: 8px; display: none; }
  .error-text.show { display: block; }
  .helper-text { font-size: 12.5px; color: var(--text-3); margin-top: 10px; line-height: 18px; }

  .options-row {
    display: flex; align-items: center; justify-content: space-between;
    margin-top: 16px; gap: 12px; flex-wrap: wrap;
  }
  .remember-row { display: flex; align-items: center; cursor: pointer; user-select: none; }
  .checkbox {
    width: 20px; height: 20px; border-radius: 6px;
    border: 1.5px solid var(--border);
    margin-right: 9px;
    display: flex; align-items: center; justify-content: center;
    transition: background .15s ease, border-color .15s ease;
    flex-shrink: 0;
  }
  .checkbox.checked { background: var(--accent); border-color: var(--accent); }
  .checkbox svg { display: none; }
  .checkbox.checked svg { display: block; }
  .remember-text { font-size: 13px; color: var(--text-1); font-weight: 600; }
  .forgot-text { font-size: 13px; color: var(--accent); font-weight: 800; cursor: pointer; }

  .gradient-btn {
    margin-top: 14px;
    width: 100%; height: 48px;
    border: none; border-radius: 999px;
    background: linear-gradient(135deg, var(--accent-light), var(--accent));
    color: #fff; font-family: inherit; font-size: 16px; font-weight: 800;
    box-shadow: 0 8px 20px rgba(26,122,110,0.30);
    cursor: pointer;
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

  .step-dots { display: flex; gap: 6px; justify-content: center; margin-top: 10px; }
  .step-dots .dot { width: 7px; height: 7px; border-radius: 3.5px; background: var(--border); transition: all .2s ease; }
  .step-dots .dot.active { width: 24px; background: var(--text-1); }

  .get-started-row {
    display: flex; align-items: center; justify-content: center;
    margin-top: 16px; padding-bottom: 8px;
  }
  .get-started-row .muted { font-size: 13px; color: var(--text-3); font-weight: 600; }
  .get-started-row .link { font-size: 13px; color: var(--accent); font-weight: 800; cursor: pointer; }

  /* ── FOOTER ── */
  .footer { padding: 8px 16px 10px; text-align: center; flex-shrink: 0; flex-grow: 0; position: static; float: none; width: 100%; background: var(--surface); border-top: 1px solid var(--border); }
  .footer-row {
    display: flex; flex-wrap: wrap; align-items: center; justify-content: center;
    gap: 0;
  }
  .footer-row a {
    font-size: 12.5px; font-weight: 600; color: #1F2937; text-decoration: none;
  }
  .footer-sep { width: 1px; height: 11px; background: var(--border); margin: 0 9px; }
  .footer-secondary { margin-top: 8px; }
  .footer-copyright { font-size: 12px; color: var(--text-3); margin-top: 8px; }

  /* ── GET STARTED SHEET ── */
  .modal-backdrop {
    position: absolute; inset: 0; z-index: 20;
    background: rgba(6,30,22,0.5);
    opacity: 0; pointer-events: none;
    transition: opacity .22s ease;
    display: flex; align-items: flex-end;
  }
  .modal-backdrop.open { opacity: 1; pointer-events: auto; }
  .sheet {
    width: 100%;
    background: var(--surface-2);
    border-top-left-radius: 28px; border-top-right-radius: 28px;
    padding: 0 20px 26px;
    transform: translateY(100%);
    transition: transform .32s cubic-bezier(.2,.8,.3,1);
    box-shadow: var(--shadow-lg);
  }
  .modal-backdrop.open .sheet { transform: translateY(0); }
  .sheet-handle-zone { display: flex; justify-content: center; padding: 12px 0 8px; cursor: pointer; }
  .sheet-handle { width: 44px; height: 5px; border-radius: 2.5px; background: rgba(13,30,28,0.2); }
  .sheet h3 { font-size: 22px; font-weight: 800; color: var(--text-1); margin-top: 6px; }
  .sheet .sheet-subtitle { font-size: 14px; color: var(--text-2); margin-top: 6px; margin-bottom: 20px; line-height: 20px; }
  .sheet-option {
    display: flex; align-items: center;
    border-radius: 18px; border: 1px solid var(--border);
    padding: 16px; background: var(--surface);
    cursor: pointer; transition: transform .12s ease, background .15s ease;
  }
  .sheet-option:active { transform: scale(0.98); }
  .sheet-option + .sheet-option { margin-top: 14px; }
  .sheet-option-icon {
    width: 50px; height: 50px; border-radius: 25px;
    background: var(--accent-ghost);
    display: flex; align-items: center; justify-content: center;
    margin-right: 14px; flex-shrink: 0;
  }
  .sheet-option-text { flex: 1; min-width: 0; padding-right: 8px; }
  .sheet-option-title { font-size: 16px; font-weight: 800; color: var(--text-1); }
  .sheet-option-desc { font-size: 12px; color: var(--text-3); margin-top: 3px; line-height: 18px; }
  .sheet-note { font-size: 11.5px; color: var(--text-3); margin-top: 10px; line-height: 16px; display: none; }
  .sheet-note.show { display: block; }

  /* ── TOAST ── */
  .toast {
    position: absolute; left: 50%; bottom: 28px; z-index: 40;
    transform: translate(-50%, 16px);
    background: var(--text-1); color: #fff;
    padding: 11px 18px; border-radius: 100px;
    font-size: 13px; font-weight: 700;
    opacity: 0; pointer-events: none;
    transition: all .25s ease;
    box-shadow: var(--shadow-md);
    white-space: nowrap;
  }
  .toast.show { opacity: 1; transform: translate(-50%, 0); }


  /* ── Registration-specific additions (Institution Type grid, uploads,
       password checklist, textarea, required marker, success state) ── */
  .accent { color: var(--accent); }
  .req { color: var(--danger); margin-left: 3px; }
  .input-row.textarea-row { height: auto; align-items: flex-start; padding: 10px 16px; }
  .input-row textarea {
    flex: 1; min-width: 0; resize: none; height: 44px;
    font-family: inherit; font-size: 15px; color: var(--text-1);
    background: transparent; border: none; outline: none;
  }
  .input-row textarea::placeholder { color: #9CA3AF; }
  .field-group + .field-group { margin-top: 11px; }

  .type-tile-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .type-tile {
    display: flex; flex-direction: column; align-items: flex-start; gap: 5px;
    padding: 10px; border-radius: 16px; border: 1.5px solid var(--border);
    background: rgba(255,255,255,0.6); text-align: left;
    transition: border-color .15s ease, background .15s ease, transform .12s ease;
  }
  .type-tile:active { transform: scale(0.97); }
  .type-tile.active { border-color: var(--accent-mid); background: var(--accent-ghost); }
  .type-tile-icon {
    width: 32px; height: 32px; border-radius: 10px;
    background: var(--accent-ghost); color: var(--accent);
    display: flex; align-items: center; justify-content: center;
  }
  .type-tile.active .type-tile-icon { background: var(--accent); color: #fff; }
  .type-tile-name { font-size: 13.5px; font-weight: 800; color: var(--text-1); }
  .type-tile-tagline { font-size: 11px; color: var(--text-3); line-height: 14px; }
  .type-preview { margin-top: 10px; padding: 11px 14px; border-radius: 14px; background: var(--accent-ghost); border: 1px solid var(--accent-border); display: none; }
  .type-preview.filled { display: block; }
  .type-preview-tag { font-size: 13px; font-weight: 700; color: var(--accent); margin-bottom: 5px; }
  .type-preview-feature { display: flex; align-items: center; gap: 7px; font-size: 12px; color: var(--text-2); line-height: 17px; padding: 1px 0; }
  .type-preview-feature svg { flex-shrink: 0; }

  .upload-row { display: flex; flex-direction: column; gap: 8px; }
  .upload-card {
    position: relative; display: block; border-radius: 16px; border: 1.5px dashed #1C1C1E;
    background: rgba(255,255,255,0.55); padding: 12px; text-align: center; cursor: pointer;
    transition: border-color .15s ease, background .15s ease;
  }
  .upload-card.has-file { border-style: solid; border-color: var(--accent-mid); }
  .upload-card input[type=file] { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
  .upload-icon {
    width: 40px; height: 40px; border-radius: 20px; margin: 0 auto 6px;
    background: rgba(28,28,30,0.06); color: #1C1C1E;
    display: flex; align-items: center; justify-content: center;
  }
  .upload-title { font-size: 14px; font-weight: 800; color: var(--text-1); }
  .upload-hint { font-size: 11px; color: var(--text-3); margin-top: 2px; }
  .upload-preview { display: none; width: 100%; height: 84px; object-fit: cover; border-radius: 12px; margin-top: 6px; }
  .upload-card.has-file .upload-preview { display: block; }
  .upload-card.has-file .upload-icon, .upload-card.has-file .upload-hint { display: none; }
  .upload-retake { display: none; font-size: 11.5px; font-weight: 700; color: var(--accent); margin-top: 5px; }
  .upload-card.has-file .upload-retake { display: block; }

  .pw-checklist { display: none; margin-top: 12px; }
  .pw-checklist.show { display: block; }
  .pw-rule { display: flex; align-items: center; gap: 10px; font-size: 15px; color: var(--text-3); padding: 2px 0; }
  .pw-rule-dot {
    width: 24px; height: 24px; border-radius: 50%; border: 1.5px solid var(--border);
    display: flex; align-items: center; justify-content: center; color: transparent; flex-shrink: 0;
  }
  .pw-rule.met { color: var(--text-1); font-weight: 700; }
  .pw-rule.met .pw-rule-dot { background: var(--accent); border-color: var(--accent); color: #fff; }

  .step-heading { font-size: 22px; font-weight: 800; color: var(--text-1); letter-spacing: -0.3px; margin-top: 10px; line-height: 26px; }
  .step-subtitle { font-size: 13px; color: var(--text-2); line-height: 18px; margin-top: 4px; }

  .success-panel { text-align: center; padding: 24px 4px 14px; }
  @keyframes successPop {
    0% { opacity: 0; transform: scale(0.4); }
    60% { opacity: 1; transform: scale(1.12); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes successRing {
    0% { opacity: 0.6; transform: scale(0.8); }
    100% { opacity: 0; transform: scale(1.6); }
  }
  .success-icon {
    position: relative;
    width: 68px; height: 68px; border-radius: 50%; margin: 0 auto 16px;
    background: var(--accent-ghost); border: 1.5px solid var(--accent-border);
    display: flex; align-items: center; justify-content: center; color: var(--accent);
    animation: successPop .6s cubic-bezier(.34,1.56,.64,1) both;
  }
  .success-icon::after {
    content: ''; position: absolute; inset: 0; border-radius: 50%;
    border: 1.5px solid var(--accent-mid);
    animation: successRing 1s ease-out .1s both;
  }
  .success-panel h2 { font-size: 20px; font-weight: 800; color: var(--text-1); margin-bottom: 8px; }
  .success-panel p { font-size: 13px; color: var(--text-2); line-height: 19px; max-width: 340px; margin: 0 auto 14px; }

</style>
</head>
<body>


<div class="screen">

  <div class="topbar" id="topbar">
    <div class="back-btn" id="backBtn">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#1C1C1E" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div class="topbar-title" id="topbarTitle" data-i18n="register.step_institution_type">Institution Type</div>
    <div class="spacer"></div>
    <div class="lang-chip" id="langChip">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#1C1C1E" stroke-width="1.6"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.7-3.8-9s1.3-6.4 3.8-9z" stroke="#1C1C1E" stroke-width="1.4"/></svg>
      <span id="langChipText">EN</span>
    </div>
  </div>

  <div class="body-scroll" id="bodyScroll">

    <!-- ═══ STEP 1 — INSTITUTION TYPE ═══ -->
    <div class="panel enter" id="panel1">
      <div class="step-heading"><span data-i18n="register.what_kind_line1">What kind of school</span><br/><span class="accent" style="font-family:'Playfair Display',serif;font-style:italic;" data-i18n="register.what_kind_line2">is this?</span></div>
      <div class="step-subtitle" data-i18n="register.institution_type_hint">This sets your starting defaults - nothing is locked in.</div>

      <div class="card">
        <div class="type-tile-grid" id="typeGrid" role="radiogroup" aria-label="Institution type"></div>
        <div class="type-preview" id="typePreview">
          <div class="type-preview-tag" id="typePreviewTag"></div>
          <div class="type-preview-list" id="typePreviewList"></div>
        </div>
        <button type="button" class="gradient-btn" id="step1NextBtn" disabled><span data-i18n="register.continue">Continue</span></button>
      </div>
    </div>

    <!-- ═══ STEP 2 — SCHOOL INFORMATION ═══ -->
    <div class="panel" id="panel2" style="display:none;">
      <div class="step-heading"><span data-i18n="register.school_info_line1">School</span><br/><span class="accent" style="font-family:'Playfair Display',serif;font-style:italic;" data-i18n="register.school_info_line2">Information</span></div>
      <div class="step-subtitle" data-i18n="register.school_info_hint">Tell us about your institution.</div>

      <div class="card">
        <div class="field-group">
          <div class="field-label"><span data-i18n="register.school_name_label">School Name</span><span class="req">*</span></div>
          <div class="input-row">
            <input type="text" id="schoolName" placeholder="e.g. Al-Noor Islamic Academy" data-i18n-placeholder="register.school_name_placeholder" required />
          </div>
        </div>
        <div class="field-group">
          <div class="field-label"><span data-i18n="register.address_label">Address</span><span class="req">*</span></div>
          <div class="input-row textarea-row">
            <textarea id="schoolAddress" placeholder="Street, city, country" data-i18n-placeholder="register.address_placeholder" required></textarea>
          </div>
        </div>
        <div class="field-group">
          <div class="field-label"><span data-i18n="register.school_email_label">School Email</span><span class="req">*</span></div>
          <div class="input-row">
            <input type="email" id="schoolEmail" placeholder="school@example.com" required />
          </div>
          <div class="error-text" id="schoolEmailErr" data-i18n="register.email_invalid">Please enter a valid email address.</div>
        </div>
        <div class="field-group">
          <div class="field-label"><span data-i18n="register.school_phone_label">School Phone</span><span class="req">*</span></div>
          <div class="input-row">
            <input type="tel" id="schoolPhone" placeholder="+63 912 345 6789" required />
          </div>
        </div>
        <button type="button" class="gradient-btn" id="step2NextBtn" disabled><span data-i18n="register.continue">Continue</span></button>
      </div>
    </div>

    <!-- ═══ STEP 3 — ADMINISTRATOR ACCOUNT ═══ -->
    <div class="panel" id="panel3" style="display:none;">
      <div class="step-heading"><span data-i18n="register.admin_account_line1">Administrator</span><br/><span class="accent" style="font-family:'Playfair Display',serif;font-style:italic;" data-i18n="register.admin_account_line2">Account</span></div>
      <div class="step-subtitle" data-i18n="register.admin_account_hint">You'll use this email and password to sign in once approved.</div>

      <div class="card">
        <div class="field-group">
          <div class="field-label"><span data-i18n="register.your_full_name_label">Your Full Name</span><span class="req">*</span></div>
          <div class="input-row">
            <input type="text" id="adminName" placeholder="As it appears on your ID" data-i18n-placeholder="register.your_full_name_placeholder" />
          </div>
        </div>
        <div class="field-group">
          <div class="field-label"><span data-i18n="register.your_email_label">Your Email</span><span class="req">*</span></div>
          <div class="input-row">
            <input type="email" id="adminEmail" placeholder="you@example.com" autocomplete="email" />
          </div>
          <div class="error-text" id="adminEmailErr" data-i18n="register.email_invalid_example">Enter a valid email address, e.g. name@example.com</div>
        </div>
        <div class="field-group">
          <div class="field-label" data-i18n="register.your_phone_label">Your Phone</div>
          <div class="input-row">
            <input type="tel" id="adminPhone" placeholder="+63 912 345 6789" />
          </div>
        </div>
        <div class="field-group">
          <div class="field-label"><span data-i18n="register.password_label">Password</span><span class="req">*</span></div>
          <div class="input-row">
            <input type="password" id="password" placeholder="Create a strong password" data-i18n-placeholder="register.password_placeholder" autocomplete="new-password" />
            <span class="eye-btn" id="pwEyeBtn">
              <svg id="pwEyeIcon" width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#8E8E93" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="#8E8E93" stroke-width="1.7"/></svg>
            </span>
          </div>
          <div class="helper-text" data-i18n="register.password_helper">At least 8 characters, with an uppercase and lowercase letter, a number, and a symbol.</div>
          <div class="pw-checklist" id="pwChecklist"></div>
        </div>
        <div class="field-group">
          <div class="field-label"><span data-i18n="register.confirm_password_label">Confirm Password</span><span class="req">*</span></div>
          <div class="input-row">
            <input type="password" id="confirmPassword" placeholder="Re-enter your password" data-i18n-placeholder="register.confirm_password_placeholder" autocomplete="new-password" />
          </div>
          <div class="error-text" id="confirmErr" data-i18n="register.passwords_dont_match">Passwords don't match.</div>
        </div>
        <button type="button" class="gradient-btn" id="step3NextBtn" disabled><span data-i18n="register.continue">Continue</span></button>
      </div>
    </div>

    <!-- ═══ STEP 4 — IDENTITY VERIFICATION ═══ -->
    <div class="panel" id="panel4" style="display:none;">
      <div class="step-heading"><span data-i18n="register.identity_line1">Identity</span><br/><span class="accent" style="font-family:'Playfair Display',serif;font-style:italic;" data-i18n="register.identity_line2">Verification</span></div>
      <div class="step-subtitle" data-i18n="register.identity_hint">We verify every new admin so schools on MuslimEdu are run by real people.</div>

      <div class="card">
        <div class="upload-row">
          <label class="upload-card" id="idUploadCard">
            <input type="file" id="idDocument" accept="image/*" />
            <div class="upload-icon" id="idUploadIcon"></div>
            <div class="upload-title" data-i18n="register.upload_id_title">Upload your ID</div>
            <div class="upload-hint" data-i18n="register.upload_id_hint">Passport, national ID, or driver's license</div>
            <img class="upload-preview" id="idPreview" alt="ID document preview" />
            <span class="upload-retake" data-i18n="register.change_photo">Change photo</span>
          </label>
          <label class="upload-card" id="selfieUploadCard">
            <input type="file" id="selfie" accept="image/*" capture="user" />
            <div class="upload-icon" id="selfieUploadIcon"></div>
            <div class="upload-title" data-i18n="register.upload_selfie_title">Upload a selfie</div>
            <div class="upload-hint" data-i18n="register.upload_selfie_hint">Clear photo of your face, good lighting</div>
            <img class="upload-preview" id="selfiePreview" alt="Selfie preview" />
            <span class="upload-retake" data-i18n="register.change_photo">Change photo</span>
          </label>
        </div>
        <button type="button" class="gradient-btn" id="submitBtn" disabled>
          <span class="spinner"></span><span id="submitBtnLabel" data-i18n="register.submit_application">Submit Application</span>
        </button>
        <div class="error-text" id="formError" data-i18n="register.submit_error_default">Something went wrong.</div>
        <div class="helper-text" data-i18n="register.submit_disclaimer">By submitting, you agree to be contacted about your application. Your ID and selfie are used only to verify your identity as the school administrator.</div>
      </div>
    </div>

    <!-- ═══ SUCCESS ═══ -->
    <div class="panel success-panel" id="panelSuccess" style="display:none;">
      <div class="success-icon" id="successIcon"></div>
      <h2 data-i18n="register.app_submitted_title">Application submitted</h2>
      <p data-i18n="register.app_submitted_body">Your school and admin account are pending review. You'll be able to sign in once MuslimEdu staff approve your application - this is usually quick, but can take a little while.</p>
      <a class="gradient-btn" href="login.php" style="text-decoration:none;" data-i18n="register.go_to_login">Go to Login</a>
    </div>

    <div class="step-dots" id="stepDots">
      <div class="dot" id="dot1"></div><div class="dot" id="dot2"></div><div class="dot" id="dot3"></div><div class="dot" id="dot4"></div>
    </div>

  </div>

  <div class="footer" id="pageFooter">
    <div class="footer-row footer-secondary">
      <a href="privacy.php" data-i18n="register.privacy_statement">Privacy Statement</a><span class="footer-sep"></span>
      <a href="terms.php" data-i18n="register.terms">Terms</a>
    </div>
    <div class="footer-copyright" data-i18n="register.copyright">© 2026 MuslimEdu. All rights reserved.</div>
  </div>

  <div class="toast" id="toast"></div>

</div>
<script src="register.js" defer></script>
<script src="pwa.js" defer></script>
</body>
</html>
