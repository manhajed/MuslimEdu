// Scholarship & Taqdim Assistant - student application status tracker,
// as its own page (previously only a quick sheet inside
// scholarship-browse.js, which still links here now instead of opening
// that sheet). Lists every application the student has ever started,
// each with a lightweight progress readout built from timestamps already
// on ScholarshipApplication (submitted_at/decided_at/withdrawn_at) rather
// than fetching each one's full status history individually -
// applicationList() doesn't eager-load statusHistory, and doing that
// per-row here would be an N+1 fetch for what's meant to be a fast
// overview; the full timeline is one tap away via scholarship-
// application.js already.

const APPLICATION_STATUSES = ['draft', 'submitted', 'under_review', 'missing_documents', 'approved', 'rejected', 'withdrawn'];
function appStatusLabel(s) { return t('scholarship_translations.status_' + s, s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())); }
function appStatusChipClass(s) {
  if (s === 'approved') return 'ok';
  if (s === 'submitted' || s === 'under_review' || s === 'draft') return 'warn';
  return 'danger';
}

let allApplications = [];
let statusFilter = '';

function formatDate(d) {
  if (!d) return null;
  try { return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch (e) { return d; }
}

function renderStatusFilterRow(token) {
  const row = document.getElementById('statusFilterRow');
  const chips = [{ key: '', label: t('scholarship_my_applications.filter_all', 'All') }]
    .concat(APPLICATION_STATUSES.map(s => ({ key: s, label: appStatusLabel(s) })));
  row.innerHTML = chips.map(c =>
    '<button type="button" class="filter-chip' + (statusFilter === c.key ? ' active' : '') + '" data-status="' + escapeHtml(c.key) + '">' + escapeHtml(c.label) + '</button>'
  ).join('');
  row.querySelectorAll('button.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      statusFilter = chip.dataset.status;
      renderStatusFilterRow(token);
      renderList();
    });
  });
}

// A short "what's happened so far" line built from timestamps already on
// the list payload - not a full timeline (see file header comment), just
// enough to read the application's progress at a glance.
function progressLine(app) {
  const parts = [];
  if (app.created_at) parts.push(t('scholarship_my_applications.started_on', 'Started {date}').replace('{date}', formatDate(app.created_at)));
  if (app.submitted_at) parts.push(t('scholarship_my_applications.submitted_on', 'Submitted {date}').replace('{date}', formatDate(app.submitted_at)));
  if (app.withdrawn_at) parts.push(t('scholarship_my_applications.withdrawn_on', 'Withdrawn {date}').replace('{date}', formatDate(app.withdrawn_at)));
  else if (app.decided_at) parts.push(t('scholarship_my_applications.decided_on', 'Decided {date}').replace('{date}', formatDate(app.decided_at)));
  return parts.join(' · ');
}

function renderList() {
  const wrap = document.getElementById('listContent');
  const filtered = statusFilter ? allApplications.filter(a => a.status === statusFilter) : allApplications;

  if (allApplications.length === 0) {
    wrap.innerHTML = '<div class="list-empty"><div class="list-empty-title">' +
      escapeHtml(t('scholarship_my_applications.no_applications', "You haven't started any scholarship applications yet.")) + '</div></div>';
    return;
  }
  if (filtered.length === 0) {
    wrap.innerHTML = '<div class="list-empty"><div class="list-empty-title">' +
      escapeHtml(t('scholarship_my_applications.no_matches', 'No applications match this filter.')) + '</div></div>';
    return;
  }

  wrap.innerHTML = '';
  filtered.forEach(a => {
    const card = document.createElement('a');
    card.href = 'scholarship-application.php?application_id=' + a.id;
    card.className = 'list-card';
    card.innerHTML =
      '<span class="list-avatar-wrap"><span class="list-avatar-fallback">' + icon('gradcap', { size: 18, color: '#fff' }) + '</span></span>' +
      '<span class="list-card-body">' +
        '<span class="list-card-name">' + escapeHtml((a.program && a.program.title) || '') + '</span>' +
        '<div class="list-card-meta">' + escapeHtml(progressLine(a)) + '</div>' +
        '<div class="chip-row">' +
          '<span class="mini-chip ' + appStatusChipClass(a.status) + '">' + escapeHtml(appStatusLabel(a.status)) + '</span>' +
          (a.reference_no ? '<span class="mini-chip ok">' + escapeHtml(a.reference_no) + '</span>' : '') +
        '</div>' +
      '</span>' +
      icon('chevron', { size: 18, color: 'var(--subtle)' });
    wrap.appendChild(card);
  });
}
onLocaleChange(() => { renderStatusFilterRow(getStoredToken()); renderList(); });

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(t('scholarship_my_applications.title', 'My Applications'), t('scholarship_my_applications.subtitle', 'Track the status of every scholarship you have applied to'), 'scholarship-browse.php');
}
renderHeaderText();
onLocaleChange(renderHeaderText);

guardDashboard('student', function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  document.getElementById('bottomNavWrap').innerHTML = renderBottomNav('student');
  renderStatusFilterRow(token);
  document.getElementById('listContent').innerHTML = '<div class="list-loading">' + escapeHtml(t('common.loading', 'Loading…')) + '</div>';
  fetchMyScholarshipApplications(token).then(list => {
    allApplications = list;
    renderList();
  }).catch(() => {
    document.getElementById('listContent').innerHTML = '<div class="list-error">' + escapeHtml(t('scholarship_my_applications.load_failed', 'Could not load your applications.')) + '</div>';
  });
});
