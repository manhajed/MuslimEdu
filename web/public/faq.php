<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>FAQ — MuslimEdu</title>
<meta name="description" content="Frequently asked questions about MuslimEdu." />
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
  .intro a { color: var(--accent); font-weight: 700; text-decoration: none; }
  .qa { background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; box-shadow: var(--shadow-sm); margin-bottom: 12px; }
  .q { font-size: 14.5px; font-weight: 800; color: var(--text-1); margin-bottom: 6px; }
  .a { font-size: 14px; line-height: 1.65; color: var(--text-2); }
  .a .placeholder { color: var(--text-3); }
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
    <div class="topbar-title">FAQ</div>
  </div>
  <div class="content">
    <h1>Frequently Asked Questions</h1>
    <div class="intro">Still have a question? Reach out via the channels listed on our home page.</div>

    <div class="qa">
      <div class="q">Is there a fee?</div>
      <div class="a">Registering your school and creating staff or student accounts is free to set up. Once your school is approved and live, your institution's subscription depends on its size and plan &mdash; see "Register your school" for current pricing.</div>
    </div>

    <div class="qa">
      <div class="q">Can I message anyone in the school directly?</div>
      <div class="a">Messaging follows your role, not open access. A teacher can reach their own students and classes; a registrar or admin has a wider reach appropriate to their role. There's no messaging outside the roles your school has connected.</div>
    </div>

    <div class="qa">
      <div class="q">Will photos be shown?</div>
      <div class="a">Only where a role needs them &mdash; for example, a student ID card shows that student's photo to the staff who issue and check IDs. Photos are never made public and are never shown outside your institution's account.</div>
    </div>

    <div class="qa">
      <div class="q">How is my data handled?</div>
      <div class="a">As an amānah. Access is limited by role, data is never sold, and it's never shown to other institutions. You can request export or deletion at any time through your school's administrator.</div>
    </div>

    <div class="qa">
      <div class="q">Who built MuslimEdu?</div>
      <div class="a"><span class="placeholder">MuslimEdu is built and maintained by Manhaje. Same standards, same manhaj, across everything we build.</span></div>
    </div>
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