// Admin: Cashiers (People group) - same pattern as teachers-list.js, just
// backed by the accountant endpoints (fetchCashierAccounts/addCashier,
// dashboard.js) instead of the teacher ones. "Add Cashier" creates a real
// account via admin_accountant_admission_single.

document.getElementById('searchIcon').innerHTML = icon('search', { size: 17, color: 'var(--subtle)' });

let allCashiers = [];
let searchQuery = '';
let searchTimer = null;
let lastListRendered = false;

function renderList(token) {
  lastListRendered = true;
  const wrap = document.getElementById('listContent');
  const q = searchQuery.trim().toLowerCase();
  const filtered = q ? allCashiers.filter(c => (c.name || '').toLowerCase().includes(q)) : allCashiers;

  if (filtered.length === 0) {
    wrap.innerHTML =
      '<div class="list-empty"><div class="list-empty-title">' +
      escapeHtml(allCashiers.length === 0 ? t('cashier_list.no_cashiers_found', 'No cashiers found') : t('staff_list.no_matches', 'No matches for your search')) +
      '</div></div>';
    return;
  }

  wrap.innerHTML = '';
  filtered.forEach(c => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'list-card';
    const initial = (c.name || '?').trim().charAt(0).toUpperCase();
    const active = c.status === 1 || c.status === '1';
    const statusColor = active ? 'var(--emerald)' : '#EF4444';
    card.innerHTML =
      '<span class="list-avatar-wrap">' +
        (c.photo
          ? '<img class="list-avatar" src="' + escapeHtml(absoluteUrl(c.photo)) + '" alt="" />'
          : '<span class="list-avatar-fallback">' + escapeHtml(initial) + '</span>') +
        '<span class="list-avatar-dot" style="background:' + statusColor + '"></span>' +
      '</span>' +
      '<span class="list-card-body">' +
        '<span class="list-card-name">' + escapeHtml(c.name || t('cashier_list.unnamed', 'Unnamed cashier')) + '</span>' +
        '<div class="list-card-meta">' + escapeHtml(c.email || '') + '</div>' +
        '<div class="chip-row">' +
          '<span class="mini-chip ' + (active ? 'ok' : 'danger') + '">' + escapeHtml(active ? t('staff_list.active', 'Active') : t('staff_list.inactive', 'Inactive')) + '</span>' +
          (c.code ? '<span class="mini-chip ok">' + icon('idcard', { size: 12, color: 'var(--ink)' }) + escapeHtml(c.code) + '</span>' : '') +
        '</div>' +
      '</span>' +
      icon('chevron', { size: 18, color: 'var(--subtle)' });
    card.addEventListener('click', () => openCashierActions(c, token));
    wrap.appendChild(card);
  });
}
onLocaleChange(() => { if (lastListRendered) renderList(getStoredToken()); });

function openCashierActions(c, token) {
  openActionSheet(c.name || t('cashier_list.fallback', 'Cashier'), [
    { icon: 'idcard', label: t('staff_list.profile_label', 'Profile'), desc: t('staff_list.profile_desc', 'View contact info and role details'), onPress: () => showCashierProfile(c, token) },
    { icon: 'document', label: t('staff_list.documents_label', 'Documents'), desc: t('staff_list.documents_desc', 'ID, certificates, and other files'), onPress: notWiredYet },
  ]);
}

function showCashierProfile(c, token) {
  fetchCashierProfile(token, c.id).then(p => {
    const active = c.status === 1 || c.status === '1';
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
      photo: p.photo || c.photo,
      name: p.name || c.name,
      statusColor: active ? 'var(--emerald)' : '#EF4444',
      statusLabel: active ? t('staff_list.active', 'Active') : t('staff_list.inactive', 'Inactive'),
      fields,
      canEdit: true,
      onEdit: () => openEditBasicProfileSheet({
        title: t('people_profile.edit_cashier_title', 'Edit Cashier'),
        initial: { name: p.name || c.name, name_ar: p.name_ar, email: p.email, phone: p.phone, address: p.address, gender: p.gender, birthday: p.birthday, emergency_contact_name: p.emergency_contact_name, emergency_contact_phone: p.emergency_contact_phone },
        onSubmit: (values) => updateCashierProfile(token, c.id, values).then(() => {
          showToast(t('people_profile.save_success', 'Profile updated.'));
          load(token);
        }),
      }),
    });
  }).catch(() => showToast(t('cashier_list.profile_load_failed', 'Could not load this cashier’s profile.')));
}

document.getElementById('searchInput').addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { searchQuery = e.target.value; renderList(getStoredToken()); }, 200);
});

function load(token) {
  document.getElementById('listContent').innerHTML = '<div class="list-loading">' + escapeHtml(t('common.loading', 'Loading…')) + '</div>';
  fetchCashierAccounts(token).then((cashiers) => {
    allCashiers = cashiers;
    renderList(token);
  }).catch(() => {
    lastListRendered = false;
    document.getElementById('listContent').innerHTML =
      '<div class="list-error">' + escapeHtml(t('cashier_list.load_failed', 'Failed to load cashiers.')) + '<br><button type="button" class="list-retry-btn" id="retryBtn">' + escapeHtml(t('common.retry', 'Try again')) + '</button></div>';
    document.getElementById('retryBtn')?.addEventListener('click', () => load(token));
  });
}

// ── Add Cashier form sheet ──
function openAddCashierSheet(token) {
  let backdrop = document.getElementById('addCashierBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'addCashierBackdrop';
    backdrop.className = 'sheet-backdrop';
    backdrop.innerHTML =
      '<div class="sheet-panel form">' +
        '<div class="sheet-handle"></div>' +
        '<div class="sheet-title-row"><span class="sheet-title">' + escapeHtml(t('cashier_list.add_title', 'Add Cashier')) + '</span>' +
          '<button type="button" class="sheet-close-btn" id="acCloseBtn">' + icon('close', { size: 16, color: 'var(--subtle)' }) + '</button></div>' +
        '<label class="util-label" style="margin-top:0;">' + escapeHtml(t('staff_list.full_name_label', 'Full Name')) + '</label>' +
        '<input type="text" id="acName" class="util-input" placeholder="' + escapeHtml(t('staff_list.full_name_placeholder', 'e.g. Ahmad bin Abdullah')) + '" />' +
        '<label class="util-label">' + escapeHtml(t('staff_list.name_ar_label', 'Arabic Name (optional)')) + '</label>' +
        '<input type="text" id="acNameAr" class="util-input" placeholder="الاسم بالعربية" />' +
        '<label class="util-label">' + escapeHtml(t('staff_list.email_label', 'Email')) + '</label>' +
        '<input type="email" id="acEmail" class="util-input" placeholder="' + escapeHtml(t('cashier_list.email_placeholder', 'cashier@example.com')) + '" autocapitalize="none" />' +
        '<label class="util-label">' + escapeHtml(t('staff_list.password_label', 'Password')) + '</label>' +
        '<input type="password" id="acPassword" class="util-input" placeholder="' + escapeHtml(t('staff_list.password_placeholder', 'At least 6 characters')) + '" />' +
        '<label class="util-label">' + escapeHtml(t('staff_list.phone_field_label', 'Phone (optional)')) + '</label>' +
        '<input type="tel" id="acPhone" class="util-input" placeholder="' + escapeHtml(t('staff_list.phone_placeholder', 'e.g. 012-345 6789')) + '" />' +
        '<label class="util-label">' + escapeHtml(t('staff_list.emergency_name_label', 'Emergency Contact Name (optional)')) + '</label>' +
        '<input type="text" id="acEmergencyName" class="util-input" placeholder="' + escapeHtml(t('staff_list.emergency_name_placeholder', 'e.g. Fatimah binti Ahmad')) + '" />' +
        '<label class="util-label">' + escapeHtml(t('staff_list.emergency_phone_label', 'Emergency Contact Phone (optional)')) + '</label>' +
        '<input type="tel" id="acEmergencyPhone" class="util-input" placeholder="' + escapeHtml(t('staff_list.phone_placeholder', 'e.g. 012-345 6789')) + '" />' +
        '<div class="sheet-form-actions">' +
          '<button type="button" class="sheet-btn-secondary" id="acCancelBtn">' + escapeHtml(t('common.cancel', 'Cancel')) + '</button>' +
          '<button type="button" class="sheet-btn-primary" id="acSubmitBtn"><span id="acSubmitLabel">' + escapeHtml(t('cashier_list.add_title', 'Add Cashier')) + '</span></button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) closeAddCashierSheet(); });
    document.getElementById('acCloseBtn').addEventListener('click', closeAddCashierSheet);
    document.getElementById('acCancelBtn').addEventListener('click', closeAddCashierSheet);
    document.getElementById('acSubmitBtn').addEventListener('click', () => submitAddCashier(token));
  }
  ['acName', 'acNameAr', 'acEmail', 'acPassword', 'acPhone', 'acEmergencyName', 'acEmergencyPhone'].forEach(id => {
    document.getElementById(id).value = '';
  });
  backdrop.classList.add('open');
}
function closeAddCashierSheet() {
  document.getElementById('addCashierBackdrop')?.classList.remove('open');
}
function submitAddCashier(token) {
  const name = document.getElementById('acName').value.trim();
  const email = document.getElementById('acEmail').value.trim();
  const password = document.getElementById('acPassword').value.trim();

  if (!name) { showToast(t('staff_list.full_name_required', 'Full name is required.')); return; }
  if (!email || !password) { showToast(t('staff_list.required_fields', 'Name, email, and password are required.')); return; }
  if (password.length < 6) { showToast(t('staff_list.password_too_short', 'Password must be at least 6 characters.')); return; }

  const btn = document.getElementById('acSubmitBtn');
  const label = document.getElementById('acSubmitLabel');
  btn.disabled = true;
  label.innerHTML = '<span class="util-spinner"></span>';

  addCashier(token, {
    name,
    name_ar: document.getElementById('acNameAr').value.trim() || undefined,
    email,
    password,
    phone: document.getElementById('acPhone').value.trim() || undefined,
    emergency_contact_name: document.getElementById('acEmergencyName').value.trim() || undefined,
    emergency_contact_phone: document.getElementById('acEmergencyPhone').value.trim() || undefined,
  }).then((created) => {
    closeAddCashierSheet();
    const codeMsg = created && created.code ? ' ' + t('staff_list.staff_code_suffix', 'Staff code: {code}').replace('{code}', created.code) : '';
    showToast(t('staff_list.login_success_suffix', '{name} can now log in with the email and password you set.').replace('{name}', name) + codeMsg);
    load(token);
    notifySetupItemSaved(token);
  }).catch((err) => {
    showToast(err && err.message ? err.message : t('cashier_list.add_failed', 'Could not add cashier.'));
  }).finally(() => {
    btn.disabled = false;
    label.textContent = t('cashier_list.add_title', 'Add Cashier');
  });
}

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(t('cashier_list.title', 'Cashiers'), t('cashier_list.subtitle', 'Search cashiers and manage their accounts.'), 'admin-dashboard.php', {
      label: t('staff_list.add_action', '+ Add'), onClick: () => openAddCashierSheet(getStoredToken()),
    });
}
renderHeaderText();
onLocaleChange(renderHeaderText);

guardDashboard('admin', function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  load(token);
});
