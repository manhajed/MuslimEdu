<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Community Guidelines — MuslimEdu</title>
<meta name="description" content="Community guidelines for accounts, messaging, and posts on MuslimEdu." />
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
  .intro { font-size: 14.5px; line-height: 1.7; color: var(--text-2); margin-bottom: 22px; }
  section { margin-bottom: 24px; }
  h2 { font-size: 14.5px; font-weight: 800; color: var(--text-1); margin-bottom: 8px; letter-spacing: -0.1px; }
  p, li { font-size: 14.5px; line-height: 1.7; color: var(--text-2); }
  p + p { margin-top: 10px; }
  ul { padding-left: 20px; margin-top: 4px; }
  li { margin-bottom: 4px; }
  .rules-card { background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; box-shadow: var(--shadow-sm); margin-bottom: 26px; }
  .rules-card ul { padding-left: 20px; margin-top: 0; }
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
    <div class="topbar-title">Community Guidelines</div>
  </div>
  <div class="content">
    <h1>Community guidelines</h1>
    <div class="intro">MuslimEdu is a role-first platform for schools, staff, students, and families. These guidelines keep the space respectful and safe for everyone using it.</div>

    <section>
      <h2>The rules in short</h2>
      <div class="rules-card">
        <ul>
          <li>MuslimEdu is a role-first school management platform.</li>
          <li>MuslimEdu cannot verify the accuracy of what staff or admins enter about students or classes.</li>
          <li>Users are responsible for providing truthful information.</li>
          <li>Accounts are personal &mdash; never share your login or let someone else use your account.</li>
          <li>Messages and posts on MuslimEdu should stay respectful and on-topic for school matters.</li>
          <li>Fake accounts or inappropriate content can be reported, and admins can restrict or suspend access.</li>
          <li>MuslimEdu is only a tool: it does not guarantee outcomes and is not responsible for conduct outside the platform.</li>
          <li>If you're unsure whether something belongs on MuslimEdu, raise it with your school's administrator first.</li>
        </ul>
      </div>
    </section>

    <section>
      <h2>Accounts and access</h2>
      <p>MuslimEdu is role-first, not an identity verifier. Your institution's administrator decides who gets which role, and MuslimEdu enforces the access boundaries that role comes with. You are responsible for providing truthful information when your account is set up, and for keeping your login credentials to yourself.</p>
    </section>

    <section>
      <h2>Messages and posts</h2>
      <p>Chat and the newsfeed exist for school communication &mdash; announcements, class coordination, and questions between the roles your school allows to reach each other. Keep messages and posts on-topic, respectful, and appropriate for a school setting.</p>
    </section>

    <section>
      <h2>Reporting and moderation</h2>
      <p>You can report a message, post, or profile that looks fake, inappropriate, or suspicious. Your school's admins review reports and may hide content or restrict an account pending review. We prefer restricting access to permanent removal, but we may remove content or accounts that violate these guidelines.</p>
    </section>

    <section>
      <h2>Your responsibility</h2>
      <p>You are responsible for the truthfulness of what you enter and for how you use your account. MuslimEdu cannot verify every claim made by staff or students, and is only a tool your institution uses to run its own processes &mdash; it does not guarantee any outcome and is not responsible for anything that happens outside the platform.</p>
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