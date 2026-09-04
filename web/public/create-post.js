// New Post / Edit Post / Repost with comment - web port of
// CreatePostScreen.tsx. Three modes sharing one page, same as the RN
// screen: a brand-new post is a photo-first 3-step wizard (Photo ->
// Caption -> Privacy, one required photo, same as the RN screen's own
// Instagram-style rule); editing an existing post or adding a comment to
// a repost is a single simpler panel (text + privacy, no photo step -
// matches CreatePostScreen.tsx's own "edit/repost: text-first, unchanged"
// branch). Not ported: the nudity/violence image-moderation check
// (checkImageModeration in the RN app) - that call hits a model-backed
// endpoint this pass doesn't wire up; see READ-ME-FIRST.txt.

const MAX_POST_IMAGES = 20;

function qsParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

let cpToken = null;
let cpUser = null;
let cpMode = 'new'; // 'new' | 'edit' | 'repost'
let cpEditPost = null;
let cpRepostOfId = null;
let cpContent = '';
let cpPrivacy = 'school';
let cpImages = []; // [{ file, previewUrl }]
let cpPreviewIndex = 0;
let cpStep = 1; // 1..3, new-post wizard only
let cpSubmitting = false;
let cpCompressing = false;

function canComposePost() {
  return cpUser && (cpUser.role === 'admin' || cpUser.role === 'superadmin' || cpUser.role === 'teacher');
}

const PRIVACY_CHOICES = [
  { key: 'school', icon: 'users', labelKey: 'privacy_school', label: 'School', descKey: 'privacy_desc_school', desc: 'People at your school can see this' },
  { key: 'public', icon: 'globe', labelKey: 'privacy_public', label: 'Public', descKey: 'privacy_desc_public', desc: 'Anyone can see this' },
  { key: 'private', icon: 'lock', labelKey: 'privacy_only_me', label: 'Only me', descKey: 'privacy_desc_private', desc: 'Only you can see this' },
];

function privacyPickerHtml() {
  return (
    '<div class="ip-step-heading">' + escapeHtml(t('create_post.who_can_see', 'Who can see this?')) + '</div>' +
    '<div class="util-card">' +
      PRIVACY_CHOICES.map(opt =>
        '<button type="button" class="cp-privacy-row' + (cpPrivacy === opt.key ? ' active' : '') + '" data-privacy="' + opt.key + '">' +
          '<span class="cp-privacy-icon">' + icon(opt.icon, { size: 17, color: cpPrivacy === opt.key ? 'var(--emerald-deep)' : 'var(--subtle)' }) + '</span>' +
          '<span class="cp-privacy-text"><span class="cp-privacy-label">' + escapeHtml(t('create_post.' + opt.labelKey, opt.label)) + '</span><span class="cp-privacy-desc">' + escapeHtml(t('create_post.' + opt.descKey, opt.desc)) + '</span></span>' +
          (cpPrivacy === opt.key ? icon('check', { size: 15, color: 'var(--emerald-deep)' }) : '') +
        '</button>'
      ).join('') +
    '</div>'
  );
}
function wirePrivacyPicker() {
  document.querySelectorAll('[data-privacy]').forEach(btn => {
    btn.addEventListener('click', () => { cpPrivacy = btn.dataset.privacy; renderContent(); });
  });
}

function canSubmit() {
  if (cpSubmitting || cpCompressing) return false;
  if (cpMode === 'new') return cpImages.length > 0;
  if (cpMode === 'edit') return cpContent.trim().length > 0 || cpImages.length > 0 || (cpEditPost.images && cpEditPost.images.length > 0);
  return true; // repost: comment is optional
}

// ── New-post wizard ──
function renderNewPostStep() {
  document.getElementById('cpStepperWrap').innerHTML =
    '<div class="ip-stepper">' + [1, 2, 3].map(s => '<div class="ip-step-dot ' + (s < cpStep ? 'done' : s === cpStep ? 'active' : '') + '"></div>').join('') + '</div>' +
    '<div class="ip-step-label">' + escapeHtml(t('institution_profile.step_label_template', 'Step {n} of {total}:').replace('{n}', cpStep).replace('{total}', 3)) +
      ' <strong>' + escapeHtml([t('create_post.step_photo', 'Photo'), t('create_post.step_caption', 'Caption'), t('create_post.step_privacy', 'Privacy')][cpStep - 1]) + '</strong></div>';

  const content = document.getElementById('cpContent');
  if (cpStep === 1) {
    const preview = cpImages[cpPreviewIndex] || cpImages[0];
    content.innerHTML =
      '<div class="cp-preview-wrap">' +
        (preview
          ? '<img class="cp-preview" src="' + escapeHtml(preview.previewUrl) + '" alt="" />'
          : '<button type="button" class="cp-preview cp-preview-empty" id="cpAddFirstPhotoBtn"' + (cpCompressing ? ' disabled' : '') + '>' +
              (cpCompressing ? '<span class="util-spinner"></span>' :
                '<span class="cp-add-photo-icon">' + icon('images', { size: 26, color: 'var(--emerald-deep)' }) + '</span>' +
                '<span class="cp-add-photo-title">' + escapeHtml(t('create_post.add_photos_title', 'Add Photos')) + '</span>' +
                '<span class="cp-add-photo-desc">' + escapeHtml(t('create_post.add_photos_desc', 'Choose up to 20 photos from your library')) + '</span>') +
            '</button>') +
      '</div>' +
      (cpImages.length
        ? '<div class="cp-thumb-strip">' +
            cpImages.map((img, i) => (
              '<div class="cp-thumb-wrap' + (i === cpPreviewIndex ? ' active' : '') + '" data-thumb="' + i + '">' +
                '<img class="cp-thumb" src="' + escapeHtml(img.previewUrl) + '" alt="" />' +
                '<button type="button" class="cp-thumb-remove" data-remove-image="' + i + '">' + icon('close', { size: 11, color: '#fff' }) + '</button>' +
              '</div>'
            )).join('') +
            (cpImages.length < MAX_POST_IMAGES ? '<button type="button" class="cp-thumb-add" id="cpAddMorePhotoBtn"' + (cpCompressing ? ' disabled' : '') + '>' + (cpCompressing ? '<span class="util-spinner"></span>' : icon('plus', { size: 18, color: 'var(--emerald-deep)' })) + '</button>' : '') +
          '</div>'
        : '');
    document.getElementById('cpAddFirstPhotoBtn')?.addEventListener('click', () => document.getElementById('cpFileInput').click());
    document.getElementById('cpAddMorePhotoBtn')?.addEventListener('click', () => document.getElementById('cpFileInput').click());
    document.querySelectorAll('[data-thumb]').forEach(el => el.addEventListener('click', () => { cpPreviewIndex = parseInt(el.dataset.thumb, 10); renderNewPostStep(); }));
    document.querySelectorAll('[data-remove-image]').forEach(el => el.addEventListener('click', (e) => {
      e.stopPropagation();
      const i = parseInt(el.dataset.removeImage, 10);
      URL.revokeObjectURL(cpImages[i].previewUrl);
      cpImages.splice(i, 1);
      cpPreviewIndex = Math.max(0, Math.min(cpPreviewIndex, cpImages.length - 1));
      renderNewPostStep();
    }));
  } else if (cpStep === 2) {
    const preview = cpImages[cpPreviewIndex] || cpImages[0];
    content.innerHTML =
      '<div class="cp-caption-row">' +
        (preview ? '<img class="cp-caption-thumb" src="' + escapeHtml(preview.previewUrl) + '" alt="" />' : '') +
        '<textarea class="cp-caption-field" id="cpCaptionField" rows="5" maxlength="2000" placeholder="' + escapeHtml(t('create_post.caption_placeholder', 'Add a caption (optional)...')) + '">' + escapeHtml(cpContent) + '</textarea>' +
      '</div>';
    document.getElementById('cpCaptionField').addEventListener('input', (e) => { cpContent = e.target.value; });
  } else {
    content.innerHTML = privacyPickerHtml();
    wirePrivacyPicker();
  }
  renderNewPostFooter();
}
function renderNewPostFooter() {
  const isLast = cpStep === 3;
  const nextDisabled = cpCompressing || (cpStep === 1 && cpImages.length === 0) || (isLast && !canSubmit());
  document.getElementById('cpFooterWrap').innerHTML =
    '<div class="ip-footer">' +
      (cpStep > 1 ? '<button type="button" class="ip-back-btn" id="cpBackStepBtn">' + escapeHtml(t('common.back', 'Back')) + '</button>' : '') +
      '<button type="button" class="ip-continue-btn" id="cpNextBtn"' + (nextDisabled ? ' disabled' : '') + '>' +
        (cpSubmitting ? '<span class="util-spinner"></span>' : escapeHtml(isLast ? t('create_post.share', 'Share') : t('create_post.next', 'Next'))) +
      '</button>' +
    '</div>';
  document.getElementById('cpBackStepBtn')?.addEventListener('click', () => { cpStep = Math.max(1, cpStep - 1); renderNewPostStep(); });
  document.getElementById('cpNextBtn').addEventListener('click', () => {
    if (nextDisabled) return;
    if (isLast) submitPost();
    else { cpStep = Math.min(3, cpStep + 1); renderNewPostStep(); window.scrollTo(0, 0); }
  });
}

// ── Edit / repost single panel ──
function renderContent() {
  if (cpMode === 'new') { renderNewPostStep(); return; }
  document.getElementById('cpStepperWrap').innerHTML = '';
  const content = document.getElementById('cpContent');
  const existingImages = cpMode === 'edit' && cpEditPost.images ? cpEditPost.images : [];
  content.innerHTML =
    '<div class="cp-text-row">' +
      postAvatarHtml(cpUser.photo, cpUser.name, 42) +
      '<textarea class="cp-text-field" id="cpTextField" rows="4" maxlength="2000" placeholder="' +
        escapeHtml(cpMode === 'repost' ? t('create_post.comment_placeholder', 'Add a comment (optional)...') : t('create_post.mind_placeholder', "What's on your mind?")) +
      '">' + escapeHtml(cpContent) + '</textarea>' +
    '</div>' +
    (existingImages.length
      ? '<div class="cp-existing-grid">' + existingImages.map(uri => '<div class="cp-existing-thumb-wrap"><img class="cp-existing-thumb" src="' + escapeHtml(uri) + '" alt="" /></div>').join('') + '</div>'
      : '') +
    privacyPickerHtml();
  document.getElementById('cpTextField').addEventListener('input', (e) => { cpContent = e.target.value; renderFooter(); });
  wirePrivacyPicker();
  renderFooter();
}
function renderFooter() {
  document.getElementById('cpFooterWrap').innerHTML =
    '<div class="ip-footer">' +
      '<button type="button" class="ip-continue-btn" id="cpSubmitBtn"' + (!canSubmit() ? ' disabled' : '') + '>' +
        (cpSubmitting ? '<span class="util-spinner"></span>' : escapeHtml(cpMode === 'edit' ? t('create_post.save', 'Save') : t('create_post.repost_button', 'Repost'))) +
      '</button>' +
    '</div>';
  document.getElementById('cpSubmitBtn').addEventListener('click', () => { if (canSubmit()) submitPost(); });
}

function submitPost() {
  if (!cpToken || !canSubmit()) return;
  cpSubmitting = true;
  if (cpMode === 'new') renderNewPostFooter(); else renderFooter();

  let promise;
  if (cpMode === 'edit') {
    promise = updatePost(cpToken, cpEditPost.id, { content: cpContent.trim(), privacy: cpPrivacy });
  } else if (cpMode === 'repost') {
    promise = repostPost(cpToken, cpRepostOfId, cpContent.trim() || undefined, cpPrivacy);
  } else {
    promise = createPost(cpToken, { content: cpContent.trim() || undefined, privacy: cpPrivacy }, cpImages.map(i => i.file));
  }

  promise.then(() => {
    window.location.href = 'newsfeed.php';
  }).catch(err => {
    cpSubmitting = false;
    if (cpMode === 'new') renderNewPostFooter(); else renderFooter();
    showToast((err && err.message) || t('create_post.error_title', "Couldn't post. Please try again."));
  });
}

function onFilesPicked(fileList) {
  const files = Array.from(fileList || []).slice(0, MAX_POST_IMAGES - cpImages.length);
  if (!files.length) return;
  cpCompressing = true;
  renderNewPostStep();
  const addOne = (index) => {
    if (index >= files.length) {
      cpCompressing = false;
      renderNewPostStep();
      return;
    }
    compressPostPhoto(files[index]).then(compressed => {
      cpImages.push({ file: compressed, previewUrl: URL.createObjectURL(compressed) });
    }).catch(err => {
      showToast((err && err.message) || t('create_post.err_image_process', 'Could not process that image.'));
    }).finally(() => addOne(index + 1));
  };
  addOne(0);
}

function renderHeaderText() {
  const title = cpMode === 'edit' ? t('create_post.edit_title', 'Edit Post') : cpMode === 'repost' ? t('create_post.repost_title', 'Repost') : t('create_post.new_title', 'New Post');
  document.getElementById('utilHeaderWrap').innerHTML = renderUtilHeader(title, null, 'newsfeed.php', null);
}

function boot(user, token) {
  cpUser = user;
  cpToken = token;

  if (!canComposePost()) {
    showToast(t('create_post.not_allowed_message', 'Only admins and teachers can create or edit posts.'));
    window.location.href = 'newsfeed.php';
    return;
  }

  const editPostId = qsParam('editPostId');
  const repostOfId = qsParam('repostOfId');

  if (editPostId) {
    let stored = null;
    try { stored = JSON.parse(sessionStorage.getItem('editPost') || 'null'); } catch (e) { /* ignore */ }
    if (!stored || String(stored.id) !== String(editPostId)) {
      showToast(t('create_post.edit_missing', 'Could not find that post to edit.'));
      window.location.href = 'newsfeed.php';
      return;
    }
    cpMode = 'edit';
    cpEditPost = stored;
    cpContent = stored.content || '';
    cpPrivacy = stored.privacy || 'school';
  } else if (repostOfId) {
    cpMode = 'repost';
    cpRepostOfId = parseInt(repostOfId, 10);
    cpPrivacy = 'school';
  } else {
    cpMode = 'new';
  }

  renderHeaderText();
  onLocaleChange(() => { renderHeaderText(); renderContent(); });

  document.getElementById('cpFileInput').addEventListener('change', (e) => {
    onFilesPicked(e.target.files);
    e.target.value = '';
  });

  document.getElementById('cpRoot').style.display = '';
  document.getElementById('routeGuardSplash')?.remove();
  renderContent();
}

guardDashboard(null, function (user, token) {
  boot(user, token);
});
