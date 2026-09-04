// Browsable "Setup Checklist" page (Admin menu -> Setup Checklist), usable
// any time to review status - unlike the forced pre-dashboard gate
// (dashboard.js's renderAdminSetupGateScreen), this one has a real back
// button and never locks the rest of the app. Both now render through the
// same createSetupWizard (dashboard.js) so the two never drift into two
// different "9 items" experiences - this file only owns the loading state
// and where "back" from the overview step goes.

let wizard = null;

function mountWizard(items) {
  if (wizard) { wizard.refreshItems(items); return; }
  wizard = createSetupWizard(document.getElementById('wizardRoot'), {
    isGate: false,
    items: items,
    onBack: () => { window.location.href = 'admin-dashboard.php'; },
  });
}

guardDashboard('admin', function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();

  function load() {
    fetchSetupChecklistItems(token).then(mountWizard).catch(() => {
      document.getElementById('wizardRoot').innerHTML =
        '<div class="list-error" style="margin:20px;">' + escapeHtml(t('setup_checklist.load_failed', 'Failed to load setup status.')) + '<br>' +
          '<button type="button" class="list-retry-btn" id="checklistRetryBtn">' + escapeHtml(t('common.retry', 'Try again')) + '</button></div>';
      document.getElementById('checklistRetryBtn')?.addEventListener('click', load);
    });
  }
  load();

  // Re-check whenever the tab regains focus (e.g. the admin finished an
  // item on its real config page and used the browser back button to
  // return here) so the wizard auto-advances instead of showing stale
  // "To do" status until a manual reload.
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') load(); });
  window.addEventListener('focus', load);
});
