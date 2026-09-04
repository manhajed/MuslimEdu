// Platform-wide SMTP configuration - backs the "SMTP Settings" card on the
// superadmin dashboard. One mail server for the whole MuslimEdu community
// (password resets, admission confirmations, etc.), not per-school - same
// "platform-wide credentials" shape as messenger-settings.js/
// Firebase Configuration, just for outgoing mail instead of Messenger/push.

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(t('smtp_settings.title', 'SMTP Settings'), t('smtp_settings.subtitle', 'Platform-wide outgoing mail server'), 'superadmin-dashboard.php', null);
}
renderHeaderText();
onLocaleChange(renderHeaderText);

let smtpTokenRef = null;

function loadSmtpSettings(token) {
  authedPost('/smtp_settings_show', token).then(data => {
    document.getElementById('smtpHost').value = data.host || '';
    document.getElementById('smtpPort').value = data.port || '';
    document.getElementById('smtpEncryption').value = data.encryption || 'tls';
    document.getElementById('smtpUsername').value = data.username || '';
    document.getElementById('smtpFromAddress').value = data.from_address || '';
    document.getElementById('smtpFromName').value = data.from_name || '';
    // Never shows the real password - just hints one is already saved, so
    // leaving the field blank on save is understood as "keep it" rather
    // than looking like nothing was ever set. Same pattern as
    // messenger-settings.js's Page Access Token / App Secret fields.
    document.getElementById('smtpPassword').placeholder =
      data.has_password ? t('smtp_settings.password_already_set', '•••••••• (already set)') : '';
  }).catch(err => {
    showToast((err && err.message) || t('smtp_settings.load_failed', 'Could not load SMTP settings.'));
  });
}

document.getElementById('smtpSaveBtn').addEventListener('click', () => {
  if (!smtpTokenRef) return;
  const btn = document.getElementById('smtpSaveBtn');
  const label = document.getElementById('smtpSaveBtnLabel');
  btn.disabled = true;
  label.innerHTML = '<span class="util-spinner"></span>';

  const body = {
    host: document.getElementById('smtpHost').value.trim() || null,
    port: document.getElementById('smtpPort').value.trim() || null,
    encryption: document.getElementById('smtpEncryption').value,
    username: document.getElementById('smtpUsername').value.trim() || null,
    from_address: document.getElementById('smtpFromAddress').value.trim() || null,
    from_name: document.getElementById('smtpFromName').value.trim() || null,
  };
  // Only sent when actually typed - an empty field means "leave the
  // existing password alone", not "clear it" (see the backend's
  // adminUpdate()). Same convention as messenger-settings.js.
  const password = document.getElementById('smtpPassword').value;
  if (password) body.password = password;

  authedPost('/smtp_settings_update', smtpTokenRef, body)
    .then(() => {
      showToast(t('smtp_settings.saved_toast', 'SMTP settings saved.'));
      document.getElementById('smtpPassword').value = '';
      loadSmtpSettings(smtpTokenRef);
    })
    .catch(err => {
      showToast((err && err.message) || t('smtp_settings.save_failed', 'Could not save SMTP settings.'));
    })
    .finally(() => {
      btn.disabled = false;
      label.textContent = t('smtp_settings.save_btn', 'Save SMTP Settings');
    });
});

// Result shown inline rather than as a toast, same reasoning as
// messenger-settings.js's Subscribe button: a delivery failure reason
// (auth rejected, connection timed out, etc.) is worth reading, not just
// a pass/fail flash.
document.getElementById('smtpTestBtn').addEventListener('click', () => {
  if (!smtpTokenRef) return;
  const to = document.getElementById('smtpTestEmail').value.trim();
  const result = document.getElementById('smtpTestResult');
  if (!to) {
    result.style.display = '';
    result.style.color = '#EF4444';
    result.textContent = t('smtp_settings.test_email_required', 'Enter an address to send the test to.');
    return;
  }
  const btn = document.getElementById('smtpTestBtn');
  const label = document.getElementById('smtpTestBtnLabel');
  btn.disabled = true;
  label.innerHTML = '<span class="util-spinner"></span>';
  result.style.display = 'none';

  authedPost('/smtp_test_email', smtpTokenRef, { to: to })
    .then(res => {
      result.style.display = '';
      result.style.color = 'var(--emerald-deep)';
      result.textContent = (res && res.message) || t('smtp_settings.test_ok', 'Test email sent.');
    })
    .catch(err => {
      result.style.display = '';
      result.style.color = '#EF4444';
      result.textContent = (err && err.message) || t('smtp_settings.test_failed', 'Could not send the test email.');
    })
    .finally(() => {
      btn.disabled = false;
      label.textContent = t('smtp_settings.test_btn', 'Send Test Email');
    });
});

guardDashboard('superadmin', function (user, token) {
  smtpTokenRef = token;
  document.getElementById('routeGuardSplash')?.remove();
  document.getElementById('utilBody').style.display = '';
  document.getElementById('bottomNavWrap').innerHTML = renderBottomNav(user.role);
  loadSmtpSettings(token);
});
