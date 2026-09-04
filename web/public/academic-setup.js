// Academic Years + Terms builder, mirroring AcademicYearsScreen /
// AcademicTermsScreen (academicSetupService.ts: admin_sessions_*,
// admin_academic_terms_*).

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(t('academic_setup.title', 'Academic Setup'), t('academic_setup.subtitle', 'Manage academic years and terms'), 'admin-dashboard.php');
}
renderHeaderText();
onLocaleChange(renderHeaderText);

let years = [];
let selectedYearId = null;
let terms = [];
let asBooted = false;
let asToken = null;

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function renderYears(token) {
  const card = document.getElementById('yearsCard');
  if (years.length === 0) {
    card.innerHTML = '<div class="util-row"><span class="util-row-title" style="color:var(--subtle);">' + escapeHtml(t('academic_setup.no_years', 'No academic years yet.')) + '</span></div>';
    return;
  }
  card.innerHTML = '';
  years.forEach(y => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'util-row';
    const isCurrent = y.status === 1;
    row.innerHTML =
      '<span class="util-row-icon">' + icon('calendar', { size: 16, color: 'var(--ink)' }) + '</span>' +
      '<span class="util-row-title">' + escapeHtml(y.session_title) +
        (isCurrent ? ' <span class="mini-chip ok" style="margin-left:6px;">' + escapeHtml(t('academic_setup.current_chip', 'Current')) + '</span>' : '') + '</span>' +
      icon('chevron', { size: 18, color: y.id === selectedYearId ? 'var(--ink)' : 'var(--subtle)' });
    if (y.id === selectedYearId) row.style.background = 'var(--emerald-soft)';
    row.addEventListener('click', () => openYearActions(token, y));
    card.appendChild(row);
  });
}

function openYearActions(token, y) {
  const actions = [
    { icon: 'layers', label: t('academic_setup.view_terms_label', 'View Terms'), desc: t('academic_setup.view_terms_desc', 'Show terms under this year'), onPress: () => { selectedYearId = y.id; renderYears(token); loadTerms(token); } },
    { icon: 'gear', label: t('academic_setup.rename_label', 'Rename'), desc: t('academic_setup.rename_desc', 'Change the year title'), onPress: () => openYearForm(token, y) },
  ];
  if (y.status !== 1) {
    actions.push({ icon: 'star', label: t('academic_setup.set_current_label', 'Set as Current'), desc: t('academic_setup.set_current_year_desc', 'Make this the active academic year'), onPress: () => setCurrent(token, y) });
  }
  actions.push({ icon: 'trash', label: t('academic_setup.delete_label', 'Delete'), desc: t('academic_setup.delete_year_desc', 'Remove this academic year'), onPress: () => confirmDeleteYear(token, y) });
  openActionSheet(y.session_title, actions);
}

function setCurrent(token, y) {
  setCurrentAcademicYearHttp(token, y.id).then(() => {
    showToast(t('academic_setup.now_current_toast', '{name} is now the current academic year.').replace('{name}', y.session_title));
    loadYears(token);
  }).catch(err => showToast(err.message || t('academic_setup.update_failed', 'Could not update.')));
}

function confirmDeleteYear(token, y) {
  if (!confirm(t('academic_setup.delete_year_confirm', 'Delete "{name}"? This cannot be undone.').replace('{name}', y.session_title))) return;
  authedPost('/admin_sessions_delete', token, { session_id: y.id }).then(() => {
    showToast(t('academic_setup.year_deleted_toast', 'Academic year deleted.'));
    if (selectedYearId === y.id) { selectedYearId = null; document.getElementById('termsCard').style.display = 'none'; document.getElementById('termsSectionTitle').style.display = 'none'; document.getElementById('addTermBtn').style.display = 'none'; }
    loadYears(token);
  }).catch(err => showToast(err.message || t('academic_setup.delete_year_failed', 'Could not delete. It may still have terms.')));
}

function setCurrentAcademicYearHttp(token, sessionId) {
  return authedPost('/admin_sessions_set_current', token, { session_id: sessionId });
}

function loadYears(token) {
  authedPost('/admin_sessions_list', token).then(d => {
    years = d.sessions || [];
    renderYears(token);
  }).catch(() => showToast(t('academic_setup.load_years_failed', 'Could not load academic years.')));
}

// ── Year add/rename sheet ──
function openYearForm(token, existing) {
  let backdrop = document.getElementById('yearFormBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'yearFormBackdrop';
    backdrop.className = 'sheet-backdrop';
    backdrop.innerHTML =
      '<div class="sheet-panel form">' +
        '<div class="sheet-handle"></div>' +
        '<div class="sheet-title-row"><span class="sheet-title" id="yfTitle"></span>' +
          '<button type="button" class="sheet-close-btn" id="yfCloseBtn">' + icon('close', { size: 16, color: 'var(--subtle)' }) + '</button></div>' +
        '<label class="util-label" style="margin-top:0;">' + escapeHtml(t('academic_setup.title_label', 'Title')) + '</label>' +
        '<input type="text" id="yfTitle_" class="util-input" placeholder="' + escapeHtml(t('academic_setup.title_placeholder', 'e.g. 2026 - 2027')) + '" />' +
        '<div class="sheet-form-actions">' +
          '<button type="button" class="sheet-btn-secondary" id="yfCancelBtn">' + escapeHtml(t('common.cancel', 'Cancel')) + '</button>' +
          '<button type="button" class="sheet-btn-primary" id="yfSubmitBtn"><span id="yfSubmitLabel">' + escapeHtml(t('academic_setup.save', 'Save')) + '</span></button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.classList.remove('open'); });
    document.getElementById('yfCloseBtn').addEventListener('click', () => backdrop.classList.remove('open'));
    document.getElementById('yfCancelBtn').addEventListener('click', () => backdrop.classList.remove('open'));
  }
  document.getElementById('yfTitle').textContent = existing ? t('academic_setup.rename_year_title', 'Rename Academic Year') : t('academic_setup.add_year_title', 'Add Academic Year');
  document.getElementById('yfTitle_').value = existing ? existing.session_title : '';
  const btn = document.getElementById('yfSubmitBtn');
  btn.onclick = () => {
    const title = document.getElementById('yfTitle_').value.trim();
    if (!title) { showToast(t('academic_setup.title_required', 'A title is required.')); return; }
    const label = document.getElementById('yfSubmitLabel');
    btn.disabled = true; label.innerHTML = '<span class="util-spinner"></span>';
    const req = existing
      ? authedPost('/admin_sessions_update', token, { session_id: existing.id, session_title: title })
      : authedPost('/admin_sessions_create', token, { session_title: title, set_current: false });
    req.then(() => {
      backdrop.classList.remove('open');
      showToast(existing ? t('academic_setup.year_renamed_toast', 'Academic year renamed.') : t('academic_setup.year_added_toast', 'Academic year added.'));
      loadYears(token);
      if (!existing) notifySetupItemSaved(token);
    }).catch(err => showToast(err.message || t('academic_setup.save_failed', 'Could not save.')))
      .finally(() => { btn.disabled = false; label.textContent = t('academic_setup.save', 'Save'); });
  };
  backdrop.classList.add('open');
}

// ── Terms ──
function loadTerms(token) {
  const title = document.getElementById('termsSectionTitle');
  const card = document.getElementById('termsCard');
  const addBtn = document.getElementById('addTermBtn');
  title.style.display = ''; card.style.display = ''; addBtn.style.display = '';
  card.innerHTML = '<div class="util-row"><span class="util-row-title" style="color:var(--subtle);">' + escapeHtml(t('common.loading', 'Loading…')) + '</span></div>';
  authedPost('/admin_academic_terms_list', token, { session_id: selectedYearId }).then(d => {
    terms = d.terms || [];
    renderTerms(token);
  }).catch(() => { card.innerHTML = '<div class="util-row"><span class="util-row-title" style="color:var(--subtle);">' + escapeHtml(t('academic_setup.load_terms_failed', 'Could not load terms.')) + '</span></div>'; });
}

function renderTerms(token) {
  const card = document.getElementById('termsCard');
  if (terms.length === 0) {
    card.innerHTML = '<div class="util-row"><span class="util-row-title" style="color:var(--subtle);">' + escapeHtml(t('academic_setup.no_terms', 'No terms for this year yet.')) + '</span></div>';
    return;
  }
  card.innerHTML = '';
  terms.forEach(term => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'util-row';
    row.innerHTML =
      '<span class="util-row-icon">' + icon('clock', { size: 16, color: 'var(--ink)' }) + '</span>' +
      '<span class="util-row-title">' + escapeHtml(term.name) + (term.is_current ? ' <span class="mini-chip ok" style="margin-left:6px;">' + escapeHtml(t('academic_setup.current_chip', 'Current')) + '</span>' : '') + '</span>' +
      '<span class="util-row-value">' + fmtDate(term.start_date) + (term.end_date ? ' – ' + fmtDate(term.end_date) : '') + '</span>' +
      icon('chevron', { size: 18, color: 'var(--subtle)' });
    row.addEventListener('click', () => openTermActions(token, term));
    card.appendChild(row);
  });
}

function openTermActions(token, term) {
  const actions = [];
  if (!term.is_current) {
    actions.push({ icon: 'star', label: t('academic_setup.set_current_label', 'Set as Current'), desc: t('academic_setup.set_current_term_desc', 'Make this the active term'), onPress: () => {
      authedPost('/admin_academic_terms_set_current', token, { term_id: term.id }).then(() => { showToast(t('academic_setup.term_now_current_toast', '{name} is now current.').replace('{name}', term.name)); loadTerms(token); }).catch(err => showToast(err.message || t('academic_setup.update_failed', 'Could not update.')));
    }});
  }
  actions.push({ icon: 'trash', label: t('academic_setup.delete_label', 'Delete'), desc: t('academic_setup.delete_term_desc', 'Remove this term'), onPress: () => {
    if (!confirm(t('academic_setup.delete_term_confirm', 'Delete "{name}"?').replace('{name}', term.name))) return;
    authedPost('/admin_academic_terms_delete', token, { term_id: term.id }).then(() => { showToast(t('academic_setup.term_deleted_toast', 'Term deleted.')); loadTerms(token); }).catch(err => showToast(err.message || t('academic_setup.delete_term_failed', 'Could not delete.')));
  }});
  openActionSheet(term.name, actions);
}

function openTermForm(token) {
  if (!selectedYearId) { showToast(t('academic_setup.pick_year_first_toast', 'Pick an academic year first.')); return; }
  let backdrop = document.getElementById('termFormBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'termFormBackdrop';
    backdrop.className = 'sheet-backdrop';
    backdrop.innerHTML =
      '<div class="sheet-panel form">' +
        '<div class="sheet-handle"></div>' +
        '<div class="sheet-title-row"><span class="sheet-title">' + escapeHtml(t('academic_setup.add_term_title', 'Add Term')) + '</span>' +
          '<button type="button" class="sheet-close-btn" id="tfCloseBtn">' + icon('close', { size: 16, color: 'var(--subtle)' }) + '</button></div>' +
        '<label class="util-label" style="margin-top:0;">' + escapeHtml(t('academic_setup.name_label', 'Name')) + '</label>' +
        '<input type="text" id="tfName" class="util-input" placeholder="' + escapeHtml(t('academic_setup.name_placeholder', 'e.g. Term 1')) + '" />' +
        '<label class="util-label">' + escapeHtml(t('academic_setup.start_date_label', 'Start Date')) + '</label>' +
        '<input type="date" id="tfStart" class="util-input" />' +
        '<label class="util-label">' + escapeHtml(t('academic_setup.end_date_label', 'End Date')) + '</label>' +
        '<input type="date" id="tfEnd" class="util-input" />' +
        '<div class="sheet-form-actions">' +
          '<button type="button" class="sheet-btn-secondary" id="tfCancelBtn">' + escapeHtml(t('common.cancel', 'Cancel')) + '</button>' +
          '<button type="button" class="sheet-btn-primary" id="tfSubmitBtn"><span id="tfSubmitLabel">' + escapeHtml(t('academic_setup.add_term_title', 'Add Term')) + '</span></button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.classList.remove('open'); });
    document.getElementById('tfCloseBtn').addEventListener('click', () => backdrop.classList.remove('open'));
    document.getElementById('tfCancelBtn').addEventListener('click', () => backdrop.classList.remove('open'));
  }
  document.getElementById('tfName').value = '';
  document.getElementById('tfStart').value = '';
  document.getElementById('tfEnd').value = '';
  const btn = document.getElementById('tfSubmitBtn');
  btn.onclick = () => {
    const name = document.getElementById('tfName').value.trim();
    if (!name) { showToast(t('academic_setup.name_required', 'A name is required.')); return; }
    const label = document.getElementById('tfSubmitLabel');
    btn.disabled = true; label.innerHTML = '<span class="util-spinner"></span>';
    authedPost('/admin_academic_terms_create', token, {
      session_id: selectedYearId,
      name,
      term_type: 'custom',
      start_date: document.getElementById('tfStart').value || undefined,
      end_date: document.getElementById('tfEnd').value || undefined,
    }).then(() => {
      backdrop.classList.remove('open');
      showToast(t('academic_setup.term_added_toast', 'Term added.'));
      loadTerms(token);
    }).catch(err => showToast(err.message || t('academic_setup.add_term_failed', 'Could not add term.')))
      .finally(() => { btn.disabled = false; label.textContent = t('academic_setup.add_term_title', 'Add Term'); });
  };
  backdrop.classList.add('open');
}

onLocaleChange(() => {
  if (!asBooted) return;
  renderYears(asToken);
  if (selectedYearId) renderTerms(asToken);
});

guardDashboard('admin', function (user, token) {
  asToken = token;
  document.getElementById('routeGuardSplash')?.remove();
  document.getElementById('utilBody').style.display = '';
  document.getElementById('addYearBtn').addEventListener('click', () => openYearForm(token, null));
  document.getElementById('addTermBtn').addEventListener('click', () => openTermForm(token));
  loadYears(token);
  asBooted = true;
});
