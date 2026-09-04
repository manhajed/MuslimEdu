// Admin: Registrars (People group) - same pattern as cashier-list.js /
// teachers-list.js, backed by the registrar endpoints
// (fetchRegistrarAccounts/addRegistrar, dashboard.js). "Add Registrar"
// creates a real account via admin_registrar_admission_single.

document.getElementById('searchIcon').innerHTML = icon('search', { size: 17, color: 'var(--subtle)' });

let allRegistrars = [];
let searchQuery = '';
let searchTimer = null;
let lastListRendered = false;

function renderList(token) {
  lastListRendered = true;
  const wrap = document.getElementById('listContent');
  const q = searchQuery.trim().toLowerCase();
  const filtered = q ? allRegistrars.filter(r => (r.name || '').toLowerCase().includes(q)) : allRegistrars;

  if (filtered.length === 0) {
    wrap.innerHTML =
      '<div class="list-empty"><div class="list-empty-title">' +
      escapeHtml(allRegistrars.length === 0 ? t('registrar_list.no_registrars_found', 'No registrars found') : t('staff_list.no_matches', 'No matches for your search')) +
      '</div></div>';
    return;
  }

  wrap.innerHTML = '';
  filtered.forEach(r => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'list-card';
    const initial = (r.name || '?').trim().charAt(0).toUpperCase();
    const active = r.status === 1 || r.status === '1';
    const statusColor = active ? 'var(--emerald)' : '#EF4444';
    card.innerHTML =
      '<span class="list-avatar-wrap">' +
        (r.photo
          ? '<img class="list-avatar" src="' + escapeHtml(absoluteUrl(r.photo)) + '" alt="" />'
          : '<span class="list-avatar-fallback">' + escapeHtml(initial) + '</span>') +
        '<span class="list-avatar-dot" style="background:' + statusColor + '"></span>' +
      '</span>' +
      '<span class="list-card-body">' +
        '<span class="list-card-name">' + escapeHtml(r.name || t('registrar_list.unnamed', 'Unnamed registrar')) + '</span>' +
        '<div class="list-card-meta">' + escapeHtml(r.email || '') + '</div>' +
        '<div class="chip-row">' +
          '<span class="mini-chip ' + (active ? 'ok' : 'danger') + '">' + escapeHtml(active ? t('staff_list.active', 'Active') : t('staff_list.inactive', 'Inactive')) + '</span>' +
          (r.code ? '<span class="mini-chip ok">' + icon('idcard', { size: 12, color: 'var(--ink)' }) + escapeHtml(r.code) + '</span>' : '') +
        '</div>' +
      '</span>' +
      icon('chevron', { size: 18, color: 'var(--subtle)' });
    card.addEventListener('click', () => openRegistrarActions(r, token));
    wrap.appendChild(card);
  });
}
onLocaleChange(() => { if (lastListRendered) renderList(getStoredToken()); });

function openRegistrarActions(r, token) {
  openActionSheet(r.name || t('registrar_list.fallback', 'Registrar'), [
    { icon: 'idcard', label: t('staff_list.profile_label', 'Profile'), desc: t('staff_list.profile_desc', 'View contact info and role details'), onPress: () => showRegistrarProfile(r, token) },
    { icon: 'document', label: t('staff_list.documents_label', 'Documents'), desc: t('staff_list.documents_desc', 'ID, certificates, and other files'), onPress: notWiredYet },
  ]);
}

// View-only: unlike students/teachers/cashiers, there is no
// admin_registrar_profile_update endpoint on the backend yet, so this
// modal never gets an Edit button (canEdit stays false) until that gap
// is filled server-side.
function showRegistrarProfile(r, token) {
  fetchRegistrarProfile(token, r.id).then(p => {
    const active = r.status === 1 || r.status === '1';
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
      photo: p.photo || r.photo,
      name: p.name || r.name,
      statusColor: active ? 'var(--emerald)' : '#EF4444',
      statusLabel: active ? t('staff_list.active', 'Active') : t('staff_list.inactive', 'Inactive'),
      fields,
      canEdit: false,
    });
  }).catch(() => showToast(t('registrar_list.profile_load_failed', 'Could not load this registrar’s profile.')));
}

document.getElementById('searchInput').addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { searchQuery = e.target.value; renderList(getStoredToken()); }, 200);
});

function load(token) {
  document.getElementById('listContent').innerHTML = '<div class="list-loading">' + escapeHtml(t('common.loading', 'Loading…')) + '</div>';
  fetchRegistrarAccounts(token).then((registrars) => {
    allRegistrars = registrars;
    renderList(token);
  }).catch(() => {
    lastListRendered = false;
    document.getElementById('listContent').innerHTML =
      '<div class="list-error">' + escapeHtml(t('registrar_list.load_failed', 'Failed to load registrars.')) + '<br><button type="button" class="list-retry-btn" id="retryBtn">' + escapeHtml(t('common.retry', 'Try again')) + '</button></div>';
    document.getElementById('retryBtn')?.addEventListener('click', () => load(token));
  });
}

// ── Add Registrar form sheet ──
function openAddRegistrarSheet(token) {
  let backdrop = document.getElementById('addRegistrarBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'addRegistrarBackdrop';
    backdrop.className = 'sheet-backdrop';
    backdrop.innerHTML =
      '<div class="sheet-panel form">' +
        '<div class="sheet-handle"></div>' +
        '<div class="sheet-title-row"><span class="sheet-title">' + escapeHtml(t('registrar_list.add_title', 'Add Registrar')) + '</span>' +
          '<button type="button" class="sheet-close-btn" id="arCloseBtn">' + icon('close', { size: 16, color: 'var(--subtle)' }) + '</button></div>' +
        '<label class="util-label" style="margin-top:0;">' + escapeHtml(t('staff_list.full_name_label', 'Full Name')) + '</label>' +
        '<input type="text" id="arName" class="util-input" placeholder="' + escapeHtml(t('staff_list.full_name_placeholder', 'e.g. Ahmad bin Abdullah')) + '" />' +
        '<label class="util-label">' + escapeHtml(t('staff_list.name_ar_label', 'Arabic Name (optional)')) + '</label>' +
        '<input type="text" id="arNameAr" class="util-input" placeholder="الاسم بالعربية" />' +
        '<label class="util-label">' + escapeHtml(t('staff_list.email_label', 'Email')) + '</label>' +
        '<input type="email" id="arEmail" class="util-input" placeholder="' + escapeHtml(t('registrar_list.email_placeholder', 'registrar@example.com')) + '" autocapitalize="none" />' +
        '<label class="util-label">' + escapeHtml(t('staff_list.password_label', 'Password')) + '</label>' +
        '<input type="password" id="arPassword" class="util-input" placeholder="' + escapeHtml(t('staff_list.password_placeholder', 'At least 6 characters')) + '" />' +
        '<label class="util-label">' + escapeHtml(t('staff_list.phone_field_label', 'Phone (optional)')) + '</label>' +
        '<input type="tel" id="arPhone" class="util-input" placeholder="' + escapeHtml(t('staff_list.phone_placeholder', 'e.g. 012-345 6789')) + '" />' +
        '<label class="util-label">' + escapeHtml(t('staff_list.emergency_name_label', 'Emergency Contact Name (optional)')) + '</label>' +
        '<input type="text" id="arEmergencyName" class="util-input" placeholder="' + escapeHtml(t('staff_list.emergency_name_placeholder', 'e.g. Fatimah binti Ahmad')) + '" />' +
        '<label class="util-label">' + escapeHtml(t('staff_list.emergency_phone_label', 'Emergency Contact Phone (optional)')) + '</label>' +
        '<input type="tel" id="arEmergencyPhone" class="util-input" placeholder="' + escapeHtml(t('staff_list.phone_placeholder', 'e.g. 012-345 6789')) + '" />' +
        '<div class="sheet-form-actions">' +
          '<button type="button" class="sheet-btn-secondary" id="arCancelBtn">' + escapeHtml(t('common.cancel', 'Cancel')) + '</button>' +
          '<button type="button" class="sheet-btn-primary" id="arSubmitBtn"><span id="arSubmitLabel">' + escapeHtml(t('registrar_list.add_title', 'Add Registrar')) + '</span></button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) closeAddRegistrarSheet(); });
    document.getElementById('arCloseBtn').addEventListener('click', closeAddRegistrarSheet);
    document.getElementById('arCancelBtn').addEventListener('click', closeAddRegistrarSheet);
    document.getElementById('arSubmitBtn').addEventListener('click', () => submitAddRegistrar(token));
  }
  ['arName', 'arNameAr', 'arEmail', 'arPassword', 'arPhone', 'arEmergencyName', 'arEmergencyPhone'].forEach(id => {
    document.getElementById(id).value = '';
  });
  backdrop.classList.add('open');
}
function closeAddRegistrarSheet() {
  document.getElementById('addRegistrarBackdrop')?.classList.remove('open');
}
function submitAddRegistrar(token) {
  const name = document.getElementById('arName').value.trim();
  const email = document.getElementById('arEmail').value.trim();
  const password = document.getElementById('arPassword').value.trim();

  if (!name) { showToast(t('staff_list.full_name_required', 'Full name is required.')); return; }
  if (!email || !password) { showToast(t('staff_list.required_fields', 'Name, email, and password are required.')); return; }
  if (password.length < 6) { showToast(t('staff_list.password_too_short', 'Password must be at least 6 characters.')); return; }

  const btn = document.getElementById('arSubmitBtn');
  const label = document.getElementById('arSubmitLabel');
  btn.disabled = true;
  label.innerHTML = '<span class="util-spinner"></span>';

  addRegistrar(token, {
    name,
    name_ar: document.getElementById('arNameAr').value.trim() || undefined,
    email,
    password,
    phone: document.getElementById('arPhone').value.trim() || undefined,
    emergency_contact_name: document.getElementById('arEmergencyName').value.trim() || undefined,
    emergency_contact_phone: document.getElementById('arEmergencyPhone').value.trim() || undefined,
  }).then((created) => {
    closeAddRegistrarSheet();
    const codeMsg = created && created.code ? ' ' + t('staff_list.staff_code_suffix', 'Staff code: {code}').replace('{code}', created.code) : '';
    showToast(t('staff_list.login_success_suffix', '{name} can now log in with the email and password you set.').replace('{name}', name) + codeMsg);
    load(token);
    notifySetupItemSaved(token);
  }).catch((err) => {
    showToast(err && err.message ? err.message : t('registrar_list.add_failed', 'Could not add registrar.'));
  }).finally(() => {
    btn.disabled = false;
    label.textContent = t('registrar_list.add_title', 'Add Registrar');
  });
}

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(t('registrar_list.title', 'Registrars'), t('registrar_list.subtitle', 'Search registrars and manage their accounts.'), 'admin-dashboard.php', {
      label: t('staff_list.add_action', '+ Add'), onClick: () => openAddRegistrarSheet(getStoredToken()),
    });
}
renderHeaderText();
onLocaleChange(renderHeaderText);

guardDashboard('admin', function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  load(token);
});
