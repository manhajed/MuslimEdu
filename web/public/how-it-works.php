<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>How It Works — MuslimEdu</title>
<meta name="description" content="How schools, staff, and students get set up on MuslimEdu." />
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
  .intro { font-size: 14.5px; line-height: 1.7; color: var(--text-2); margin-bottom: 26px; }
  section { margin-bottom: 28px; }
  h2 { font-family: 'Playfair Display', serif; font-weight: 700; font-style: italic; font-size: 18px; color: var(--accent); margin-bottom: 4px; }
  .section-sub { font-size: 13.5px; color: var(--text-3); margin-bottom: 16px; }
  .step { display: flex; gap: 14px; margin-bottom: 18px; }
  .step-num { flex-shrink: 0; width: 30px; height: 30px; border-radius: 50%; background: var(--accent); color: #fff; font-weight: 800; font-size: 14px; display: flex; align-items: center; justify-content: center; }
  .step-body { padding-top: 3px; }
  .step-title { font-size: 14.5px; font-weight: 800; color: var(--text-1); margin-bottom: 3px; }
  .step-desc { font-size: 14px; line-height: 1.6; color: var(--text-2); }
  .branch-card { background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; box-shadow: var(--shadow-sm); }
  .branch-title { font-size: 13px; font-weight: 800; color: var(--accent); text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 12px; }
  .mini-step { display: flex; gap: 10px; margin-bottom: 8px; align-items: flex-start; }
  .mini-num { flex-shrink: 0; width: 20px; height: 20px; border-radius: 50%; background: var(--accent-ghost); color: var(--accent); font-weight: 800; font-size: 11.5px; display: flex; align-items: center; justify-content: center; }
  .mini-step p { font-size: 13.5px; line-height: 1.5; color: var(--text-2); }
  .branches { display: flex; flex-direction: column; gap: 14px; margin-top: 16px; }
  .closing-card { background: var(--accent-ghost); border: 1px solid var(--accent-border); border-radius: var(--radius); padding: 18px; }
  .closing-title { font-family: 'Playfair Display', serif; font-weight: 700; font-style: italic; font-size: 17px; color: var(--accent); margin-bottom: 6px; }
  .closing-body { font-size: 14px; line-height: 1.6; color: var(--text-2); }
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
    <div class="topbar-title">How It Works</div>
  </div>
  <div class="content">
    <h1>Three Simple Steps.</h1>
    <div class="intro">Whether you're registering a new school or joining one that's already on MuslimEdu, your role is always the only way in.</div>

    <section>
      <div class="step">
        <div class="step-num">1</div>
        <div class="step-body">
          <div class="step-title">Register.</div>
          <div class="step-desc">Your school's admin submits an application &mdash; or invites you directly once your school is already live.</div>
        </div>
      </div>
      <div class="step">
        <div class="step-num">2</div>
        <div class="step-body">
          <div class="step-title">Review.</div>
          <div class="step-desc">A MuslimEdu reviewer checks new school applications before anything goes live. Invited staff and students simply confirm their own account.</div>
        </div>
      </div>
      <div class="step">
        <div class="step-num">3</div>
        <div class="step-body">
          <div class="step-title">Once Approved, Your Dashboard Is Unlocked.</div>
          <div class="step-desc">Two paths, same destination. Every account signs in through the same login and lands on the dashboard built for its role.</div>
        </div>
      </div>
    </section>

    <section>
      <h2>By Design, Your Role Is the Only Channel.</h2>
      <div class="section-sub">No open access, no cross-role visibility. The platform is built this way.</div>

      <div class="branches">
        <div class="branch-card">
          <div class="branch-title">If you're registering a school</div>
          <div class="mini-step"><div class="mini-num">1</div><p>Your admin submits institution details and an ID document.</p></div>
          <div class="mini-step"><div class="mini-num">2</div><p>A MuslimEdu reviewer checks it before anything goes live.</p></div>
          <div class="mini-step"><div class="mini-num">3</div><p>Once approved, your admin invites staff, teachers, and students to their own roles.</p></div>
        </div>
        <div class="branch-card">
          <div class="branch-title">If you're joining an existing school</div>
          <div class="mini-step"><div class="mini-num">1</div><p>Your school's admin sends you an invite for your specific role.</p></div>
          <div class="mini-step"><div class="mini-num">2</div><p>You confirm your account and sign in.</p></div>
          <div class="mini-step"><div class="mini-num">3</div><p>You land on the dashboard built for your role &mdash; nothing more, nothing less.</p></div>
        </div>
      </div>
    </section>

    <section>
      <div class="closing-card">
        <div class="closing-title">Your role is the channel.</div>
        <div class="closing-body">No shared logins. No stepping outside your role's dashboard. The platform is built this way.</div>
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