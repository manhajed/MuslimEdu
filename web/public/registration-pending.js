// Full-screen status view for a school admin whose "Register Your School"
// application hasn't been approved yet - see SchoolRegistrationApiController
// (submit() now creates the real School + admin User immediately, so this
// account can log in right away instead of waiting for approval to exist
// at all) and dashboard.js's guardDashboard(), which redirects here for any
// admin whose school_registration_status isn't 'approved'. Same
// full-screen-replacement pattern (and CSS classes) as
// renderEnrollmentGateScreen - only Log Out to leave, no header, no nav.
//
// This page is itself exempt from that redirect (see guardDashboard), so an
// admin who is actually approved but still bookmarked/linked here needs the
// opposite check on the way in - handled below by bouncing straight to
// admin-dashboard.php instead of rendering the gate screen.

function renderPendingScreen(user, token) {
  document.body.className = 'util-page';

  const status = user.school_registration_status;
  const isRejected = status === 'rejected';

  const title = isRejected
    ? t('registration_pending.rejected_title', 'Application Not Approved')
    : t('registration_pending.pending_title', 'Application Under Review');
  const subtitle = isRejected
    ? t('registration_pending.rejected_subtitle', 'Your school registration was not approved')
    : t('registration_pending.pending_subtitle', 'Hang tight while our team reviews your school');

  let contentHtml = '';
  if (isRejected) {
    contentHtml =
      '<div class="es-action-row">' +
        icon('alertcircle', { size: 16, color: '#EF4444' }) +
        '<p class="es-action-text">' +
          '<strong>' + escapeHtml(t('registration_pending.reason_label', 'Reason:')) + '</strong> ' +
          escapeHtml(user.school_rejection_reason || t('registration_pending.no_reason', 'No reason was given.')) +
        '</p>' +
      '</div>' +
      '<div class="list-card-meta" style="margin-top:14px;">' +
        escapeHtml(t('registration_pending.rejected_body', 'If you believe this is a mistake, please contact support with the details you registered with.')) +
      '</div>';
  } else {
    contentHtml =
      '<div class="es-action-row">' +
        icon('lightbulb', { size: 16, color: 'var(--warn-yellow)' }) +
        '<p class="es-action-text">' +
          escapeHtml(t('registration_pending.pending_body', 'Your school and admin account have already been created. Once our team approves your application you\'ll be taken straight to your dashboard - no need to register again.')) +
        '</p>' +
      '</div>';
  }

  document.body.innerHTML =
    '<div class="es-gate-screen">' +
      '<div class="es-gate-header">' +
        '<div class="es-gate-title">' + escapeHtml(title) + '</div>' +
        '<div class="es-gate-subtitle">' + escapeHtml(subtitle) + '</div>' +
      '</div>' +
      '<div class="es-gate-content" id="rpGateContent">' + contentHtml +
        '<button type="button" class="list-retry-btn" id="rpRefreshBtn" style="margin-top:16px;">' + escapeHtml(t('registration_pending.refresh_btn', 'Check Status')) + '</button>' +
      '</div>' +
      '<div class="es-gate-footer">' +
        '<button type="button" class="es-gate-logout-btn" id="rpLogoutBtn">' + icon('logout', { size: 16, color: 'var(--subtle)' }) + '<span>' + escapeHtml(t('menu.log_out', 'Log Out')) + '</span></button>' +
      '</div>' +
    '</div>';

  const refreshBtn = document.getElementById('rpRefreshBtn');
  refreshBtn.addEventListener('click', () => {
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = '<span class="util-spinner"></span>';
    // A full reload (not a bare /me fetch) re-runs guardDashboard from
    // scratch, so an approval that landed in the meantime takes the
    // approved-redirect branch below automatically - no separate
    // "did it change" logic to keep in sync with that check.
    window.location.reload();
  });

  document.getElementById('rpLogoutBtn').addEventListener('click', (e) => {
    e.currentTarget.disabled = true;
    performLogout(token);
  });
}

guardDashboard('admin', function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  if (user.school_registration_status === 'approved') {
    window.location.href = 'admin-dashboard.php';
    return;
  }
  renderPendingScreen(user, token);
});
