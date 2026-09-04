// Admin "Alumni Applications" (Activity & Requests group) - ported from
// AlumniApplicationsScreen.tsx: pending "Create Alumni Account" self-service
// signups for this school, with Approve / Reject actions. Backend calls
// live in dashboard.js (fetchPendingAlumniRegistrations/
// approveAlumniRegistration/rejectAlumniRegistration), already scoped
// server-side to the calling admin's own school.

let registrations = [];
let busyId = null;
let aaBooted = false;

function formatDate(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso || '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function renderList() {
  const wrap = document.getElementById('applicationsContent');
  if (registrations.length === 0) {
    wrap.innerHTML = '<div class="doc-empty-card">' + escapeHtml(t('alumni_applications.empty', 'No pending alumni applications.')) + '</div>';
    return;
  }

  wrap.innerHTML = registrations.map(item => {
    const meta = escapeHtml(item.email) + (item.phone ? ' · ' + escapeHtml(item.phone) : '');
    const programRow = item.program
      ? '<div class="alumni-detail-row"><span class="alumni-detail-label">' + escapeHtml(t('alumni_applications.program_label', 'Program / Degree')) + '</span><span class="alumni-detail-value">' + escapeHtml(item.program) + '</span></div>'
      : '';
    const notesHtml = item.notes
      ? '<div class="alumni-notes">' + escapeHtml(item.notes) + '</div>'
      : '';
    const busy = busyId === item.id;

    return (
      '<div class="doc-card">' +
        '<div class="alumni-card-header">' +
          '<div style="min-width:0;flex:1;">' +
            '<div class="alumni-name">' + escapeHtml(item.name) + '</div>' +
            '<div class="alumni-meta">' + meta + '</div>' +
          '</div>' +
          '<div class="alumni-date">' + escapeHtml(formatDate(item.created_at)) + '</div>' +
        '</div>' +

        '<div class="alumni-divider"></div>' +

        '<div class="alumni-detail-row"><span class="alumni-detail-label">' + escapeHtml(t('alumni_applications.graduation_year_label', 'Graduation Year')) + '</span><span class="alumni-detail-value">' + escapeHtml(String(item.graduation_year)) + '</span></div>' +
        programRow +
        notesHtml +

        '<div class="alumni-action-row">' +
          '<button type="button" class="alumni-action-btn alumni-reject-btn" data-action="reject" data-id="' + item.id + '"' + (busy ? ' disabled' : '') + '>' + escapeHtml(t('alumni_applications.reject_btn', 'Reject')) + '</button>' +
          '<button type="button" class="alumni-action-btn alumni-approve-btn" data-action="approve" data-id="' + item.id + '"' + (busy ? ' disabled' : '') + '>' + escapeHtml(t('alumni_applications.approve_btn', 'Approve')) + '</button>' +
        '</div>' +
      '</div>'
    );
  }).join('');

  wrap.querySelectorAll('[data-action="approve"]').forEach(btn => {
    btn.addEventListener('click', () => onApprove(Number(btn.dataset.id)));
  });
  wrap.querySelectorAll('[data-action="reject"]').forEach(btn => {
    btn.addEventListener('click', () => onReject(Number(btn.dataset.id)));
  });
}

function onApprove(id) {
  const item = registrations.find(r => r.id === id);
  const token = getStoredToken();
  if (!item || !token) return;
  if (!confirm(t('alumni_applications.approve_confirm', '{name} will be added as an alumni. Approve this application?').replace('{name}', item.name))) return;

  busyId = id;
  registrations = registrations.filter(r => r.id !== id);
  renderList();

  approveAlumniRegistration(token, id).then(() => {
    busyId = null;
    showToast(t('alumni_applications.approved_toast', 'Application approved.'));
  }).catch(err => {
    busyId = null;
    showToast(err && err.message ? err.message : t('alumni_applications.approve_failed', 'Could not approve.'));
    load(token);
  });
}

function onReject(id) {
  const item = registrations.find(r => r.id === id);
  const token = getStoredToken();
  if (!item || !token) return;
  if (!confirm(t('alumni_applications.reject_confirm', '{name}’s application will be rejected. Continue?').replace('{name}', item.name))) return;

  busyId = id;
  registrations = registrations.filter(r => r.id !== id);
  renderList();

  rejectAlumniRegistration(token, id).then(() => {
    busyId = null;
    showToast(t('alumni_applications.rejected_toast', 'Application rejected.'));
  }).catch(err => {
    busyId = null;
    showToast(err && err.message ? err.message : t('alumni_applications.reject_failed', 'Could not reject.'));
    load(token);
  });
}

function load(token) {
  const wrap = document.getElementById('applicationsContent');
  wrap.innerHTML = '<div class="list-loading">' + escapeHtml(t('alumni_applications.loading', 'Loading applications…')) + '</div>';
  fetchPendingAlumniRegistrations(token).then(rows => {
    registrations = rows.filter(r => r.status === 'pending');
    renderList();
  }).catch(err => {
    wrap.innerHTML = '<div class="list-error">' + escapeHtml(err && err.message ? err.message : t('alumni_applications.load_failed', "Couldn't load applications.")) + '</div>';
  });
}

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(t('alumni_applications.title', 'Alumni Applications'), t('alumni_applications.subtitle', 'Review and approve self-service alumni signups'), 'admin-dashboard.php', null);
}
renderHeaderText();
onLocaleChange(() => { renderHeaderText(); if (aaBooted) renderList(); });

guardDashboard('admin', function (user, token) {
  document.getElementById('utilBody').style.display = '';
  document.getElementById('bottomNavWrap').innerHTML = renderBottomNav('admin');
  load(token);
  aaBooted = true;
});
