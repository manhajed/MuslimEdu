// Admin: Fee Types — web port of
// src/screens/admin/{EnrollmentFeeTypesScreen,EnrollmentFeeTypeFormScreen}.tsx.
// What a student owes during enrollment (Tuition, Miscellaneous, ...) -
// reachable from Enrollment Stages' "Fees" quicklink. Same settings-list
// idiom as grading-systems.js (util-row list + action sheet + sheet form)
// rather than enrollment-stages.js's timeline, since there's no ordering
// UI here - RN's own form never exposes sort_order either.
// Backend: EnrollmentWorkflowController (admin_enrollment_fee_types_*).

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(t('enrollment_fee_types.title', 'Fee Types'), t('enrollment_fee_types.subtitle', 'What students owe during enrollment.'), 'enrollment-stages.php', null);
}
renderHeaderText();
onLocaleChange(() => { renderHeaderText(); if (ftBooted) renderFeeTypeList(getStoredToken()); });

let feeTypes = [];
let ftBooted = false;

function formatFeeAmount(amount) {
  if (amount === null || amount === undefined || amount === '') return null;
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (Number.isNaN(num)) return null;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function renderFeeTypeList(token) {
  const card = document.getElementById('ftCard');
  if (feeTypes.length === 0) {
    card.innerHTML = '<div class="util-row"><span class="util-row-title" style="color:var(--subtle);">' + escapeHtml(t('enrollment_fee_types.empty', 'No fee types yet.')) + '</span></div>';
    return;
  }
  card.innerHTML = '';
  feeTypes.forEach(f => {
    const amountText = formatFeeAmount(f.amount);
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'util-row';
    row.innerHTML =
      '<span class="util-row-icon">' + icon('banknote', { size: 16, color: 'var(--ink)' }) + '</span>' +
      '<span class="util-row-title">' + escapeHtml(f.name) +
        (f.is_required ? ' <span class="mini-chip ok" style="margin-left:6px;">' + escapeHtml(t('enrollment_fee_types.required_chip', 'Required')) + '</span>' : '') +
        (!f.is_active ? ' <span class="mini-chip warn" style="margin-left:6px;">' + escapeHtml(t('enrollment_fee_types.inactive_chip', 'Inactive')) + '</span>' : '') + '</span>' +
      '<span class="util-row-value">' + (amountText ? escapeHtml(amountText) : '—') + '</span>' +
      icon('chevron', { size: 18, color: 'var(--subtle)' });
    row.addEventListener('click', () => openFeeTypeActions(token, f));
    card.appendChild(row);
  });
}

function openFeeTypeActions(token, f) {
  openActionSheet(f.name, [
    { icon: 'gear', label: t('enrollment_fee_types.edit_label', 'Edit'), desc: t('enrollment_fee_types.edit_desc', 'Change name, amount, or rules'), onPress: () => openFeeTypeForm(token, f) },
    { icon: 'trash', label: t('enrollment_fee_types.delete_label', 'Delete'), desc: t('enrollment_fee_types.delete_desc', 'Remove this fee type'), onPress: () => {
      if (!confirm(t('enrollment_fee_types.delete_confirm', 'Delete "{name}"? This can’t be undone.').replace('{name}', f.name))) return;
      authedPost('/admin_enrollment_fee_types_delete', token, { fee_type_id: f.id }).then(() => {
        showToast(t('enrollment_fee_types.deleted_toast', 'Fee type deleted.'));
        load(token);
      }).catch(err => showToast((err && err.message) || t('enrollment_fee_types.delete_failed', 'Could not delete this fee type.')));
    }},
  ]);
}

function openFeeTypeForm(token, existing) {
  let backdrop = document.getElementById('ftFormBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'ftFormBackdrop';
    backdrop.className = 'sheet-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.classList.remove('open'); });
  }

  backdrop.innerHTML =
    '<div class="sheet-panel form">' +
      '<div class="sheet-handle"></div>' +
      '<div class="sheet-title-row"><span class="sheet-title">' + escapeHtml(existing ? t('enrollment_fee_types.edit_title', 'Edit Fee Type') : t('enrollment_fee_types.add_title', 'Add Fee Type')) + '</span>' +
        '<button type="button" class="sheet-close-btn" id="ftCloseBtn">' + icon('close', { size: 16, color: 'var(--subtle)' }) + '</button></div>' +

      '<label class="util-label" style="margin-top:0;">' + escapeHtml(t('enrollment_fee_types.name_label', 'Fee Name')) + '</label>' +
      '<input type="text" id="ftName" class="util-input" placeholder="' + escapeHtml(t('enrollment_fee_types.name_placeholder', 'e.g. Tuition Fee, Miscellaneous, Service Fee')) + '" value="' + (existing ? escapeHtml(existing.name) : '') + '" />' +

      '<label class="util-label">' + escapeHtml(t('enrollment_fee_types.code_label', 'Code (optional)')) + '</label>' +
      '<input type="text" id="ftCode" class="util-input" placeholder="e.g. TUITION" style="text-transform:uppercase;" value="' + (existing && existing.code ? escapeHtml(existing.code) : '') + '" />' +

      '<label class="util-label">' + escapeHtml(t('enrollment_fee_types.amount_label', 'Suggested Amount (optional)')) + '</label>' +
      '<input type="text" inputmode="decimal" id="ftAmount" class="util-input" placeholder="e.g. 5000" value="' + (existing && existing.amount != null ? escapeHtml(String(existing.amount)) : '') + '" />' +

      '<label class="util-row" style="padding:10px 0;">' +
        '<span><span class="util-row-title">' + escapeHtml(t('enrollment_fee_types.required_label', 'Required')) + '</span><br><span class="util-row-value" style="text-align:left;font-size:12px;">' + escapeHtml(t('enrollment_fee_types.required_sub', 'Must show Paid or Waived before enrollment can complete.')) + '</span></span>' +
        '<span class="switch"><input type="checkbox" id="ftRequired"' + (!existing || existing.is_required ? ' checked' : '') + '><span class="switch-track"></span></span>' +
      '</label>' +
      '<label class="util-row" style="padding:10px 0;">' +
        '<span><span class="util-row-title">' + escapeHtml(t('enrollment_fee_types.active_label', 'Active')) + '</span><br><span class="util-row-value" style="text-align:left;font-size:12px;">' + escapeHtml(t('enrollment_fee_types.active_sub', 'Inactive fee types are hidden from new payment checklists.')) + '</span></span>' +
        '<span class="switch"><input type="checkbox" id="ftActive"' + (!existing || existing.is_active ? ' checked' : '') + '><span class="switch-track"></span></span>' +
      '</label>' +

      '<div class="sheet-form-error" id="ftFormError">' + icon('warning', { size: 14, color: '#B3261E' }) + '<span></span></div>' +

      '<div class="sheet-form-actions">' +
        '<button type="button" class="sheet-btn-secondary" id="ftCancelBtn">' + escapeHtml(t('common.cancel', 'Cancel')) + '</button>' +
        '<button type="button" class="sheet-btn-primary" id="ftSubmitBtn"><span id="ftSubmitLabel">' + escapeHtml(existing ? t('enrollment_fee_types.save_changes', 'Save Changes') : t('enrollment_fee_types.add_title', 'Add Fee Type')) + '</span></button>' +
      '</div>' +
    '</div>';

  document.getElementById('ftCloseBtn').addEventListener('click', () => backdrop.classList.remove('open'));
  document.getElementById('ftCancelBtn').addEventListener('click', () => backdrop.classList.remove('open'));

  document.getElementById('ftSubmitBtn').addEventListener('click', () => {
    const name = document.getElementById('ftName').value.trim();
    const codeRaw = document.getElementById('ftCode').value.trim();
    const amountRaw = document.getElementById('ftAmount').value.trim();

    const errorEl = document.getElementById('ftFormError');
    const setError = (msg) => { errorEl.querySelector('span').textContent = msg; errorEl.classList.add('show'); };
    errorEl.classList.remove('show');

    if (!name) { setError(t('enrollment_fee_types.name_required', 'A fee name is required.')); return; }
    const amount = amountRaw ? Number(amountRaw) : null;
    if (amountRaw && (Number.isNaN(amount) || amount < 0)) { setError(t('enrollment_fee_types.amount_invalid', 'Amount must be a valid, non-negative number.')); return; }

    const input = {
      name,
      code: codeRaw || null,
      amount,
      is_required: document.getElementById('ftRequired').checked,
      is_active: document.getElementById('ftActive').checked,
    };

    const btn = document.getElementById('ftSubmitBtn');
    const label = document.getElementById('ftSubmitLabel');
    btn.disabled = true;
    label.innerHTML = '<span class="util-spinner"></span>';

    const req = existing
      ? authedPost('/admin_enrollment_fee_types_update', token, Object.assign({ fee_type_id: existing.id }, input))
      : authedPost('/admin_enrollment_fee_types_create', token, input);

    req.then(() => {
      backdrop.classList.remove('open');
      showToast(existing ? t('enrollment_fee_types.updated_toast', 'Fee type updated.') : t('enrollment_fee_types.added_toast', 'Fee type added.'));
      load(token);
      if (!existing) notifySetupItemSaved(token);
    }).catch((err) => {
      const msg = (err && err.message) || t('enrollment_fee_types.save_failed', 'Could not save this fee type.');
      setError(msg);
      showToast(msg);
    }).finally(() => {
      btn.disabled = false;
      label.textContent = existing ? t('enrollment_fee_types.save_changes', 'Save Changes') : t('enrollment_fee_types.add_title', 'Add Fee Type');
    });
  });

  backdrop.classList.add('open');
}

function load(token) {
  document.getElementById('ftCard').innerHTML = '<div class="util-row"><span class="util-row-title" style="color:var(--subtle);">' + escapeHtml(t('common.loading', 'Loading…')) + '</span></div>';
  authedPost('/admin_enrollment_fee_types_list', token, {}).then(d => {
    feeTypes = d.fee_types || [];
    renderFeeTypeList(token);
  }).catch(() => {
    document.getElementById('ftCard').innerHTML = '<div class="util-row"><span class="util-row-title" style="color:var(--subtle);">' + escapeHtml(t('enrollment_fee_types.load_failed', 'Could not load fee types.')) + '</span></div>';
  });
}

guardDashboard('admin', function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  document.getElementById('utilBody').style.display = '';
  document.getElementById('addFtBtn').addEventListener('click', () => openFeeTypeForm(token, null));
  load(token);
  ftBooted = true;
});
