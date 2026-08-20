<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Register Your School — MuslimEdu</title>
  <meta name="description" content="Register your mahad, madrasa, markaz, regular school, or orphanage on MuslimEdu. Your application is reviewed by a MuslimEdu superadmin before your account goes live." />
  <!-- Application-layer hardening. See web/SECURITY.md for what this does and
       does NOT cover - frame-ancestors/X-Frame-Options, HSTS, and X-Content-
       Type-Options are silently ignored (or unsupported) via <meta> and need
       real HTTP headers from whatever serves this file. img-src/connect-src
       include blob: and manhaje.com for the on-device photo preview + the
       multipart upload to school_registration_submit. -->
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://manhaje.com; base-uri 'none'; form-action 'none'; upgrade-insecure-requests" />
  <meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
  <meta http-equiv="Cache-Control" content="no-store" />
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%95%8C%3C/text%3E%3C/svg%3E" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,500&family=Playfair+Display:ital,wght@1,600&display=swap" rel="stylesheet" />

  <style>
    /* Same design tokens as the MuslimEdu marketing site, so this page
       reads as part of the same product rather than a bolted-on form. */
    :root {
      --bg:           #E8F4F2;
      --bg-alt:       #DFF0EE;
      --surface:      #F4FAFA;
      --surface-2:    #FFFFFF;
      --accent:       #1A7A6E;
      --accent-mid:   #2A9D8F;
      --accent-light: #5BBFB5;
      --accent-ghost: rgba(26,122,110,0.08);
      --accent-border:rgba(26,122,110,0.15);
      --text-1:       #0D1E1C;
      --text-2:       #3A5C58;
      --text-3:       #6B8C88;
      --border:       rgba(13,30,28,0.08);
      --danger:       #C13A3A;
      --danger-ghost: rgba(193,58,58,0.08);
      --shadow-sm:    0 2px 12px rgba(13,30,28,0.06);
      --shadow-md:    0 8px 32px rgba(13,30,28,0.10);
      --shadow-lg:    0 24px 64px rgba(13,30,28,0.13);
      --silk:         cubic-bezier(0.16, 1, 0.3, 1);
      --radius:       16px;
      --radius-lg:    24px;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; font-size: 16px; }
    body {
      font-family: 'DM Sans', sans-serif;
      background: var(--bg);
      color: var(--text-1);
      -webkit-font-smoothing: antialiased;
    }
    a { text-decoration: none; color: inherit; }
    img { display: block; max-width: 100%; }
    button { cursor: pointer; border: none; background: none; font-family: inherit; }
    .container { max-width: 1160px; margin: 0 auto; padding: 0 24px; }

    /* ── NAV ── */
    .nav {
      padding: 20px 0;
      border-bottom: 1px solid var(--border);
      background: rgba(232,244,242,0.85);
      backdrop-filter: blur(12px);
      position: sticky; top: 0; z-index: 100;
    }
    .nav-inner { display: flex; align-items: center; justify-content: space-between; }
    .nav-logo { font-size: 1.15rem; font-weight: 700; letter-spacing: -0.04em; color: var(--text-1); }
    .nav-logo span { color: var(--accent); }
    .nav-back {
      font-size: 0.875rem; font-weight: 500; color: var(--text-2);
      padding: 8px 16px; border-radius: 100px;
      transition: color 0.3s, background 0.3s;
    }
    .nav-back:hover { color: var(--accent); background: var(--accent-ghost); }

    /* ── LAYOUT ── */
    .reg-hero { padding: 64px 0 100px; }
    .reg-hero-inner {
      display: grid; grid-template-columns: 0.85fr 1.15fr;
      gap: 56px; align-items: start;
    }
    .reg-intro { position: sticky; top: 110px; }
    .section-label {
      display: inline-flex; align-items: center; gap: 8px;
      font-size: 11px; font-weight: 600; letter-spacing: 0.14em;
      text-transform: uppercase; color: var(--accent);
      background: var(--accent-ghost); border: 1px solid var(--accent-border);
      padding: 6px 14px; border-radius: 100px; margin-bottom: 20px;
    }
    .section-label::before { content: ''; width: 6px; height: 6px; background: var(--accent); border-radius: 50%; }
    .reg-title {
      font-size: clamp(1.9rem, 3.2vw, 2.6rem); font-weight: 700;
      letter-spacing: -0.03em; line-height: 1.15; margin-bottom: 16px;
    }
    .reg-title em { font-style: italic; font-family: 'Playfair Display', serif; color: var(--accent); }
    .reg-sub { font-size: 1.0125rem; line-height: 1.75; color: var(--text-2); max-width: 440px; margin-bottom: 36px; }

    .steps-preview { display: flex; flex-direction: column; gap: 18px; margin-bottom: 36px; }
    .steps-preview-item { display: flex; align-items: flex-start; gap: 14px; }
    .steps-preview-num {
      width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
      background: var(--surface-2); border: 1.5px solid var(--accent-border);
      display: flex; align-items: center; justify-content: center;
      font-size: 0.8rem; font-weight: 700; color: var(--accent);
    }
    .steps-preview-text strong { display: block; font-size: 0.9375rem; font-weight: 700; color: var(--text-1); margin-bottom: 2px; }
    .steps-preview-text span { font-size: 0.85rem; color: var(--text-3); line-height: 1.5; }

    .reg-note {
      background: var(--surface-2); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 18px 20px;
      font-size: 0.85rem; color: var(--text-2); line-height: 1.6;
      box-shadow: var(--shadow-sm);
    }
    .reg-note strong { color: var(--text-1); }

    /* ── FORM CARD ── */
    .reg-card {
      background: var(--surface-2); border-radius: var(--radius-lg);
      border: 1px solid var(--border); box-shadow: var(--shadow-lg);
      padding: 40px; overflow: hidden;
    }
    .form-section { padding: 28px 0; border-bottom: 1px solid var(--border); }
    .form-section:first-child { padding-top: 0; }
    .form-section:last-of-type { border-bottom: none; padding-bottom: 8px; }
    .form-section-head { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
    .form-step-num {
      width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0;
      background: var(--accent); color: #fff; font-size: 0.78rem; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }
    .form-section-head h2 { font-size: 1.05rem; font-weight: 700; letter-spacing: -0.01em; color: var(--text-1); }

    .field { margin-bottom: 18px; }
    .field:last-child { margin-bottom: 0; }
    .field label {
      display: block; font-size: 0.8125rem; font-weight: 600; color: var(--text-2);
      margin-bottom: 7px;
    }
    .field label .req { color: var(--accent); margin-left: 2px; }
    .field input[type="text"],
    .field input[type="email"],
    .field input[type="tel"],
    .field input[type="password"],
    .field textarea {
      width: 100%; font-family: inherit; font-size: 0.9375rem; color: var(--text-1);
      background: var(--bg); border: 1.5px solid var(--border);
      border-radius: 12px; padding: 12px 14px;
      transition: border-color 0.3s, background 0.3s;
    }
    .field textarea { resize: vertical; min-height: 72px; }
    .field input:focus, .field textarea:focus {
      outline: none; border-color: var(--accent); background: var(--surface-2);
    }
    .field input.field-invalid, .field textarea.field-invalid { border-color: var(--danger); }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .field-hint { font-size: 0.75rem; color: var(--text-3); margin-top: 6px; }
    .field-error { font-size: 0.78rem; color: var(--danger); margin-top: 6px; font-weight: 500; }
    .field-ok { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; color: var(--accent); margin-top: 6px; font-weight: 600; }

    /* Institution type grid */
    .type-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .type-tile {
      display: flex; align-items: center; gap: 10px;
      border: 1.5px solid var(--border); border-radius: 14px;
      padding: 14px; text-align: left;
      transition: border-color 0.3s var(--silk), background 0.3s var(--silk), transform 0.3s var(--silk);
    }
    .type-tile:hover { border-color: var(--accent-border); background: var(--accent-ghost); }
    .type-tile.active { border-color: var(--accent); background: var(--accent-ghost); }
    .type-tile-icon {
      width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
      background: var(--accent-ghost); border: 1px solid var(--accent-border);
      display: flex; align-items: center; justify-content: center;
      font-size: 15px; color: var(--accent);
    }
    .type-tile.active .type-tile-icon { background: var(--accent); color: #fff; border-color: var(--accent); }
    .type-tile-name { font-size: 0.875rem; font-weight: 700; color: var(--text-1); }

    .type-preview {
      margin-top: 14px; border-radius: 14px; padding: 16px;
      border: 1.5px dashed var(--border); font-size: 0.8125rem; color: var(--text-3);
      line-height: 1.6; transition: all 0.3s var(--silk);
    }
    .type-preview.filled {
      border-style: solid; border-color: var(--accent-border); background: var(--accent-ghost);
    }
    .type-preview-tag { font-size: 0.78rem; font-weight: 700; color: var(--accent); margin-bottom: 8px; display: none; }
    .type-preview.filled .type-preview-tag { display: block; }
    .type-preview-list { display: none; flex-direction: column; gap: 6px; }
    .type-preview.filled .type-preview-list { display: flex; }
    .type-preview.filled .type-preview-hint { display: none; }
    .type-preview-feature { display: flex; align-items: flex-start; gap: 8px; font-size: 0.8125rem; color: var(--text-2); }
    .type-preview-feature::before { content: '✓'; color: var(--accent); font-weight: 700; flex-shrink: 0; }

    /* Password checklist */
    .pw-checklist { display: none; flex-direction: column; gap: 6px; margin-top: 10px; }
    .pw-checklist.show { display: flex; }
    .pw-rule { display: flex; align-items: center; gap: 8px; font-size: 0.78rem; color: var(--text-3); }
    .pw-rule-dot {
      width: 15px; height: 15px; border-radius: 50%; flex-shrink: 0;
      border: 1.5px solid var(--border); display: flex; align-items: center; justify-content: center;
      font-size: 9px; color: transparent; transition: all 0.25s var(--silk);
    }
    .pw-rule.met { color: var(--text-1); font-weight: 600; }
    .pw-rule.met .pw-rule-dot { background: var(--accent); border-color: var(--accent); color: #fff; }

    /* Upload cards */
    .upload-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .upload-card {
      position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center;
      text-align: center; gap: 6px; min-height: 160px; padding: 16px;
      border: 1.5px dashed var(--border); border-radius: 16px; background: var(--bg);
      overflow: hidden; transition: border-color 0.3s, background 0.3s;
    }
    .upload-card:hover { border-color: var(--accent-border); }
    .upload-card.has-file { border-style: solid; padding: 0; }
    .upload-card input[type="file"] {
      position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%;
    }
    .upload-icon {
      width: 40px; height: 40px; border-radius: 12px;
      background: var(--accent-ghost); border: 1px solid var(--accent-border);
      display: flex; align-items: center; justify-content: center; font-size: 17px; color: var(--accent);
    }
    .upload-title { font-size: 0.8375rem; font-weight: 700; color: var(--text-1); }
    .upload-hint { font-size: 0.7rem; color: var(--text-3); line-height: 1.4; }
    .upload-preview { width: 100%; height: 160px; object-fit: cover; display: none; }
    .upload-card.has-file .upload-preview { display: block; }
    .upload-card.has-file .upload-icon,
    .upload-card.has-file .upload-title,
    .upload-card.has-file .upload-hint { display: none; }
    .upload-retake {
      position: absolute; bottom: 8px; right: 8px; z-index: 2;
      display: none; align-items: center; gap: 5px;
      background: rgba(13,30,28,0.65); color: #fff;
      font-size: 0.7rem; font-weight: 700; padding: 6px 11px; border-radius: 100px;
      pointer-events: none;
    }
    .upload-card.has-file .upload-retake { display: flex; }

    /* Submit */
    .reg-submit {
      width: 100%; margin-top: 24px;
      display: flex; align-items: center; justify-content: center; gap: 10px;
      font-size: 0.9375rem; font-weight: 700; color: #fff;
      background: var(--accent); padding: 15px; border-radius: 100px;
      box-shadow: 0 8px 24px rgba(26,122,110,0.30);
      transition: background 0.35s var(--silk), transform 0.35s var(--silk), box-shadow 0.35s var(--silk), opacity 0.3s;
    }
    .reg-submit:hover:not(:disabled) { background: var(--accent-mid); transform: scale(1.01); }
    .reg-submit:disabled { opacity: 0.45; cursor: not-allowed; }
    .reg-submit .spinner {
      width: 16px; height: 16px; border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.35); border-top-color: #fff;
      display: none; animation: spin 0.7s linear infinite;
    }
    .reg-submit.loading .spinner { display: inline-block; }
    .reg-submit.loading .reg-submit-label { opacity: 0.75; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .reg-error {
      margin-top: 16px; padding: 13px 16px; border-radius: 12px;
      background: var(--danger-ghost); border: 1px solid rgba(193,58,58,0.25);
      color: var(--danger); font-size: 0.8375rem; line-height: 1.5; font-weight: 500;
    }

    /* Success state */
    .reg-success { text-align: center; padding: 56px 40px; }
    .success-icon {
      width: 72px; height: 72px; border-radius: 50%; margin: 0 auto 22px;
      background: var(--accent-ghost); border: 1.5px solid var(--accent-border);
      display: flex; align-items: center; justify-content: center; font-size: 30px; color: var(--accent);
    }
    .reg-success h2 { font-size: 1.4rem; font-weight: 800; margin-bottom: 12px; letter-spacing: -0.02em; }
    .reg-success p { font-size: 0.9375rem; color: var(--text-2); line-height: 1.7; max-width: 400px; margin: 0 auto 22px; }
    .pending-badge {
      display: inline-flex; align-items: center; gap: 8px;
      background: var(--accent-ghost); border: 1px solid var(--accent-border);
      color: var(--accent); font-weight: 700; font-size: 0.8125rem;
      padding: 9px 18px; border-radius: 100px;
    }

    .footer-note { text-align: center; font-size: 0.8rem; color: var(--text-3); margin-top: 28px; }

    @media (max-width: 860px) {
      .reg-hero-inner { grid-template-columns: 1fr; gap: 40px; }
      .reg-intro { position: static; }
      .reg-card { padding: 26px; }
      .field-row, .upload-row { grid-template-columns: 1fr; }
      .type-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <nav class="nav">
    <div class="container nav-inner">
      <span class="nav-logo">Muslim<span>Edu</span></span>
      <a class="nav-back" href="login.php">← Back to Login</a>
    </div>
  </nav>

  <main class="reg-hero">
    <div class="container reg-hero-inner">
      <div class="reg-intro">
        <span class="section-label">New School Registration</span>
        <h1 class="reg-title">Bring <em>your school</em> onto MuslimEdu</h1>
        <p class="reg-sub">Set up admissions, attendance, fees, grading, and communication for your mahad, madrasa, markaz, regular school, or orphanage — from a single platform.</p>

        <div class="steps-preview">
          <div class="steps-preview-item">
            <div class="steps-preview-num">1</div>
            <div class="steps-preview-text"><strong>Submit your application</strong><span>Tell us about your school and create your admin account.</span></div>
          </div>
          <div class="steps-preview-item">
            <div class="steps-preview-num">2</div>
            <div class="steps-preview-text"><strong>We verify your identity</strong><span>A valid ID and a live selfie confirm a real person is behind every school.</span></div>
          </div>
          <div class="steps-preview-item">
            <div class="steps-preview-num">3</div>
            <div class="steps-preview-text"><strong>A MuslimEdu team member reviews it</strong><span>Your application goes into our review queue — most are handled quickly.</span></div>
          </div>
          <div class="steps-preview-item">
            <div class="steps-preview-num">4</div>
            <div class="steps-preview-text"><strong>Sign in once approved</strong><span>Use the email and password you set here to log into the MuslimEdu app.</span></div>
          </div>
        </div>

        <div class="reg-note">
          <strong>Already applied?</strong> There's no separate status page yet — you'll be able to sign in with the email and password you set below as soon as your application is approved.
        </div>
      </div>

      <div>
        <form id="regForm" class="reg-card" novalidate>
          <!-- 1. Institution type -->
          <div class="form-section">
            <div class="form-section-head">
              <span class="form-step-num">1</span>
              <h2>Institution Type</h2>
            </div>
            <div class="type-grid" id="typeGrid" role="radiogroup" aria-label="Institution type"></div>
            <div class="type-preview" id="typePreview">
              <span class="type-preview-hint">Pick an institution type above to see what it comes with.</span>
              <div class="type-preview-tag" id="typePreviewTag"></div>
              <div class="type-preview-list" id="typePreviewList"></div>
            </div>
          </div>

          <!-- 2. School information -->
          <div class="form-section">
            <div class="form-section-head">
              <span class="form-step-num">2</span>
              <h2>School Information</h2>
            </div>
            <div class="field">
              <label for="schoolName">School Name<span class="req">*</span></label>
              <input type="text" id="schoolName" name="school_name" placeholder="e.g. Al-Noor Islamic Academy" required />
            </div>
            <div class="field">
              <label for="schoolAddress">Address</label>
              <textarea id="schoolAddress" name="school_address" placeholder="Street, city, country"></textarea>
            </div>
            <div class="field-row">
              <div class="field">
                <label for="schoolEmail">School Email</label>
                <input type="email" id="schoolEmail" name="school_email" placeholder="school@example.com" />
              </div>
              <div class="field">
                <label for="schoolPhone">School Phone</label>
                <input type="tel" id="schoolPhone" name="school_phone" placeholder="+63 912 345 6789" />
              </div>
            </div>
          </div>

          <!-- 3. Administrator account -->
          <div class="form-section">
            <div class="form-section-head">
              <span class="form-step-num">3</span>
              <h2>Administrator Account</h2>
            </div>
            <div class="field">
              <label for="adminName">Your Full Name<span class="req">*</span></label>
              <input type="text" id="adminName" name="admin_name" placeholder="As it appears on your ID" required />
            </div>
            <div class="field">
              <label for="adminEmail">Your Email<span class="req">*</span></label>
              <input type="email" id="adminEmail" name="admin_email" placeholder="you@example.com" required autocomplete="email" />
              <div class="field-ok" id="adminEmailOk" style="display:none">Looks good</div>
              <div class="field-error" id="adminEmailErr" style="display:none">Enter a valid email address, e.g. name@example.com</div>
            </div>
            <div class="field">
              <label for="adminPhone">Your Phone</label>
              <input type="tel" id="adminPhone" name="admin_phone" placeholder="+63 912 345 6789" />
            </div>
            <div class="field-row">
              <div class="field">
                <label for="password">Password<span class="req">*</span></label>
                <input type="password" id="password" name="password" placeholder="Create a strong password" required autocomplete="new-password" />
              </div>
              <div class="field">
                <label for="confirmPassword">Confirm Password<span class="req">*</span></label>
                <input type="password" id="confirmPassword" placeholder="Re-enter your password" required autocomplete="new-password" />
                <div class="field-error" id="confirmErr" style="display:none">Passwords don't match.</div>
              </div>
            </div>
            <div class="pw-checklist" id="pwChecklist"></div>
          </div>

          <!-- 4. Identity verification -->
          <div class="form-section">
            <div class="form-section-head">
              <span class="form-step-num">4</span>
              <h2>Identity Verification</h2>
            </div>
            <p class="field-hint" style="margin-bottom:14px;">We verify every new admin so schools on MuslimEdu are run by real people. Upload a valid ID, then a clear selfie to match against it.</p>
            <div class="upload-row">
              <label class="upload-card" id="idUploadCard">
                <input type="file" id="idDocument" name="id_document" accept="image/*" required />
                <div class="upload-icon">🪪</div>
                <div class="upload-title">Upload your ID</div>
                <div class="upload-hint">Passport, national ID, or driver's license</div>
                <img class="upload-preview" id="idPreview" alt="ID document preview" />
                <span class="upload-retake">Change photo</span>
              </label>
              <label class="upload-card" id="selfieUploadCard">
                <input type="file" id="selfie" name="selfie" accept="image/*" capture="user" required />
                <div class="upload-icon">🤳</div>
                <div class="upload-title">Upload a selfie</div>
                <div class="upload-hint">Clear photo of your face, good lighting</div>
                <img class="upload-preview" id="selfiePreview" alt="Selfie preview" />
                <span class="upload-retake">Change photo</span>
              </label>
            </div>
          </div>

          <button type="submit" class="reg-submit" id="submitBtn" disabled>
            <span class="spinner"></span>
            <span class="reg-submit-label">Submit Application</span>
          </button>
          <div class="reg-error" id="formError" style="display:none"></div>
          <p class="footer-note">By submitting, you agree to be contacted about your application. Your ID and selfie are used only to verify your identity as the school administrator.</p>
        </form>

        <div class="reg-card reg-success" id="successCard" style="display:none">
          <div class="success-icon">✓</div>
          <h2>Application submitted</h2>
          <p>Your school and admin account are pending review. You'll be able to sign in once a MuslimEdu superadmin approves your application — this is usually quick, but can take a little while.</p>
          <span class="pending-badge">● Status: Pending Approval</span>
        </div>
      </div>
    </div>
  </main>

  <script src="register.js" defer></script>
</body>
</html>
