// Student (self-service): Enrollment Status — web port of
// EnrollmentStatusScreen.tsx. Where a student is in the admission
// pipeline configured in Enrollment Stages, what to do next, and how they
// got here. Backend: EnrollmentWorkflowController::student_enrollment_workflow_status.
//
// RN treats this as a hard navigation gate - MainTabs shows ONLY this
// screen (no back button, no tab bar, just Log Out) until the student's
// workflow reaches 'completed'. This is deliberately NOT ported that way:
// gating every student page in this app on one endpoint's response is a
// much bigger, higher-blast-radius change than what was asked for here -
// if that endpoint ever errors or a school doesn't use this feature, a
// hard gate would lock students out of pages that have nothing to do with
// enrollment. This ships as a normal reachable menu page (back button,
// bottom nav, same as every other student utility page) instead.

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(t('enrollment_status.title', 'Enrollment Status'), t('enrollment_status.subtitle', 'Where you are in the admission process.'), 'student-dashboard.php', null);
}
renderHeaderText();
onLocaleChange(renderHeaderText);

function fetchMyEnrollmentStatus(token) {
  return authedPost('/student_enrollment_workflow_status', token, {});
}

function formatHistoryDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) { return iso; }
}

function statusMetaFor(status) {
  if (status === 'completed') return { label: t('enrollment_status.status_completed', 'Officially enrolled'), cls: 'completed' };
  if (status === 'withdrawn') return { label: t('enrollment_status.status_withdrawn', 'Withdrawn'), cls: 'withdrawn' };
  return { label: t('enrollment_status.status_in_progress', 'In progress'), cls: 'in_progress' };
}

function renderStatus(data) {
  const wrap = document.getElementById('esContent');
  const record = data.record;
  const stages = data.stages || [];
  const isFullyCompleted = record && record.status === 'completed';
  const currentOrder = (record && record.current_stage && record.current_stage.order != null) ? record.current_stage.order : -1;

  if (!data.started) {
    wrap.innerHTML =
      '<div class="list-empty">' +
        '<div class="list-empty-title">' + escapeHtml(t('enrollment_status.not_started_title', 'Not started yet')) + '</div>' +
        '<div class="list-empty-sub">' + escapeHtml(data.message || t('enrollment_status.not_started_message', 'Your enrollment workflow has not been started yet. Please contact the school office.')) + '</div>' +
      '</div>';
    return;
  }

  const currentIndex = isFullyCompleted
    ? stages.length - 1
    : stages.findIndex(s => s.id === (record && record.current_stage_id));
  const progressPct = stages.length > 0 && currentIndex >= 0
    ? Math.round(((currentIndex + 1) / stages.length) * 100)
    : 0;

  const statusMeta = record ? statusMetaFor(record.status) : null;

  let html = '';

  html += '<div class="es-top-row">' +
    (statusMeta ? '<span class="ew-record-status ' + escapeHtml(statusMeta.cls) + '">' + escapeHtml(statusMeta.label) + '</span>' : '<span></span>') +
    (stages.length > 0 && currentIndex >= 0 ? '<span class="es-step-of">' + escapeHtml(t('enrollment_status.step_of', 'Step {current} of {total}').replace('{current}', currentIndex + 1).replace('{total}', stages.length)) + '</span>' : '') +
  '</div>';

  if (stages.length > 0 && currentIndex >= 0) {
    html += '<div class="es-progress-track"><div class="es-progress-fill" style="width:' + progressPct + '%;"></div></div>';
  }

  if (record && record.status === 'in_progress' && record.current_stage) {
    const instructions = (record.current_stage.student_instructions || '').trim();
    html += '<div class="es-action-card">' +
      '<div class="es-action-header-row">' +
        '<span class="es-action-icon-wrap">' + icon('lightbulb', { size: 18, color: 'var(--emerald-deep)' }) + '</span>' +
        '<span style="flex:1;min-width:0;">' +
          '<span class="es-action-pill">' + escapeHtml(record.current_stage.name) + '</span>' +
          '<div class="es-action-heading">' + escapeHtml(t('enrollment_status.what_to_do_now', 'What to do now')) + '</div>' +
        '</span>' +
      '</div>' +
      '<div class="es-action-body">' + escapeHtml(instructions || t('enrollment_status.default_instructions', 'Please contact the school office for next steps.')) + '</div>' +
    '</div>';
  }

  html += '<div class="es-section-label">' + escapeHtml(t('enrollment_status.stages_label', 'Stages')) + '</div><div class="es-stages-card">';
  stages.forEach((stage, idx) => {
    const isDone = isFullyCompleted || stage.order < currentOrder;
    const isCurrent = !isFullyCompleted && record && stage.id === record.current_stage_id;
    const isLast = idx === stages.length - 1;
    html += '<div class="es-step-row' + (isCurrent ? ' current' : '') + '">' +
      '<div class="es-step-icon-col">' +
        '<div class="es-step-dot' + (isDone ? ' done' : (isCurrent ? ' current' : '')) + '">' +
          (isDone ? icon('check', { size: 16, color: '#fff' }) : '<span class="es-step-num' + (isCurrent ? ' current' : '') + '">' + (idx + 1) + '</span>') +
        '</div>' +
        (isLast ? '' : '<div class="es-step-line' + (isDone ? ' done' : '') + '"></div>') +
      '</div>' +
      '<div class="es-step-text-col">' +
        '<div class="es-step-label' + (isDone ? ' done' : '') + (isCurrent ? ' current' : '') + '">' + escapeHtml(stage.name) + '</div>' +
        (isCurrent ? '<div class="es-here-tag"><span class="es-here-dot"></span><span class="es-here-text">' + escapeHtml(t('enrollment_status.you_are_here', 'You are here')) + '</span></div>' : '') +
      '</div>' +
    '</div>';
  });
  html += '</div>';

  const history = data.history || [];
  if (history.length > 0) {
    html += '<div class="es-section-label">' + escapeHtml(t('enrollment_status.history_label', 'History')) + '</div><div class="es-history-card">';
    history.forEach((h, idx) => {
      const line = h.from_stage ? (h.from_stage + ' → ' + h.to_stage) : t('enrollment_status.started_at', 'Started at {stage}').replace('{stage}', h.to_stage);
      html += '<div class="es-history-row' + (idx > 0 ? ' bordered' : '') + '">' +
        icon('clock', { size: 16, color: 'var(--subtle)' }) +
        '<span style="flex:1;margin-left:10px;">' +
          '<div class="es-history-text">' + escapeHtml(line) + '</div>' +
          '<div class="es-history-date">' + escapeHtml(formatHistoryDate(h.changed_at)) + '</div>' +
        '</span>' +
      '</div>';
    });
    html += '</div>';
  }

  wrap.innerHTML = html;
}

let lastStatusData = null;
function load(token) {
  document.getElementById('esContent').innerHTML = '<div class="list-loading">' + escapeHtml(t('common.loading', 'Loading…')) + '</div>';
  fetchMyEnrollmentStatus(token).then(data => {
    lastStatusData = data;
    renderStatus(data);
  }).catch((err) => {
    lastStatusData = null;
    document.getElementById('esContent').innerHTML =
      '<div class="list-error">' + escapeHtml((err && err.message) || t('enrollment_status.load_error', 'Could not load your enrollment status.')) + '<br><button type="button" class="list-retry-btn" id="esRetryBtn">' + escapeHtml(t('common.retry', 'Try again')) + '</button></div>';
    document.getElementById('esRetryBtn')?.addEventListener('click', () => load(token));
  });
}
onLocaleChange(() => { if (lastStatusData) renderStatus(lastStatusData); });

guardDashboard('student', function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  document.getElementById('utilBody').style.display = '';
  document.getElementById('bottomNavWrap').innerHTML = renderBottomNav('student');
  load(token);
});
