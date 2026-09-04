// Profile shows the fields already in the list row rather than a
// separate detail fetch. Documents/Report/Add open real sub-screens that
// don't exist on the web yet, so they toast.

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(t('students_list.title', 'Students'), t('students_list.subtitle', 'Search and manage every student in your school.'), 'admin-dashboard.php', { label: t('staff_list.add_action', '+ Add'), onClick: notWiredYet });
}
renderHeaderText();
document.getElementById('filterIcon').innerHTML = icon('filter', { size: 15, color: 'var(--ink)' });
document.getElementById('searchIcon').innerHTML = icon('search', { size: 17, color: 'var(--subtle)' });

function statusMeta() {
  return {
    active: { color: 'var(--ink)', soft: 'var(--emerald-soft)', label: t('staff_list.active', 'Active') },
    pending: { color: '#D97706', soft: 'rgba(217,119,6,0.12)', label: t('students_list.pending', 'Pending') },
    inactive: { color: '#EF4444', soft: 'rgba(239,68,68,0.1)', label: t('staff_list.inactive', 'Inactive') },
  };
}

let allStudents = [];
let statusFilter = 'all';
let searchQuery = '';
let searchTimer = null;
let lastListRendered = false;

function formatJoined(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function renderList(token) {
  lastListRendered = true;
  const wrap = document.getElementById('listContent');
  const meta = statusMeta();
  const filtered = allStudents.filter(s => {
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery = !q || s.name.toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || (s.status || 'active') === statusFilter;
    return matchesQuery && matchesStatus;
  });

  if (filtered.length === 0) {
    wrap.innerHTML =
      '<div class="list-empty">' +
        '<div class="list-empty-title">' + escapeHtml(allStudents.length === 0 ? t('students_list.no_students_found', 'No students found') : t('staff_list.no_matches', 'No matches for your search')) + '</div>' +
      '</div>';
    return;
  }

  wrap.innerHTML = '';
  filtered.forEach(s => {
    const m = meta[s.status || 'active'] || meta.active;
    const joined = formatJoined(s.joined_date);
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'list-card';
    const initial = (s.name || '?').trim().charAt(0).toUpperCase();
    card.innerHTML =
      '<span class="list-avatar-wrap">' +
        (s.photo
          ? '<img class="list-avatar" src="' + escapeHtml(absoluteUrl(s.photo)) + '" alt="" />'
          : '<span class="list-avatar-fallback">' + escapeHtml(initial) + '</span>') +
        '<span class="list-avatar-dot" style="background:' + m.color + '"></span>' +
      '</span>' +
      '<span class="list-card-body">' +
        '<span class="list-card-name">' + escapeHtml(s.name) + '</span>' +
        '<div class="list-card-meta">' + escapeHtml(s.email || '') + '</div>' +
        '<div class="chip-row">' +
          (s.section_name
            ? '<span class="mini-chip ok">' + icon('layers', { size: 12, color: 'var(--ink)' }) + escapeHtml([s.class_name, s.section_name].filter(Boolean).join(' - ')) + (s.room_number ? ' · ' + escapeHtml(t('students_list.room_prefix', 'Room {n}').replace('{n}', s.room_number)) : '') + '</span>'
            : '<span class="mini-chip warn">' + icon('warning', { size: 12, color: '#D97706' }) + escapeHtml(t('students_list.not_placed', 'Not placed in a section')) + '</span>') +
          (joined ? '<span class="mini-chip ok">' + icon('calendar', { size: 12, color: 'var(--ink)' }) + escapeHtml(t('students_list.joined_prefix', 'Joined {date}').replace('{date}', joined)) + '</span>' : '') +
        '</div>' +
      '</span>' +
      icon('chevron', { size: 18, color: 'var(--subtle)' });
    card.addEventListener('click', () => openStudentActions(s, token));
    wrap.appendChild(card);
  });
}
onLocaleChange(() => { if (lastListRendered) renderList(getStoredToken()); });

function openStudentActions(s, token) {
  openActionSheet(s.name, [
    {
      icon: 'idcard', label: t('staff_list.profile_label', 'Profile'), desc: t('students_list.profile_desc', 'View contact info and enrollment details'),
      onPress: () => showStudentProfile(s, token),
    },
    { icon: 'document', label: t('staff_list.documents_label', 'Documents'), desc: t('staff_list.documents_desc', 'ID, certificates, and other files'), onPress: notWiredYet },
  ]);
}

// Full detail sheet (openPersonProfileModal) - row data (fetchStudents)
// already carries class/room/adviser/joined/status, but not phone/
// address/gender/birthday/emergency contact, so this fetches the single-
// record profile (fetchChildProfile) and merges both, same as
// ChildProfileSheet.tsx being handed an already-fetched ChildProfile.
function showStudentProfile(s, token) {
  fetchChildProfile(token, s.id).then(p => renderStudentProfileModal(s, p, token))
    .catch(() => showToast(t('students_list.profile_load_failed', 'Could not load this student’s profile.')));
}

const STATUS_DOT_COLOR = { active: 'var(--emerald)', pending: '#D97706', inactive: '#EF4444' };

function renderStudentProfileModal(s, p, token) {
  const meta = statusMeta();
  const m = meta[s.status || 'active'] || meta.active;
  const fields = [
    { icon: 'mail', label: t('staff_list.email_label', 'Email'), value: p.email || s.email },
    { icon: 'phone', label: t('staff_list.phone_label', 'Phone'), value: p.phone },
    { icon: 'person', label: t('staff_list.address_label', 'Address'), value: p.address },
    { icon: 'person', label: t('people_profile.gender_label', 'Gender'), value: p.gender },
    { icon: 'gradcap', label: t('people_profile.birthday_label', 'Birthday'), value: p.birthday },
    { icon: 'idcard', label: t('students_list.student_code_label', 'Student Code'), value: p.code || s.code },
    { icon: 'layers', label: t('students_list.class_label', 'Class'), value: s.class_name && s.section_name ? s.class_name + ' - ' + s.section_name : null },
    { icon: 'idcard', label: t('students_list.room_label', 'Room'), value: s.room_number },
    { icon: 'calendar', label: t('students_list.joined_label', 'Joined'), value: formatJoined(s.joined_date) },
    { icon: 'person', label: t('students_list.adviser_label', 'Adviser'), value: s.adviser_name },
    { icon: 'idcard', label: t('students_list.orphan_id_label', 'Orphan ID'), value: (p.orphan_profile && p.orphan_profile.orphan_id_number) || s.orphan_id_number },
    { icon: 'person', label: t('people_profile.emergency_contact_name_label', 'Emergency Contact'), value: p.emergency_contact_name },
    { icon: 'phone', label: t('people_profile.emergency_contact_phone_label', 'Emergency Contact Phone'), value: p.emergency_contact_phone },
  ].filter(f => !!f.value);

  openPersonProfileModal({
    photo: p.photo || s.photo,
    name: p.name || s.name,
    statusColor: STATUS_DOT_COLOR[s.status || 'active'],
    statusLabel: m.label,
    fields,
    canEdit: true,
    onEdit: () => openEditBasicProfileSheet({
      title: t('people_profile.edit_student_title', 'Edit Student'),
      initial: { name: p.name || s.name, name_ar: p.name_ar, email: p.email || s.email, phone: p.phone, address: p.address, gender: p.gender, birthday: p.birthday, emergency_contact_name: p.emergency_contact_name, emergency_contact_phone: p.emergency_contact_phone },
      onSubmit: (values) => updateStudentProfile(token, s.id, values).then(() => {
        showToast(t('people_profile.save_success', 'Profile updated.'));
        load(token);
      }),
    }),
    onViewReport: () => {
      showToast(t('people_profile.report_generating', 'Generating report link…'));
      fetchStudentReportLink(token, s.id).then(res => {
        if (res && res.url) window.open(res.url, '_blank');
      }).catch(() => showToast(t('people_profile.report_link_failed', 'Could not generate the report link.')));
    },
  });
}

document.getElementById('searchInput').addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchQuery = e.target.value;
    renderList(getStoredToken());
  }, 200);
});

document.getElementById('filterBtn').addEventListener('click', () => {
  const opts = [
    { key: 'all', label: t('students_list.filter_all', 'All students') },
    { key: 'active', label: t('staff_list.active', 'Active') },
    { key: 'pending', label: t('students_list.pending', 'Pending') },
    { key: 'inactive', label: t('staff_list.inactive', 'Inactive') },
  ];
  openOptionSheet(t('students_list.filter_title', 'Filter'), opts, statusFilter, (key) => {
    statusFilter = key;
    document.getElementById('filterBtn').classList.toggle('active', key !== 'all');
    renderList(getStoredToken());
    return Promise.resolve();
  });
});

onLocaleChange(renderHeaderText);

// Named (not inline in guardDashboard) so an Edit save can re-pull the
// list afterward without a full page reload - same pattern teachers-
// list.js already uses.
function load(token) {
  document.getElementById('listContent').innerHTML = '<div class="list-loading">' + escapeHtml(t('common.loading', 'Loading…')) + '</div>';
  fetchStudents(token).then((students) => {
    allStudents = students;
    renderList(token);
  }).catch(() => {
    lastListRendered = false;
    document.getElementById('listContent').innerHTML =
      '<div class="list-error">' + escapeHtml(t('students_list.load_failed', 'Failed to load students.')) + '<br><button type="button" class="list-retry-btn" id="retryBtn">' + escapeHtml(t('common.retry', 'Try again')) + '</button></div>';
    document.getElementById('retryBtn')?.addEventListener('click', () => load(token));
  });
}

guardDashboard('admin', function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  load(token);
});
