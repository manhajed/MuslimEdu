// No client-side compression - large images are just capped with a
// clear error instead of silently failing the upload.
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

document.body.classList.add('fixed-form-page');
function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(t('edit_profile.title', 'Edit Profile'), null);
}
renderHeaderText();
onLocaleChange(renderHeaderText);

let photoFile = null;
let currentPhotoUrl = null;
let userName = '';

function renderAvatar() {
  const wrap = document.getElementById('avatarPreviewWrap');
  const src = photoFile ? URL.createObjectURL(photoFile) : currentPhotoUrl;
  if (src) {
    wrap.innerHTML = '<img class="util-avatar-img" src="' + escapeHtml(src) + '" alt="" />';
  } else {
    const initial = (userName.trim().charAt(0) || '?').toUpperCase();
    wrap.innerHTML = '<div class="util-avatar-fallback">' + escapeHtml(initial) + '</div>';
  }
}

document.getElementById('avatarEditIcon').innerHTML = icon('camera', { size: 15, color: '#fff' });

document.getElementById('photoInput').addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  const errEl = document.getElementById('photoError');
  errEl.style.display = 'none';
  if (!file) return;
  if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
    errEl.textContent = t('edit_profile.err_image_type', 'Please choose a JPG, JPEG, or PNG image.');
    errEl.style.display = '';
    e.target.value = '';
    return;
  }
  if (file.size > MAX_PHOTO_BYTES) {
    errEl.textContent = t('edit_profile.err_image_too_large', 'That image is too large (max 5 MB).');
    errEl.style.display = '';
    e.target.value = '';
    return;
  }
  photoFile = file;
  renderAvatar();
});

document.getElementById('saveBtn').addEventListener('click', () => {
  const token = getStoredToken();
  if (!token) return;
  const name = document.getElementById('nameInput').value.trim();
  const email = document.getElementById('emailInput').value.trim();
  const address = document.getElementById('addressInput').value.trim();
  const nameAr = document.getElementById('nameArInput').value.trim();
  const phone = document.getElementById('phoneInput').value.trim();
  const gender = document.getElementById('genderInput').value;
  const birthday = document.getElementById('birthdayInput').value;
  const emergencyName = document.getElementById('emergencyNameInput').value.trim();
  const emergencyPhone = document.getElementById('emergencyPhoneInput').value.trim();

  if (!name) { showToast(t('edit_profile.err_name_required', 'Name is required.')); return; }
  if (!email) { showToast(t('edit_profile.err_email_required', 'Email is required.')); return; }

  const btn = document.getElementById('saveBtn');
  const label = document.getElementById('saveBtnLabel');
  btn.disabled = true;
  btn.classList.add('loading');
  label.innerHTML = '<span class="util-spinner"></span>';

  updateMyProfile(token, {
    name, email,
    name_ar: nameAr || undefined,
    phone: phone || undefined,
    address: address || undefined,
    gender: gender || undefined,
    birthday: birthday || undefined,
    emergency_contact_name: emergencyName || undefined,
    emergency_contact_phone: emergencyPhone || undefined,
    photoFile,
  })
    .then(() => {
      showToast(t('edit_profile.saved_toast', 'Your profile has been updated.'));
      setTimeout(() => { window.location.href = 'account-settings.php'; }, 900);
    })
    .catch((err) => {
      showToast(err && err.message ? err.message : t('edit_profile.save_failed', 'Could not save your profile.'));
    })
    .finally(() => {
      btn.disabled = false;
      btn.classList.remove('loading');
      label.textContent = t('edit_profile.save_btn', 'Save Changes');
    });
});

guardDashboard(null, function (user) {
  document.getElementById('routeGuardSplash')?.remove();
  document.getElementById('utilBody').style.display = '';
  userName = user.name || '';
  currentPhotoUrl = absoluteUrl(user.photo);
  document.getElementById('nameInput').value = user.name || '';
  document.getElementById('nameArInput').value = user.name_ar || '';
  document.getElementById('emailInput').value = user.email || '';
  document.getElementById('phoneInput').value = user.phone || '';
  document.getElementById('addressInput').value = user.address || '';
  document.getElementById('genderInput').value = user.gender || '';
  document.getElementById('birthdayInput').value = user.birthday || '';
  document.getElementById('emergencyNameInput').value = user.emergency_contact_name || '';
  document.getElementById('emergencyPhoneInput').value = user.emergency_contact_phone || '';
  renderAvatar();
});
