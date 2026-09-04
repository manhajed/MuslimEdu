<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Terms — MuslimEdu</title>
<meta name="description" content="Terms of use for MuslimEdu, the school management platform." />
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
  section { margin-bottom: 24px; }
  h2 { font-size: 14.5px; font-weight: 800; color: var(--text-1); margin-bottom: 8px; letter-spacing: -0.1px; }
  p, li { font-size: 14.5px; line-height: 1.7; color: var(--text-2); }
  p + p { margin-top: 10px; }
  ul { padding-left: 20px; margin-top: 4px; }
  li { margin-bottom: 4px; }
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
    <div class="topbar-title">Terms</div>
  </div>
  <div class="content">
    <h1>Terms of use</h1>
    <div class="intro">By using MuslimEdu you agree to the following. We've kept this plain.</div>

    <section>
      <h2>Eligibility</h2>
      <p>MuslimEdu accounts are issued by your institution's administrator to staff, teachers, registrars, and students. Where a student is a minor, their account is created and overseen by their school &mdash; not self-registered. Adult roles (admin, teacher, registrar, cashier, alumni) confirm they are authorized by their institution to hold that role when their account is created.</p>
    </section>

    <section>
      <h2>What MuslimEdu is, and is not</h2>
      <ul>
        <li>MuslimEdu is a school management platform for admissions, attendance, fees, grading, and communication.</li>
        <li>MuslimEdu cannot verify the accuracy of information staff or admins enter about students, classes, or fees.</li>
        <li>MuslimEdu does not act as your institution's registrar, accountant, or record-keeper of legal record &mdash; it is a tool your institution uses to manage its own records.</li>
        <li>MuslimEdu does not guarantee the correctness of any data entered by your institution's staff.</li>
      </ul>
    </section>

    <section>
      <h2>Your responsibilities</h2>
      <p>You agree to provide truthful information, to use your account only within your assigned role, and to keep your login credentials confidential. Do not share your account, impersonate another user, or attempt to access data outside your role. Follow your institution's own policies for how student and family information is handled.</p>
    </section>

    <section>
      <h2>Moderation</h2>
      <p>Falsified records, inappropriate content, or attempts to bypass role restrictions may result in an account being hidden or suspended pending review. We prefer suspension to permanent deletion, but we may remove content or accounts that violate these terms.</p>
    </section>

    <section>
      <h2>No warranty</h2>
      <p>MuslimEdu is provided as an administration tool only. We do not guarantee any particular outcome and are not responsible for the conduct of staff or members, or for the accuracy of the information they enter. Proceed responsibly.</p>
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