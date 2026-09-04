<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Manhaj — MuslimEdu</title>
<meta name="description" content="Why we built MuslimEdu, and how it's different from generic school software." />
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
    --danger:       #D9534F;
    --danger-ghost: rgba(217,83,79,0.08);
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
  .intro { font-size: 14.5px; line-height: 1.7; color: var(--text-2); margin-bottom: 28px; }
  section { margin-bottom: 26px; }
  h2 { font-size: 13px; font-weight: 800; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 12px; }
  p, li { font-size: 14.5px; line-height: 1.7; color: var(--text-2); }
  .compare-card { border-radius: var(--radius); padding: 16px 16px 12px; margin-bottom: 14px; border: 1px solid var(--border); }
  .compare-card.bad { background: var(--danger-ghost); border-color: rgba(217,83,79,0.18); }
  .compare-card.good { background: var(--accent-ghost); border-color: var(--accent-border); }
  .compare-title { font-size: 14px; font-weight: 800; margin-bottom: 10px; }
  .compare-card.bad .compare-title { color: var(--danger); }
  .compare-card.good .compare-title { color: var(--accent); }
  .compare-list { list-style: none; padding: 0; }
  .compare-list li { padding-left: 22px; position: relative; margin-bottom: 8px; }
  .compare-card.bad .compare-list li::before { content: "✕"; position: absolute; left: 0; color: var(--danger); font-weight: 800; }
  .compare-card.good .compare-list li::before { content: "✓"; position: absolute; left: 0; color: var(--accent-mid); font-weight: 800; }
  .note-card { background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; box-shadow: var(--shadow-sm); }
  .closing { font-family: 'Playfair Display', serif; font-style: italic; font-size: 17px; color: var(--accent); margin-top: 8px; line-height: 1.5; }
  .placeholder { color: var(--text-3); }
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
    <div class="topbar-title">Manhaj</div>
  </div>
  <div class="content">
    <h1>Why We Built This.</h1>
    <div class="intro">Teachers and admins kept asking for it &mdash; on calls, in the QnA, after yet another spreadsheet went out of sync. So MuslimEdu is being built for you: role-first, data-respecting, for institutions serious about running well.</div>

    <section>
      <div class="compare-card bad">
        <div class="compare-title">Other platforms</div>
        <ul class="compare-list">
          <li>Built for generic businesses, retrofitted for schools</li>
          <li>No real role separation &mdash; broad access by default</li>
          <li>Student records scattered across spreadsheets, chats, and drives</li>
          <li>Security bolted on, easy to misconfigure</li>
          <li>No clear record of who accessed what</li>
        </ul>
      </div>
      <div class="compare-card good">
        <div class="compare-title">MuslimEdu</div>
        <ul class="compare-list">
          <li>Built specifically for mahads, madrasas, markaz, and schools</li>
          <li>Role-first from day one &mdash; teachers, cashiers, and registrars each see only what their role needs</li>
          <li>One record per student: attendance, grades, fees, and documents in one place</li>
          <li>Access is scoped by role and reviewable by your admin</li>
          <li><span class="placeholder">Built and maintained by [team / founders — add names here]</span></li>
        </ul>
      </div>
    </section>

    <section>
      <h2>A note from us</h2>
      <div class="note-card">
        <p>We secure the platform and enforce role-based access on our side. We can't guarantee how each staff member uses the access your institution grants them &mdash; your administrator's own judgment in assigning roles, and periodically reviewing who has access to what, remains essential.</p>
      </div>
    </section>

    <div class="closing">If you're serious about running your school well, this is for you.</div>
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