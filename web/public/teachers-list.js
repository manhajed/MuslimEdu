// "Add Teacher" actually creates an account via
// admin_teacher_admission_single - a 3-step wizard flattened into one
// scrollable form.

document.getElementById('searchIcon').innerHTML = icon('search', { size: 17, color: 'var(--subtle)' });

let allTeachers = [];
let searchQuery = '';
let searchTimer = null;
let lastListRendered = false;

function renderList(token) {
  lastListRendered = true;
  const wrap = document.getElementById('listContent');
  const q = searchQuery.trim().toLowerCase();
  const filtered = q ? allTeachers.filter(t => (t.name || '').toLowerCase().includes(q)) : allTeachers;

  if (filtered.length === 0) {
    wrap.innerHTML =
      '<div class="list-empty"><div class="list-empty-title">' +
      escapeHtml(allTeachers.length === 0 ? t('teachers_list.no_teachers_found', 'No teachers found') : t('staff_list.no_matches', 'No matches for your search')) +
      '</div></div>';
    return;
  }

  wrap.innerHTML = '';
  filtered.forEach(t2 => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'list-card';
    const initial = (t2.name || '?').trim().charAt(0).toUpperCase();
    const active = t2.status === 1 || t2.status === '1';
    const statusColor = active ? 'var(--emerald)' : '#EF4444';
    card.innerHTML =
      '<span class="list-avatar-wrap">' +
        (t2.photo
          ? '<img class="list-avatar" src="' + escapeHtml(absoluteUrl(t2.photo)) + '" alt="" />'
          : '<span class="list-avatar-fallback">' + escapeHtml(initial) + '</span>') +
        '<span class="list-avatar-dot" style="background:' + statusColor + '"></span>' +
      '</span>' +
      '<span class="list-card-body">' +
        '<span class="list-card-name">' + escapeHtml(t2.name || t('teachers_list.unnamed', 'Unnamed teacher')) + '</span>' +
        '<div class="list-card-meta">' + escapeHtml(t2.email || '') + '</div>' +
        '<div class="chip-row">' +
          '<span class="mini-chip ' + (active ? 'ok' : 'danger') + '">' + escapeHtml(active ? t('staff_list.active', 'Active') : t('staff_list.inactive', 'Inactive')) + '</span>' +
          (t2.code ? '<span class="mini-chip ok">' + icon('idcard', { size: 12, color: 'var(--ink)' }) + escapeHtml(t2.code) + '</span>' : '') +
        '</div>' +
      '</span>' +
      icon('chevron', { size: 18, color: 'var(--subtle)' });
    card.addEventListener('click', () => openTeacherActions(t2, token));
    wrap.appendChild(card);
  });
}
onLocaleChange(() => { if (lastListRendered) renderList(getStoredToken()); });

// Same pattern as registrar-list.js's openRegistrarActions/showRegistrarProfile
// - teachers-list used to be built around monthly report-submission tracking
// (status dot = submitted/missing, a nested report sub-item, a "Monthly
// Report" action), which was orphan-school-only functionality that didn't
// belong on the general roster. This now matches every other staff list.
function openTeacherActions(t2, token) {
  openActionSheet(t2.name || t('teachers_list.fallback', 'Teacher'), [
    { icon: 'idcard', label: t('staff_list.profile_label', 'Profile'), desc: t('staff_list.profile_desc', 'View contact info and role details'), onPress: () => showTeacherProfile(t2, token) },
    { icon: 'document', label: t('staff_list.documents_label', 'Documents'), desc: t('staff_list.documents_desc', 'ID, certificates, and other files'), onPress: notWiredYet },
  ]);
}

function showTeacherProfile(t2, token) {
  fetchTeacherProfile(token, t2.id).then(p => {
    const active = t2.status === 1 || t2.status === '1';
    const fields = [
      { icon: 'mail', label: t('staff_list.email_label', 'Email'), value: p.email },
      { icon: 'phone', label: t('staff_list.phone_label', 'Phone'), value: p.phone },
      { icon: 'person', label: t('staff_list.address_label', 'Address'), value: p.address },
      { icon: 'person', label: t('people_profile.gender_label', 'Gender'), value: p.gender },
      { icon: 'gradcap', label: t('people_profile.birthday_label', 'Birthday'), value: p.birthday },
      { icon: 'idcard', label: t('staff_list.staff_code_label', 'Staff Code'), value: p.code },
      { icon: 'idcard', label: t('staff_list.designation_label', 'Designation'), value: p.designation },
      { icon: 'person', label: t('people_profile.emergency_contact_name_label', 'Emergency Contact'), value: p.emergency_contact_name },
      { icon: 'phone', label: t('people_profile.emergency_contact_phone_label', 'Emergency Contact Phone'), value: p.emergency_contact_phone },
    ].filter(f => !!f.value);

    openPersonProfileModal({
      photo: p.photo || t2.photo,
      name: p.name || t2.name,
      statusColor: active ? 'var(--emerald)' : '#EF4444',
      statusLabel: active ? t('staff_list.active', 'Active') : t('staff_list.inactive', 'Inactive'),
      fields,
      canEdit: true,
      onEdit: () => openEditBasicProfileSheet({
        title: t('people_profile.edit_teacher_title', 'Edit Teacher'),
        initial: { name: p.name || t2.name, name_ar: p.name_ar, email: p.email, phone: p.phone, address: p.address, gender: p.gender, birthday: p.birthday, emergency_contact_name: p.emergency_contact_name, emergency_contact_phone: p.emergency_contact_phone },
        onSubmit: (values) => updateTeacherProfile(token, t2.id, values).then(() => {
          showToast(t('people_profile.save_success', 'Profile updated.'));
          load(token);
        }),
      }),
    });
  }).catch(() => showToast(t('teachers_list.profile_load_failed', 'Could not load this teacher’s profile.')));
}

document.getElementById('searchInput').addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { searchQuery = e.target.value; renderList(getStoredToken()); }, 200);
});

function load(token) {
  document.getElementById('listContent').innerHTML = '<div class="list-loading">' + escapeHtml(t('common.loading', 'Loading…')) + '</div>';
  fetchTeacherList(token).then((teachers) => {
    allTeachers = teachers;
    renderList(token);
  }).catch(() => {
    lastListRendered = false;
    document.getElementById('listContent').innerHTML =
      '<div class="list-error">' + escapeHtml(t('teachers_list.load_failed', 'Failed to load teachers.')) + '<br><button type="button" class="list-retry-btn" id="retryBtn">' + escapeHtml(t('common.retry', 'Try again')) + '</button></div>';
    document.getElementById('retryBtn')?.addEventListener('click', () => load(token));
  });
}

// ── Add Teacher form sheet ──
function openAddTeacherSheet(token) {
  let backdrop = document.getElementById('addTeacherBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'addTeacherBackdrop';
    backdrop.className = 'sheet-backdrop';
    backdrop.innerHTML =
      '<div class="sheet-panel form">' +
        '<div class="sheet-handle"></div>' +
        '<div class="sheet-title-row"><span class="sheet-title">' + escapeHtml(t('teachers_list.add_title', 'Add Teacher')) + '</span>' +
          '<button type="button" class="sheet-close-btn" id="addTeacherCloseBtn">' + icon('close', { size: 16, color: 'var(--subtle)' }) + '</button></div>' +
        '<label class="util-label" style="margin-top:0;">' + escapeHtml(t('staff_list.full_name_label', 'Full Name')) + '</label>' +
        '<input type="text" id="atName" class="util-input" placeholder="' + escapeHtml(t('staff_list.full_name_placeholder', 'e.g. Ahmad bin Abdullah')) + '" />' +
        '<label class="util-label">' + escapeHtml(t('staff_list.name_ar_label', 'Arabic Name (optional)')) + '</label>' +
        '<input type="text" id="atNameAr" class="util-input" placeholder="الاسم بالعربية" />' +
        '<label class="util-label">' + escapeHtml(t('staff_list.email_label', 'Email')) + '</label>' +
        '<input type="email" id="atEmail" class="util-input" placeholder="' + escapeHtml(t('teachers_list.email_placeholder', 'teacher@example.com')) + '" autocapitalize="none" />' +
        '<label class="util-label">' + escapeHtml(t('staff_list.password_label', 'Password')) + '</label>' +
        '<input type="password" id="atPassword" class="util-input" placeholder="' + escapeHtml(t('staff_list.password_placeholder', 'At least 6 characters')) + '" />' +
        '<label class="util-label">' + escapeHtml(t('staff_list.phone_field_label', 'Phone (optional)')) + '</label>' +
        '<input type="tel" id="atPhone" class="util-input" placeholder="' + escapeHtml(t('staff_list.phone_placeholder', 'e.g. 012-345 6789')) + '" />' +
        '<label class="util-label">' + escapeHtml(t('staff_list.emergency_name_label', 'Emergency Contact Name (optional)')) + '</label>' +
        '<input type="text" id="atEmergencyName" class="util-input" placeholder="' + escapeHtml(t('staff_list.emergency_name_placeholder', 'e.g. Fatimah binti Ahmad')) + '" />' +
        '<label class="util-label">' + escapeHtml(t('staff_list.emergency_phone_label', 'Emergency Contact Phone (optional)')) + '</label>' +
        '<input type="tel" id="atEmergencyPhone" class="util-input" placeholder="' + escapeHtml(t('staff_list.phone_placeholder', 'e.g. 012-345 6789')) + '" />' +
        '<div class="sheet-form-actions">' +
          '<button type="button" class="sheet-btn-secondary" id="atCancelBtn">' + escapeHtml(t('common.cancel', 'Cancel')) + '</button>' +
          '<button type="button" class="sheet-btn-primary" id="atSubmitBtn"><span id="atSubmitLabel">' + escapeHtml(t('teachers_list.add_title', 'Add Teacher')) + '</span></button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) closeAddTeacherSheet(); });
    document.getElementById('addTeacherCloseBtn').addEventListener('click', closeAddTeacherSheet);
    document.getElementById('atCancelBtn').addEventListener('click', closeAddTeacherSheet);
    document.getElementById('atSubmitBtn').addEventListener('click', () => submitAddTeacher(token));
  }
  ['atName', 'atNameAr', 'atEmail', 'atPassword', 'atPhone', 'atEmergencyName', 'atEmergencyPhone'].forEach(id => {
    document.getElementById(id).value = '';
  });
  backdrop.classList.add('open');
}
function closeAddTeacherSheet() {
  document.getElementById('addTeacherBackdrop')?.classList.remove('open');
}
function submitAddTeacher(token) {
  const name = document.getElementById('atName').value.trim();
  const email = document.getElementById('atEmail').value.trim();
  const password = document.getElementById('atPassword').value.trim();

  if (!name) { showToast(t('staff_list.full_name_required', 'Full name is required.')); return; }
  if (!email || !password) { showToast(t('staff_list.required_fields', 'Name, email, and password are required.')); return; }
  if (password.length < 6) { showToast(t('staff_list.password_too_short', 'Password must be at least 6 characters.')); return; }

  const btn = document.getElementById('atSubmitBtn');
  const label = document.getElementById('atSubmitLabel');
  btn.disabled = true;
  label.innerHTML = '<span class="util-spinner"></span>';

  addTeacher(token, {
    name,
    name_ar: document.getElementById('atNameAr').value.trim() || undefined,
    email,
    password,
    phone: document.getElementById('atPhone').value.trim() || undefined,
    emergency_contact_name: document.getElementById('atEmergencyName').value.trim() || undefined,
    emergency_contact_phone: document.getElementById('atEmergencyPhone').value.trim() || undefined,
  }).then((created) => {
    closeAddTeacherSheet();
    const codeMsg = created && created.code ? ' ' + t('staff_list.staff_code_suffix', 'Staff code: {code}').replace('{code}', created.code) : '';
    showToast(t('staff_list.login_success_suffix', '{name} can now log in with the email and password you set.').replace('{name}', name) + codeMsg);
    load(token);
    notifySetupItemSaved(token);
  }).catch((err) => {
    showToast(err && err.message ? err.message : t('teachers_list.add_failed', 'Could not add teacher.'));
  }).finally(() => {
    btn.disabled = false;
    label.textContent = t('teachers_list.add_title', 'Add Teacher');
  });
}

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(t('teachers_list.title', 'Teachers'), t('teachers_list.subtitle', 'Search teachers and manage their accounts.'), 'admin-dashboard.php', {
      label: t('staff_list.add_action', '+ Add'), onClick: () => openAddTeacherSheet(getStoredToken()),
    });
}
renderHeaderText();
onLocaleChange(renderHeaderText);

guardDashboard('admin', function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  load(token);
});
