document.body.classList.add('fixed-form-page');
function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML = renderUtilHeader(t('change_password.title', 'Security'), null, 'account-settings.php');
}
renderHeaderText();
onLocaleChange(renderHeaderText);

function wireEyeToggle(inputId, btnId) {
  const input = document.getElementById(inputId);
  const btn = document.getElementById(btnId);
  let visible = false;
  function render() {
    btn.innerHTML = icon(visible ? 'eyeoff' : 'eye', { size: 18, color: 'var(--subtle)' });
  }
  render();
  btn.addEventListener('click', () => {
    visible = !visible;
    input.type = visible ? 'text' : 'password';
    render();
  });
}
wireEyeToggle('currentPw', 'toggleCurrentPw');
wireEyeToggle('newPw', 'toggleNewPw');
wireEyeToggle('confirmPw', 'toggleConfirmPw');

document.getElementById('saveBtn').addEventListener('click', () => {
  const token = getStoredToken();
  if (!token) return;
  const current = document.getElementById('currentPw').value;
  const next = document.getElementById('newPw').value;
  const confirm = document.getElementById('confirmPw').value;

  if (!current || !next) {
    showToast(t('change_password.err_missing_fields', 'Enter your current password and a new password.'));
    return;
  }
  if (next !== confirm) {
    showToast(t('change_password.err_mismatch', 'New passwords don’t match.'));
    return;
  }

  const btn = document.getElementById('saveBtn');
  const label = document.getElementById('saveBtnLabel');
  btn.disabled = true;
  label.innerHTML = '<span class="util-spinner"></span>';

  updatePassword(token, current, next)
    .then(() => {
      showToast(t('change_password.success_toast', 'Your password has been changed.'));
      setTimeout(() => { window.location.href = 'account-settings.php'; }, 900);
    })
    .catch((err) => {
      showToast(err && err.message ? err.message : t('change_password.failed_toast', 'Could not change password.'));
    })
    .finally(() => {
      btn.disabled = false;
      label.textContent = t('change_password.save_btn', 'Change password');
    });
});

guardDashboard(null, function () {
  document.getElementById('routeGuardSplash')?.remove();
  document.getElementById('utilBody').style.display = '';
});
