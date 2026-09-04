// Admin: Facilities — web port of academicFacilitiesService.ts
// (admin_facilities_buildings/_building_store/_update/_delete,
// admin_facilities_rooms/_room_store/_update/_delete).

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(t('facilities.title', 'Facilities'), t('facilities.subtitle', 'Buildings, rooms and learning spaces'), 'admin-dashboard.php');
}
renderHeaderText();
onLocaleChange(() => {
  renderHeaderText();
  if (!facBooted) return;
  renderBuildings(facToken);
  renderBuildingFilter(facToken);
  renderRooms(facToken);
});

const ROOM_TYPE_VALUES = ['classroom', 'laboratory', 'library', 'office', 'hall', 'mosque', 'learning_space', 'other'];
function roomTypes() {
  const fallback = { classroom: 'Classroom', laboratory: 'Laboratory', library: 'Library', office: 'Office', hall: 'Hall', mosque: 'Mosque', learning_space: 'Learning Space', other: 'Other' };
  return ROOM_TYPE_VALUES.map(v => ({ value: v, label: t('facilities.room_type_' + v, fallback[v]) }));
}
function roomTypeLabel(v) {
  const found = roomTypes().find(rt => rt.value === v);
  return found ? found.label : v;
}

function fetchBuildingsList(token) { return authedPost('/admin_facilities_buildings', token, {}).then(d => (d.buildings && d.buildings.data) || []); }
function createBuildingApi(token, input) { return authedPost('/admin_facilities_building_store', token, input).then(d => d.building); }
function updateBuildingApi(token, id, input) { return authedPost('/admin_facilities_building_update', token, Object.assign({ building_id: id }, input)).then(d => d.building); }
function archiveBuildingApi(token, id) { return authedPost('/admin_facilities_building_delete', token, { building_id: id }); }
function fetchRoomsList(token, buildingId) { return authedPost('/admin_facilities_rooms', token, buildingId ? { building_id: buildingId } : {}).then(d => (d.rooms && d.rooms.data) || []); }
function createRoomApi(token, input) { return authedPost('/admin_facilities_room_store', token, input).then(d => d.room); }
function updateRoomApi(token, id, input) { return authedPost('/admin_facilities_room_update', token, Object.assign({ room_id: id }, input)).then(d => d.room); }
function archiveRoomApi(token, id) { return authedPost('/admin_facilities_room_delete', token, { room_id: id }); }

let allBuildings = [];
let allRooms = [];
let roomBuildingFilter = null;
let facBooted = false;
let facToken = null;

function chipRowHtml3(idPrefix, options, selectedValue) {
  return '<div class="stage-chip-row" id="' + idPrefix + 'Row">' +
    options.map(o =>
      '<button type="button" class="stage-chip' + (o.value === selectedValue ? ' selected' : '') + '" data-value="' + escapeHtml(String(o.value)) + '">' + escapeHtml(o.label) + '</button>'
    ).join('') +
  '</div>';
}
function wireChipRow3(idPrefix, onSelect) {
  const row = document.getElementById(idPrefix + 'Row');
  row.querySelectorAll('.stage-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      row.querySelectorAll('.stage-chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      onSelect(chip.dataset.value);
    });
  });
}

// ── Buildings ──
function renderBuildings(token) {
  const card = document.getElementById('buildingsCard');
  if (allBuildings.length === 0) {
    card.innerHTML = '<div class="util-row"><span class="util-row-title" style="color:var(--subtle);">' + escapeHtml(t('facilities.no_buildings', 'No buildings yet.')) + '</span></div>';
    return;
  }
  card.innerHTML = '';
  allBuildings.forEach(b => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'util-row';
    row.innerHTML =
      '<span class="util-row-icon">' + icon('house', { size: 16, color: 'var(--ink)' }) + '</span>' +
      '<span class="util-row-title">' + escapeHtml(b.name) +
        (b.status === 'archived' ? ' <span class="mini-chip warn" style="margin-left:6px;">' + escapeHtml(t('facilities.archived_chip', 'Archived')) + '</span>' : '') + '</span>' +
      '<span class="util-row-value">' + (b.rooms_count != null ? escapeHtml(t('facilities.rooms_count', '{n} rooms').replace('{n}', b.rooms_count)) : escapeHtml(b.code || '')) + '</span>' +
      icon('chevron', { size: 18, color: 'var(--subtle)' });
    row.addEventListener('click', () => openBuildingActions(token, b));
    card.appendChild(row);
  });
}

function openBuildingActions(token, b) {
  openActionSheet(b.name, [
    { icon: 'gear', label: t('facilities.edit_label', 'Edit'), desc: t('facilities.edit_building_desc', 'Change name, code, or floor count'), onPress: () => openBuildingForm(token, b) },
    { icon: 'trash', label: t('facilities.archive_label', 'Archive'), desc: t('facilities.archive_building_desc', 'Remove this building from active use'), onPress: () => {
      if (!confirm(t('facilities.archive_confirm', 'Archive "{name}"?').replace('{name}', b.name))) return;
      archiveBuildingApi(token, b.id).then(() => { showToast(t('facilities.building_archived_toast', 'Building archived.')); loadBuildings(token); })
        .catch(err => showToast(err && err.message ? err.message : t('facilities.archive_building_failed', 'Could not archive. It may still have rooms.')));
    }},
  ]);
}

function openBuildingForm(token, existing) {
  let backdrop = document.getElementById('bldgFormBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'bldgFormBackdrop';
    backdrop.className = 'sheet-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.classList.remove('open'); });
  }
  backdrop.innerHTML =
    '<div class="sheet-panel form">' +
      '<div class="sheet-handle"></div>' +
      '<div class="sheet-title-row"><span class="sheet-title">' + escapeHtml(existing ? t('facilities.edit_building_title', 'Edit Building') : t('facilities.add_building_title', 'Add Building')) + '</span>' +
        '<button type="button" class="sheet-close-btn" id="bfCloseBtn">' + icon('close', { size: 16, color: 'var(--subtle)' }) + '</button></div>' +
      '<label class="util-label" style="margin-top:0;">' + escapeHtml(t('facilities.name_label', 'Name')) + '</label>' +
      '<input type="text" id="bfName" class="util-input" placeholder="' + escapeHtml(t('facilities.building_name_placeholder', 'e.g. Main Building')) + '" value="' + (existing ? escapeHtml(existing.name) : '') + '" />' +
      '<label class="util-label">' + escapeHtml(t('facilities.code_label', 'Code')) + '</label>' +
      '<input type="text" id="bfCode" class="util-input" placeholder="e.g. MB" value="' + (existing ? escapeHtml(existing.code) : '') + '" />' +
      '<label class="util-label">' + escapeHtml(t('facilities.floor_count_label', 'Floor Count')) + '</label>' +
      '<input type="number" id="bfFloors" class="util-input" placeholder="e.g. 3" value="' + (existing ? existing.floor_count : '1') + '" />' +
      '<div class="sheet-form-error" id="bfFormError">' + icon('warning', { size: 14, color: '#B3261E' }) + '<span></span></div>' +
      '<div class="sheet-form-actions">' +
        '<button type="button" class="sheet-btn-secondary" id="bfCancelBtn">' + escapeHtml(t('common.cancel', 'Cancel')) + '</button>' +
        '<button type="button" class="sheet-btn-primary" id="bfSubmitBtn"><span id="bfSubmitLabel">' + escapeHtml(t('facilities.save', 'Save')) + '</span></button>' +
      '</div>' +
    '</div>';
  document.getElementById('bfCloseBtn').addEventListener('click', () => backdrop.classList.remove('open'));
  document.getElementById('bfCancelBtn').addEventListener('click', () => backdrop.classList.remove('open'));
  document.getElementById('bfSubmitBtn').addEventListener('click', () => {
    const name = document.getElementById('bfName').value.trim();
    const code = document.getElementById('bfCode').value.trim();
    const floors = parseInt(document.getElementById('bfFloors').value, 10) || 1;
    const errorEl = document.getElementById('bfFormError');
    const setError = (msg) => { errorEl.querySelector('span').textContent = msg; errorEl.classList.add('show'); };
    errorEl.classList.remove('show');
    if (!name || !code) { setError(t('facilities.name_code_required', 'Name and code are required.')); return; }
    const btn = document.getElementById('bfSubmitBtn');
    const label = document.getElementById('bfSubmitLabel');
    btn.disabled = true; label.innerHTML = '<span class="util-spinner"></span>';
    const req = existing
      ? updateBuildingApi(token, existing.id, { name, code, floor_count: floors })
      : createBuildingApi(token, { name, code, floor_count: floors });
    req.then(() => {
      backdrop.classList.remove('open');
      showToast(existing ? t('facilities.building_updated_toast', 'Building updated.') : t('facilities.building_added_toast', 'Building added.'));
      loadBuildings(token);
    }).catch(err => { const msg = err && err.message ? err.message : t('facilities.save_failed', 'Could not save.'); setError(msg); showToast(msg); })
      .finally(() => { btn.disabled = false; label.textContent = t('facilities.save', 'Save'); });
  });
  backdrop.classList.add('open');
}

function loadBuildings(token) {
  document.getElementById('buildingsCard').innerHTML = '<div class="util-row"><span class="util-row-title" style="color:var(--subtle);">' + escapeHtml(t('common.loading', 'Loading…')) + '</span></div>';
  fetchBuildingsList(token).then(b => {
    allBuildings = b;
    renderBuildings(token);
    renderBuildingFilter(token);
  }).catch(() => { document.getElementById('buildingsCard').innerHTML = '<div class="util-row"><span class="util-row-title" style="color:var(--subtle);">' + escapeHtml(t('facilities.load_buildings_failed', 'Could not load buildings.')) + '</span></div>'; });
}

// ── Rooms ──
function renderBuildingFilter(token) {
  const wrap = document.getElementById('buildingFilterRow');
  const chips = [{ key: null, label: t('facilities.all_buildings', 'All Buildings') }, ...allBuildings.map(b => ({ key: b.id, label: b.name }))];
  wrap.innerHTML = chips.map(c =>
    '<button type="button" class="filter-chip' + (c.key === roomBuildingFilter ? ' active' : '') + '" data-key="' + (c.key ?? '') + '">' + escapeHtml(c.label) + '</button>'
  ).join('');
  wrap.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      roomBuildingFilter = btn.dataset.key ? Number(btn.dataset.key) : null;
      renderBuildingFilter(token);
      loadRooms(token);
    });
  });
}

function renderRooms(token) {
  const card = document.getElementById('roomsCard');
  if (allRooms.length === 0) {
    card.innerHTML = '<div class="util-row"><span class="util-row-title" style="color:var(--subtle);">' + escapeHtml(t('facilities.no_rooms', 'No rooms yet.')) + '</span></div>';
    return;
  }
  card.innerHTML = '';
  allRooms.forEach(r => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'util-row';
    row.innerHTML =
      '<span class="util-row-icon">' + icon('layers', { size: 15, color: 'var(--ink)' }) + '</span>' +
      '<span class="util-row-title">' + escapeHtml(r.name) + (r.status === 'archived' ? ' <span class="mini-chip warn" style="margin-left:6px;">' + escapeHtml(t('facilities.archived_chip', 'Archived')) + '</span>' : '') + '</span>' +
      '<span class="util-row-value">' + escapeHtml(roomTypeLabel(r.room_type)) + (r.capacity ? ' · ' + r.capacity : '') + '</span>' +
      icon('chevron', { size: 18, color: 'var(--subtle)' });
    row.addEventListener('click', () => openRoomActions(token, r));
    card.appendChild(row);
  });
}

function openRoomActions(token, r) {
  openActionSheet(r.name, [
    { icon: 'gear', label: t('facilities.edit_label', 'Edit'), desc: t('facilities.edit_room_desc', 'Change type, floor, or capacity'), onPress: () => openRoomForm(token, r) },
    { icon: 'trash', label: t('facilities.archive_label', 'Archive'), desc: t('facilities.archive_room_desc', 'Remove this room from active use'), onPress: () => {
      if (!confirm(t('facilities.archive_confirm', 'Archive "{name}"?').replace('{name}', r.name))) return;
      archiveRoomApi(token, r.id).then(() => { showToast(t('facilities.room_archived_toast', 'Room archived.')); loadRooms(token); })
        .catch(err => showToast(err && err.message ? err.message : t('facilities.archive_room_failed', 'Could not archive.')));
    }},
  ]);
}

function openRoomForm(token, existing) {
  if (allBuildings.length === 0) { showToast(t('facilities.add_building_first', 'Add a building first.')); return; }
  let backdrop = document.getElementById('roomFormBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'roomFormBackdrop';
    backdrop.className = 'sheet-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.classList.remove('open'); });
  }
  let buildingId = existing ? existing.building_id : (roomBuildingFilter || allBuildings[0].id);
  let roomType = existing ? existing.room_type : 'classroom';
  const buildingLabel = () => { const b = allBuildings.find(b => b.id === buildingId); return b ? b.name : t('facilities.select_building', 'Select a building'); };

  backdrop.innerHTML =
    '<div class="sheet-panel form">' +
      '<div class="sheet-handle"></div>' +
      '<div class="sheet-title-row"><span class="sheet-title">' + escapeHtml(existing ? t('facilities.edit_room_title', 'Edit Room') : t('facilities.add_room_title', 'Add Room')) + '</span>' +
        '<button type="button" class="sheet-close-btn" id="rfCloseBtn">' + icon('close', { size: 16, color: 'var(--subtle)' }) + '</button></div>' +
      '<label class="util-label" style="margin-top:0;">' + escapeHtml(t('facilities.building_label', 'Building')) + '</label>' +
      '<button type="button" class="util-row" style="border:1px solid var(--card-border);border-radius:12px;background:#FAFBFA;" id="rfBuildingBtn">' +
        '<span class="util-row-title" id="rfBuildingLabel">' + escapeHtml(buildingLabel()) + '</span>' + icon('chevron', { size: 16, color: 'var(--subtle)' }) +
      '</button>' +
      '<label class="util-label">' + escapeHtml(t('facilities.name_label', 'Name')) + '</label>' +
      '<input type="text" id="rfName" class="util-input" placeholder="' + escapeHtml(t('facilities.room_name_placeholder', 'e.g. Room 101')) + '" value="' + (existing ? escapeHtml(existing.name) : '') + '" />' +
      '<label class="util-label">' + escapeHtml(t('facilities.code_label', 'Code')) + '</label>' +
      '<input type="text" id="rfCode" class="util-input" placeholder="e.g. R101" value="' + (existing ? escapeHtml(existing.code) : '') + '" />' +
      '<label class="util-label">' + escapeHtml(t('facilities.type_label', 'Type')) + '</label>' + chipRowHtml3('rfType', roomTypes(), roomType) +
      '<label class="util-label">' + escapeHtml(t('facilities.floor_number_label', 'Floor Number')) + '</label>' +
      '<input type="number" id="rfFloor" class="util-input" placeholder="e.g. 1" value="' + (existing ? existing.floor_number : '1') + '" />' +
      '<label class="util-label">' + escapeHtml(t('facilities.capacity_label', 'Capacity')) + '</label>' +
      '<input type="number" id="rfCapacity" class="util-input" placeholder="e.g. 40" value="' + (existing ? existing.capacity : '') + '" />' +
      '<div class="sheet-form-error" id="rfFormError">' + icon('warning', { size: 14, color: '#B3261E' }) + '<span></span></div>' +
      '<div class="sheet-form-actions">' +
        '<button type="button" class="sheet-btn-secondary" id="rfCancelBtn">' + escapeHtml(t('common.cancel', 'Cancel')) + '</button>' +
        '<button type="button" class="sheet-btn-primary" id="rfSubmitBtn"><span id="rfSubmitLabel">' + escapeHtml(t('facilities.save', 'Save')) + '</span></button>' +
      '</div>' +
    '</div>';
  document.getElementById('rfCloseBtn').addEventListener('click', () => backdrop.classList.remove('open'));
  document.getElementById('rfCancelBtn').addEventListener('click', () => backdrop.classList.remove('open'));
  wireChipRow3('rfType', v => { roomType = v; });
  document.getElementById('rfBuildingBtn').addEventListener('click', () => {
    openOptionSheet(t('facilities.building_label', 'Building'), allBuildings.map(b => ({ key: String(b.id), label: b.name })), String(buildingId), (key) => {
      buildingId = Number(key);
      document.getElementById('rfBuildingLabel').textContent = buildingLabel();
      return Promise.resolve();
    });
  });
  document.getElementById('rfSubmitBtn').addEventListener('click', () => {
    const name = document.getElementById('rfName').value.trim();
    const code = document.getElementById('rfCode').value.trim();
    const floor = parseInt(document.getElementById('rfFloor').value, 10) || 1;
    const capacity = parseInt(document.getElementById('rfCapacity').value, 10) || 0;
    const errorEl = document.getElementById('rfFormError');
    const setError = (msg) => { errorEl.querySelector('span').textContent = msg; errorEl.classList.add('show'); };
    errorEl.classList.remove('show');
    if (!name || !code) { setError(t('facilities.name_code_required', 'Name and code are required.')); return; }
    const input = { building_id: buildingId, name, code, room_type: roomType, floor_number: floor, capacity };
    const btn = document.getElementById('rfSubmitBtn');
    const label = document.getElementById('rfSubmitLabel');
    btn.disabled = true; label.innerHTML = '<span class="util-spinner"></span>';
    const req = existing ? updateRoomApi(token, existing.id, input) : createRoomApi(token, input);
    req.then(() => {
      backdrop.classList.remove('open');
      showToast(existing ? t('facilities.room_updated_toast', 'Room updated.') : t('facilities.room_added_toast', 'Room added.'));
      loadRooms(token);
    }).catch(err => { const msg = err && err.message ? err.message : t('facilities.save_failed', 'Could not save.'); setError(msg); showToast(msg); })
      .finally(() => { btn.disabled = false; label.textContent = t('facilities.save', 'Save'); });
  });
  backdrop.classList.add('open');
}

function loadRooms(token) {
  document.getElementById('roomsCard').innerHTML = '<div class="util-row"><span class="util-row-title" style="color:var(--subtle);">' + escapeHtml(t('common.loading', 'Loading…')) + '</span></div>';
  fetchRoomsList(token, roomBuildingFilter).then(r => {
    allRooms = r;
    renderRooms(token);
  }).catch(() => { document.getElementById('roomsCard').innerHTML = '<div class="util-row"><span class="util-row-title" style="color:var(--subtle);">' + escapeHtml(t('facilities.load_rooms_failed', 'Could not load rooms.')) + '</span></div>'; });
}

guardDashboard('admin', function (user, token) {
  facToken = token;
  document.getElementById('routeGuardSplash')?.remove();
  document.getElementById('addBuildingBtn').addEventListener('click', () => openBuildingForm(token, null));
  document.getElementById('addRoomBtn').addEventListener('click', () => openRoomForm(token, null));
  loadBuildings(token);
  loadRooms(token);
  facBooted = true;
});
