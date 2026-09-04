// Admin: Alumni (People group) - the full roster (any status), unlike
// alumni-applications.js which is the pending-only review queue. Both
// pages read the same admin_alumni_registration_list endpoint
// (fetchPendingAlumniRegistrations in dashboard.js - the name is a
// holdover from when only the pending queue existed; the endpoint itself
// has never filtered by status) and just slice it differently. No "Add"
// here - alumni accounts only come from the self-service signup, reviewed
// on the Applications page.

document.getElementById('searchIcon').innerHTML = icon('search', { size: 17, color: 'var(--subtle)' });

function statusMeta() {
  return {
    approved: { chip: 'ok', label: t('alumni_list.status_approved', 'Approved') },
    pending: { chip: 'warn', label: t('alumni_list.status_pending', 'Pending review') },
    rejected: { chip: 'danger', label: t('alumni_list.status_rejected', 'Rejected') },
  };
}

let allAlumni = [];
let searchQuery = '';
let searchTimer = null;
let statusFilter = 'all';
let lastListRendered = false;

function formatDate(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso || '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function renderFilterChips() {
  const options = [
    { key: 'all', label: t('alumni_list.filter_all', 'All') },
    { key: 'approved', label: t('alumni_list.status_approved', 'Approved') },
    { key: 'pending', label: t('alumni_list.filter_pending', 'Pending') },
    { key: 'rejected', label: t('alumni_list.status_rejected', 'Rejected') },
  ];
  document.getElementById('statusFilterRow').innerHTML = options.map(o =>
    '<button type="button" class="filter-chip' + (statusFilter === o.key ? ' active' : '') + '" data-status="' + o.key + '">' + escapeHtml(o.label) + '</button>'
  ).join('');
  document.querySelectorAll('#statusFilterRow .filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      statusFilter = btn.dataset.status;
      renderFilterChips();
      renderList();
    });
  });
}

function renderList() {
  lastListRendered = true;
  const wrap = document.getElementById('listContent');
  const meta = statusMeta();
  const q = searchQuery.trim().toLowerCase();
  const filtered = allAlumni.filter(a => {
    const matchesQuery = !q || (a.name || '').toLowerCase().includes(q) || (a.email || '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  if (filtered.length === 0) {
    wrap.innerHTML =
      '<div class="list-empty"><div class="list-empty-title">' +
      escapeHtml(allAlumni.length === 0 ? t('alumni_list.no_alumni_yet', 'No alumni yet') : t('alumni_list.no_matches', 'No matches')) +
      '</div></div>';
    return;
  }

  wrap.innerHTML = '';
  filtered.forEach(a => {
    const m = meta[a.status] || meta.pending;
    const initial = (a.name || '?').trim().charAt(0).toUpperCase();
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'list-card';
    card.innerHTML =
      '<span class="list-avatar-fallback">' + escapeHtml(initial) + '</span>' +
      '<span class="list-card-body">' +
        '<span class="list-card-name">' + escapeHtml(a.name || t('alumni_list.unnamed', 'Unnamed alumnus')) + '</span>' +
        '<div class="list-card-meta">' + escapeHtml(a.email || '') + '</div>' +
        '<div class="chip-row">' +
          '<span class="mini-chip ' + m.chip + '">' + escapeHtml(m.label) + '</span>' +
          (a.graduation_year ? '<span class="mini-chip ok">' + icon('gradcap', { size: 12, color: 'var(--ink)' }) + escapeHtml(t('alumni_list.class_of', 'Class of {year}').replace('{year}', a.graduation_year)) + '</span>' : '') +
        '</div>' +
      '</span>' +
      icon('chevron', { size: 18, color: 'var(--subtle)' });
    card.addEventListener('click', () => openAlumniActions(a));
    wrap.appendChild(card);
  });
}
onLocaleChange(() => { renderFilterChips(); if (lastListRendered) renderList(); });

// View-only, and sourced entirely from the already-fetched list row -
// there is no single-alumnus profile endpoint on the backend (alumni
// accounts only ever come from the self-service signup form, never an
// admin admission flow, so there was never a reason to build one).
function openAlumniActions(a) {
  openActionSheet(a.name || t('alumni_list.fallback', 'Alumnus'), [
    { icon: 'idcard', label: t('staff_list.profile_label', 'Profile'), desc: t('alumni_list.profile_desc', 'View contact info and application details'), onPress: () => showAlumniProfile(a) },
    ...(a.status === 'pending' ? [{
      icon: 'document', label: t('alumni_list.review_action', 'Review this application'), desc: t('alumni_list.review_desc', 'Approve or reject on the Applications page'),
      onPress: () => { window.location.href = 'alumni-applications.php'; },
    }] : []),
  ]);
}

function showAlumniProfile(a) {
  const meta = statusMeta();
  const m = meta[a.status] || meta.pending;
  const dotColor = { approved: 'var(--emerald)', pending: '#D97706', rejected: '#EF4444' }[a.status] || '#D97706';
  const fields = [
    { icon: 'mail', label: t('staff_list.email_label', 'Email'), value: a.email },
    { icon: 'phone', label: t('staff_list.phone_label', 'Phone'), value: a.phone },
    { icon: 'gradcap', label: t('alumni_list.graduation_year_label', 'Graduation Year'), value: a.graduation_year },
    { icon: 'book', label: t('alumni_list.program_label', 'Program / Degree'), value: a.program },
    { icon: 'document', label: t('alumni_list.notes_label', 'Notes'), value: a.notes },
    { icon: 'calendar', label: t('alumni_list.applied_label', 'Applied'), value: formatDate(a.created_at) },
  ].filter(f => !!f.value);

  openPersonProfileModal({
    photo: a.photo,
    name: a.name || t('alumni_list.fallback', 'Alumnus'),
    statusColor: dotColor,
    statusLabel: m.label,
    fields,
    canEdit: false,
  });
}

document.getElementById('searchInput').addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { searchQuery = e.target.value; renderList(); }, 200);
});

function load(token) {
  document.getElementById('listContent').innerHTML = '<div class="list-loading">' + escapeHtml(t('common.loading', 'Loading…')) + '</div>';
  fetchPendingAlumniRegistrations(token).then((rows) => {
    allAlumni = rows;
    renderList();
  }).catch(() => {
    lastListRendered = false;
    document.getElementById('listContent').innerHTML =
      '<div class="list-error">' + escapeHtml(t('alumni_list.load_failed', 'Failed to load alumni.')) + '<br><button type="button" class="list-retry-btn" id="retryBtn">' + escapeHtml(t('common.retry', 'Try again')) + '</button></div>';
    document.getElementById('retryBtn')?.addEventListener('click', () => load(token));
  });
}

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(t('alumni_list.title', 'Alumni'), t('alumni_list.subtitle', 'Every alumni signup for this school, at any stage.'), 'admin-dashboard.php', null);
}
renderHeaderText();
onLocaleChange(renderHeaderText);

renderFilterChips();

guardDashboard('admin', function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  load(token);
});
