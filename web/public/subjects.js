// Admin: Subjects — web port of the subject-catalog half of
// adminAcademicCatalogService.ts (admin_subjects_catalog_*, plus the
// department/curriculum picker lists it also exposes).

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(t('subjects_page.title', 'Subjects'), t('subjects_page.subtitle', "Manage the school's subject catalog."), 'admin-dashboard.php', {
      label: t('subjects_page.add_action', '+ Add'), onClick: () => openSubjectSheet(getStoredToken()),
    });
}
renderHeaderText();
onLocaleChange(renderHeaderText);
document.getElementById('filterIcon').innerHTML = icon('filter', { size: 15, color: 'var(--ink)' });
document.getElementById('searchIcon').innerHTML = icon('search', { size: 17, color: 'var(--subtle)' });

const SUBJECT_COLORS = ['#4F46E5', '#0EA5E9', '#1C1C1E', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#14B8A6'];

function fetchSubjectsList(token) { return authedPost('/admin_subjects_catalog_list', token, {}).then(d => d.subjects || []); }
function createSubjectApi(token, input) { return authedPost('/admin_subjects_catalog_create', token, input).then(d => d.subject); }
function updateSubjectApi(token, subjectId, input) { return authedPost('/admin_subjects_catalog_update', token, Object.assign({ subject_id: subjectId }, input)).then(d => d.subject); }
function deleteSubjectApi(token, subjectId) { return authedPost('/admin_subjects_catalog_delete', token, { subject_id: subjectId }); }
function fetchDepartmentsPicker(token) { return authedPost('/admin_departments_list', token, {}).then(d => (d.departments || []).map(x => ({ id: x.id, name: x.name }))); }
function fetchCurriculaPicker(token) { return authedPost('/admin_curricula_list', token, {}).then(d => (d.curricula || []).map(x => ({ id: x.id, name: x.name }))); }

let allSubjects = [];
let statusFilter = 'all';
let searchQuery = '';
let searchTimer = null;
let subjectPickers = null;
let lastListRendered = false;

function renderList(token) {
  lastListRendered = true;
  const wrap = document.getElementById('listContent');
  const filtered = allSubjects.filter(s => {
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery = !q || (s.name || '').toLowerCase().includes(q) || (s.code || '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || (s.status || 'active') === statusFilter;
    return matchesQuery && matchesStatus;
  });

  if (filtered.length === 0) {
    wrap.innerHTML =
      '<div class="list-empty"><div class="list-empty-title">' +
      escapeHtml(allSubjects.length === 0 ? t('subjects_page.empty_title_none', 'No subjects yet') : t('subjects_page.empty_title_no_match', 'No matches for your search')) +
      '</div>' + (allSubjects.length === 0 ? '<div class="list-empty-sub">' + escapeHtml(t('subjects_page.empty_sub', 'Add your first subject to start building the catalog.')) + '</div>' : '') + '</div>';
    return;
  }

  wrap.innerHTML = '';
  filtered.forEach(s => {
    const color = s.color || SUBJECT_COLORS[Math.abs(s.id || 0) % SUBJECT_COLORS.length];
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'list-card';
    card.innerHTML =
      '<span class="list-avatar-wrap">' +
        '<span class="list-avatar-fallback" style="background:' + color + '">' + escapeHtml((s.short_name || s.name || '?').trim().charAt(0).toUpperCase()) + '</span>' +
        (s.status === 'inactive' ? '<span class="list-avatar-dot" style="background:#8E8E93"></span>' : '') +
      '</span>' +
      '<span class="list-card-body">' +
        '<span class="list-card-name">' + escapeHtml(s.name) + '</span>' +
        '<div class="list-card-meta">' + escapeHtml(s.code || '') + (s.units != null ? ' · ' + escapeHtml(t('subjects_page.units_suffix', '{n} units').replace('{n}', s.units)) : '') + '</div>' +
      '</span>' +
      icon('chevron', { size: 18, color: 'var(--subtle)' });
    card.addEventListener('click', () => openActions(token, s));
    wrap.appendChild(card);
  });
}
onLocaleChange(() => { if (lastListRendered) renderList(getStoredToken()); });

function openActions(token, s) {
  openActionSheet(s.name, [
    { icon: 'gear', label: t('subjects_page.edit_label', 'Edit'), desc: t('subjects_page.edit_desc', 'Change name, code, units, or status'), onPress: () => openSubjectSheet(token, s) },
    { icon: 'trash', label: t('subjects_page.delete_label', 'Delete'), desc: t('subjects_page.delete_desc', 'Remove this subject'), onPress: () => {
      if (!confirm(t('subjects_page.delete_confirm', 'Delete "{name}"?').replace('{name}', s.name))) return;
      deleteSubjectApi(token, s.id).then(() => { showToast(t('subjects_page.deleted_toast', 'Subject deleted.')); load(token); })
        .catch(err => showToast(err && err.message ? err.message : t('subjects_page.delete_failed', 'Could not delete. It may still be assigned to a class.')));
    }},
  ]);
}

document.getElementById('searchInput').addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { searchQuery = e.target.value; renderList(getStoredToken()); }, 200);
});
document.getElementById('filterBtn').addEventListener('click', () => {
  const opts = [{ key: 'all', label: t('subjects_page.filter_all', 'All subjects') }, { key: 'active', label: t('subjects_page.filter_active', 'Active') }, { key: 'inactive', label: t('subjects_page.filter_inactive', 'Inactive') }];
  openOptionSheet(t('subjects_page.filter_sheet_title', 'Filter'), opts, statusFilter, (key) => {
    statusFilter = key;
    document.getElementById('filterBtn').classList.toggle('active', key !== 'all');
    renderList(getStoredToken());
    return Promise.resolve();
  });
});

// ── Add / Edit sheet ──
function ensureSubjectPickers(token) {
  if (subjectPickers) return Promise.resolve(subjectPickers);
  return Promise.all([fetchDepartmentsPicker(token), fetchCurriculaPicker(token)]).then(([departments, curricula]) => {
    subjectPickers = { departments, curricula };
    return subjectPickers;
  });
}

function openSubjectSheet(token, existing) {
  let backdrop = document.getElementById('subjSheetBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'subjSheetBackdrop';
    backdrop.className = 'sheet-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) closeSubjectSheet(); });
  }
  backdrop.innerHTML = '<div class="sheet-panel form"><div class="sheet-handle"></div><div class="sheet-title">' + escapeHtml(t('common.loading', 'Loading…')) + '</div></div>';
  backdrop.classList.add('open');

  ensureSubjectPickers(token).then((pickers) => renderSubjectForm(token, backdrop, pickers, existing)).catch((err) => {
    closeSubjectSheet();
    showToast(err && err.message ? err.message : t('subjects_page.load_form_failed', 'Could not load the form.'));
  });
}
function closeSubjectSheet() { document.getElementById('subjSheetBackdrop')?.classList.remove('open'); }

function renderSubjectForm(token, backdrop, pickers, existing) {
  const isEditing = !!existing;
  let departmentId = existing ? existing.department_id : null;
  let curriculumId = existing ? existing.curriculum_id : null;
  let color = existing && existing.color ? existing.color : SUBJECT_COLORS[0];
  let status = existing ? existing.status : 'active';

  const noneLabel = t('subjects_page.none', 'None');
  const deptLabel = () => { const d = pickers.departments.find(d => d.id === departmentId); return d ? d.name : noneLabel; };
  const curricLabel = () => { const c = pickers.curricula.find(c => c.id === curriculumId); return c ? c.name : noneLabel; };

  backdrop.innerHTML =
    '<div class="sheet-panel form">' +
      '<div class="sheet-handle"></div>' +
      '<div class="sheet-title-row"><span class="sheet-title">' + escapeHtml(isEditing ? t('subjects_page.edit_title', 'Edit Subject') : t('subjects_page.add_title', 'Add Subject')) + '</span>' +
        '<button type="button" class="sheet-close-btn" id="sjCloseBtn">' + icon('close', { size: 16, color: 'var(--subtle)' }) + '</button></div>' +

      '<label class="util-label" style="margin-top:0;">' + escapeHtml(t('subjects_page.name_label', 'Name')) + '</label>' +
      '<input type="text" id="sjName" class="util-input" placeholder="' + escapeHtml(t('subjects_page.name_placeholder', 'e.g. Arabic Language')) + '" value="' + (existing ? escapeHtml(existing.name) : '') + '" />' +
      '<label class="util-label">' + escapeHtml(t('subjects_page.name_ar_label', 'Arabic Name (optional)')) + '</label>' +
      '<input type="text" id="sjNameAr" class="util-input" placeholder="اللغة العربية" value="' + (existing && existing.name_ar ? escapeHtml(existing.name_ar) : '') + '" />' +
      '<label class="util-label">' + escapeHtml(t('subjects_page.short_name_label', 'Short Name (optional)')) + '</label>' +
      '<input type="text" id="sjShort" class="util-input" placeholder="' + escapeHtml(t('subjects_page.short_name_placeholder', 'e.g. Arabic')) + '" value="' + (existing && existing.short_name ? escapeHtml(existing.short_name) : '') + '" />' +
      '<label class="util-label">' + escapeHtml(t('subjects_page.code_label', 'Code (optional)')) + '</label>' +
      '<input type="text" id="sjCode" class="util-input" placeholder="' + escapeHtml(t('subjects_page.code_placeholder', 'e.g. ARB101')) + '" value="' + (existing && existing.code ? escapeHtml(existing.code) : '') + '" />' +

      '<label class="util-label">' + escapeHtml(t('subjects_page.department_label', 'Department (optional)')) + '</label>' +
      '<button type="button" class="util-row" style="border:1px solid var(--card-border);border-radius:12px;background:#FAFBFA;" id="sjDeptBtn">' +
        '<span class="util-row-title" id="sjDeptLabel">' + escapeHtml(deptLabel()) + '</span>' + icon('chevron', { size: 16, color: 'var(--subtle)' }) +
      '</button>' +
      '<label class="util-label">' + escapeHtml(t('subjects_page.curriculum_label', 'Curriculum (optional)')) + '</label>' +
      '<button type="button" class="util-row" style="border:1px solid var(--card-border);border-radius:12px;background:#FAFBFA;" id="sjCurricBtn">' +
        '<span class="util-row-title" id="sjCurricLabel">' + escapeHtml(curricLabel()) + '</span>' + icon('chevron', { size: 16, color: 'var(--subtle)' }) +
      '</button>' +

      '<label class="util-label">' + escapeHtml(t('subjects_page.units_label', 'Units (optional)')) + '</label>' +
      '<input type="number" id="sjUnits" class="util-input" placeholder="' + escapeHtml(t('subjects_page.units_placeholder', 'e.g. 3')) + '" value="' + (existing && existing.units != null ? existing.units : '') + '" />' +
      '<label class="util-label">' + escapeHtml(t('subjects_page.passing_score_label', 'Passing Score (optional)')) + '</label>' +
      '<input type="number" id="sjPassing" class="util-input" placeholder="' + escapeHtml(t('subjects_page.passing_score_placeholder', 'e.g. 75')) + '" value="' + (existing && existing.passing_score != null ? existing.passing_score : '') + '" />' +

      '<label class="util-label">' + escapeHtml(t('subjects_page.color_label', 'Color')) + '</label>' +
      '<div class="stage-chip-row" id="sjColorRow">' +
        SUBJECT_COLORS.map(c => '<button type="button" class="theme-swatch' + (c === color ? ' active' : '') + '" data-color="' + c + '" style="background:' + c + ';width:30px;height:30px;border-radius:15px;"></button>').join('') +
      '</div>' +

      '<label class="util-label">' + escapeHtml(t('subjects_page.description_label', 'Description (optional)')) + '</label>' +
      '<input type="text" id="sjDesc" class="util-input" placeholder="' + escapeHtml(t('subjects_page.description_placeholder', 'Short description')) + '" value="' + (existing && existing.description ? escapeHtml(existing.description) : '') + '" />' +

      '<label class="util-row" style="padding:10px 0;">' +
        '<span class="util-row-title">' + escapeHtml(t('subjects_page.active_label', 'Active')) + '</span>' +
        '<span class="switch"><input type="checkbox" id="sjActive"' + (status === 'active' ? ' checked' : '') + '><span class="switch-track"></span></span>' +
      '</label>' +

      '<div class="sheet-form-error" id="sjFormError">' + icon('warning', { size: 14, color: '#B3261E' }) + '<span></span></div>' +

      '<div class="sheet-form-actions">' +
        '<button type="button" class="sheet-btn-secondary" id="sjCancelBtn">' + escapeHtml(t('common.cancel', 'Cancel')) + '</button>' +
        '<button type="button" class="sheet-btn-primary" id="sjSubmitBtn"><span id="sjSubmitLabel">' + escapeHtml(isEditing ? t('subjects_page.save_changes', 'Save Changes') : t('subjects_page.add_title', 'Add Subject')) + '</span></button>' +
      '</div>' +
    '</div>';

  document.getElementById('sjCloseBtn').addEventListener('click', closeSubjectSheet);
  document.getElementById('sjCancelBtn').addEventListener('click', closeSubjectSheet);

  document.getElementById('sjColorRow').querySelectorAll('.theme-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      color = btn.dataset.color;
      document.getElementById('sjColorRow').querySelectorAll('.theme-swatch').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  document.getElementById('sjDeptBtn').addEventListener('click', () => {
    const opts = [{ key: '', label: noneLabel }, ...pickers.departments.map(d => ({ key: String(d.id), label: d.name }))];
    openOptionSheet(t('subjects_page.department_sheet_title', 'Department'), opts, departmentId ? String(departmentId) : '', (key) => {
      departmentId = key ? Number(key) : null;
      document.getElementById('sjDeptLabel').textContent = deptLabel();
      return Promise.resolve();
    });
  });
  document.getElementById('sjCurricBtn').addEventListener('click', () => {
    const opts = [{ key: '', label: noneLabel }, ...pickers.curricula.map(c => ({ key: String(c.id), label: c.name }))];
    openOptionSheet(t('subjects_page.curriculum_sheet_title', 'Curriculum'), opts, curriculumId ? String(curriculumId) : '', (key) => {
      curriculumId = key ? Number(key) : null;
      document.getElementById('sjCurricLabel').textContent = curricLabel();
      return Promise.resolve();
    });
  });

  document.getElementById('sjSubmitBtn').addEventListener('click', () => {
    const name = document.getElementById('sjName').value.trim();
    const errorEl = document.getElementById('sjFormError');
    const setError = (msg) => { errorEl.querySelector('span').textContent = msg; errorEl.classList.add('show'); };
    errorEl.classList.remove('show');
    if (!name) { setError(t('subjects_page.name_required', 'A name is required.')); return; }
    const unitsVal = document.getElementById('sjUnits').value.trim();
    const passingVal = document.getElementById('sjPassing').value.trim();

    const input = {
      name,
      name_ar: document.getElementById('sjNameAr').value.trim() || null,
      short_name: document.getElementById('sjShort').value.trim() || null,
      code: document.getElementById('sjCode').value.trim() || null,
      department_id: departmentId,
      curriculum_id: curriculumId,
      units: unitsVal ? Number(unitsVal) : null,
      passing_score: passingVal ? Number(passingVal) : null,
      color,
      description: document.getElementById('sjDesc').value.trim() || null,
      status: document.getElementById('sjActive').checked ? 'active' : 'inactive',
    };

    const btn = document.getElementById('sjSubmitBtn');
    const label = document.getElementById('sjSubmitLabel');
    btn.disabled = true; label.innerHTML = '<span class="util-spinner"></span>';

    const req = isEditing ? updateSubjectApi(token, existing.id, input) : createSubjectApi(token, input);
    req.then(() => {
      closeSubjectSheet();
      showToast(isEditing ? t('subjects_page.updated_toast', 'Subject updated.') : t('subjects_page.added_toast', 'Subject added.'));
      load(token);
      if (!isEditing) notifySetupItemSaved(token);
    }).catch((err) => {
      const msg = err && err.message ? err.message : t('subjects_page.save_failed', 'Could not save subject.');
      setError(msg);
      showToast(msg);
    }).finally(() => {
      btn.disabled = false;
      label.textContent = isEditing ? t('subjects_page.save_changes', 'Save Changes') : t('subjects_page.add_title', 'Add Subject');
    });
  });
}

function load(token) {
  document.getElementById('listContent').innerHTML = '<div class="list-loading">' + escapeHtml(t('common.loading', 'Loading…')) + '</div>';
  fetchSubjectsList(token).then((subjects) => {
    allSubjects = subjects;
    renderList(token);
  }).catch(() => {
    lastListRendered = false;
    document.getElementById('listContent').innerHTML =
      '<div class="list-error">' + escapeHtml(t('subjects_page.load_failed', 'Failed to load subjects.')) + '<br><button type="button" class="list-retry-btn" id="retryBtn">' + escapeHtml(t('common.retry', 'Try again')) + '</button></div>';
    document.getElementById('retryBtn')?.addEventListener('click', () => load(token));
  });
}

guardDashboard('admin', function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  load(token);
});
