// Admin/Registrar: Walk-in Admissions review queue - what a student's
// self-service pre-registration (student-preregister.php, opened by
// scanning admission-management.php's QR) lands in. Reviewing here
// doesn't create an account by itself - "Continue to Admission" hands
// the data to admission.php via sessionStorage (same pattern as
// newsfeed.js's editPost handoff) so the registrar/admin still confirms
// everything, takes the photo, and sets a password there, same as any
// other admission.

const PREREG_STANDARD_FIELD_LABELS = {
  name: () => t('admission.field_name_label', 'Full name'),
  name_ar: () => t('admission.field_name_ar_label', 'Arabic name'),
  phone: () => t('admission.field_phone_label', 'Phone'),
  address: () => t('admission.field_address_label', 'Address'),
  emergency_contact_name: () => t('admission.field_emergency_name_label', 'Emergency contact name'),
  emergency_contact_phone: () => t('admission.field_emergency_phone_label', 'Emergency contact phone'),
  gender: () => t('admission.gender_step_title', 'Gender'),
  birthday: () => t('admission.birthday_step_title', 'Birthday'),
};

// .pdetail-status-pill's default CSS is emerald-only (built for a plain
// Active/Inactive pill on the People Profile sheet) - pending/rejected
// need their own colors here, so override inline per status.
const PREREG_STATUS_PILL_STYLE = {
  pending: 'background:rgba(217,119,6,0.12);color:#D97706;',
  rejected: 'background:rgba(239,68,68,0.1);color:#EF4444;',
};

function statusMeta() {
  return {
    pending: { chip: 'warn', label: t('preregistrations.status_pending', 'Pending') },
    admitted: { chip: 'ok', label: t('preregistrations.status_admitted', 'Admitted') },
    rejected: { chip: 'danger', label: t('preregistrations.status_rejected', 'Rejected') },
  };
}

let pregToken = null;
let allPreregs = [];
let statusFilter = 'pending';
let lastListRendered = false;

function formatWhen(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso || '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function renderFilterChips() {
  const options = [
    { key: 'pending', label: t('preregistrations.status_pending', 'Pending') },
    { key: 'admitted', label: t('preregistrations.status_admitted', 'Admitted') },
    { key: 'rejected', label: t('preregistrations.status_rejected', 'Rejected') },
  ];
  document.getElementById('statusFilterRow').innerHTML = options.map(o =>
    '<button type="button" class="filter-chip' + (statusFilter === o.key ? ' active' : '') + '" data-status="' + o.key + '">' + escapeHtml(o.label) + '</button>'
  ).join('');
  document.querySelectorAll('#statusFilterRow .filter-chip').forEach(btn => {
    btn.addEventListener('click', () => { statusFilter = btn.dataset.status; renderFilterChips(); load(); });
  });
}

function renderList() {
  lastListRendered = true;
  const wrap = document.getElementById('listContent');
  const meta = statusMeta();

  if (!allPreregs.length) {
    wrap.innerHTML = '<div class="list-empty"><div class="list-empty-title">' + escapeHtml(t('preregistrations.no_matches', 'Nothing here yet.')) + '</div></div>';
    return;
  }

  wrap.innerHTML = '';
  allPreregs.forEach(p => {
    const m = meta[p.status] || meta.pending;
    const initial = (p.name || '?').trim().charAt(0).toUpperCase();
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'list-card';
    card.innerHTML =
      (p.selfie_url
        ? '<img class="list-avatar" src="' + escapeHtml(p.selfie_url) + '" alt="" />'
        : '<span class="list-avatar-fallback">' + escapeHtml(initial) + '</span>') +
      '<span class="list-card-body">' +
        '<span class="list-card-name">' + escapeHtml(p.name || t('preregistrations.unnamed', 'Unnamed')) + '</span>' +
        '<div class="list-card-meta">' + escapeHtml(p.phone || '') + '</div>' +
        '<div class="chip-row">' +
          '<span class="mini-chip ' + m.chip + '">' + escapeHtml(m.label) + '</span>' +
          '<span class="mini-chip ok">' + icon('calendar', { size: 12, color: 'var(--ink)' }) + escapeHtml(formatWhen(p.created_at)) + '</span>' +
        '</div>' +
      '</span>' +
      icon('chevron', { size: 18, color: 'var(--subtle)' });
    card.addEventListener('click', () => openDetail(p.id));
    wrap.appendChild(card);
  });
}

function load() {
  document.getElementById('listContent').innerHTML = '<div class="list-loading">' + escapeHtml(t('common.loading', 'Loading…')) + '</div>';
  fetchPreregistrationList(pregToken, statusFilter).then(rows => {
    allPreregs = rows;
    renderList();
  }).catch(() => {
    lastListRendered = false;
    document.getElementById('listContent').innerHTML =
      '<div class="list-error">' + escapeHtml(t('preregistrations.load_failed', 'Failed to load submissions.')) + '<br><button type="button" class="list-retry-btn" id="retryBtn">' + escapeHtml(t('common.retry', 'Try again')) + '</button></div>';
    document.getElementById('retryBtn')?.addEventListener('click', load);
  });
}
onLocaleChange(() => { renderFilterChips(); if (lastListRendered) renderList(); });

function openDetail(id) {
  fetchPreregistrationDetail(pregToken, id).then(p => renderDetailSheet(p)).catch(() => {
    showToast(t('preregistrations.detail_load_failed', 'Could not load this submission.'));
  });
}

function renderDetailSheet(p) {
  let backdrop = document.getElementById('pregDetailBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'pregDetailBackdrop';
    backdrop.className = 'sheet-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) closePregDetail(); });
  }
  const meta = statusMeta();
  const m = meta[p.status] || meta.pending;

  const emailRow = p.email ? '<div class="pdetail-field-row">' +
      '<span class="pdetail-field-icon">' + icon('idcard', { size: 18, color: 'var(--subtle)' }) + '</span>' +
      '<div class="pdetail-field-text"><div class="pdetail-field-label">' + escapeHtml(t('admission.field_email_label', 'Email')) + '</div><div class="pdetail-field-value">' + escapeHtml(p.email) + '</div></div>' +
    '</div>' : '';

  const fieldRows = Object.keys(PREREG_STANDARD_FIELD_LABELS)
    .filter(key => p.data[key])
    .map(key => '<div class="pdetail-field-row">' +
      '<span class="pdetail-field-icon">' + icon('idcard', { size: 18, color: 'var(--subtle)' }) + '</span>' +
      '<div class="pdetail-field-text"><div class="pdetail-field-label">' + escapeHtml(PREREG_STANDARD_FIELD_LABELS[key]()) + '</div><div class="pdetail-field-value">' + escapeHtml(p.data[key]) + '</div></div>' +
    '</div>').join('');

  const customRows = Object.keys(p.data)
    .filter(key => !PREREG_STANDARD_FIELD_LABELS[key])
    .map(key => '<div class="pdetail-field-row">' +
      '<span class="pdetail-field-icon">' + icon('idcard', { size: 18, color: 'var(--subtle)' }) + '</span>' +
      '<div class="pdetail-field-text"><div class="pdetail-field-label">' + escapeHtml(key) + '</div><div class="pdetail-field-value">' + escapeHtml(p.data[key]) + '</div></div>' +
    '</div>').join('');

  const docRows = (p.documents || []).map(d =>
    '<a class="pdetail-field-row" href="' + escapeHtml(d.url) + '" target="_blank" rel="noopener" style="text-decoration:none;">' +
      '<span class="pdetail-field-icon">' + icon('filetext', { size: 18, color: 'var(--subtle)' }) + '</span>' +
      '<div class="pdetail-field-text"><div class="pdetail-field-label">' + escapeHtml(t('preregistrations.document_label', 'Document')) + '</div><div class="pdetail-field-value">' + escapeHtml(d.label) + '</div></div>' +
    '</a>'
  ).join('');

  // The selfie the student took on the public form - shown here so the
  // registrar can eyeball that a real person submitted this before
  // admitting them (the anti-bot point of collecting it in the first
  // place) - reused directly as the student's profile photo at admission
  // time if they go ahead, see admLoadPreregistrationHandoff() in admission.js.
  const avatarInitial = (p.data.name || '?').trim().charAt(0).toUpperCase();
  const avatarHtml = '<div class="pdetail-avatar-wrap">' +
    (p.selfie_url
      ? '<img class="pdetail-avatar" src="' + escapeHtml(p.selfie_url) + '" alt="" />'
      : '<span class="pdetail-avatar pdetail-avatar-fallback">' + escapeHtml(avatarInitial) + '</span>') +
    '</div>';

  backdrop.innerHTML =
    '<div class="sheet-panel pdetail-panel">' +
      '<div class="sheet-handle"></div>' +
      '<div class="pdetail-header"><span></span><button type="button" class="pdetail-close-btn" id="pregCloseBtn">' + icon('close', { size: 18, color: 'var(--ink)' }) + '</button></div>' +
      avatarHtml +
      '<div class="pdetail-name">' + escapeHtml(p.data.name || t('preregistrations.unnamed', 'Unnamed')) + '</div>' +
      '<div class="pdetail-status-pill" style="margin:10px auto 0;' + (PREREG_STATUS_PILL_STYLE[p.status] || '') + '">' + escapeHtml(m.label) + '</div>' +
      '<div class="pdetail-divider"></div>' +
      '<div class="pdetail-fields">' + emailRow + fieldRows + customRows + docRows + '</div>' +
      (p.status === 'rejected' && p.rejected_reason
        ? '<div class="step-hint" style="margin-top:10px;">' + escapeHtml(t('preregistrations.rejected_reason_prefix', 'Rejected: {reason}').replace('{reason}', p.rejected_reason)) + '</div>'
        : '') +
      (p.status === 'pending'
        ? '<button type="button" class="pdetail-report-btn" id="pregAdmitBtn" style="margin-top:20px;">' + icon('checkcircle', { size: 18, color: 'var(--emerald-deep)' }) + '<span>' + escapeHtml(t('preregistrations.continue_to_admission', 'Continue to Admission')) + '</span></button>' +
          '<button type="button" class="pdetail-report-btn" id="pregRejectBtn" style="margin-top:10px;border-color:#EF4444;color:#EF4444;">' + icon('close', { size: 18, color: '#EF4444' }) + '<span>' + escapeHtml(t('preregistrations.reject', 'Reject')) + '</span></button>'
        : '') +
      (p.status !== 'pending'
        ? '<button type="button" class="pdetail-report-btn" id="pregDeleteBtn" style="margin-top:20px;border-color:#EF4444;color:#EF4444;">' + icon('trash', { size: 18, color: '#EF4444' }) + '<span>' + escapeHtml(t('preregistrations.delete', 'Delete submission')) + '</span></button>'
        : '') +
    '</div>';
  document.getElementById('pregCloseBtn').addEventListener('click', closePregDetail);
  document.getElementById('pregAdmitBtn')?.addEventListener('click', () => continueToAdmission(p));
  document.getElementById('pregRejectBtn')?.addEventListener('click', () => rejectFlow(p.id));
  document.getElementById('pregDeleteBtn')?.addEventListener('click', () => deleteFlow(p.id));
  backdrop.classList.add('open');
}
function closePregDetail() {
  document.getElementById('pregDetailBackdrop')?.classList.remove('open');
}

function continueToAdmission(p) {
  try {
    sessionStorage.setItem('admissionPreregistration', JSON.stringify({ id: p.id, email: p.email, has_selfie: !!p.selfie_url, data: p.data }));
  } catch (e) {}
  window.location.href = 'admission.php';
}

function rejectFlow(id) {
  const reason = window.prompt(t('preregistrations.reject_reason_prompt', 'Reason (optional):') , '');
  if (reason === null) return; // cancelled
  rejectPreregistration(pregToken, id, reason || undefined).then(() => {
    closePregDetail();
    showToast(t('preregistrations.rejected_toast', 'Submission rejected.'));
    load();
  }).catch(() => showToast(t('preregistrations.reject_failed', 'Could not reject this submission.')));
}

function deleteFlow(id) {
  if (!window.confirm(t('preregistrations.delete_confirm', 'Delete this submission? This cannot be undone.'))) return;
  deletePreregistration(pregToken, id).then(() => {
    closePregDetail();
    showToast(t('preregistrations.deleted_toast', 'Submission deleted.'));
    load();
  }).catch(() => showToast(t('preregistrations.delete_failed', 'Could not delete this submission.')));
}

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(t('preregistrations.title', 'Walk-in Admissions'), t('preregistrations.subtitle', 'Students who pre-registered by QR - review and admit them.'), 'admin-dashboard.php', null);
}
renderHeaderText();
onLocaleChange(renderHeaderText);
renderFilterChips();

guardDashboard(['admin', 'registrar'], function (user, token) {
  pregToken = token;
  document.getElementById('routeGuardSplash')?.remove();
  document.getElementById('bottomNavWrap').innerHTML = renderBottomNav(user.role);
  if (user.role === 'registrar') {
    document.getElementById('utilHeaderWrap').innerHTML =
      renderUtilHeader(t('preregistrations.title', 'Walk-in Admissions'), t('preregistrations.subtitle', 'Students who pre-registered by QR - review and admit them.'), 'registrar-dashboard.php', null);
  }
  load();
});
