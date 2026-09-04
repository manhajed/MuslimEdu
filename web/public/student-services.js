// Ported from StudentServicesScreen.tsx - the school's request-able
// services catalog (guidance/counselling and others), plus the student's
// own ticket history with cancel. Backend: StudentPortalController::
// serviceCatalog/serviceRequestStore/serviceRequestCancel (POST
// /student_service_catalog, /student_service_request_store,
// /student_service_request_cancel).

let allServices = [];
let currentRequests = [];
let currentToken = null;
let selectedServiceKey = null;
let lastServicesRendered = false;

function reqStatusClass(status) {
  if (status === 'resolved') return 'ok';
  if (status === 'cancelled') return '';
  if (status === 'in_progress') return '';
  return 'warn';
}
function reqStatusLabel(status) {
  if (status === 'in_progress') return t('student_services.status_in_progress', 'In progress');
  if (status === 'resolved') return t('student_services.status_resolved', 'Resolved');
  if (status === 'cancelled') return t('student_services.status_cancelled', 'Cancelled');
  if (status === 'open') return t('student_services.status_open', 'Open');
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function renderServices() {
  lastServicesRendered = true;
  const wrap = document.getElementById('servicesContent');
  let html = '<div class="util-section-title" style="margin-top:0;">' + escapeHtml(t('student_services.available_label', 'Available services')) + '</div>';

  html += allServices.map(s =>
    '<button type="button" class="doc-card" style="width:100%;text-align:left;cursor:pointer;" data-open="' + escapeHtml(s.key) + '">' +
      '<div class="doc-row-between">' +
        '<div style="flex:1;min-width:0;">' +
          '<div class="doc-row-title">' + escapeHtml(s.label) + '</div>' +
          '<div class="doc-row-sub">' + escapeHtml(t('student_services.typical_response', 'Typical response: {days}').replace('{days}', s.sla_days + ' ' + (s.sla_days === 1 ? t('student_services.day_singular', 'day') : t('student_services.day_plural', 'days')))) + '</div>' +
        '</div>' +
        '<span style="font-size:13px;font-weight:700;color:var(--ink);flex-shrink:0;">' + escapeHtml(t('student_services.request_label', 'Request')) + '</span>' +
      '</div>' +
    '</button>'
  ).join('');

  html += '<div class="util-section-title">' + escapeHtml(t('student_services.my_requests_label', 'My requests')) + '</div>';

  if (!currentRequests.length) {
    html += '<div class="doc-empty-card">' + escapeHtml(t('student_services.empty', 'You haven’t submitted any service requests yet.')) + '</div>';
  } else {
    html += currentRequests.map(req => {
      let sub = escapeHtml(req.service_label) + ' · ' + escapeHtml(req.reference_no);
      if (req.details) sub += '<br>' + escapeHtml(req.details);
      if (req.status === 'resolved' && req.resolution_note) {
        sub += '<br><span style="color:var(--ink);">' + escapeHtml(t('student_services.response_prefix', 'Response:')) + ' ' + escapeHtml(req.resolution_note) + '</span>';
      }
      const cls = reqStatusClass(req.status);
      return (
        '<div class="doc-card">' +
          '<div class="doc-row-between">' +
            '<div style="flex:1;min-width:0;">' +
              '<div class="doc-row-title">' + escapeHtml(req.subject) + '</div>' +
              '<div class="doc-row-sub">' + sub + '</div>' +
            '</div>' +
            '<span class="mini-chip' + (cls ? ' ' + cls : '') + '" style="' + (cls ? '' : 'background:#F1F3F2;color:var(--subtle);') + '">' + escapeHtml(reqStatusLabel(req.status)) + '</span>' +
          '</div>' +
          (req.status === 'open' ? '<button type="button" class="doc-cancel-link" data-cancel="' + req.id + '">' + escapeHtml(t('common.cancel_request', 'Cancel request')) + '</button>' : '') +
        '</div>'
      );
    }).join('');
  }

  wrap.innerHTML = html;

  wrap.querySelectorAll('[data-open]').forEach(btn => {
    btn.addEventListener('click', () => openRequestSheet(btn.dataset.open));
  });
  wrap.querySelectorAll('[data-cancel]').forEach(btn => {
    btn.addEventListener('click', () => confirmCancel(parseInt(btn.dataset.cancel, 10)));
  });
}
onLocaleChange(() => { if (lastServicesRendered) renderServices(); });

function load(token) {
  currentToken = token;
  document.getElementById('servicesContent').innerHTML = '<div class="list-loading">' + escapeHtml(t('student_services.loading', 'Loading services…')) + '</div>';
  fetchServiceCatalog(token).then(data => {
    allServices = data.services || [];
    currentRequests = data.requests || [];
    renderServices();
  }).catch(() => {
    lastServicesRendered = false;
    document.getElementById('servicesContent').innerHTML =
      '<div class="list-error">' + escapeHtml(t('student_services.load_error', 'Could not load services.')) + '<br><button type="button" class="list-retry-btn" id="retryBtn">' + escapeHtml(t('common.retry', 'Try again')) + '</button></div>';
    document.getElementById('retryBtn')?.addEventListener('click', () => load(token));
  });
}

function confirmCancel(reqId) {
  const req = currentRequests.find(r => r.id === reqId);
  if (!req) return;
  if (!window.confirm(t('student_services.confirm_cancel', '"{subject}" will be withdrawn. Continue?').replace('{subject}', req.subject))) return;
  cancelServiceRequest(currentToken, reqId).then(() => {
    currentRequests = currentRequests.map(r => r.id === reqId ? Object.assign({}, r, { status: 'cancelled' }) : r);
    renderServices();
  }).catch(() => showToast(t('common.cancel_failed', 'Could not cancel. Please try again.')));
}

// ── New Request sheet ──
function openRequestSheet(presetKey) {
  selectedServiceKey = presetKey || (allServices[0] && allServices[0].key) || null;

  let backdrop = document.getElementById('newReqBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'newReqBackdrop';
    backdrop.className = 'sheet-backdrop';
    backdrop.innerHTML =
      '<div class="sheet-panel form">' +
        '<div class="sheet-handle"></div>' +
        '<div class="sheet-title-row"><span class="sheet-title">' + escapeHtml(t('student_services.sheet_title', 'New Service Request')) + '</span>' +
          '<button type="button" class="sheet-close-btn" id="newReqCloseBtn">' + icon('close', { size: 16, color: 'var(--subtle)' }) + '</button></div>' +
        '<label class="util-label" style="margin-top:0;">' + escapeHtml(t('student_services.service_label', 'Service')) + '</label>' +
        '<div class="filter-chip-row" id="newReqServiceRow"></div>' +
        '<label class="util-label">' + escapeHtml(t('student_services.subject_label', 'Subject')) + '</label>' +
        '<input type="text" id="newReqSubject" class="util-input" placeholder="' + escapeHtml(t('student_services.subject_placeholder', 'Short summary')) + '" />' +
        '<label class="util-label" id="newReqDetailsLabel">' + escapeHtml(t('student_services.details_label', 'Details')) + '</label>' +
        '<textarea id="newReqDetails" class="util-input" placeholder="' + escapeHtml(t('student_services.details_placeholder', 'Anything that would help')) + '"></textarea>' +
        '<div class="sheet-form-actions">' +
          '<button type="button" class="sheet-btn-secondary" id="newReqCancelBtn">' + escapeHtml(t('common.cancel', 'Cancel')) + '</button>' +
          '<button type="button" class="sheet-btn-primary" id="newReqSubmitBtn"><span id="newReqSubmitLabel">' + escapeHtml(t('common.submit', 'Submit')) + '</span></button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) closeRequestSheet(); });
    document.getElementById('newReqCloseBtn').addEventListener('click', closeRequestSheet);
    document.getElementById('newReqCancelBtn').addEventListener('click', closeRequestSheet);
    document.getElementById('newReqSubmitBtn').addEventListener('click', submitServiceRequest);
  }

  renderServiceChips();
  document.getElementById('newReqSubject').value = '';
  document.getElementById('newReqDetails').value = '';
  backdrop.classList.add('open');
}
function renderServiceChips() {
  const row = document.getElementById('newReqServiceRow');
  row.innerHTML = allServices.map(s =>
    '<button type="button" class="filter-chip' + (s.key === selectedServiceKey ? ' active' : '') + '" data-key="' + escapeHtml(s.key) + '">' + escapeHtml(s.label) + '</button>'
  ).join('');
  row.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      selectedServiceKey = chip.dataset.key;
      row.querySelectorAll('.filter-chip').forEach(c => c.classList.toggle('active', c === chip));
      const entry = allServices.find(s => s.key === selectedServiceKey);
      document.getElementById('newReqDetailsLabel').textContent = t('student_services.details_label', 'Details') + (entry && entry.needs_details ? '' : t('student_services.details_optional_suffix', ' (optional)'));
    });
  });
  const entry = allServices.find(s => s.key === selectedServiceKey);
  document.getElementById('newReqDetailsLabel').textContent = t('student_services.details_label', 'Details') + (entry && entry.needs_details ? '' : t('student_services.details_optional_suffix', ' (optional)'));
}
function closeRequestSheet() {
  document.getElementById('newReqBackdrop')?.classList.remove('open');
}
function submitServiceRequest() {
  if (!selectedServiceKey) { showToast(t('student_services.choose_service_first', 'Choose which service you need first.')); return; }
  const subject = document.getElementById('newReqSubject').value.trim();
  const details = document.getElementById('newReqDetails').value.trim();
  const entry = allServices.find(s => s.key === selectedServiceKey);

  if (!subject) { showToast(t('student_services.need_subject', 'Give this request a short subject.')); return; }
  if (entry && entry.needs_details && !details) { showToast(t('student_services.need_details', 'This service needs a bit more detail before it can be submitted.')); return; }

  const btn = document.getElementById('newReqSubmitBtn');
  const label = document.getElementById('newReqSubmitLabel');
  btn.disabled = true;
  label.innerHTML = '<span class="util-spinner"></span>';

  storeServiceRequest(currentToken, selectedServiceKey, subject, details || undefined).then(result => {
    currentRequests = [result.request, ...currentRequests];
    renderServices();
    closeRequestSheet();
  }).catch(err => {
    showToast((err && err.message) || t('common.submit_failed', 'Could not submit request.'));
  }).finally(() => {
    btn.disabled = false;
    label.textContent = t('common.submit', 'Submit');
  });
}

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML = renderUtilHeader(
    t('student_dashboard.services_title', 'Services'),
    t('student_dashboard.services_desc', 'Guidance, counselling and other school services'),
    'student-dashboard.php',
    { label: t('student_services.new_action', '+ New'), onClick: () => openRequestSheet(null) }
  );
}
renderHeaderText();
onLocaleChange(renderHeaderText);

guardDashboard('student', function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  document.getElementById('utilBody').style.display = '';
  document.getElementById('bottomNavWrap').innerHTML = renderBottomNav('student');
  load(token);
});
