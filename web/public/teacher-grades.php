<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Enter Grades — MuslimEdu</title>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; worker-src 'self'; manifest-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: https://manhaje.com; connect-src 'self' https://manhaje.com; base-uri 'none'; form-action 'none'; upgrade-insecure-requests" />
<meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
<script src="pwa-guard.js"></script>
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
<link rel="stylesheet" href="dashboard.css" />
<style>
/* Scoped to this page only. Class/subject picker + quarter tabs stay as
   they were; the student roster below them is now a one-student-at-a-time
   wizard card (.gbw-*) instead of a Student × Q1-Q4 × AVG table - that
   table is what was truncating names and cramming every quarter's mark
   into unreadably narrow cells on a phone-width screen. */
.gb-quarter-row { display: flex; gap: 8px; margin: 4px 0 16px; }
.gb-quarter-chip {
  flex: 1; text-align: center; padding: 10px 0; border-radius: 12px;
  background: #fff; border: 1px solid var(--card-border); font-size: 13px; font-weight: 700; color: var(--subtle);
}
.gb-quarter-chip.active { background: var(--emerald-gradient); border-color: var(--emerald); color: #fff; }
.gb-hint { font-size: 12px; color: var(--subtle); margin: 0 0 12px 2px; line-height: 1.5; }

/* Progress bar - "Student N of Total" above the current card. */
.gbw-progress-row { display: flex; align-items: center; gap: 10px; margin: 4px 0 14px; }
.gbw-progress-label { font-size: 12.5px; font-weight: 700; color: var(--subtle); white-space: nowrap; }
.gbw-progress-track { flex: 1; height: 6px; border-radius: 3px; background: var(--card-border); overflow: hidden; }
.gbw-progress-fill { height: 100%; background: var(--emerald-gradient); border-radius: 3px; transition: width .25s ease; }

/* One card per student - only the current one is display:'' at a time
   (JS toggles this), the rest sit display:none so their inputs stay in
   the DOM (and therefore still readable by collectRecords()) without
   being visible. */
.gbw-card { background: #fff; border-radius: 20px; padding: 20px 18px; box-shadow: 0 2px 8px rgba(11,61,46,0.05); }
.gbw-student-header { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
.gbw-student-name { font-size: 17px; font-weight: 800; color: var(--ink); }

.gbw-mark-block { margin-bottom: 16px; }
.gbw-mark-label { font-size: 12px; font-weight: 700; color: var(--subtle); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 8px; display: block; }
.gbw-mark-label-suffix { text-transform: none; font-weight: 600; letter-spacing: normal; }
.gbw-mark-input {
  width: 100%; font-size: 28px; font-weight: 800; text-align: center; color: var(--ink);
  border: 1.5px solid var(--card-border); border-radius: 14px; padding: 14px; background: #FAFBFA; font-family: inherit; box-sizing: border-box;
}
.gbw-mark-input:focus { outline: none; border-color: var(--emerald); background: #fff; }

.gbw-comment-block { margin-bottom: 18px; }
.gbw-comment-block label { font-size: 12px; font-weight: 700; color: var(--subtle); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 8px; display: block; }
.gbw-comment-block textarea {
  width: 100%; min-height: 60px; border: 1px solid var(--card-border); border-radius: 12px;
  padding: 10px 12px; font-size: 14px; color: var(--ink); background: #FAFBFA; font-family: inherit; resize: vertical; box-sizing: border-box;
}

/* Every quarter's mark + the running average, as small reference chips -
   the same numbers the old table's read-only columns showed, just below
   the card instead of squeezed into it. .current highlights whichever
   quarter's mark is the one actually being edited above. */
.gbw-reference-row { display: flex; flex-wrap: wrap; gap: 6px; padding-top: 14px; border-top: 1px solid var(--card-border); }
.gbw-ref-chip { font-size: 11.5px; font-weight: 700; color: var(--subtle); background: #F3F4F6; border-radius: 8px; padding: 5px 9px; }
.gbw-ref-chip.current { color: var(--emerald-deep); background: var(--emerald-gradient-soft); }
.gbw-ref-chip.avg { color: var(--emerald-deep); background: var(--emerald-gradient-soft); font-weight: 800; }

.gbw-nav-row { display: flex; gap: 10px; margin-top: 16px; }
.gbw-nav-btn { flex: 1; padding: 13px 0; border-radius: 100px; font-size: 14px; font-weight: 700; border: 1.5px solid var(--card-border); background: #fff; color: var(--ink); font-family: inherit; }
.gbw-nav-btn.primary { background: var(--emerald-gradient); color: #fff; border-color: transparent; }
.gbw-nav-btn:disabled { opacity: 0.4; }
.gbw-last-hint { text-align: center; font-size: 12px; color: var(--subtle); margin-top: 12px; line-height: 1.5; }
</style>
</head>
<body>

<div id="routeGuardSplash" class="route-guard-splash"><div class="route-guard-spinner"></div></div>

<div id="utilHeaderWrap"></div>

<div class="util-body" id="utilBody" style="display:none;">
  <div class="util-card padded" id="pickerCard">
    <div class="util-row" id="classRow"><span class="util-row-title" data-i18n="teacher_attendance.class_subject_label">Class &amp; Subject</span></div>
  </div>

  <div id="quarterWrap" style="display:none;">
    <div class="gb-quarter-row" id="quarterRow"></div>
    <div class="gb-hint" id="gbHint"></div>
  </div>

  <div id="gradesContent"></div>
</div>

<div class="fixed-bottom-bar" id="saveBarWrap" style="display:none;">
  <button type="button" class="util-save-btn pill" id="saveGradesBtn"><span id="saveGradesLabel" data-i18n="teacher_grades.save_grades_default">Save Grades</span></button>
</div>

<div id="bottomNavWrap"></div>

<script src="dashboard.js"></script>
<script src="teacher-grades.js"></script>
<script src="pwa.js" defer></script>
</body>
</html>
