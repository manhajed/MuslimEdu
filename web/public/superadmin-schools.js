// Schools - SuperAdmin-only web port of the mobile app's SchoolListScreen
// (list/search/create/toggle status), extended with the one thing that
// screen doesn't have: a per-school Taqdim/Translation feature toggle.
// Those two features are regular-school features now, not a separate
// "Private institution" school_type/role set - see School::getFeatures().
// A school's effective features come from its active subscription's
// package (same `features` array already used for 'gradingSystems' etc.),
// with a manual override on top; both states are shown here (see
// openFeatures()) rather than just a single on/off switch.

const FEATURE_LABELS = {
  taqdim: () => t('superadmin_schools.feature_taqdim', 'Taqdim Assistant'),
  translation: () => t('superadmin_schools.feature_translation', 'Translation Service'),
};

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(t('superadmin_schools.title', 'Schools'), t('superadmin_schools.subtitle', 'Add, edit, and manage schools and their features'), 'superadmin-dashboard.php');
}
renderHeaderText();
onLocaleChange(renderHeaderText);

let schools = [];
let schBooted = false;
let schToken = null;
let searchTimer = null;

function featureChipsHtml(school) {
  const on = Object.keys(school.features || {}).filter(k => school.features[k]);
  if (on.length === 0) {
    return '<span class="mini-chip" style="opacity:.6;">' + escapeHtml(t('superadmin_schools.no_features', 'No features')) + '</span>';
  }
  return on.map(k => '<span class="mini-chip ok">' + escapeHtml(FEATURE_LABELS[k] ? FEATURE_LABELS[k]() : k) + '</span>').join(' ') +
    (school.has_feature_overrides ? ' <span class="mini-chip" title="' + escapeHtml(t('superadmin_schools.overridden_hint', 'One or more features were manually set, not from the subscription')) + '">' + escapeHtml(t('superadmin_schools.overridden_chip', 'Manual')) + '</span>' : '');
}

function renderList() {
  const card = document.getElementById('schoolsCard');
  if (schools.length === 0) {
    card.innerHTML = '<div class="util-row"><span class="util-row-title" style="color:var(--subtle);">' + escapeHtml(t('superadmin_schools.empty', 'No schools yet.')) + '</span></div>';
    return;
  }
  card.innerHTML = '';
  schools.forEach(s => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'util-row';
    row.style.flexDirection = 'column';
    row.style.alignItems = 'flex-start';
    row.innerHTML =
      '<div style="display:flex;align-items:center;width:100%;">' +
        '<span class="util-row-icon">' + icon('school', { size: 16, color: 'var(--ink)' }) + '</span>' +
        '<span class="util-row-title">' + escapeHtml(s.title) +
          (s.status !== 1 ? ' <span class="mini-chip danger" style="margin-left:6px;">' + escapeHtml(t('superadmin_schools.disabled_chip', 'Disabled')) + '</span>' : '') + '</span>' +
        '<span class="util-row-value">' + escapeHtml(s.school_type === 'orphanage' ? t('superadmin_schools.type_orphanage', 'Orphanage') : t('superadmin_schools.type_regular', 'Regular')) + '</span>' +
        icon('chevron', { size: 18, color: 'var(--subtle)' }) +
      '</div>' +
      '<div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;">' + featureChipsHtml(s) + '</div>';
    row.addEventListener('click', () => openActions(s));
    card.appendChild(row);
  });
}

function openActions(s) {
  openActionSheet(s.title, [
    { icon: 'pencil', label: t('superadmin_schools.edit_label', 'Edit'), desc: t('superadmin_schools.edit_desc', 'Change school details'), onPress: () => openForm(s) },
    { icon: 'gradcap', label: t('superadmin_schools.features_label', 'Manage Features'), desc: t('superadmin_schools.features_desc', 'Taqdim Assistant and Translation Service'), onPress: () => openFeatures(s) },
    s.status === 1
      ? { icon: 'close', label: t('superadmin_schools.disable_label', 'Disable'), desc: t('superadmin_schools.disable_desc', 'Block sign-ins without deleting data'), onPress: () => toggleStatus(s, 0) }
      : { icon: 'check', label: t('superadmin_schools.enable_label', 'Enable'), desc: t('superadmin_schools.enable_desc', 'Allow sign-ins again'), onPress: () => toggleStatus(s, 1) },
  ]);
}

function toggleStatus(s, status) {
  setSchoolStatus(schToken, s.id, status).then(() => {
    showToast(status === 1 ? t('superadmin_schools.enabled_toast', 'School enabled.') : t('superadmin_schools.disabled_toast', 'School disabled.'));
    load();
  }).catch(err => showToast(err && err.message ? err.message : t('superadmin_schools.save_failed', 'Could not save.')));
}

// ── Feature toggle sheet ────────────────────────────────────────────────
function openFeatures(s) {
  let backdrop = document.getElementById('schFeaturesBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'schFeaturesBackdrop';
    backdrop.className = 'sheet-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.classList.remove('open'); });
  }

  function render(data) {
    const overrides = data.overrides || {};
    const features = data.features || {};
    const sub = data.subscription;
    const subLabel = sub && sub.active
      ? (sub.package || t('superadmin_schools.unnamed_plan', 'Unnamed plan'))
      : t('superadmin_schools.no_active_subscription', 'No active subscription');

    const rows = Object.keys(FEATURE_LABELS).map(key => {
      const isOverridden = Object.prototype.hasOwnProperty.call(overrides, key);
      const enabled = !!features[key];
      const sourceLabel = isOverridden
        ? t('superadmin_schools.source_manual', 'Set manually')
        : t('superadmin_schools.source_subscription', 'From subscription');
      return (
        '<div class="util-row" style="padding:10px 0;">' +
          '<div style="flex:1;">' +
            '<div class="util-row-title">' + escapeHtml(FEATURE_LABELS[key]()) + '</div>' +
            '<div style="font-size:12px;color:var(--subtle);margin-top:2px;">' + escapeHtml(sourceLabel) +
              (isOverridden ? ' &middot; <a href="#" data-resync="' + key + '" style="color:var(--brand);">' + escapeHtml(t('superadmin_schools.resync_link', 'Reset to automatic')) + '</a>' : '') +
            '</div>' +
          '</div>' +
          '<span class="switch"><input type="checkbox" data-feature-toggle="' + key + '"' + (enabled ? ' checked' : '') + '><span class="switch-track"></span></span>' +
        '</div>'
      );
    }).join('');

    backdrop.innerHTML =
      '<div class="sheet-panel form">' +
        '<div class="sheet-handle"></div>' +
        '<div class="sheet-title-row"><span class="sheet-title">' + escapeHtml(t('superadmin_schools.features_title', 'Features')) + '</span>' +
          '<button type="button" class="sheet-close-btn" id="schFeaturesCloseBtn">' + icon('close', { size: 16, color: 'var(--subtle)' }) + '</button></div>' +
        '<div style="font-size:13px;color:var(--subtle);margin-bottom:8px;">' + escapeHtml(t('superadmin_schools.subscription_label', 'Subscription: {plan}').replace('{plan}', subLabel)) + '</div>' +
        rows +
      '</div>';

    backdrop.querySelectorAll('[data-feature-toggle]').forEach(input => {
      input.addEventListener('change', () => {
        const key = input.getAttribute('data-feature-toggle');
        input.disabled = true;
        updateSchoolFeature(schToken, s.id, key, input.checked).then(res => {
          render({ features: res.features, overrides: res.overrides, subscription: sub });
          load();
        }).catch(err => {
          showToast(err && err.message ? err.message : t('superadmin_schools.save_failed', 'Could not save.'));
          input.checked = !input.checked;
          input.disabled = false;
        });
      });
    });
    backdrop.querySelectorAll('[data-resync]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const key = link.getAttribute('data-resync');
        resyncSchoolFeature(schToken, s.id, key).then(res => {
          showToast(t('superadmin_schools.resynced_toast', 'Feature reset to automatic.'));
          render({ features: res.features, overrides: res.overrides, subscription: sub });
          load();
        }).catch(err => showToast(err && err.message ? err.message : t('superadmin_schools.save_failed', 'Could not save.')));
      });
    });

    document.getElementById('schFeaturesCloseBtn').addEventListener('click', () => backdrop.classList.remove('open'));
  }

  backdrop.innerHTML = '<div class="sheet-panel form"><div class="sheet-handle"></div><div class="util-row"><span class="util-row-title" style="color:var(--subtle);">' + escapeHtml(t('common.loading', 'Loading…')) + '</span></div></div>';
  backdrop.classList.add('open');
  fetchSchoolFeatures(schToken, s.id).then(render).catch(() => {
    showToast(t('superadmin_schools.load_failed', 'Could not load features.'));
    backdrop.classList.remove('open');
  });
}

// ── Create / edit form ──────────────────────────────────────────────────
function openForm(existing) {
  let backdrop = document.getElementById('schFormBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'schFormBackdrop';
    backdrop.className = 'sheet-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.classList.remove('open'); });
  }
  const adminFieldsHtml = existing ? '' :
    '<label class="util-label">' + escapeHtml(t('superadmin_schools.admin_name_label', "First admin's name")) + '</label>' +
    '<input type="text" id="schAdminName" class="util-input" />' +
    '<label class="util-label">' + escapeHtml(t('superadmin_schools.admin_email_label', "First admin's email")) + '</label>' +
    '<input type="email" id="schAdminEmail" class="util-input" autocapitalize="none" />' +
    '<label class="util-label">' + escapeHtml(t('superadmin_schools.admin_password_label', 'Password (min 8 characters)')) + '</label>' +
    '<input type="password" id="schAdminPassword" class="util-input" />';

  backdrop.innerHTML =
    '<div class="sheet-panel form">' +
      '<div class="sheet-handle"></div>' +
      '<div class="sheet-title-row"><span class="sheet-title">' + escapeHtml(existing ? t('superadmin_schools.edit_title', 'Edit School') : t('superadmin_schools.add_title', 'Add School')) + '</span>' +
        '<button type="button" class="sheet-close-btn" id="schCloseBtn">' + icon('close', { size: 16, color: 'var(--subtle)' }) + '</button></div>' +
      '<label class="util-label" style="margin-top:0;">' + escapeHtml(t('superadmin_schools.name_label', 'Name')) + '</label>' +
      '<input type="text" id="schTitle" class="util-input" value="' + (existing ? escapeHtml(existing.title) : '') + '" />' +
      '<label class="util-label">' + escapeHtml(t('superadmin_schools.email_label', 'Email')) + '</label>' +
      '<input type="email" id="schEmail" class="util-input" autocapitalize="none" value="' + (existing ? escapeHtml(existing.email) : '') + '" />' +
      '<label class="util-label">' + escapeHtml(t('superadmin_schools.phone_label', 'Phone')) + '</label>' +
      '<input type="tel" id="schPhone" class="util-input" value="' + (existing ? escapeHtml(String(existing.phone || '')) : '') + '" />' +
      '<label class="util-label">' + escapeHtml(t('superadmin_schools.address_label', 'Address')) + '</label>' +
      '<input type="text" id="schAddress" class="util-input" value="' + (existing ? escapeHtml(existing.address || '') : '') + '" />' +
      '<label class="util-label">' + escapeHtml(t('superadmin_schools.description_label', 'Description (optional)')) + '</label>' +
      '<textarea id="schDescription" class="util-input">' + (existing && existing.description ? escapeHtml(existing.description) : '') + '</textarea>' +
      '<label class="util-label">' + escapeHtml(t('superadmin_schools.type_label', 'School type')) + '</label>' +
      '<select id="schType" class="util-input">' +
        '<option value="regular"' + (!existing || existing.school_type === 'regular' ? ' selected' : '') + '>' + escapeHtml(t('superadmin_schools.type_regular', 'Regular')) + '</option>' +
        '<option value="orphanage"' + (existing && existing.school_type === 'orphanage' ? ' selected' : '') + '>' + escapeHtml(t('superadmin_schools.type_orphanage', 'Orphanage')) + '</option>' +
      '</select>' +
      adminFieldsHtml +
      '<div class="sheet-form-actions">' +
        '<button type="button" class="sheet-btn-secondary" id="schCancelBtn">' + escapeHtml(t('common.cancel', 'Cancel')) + '</button>' +
        '<button type="button" class="sheet-btn-primary" id="schSubmitBtn"><span id="schSubmitLabel">' + escapeHtml(t('common.save', 'Save')) + '</span></button>' +
      '</div>' +
    '</div>';

  document.getElementById('schCloseBtn').addEventListener('click', () => backdrop.classList.remove('open'));
  document.getElementById('schCancelBtn').addEventListener('click', () => backdrop.classList.remove('open'));
  document.getElementById('schSubmitBtn').addEventListener('click', () => {
    const title = document.getElementById('schTitle').value.trim();
    const email = document.getElementById('schEmail').value.trim();
    if (!title || !email) { showToast(t('superadmin_schools.required_fields', 'Name and email are required.')); return; }

    const input = {
      title,
      email,
      phone: document.getElementById('schPhone').value.trim(),
      address: document.getElementById('schAddress').value.trim(),
      description: document.getElementById('schDescription').value.trim() || null,
      school_type: document.getElementById('schType').value,
    };
    if (!existing) {
      input.admin_name = document.getElementById('schAdminName').value.trim();
      input.admin_email = document.getElementById('schAdminEmail').value.trim();
      input.admin_password = document.getElementById('schAdminPassword').value;
      if (!input.admin_name || !input.admin_email || !input.admin_password) {
        showToast(t('superadmin_schools.admin_required', "The first admin's name, email, and password are required."));
        return;
      }
    }

    const btn = document.getElementById('schSubmitBtn');
    const label = document.getElementById('schSubmitLabel');
    btn.disabled = true; label.innerHTML = '<span class="util-spinner"></span>';
    const req = existing ? updateSchool(schToken, existing.id, input) : createSchool(schToken, input);
    req.then(() => {
      backdrop.classList.remove('open');
      showToast(existing ? t('superadmin_schools.updated_toast', 'School updated.') : t('superadmin_schools.added_toast', 'School added.'));
      load();
    }).catch(err => showToast(err && err.message ? err.message : t('superadmin_schools.save_failed', 'Could not save.')))
      .finally(() => { btn.disabled = false; label.textContent = t('common.save', 'Save'); });
  });
  backdrop.classList.add('open');
}

function load() {
  const search = (document.getElementById('schoolSearchInput') || {}).value || '';
  document.getElementById('schoolsCard').innerHTML = '<div class="util-row"><span class="util-row-title" style="color:var(--subtle);">' + escapeHtml(t('common.loading', 'Loading…')) + '</span></div>';
  fetchSchools(schToken, { search }).then(d => {
    schools = d.schools || [];
    renderList();
  }).catch(() => {
    document.getElementById('schoolsCard').innerHTML = '<div class="util-row"><span class="util-row-title" style="color:var(--subtle);">' + escapeHtml(t('superadmin_schools.load_failed', 'Could not load schools.')) + '</span></div>';
  });
}

onLocaleChange(() => { if (schBooted) renderList(); });

guardDashboard('superadmin', function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  schToken = token;
  document.getElementById('utilBody').style.display = '';
  document.getElementById('schoolSearchInput').placeholder = t('superadmin_schools.search_placeholder', 'Search by name or email');
  document.getElementById('addSchoolBtn').addEventListener('click', () => openForm(null));
  document.getElementById('schoolSearchInput').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(load, 300);
  });
  load();
  schBooted = true;
});
