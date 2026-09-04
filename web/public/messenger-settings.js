function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(t('messenger_settings.title', 'Messenger Integration'), t('messenger_settings.subtitle', "Echo notifications to MuslimEdu's Facebook Page"), 'superadmin-dashboard.php', null);
}
renderHeaderText();
onLocaleChange(renderHeaderText);

let msTokenRef = null;

function loadMessengerSettings(token) {
  authedPost('/messenger_settings_show', token).then(data => {
    document.getElementById('msPageId').value = data.page_id || '';
    document.getElementById('msPageUsername').value = data.page_username || '';
    document.getElementById('msVerifyToken').value = data.webhook_verify_token || '';
    document.getElementById('msWebhookUrl').value = data.webhook_url || '';
    // Never shows the real secret - just hints one is already saved, so
    // leaving the field blank on save is understood as "keep it" rather
    // than looking like nothing was ever set.
    document.getElementById('msPageAccessToken').placeholder =
      data.has_page_access_token ? t('messenger_settings.token_already_set', '•••••••• (already set)') : '';
    document.getElementById('msAppSecret').placeholder =
      data.has_app_secret ? t('messenger_settings.secret_already_set', '•••••••• (already set)') : '';
  }).catch(err => {
    showToast((err && err.message) || t('messenger_settings.load_failed', 'Could not load Messenger settings.'));
  });
}

document.getElementById('msCopyUrlBtn').addEventListener('click', () => {
  const input = document.getElementById('msWebhookUrl');
  input.select();
  navigator.clipboard?.writeText(input.value).then(() => {
    showToast(t('messenger_settings.copied_toast', 'Copied.'));
  }).catch(() => {
    // Clipboard API can be unavailable (permissions, non-HTTPS in some
    // browsers) - the field is still selected, so a manual Ctrl+C/Cmd+C
    // works as a fallback either way.
  });
});
function paintCopyIcon() {
  document.getElementById('msCopyUrlBtn').innerHTML = icon('document', { size: 16, color: 'var(--emerald-deep)' });
}
paintCopyIcon();
onLocaleChange(paintCopyIcon);

// Connects the Page to this app's webhook (Graph /subscribed_apps) - see
// MessengerIntegrationController::subscribePage(). Result is shown inline
// rather than as a toast because it lists the fields Meta reports back,
// which is the actual confirmation worth reading, not a "done" flash.
document.getElementById('msSubscribeBtn').addEventListener('click', () => {
  if (!msTokenRef) return;
  const btn = document.getElementById('msSubscribeBtn');
  const label = document.getElementById('msSubscribeBtnLabel');
  const result = document.getElementById('msSubscribeResult');
  btn.disabled = true;
  label.innerHTML = '<span class="util-spinner"></span>';
  result.style.display = 'none';

  authedPost('/messenger_subscribe_page', msTokenRef)
    .then(res => {
      result.style.display = '';
      result.style.color = 'var(--emerald-deep)';
      result.textContent = (res && res.message) || t('messenger_settings.subscribe_ok', 'Page subscribed.');
    })
    .catch(err => {
      result.style.display = '';
      result.style.color = '#EF4444';
      result.textContent = (err && err.message) || t('messenger_settings.subscribe_failed', 'Could not subscribe the Page.');
    })
    .finally(() => {
      btn.disabled = false;
      label.textContent = t('messenger_settings.subscribe_btn', 'Subscribe Page to webhook');
    });
});

document.getElementById('msSaveBtn').addEventListener('click', () => {
  if (!msTokenRef) return;
  const btn = document.getElementById('msSaveBtn');
  const label = document.getElementById('msSaveBtnLabel');
  btn.disabled = true;
  label.innerHTML = '<span class="util-spinner"></span>';

  const body = {
    page_id: document.getElementById('msPageId').value.trim() || null,
    page_username: document.getElementById('msPageUsername').value.trim() || null,
    webhook_verify_token: document.getElementById('msVerifyToken').value.trim() || null,
  };
  const accessToken = document.getElementById('msPageAccessToken').value.trim();
  const appSecret = document.getElementById('msAppSecret').value.trim();
  // Only sent when actually typed - an empty field means "leave the
  // existing one alone" (see the backend's adminUpdate()), not "clear it".
  if (accessToken) body.page_access_token = accessToken;
  if (appSecret) body.app_secret = appSecret;

  authedPost('/messenger_settings_update', msTokenRef, body)
    .then(() => {
      showToast(t('messenger_settings.saved_toast', 'Messenger settings saved.'));
      document.getElementById('msPageAccessToken').value = '';
      document.getElementById('msAppSecret').value = '';
      loadMessengerSettings(msTokenRef);
    })
    .catch(err => {
      showToast((err && err.message) || t('messenger_settings.save_failed', 'Could not save Messenger settings.'));
    })
    .finally(() => {
      btn.disabled = false;
      label.textContent = t('messenger_settings.save_btn', 'Save Messenger settings');
    });
});

guardDashboard('superadmin', function (user, token) {
  msTokenRef = token;
  document.getElementById('routeGuardSplash')?.remove();
  document.getElementById('utilBody').style.display = '';
  document.getElementById('bottomNavWrap').innerHTML = renderBottomNav(user.role);
  loadMessengerSettings(token);
});
