<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MuslimEdu — School Management for Islamic Schools</title>
  <meta name="description" content="MuslimEdu is a school management platform for mahads, madrasas, markaz, regular schools, and orphanages — admissions, attendance, fees, grading, and communication in one place." />
  <!-- Application-layer hardening, same pattern as login.php/register.php.
       See web/SECURITY.md — frame-ancestors/X-Frame-Options/HSTS/X-Content-
       Type-Options need real HTTP headers from whatever serves this file,
       a <meta> tag can't set them. No forms or fetches on this page, so
       connect-src/form-action stay locked down to 'none'. -->
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'none'; base-uri 'none'; form-action 'none'; upgrade-insecure-requests" />
  <meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%95%8C%3C/text%3E%3C/svg%3E" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,500&family=Playfair+Display:ital,wght@1,600&display=swap" rel="stylesheet" />

  <style>
    /* Same design tokens as register.php, so the site reads as one product. */
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
      --gold:         #D4A64A;
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
    em { font-style: italic; font-family: 'Playfair Display', serif; color: var(--accent); }
    .container { max-width: 1160px; margin: 0 auto; padding: 0 24px; }

    /* ── NAV ── */
    .nav {
      padding: 20px 0;
      border-bottom: 1px solid var(--border);
      background: rgba(232,244,242,0.85);
      backdrop-filter: blur(12px);
      position: sticky; top: 0; z-index: 100;
    }
    .nav-inner { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    .nav-logo { font-size: 1.15rem; font-weight: 700; letter-spacing: -0.04em; color: var(--text-1); }
    .nav-logo span { color: var(--accent); }
    .nav-actions { display: flex; align-items: center; gap: 10px; }
    .btn-ghost {
      font-size: 0.875rem; font-weight: 600; color: var(--text-2);
      padding: 9px 18px; border-radius: 100px;
      transition: color 0.3s, background 0.3s;
    }
    .btn-ghost:hover { color: var(--accent); background: var(--accent-ghost); }
    .btn-solid {
      font-size: 0.875rem; font-weight: 700; color: #fff;
      background: var(--accent); padding: 9px 20px; border-radius: 100px;
      box-shadow: 0 6px 18px rgba(26,122,110,0.28);
      transition: background 0.3s var(--silk), transform 0.3s var(--silk);
    }
    .btn-solid:hover { background: var(--accent-mid); transform: translateY(-1px); }

    /* ── HERO ── */
    .hero { padding: 88px 0 96px; text-align: center; }
    .section-label {
      display: inline-flex; align-items: center; gap: 8px;
      font-size: 11px; font-weight: 600; letter-spacing: 0.14em;
      text-transform: uppercase; color: var(--accent);
      background: var(--accent-ghost); border: 1px solid var(--accent-border);
      padding: 6px 14px; border-radius: 100px; margin-bottom: 22px;
    }
    .section-label::before { content: ''; width: 6px; height: 6px; background: var(--accent); border-radius: 50%; }
    .hero-title {
      font-size: clamp(2.2rem, 5vw, 3.6rem); font-weight: 700;
      letter-spacing: -0.03em; line-height: 1.12; margin-bottom: 22px;
      max-width: 780px; margin-left: auto; margin-right: auto;
    }
    .hero-sub {
      font-size: 1.0625rem; line-height: 1.75; color: var(--text-2);
      max-width: 560px; margin: 0 auto 36px;
    }
    .hero-actions { display: flex; align-items: center; justify-content: center; gap: 14px; flex-wrap: wrap; }
    .hero-actions .btn-solid { padding: 14px 30px; font-size: 0.9375rem; }
    .hero-actions .btn-outline {
      font-size: 0.9375rem; font-weight: 700; color: var(--text-1);
      background: var(--surface-2); border: 1.5px solid var(--border);
      padding: 13px 28px; border-radius: 100px;
      transition: border-color 0.3s, background 0.3s;
    }
    .hero-actions .btn-outline:hover { border-color: var(--accent-border); background: var(--accent-ghost); }

    /* ── ROLES ── */
    .roles { padding: 8px 0 96px; }
    .roles-head { text-align: center; margin-bottom: 44px; }
    .roles-head h2 { font-size: clamp(1.5rem, 2.6vw, 2rem); font-weight: 700; letter-spacing: -0.02em; margin-bottom: 12px; }
    .roles-head p { font-size: 0.9375rem; color: var(--text-2); max-width: 480px; margin: 0 auto; line-height: 1.6; }
    .roles-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    .role-card {
      background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--radius);
      padding: 24px 20px; box-shadow: var(--shadow-sm);
      transition: transform 0.3s var(--silk), box-shadow 0.3s var(--silk), border-color 0.3s;
    }
    .role-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); border-color: var(--accent-border); }
    .role-icon {
      width: 40px; height: 40px; border-radius: 12px;
      background: var(--accent-ghost); border: 1px solid var(--accent-border);
      display: flex; align-items: center; justify-content: center; font-size: 18px; color: var(--accent);
      margin-bottom: 14px;
    }
    .role-card h3 { font-size: 0.9375rem; font-weight: 700; margin-bottom: 6px; }
    .role-card p { font-size: 0.8125rem; color: var(--text-3); line-height: 1.55; }

    /* ── FEATURES ── */
    .features { padding: 8px 0 96px; }
    .features-inner {
      background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--radius-lg);
      box-shadow: var(--shadow-md); padding: 48px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px;
    }
    .feature-item { display: flex; flex-direction: column; gap: 10px; }
    .feature-icon {
      width: 38px; height: 38px; border-radius: 11px;
      background: var(--accent-ghost); border: 1px solid var(--accent-border);
      display: flex; align-items: center; justify-content: center; font-size: 16px; color: var(--accent);
    }
    .feature-item h3 { font-size: 0.9375rem; font-weight: 700; }
    .feature-item p { font-size: 0.8375rem; color: var(--text-3); line-height: 1.6; }

    /* ── CTA ── */
    .cta { padding: 8px 0 100px; }
    .cta-card {
      background: linear-gradient(135deg, var(--accent) 0%, var(--accent-mid) 100%);
      border-radius: var(--radius-lg); padding: 56px 40px; text-align: center;
      box-shadow: var(--shadow-lg);
    }
    .cta-card h2 { font-size: clamp(1.4rem, 2.6vw, 1.9rem); font-weight: 700; color: #fff; letter-spacing: -0.02em; margin-bottom: 12px; }
    .cta-card p { font-size: 0.9375rem; color: rgba(255,255,255,0.85); max-width: 460px; margin: 0 auto 28px; line-height: 1.65; }
    .cta-card .btn-white {
      display: inline-block; font-size: 0.9375rem; font-weight: 700; color: var(--accent);
      background: #fff; padding: 14px 30px; border-radius: 100px;
      transition: transform 0.3s var(--silk);
    }
    .cta-card .btn-white:hover { transform: translateY(-1px); }

    /* ── FOOTER ── */
    .footer { padding: 32px 0; border-top: 1px solid var(--border); }
    .footer-inner { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
    .footer-inner span { font-size: 0.8125rem; color: var(--text-3); }
    .footer-links { display: flex; gap: 20px; }
    .footer-links a { font-size: 0.8125rem; color: var(--text-3); transition: color 0.3s; }
    .footer-links a:hover { color: var(--accent); }

    @media (max-width: 860px) {
      .roles-grid { grid-template-columns: repeat(2, 1fr); }
      .features-inner { grid-template-columns: 1fr; padding: 32px; }
      .hero { padding: 56px 0 64px; }
    }
    @media (max-width: 520px) {
      .roles-grid { grid-template-columns: 1fr; }
      .nav-actions .btn-ghost { display: none; }
    }
  </style>
</head>
<body>
  <nav class="nav">
    <div class="container nav-inner">
      <span class="nav-logo">Muslim<span>Edu</span></span>
      <div class="nav-actions">
        <a class="btn-ghost" href="login.php">Sign In</a>
        <a class="btn-solid" href="register.php">Register Your School</a>
      </div>
    </div>
  </nav>

  <main>
    <section class="hero">
      <div class="container">
        <span class="section-label">School Management, Simplified</span>
        <h1 class="hero-title">One platform for <em>every role</em> in your Islamic school</h1>
        <p class="hero-sub">Admissions, attendance, fees, grading, and communication for mahads, madrasas, markaz, regular schools, and orphanages — built for admins, teachers, students, and staff alike.</p>
        <div class="hero-actions">
          <a class="btn-solid" href="login.php">Sign In</a>
          <a class="btn-outline" href="register.php">Register Your School</a>
        </div>
      </div>
    </section>

    <section class="roles">
      <div class="container">
        <div class="roles-head">
          <h2>Built for every seat in the school</h2>
          <p>Each role gets a dashboard designed around what they actually need to do each day.</p>
        </div>
        <div class="roles-grid">
          <div class="role-card">
            <div class="role-icon">🛡️</div>
            <h3>Admins</h3>
            <p>Manage teachers, students, classes, fees, and school-wide settings from one place.</p>
          </div>
          <div class="role-card">
            <div class="role-icon">📋</div>
            <h3>Teachers</h3>
            <p>Take attendance, enter grades, manage lesson plans, and message parents.</p>
          </div>
          <div class="role-card">
            <div class="role-icon">🎓</div>
            <h3>Students</h3>
            <p>Track grades, schedules, and progress, and access ID cards and documents.</p>
          </div>
          <div class="role-card">
            <div class="role-icon">🕌</div>
            <h3>Super Admins</h3>
            <p>Oversee every school on MuslimEdu — subscriptions, moderation, and platform health.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="features">
      <div class="container">
        <div class="features-inner">
          <div class="feature-item">
            <div class="feature-icon">✓</div>
            <h3>Verified schools only</h3>
            <p>Every new school admin is identity-verified before their account goes live.</p>
          </div>
          <div class="feature-item">
            <div class="feature-icon">🔒</div>
            <h3>Secure by default</h3>
            <p>Locked-down sessions and role-based access, the same backend that powers the mobile app.</p>
          </div>
          <div class="feature-item">
            <div class="feature-icon">📱</div>
            <h3>Works everywhere</h3>
            <p>Use it on the web or install the MuslimEdu app — same account, same data, either way.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="cta">
      <div class="container">
        <div class="cta-card">
          <h2>Ready to bring your school onto MuslimEdu?</h2>
          <p>Set up your admin account in a few minutes. Your application is reviewed before it goes live, so every school on the platform is a real one.</p>
          <a class="btn-white" href="register.php">Register Your School</a>
        </div>
      </div>
    </section>
  </main>

  <footer class="footer">
    <div class="container footer-inner">
      <span>© 2026 MuslimEdu. All rights reserved.</span>
      <div class="footer-links">
        <a href="login.php">Sign In</a>
        <a href="register.php">Register Your School</a>
      </div>
    </div>
  </footer>
</body>
</html>
