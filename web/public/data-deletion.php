<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Data Deletion Instructions — MuslimEdu</title>
<meta name="description" content="How to request deletion of your institution, staff, or student data from MuslimEdu." />
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
  .step-list { list-style: none; padding-left: 0; margin-top: 4px; counter-reset: step; }
  .step-list li { padding-left: 34px; position: relative; margin-bottom: 14px; }
  .step-list li::before { counter-increment: step; content: counter(step); position: absolute; left: 0; top: 0; width: 22px; height: 22px; border-radius: 50%; background: var(--accent-ghost); color: var(--accent); font-size: 12px; font-weight: 800; display: flex; align-items: center; justify-content: center; }
  .retain-card { background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; box-shadow: var(--shadow-sm); }
  .retain-card h3 { font-size: 13px; font-weight: 800; color: var(--text-1); margin-bottom: 6px; }
  .retain-card + .retain-card { margin-top: 10px; }
  .contact-card { background: var(--accent-ghost); border: 1px solid var(--accent-border); border-radius: var(--radius); padding: 16px; }
  .contact-card p { color: var(--text-1); }
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
    <div class="topbar-title">Data Deletion</div>
  </div>
  <div class="content">
    <h1>Data deletion instructions</h1>
    <div class="intro">How to request that your data, or your institution's data, be removed from MuslimEdu.</div>

    <section>
      <h2>Who this covers</h2>
      <p>MuslimEdu accounts belong to an institution &mdash; students and staff are enrolled by a school's administrator. Because of that, deletion requests are handled two ways: an individual can ask to have their own account and personal data removed, or an institution's administrator can ask to have the school's entire account and records removed.</p>
    </section>

    <section>
      <h2>How to request deletion</h2>
      <ol class="step-list">
        <li>If you're a student, parent, or staff member, start with your school's MuslimEdu administrator &mdash; they can remove your account directly, or forward the request to us on your behalf.</li>
        <li>If you're an institution administrator, or your school no longer has an active administrator, contact us directly using the details below with your institution's name and the account(s) to be removed.</li>
        <li>We confirm the request against the account on file, then process the deletion. You'll get a confirmation once it's complete.</li>
      </ol>
      <div class="note">Most requests are completed within 30 days.</div>
    </section>

    <section>
      <h2>What gets deleted</h2>
      <p>Profile details, contact information, uploaded documents, messages, and activity tied to the account are permanently removed from active systems and from backups on their normal rotation schedule.</p>
    </section>

    <section>
      <h2>What we may keep</h2>
      <div class="retain-card">
        <h3>Academic and financial records</h3>
        <p>Grades, enrollment history, and fee records that a school is required to retain for accreditation or regulatory reasons may be kept in anonymized or archived form even after an account is deleted.</p>
      </div>
      <div class="retain-card">
        <h3>Security and abuse prevention</h3>
        <p>A minimal record of the request itself, and anything needed to investigate a reported policy violation, may be retained for a limited period.</p>
      </div>
    </section>

    <section>
      <h2>Contact</h2>
      <div class="contact-card">
        <p>To request deletion of your account or your institution's data, reach out via the channels listed on our home page and mention "data deletion request" along with your institution's name.</p>
      </div>
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
