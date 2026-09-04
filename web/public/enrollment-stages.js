// Admin: Enrollment Stages — web port of
// src/screens/admin/{EnrollmentStagesScreen,EnrollmentStageFormScreen}.tsx.
// Same backend contract (EnrollmentWorkflowController, admin_enrollment_stages_*),
// same field set - laid out as a connected vertical timeline instead of
// RN's BentoGrid. Reorder is drag (press the numbered dot, see
// beginStageDrag) or the up/down arrows as a precise/no-pointer-drag
// fallback; both funnel through commitReorder(), which resends the FULL
// id order in one call, per the backend's admin_enrollment_stages_reorder
// contract.

let allStages = [];
let reorderBusyId = null;
let esBooted = false;

function fetchEnrollmentStages(token) {
  return authedPost('/admin_enrollment_stages_list', token, {}).then(d => d.stages || []);
}
function createEnrollmentStage(token, input) {
  return authedPost('/admin_enrollment_stages_create', token, input).then(d => d.stage);
}
function updateEnrollmentStage(token, stageId, input) {
  return authedPost('/admin_enrollment_stages_update', token, Object.assign({ stage_id: stageId }, input)).then(d => d.stage);
}
function reorderEnrollmentStagesApi(token, stageIds) {
  return authedPost('/admin_enrollment_stages_reorder', token, { stage_ids: stageIds }).then(d => d.stages || []);
}
function deleteEnrollmentStageApi(token, stageId) {
  return authedPost('/admin_enrollment_stages_delete', token, { stage_id: stageId });
}

function approverLabel(role) {
  if (role === 'accountant') return t('enrollment_stages.approver_cashier', 'Cashier');
  if (role === 'registrar') return t('enrollment_stages.approver_registrar', 'Registrar');
  return null;
}

function renderStages(token) {
  const wrap = document.getElementById('stageContent');

  if (allStages.length === 0) {
    wrap.innerHTML =
      '<div class="list-empty">' +
        '<div class="list-empty-title">' + escapeHtml(t('enrollment_stages.empty_title', 'No enrollment stages yet')) + '</div>' +
        '<div class="list-empty-sub">' + escapeHtml(t('enrollment_stages.empty_sub', 'Add your first stage (e.g. Admission) to start building the workflow.')) + '</div>' +
        '<button type="button" class="util-save-btn pill" id="stageEmptyAddBtn" style="max-width:220px;margin:18px auto 0;">' + escapeHtml(t('enrollment_stages.add_stage_btn', '+ Add Stage')) + '</button>' +
      '</div>';
    document.getElementById('stageEmptyAddBtn').addEventListener('click', () => openStageSheet(token));
    return;
  }

  const timeline = document.createElement('div');
  timeline.className = 'stage-timeline';

  allStages.forEach((stage, index) => {
    const isActive = stage.status === 'active';
    const isLast = index === allStages.length - 1;
    const busy = reorderBusyId === stage.id;
    const approver = approverLabel(stage.approver_role);
    const dotFilled = stage.is_terminal || isActive;

    const row = document.createElement('div');
    row.className = 'stage-row' + (busy ? ' busy' : '');
    row.dataset.stageId = String(stage.id);

    const tagsHtml =
      (stage.code ? '<span class="stage-tag">' + escapeHtml(stage.code) + '</span>' : '') +
      (approver ? '<span class="stage-tag">' + escapeHtml(t('enrollment_stages.approves_suffix', '{approver} approves').replace('{approver}', approver)) + '</span>' : '');

    // student_instructions is written in the Add/Edit sheet ("Shown to the
    // student while they are on this stage") but until now was never
    // rendered anywhere in this list - this is the only place an admin
    // could see whether they'd actually set it.
    const previewText = stage.student_instructions
      ? escapeHtml(stage.student_instructions)
      : escapeHtml(t('enrollment_stages.no_instructions', 'No instructions added - students will just see this stage’s name while it’s active.'));

    const statusLabel = isActive ? t('enrollment_stages.status_active', 'active') : t('enrollment_stages.status_inactive', 'inactive');

    row.innerHTML =
      '<div class="stage-row-rail">' +
        '<button type="button" class="stage-drag-handle" aria-label="' + escapeHtml(t('enrollment_stages.drag_aria', 'Drag to reorder {name}').replace('{name}', stage.name)) + '">' +
          '<span class="stage-dot' + (dotFilled ? (stage.is_terminal ? ' terminal' : ' active') : '') + '">' +
            (stage.is_terminal ? icon('flag', { size: 15, color: '#fff' }) : (index + 1)) +
          '</span>' +
        '</button>' +
        (isLast ? '' : '<span class="stage-rail-line"></span>') +
      '</div>' +
      '<div class="stage-row-card">' +
        '<div class="stage-row-top">' +
          '<div>' +
            '<div class="stage-name">' + escapeHtml(stage.name) + '</div>' +
            (tagsHtml ? '<div class="stage-tags">' + tagsHtml + '</div>' : '') +
          '</div>' +
          '<span class="stage-status ' + (isActive ? 'active' : 'inactive') + '">' + escapeHtml(statusLabel) + '</span>' +
        '</div>' +
        '<div class="stage-preview">' +
          '<span class="stage-preview-icon">' + icon('eye', { size: 14, color: 'var(--subtle)' }) + '</span>' +
          '<div>' +
            '<div class="stage-preview-label">' + escapeHtml(t('enrollment_stages.what_student_sees', 'What the student sees')) + '</div>' +
            '<div class="stage-preview-text' + (stage.student_instructions ? '' : ' empty') + '">' + previewText + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="stage-row-footer">' +
          '<span class="stage-reorder">' +
            '<button type="button" class="stage-reorder-btn" data-dir="-1" ' + (index === 0 ? 'disabled' : '') + ' aria-label="' + escapeHtml(t('enrollment_stages.move_up_aria', 'Move up')) + '">' + icon('chevronup', { size: 14, color: 'var(--subtle)' }) + '</button>' +
            '<button type="button" class="stage-reorder-btn" data-dir="1" ' + (isLast ? 'disabled' : '') + ' aria-label="' + escapeHtml(t('enrollment_stages.move_down_aria', 'Move down')) + '">' + icon('chevrondown', { size: 14, color: 'var(--subtle)' }) + '</button>' +
          '</span>' +
          '<button type="button" class="stage-delete" data-action="delete">' + escapeHtml(t('enrollment_stages.delete', 'Delete')) + '</button>' +
        '</div>' +
      '</div>';

    row.querySelectorAll('.stage-reorder-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        moveStage(token, index, parseInt(btn.dataset.dir, 10));
      });
    });
    row.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
      e.stopPropagation();
      confirmDeleteStage(token, stage);
    });
    row.querySelector('.stage-row-card').addEventListener('click', () => openStageSheet(token, stage));
    row.querySelector('.stage-drag-handle').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      beginStageDrag(e, row, timeline, token);
    });

    timeline.appendChild(row);
  });

  wrap.innerHTML = '';
  wrap.appendChild(timeline);
}

// Shared by the up/down arrows and drag-reorder below: optimistic local
// update + full re-render, rolled back if the server rejects the new
// order. `busyId` dims the moved card's opacity while the request is in
// flight (see .stage-row.busy).
function commitReorder(token, reordered, busyId) {
  const previous = allStages;
  allStages = reordered;
  reorderBusyId = busyId;
  renderStages(token);

  reorderEnrollmentStagesApi(token, reordered.map(s => s.id)).then((saved) => {
    allStages = saved;
  }).catch((err) => {
    allStages = previous;
    showToast(err && err.message ? err.message : t('enrollment_stages.reorder_failed', 'Could not reorder stages.'));
  }).finally(() => {
    reorderBusyId = null;
    renderStages(token);
  });
}

function moveStage(token, index, direction) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= allStages.length) return;

  const reordered = allStages.slice();
  const tmp = reordered[index];
  reordered[index] = reordered[targetIndex];
  reordered[targetIndex] = tmp;

  commitReorder(token, reordered, reordered[targetIndex].id);
}

// Press-and-drag reorder on the numbered dot. Pointer Events (not the
// HTML5 Drag and Drop API) because this is a touch-first PWA and native
// DnD never fires on touch without a polyfill. The dragged row's own
// element gets pointer capture, so pointermove/pointerup keep targeting
// it no matter what's visually underneath - that's what lets the row go
// invisible mid-drag (see below) without losing the gesture.
//
// A floating position:fixed clone ("ghost") tracks the pointer; the real
// row is hidden in place (opacity 0, pointer-events none) so it keeps
// reserving its slot in the layout and drops out of elementFromPoint hit
// testing, which is how the swap target under the ghost gets found.
// Siblings that get displaced animate into their new slot with a FLIP
// transform so the list doesn't just jump.
const DRAG_START_THRESHOLD = 4; // px of movement before a tap becomes a drag

function beginStageDrag(e, row, timeline, token) {
  const handle = e.currentTarget;
  const pointerId = e.pointerId;
  handle.setPointerCapture(pointerId);

  const startClientY = e.clientY;
  let dragging = false;
  let placeholder = null;
  let grabOffsetY = 0;
  let anchorX = 0;

  // `row` (and the `handle` inside it, which holds pointer capture) must
  // stay put in the DOM for the whole gesture: per spec, capture is
  // released the instant its element is removed/reinserted anywhere,
  // even via insertBefore to a *different* position under the *same*
  // parent - so it can never be the thing that gets reordered. Instead
  // `row` turns into a fixed-position ghost right where it already sits,
  // and a separate placeholder (a plain, uncaptured div) takes its slot
  // in the timeline and is what actually gets moved as the pointer
  // crosses siblings.
  function startDragging(clientY) {
    dragging = true;
    const rect = row.getBoundingClientRect();
    grabOffsetY = clientY - rect.top;
    anchorX = rect.left + rect.width / 2;

    placeholder = document.createElement('div');
    placeholder.className = 'stage-row stage-row-placeholder';
    placeholder.dataset.stageId = row.dataset.stageId;
    placeholder.style.height = rect.height + 'px';
    timeline.insertBefore(placeholder, row);

    row.classList.add('stage-row-ghost');
    row.style.position = 'fixed';
    row.style.left = rect.left + 'px';
    row.style.top = rect.top + 'px';
    row.style.width = rect.width + 'px';
    row.style.margin = '0';
    // Excludes the floating row from elementFromPoint below, so hit
    // testing at the ghost's own screen position finds whatever real
    // row/placeholder is actually underneath it instead of itself.
    row.style.pointerEvents = 'none';
    document.body.style.overscrollBehavior = 'contain';
  }

  function onMove(ev) {
    if (ev.pointerId !== pointerId) return;
    if (!dragging) {
      if (Math.abs(ev.clientY - startClientY) < DRAG_START_THRESHOLD) return;
      startDragging(ev.clientY);
    }

    const top = ev.clientY - grabOffsetY;
    row.style.top = top + 'px';

    const centerY = top + row.offsetHeight / 2;
    const hit = document.elementFromPoint(anchorX, centerY);
    const hitRow = hit && hit.closest && hit.closest('.stage-row');
    if (!hitRow || hitRow === placeholder || !timeline.contains(hitRow)) return;

    const children = Array.from(timeline.children);
    const curPos = children.indexOf(placeholder);
    const hitPos = children.indexOf(hitRow);
    if (curPos === hitPos || hitPos === -1) return;

    const before = new Map(children.map(c => [c, c.getBoundingClientRect()]));
    if (curPos < hitPos) timeline.insertBefore(placeholder, hitRow.nextSibling);
    else timeline.insertBefore(placeholder, hitRow);

    children.forEach(c => {
      if (c === placeholder || c === row) return; // row is fixed/out of flow - nothing to FLIP
      const b = before.get(c);
      const a = c.getBoundingClientRect();
      const dy = b.top - a.top;
      if (!dy) return;
      c.style.transition = 'none';
      c.style.transform = 'translateY(' + dy + 'px)';
      requestAnimationFrame(() => {
        c.style.transition = 'transform 160ms ease';
        c.style.transform = '';
      });
    });
  }

  function onEnd(ev) {
    if (ev.pointerId !== pointerId) return;
    handle.removeEventListener('pointermove', onMove);
    handle.removeEventListener('pointerup', onEnd);
    handle.removeEventListener('pointercancel', onEnd);
    document.body.style.overscrollBehavior = '';

    if (!dragging) return; // plain tap - never left the threshold, nothing to clean up

    // renderStages() below always rebuilds #stageContent from scratch, so
    // it - not any manual style/element teardown here - is what discards
    // the floating `row`, the placeholder, and every inline style this
    // gesture applied.
    const newOrder = Array.from(timeline.children)
      .filter(el => el !== row)
      .map(el => allStages.find(s => String(s.id) === el.dataset.stageId))
      .filter(Boolean);
    const changed = newOrder.length === allStages.length &&
      newOrder.some((s, i) => s.id !== allStages[i].id);
    if (changed) {
      const movedStage = allStages.find(s => String(s.id) === row.dataset.stageId);
      commitReorder(token, newOrder, movedStage ? movedStage.id : null);
    } else {
      renderStages(token);
    }
  }

  handle.addEventListener('pointermove', onMove);
  handle.addEventListener('pointerup', onEnd);
  handle.addEventListener('pointercancel', onEnd);
}

function confirmDeleteStage(token, stage) {
  if (!confirm(t('enrollment_stages.delete_confirm', 'Delete "{name}"? This can’t be undone.').replace('{name}', stage.name))) return;
  deleteEnrollmentStageApi(token, stage.id).then(() => {
    showToast(t('enrollment_stages.deleted_toast', 'Stage deleted.'));
    load(token);
  }).catch((err) => {
    showToast(err && err.message ? err.message : t('enrollment_stages.delete_failed', 'Failed to delete stage.'));
  });
}

function load(token) {
  document.getElementById('stageContent').innerHTML = '<div class="list-loading">' + escapeHtml(t('common.loading', 'Loading…')) + '</div>';
  fetchEnrollmentStages(token).then((stages) => {
    allStages = stages;
    renderStages(token);
  }).catch(() => {
    document.getElementById('stageContent').innerHTML =
      '<div class="list-error">' + escapeHtml(t('enrollment_stages.load_failed', 'Failed to load stages.')) + '<br><button type="button" class="list-retry-btn" id="stageRetryBtn">' + escapeHtml(t('common.retry', 'Try again')) + '</button></div>';
    document.getElementById('stageRetryBtn')?.addEventListener('click', () => load(token));
  });
}

/* ── Add / Edit Stage sheet ── */

function approverOptions() {
  return [
    { value: null, label: t('enrollment_stages.admin_only', 'Admin only') },
    { value: 'accountant', label: t('enrollment_stages.approver_cashier', 'Cashier') },
    { value: 'registrar', label: t('enrollment_stages.approver_registrar', 'Registrar') },
  ];
}

function openStageSheet(token, stage) {
  const isEditing = !!stage;
  let backdrop = document.getElementById('stageSheetBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'stageSheetBackdrop';
    backdrop.className = 'sheet-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) closeStageSheet(); });
  }

  let approverValue = stage ? (stage.approver_role || null) : null;
  let isTerminal = stage ? !!stage.is_terminal : false;
  let isActive = stage ? stage.status === 'active' : true;

  backdrop.innerHTML =
    '<div class="sheet-panel form">' +
      '<div class="sheet-handle"></div>' +
      '<div class="sheet-title-row"><span class="sheet-title">' + escapeHtml(isEditing ? t('enrollment_stages.edit_title', 'Edit Stage') : t('enrollment_stages.add_title', 'Add Stage')) + '</span>' +
        '<button type="button" class="sheet-close-btn" id="stageCloseBtn">' + icon('close', { size: 16, color: 'var(--subtle)' }) + '</button></div>' +

      '<label class="util-label" style="margin-top:0;">' + escapeHtml(t('enrollment_stages.name_label', 'Stage Name')) + '</label>' +
      '<input type="text" id="stName" class="util-input" placeholder="' + escapeHtml(t('enrollment_stages.name_placeholder', 'e.g. Admission, Cashier, Registrar')) + '" value="' + (stage ? escapeHtml(stage.name) : '') + '" />' +

      '<label class="util-label">' + escapeHtml(t('enrollment_stages.code_label', 'Code (optional)')) + '</label>' +
      '<input type="text" id="stCode" class="util-input" placeholder="e.g. ADMISSION" style="text-transform:uppercase;" value="' + (stage && stage.code ? escapeHtml(stage.code) : '') + '" />' +

      '<label class="util-label">' + escapeHtml(t('enrollment_stages.instructions_label', 'Student Instructions (optional)')) + '</label>' +
      '<textarea id="stInstructions" class="util-input" placeholder="' + escapeHtml(t('enrollment_stages.instructions_placeholder', 'Shown to the student while they are on this stage, e.g. Pay the enrollment fee at the Cashier\'s office.')) + '">' + (stage && stage.student_instructions ? escapeHtml(stage.student_instructions) : '') + '</textarea>' +

      '<label class="util-label">' + escapeHtml(t('enrollment_stages.who_approves_label', 'Who approves this stage?')) + '</label>' +
      '<div class="stage-chip-row" id="stApproverRow">' +
        approverOptions().map(opt =>
          '<button type="button" class="stage-chip' + (opt.value === approverValue ? ' selected' : '') + '" data-value="' + (opt.value || '') + '">' + escapeHtml(opt.label) + '</button>'
        ).join('') +
      '</div>' +

      '<div class="stage-toggle-row">' +
        '<span><span class="stage-toggle-label">' + escapeHtml(t('enrollment_stages.terminal_label', 'Terminal Stage')) + '</span><br><span class="stage-toggle-sub">' + escapeHtml(t('enrollment_stages.terminal_sub', 'Reaching this stage completes enrollment')) + '</span></span>' +
        '<button type="button" class="stage-switch' + (isTerminal ? ' on' : '') + '" id="stTerminalSwitch" aria-label="' + escapeHtml(t('enrollment_stages.terminal_label', 'Terminal Stage')) + '"><span class="stage-switch-knob"></span></button>' +
      '</div>' +
      '<div class="stage-toggle-row">' +
        '<span><span class="stage-toggle-label">' + escapeHtml(t('enrollment_stages.active_label', 'Active')) + '</span><br><span class="stage-toggle-sub">' + escapeHtml(t('enrollment_stages.active_sub', 'Inactive stages are hidden from new workflows')) + '</span></span>' +
        '<button type="button" class="stage-switch' + (isActive ? ' on' : '') + '" id="stActiveSwitch" aria-label="' + escapeHtml(t('enrollment_stages.active_label', 'Active')) + '"><span class="stage-switch-knob"></span></button>' +
      '</div>' +

      '<div class="sheet-form-error" id="stFormError">' + icon('warning', { size: 14, color: '#B3261E' }) + '<span></span></div>' +

      '<div class="sheet-form-actions">' +
        '<button type="button" class="sheet-btn-secondary" id="stCancelBtn">' + escapeHtml(t('common.cancel', 'Cancel')) + '</button>' +
        '<button type="button" class="sheet-btn-primary" id="stSubmitBtn"><span id="stSubmitLabel">' + escapeHtml(isEditing ? t('enrollment_stages.save_changes', 'Save Changes') : t('enrollment_stages.add_title', 'Add Stage')) + '</span></button>' +
      '</div>' +
    '</div>';

  document.getElementById('stageCloseBtn').addEventListener('click', closeStageSheet);
  document.getElementById('stCancelBtn').addEventListener('click', closeStageSheet);

  document.getElementById('stApproverRow').querySelectorAll('.stage-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      approverValue = chip.dataset.value || null;
      document.getElementById('stApproverRow').querySelectorAll('.stage-chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
    });
  });

  document.getElementById('stTerminalSwitch').addEventListener('click', () => {
    isTerminal = !isTerminal;
    document.getElementById('stTerminalSwitch').classList.toggle('on', isTerminal);
  });
  document.getElementById('stActiveSwitch').addEventListener('click', () => {
    isActive = !isActive;
    document.getElementById('stActiveSwitch').classList.toggle('on', isActive);
  });

  document.getElementById('stSubmitBtn').addEventListener('click', () => {
    const name = document.getElementById('stName').value.trim();
    const errorEl = document.getElementById('stFormError');
    const setError = (msg) => { errorEl.querySelector('span').textContent = msg; errorEl.classList.add('show'); };
    errorEl.classList.remove('show');
    if (!name) { setError(t('enrollment_stages.name_required', 'Stage name is required.')); return; }

    const input = {
      name,
      code: document.getElementById('stCode').value.trim() || null,
      student_instructions: document.getElementById('stInstructions').value.trim() || null,
      is_terminal: isTerminal,
      status: isActive ? 'active' : 'inactive',
      approver_role: approverValue,
    };

    const btn = document.getElementById('stSubmitBtn');
    const label = document.getElementById('stSubmitLabel');
    btn.disabled = true;
    label.innerHTML = '<span class="util-spinner"></span>';

    const req = isEditing ? updateEnrollmentStage(token, stage.id, input) : createEnrollmentStage(token, input);
    req.then(() => {
      closeStageSheet();
      showToast(isEditing ? t('enrollment_stages.updated_toast', 'Stage updated.') : t('enrollment_stages.added_toast', 'Stage added.'));
      load(token);
      if (!isEditing) notifySetupItemSaved(token);
    }).catch((err) => {
      const msg = err && err.message ? err.message : t('enrollment_stages.save_failed', 'Could not save stage.');
      setError(msg);
      showToast(msg);
    }).finally(() => {
      btn.disabled = false;
      label.textContent = isEditing ? t('enrollment_stages.save_changes', 'Save Changes') : t('enrollment_stages.add_title', 'Add Stage');
    });
  });

  backdrop.classList.add('open');
}
function closeStageSheet() {
  document.getElementById('stageSheetBackdrop')?.classList.remove('open');
}

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(t('enrollment_stages.title', 'Enrollment Stages'), t('enrollment_stages.subtitle', 'Students move through these stages in order. Drag a stage’s number, or use the arrows, to reorder.'), 'admin-dashboard.php', {
      label: t('enrollment_stages.add_action', '+ Add'), onClick: () => openStageSheet(getStoredToken()),
    });
}
renderHeaderText();
onLocaleChange(() => { renderHeaderText(); if (esBooted) renderStages(getStoredToken()); });

guardDashboard('admin', function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  load(token);
  esBooted = true;
});
