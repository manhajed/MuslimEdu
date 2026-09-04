// Scholarship & Taqdim Assistant - student browse
// (ScholarshipController::browseList). Only ever shows `published`
// programs - filtered server-side, same boundary the staff screen draws
// in reverse (scholarship-programs.js shows every status). Education
// level is server-filtered (refetch on chip change, matches EDUCATION_LEVELS
// in scholarship-programs.js exactly so a level picked by staff there is
// findable here); everything else is client-side text search over the
// loaded page, same division of labor as the staff queues.

document.getElementById('searchIcon').innerHTML = icon('search', { size: 17, color: 'var(--subtle)' });

// Mirrors EDUCATION_LEVELS in scholarship-programs.js exactly - a program
// tagged there with one of these levels is filterable here by the same key.
const EDUCATION_LEVELS = ['elementary', 'middle_school', 'high_school', 'undergraduate', 'graduate'];
function levelLabel(l) { return t('scholarship_programs.level_' + l, l.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())); }

let allPrograms = [];
let searchQuery = '';
let levelFilter = '';
let searchTimer = null;
let lastListRendered = false;

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

function renderLevelFilterRow(token) {
  const row = document.getElementById('levelFilterRow');
  const chips = [{ key: '', label: t('scholarship_browse.filter_all', 'All Levels') }]
    .concat(EDUCATION_LEVELS.map(l => ({ key: l, label: levelLabel(l) })));
  row.innerHTML = chips.map(c =>
    '<button type="button" class="filter-chip' + (levelFilter === c.key ? ' active' : '') + '" data-level="' + escapeHtml(c.key) + '">' + escapeHtml(c.label) + '</button>'
  ).join('') +
    '<a href="scholarship-my-applications.php" class="filter-chip" style="margin-left:auto;">' + escapeHtml(t('scholarship_browse.my_applications_chip', 'My Applications →')) + '</a>';
  row.querySelectorAll('button.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      levelFilter = chip.dataset.level;
      renderLevelFilterRow(token);
      reload(token);
    });
  });
}

document.getElementById('searchInput').addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { searchQuery = e.target.value; renderList(getStoredToken()); }, 200);
});

function renderList(token) {
  lastListRendered = true;
  const wrap = document.getElementById('listContent');
  const q = searchQuery.trim().toLowerCase();
  const filtered = q ? allPrograms.filter(p => (p.title || '').toLowerCase().includes(q)) : allPrograms;

  if (allPrograms.length === 0) {
    wrap.innerHTML = '<div class="list-empty"><div class="list-empty-title">' +
      escapeHtml(t('scholarship_browse.no_programs', 'No scholarships are open right now. Check back soon.')) + '</div></div>';
    return;
  }
  if (filtered.length === 0) {
    wrap.innerHTML = '<div class="list-empty"><div class="list-empty-title">' +
      escapeHtml(t('scholarship_browse.no_matches', 'No scholarships match your search.')) + '</div></div>';
    return;
  }

  wrap.innerHTML = '';
  filtered.forEach(p => {
    const providerName = (p.provider && p.provider.name) || '';
    const money = formatMoney(p.coverage_amount, p.currency);
    const deadline = formatDate(p.application_deadline);

    const card = document.createElement('a');
    card.href = 'scholarship-detail.php?program_id=' + p.id;
    card.className = 'list-card';
    card.innerHTML =
      '<span class="list-avatar-wrap"><span class="list-avatar-fallback">' + icon('gradcap', { size: 18, color: '#fff' }) + '</span></span>' +
      '<span class="list-card-body">' +
        '<span class="list-card-name">' + escapeHtml(p.title) + '</span>' +
        '<div class="list-card-meta">' + escapeHtml(providerName) + (p.academic_year ? ' · ' + escapeHtml(p.academic_year) : '') + '</div>' +
        '<div class="chip-row">' +
          (money ? '<span class="mini-chip ok">' + escapeHtml(money) + '</span>' : '') +
          (deadline ? '<span class="mini-chip warn">' + escapeHtml(t('scholarship_browse.deadline_chip', 'Due {date}').replace('{date}', deadline)) + '</span>' : '') +
          (p.scholarship_type ? '<span class="mini-chip ok">' + escapeHtml(p.scholarship_type) + '</span>' : '') +
        '</div>' +
      '</span>' +
      icon('chevron', { size: 18, color: 'var(--subtle)' });
    wrap.appendChild(card);
  });
}
onLocaleChange(() => { if (lastListRendered) { renderLevelFilterRow(getStoredToken()); renderList(getStoredToken()); } });

function appStatusLabel(s) { return t('scholarship_translations.status_' + s, s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())); }
function appStatusChipClass(s) {
  if (s === 'approved') return 'ok';
  if (s === 'submitted' || s === 'under_review' || s === 'draft') return 'warn';
  return 'danger';
}
function openMyApplicationsSheet(token) {
  let backdrop = document.getElementById('myAppsBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'myAppsBackdrop';
    backdrop.className = 'sheet-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.classList.remove('open'); });
  }
  backdrop.innerHTML = '<div class="sheet-panel form"><div class="sheet-handle"></div>' +
    '<div class="sheet-title-row"><span class="sheet-title">' + escapeHtml(t('scholarship_browse.my_applications_title', 'My Applications')) + '</span>' +
      '<button type="button" class="sheet-close-btn" id="maCloseBtn">' + icon('close', { size: 16, color: 'var(--subtle)' }) + '</button></div>' +
    '<div id="maList" class="list-loading">' + escapeHtml(t('common.loading', 'Loading…')) + '</div>' +
  '</div>';
  document.getElementById('maCloseBtn').addEventListener('click', () => backdrop.classList.remove('open'));
  backdrop.classList.add('open');

  fetchMyScholarshipApplications(token).then(apps => {
    const wrap = document.getElementById('maList');
    if (!wrap) return;
    if (apps.length === 0) {
      wrap.className = '';
      wrap.innerHTML = '<div class="util-row"><span class="util-row-title" style="color:var(--subtle);">' + escapeHtml(t('scholarship_browse.no_applications', "You haven't started any applications yet.")) + '</span></div>';
      return;
    }
    wrap.className = 'util-card';
    wrap.innerHTML = apps.map(a =>
      '<a class="util-row" href="scholarship-application.php?application_id=' + a.id + '">' +
        '<span class="util-row-icon">' + icon('clipboard', { size: 15, color: 'var(--ink)' }) + '</span>' +
        '<span class="util-row-title">' + escapeHtml((a.program && a.program.title) || '') + '</span>' +
        '<span class="mini-chip ' + appStatusChipClass(a.status) + '" style="margin-right:6px;">' + escapeHtml(appStatusLabel(a.status)) + '</span>' +
        icon('chevron', { size: 16, color: 'var(--subtle)' }) +
      '</a>'
    ).join('');
  }).catch(() => {
    const wrap = document.getElementById('maList');
    if (wrap) { wrap.className = ''; wrap.innerHTML = '<div class="list-error">' + escapeHtml(t('scholarship_browse.applications_load_failed', 'Could not load your applications.')) + '</div>'; }
  });
}

// ── Boot ──
function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(t('scholarship_browse.title', 'Scholarships'), t('scholarship_browse.subtitle', 'Browse open scholarships and manage your Taqdim applications'), 'student-dashboard.php');
}
renderHeaderText();
onLocaleChange(renderHeaderText);

function reload(token) {
  document.getElementById('listContent').innerHTML = '<div class="list-loading">' + escapeHtml(t('common.loading', 'Loading…')) + '</div>';
  const filters = levelFilter ? { education_level: levelFilter } : {};
  fetchScholarshipBrowseList(token, filters).then(list => {
    allPrograms = list;
    renderList(token);
  }).catch(() => {
    lastListRendered = false;
    document.getElementById('listContent').innerHTML =
      '<div class="list-error">' + escapeHtml(t('scholarship_browse.load_failed', 'Failed to load scholarships.')) + '<br><button type="button" class="list-retry-btn" id="retryBtn">' + escapeHtml(t('common.retry', 'Try again')) + '</button></div>';
    document.getElementById('retryBtn')?.addEventListener('click', () => reload(token));
  });
}

guardDashboard('student', function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  document.getElementById('bottomNavWrap').innerHTML = renderBottomNav('student');
  renderLevelFilterRow(token);
  reload(token);
});
