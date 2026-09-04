// Admin: Classes & Sections — web port of src/screens/teachers/ClassListScreen.tsx
// (browse/search/filter) plus the Basics fields of the RN class wizard
// (adminService.ts: admin_classes_list/_reference_data/_detail/_create/_update).
// Sections themselves stay a RN-only drill-in for now (ClassDetail) - this
// page covers the class record, which is what the admin dashboard's Manage
// tile actually points at.

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(t('classes_sections.title', 'Classes & Sections'), t('classes_sections.subtitle', 'Create classes and sections for this school.'), 'admin-dashboard.php', {
      label: t('classes_sections.add_action', '+ Add'), onClick: () => openClassSheet(getStoredToken()),
    });
}
renderHeaderText();
onLocaleChange(renderHeaderText);
document.getElementById('filterIcon').innerHTML = icon('filter', { size: 15, color: 'var(--ink)' });
document.getElementById('searchIcon').innerHTML = icon('search', { size: 17, color: 'var(--subtle)' });

const STATUS_COLORS = { active: 'var(--ink)', pending: '#D97706', closed: '#8E8E93', archived: '#EF4444' };
function statusLabel(code) {
  const fallback = { active: 'Active', pending: 'Pending', closed: 'Closed', archived: 'Archived' }[code] || code;
  return t('classes_sections.status_' + code, fallback);
}
const SHIFT_VALUES = ['morning', 'afternoon', 'evening', 'full_day'];
function shiftOptions() {
  const fallback = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', full_day: 'Full Day' };
  return SHIFT_VALUES.map(v => ({ value: v, label: t('classes_sections.shift_' + v, fallback[v]) }));
}
const TYPE_VALUES = ['face-to-face', 'online', 'hybrid'];
function typeOptions() {
  const fallback = { 'face-to-face': 'Face-to-Face', online: 'Online', hybrid: 'Hybrid' };
  const keySuffix = { 'face-to-face': 'face_to_face', online: 'online', hybrid: 'hybrid' };
  return TYPE_VALUES.map(v => ({ value: v, label: t('classes_sections.type_' + keySuffix[v], fallback[v]) }));
}
function statusOptions() { return ['active', 'pending', 'closed', 'archived'].map(v => ({ value: v, label: statusLabel(v) })); }
function formatShiftLabel(shift) { return t('classes_sections.shift_' + shift, (shift || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())); }
function formatTypeLabel(type) {
  const keySuffix = { 'face-to-face': 'face_to_face', online: 'online', hybrid: 'hybrid' }[type];
  return keySuffix ? t('classes_sections.type_' + keySuffix, type) : (type || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── Data ──
function fetchClassesList(token, opts) {
  return authedPost('/admin_classes_list', token, {
    search: (opts && opts.search) || '',
    status: (opts && opts.status) || undefined,
    page: 1,
    per_page: 50,
    sort_by: 'grade_level',
    sort_order: 'asc',
  }).then(d => d.classes || []);
}
function fetchClassReferenceDataAdmin(token) {
  return authedPost('/admin_classes_reference_data', token, {}).then(d => ({
    departments: d.departments || [],
    campuses: d.campuses || [],
    curricula: d.curricula || [],
    school_years: d.school_years || [],
    semester_terms: d.semester_terms || [],
  }));
}
function fetchClassDetail(token, classId) {
  return authedPost('/admin_classes_detail', token, { class_id: classId }).then(d => d.class);
}
function createClass(token, input) {
  return authedPost('/admin_classes_create', token, input).then(d => d.class);
}
function updateClass(token, classId, input) {
  return authedPost('/admin_classes_update', token, Object.assign({ class_id: classId }, input)).then(d => d.class);
}
function schoolYearLabel(sy) { return sy.session_title || sy.title || sy.name || (t('classes_sections.year_fallback', 'Year {n}').replace('{n}', sy.id)); }

// ── Sections (full CRUD - admin_sections_list/_create/_update/_delete,
// distinct from the simpler read-only admin_section_list the admission
// wizard's picker uses). Was never wired up on the web despite this
// page's own title/subtitle promising it - RN's ClassDetail screen was
// the only place that ever managed sections, until now. ──
function fetchSectionsForClass(token, classId) {
  return authedPost('/admin_sections_list', token, { class_id: classId }).then(d => d.sections || []);
}
function createSection(token, input) {
  return authedPost('/admin_sections_create', token, input).then(d => d.section);
}
function updateSection(token, sectionId, input) {
  return authedPost('/admin_sections_update', token, Object.assign({ section_id: sectionId }, input)).then(d => d.section);
}
function deleteSection(token, sectionId) {
  return authedPost('/admin_sections_delete', token, { section_id: sectionId });
}

let allClasses = [];
let statusFilter = 'all';
let searchQuery = '';
let searchTimer = null;
let refData = null;
let lastListRendered = false;

function renderList(token) {
  lastListRendered = true;
  const wrap = document.getElementById('listContent');
  const filtered = allClasses.filter(c => {
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery = !q || (c.name || '').toLowerCase().includes(q) || (c.class_code || '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || (c.status || 'active') === statusFilter;
    return matchesQuery && matchesStatus;
  });

  if (filtered.length === 0) {
    wrap.innerHTML =
      '<div class="list-empty">' +
        '<div class="list-empty-title">' + escapeHtml(allClasses.length === 0 ? t('classes_sections.empty_title_none', 'No classes yet') : t('classes_sections.empty_title_no_match', 'No matches for your search')) + '</div>' +
        (allClasses.length === 0 ? '<div class="list-empty-sub">' + escapeHtml(t('classes_sections.empty_sub', 'Add your first class to start building the roster.')) + '</div>' : '') +
      '</div>';
    return;
  }

  wrap.innerHTML = '';
  filtered.forEach(c => {
    const color = STATUS_COLORS[c.status || 'active'] || STATUS_COLORS.active;
    const card = document.createElement('div');
    card.className = 'list-card class-card';
    card.innerHTML =
      '<button type="button" class="class-card-main">' +
        '<span class="list-avatar-wrap">' +
          '<span class="list-avatar-fallback">' + escapeHtml(String(c.grade_level ?? '?')) + '</span>' +
          '<span class="list-avatar-dot" style="background:' + color + '"></span>' +
        '</span>' +
        '<span class="list-card-body">' +
          '<span class="list-card-name">' + escapeHtml(c.name || t('classes_sections.unnamed_class', 'Unnamed class')) + '</span>' +
          '<div class="list-card-meta">' + escapeHtml(c.class_code || '') + (c.campus ? ' · ' + escapeHtml(c.campus) : '') + '</div>' +
          '<div class="chip-row">' +
            '<span class="mini-chip ok">' + icon('layers', { size: 12, color: 'var(--ink)' }) + (c.current_enrollment ?? 0) + ' / ' + (c.max_capacity ?? '—') + '</span>' +
            '<span class="mini-chip warn">' + icon('clock', { size: 12, color: '#D97706' }) + escapeHtml(formatShiftLabel(c.shift)) + '</span>' +
          '</div>' +
        '</span>' +
        icon('chevron', { size: 18, color: 'var(--subtle)' }) +
      '</button>' +
      '<div class="class-card-footer">' +
        '<button type="button" class="class-card-sections-btn">' + icon('grid', { size: 14, color: 'var(--emerald-deep)' }) + ' ' + escapeHtml(t('classes_sections.sections_label', 'Sections')) + '</button>' +
      '</div>';
    card.querySelector('.class-card-main').addEventListener('click', () => openClassActions(token, c));
    card.querySelector('.class-card-sections-btn').addEventListener('click', () => openSectionsSheet(token, c));
    wrap.appendChild(card);
  });
}
onLocaleChange(() => { if (lastListRendered) renderList(getStoredToken()); });

function openClassActions(token, c) {
  const meta = { label: statusLabel(c.status || 'active') };
  openActionSheet(c.name, [
    { icon: 'layers', label: t('classes_sections.details_label', 'Details'), desc: c.school_year ? t('classes_sections.details_desc_year', 'School year: {year}').replace('{year}', c.school_year) : t('classes_sections.details_desc_default', 'View class details'), onPress: () => showClassDetails(c, meta) },
    { icon: 'grid', label: t('classes_sections.sections_label', 'Sections'), desc: t('classes_sections.sections_desc', 'View, add, or edit this class’s sections'), onPress: () => openSectionsSheet(token, c) },
    { icon: 'gear', label: t('classes_sections.edit_label', 'Edit'), desc: t('classes_sections.edit_desc', 'Change capacity, dates, status and more'), onPress: () => openClassSheet(token, c) },
  ]);
}

function showClassDetails(c, meta) {
  const rows = [
    [t('classes_sections.class_code_label', 'Class Code'), c.class_code],
    [t('classes_sections.grade_level_label', 'Grade Level'), c.grade_level != null ? String(c.grade_level) : null],
    [t('classes_sections.campus_col_label', 'Campus'), c.campus],
    [t('classes_sections.school_year_label', 'School Year'), c.school_year],
    [t('classes_sections.shift_label', 'Shift'), formatShiftLabel(c.shift)],
    [t('classes_sections.type_label', 'Type'), formatTypeLabel(c.class_type)],
    [t('classes_sections.capacity_label', 'Capacity'), (c.current_enrollment ?? 0) + ' / ' + (c.max_capacity ?? '—')],
    [t('classes_sections.status_label', 'Status'), meta.label],
  ].filter(([, v]) => !!v);
  openActionSheet(c.name, rows.map(([label, value]) => ({ icon: 'idcard', label: value, desc: label, onPress: () => {} })));
}

document.getElementById('searchInput').addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { searchQuery = e.target.value; renderList(getStoredToken()); }, 200);
});

document.getElementById('filterBtn').addEventListener('click', () => {
  const opts = [{ key: 'all', label: t('classes_sections.filter_all', 'All classes') }, ...statusOptions().map(o => ({ key: o.value, label: o.label }))];
  openOptionSheet(t('classes_sections.filter_sheet_title', 'Filter'), opts, statusFilter, (key) => {
    statusFilter = key;
    document.getElementById('filterBtn').classList.toggle('active', key !== 'all');
    renderList(getStoredToken());
    return Promise.resolve();
  });
});

// ── Add / Edit Class sheet ──
function openClassSheet(token, existingSummary) {
  let backdrop = document.getElementById('classSheetBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'classSheetBackdrop';
    backdrop.className = 'sheet-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) closeClassSheet(); });
  }
  backdrop.innerHTML = '<div class="sheet-panel form"><div class="sheet-handle"></div><div class="sheet-title">' + escapeHtml(t('common.loading', 'Loading…')) + '</div></div>';
  backdrop.classList.add('open');

  const refDataPromise = refData ? Promise.resolve(refData) : fetchClassReferenceDataAdmin(token).then(d => { refData = d; return d; });
  const detailPromise = existingSummary ? fetchClassDetail(token, existingSummary.id) : Promise.resolve(null);

  Promise.all([refDataPromise, detailPromise]).then(([ref, record]) => {
    renderClassForm(token, backdrop, ref, record);
  }).catch((err) => {
    closeClassSheet();
    showToast(err && err.message ? err.message : t('classes_sections.load_form_failed', 'Could not load the class form.'));
  });
}
function closeClassSheet() {
  document.getElementById('classSheetBackdrop')?.classList.remove('open');
}

function chipRowHtml(idPrefix, options, selectedValue) {
  return '<div class="stage-chip-row" id="' + idPrefix + 'Row">' +
    options.map(o =>
      '<button type="button" class="stage-chip' + (o.value === selectedValue ? ' selected' : '') + '" data-value="' + escapeHtml(o.value) + '">' + escapeHtml(o.label) + '</button>'
    ).join('') +
  '</div>';
}
function wireChipRow(idPrefix, onSelect) {
  const row = document.getElementById(idPrefix + 'Row');
  row.querySelectorAll('.stage-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      row.querySelectorAll('.stage-chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      onSelect(chip.dataset.value);
    });
  });
}

function renderClassForm(token, backdrop, ref, record) {
  const isEditing = !!record;
  let shift = record ? record.shift : 'morning';
  let classType = record ? record.class_type : 'face-to-face';
  let status = record ? record.status : 'active';
  let schoolYearId = record ? record.school_year_id : (ref.school_years[0] ? ref.school_years[0].id : null);
  let campusId = record ? record.campus_id : null;

  const noneLabel = t('classes_sections.none', 'None');
  const schoolYearLabelText = () => {
    const sy = ref.school_years.find(s => s.id === schoolYearId);
    return sy ? schoolYearLabel(sy) : t('classes_sections.select_school_year', 'Select school year');
  };
  const campusLabelText = () => {
    const c = ref.campuses.find(c => c.id === campusId);
    return c ? c.name : noneLabel;
  };

  backdrop.innerHTML =
    '<div class="sheet-panel form">' +
      '<div class="sheet-handle"></div>' +
      '<div class="sheet-title-row"><span class="sheet-title">' + escapeHtml(isEditing ? t('classes_sections.edit_title', 'Edit Class') : t('classes_sections.add_title', 'Add Class')) + '</span>' +
        '<button type="button" class="sheet-close-btn" id="clCloseBtn">' + icon('close', { size: 16, color: 'var(--subtle)' }) + '</button></div>' +

      '<label class="util-label" style="margin-top:0;">' + escapeHtml(t('classes_sections.class_code_label', 'Class Code')) + '</label>' +
      '<input type="text" id="clCode" class="util-input" placeholder="' + escapeHtml(t('classes_sections.class_code_placeholder', 'e.g. G7-A')) + '" value="' + (record ? escapeHtml(record.class_code) : '') + '" />' +

      '<label class="util-label">' + escapeHtml(t('classes_sections.name_label', 'Name')) + '</label>' +
      '<input type="text" id="clName" class="util-input" placeholder="' + escapeHtml(t('classes_sections.name_placeholder', 'e.g. Grade 7 - Section A')) + '" value="' + (record ? escapeHtml(record.name) : '') + '" />' +

      '<label class="util-label">' + escapeHtml(t('classes_sections.grade_level_label', 'Grade Level')) + '</label>' +
      '<input type="number" id="clGrade" class="util-input" placeholder="' + escapeHtml(t('classes_sections.grade_level_placeholder', 'e.g. 7')) + '" value="' + (record ? record.grade_level : '') + '" />' +

      '<label class="util-label">' + escapeHtml(t('classes_sections.section_label_optional', 'Section (optional)')) + '</label>' +
      '<input type="text" id="clSection" class="util-input" placeholder="' + escapeHtml(t('classes_sections.section_placeholder', 'e.g. A')) + '" value="' + (record && record.section ? escapeHtml(record.section) : '') + '" />' +
      '<div class="util-hint">' + escapeHtml(isEditing
        ? t('classes_sections.section_hint_editing', 'A short label for this class (e.g. "A"). Manage real sections - with capacity, room, and adviser - from the Sections button on this class.')
        : t('classes_sections.section_hint_new', 'A short label for this class (e.g. "A"). Full sections with capacity, room, and adviser can be added once this class is created.')) + '</div>' +

      '<label class="util-label">' + escapeHtml(t('classes_sections.school_year_label', 'School Year')) + '</label>' +
      '<button type="button" class="util-row" style="border:1px solid var(--card-border);border-radius:12px;background:#FAFBFA;" id="clYearBtn">' +
        '<span class="util-row-title" id="clYearLabel">' + escapeHtml(schoolYearLabelText()) + '</span>' + icon('chevron', { size: 16, color: 'var(--subtle)' }) +
      '</button>' +

      '<label class="util-label">' + escapeHtml(t('classes_sections.campus_label', 'Campus (optional)')) + '</label>' +
      '<button type="button" class="util-row" style="border:1px solid var(--card-border);border-radius:12px;background:#FAFBFA;" id="clCampusBtn">' +
        '<span class="util-row-title" id="clCampusLabel">' + escapeHtml(campusLabelText()) + '</span>' + icon('chevron', { size: 16, color: 'var(--subtle)' }) +
      '</button>' +

      '<label class="util-label">' + escapeHtml(t('classes_sections.shift_label', 'Shift')) + '</label>' + chipRowHtml('clShift', shiftOptions(), shift) +
      '<label class="util-label">' + escapeHtml(t('classes_sections.type_label', 'Type')) + '</label>' + chipRowHtml('clType', typeOptions(), classType) +

      '<label class="util-label">' + escapeHtml(t('classes_sections.max_capacity_label', 'Max Capacity')) + '</label>' +
      '<input type="number" id="clCapacity" class="util-input" placeholder="' + escapeHtml(t('classes_sections.max_capacity_placeholder', 'e.g. 30')) + '" value="' + (record ? record.max_capacity : '') + '" />' +

      '<label class="util-label">' + escapeHtml(t('classes_sections.start_date_label', 'Start Date')) + '</label>' +
      '<input type="date" id="clStart" class="util-input" value="' + (record && record.start_date ? record.start_date.slice(0, 10) : '') + '" />' +
      '<label class="util-label">' + escapeHtml(t('classes_sections.end_date_label', 'End Date')) + '</label>' +
      '<input type="date" id="clEnd" class="util-input" value="' + (record && record.end_date ? record.end_date.slice(0, 10) : '') + '" />' +

      '<label class="util-label">' + escapeHtml(t('classes_sections.status_label', 'Status')) + '</label>' + chipRowHtml('clStatus', statusOptions(), status) +

      '<div class="sheet-form-error" id="clFormError">' + icon('warning', { size: 14, color: '#B3261E' }) + '<span></span></div>' +

      '<div class="sheet-form-actions">' +
        '<button type="button" class="sheet-btn-secondary" id="clCancelBtn">' + escapeHtml(t('common.cancel', 'Cancel')) + '</button>' +
        '<button type="button" class="sheet-btn-primary" id="clSubmitBtn"><span id="clSubmitLabel">' + escapeHtml(isEditing ? t('classes_sections.save_changes', 'Save Changes') : t('classes_sections.add_title', 'Add Class')) + '</span></button>' +
      '</div>' +
    '</div>';

  document.getElementById('clCloseBtn').addEventListener('click', closeClassSheet);
  document.getElementById('clCancelBtn').addEventListener('click', closeClassSheet);

  wireChipRow('clShift', v => { shift = v; });
  wireChipRow('clType', v => { classType = v; });
  wireChipRow('clStatus', v => { status = v; });

  document.getElementById('clYearBtn').addEventListener('click', () => {
    openOptionSheet(t('classes_sections.school_year_label', 'School Year'), ref.school_years.map(sy => ({ key: String(sy.id), label: schoolYearLabel(sy) })), String(schoolYearId), (key) => {
      schoolYearId = Number(key);
      document.getElementById('clYearLabel').textContent = schoolYearLabelText();
      return Promise.resolve();
    });
  });
  document.getElementById('clCampusBtn').addEventListener('click', () => {
    const opts = [{ key: '', label: noneLabel }, ...ref.campuses.map(c => ({ key: String(c.id), label: c.name }))];
    openOptionSheet(t('classes_sections.campus_sheet_title', 'Campus'), opts, campusId ? String(campusId) : '', (key) => {
      campusId = key ? Number(key) : null;
      document.getElementById('clCampusLabel').textContent = campusLabelText();
      return Promise.resolve();
    });
  });

  document.getElementById('clSubmitBtn').addEventListener('click', () => {
    const classCode = document.getElementById('clCode').value.trim();
    const name = document.getElementById('clName').value.trim();
    const grade = parseInt(document.getElementById('clGrade').value, 10);
    const sectionText = document.getElementById('clSection').value.trim();
    const capacity = parseInt(document.getElementById('clCapacity').value, 10);
    const startDate = document.getElementById('clStart').value;
    const endDate = document.getElementById('clEnd').value;

    const errorEl = document.getElementById('clFormError');
    const setError = (msg) => { errorEl.querySelector('span').textContent = msg; errorEl.classList.add('show'); };
    errorEl.classList.remove('show');

    if (!classCode || !name) { setError(t('classes_sections.err_code_name_required', 'Class code and name are required.')); return; }
    if (!Number.isFinite(grade)) { setError(t('classes_sections.err_grade_required', 'Grade level is required.')); return; }
    if (!schoolYearId) { setError(t('classes_sections.err_pick_year', 'Pick a school year.')); return; }
    if (!Number.isFinite(capacity) || capacity <= 0) { setError(t('classes_sections.err_capacity', 'Max capacity must be a positive number.')); return; }
    if (!startDate || !endDate) { setError(t('classes_sections.err_dates_required', 'Start and end dates are required.')); return; }

    const input = {
      class_code: classCode,
      name,
      grade_level: grade,
      section: sectionText || null,
      school_year_id: schoolYearId,
      campus_id: campusId,
      shift,
      class_type: classType,
      max_capacity: capacity,
      status,
      start_date: startDate,
      end_date: endDate,
    };

    const btn = document.getElementById('clSubmitBtn');
    const label = document.getElementById('clSubmitLabel');
    btn.disabled = true;
    label.innerHTML = '<span class="util-spinner"></span>';

    const req = isEditing ? updateClass(token, record.id, input) : createClass(token, input);
    req.then(() => {
      closeClassSheet();
      showToast(isEditing ? t('classes_sections.updated_toast', 'Class updated.') : t('classes_sections.added_toast', 'Class added.'));
      load(token);
      if (!isEditing) notifySetupItemSaved(token);
    }).catch((err) => {
      const msg = err && err.message ? err.message : t('classes_sections.save_failed', 'Could not save class.');
      setError(msg);
      showToast(msg);
    }).finally(() => {
      btn.disabled = false;
      label.textContent = isEditing ? t('classes_sections.save_changes', 'Save Changes') : t('classes_sections.add_title', 'Add Class');
    });
  });
}

// ── Sections list sheet ──
let sectionsClassRecord = null;
let sectionsList = [];
let sectionsTeachers = null; // fetchTeacherList(token) result, cached across opens

function sectionRowHtml(s) {
  const statusColor = (s.status || 'active') === 'inactive' ? '#8E8E93' : 'var(--emerald)';
  const capacityText = s.capacity ? ((s.current_enrollment ?? 0) + ' / ' + s.capacity) : String(s.current_enrollment ?? 0);
  const metaParts = [t('classes_sections.students_count', '{count} students').replace('{count}', capacityText)];
  if (s.class_teacher_name) metaParts.push(s.class_teacher_name);
  if (s.room_number) metaParts.push(s.room_number);
  return '<div class="adm-list-row">' +
      '<button type="button" class="section-row-edit" data-id="' + s.id + '">' +
        '<span class="section-row-dot" style="background:' + statusColor + ';"></span>' +
        '<span class="adm-list-row-text"><div class="adm-list-row-title">' + escapeHtml(s.name) + '</div>' +
          '<div class="adm-list-row-meta">' + escapeHtml(metaParts.join(' · ')) + '</div></span>' +
      '</button>' +
      '<button type="button" class="adm-list-row-delete" data-id="' + s.id + '">' + icon('trash', { size: 16, color: '#EF4444' }) + '</button>' +
    '</div>';
}

function openSectionsSheet(token, classRecord) {
  sectionsClassRecord = classRecord;
  let backdrop = document.getElementById('sectionsSheetBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'sectionsSheetBackdrop';
    backdrop.className = 'sheet-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) closeSectionsSheet(); });
  }
  backdrop.innerHTML = '<div class="sheet-panel form"><div class="sheet-handle"></div><div class="sheet-title">' + escapeHtml(t('common.loading', 'Loading…')) + '</div></div>';
  backdrop.classList.add('open');
  loadSectionsList(token);
}
function closeSectionsSheet() {
  document.getElementById('sectionsSheetBackdrop')?.classList.remove('open');
}
function loadSectionsList(token) {
  fetchSectionsForClass(token, sectionsClassRecord.id).then(sections => {
    sectionsList = sections;
    renderSectionsSheet(token);
  }).catch(() => {
    showToast(t('classes_sections.sections_load_failed', 'Could not load sections.'));
    closeSectionsSheet();
  });
}
function renderSectionsSheet(token) {
  const backdrop = document.getElementById('sectionsSheetBackdrop');
  if (!backdrop) return;
  const rowsHtml = sectionsList.length
    ? sectionsList.map(sectionRowHtml).join('')
    : '<div class="doc-empty-card">' + escapeHtml(t('classes_sections.no_sections', 'No sections yet - add one to start enrolling students into this class.')) + '</div>';

  backdrop.innerHTML =
    '<div class="sheet-panel form">' +
      '<div class="sheet-handle"></div>' +
      '<div class="sheet-title-row"><span class="sheet-title">' + escapeHtml(t('classes_sections.sections_sheet_title', 'Sections')) + '</span>' +
        '<button type="button" class="sheet-close-btn" id="secCloseBtn">' + icon('close', { size: 16, color: 'var(--subtle)' }) + '</button></div>' +
      '<div class="util-label" style="margin-top:0;">' + escapeHtml(sectionsClassRecord.name) + '</div>' +
      '<div id="sectionsListWrap">' + rowsHtml + '</div>' +
      '<button type="button" class="adm-add-btn" id="secAddBtn">' + icon('plus', { size: 14, color: 'var(--emerald-deep)' }) + ' ' + escapeHtml(t('classes_sections.add_section_action', 'Add Section')) + '</button>' +
    '</div>';

  document.getElementById('secCloseBtn').addEventListener('click', closeSectionsSheet);
  document.getElementById('secAddBtn').addEventListener('click', () => openSectionFormSheet(token, null));
  document.querySelectorAll('.section-row-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const section = sectionsList.find(s => s.id === Number(btn.dataset.id));
      if (section) openSectionFormSheet(token, section);
    });
  });
  document.querySelectorAll('.adm-list-row-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const section = sectionsList.find(s => s.id === Number(btn.dataset.id));
      if (section) confirmDeleteSection(token, section);
    });
  });
}

// ── Add / Edit Section form (same sheet, swapped in over the list) ──
function openSectionFormSheet(token, existingSection) {
  const isEditing = !!existingSection;
  const backdrop = document.getElementById('sectionsSheetBackdrop');
  if (!backdrop) return;

  const renderForm = (teachers) => {
    let teacherId = existingSection ? existingSection.class_teacher_id : null;
    let status = existingSection ? (existingSection.status || 'active') : 'active';
    const noneLabel = t('classes_sections.none', 'None');
    const teacherLabelText = () => {
      const tch = teachers.find(x => x.id === teacherId);
      return tch ? tch.name : noneLabel;
    };
    const statusOptionsForSection = [
      { value: 'active', label: statusLabel('active') },
      { value: 'inactive', label: t('classes_sections.status_inactive_section', 'Inactive') },
    ];

    backdrop.innerHTML =
      '<div class="sheet-panel form">' +
        '<div class="sheet-handle"></div>' +
        '<div class="sheet-title-row"><span class="sheet-title">' + escapeHtml(isEditing ? t('classes_sections.edit_section_title', 'Edit Section') : t('classes_sections.add_section_title', 'Add Section')) + '</span>' +
          '<button type="button" class="sheet-close-btn" id="sfCloseBtn">' + icon('close', { size: 16, color: 'var(--subtle)' }) + '</button></div>' +

        '<label class="util-label" style="margin-top:0;">' + escapeHtml(t('classes_sections.section_name_label', 'Section Name')) + '</label>' +
        '<input type="text" id="sfName" class="util-input" placeholder="' + escapeHtml(t('classes_sections.section_name_placeholder', 'e.g. A')) + '" value="' + (existingSection ? escapeHtml(existingSection.name) : '') + '" />' +

        '<label class="util-label">' + escapeHtml(t('classes_sections.class_teacher_label', 'Class Teacher (optional)')) + '</label>' +
        '<button type="button" class="util-row" style="border:1px solid var(--card-border);border-radius:12px;background:#FAFBFA;" id="sfTeacherBtn">' +
          '<span class="util-row-title" id="sfTeacherLabel">' + escapeHtml(teacherLabelText()) + '</span>' + icon('chevron', { size: 16, color: 'var(--subtle)' }) +
        '</button>' +

        '<label class="util-label">' + escapeHtml(t('classes_sections.capacity_optional_label', 'Capacity (optional)')) + '</label>' +
        '<input type="number" id="sfCapacity" class="util-input" placeholder="' + escapeHtml(t('classes_sections.max_capacity_placeholder', 'e.g. 30')) + '" value="' + (existingSection && existingSection.capacity ? existingSection.capacity : '') + '" />' +

        '<label class="util-label">' + escapeHtml(t('classes_sections.room_number_label', 'Room Number (optional)')) + '</label>' +
        '<input type="text" id="sfRoom" class="util-input" placeholder="' + escapeHtml(t('classes_sections.room_number_placeholder', 'e.g. 204')) + '" value="' + (existingSection && existingSection.room_number ? escapeHtml(existingSection.room_number) : '') + '" />' +

        '<label class="util-label">' + escapeHtml(t('classes_sections.status_label', 'Status')) + '</label>' + chipRowHtml('sfStatus', statusOptionsForSection, status) +

        '<div class="sheet-form-error" id="sfFormError">' + icon('warning', { size: 14, color: '#B3261E' }) + '<span></span></div>' +

        '<div class="sheet-form-actions">' +
          '<button type="button" class="sheet-btn-secondary" id="sfCancelBtn">' + escapeHtml(t('common.cancel', 'Cancel')) + '</button>' +
          '<button type="button" class="sheet-btn-primary" id="sfSubmitBtn"><span id="sfSubmitLabel">' + escapeHtml(isEditing ? t('classes_sections.save_changes', 'Save Changes') : t('classes_sections.add_section_title', 'Add Section')) + '</span></button>' +
        '</div>' +
      '</div>';

    document.getElementById('sfCloseBtn').addEventListener('click', () => openSectionsSheet(token, sectionsClassRecord));
    document.getElementById('sfCancelBtn').addEventListener('click', () => openSectionsSheet(token, sectionsClassRecord));
    wireChipRow('sfStatus', v => { status = v; });

    document.getElementById('sfTeacherBtn').addEventListener('click', () => {
      const opts = [{ key: '', label: noneLabel }, ...teachers.map(tch => ({ key: String(tch.id), label: tch.name }))];
      openOptionSheet(t('classes_sections.class_teacher_label', 'Class Teacher (optional)'), opts, teacherId ? String(teacherId) : '', (key) => {
        teacherId = key ? Number(key) : null;
        document.getElementById('sfTeacherLabel').textContent = teacherLabelText();
        return Promise.resolve();
      });
    });

    document.getElementById('sfSubmitBtn').addEventListener('click', () => {
      const name = document.getElementById('sfName').value.trim();
      const capacityRaw = document.getElementById('sfCapacity').value;
      const capacity = capacityRaw ? parseInt(capacityRaw, 10) : null;
      const room = document.getElementById('sfRoom').value.trim();

      const errorEl = document.getElementById('sfFormError');
      const setError = (msg) => { errorEl.querySelector('span').textContent = msg; errorEl.classList.add('show'); };
      errorEl.classList.remove('show');

      if (!name) { setError(t('classes_sections.err_section_name_required', 'Section name is required.')); return; }
      if (capacityRaw && (!Number.isFinite(capacity) || capacity <= 0)) { setError(t('classes_sections.err_capacity', 'Max capacity must be a positive number.')); return; }

      const input = {
        class_id: sectionsClassRecord.id,
        name,
        class_teacher_id: teacherId,
        capacity: capacity || null,
        room_number: room || null,
        status,
      };

      const btn = document.getElementById('sfSubmitBtn');
      const label = document.getElementById('sfSubmitLabel');
      btn.disabled = true;
      label.innerHTML = '<span class="util-spinner"></span>';

      const req = isEditing ? updateSection(token, existingSection.id, input) : createSection(token, input);
      req.then(() => {
        showToast(isEditing ? t('classes_sections.section_updated_toast', 'Section updated.') : t('classes_sections.section_added_toast', 'Section added.'));
        openSectionsSheet(token, sectionsClassRecord);
      }).catch((err) => {
        const msg = (err && err.message) || t('classes_sections.section_save_failed', 'Could not save section.');
        setError(msg);
        showToast(msg);
        btn.disabled = false;
        label.textContent = isEditing ? t('classes_sections.save_changes', 'Save Changes') : t('classes_sections.add_section_title', 'Add Section');
      });
    });
  };

  if (sectionsTeachers) {
    renderForm(sectionsTeachers);
  } else {
    backdrop.innerHTML = '<div class="sheet-panel form"><div class="sheet-handle"></div><div class="sheet-title">' + escapeHtml(t('common.loading', 'Loading…')) + '</div></div>';
    fetchTeacherList(token).then(list => {
      sectionsTeachers = list;
      renderForm(list);
    }).catch(() => {
      showToast(t('classes_sections.load_section_form_failed', 'Could not load the section form.'));
      openSectionsSheet(token, sectionsClassRecord);
    });
  }
}

function confirmDeleteSection(token, section) {
  if (!window.confirm(t('classes_sections.confirm_delete_section', 'Delete "{name}"? This cannot be undone.').replace('{name}', section.name))) return;
  deleteSection(token, section.id).then(() => {
    showToast(t('classes_sections.section_deleted_toast', 'Section deleted.'));
    loadSectionsList(token);
  }).catch((err) => {
    showToast((err && err.message) || t('classes_sections.section_delete_failed', 'Could not delete this section.'));
  });
}

function load(token) {
  document.getElementById('listContent').innerHTML = '<div class="list-loading">' + escapeHtml(t('common.loading', 'Loading…')) + '</div>';
  fetchClassesList(token, { search: searchQuery, status: statusFilter === 'all' ? undefined : statusFilter }).then((classes) => {
    allClasses = classes;
    renderList(token);
  }).catch(() => {
    lastListRendered = false;
    document.getElementById('listContent').innerHTML =
      '<div class="list-error">' + escapeHtml(t('classes_sections.load_failed', 'Failed to load classes.')) + '<br><button type="button" class="list-retry-btn" id="retryBtn">' + escapeHtml(t('common.retry', 'Try again')) + '</button></div>';
    document.getElementById('retryBtn')?.addEventListener('click', () => load(token));
  });
}

guardDashboard('admin', function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  load(token);
});
