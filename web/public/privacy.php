<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Privacy Statement — MuslimEdu</title>
<meta name="description" content="How MuslimEdu stores, protects, and shares school, staff, and student information." />
<!-- Application-layer hardening, same pattern as login.php. See
     web/SECURITY.md - frame-ancestors/X-Frame-Options/HSTS/X-Content-
     Type-Options need real HTTP headers from whatever serves this file,
     a <meta> tag can't set them. Static content page: no forms, no
     fetches, so connect-src/form-action stay locked to 'none'. -->
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'none'; base-uri 'none'; form-action 'none'; upgrade-insecure-requests" />
<meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
<script src="pwa-guard.js"></script>
<link rel="icon" href="assets/icons/favicon-32.png" sizes="32x32" />
<link rel="icon" href="assets/icons/favicon-16.png" sizes="16x16" />
<link rel="icon" href="assets/icons/icon-192.png" sizes="192x192" />
<link rel="manifest" href="manifest.webmanifest" />
<meta name="theme-color" content="#1A7A6E" />
<link rel="apple-touch-icon" href="assets/icons/apple-touch-icon.png" />
<link rel="stylesheet" href="assets/fonts.css" />
<style>
  :root {
    --bg:           #E5F8F5;
    --surface:      #F5FBF8;
    --surface-2:    #FFFFFF;
    --accent:       #0F7A3D;
    --accent-mid:   #1FAE64;
    --accent-ghost: rgba(15,122,61,0.08);
    --accent-border:rgba(15,122,61,0.15);
    --text-1:       #1C1C1E;
    --text-2:       #4B5754;
    --text-3:       #8E8E93;
    --border:       rgba(28,28,30,0.08);
    --shadow-sm:    0 2px 12px rgba(13,30,28,0.06);
    --radius:       16px;
    --radius-lg:    24px;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { min-height: 100%; }
  body {
    font-family: 'DM Sans', sans-serif;
    background: radial-gradient(circle at 30% 20%, #F0FBF5, var(--bg) 60%);
    color: var(--text-1);
  }
  .screen { width: 100%; max-width: 560px; min-height: 100vh; margin: 0 auto; background: var(--surface); display: flex; flex-direction: column; }
  .topbar { display: flex; align-items: center; gap: 12px; padding: 22px 20px 4px; }
  .back-btn { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: var(--surface-2); box-shadow: var(--shadow-sm); flex-shrink: 0; text-decoration: none; }
  .topbar-title { font-size: 15px; font-weight: 800; color: var(--text-1); letter-spacing: -0.3px; }
  .content { padding: 28px 22px 8px; flex: 1; }
  h1 { font-family: 'Playfair Display', serif; font-weight: 700; font-size: 26px; color: var(--accent); margin-bottom: 6px; line-height: 1.25; }
  .intro { font-size: 14.5px; color: var(--text-3); margin-bottom: 26px; }
  section { margin-bottom: 26px; }
  h2 { font-size: 14.5px; font-weight: 800; color: var(--text-1); margin-bottom: 8px; letter-spacing: -0.1px; }
  p, .body-text, li { font-size: 14.5px; line-height: 1.7; color: var(--text-2); }
  p + p { margin-top: 10px; }
  ul { padding-left: 20px; margin-top: 4px; }
  li { margin-bottom: 4px; }
  .note { font-size: 13px; color: var(--text-3); margin-top: 10px; }
  .cookie-card { background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; margin-top: 12px; box-shadow: var(--shadow-sm); }
  .cookie-choice-label { font-size: 13px; font-weight: 700; color: var(--text-1); margin-bottom: 10px; }
  .cookie-btn-row { display: flex; gap: 10px; flex-wrap: wrap; }
  .cookie-btn { flex: 1; min-width: 140px; text-align: center; padding: 10px 14px; border-radius: 100px; font-size: 13px; font-weight: 700; border: 1px solid var(--accent-border); background: var(--accent-ghost); color: var(--accent); }
  .cookie-btn.primary { background: var(--accent); color: #fff; border-color: var(--accent); }
  .commit-list { list-style: none; padding-left: 0; margin-top: 4px; }
  .commit-list li { padding-left: 22px; position: relative; margin-bottom: 8px; }
  .commit-list li::before { content: "✓"; position: absolute; left: 0; color: var(--accent-mid); font-weight: 800; }
  .footer { padding: 14px 16px 22px; text-align: center; border-top: 1px solid var(--border); }
  .footer-row { display: flex; align-items: center; justify-content: center; gap: 9px; flex-wrap: wrap; margin-bottom: 10px; }
  .footer a { color: var(--text-3); font-size: 12.5px; font-weight: 600; text-decoration: none; }
  .footer a:hover { color: var(--accent); }
  .footer-sep { width: 1px; height: 11px; background: var(--border); }
  .footer-copyright { font-size: 12px; color: var(--text-3); }
</style>
</head>
<body>
<div class="screen">
  <div class="topbar">
    <a class="back-btn" href="login.php" aria-label="Back to sign in">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#1C1C1E" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </a>
    <div class="topbar-title">Privacy Statement</div>
  </div>
  <div class="content">
    <h1>Privacy statement</h1>
    <div class="intro">We treat your school's information with care, and we are especially careful with student data.</div>

    <section>
      <h2>What we store</h2>
      <p>We store the institution, staff, and student information your school's administrator enters or approves &mdash; things like admissions and enrollment details, attendance, grades, fee records, class schedules, and account contact details. We only collect what a role actually needs to do its job.</p>
    </section>

    <section>
      <h2>Who can see what</h2>
      <p>Access follows your role, not the whole school's data. A teacher can see the classes and students assigned to them, not fee records or other classes. A cashier can see fee and payment records, not grades. A registrar can see enrollment and admissions, not private staff notes. Admins and superadmins have broader access needed to run the institution, and every access to student records is tied to a signed-in account.</p>
      <p>Student and staff information is never made public or shown outside your institution's own MuslimEdu account.</p>
    </section>

    <section>
      <h2>Documents and IDs</h2>
      <p>Uploaded documents (admission IDs, verification files, student documents) are kept separate from general profile data and are only visible to the roles responsible for reviewing them &mdash; typically registrars and admins &mdash; plus admins reviewing a reported issue.</p>
    </section>

    <section>
      <h2>Analytics and cookies</h2>
      <p>We use a small amount of privacy-friendly analytics on our public pages, so we can see which pages and links bring schools to MuslimEdu. We ask the first time you visit and remember your answer for six months.</p>
      <p>If you choose "Only necessary," we load no analytics at all and store nothing about where you came from. If you choose "Allow analytics," we store the page or link that brought you here in one cookie on your own device, copy it once to your account when you register, then delete the cookie. Analytics never run inside a signed-in dashboard or admin area, and we never store your name, email, or anything you do after signing in.</p>
      <div class="cookie-card">
        <div class="cookie-choice-label">Your choice: Allow analytics</div>
        <div class="cookie-btn-row">
          <div class="cookie-btn">Only necessary</div>
          <div class="cookie-btn primary">Allow analytics</div>
        </div>
      </div>
    </section>

    <section>
      <h2>Our commitments</h2>
      <ul class="commit-list">
        <li>Your school's data is never sold.</li>
        <li>Access is limited by role &mdash; nobody sees more than their job requires.</li>
        <li>Nothing is shared outside your institution's account without your administrator's request.</li>
        <li>Deletion or export on request, at any time, through your school's administrator.</li>
      </ul>
    </section>

    <section>
      <h2>Contact</h2>
      <p>For privacy questions or to request deletion or export of your institution's data, please reach out via the channels listed on our home page.</p>
    </section>
  </div>
  <div class="footer">
    <div class="footer-row">
      <a href="guidelines.php">Guidelines</a><span class="footer-sep"></span>
      <a href="terms.php">Terms</a><span class="footer-sep"></span>
      <a href="privacy.php">Privacy</a><span class="footer-sep"></span>
      <a href="login.php">Home</a>
    </div>
    <div class="footer-copyright">© 2026 MuslimEdu.</div>
  </div>
</div>
</body>
</html>