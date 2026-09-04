// SuperAdmin: Team & Staff. Manages Manhaje's own internal platform team
// (sub-admins who help run the SaaS itself) - NOT a school's admin/teacher/
// registrar accounts, which stay under SuperAdminController::adminList and
// the per-school people-list pages. Same list/sheet pattern as
// registrar-list.js / teachers-list.js, backed by the superadmin_staff_*
// endpoints (fetchSuperAdminStaff/addSuperAdminStaff/etc., dashboard.js).
//
// This sheet also surfaces Scholarship & Taqdim Access as a convenience -
// see renderScholarshipAccessSwitches() below. That is NOT a replacement
// for the dedicated scholarship-access.js page; granting/revoking it must
// stay SuperAdmin-only end to end (see that file's header comment), so the
// switches here only ever render for the real SuperAdmin (currentUserRole
// === 'superadmin'), never for a full_access staffer, even though the rest
// of this sheet is reachable by both.

document.getElementById('searchIcon').innerHTML = icon('search', { size: 17, color: 'var(--subtle)' });

// Permission scopes a staff member can be granted. full_access short-
// circuits the rest - a staff member with it can do everything, including
// manage other staff, so it's called out separately rather than being just
// another checkbox alongside the others.
const STAFF_PERMISSIONS = [
  { key: 'schools', label: t('superadmin_staff.perm_schools_label', 'Schools & Onboarding'), desc: t('superadmin_staff.perm_schools_desc', 'Add, edit, and manage school accounts'), icon: 'school' },
  { key: 'subscriptions', label: t('superadmin_staff.perm_subscriptions_label', 'Subscriptions & Billing'), desc: t('superadmin_staff.perm_subscriptions_desc', 'Plans, pricing, and payment status'), icon: 'banknote' },
  { key: 'support', label: t('superadmin_staff.perm_support_label', 'Support & Moderation'), desc: t('superadmin_staff.perm_support_desc', 'Review posts, respond to reports'), icon: 'flag' },
  { key: 'settings', label: t('superadmin_staff.perm_settings_label', 'Platform Settings'), desc: t('superadmin_staff.perm_settings_desc', 'System, SMTP, languages, and integrations'), icon: 'gear' },
];
const FULL_ACCESS = { key: 'full_access', label: t('superadmin_staff.perm_full_access_label', 'Full Access'), desc: t('superadmin_staff.perm_full_access_desc', 'Everything above, plus managing other staff'), icon: 'shield' };

function permissionLabel(key) {
  if (key === 'full_access') return FULL_ACCESS.label;
  const p = STAFF_PERMISSIONS.find(p => p.key === key);
  return p ? p.label : key;
}

let allStaff = [];
let searchQuery = '';
let searchTimer = null;
let lastListRendered = false;
let currentUserId = null;
// Set from guardDashboard's user below. Deliberately the real SuperAdmin
// check (user.role === 'superadmin'), not user.full_access - a full_access
// staffer can reach every other part of this sheet but must never see or
// trigger the scholarship-access switches, matching scholarship-access.js.
let currentUserRole = null;

function renderList(token) {
  lastListRendered = true;
  const wrap = document.getElementById('listContent');
  const q = searchQuery.trim().toLowerCase();
  const filtered = q
    ? allStaff.filter(s => (s.name || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q))
    : allStaff;

  if (filtered.length === 0) {
    wrap.innerHTML =
      '<div class="list-empty"><div class="list-empty-title">' +
      escapeHtml(allStaff.length === 0 ? t('superadmin_staff.no_staff_found', 'No staff members yet') : t('staff_list.no_matches', 'No matches for your search')) +
      '</div></div>';
    return;
  }

  wrap.innerHTML = '';
  filtered.forEach(s => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'list-card';
    const initial = (s.name || '?').trim().charAt(0).toUpperCase();
    const active = s.status === 1 || s.status === '1';
    const statusColor = active ? 'var(--emerald)' : '#EF4444';
    const perms = Array.isArray(s.permissions) ? s.permissions : [];
    const hasFull = perms.includes('full_access');
    const chipPerms = hasFull ? ['full_access'] : perms.slice(0, 2);
    const extraCount = hasFull ? 0 : Math.max(0, perms.length - chipPerms.length);
    card.innerHTML =
      '<span class="list-avatar-wrap">' +
        (s.photo
          ? '<img class="list-avatar" src="' + escapeHtml(absoluteUrl(s.photo)) + '" alt="" />'
          : '<span class="list-avatar-fallback">' + escapeHtml(initial) + '</span>') +
        '<span class="list-avatar-dot" style="background:' + statusColor + '"></span>' +
      '</span>' +
      '<span class="list-card-body">' +
        '<span class="list-card-name">' + escapeHtml(s.name || t('superadmin_staff.unnamed', 'Unnamed staff')) + '</span>' +
        '<div class="list-card-meta">' + escapeHtml(s.email || '') + '</div>' +
        '<div class="chip-row">' +
          '<span class="mini-chip ' + (active ? 'ok' : 'danger') + '">' + escapeHtml(active ? t('staff_list.active', 'Active') : t('staff_list.inactive', 'Inactive')) + '</span>' +
          chipPerms.map(k => '<span class="mini-chip ok">' + icon(k === 'full_access' ? 'shield' : 'key', { size: 12, color: 'var(--ink)' }) + escapeHtml(permissionLabel(k)) + '</span>').join('') +
          (extraCount > 0 ? '<span class="mini-chip ok">+' + extraCount + '</span>' : '') +
          // Read-only status chips - teamToArray() sends these two fields
          // to anyone who can view this list (full_access staff included),
          // same as every other field here; only granting/revoking them is
          // SuperAdmin-gated (see the switches further down).
          (s.scholarship_access ? '<span class="mini-chip ok">' + icon('gradcap', { size: 12, color: 'var(--ink)' }) + escapeHtml(t('superadmin_staff.chip_scholarship', 'Taqdim')) + '</span>' : '') +
          (s.scholarship_access && s.scholarship_translation_access ? '<span class="mini-chip ok">' + icon('globe', { size: 12, color: 'var(--ink)' }) + escapeHtml(t('superadmin_staff.chip_translation', 'Translate')) + '</span>' : '') +
        '</div>' +
      '</span>' +
      icon('chevron', { size: 18, color: 'var(--subtle)' });
    card.addEventListener('click', () => openStaffActions(s, token));
    wrap.appendChild(card);
  });
}
onLocaleChange(() => { if (lastListRendered) renderList(getStoredToken()); });

function openStaffActions(s, token) {
  const isSelf = currentUserId != null && String(s.id) === String(currentUserId);
  const active = s.status === 1 || s.status === '1';
  const actions = [
    { icon: 'idcard', label: t('superadmin_staff.profile_label', 'Profile & Permissions'), desc: t('superadmin_staff.profile_desc', 'View contact info and access level'), onPress: () => showStaffProfile(s, token) },
  ];
  if (!isSelf) {
    actions.push({
      icon: active ? 'lock' : 'checkcircle',
      label: active ? t('superadmin_staff.suspend_label', 'Suspend Access') : t('superadmin_staff.activate_label', 'Activate Access'),
      desc: active ? t('superadmin_staff.suspend_desc', 'Immediately signs them out and blocks login') : t('superadmin_staff.activate_desc', 'Restores their login access'),
      onPress: () => toggleStaffStatus(s, token),
    });
    actions.push({
      icon: 'trash',
      label: t('superadmin_staff.delete_label', 'Remove Staff'),
      desc: t('superadmin_staff.delete_desc', 'Permanently deletes this account'),
      onPress: () => confirmDeleteStaff(s, token),
    });
  }
  openActionSheet(s.name || t('superadmin_staff.fallback', 'Staff member'), actions);
}

function showStaffProfile(s, token) {
  fetchSuperAdminStaffProfile(token, s.id).then(p => {
    const active = s.status === 1 || s.status === '1';
    const perms = Array.isArray(p.permissions) ? p.permissions : (Array.isArray(s.permissions) ? s.permissions : []);
    const permsText = perms.includes('full_access') ? FULL_ACCESS.label : (perms.map(permissionLabel).join(', ') || t('superadmin_staff.no_permissions', 'None granted'));
    const fields = [
      { icon: 'mail', label: t('staff_list.email_label', 'Email'), value: p.email || s.email },
      { icon: 'phone', label: t('staff_list.phone_label', 'Phone'), value: p.phone },
      { icon: 'shield', label: t('superadmin_staff.permissions_label', 'Permissions'), value: permsText },
      // Same read-only fields as the list chips above - only shown when
      // granted, same pattern as the phone field being omitted when empty.
      {
        icon: 'gradcap',
        label: t('superadmin_staff.scholarship_access_label', 'Scholarship & Taqdim Access'),
        value: p.scholarship_access
          ? (p.scholarship_translation_access
              ? t('superadmin_staff.scholarship_access_with_translation', 'Granted, incl. Translation Services')
              : t('superadmin_staff.scholarship_access_granted', 'Granted'))
          : null,
      },
    ].filter(f => !!f.value);

    openPersonProfileModal({
      photo: p.photo || s.photo,
      name: p.name || s.name,
      statusColor: active ? 'var(--emerald)' : '#EF4444',
      statusLabel: active ? t('staff_list.active', 'Active') : t('staff_list.inactive', 'Inactive'),
      fields,
      canEdit: true,
      onEdit: () => openEditStaffSheet(s, token),
    });
  }).catch(() => showToast(t('superadmin_staff.profile_load_failed', 'Could not load this staff member’s profile.')));
}

function toggleStaffStatus(s, token) {
  const active = s.status === 1 || s.status === '1';
  updateSuperAdminStaffStatus(token, s.id, active ? 0 : 1).then(() => {
    showToast(active ? t('superadmin_staff.suspended_toast', 'Access suspended.') : t('superadmin_staff.activated_toast', 'Access activated.'));
    load(token);
  }).catch(err => showToast(err && err.message ? err.message : t('superadmin_staff.status_failed', 'Could not update status.')));
}

function confirmDeleteStaff(s, token) {
  openActionSheet(t('superadmin_staff.confirm_delete_title', 'Remove this staff member?'), [
    { icon: 'trash', label: t('superadmin_staff.confirm_delete_label', 'Yes, remove'), desc: t('superadmin_staff.confirm_delete_desc', 'This cannot be undone'), onPress: () => deleteStaff(s, token) },
    { icon: 'close', label: t('common.cancel', 'Cancel'), desc: t('superadmin_staff.keep_desc', 'Keep this account as-is'), onPress: () => {} },
  ]);
}
function deleteStaff(s, token) {
  deleteSuperAdminStaff(token, s.id).then(() => {
    showToast(t('superadmin_staff.deleted_toast', 'Staff member removed.'));
    load(token);
  }).catch(err => showToast(err && err.message ? err.message : t('superadmin_staff.delete_failed', 'Could not remove this staff member.')));
}

document.getElementById('searchInput').addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { searchQuery = e.target.value; renderList(getStoredToken()); }, 200);
});

function load(token) {
  document.getElementById('listContent').innerHTML = '<div class="list-loading">' + escapeHtml(t('common.loading', 'Loading…')) + '</div>';
  fetchSuperAdminStaff(token).then((staff) => {
    allStaff = staff;
    renderList(token);
  }).catch(() => {
    lastListRendered = false;
    document.getElementById('listContent').innerHTML =
      '<div class="list-error">' + escapeHtml(t('superadmin_staff.load_failed', 'Failed to load staff.')) + '<br><button type="button" class="list-retry-btn" id="retryBtn">' + escapeHtml(t('common.retry', 'Try again')) + '</button></div>';
    document.getElementById('retryBtn')?.addEventListener('click', () => load(token));
  });
}

// ── Shared permission-switches block, used by both the Add and Edit sheets ──
function renderPermissionSwitches(idPrefix, checkedKeys) {
  checkedKeys = checkedKeys || [];
  const rows = STAFF_PERMISSIONS.map(p =>
    '<div class="switch-row"><div class="switch-row-label">' + escapeHtml(p.label) + '<br><span style="font-weight:400;color:var(--subtle);font-size:12px;">' + escapeHtml(p.desc) + '</span></div>' +
      '<span class="switch"><input type="checkbox" id="' + idPrefix + 'Perm_' + p.key + '" class="' + idPrefix + 'PermCheckbox"' + (checkedKeys.includes(p.key) ? ' checked' : '') + '><span class="switch-track"></span></span></div>'
  ).join('');
  const fullRow =
    '<div class="switch-row" style="margin-top:6px;border-top:1px solid var(--border);padding-top:10px;"><div class="switch-row-label">' + escapeHtml(FULL_ACCESS.label) + '<br><span style="font-weight:400;color:var(--subtle);font-size:12px;">' + escapeHtml(FULL_ACCESS.desc) + '</span></div>' +
      '<span class="switch"><input type="checkbox" id="' + idPrefix + 'Perm_full_access"' + (checkedKeys.includes('full_access') ? ' checked' : '') + '><span class="switch-track"></span></span></div>';
  return '<label class="util-label">' + escapeHtml(t('superadmin_staff.permissions_label', 'Permissions')) + '</label>' + rows + fullRow;
}
function collectPermissions(idPrefix) {
  if (document.getElementById(idPrefix + 'Perm_full_access').checked) return ['full_access'];
  return STAFF_PERMISSIONS.filter(p => document.getElementById(idPrefix + 'Perm_' + p.key).checked).map(p => p.key);
}
// A full_access checkbox makes the individual scope switches redundant -
// disable them while it's checked so the form doesn't imply picking both
// matters, mirroring how a "select all" checkbox usually behaves.
function wireFullAccessToggle(idPrefix) {
  const fullBox = document.getElementById(idPrefix + 'Perm_full_access');
  const others = STAFF_PERMISSIONS.map(p => document.getElementById(idPrefix + 'Perm_' + p.key));
  function apply() { others.forEach(el => { el.disabled = fullBox.checked; }); }
  fullBox.addEventListener('change', apply);
  apply();
}

// ── Shared Scholarship & Taqdim Access switches, SuperAdmin only ──
// A second, more convenient front door onto the exact same
// superadmin_scholarship_access_* endpoints scholarship-access.js already
// uses - NOT a replacement for that page (see this file's header comment).
// Returns '' for anyone but the real SuperAdmin, so a full_access staffer
// editing this same sheet never sees these switches at all - same
// security boundary as the dedicated page, just reachable from one more
// screen.
function renderScholarshipAccessSwitches(idPrefix, hasAccess, hasTranslation) {
  if (currentUserRole !== 'superadmin') return '';
  return (
    '<div class="switch-row" style="margin-top:6px;border-top:1px solid var(--border);padding-top:10px;"><div class="switch-row-label">' + escapeHtml(t('superadmin_staff.scholarship_access_label', 'Scholarship & Taqdim Access')) + '<br><span style="font-weight:400;color:var(--subtle);font-size:12px;">' + escapeHtml(t('superadmin_staff.scholarship_access_desc', 'Manage scholarships, applications, and documents')) + '</span></div>' +
      '<span class="switch"><input type="checkbox" id="' + idPrefix + 'ScholarshipAccess"' + (hasAccess ? ' checked' : '') + '><span class="switch-track"></span></span></div>' +
    '<div class="switch-row"><div class="switch-row-label">' + escapeHtml(t('superadmin_staff.scholarship_translate_label', 'Translation Services')) + '<br><span style="font-weight:400;color:var(--subtle);font-size:12px;">' + escapeHtml(t('superadmin_staff.scholarship_translate_desc', 'Work translation requests inside Taqdim applications')) + '</span></div>' +
      '<span class="switch"><input type="checkbox" id="' + idPrefix + 'ScholarshipTranslation"' + (hasTranslation ? ' checked' : '') + (hasAccess ? '' : ' disabled') + '><span class="switch-track"></span></span></div>'
  );
}
// Same invariant as scholarship-access.js's own checkboxes: losing base
// access always takes translation access with it, mirroring
// scholarshipAccessUpdate()'s server-side behavior. No-op (nothing to
// wire) for anyone but the real SuperAdmin, since the switches above
// weren't rendered for them.
function wireScholarshipAccessToggle(idPrefix) {
  const accessBox = document.getElementById(idPrefix + 'ScholarshipAccess');
  const translateBox = document.getElementById(idPrefix + 'ScholarshipTranslation');
  if (!accessBox || !translateBox) return;
  accessBox.addEventListener('change', () => {
    translateBox.disabled = !accessBox.checked;
    if (!accessBox.checked) translateBox.checked = false;
  });
}
// Reads the two switches above back out, for the submit handlers below.
// Returns null when they weren't rendered (not the real SuperAdmin) so
// call sites can tell "nothing to save" apart from "both left unchecked".
function readScholarshipAccessSwitches(idPrefix) {
  if (currentUserRole !== 'superadmin') return null;
  const accessBox = document.getElementById(idPrefix + 'ScholarshipAccess');
  const translateBox = document.getElementById(idPrefix + 'ScholarshipTranslation');
  if (!accessBox) return null;
  return { access: accessBox.checked, translation: !!(translateBox && translateBox.checked) };
}
// Second-stage save for the switches above, shared by both the Add and
// Edit sheets. superadmin_scholarship_access_update (updateScholarshipAccess
// in dashboard.js) takes the *entire* granted/translation_granted roster,
// not a per-staff toggle - see scholarshipAccessUpdate()'s server-side
// comment - so this re-derives the full set from the in-memory allStaff
// snapshot plus this one change, rather than a separate
// fetchScholarshipAccess() round trip right before saving. Call sites only
// invoke this when something actually changed.
function applyScholarshipAccessChange(token, staffId, grantAccess, grantTranslation) {
  const grantedIds = new Set(allStaff.filter(s => s.scholarship_access).map(s => s.id));
  const translationIds = new Set(allStaff.filter(s => s.scholarship_translation_access).map(s => s.id));
  if (grantAccess) grantedIds.add(staffId); else grantedIds.delete(staffId);
  if (grantAccess && grantTranslation) translationIds.add(staffId); else translationIds.delete(staffId);
  return updateScholarshipAccess(token, Array.from(grantedIds), Array.from(translationIds));
}

// ── Add Staff form sheet ──
function openAddStaffSheet(token) {
  let backdrop = document.getElementById('addStaffBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'addStaffBackdrop';
    backdrop.className = 'sheet-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) closeAddStaffSheet(); });
  }
  backdrop.innerHTML =
    '<div class="sheet-panel form">' +
      '<div class="sheet-handle"></div>' +
      '<div class="sheet-title-row"><span class="sheet-title">' + escapeHtml(t('superadmin_staff.add_title', 'Add Staff')) + '</span>' +
        '<button type="button" class="sheet-close-btn" id="asCloseBtn">' + icon('close', { size: 16, color: 'var(--subtle)' }) + '</button></div>' +
      '<label class="util-label" style="margin-top:0;">' + escapeHtml(t('staff_list.full_name_label', 'Full Name')) + '</label>' +
      '<input type="text" id="asName" class="util-input" placeholder="' + escapeHtml(t('staff_list.full_name_placeholder', 'e.g. Ahmad bin Abdullah')) + '" />' +
      '<label class="util-label">' + escapeHtml(t('staff_list.email_label', 'Email')) + '</label>' +
      '<input type="email" id="asEmail" class="util-input" placeholder="' + escapeHtml(t('superadmin_staff.email_placeholder', 'staff@manhaje.com')) + '" autocapitalize="none" />' +
      '<label class="util-label">' + escapeHtml(t('staff_list.password_label', 'Password')) + '</label>' +
      '<input type="password" id="asPassword" class="util-input" placeholder="' + escapeHtml(t('staff_list.password_placeholder', 'At least 6 characters')) + '" />' +
      '<label class="util-label">' + escapeHtml(t('staff_list.phone_field_label', 'Phone (optional)')) + '</label>' +
      '<input type="tel" id="asPhone" class="util-input" placeholder="' + escapeHtml(t('staff_list.phone_placeholder', 'e.g. 012-345 6789')) + '" />' +
      renderPermissionSwitches('as', []) +
      renderScholarshipAccessSwitches('as', false, false) +
      '<div class="sheet-form-actions">' +
        '<button type="button" class="sheet-btn-secondary" id="asCancelBtn">' + escapeHtml(t('common.cancel', 'Cancel')) + '</button>' +
        '<button type="button" class="sheet-btn-primary" id="asSubmitBtn"><span id="asSubmitLabel">' + escapeHtml(t('superadmin_staff.add_title', 'Add Staff')) + '</span></button>' +
      '</div>' +
    '</div>';
  document.getElementById('asCloseBtn').addEventListener('click', closeAddStaffSheet);
  document.getElementById('asCancelBtn').addEventListener('click', closeAddStaffSheet);
  document.getElementById('asSubmitBtn').addEventListener('click', () => submitAddStaff(token));
  wireFullAccessToggle('as');
  wireScholarshipAccessToggle('as');
  backdrop.classList.add('open');
}
function closeAddStaffSheet() {
  document.getElementById('addStaffBackdrop')?.classList.remove('open');
}
function submitAddStaff(token) {
  const name = document.getElementById('asName').value.trim();
  const email = document.getElementById('asEmail').value.trim();
  const password = document.getElementById('asPassword').value.trim();

  if (!name) { showToast(t('staff_list.full_name_required', 'Full name is required.')); return; }
  if (!email || !password) { showToast(t('staff_list.required_fields', 'Name, email, and password are required.')); return; }
  if (password.length < 6) { showToast(t('staff_list.password_too_short', 'Password must be at least 6 characters.')); return; }

  const permissions = collectPermissions('as');

  // Read before the sheet closes / gets rebuilt - null when not the real
  // SuperAdmin (see readScholarshipAccessSwitches).
  const scholarshipWanted = readScholarshipAccessSwitches('as');

  // Scholarship & Taqdim Access is NOT part of `permissions` - it lives in
  // its own column, saved by its own endpoint further down. So a
  // Taqdim-only staffer (no platform scope, scholarship access on) leaves
  // `permissions` legitimately empty, and checking permissions alone here
  // made that combination impossible to save: the sheet rejected it even
  // though the SuperAdmin had just switched something on. Count both
  // halves, so this only fires when genuinely nothing was granted.
  if (permissions.length === 0 && !(scholarshipWanted && scholarshipWanted.access)) {
    showToast(t('superadmin_staff.permission_required', 'Grant at least one permission.'));
    return;
  }

  const btn = document.getElementById('asSubmitBtn');
  const label = document.getElementById('asSubmitLabel');
  btn.disabled = true;
  label.innerHTML = '<span class="util-spinner"></span>';

  addSuperAdminStaff(token, {
    name,
    email,
    password,
    phone: document.getElementById('asPhone').value.trim() || undefined,
    permissions,
  }).then((newStaff) => {
    closeAddStaffSheet();
    showToast(t('staff_list.login_success_suffix', '{name} can now log in with the email and password you set.').replace('{name}', name));
    // A brand-new staff row always starts with scholarship_access false,
    // so there's nothing to save unless the SuperAdmin actually checked it.
    if (scholarshipWanted && scholarshipWanted.access) {
      return applyScholarshipAccessChange(token, newStaff.id, true, scholarshipWanted.translation)
        .catch(() => showToast(t('superadmin_staff.scholarship_access_save_failed', 'Staff member added, but scholarship access could not be saved - grant it from Scholarship & Taqdim Access.')));
    }
  }).then(() => {
    load(token);
  }).catch((err) => {
    showToast(err && err.message ? err.message : t('superadmin_staff.add_failed', 'Could not add staff member.'));
  }).finally(() => {
    btn.disabled = false;
    label.textContent = t('superadmin_staff.add_title', 'Add Staff');
  });
}

// ── Edit Staff (name/email/permissions) sheet ──
function openEditStaffSheet(s, token) {
  let backdrop = document.getElementById('editStaffBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'editStaffBackdrop';
    backdrop.className = 'sheet-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) closeEditStaffSheet(); });
  }
  const perms = Array.isArray(s.permissions) ? s.permissions : [];
  backdrop.innerHTML =
    '<div class="sheet-panel form">' +
      '<div class="sheet-handle"></div>' +
      '<div class="sheet-title-row"><span class="sheet-title">' + escapeHtml(t('superadmin_staff.edit_title', 'Edit Staff')) + '</span>' +
        '<button type="button" class="sheet-close-btn" id="esCloseBtn">' + icon('close', { size: 16, color: 'var(--subtle)' }) + '</button></div>' +
      '<label class="util-label" style="margin-top:0;">' + escapeHtml(t('staff_list.full_name_label', 'Full Name')) + '</label>' +
      '<input type="text" id="esName" class="util-input" value="' + escapeHtml(s.name || '') + '" />' +
      '<label class="util-label">' + escapeHtml(t('staff_list.email_label', 'Email')) + '</label>' +
      '<input type="email" id="esEmail" class="util-input" value="' + escapeHtml(s.email || '') + '" autocapitalize="none" />' +
      '<label class="util-label">' + escapeHtml(t('people_profile.new_password_label', 'New Password (optional)')) + '</label>' +
      '<input type="password" id="esPassword" class="util-input" placeholder="' + escapeHtml(t('people_profile.new_password_placeholder', 'Leave blank to keep current password')) + '" />' +
      renderPermissionSwitches('es', perms) +
      renderScholarshipAccessSwitches('es', !!s.scholarship_access, !!s.scholarship_translation_access) +
      '<div class="sheet-form-actions">' +
        '<button type="button" class="sheet-btn-secondary" id="esCancelBtn">' + escapeHtml(t('common.cancel', 'Cancel')) + '</button>' +
        '<button type="button" class="sheet-btn-primary" id="esSubmitBtn"><span id="esSubmitLabel">' + escapeHtml(t('common.save', 'Save')) + '</span></button>' +
      '</div>' +
    '</div>';
  document.getElementById('esCloseBtn').addEventListener('click', closeEditStaffSheet);
  document.getElementById('esCancelBtn').addEventListener('click', closeEditStaffSheet);
  document.getElementById('esSubmitBtn').addEventListener('click', () => submitEditStaff(s, token));
  wireFullAccessToggle('es');
  wireScholarshipAccessToggle('es');
  backdrop.classList.add('open');
}
function closeEditStaffSheet() {
  document.getElementById('editStaffBackdrop')?.classList.remove('open');
}
function submitEditStaff(s, token) {
  const name = document.getElementById('esName').value.trim();
  const email = document.getElementById('esEmail').value.trim();
  if (!name || !email) { showToast(t('people_profile.name_email_required', 'Name and email are required.')); return; }

  const permissions = collectPermissions('es');

  // Read before the sheet closes / gets rebuilt - null when not the real
  // SuperAdmin. Only save the scholarship-access change if it actually
  // differs from what this staff member already had, so editing an
  // unrelated field (say, just the phone number) doesn't trigger a
  // pointless second request.
  const scholarshipWanted = readScholarshipAccessSwitches('es');

  // Same "is anything actually granted?" rule as the Add sheet - see the
  // comment in submitAddStaff. When the switches weren't rendered (a
  // full_access staffer editing, rather than the real SuperAdmin), fall
  // back to what this account already holds, so editing a Taqdim-only
  // staffer's name doesn't demand adding a platform scope they don't need.
  const keepsScholarshipAccess = scholarshipWanted ? scholarshipWanted.access : !!s.scholarship_access;
  if (permissions.length === 0 && !keepsScholarshipAccess) {
    showToast(t('superadmin_staff.permission_required', 'Grant at least one permission.'));
    return;
  }
  const scholarshipChanged = !!scholarshipWanted && (
    scholarshipWanted.access !== !!s.scholarship_access ||
    scholarshipWanted.translation !== !!s.scholarship_translation_access
  );

  const btn = document.getElementById('esSubmitBtn');
  const label = document.getElementById('esSubmitLabel');
  btn.disabled = true;
  label.innerHTML = '<span class="util-spinner"></span>';

  updateSuperAdminStaff(token, s.id, {
    name,
    email,
    password: document.getElementById('esPassword').value.trim() || undefined,
    permissions,
  }).then(() => {
    closeEditStaffSheet();
    showToast(t('superadmin_staff.updated_toast', 'Staff member updated.'));
    if (scholarshipChanged) {
      return applyScholarshipAccessChange(token, s.id, scholarshipWanted.access, scholarshipWanted.translation)
        .catch(() => showToast(t('superadmin_staff.scholarship_access_save_failed_edit', 'Staff details saved, but scholarship access could not be updated - change it from Scholarship & Taqdim Access.')));
    }
  }).then(() => {
    load(token);
  }).catch((err) => {
    showToast(err && err.message ? err.message : t('superadmin_staff.update_failed', 'Could not update this staff member.'));
  }).finally(() => {
    btn.disabled = false;
    label.textContent = t('common.save', 'Save');
  });
}

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(t('superadmin_staff.title', 'Team & Staff'), t('superadmin_staff.subtitle', 'Manage the accounts that help run Manhaje itself.'), 'superadmin-dashboard.php', {
      label: t('staff_list.add_action', '+ Add'), onClick: () => openAddStaffSheet(getStoredToken()),
    });
}
renderHeaderText();
onLocaleChange(renderHeaderText);

guardDashboard(['superadmin', 'platform_staff'], function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  // Role alone isn't enough here - a platform_staff member without
  // full_access shouldn't be able to view or manage the rest of the team,
  // even though this page is reachable by every platform_staff member at
  // the routing level (see the 'staff' row comment in
  // superadmin-dashboard.js). See requireFullAccessStaff() in
  // dashboard.js - it always passes the primary SuperAdmin through
  // regardless of any backend field.
  if (!requireFullAccessStaff(user)) return;
  currentUserId = user && user.id;
  currentUserRole = user && user.role;
  load(token);
});
