// Scholarship & Taqdim Assistant - student program detail
// (ScholarshipController::programDetail + eligibilityCheck). Reads
// program_id from the query string (linked from scholarship-browse.js's
// cards). "Start Application" calls ScholarshipApplicationController::
// applicationStart, which is idempotent - a student who already has an
// open (non-withdrawn) application for this program is handed that one
// back instead of a duplicate - so this button is safe to press again
// after navigating away and back.

function qsParam(name) { return new URLSearchParams(window.location.search).get(name); }
const programId = qsParam('program_id');

let currentProgram = null;
let eligibilityAnswers = {};

function formatDate(d) {
  if (!d) return null;
  try { return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch (e) { return d; }
}
function formatMoney(amount, currency) {
  if (amount === null || amount === undefined || amount === '') return null;
  const n = Number(amount);
  return (currency || '') + ' ' + (Number.isFinite(n) ? n.toLocaleString() : amount);
}
function requirementTypeLabel(rt) { return t('scholarship_programs.req_type_' + rt, (rt || '').charAt(0).toUpperCase() + (rt || '').slice(1)); }

function renderRequirementsHtml(requirements) {
  if (!requirements || requirements.length === 0) {
    return '<div class="util-row"><span class="util-row-title" style="color:var(--subtle);">' + escapeHtml(t('scholarship_detail.no_requirements', 'No specific requirements listed.')) + '</span></div>';
  }
  return requirements.map(r =>
    '<div class="util-row" style="pointer-events:none;">' +
      '<span class="util-row-icon">' + icon(r.requirement_type === 'document' ? 'filetext' : 'clipboard', { size: 15, color: 'var(--subtle)' }) + '</span>' +
      '<span class="util-row-title">' + escapeHtml(r.title) +
        (!r.is_required ? ' <span class="mini-chip warn">' + escapeHtml(t('scholarship_programs.optional_chip', 'Optional')) + '</span>' : '') +
        (r.may_require_translation ? ' <span class="mini-chip danger">' + escapeHtml(t('scholarship_translations.translation_required_badge', 'Translation Required')) + '</span>' : '') +
        (r.description ? '<br><span style="font-weight:400;color:var(--subtle);font-size:12px;">' + escapeHtml(r.description) + '</span>' : '') + '</span>' +
      '<span class="util-row-value">' + escapeHtml(requirementTypeLabel(r.requirement_type)) + '</span>' +
    '</div>'
  ).join('');
}

function renderAnnouncementsHtml(announcements) {
  if (!announcements || announcements.length === 0) return '';
  return '<div class="util-section-title">' + escapeHtml(t('scholarship_detail.announcements_section', 'Announcements')) + '</div>' +
    '<div class="util-card">' + announcements.map(a =>
      '<div class="util-row" style="pointer-events:none;flex-direction:column;align-items:flex-start;">' +
        '<span class="util-row-title">' + escapeHtml(a.title) + (a.is_pinned ? ' <span class="mini-chip warn">' + escapeHtml(t('scholarship_detail.pinned_chip', 'Pinned')) + '</span>' : '') + '</span>' +
        (a.body ? '<span style="font-weight:400;color:var(--subtle);font-size:12.5px;margin-top:4px;">' + escapeHtml(a.body) + '</span>' : '') +
      '</div>'
    ).join('') + '</div>';
}

function eligibilityBadge(result) {
  if (result === 'eligible') return '<span class="mini-chip ok">' + escapeHtml(t('scholarship_detail.eligible_badge', 'Likely Eligible')) + '</span>';
  if (result === 'not_eligible') return '<span class="mini-chip danger">' + escapeHtml(t('scholarship_detail.not_eligible_badge', 'Likely Not Eligible')) + '</span>';
  return '<span class="mini-chip warn">' + escapeHtml(t('scholarship_detail.incomplete_badge', 'More Info Needed')) + '</span>';
}

function renderEligibilityResult(data) {
  const wrap = document.getElementById('eligResultWrap');
  if (!wrap) return;
  const unknownRules = data.rules.filter(r => r.met === null);
  wrap.innerHTML =
    '<div style="margin:10px 0;">' + eligibilityBadge(data.result) + '</div>' +
    '<div class="util-card">' + data.rules.map(r =>
      '<div class="util-row" style="pointer-events:none;">' +
        '<span class="util-row-icon">' + icon(r.met === true ? 'checkcircle' : (r.met === false ? 'close' : 'bell'), { size: 15, color: r.met === true ? 'var(--emerald-deep)' : (r.met === false ? '#EF4444' : 'var(--subtle)') }) + '</span>' +
        '<span class="util-row-title">' + escapeHtml(r.label) + '</span>' +
      '</div>'
    ).join('') + '</div>' +
    (unknownRules.length > 0
      ? '<div id="eligAnswerFields" style="margin-top:12px;">' +
          unknownRules.map(r => {
            const isNumeric = /gpa|age|income/.test(r.attribute);
            return '<label class="util-label">' + escapeHtml(r.label) + '</label>' +
              '<input type="' + (isNumeric ? 'number' : 'text') + '" class="util-input eligAnswerInput" data-attribute="' + escapeHtml(r.attribute) + '" value="' + escapeHtml(eligibilityAnswers[r.attribute] || '') + '" />';
          }).join('') +
          '<button type="button" class="util-save-btn pill" id="eligRecheckBtn" style="margin-top:10px;">' + escapeHtml(t('scholarship_detail.recheck_btn', 'Update & Recheck')) + '</button>'
        : '') +
    '<p style="font-size:11.5px;color:var(--subtle);margin-top:12px;line-height:1.4;">' + escapeHtml(data.disclaimer) + '</p>';

  const recheckBtn = document.getElementById('eligRecheckBtn');
  if (recheckBtn) recheckBtn.addEventListener('click', () => {
    document.querySelectorAll('.eligAnswerInput').forEach(inp => {
      eligibilityAnswers[inp.dataset.attribute] = inp.value;
    });
    runEligibilityCheck(getStoredToken());
  });
}
function runEligibilityCheck(token) {
  const wrap = document.getElementById('eligResultWrap');
  if (wrap) wrap.innerHTML = '<div class="list-loading">' + escapeHtml(t('common.loading', 'Loading…')) + '</div>';
  checkScholarshipEligibility(token, programId, eligibilityAnswers).then(data => {
    renderEligibilityResult(data);
  }).catch(() => {
    if (wrap) wrap.innerHTML = '<div class="list-error">' + escapeHtml(t('scholarship_detail.eligibility_failed', 'Could not check eligibility.')) + '</div>';
  });
}

function renderDetail(token, data) {
  currentProgram = data.program;
  const p = data.program;
  const providerName = (p.provider && p.provider.name) || '';
  const money = formatMoney(p.coverage_amount, p.currency);
  const deadline = formatDate(p.application_deadline);
  const opens = formatDate(p.application_open_at);

  document.getElementById('detailContent').innerHTML =
    '<div style="padding:2px 2px 4px;">' +
      '<h1 style="font-size:19px;font-weight:800;color:var(--ink);margin:0 0 4px;">' + escapeHtml(p.title) + '</h1>' +
      '<div class="list-card-meta">' + escapeHtml(providerName) + (p.academic_year ? ' · ' + escapeHtml(p.academic_year) : '') + '</div>' +
      '<div class="chip-row" style="margin-top:8px;">' +
        (money ? '<span class="mini-chip ok">' + escapeHtml(money) + '</span>' : '') +
        (deadline ? '<span class="mini-chip warn">' + escapeHtml(t('scholarship_detail.deadline_chip', 'Deadline {date}').replace('{date}', deadline)) + '</span>' : '') +
        (opens ? '<span class="mini-chip ok">' + escapeHtml(t('scholarship_detail.opens_chip', 'Opens {date}').replace('{date}', opens)) + '</span>' : '') +
      '</div>' +
    '</div>' +
    (p.summary ? '<p style="font-size:14px;color:var(--ink);line-height:1.5;margin:10px 2px;">' + escapeHtml(p.summary) + '</p>' : '') +
    (p.description ? '<p style="font-size:13.5px;color:var(--subtle);line-height:1.5;margin:10px 2px 16px;">' + escapeHtml(p.description) + '</p>' : '') +

    renderAnnouncementsHtml(data.announcements) +

    '<div class="util-section-title" style="margin-top:16px;">' + escapeHtml(t('scholarship_detail.requirements_section', 'Requirements')) + '</div>' +
    '<div class="util-card">' + renderRequirementsHtml(p.requirements) + '</div>' +

    '<div class="util-section-title" style="margin-top:16px;">' + escapeHtml(t('scholarship_detail.eligibility_section', 'Check Your Eligibility')) + '</div>' +
    '<div class="util-card" style="padding:14px;">' +
      '<button type="button" class="sheet-btn-secondary" id="eligCheckBtn" style="width:100%;">' + escapeHtml(t('scholarship_detail.check_eligibility_btn', 'Check My Eligibility')) + '</button>' +
      '<div id="eligResultWrap"></div>' +
    '</div>' +

    '<button type="button" class="util-save-btn pill" id="startAppBtn" style="margin-top:20px;"><span id="startAppLabel">' + escapeHtml(t('scholarship_detail.start_application_btn', 'Start Application')) + '</span></button>';

  document.getElementById('eligCheckBtn').addEventListener('click', () => runEligibilityCheck(token));
  document.getElementById('startAppBtn').addEventListener('click', () => {
    const btn = document.getElementById('startAppBtn');
    const label = document.getElementById('startAppLabel');
    btn.disabled = true; label.innerHTML = '<span class="util-spinner"></span>';
    startScholarshipApplication(token, programId).then(app => {
      window.location.href = 'scholarship-application.php?application_id=' + app.id;
    }).catch(err => {
      showToast(err && err.message ? err.message : t('scholarship_detail.start_failed', 'Could not start your application.'));
      btn.disabled = false; label.textContent = t('scholarship_detail.start_application_btn', 'Start Application');
    });
  });
}

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(currentProgram ? currentProgram.title : t('scholarship_detail.title', 'Scholarship Details'), '', 'scholarship-browse.php');
}
onLocaleChange(renderHeaderText);

guardDashboard('student', function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  document.getElementById('bottomNavWrap').innerHTML = renderBottomNav('student');
  renderHeaderText();

  if (!programId) {
    document.getElementById('utilBody').style.display = '';
    document.getElementById('detailContent').innerHTML = '<div class="list-empty"><div class="list-empty-title">' + escapeHtml(t('scholarship_detail.missing_id', 'No scholarship selected.')) + '</div></div>';
    return;
  }

  fetchScholarshipProgramDetail(token, programId).then(data => {
    document.getElementById('utilBody').style.display = '';
    renderDetail(token, data);
    renderHeaderText();
  }).catch(() => {
    document.getElementById('utilBody').style.display = '';
    document.getElementById('detailContent').innerHTML = '<div class="list-error">' + escapeHtml(t('scholarship_detail.load_failed', 'Could not load this scholarship.')) + '</div>';
  });
});
