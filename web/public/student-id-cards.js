// Ported from StudentIdCardsScreen.tsx - admin browse-all-students-ID-cards.
// "Sync all students automatically" just means every student already has
// a card the moment they have a `code` (a field every user already has),
// so this is purely a browsing/print UI, nothing to generate or persist
// server-side. Backend: POST /admin_children_list, /admin_child_profile,
// /my_school_branding.
//
// The card header is dressed either with an uploaded image
// (`id_card_background`) or one of four colours (`id_card_theme`), both set
// here by an admin and both stored on the school record - an image wins
// while one is present. They live server-side rather than in localStorage
// (where the original colour picker lived) precisely so they reach the
// students being styled: every student's own My ID Card page reads the same
// two fields off /my_school_branding. Students get no picker of their own -
// this is the school's identity, not a per-student preference. Batch export
// (view-shot capture, like the RN app's Select mode) has no web
// equivalent under this app's CSP, so "Download All" instead prints every
// card in one pass and leaves turning that into a PDF to the browser's
// native print-to-PDF destination - the same mechanism the single-card
// "Print / Save as PDF" button already relies on.

let allStudents = [];
let branding = {};
let cardStudent = null;
let cardToken = null;
let cardProfile = null;
let sidBooted = false;
let bgBusy = false;

function renderList() {
  const wrap = document.getElementById('idListWrap');
  if (!allStudents.length) {
    wrap.innerHTML =
      '<div class="list-empty">' +
        '<div class="list-empty-title">' + escapeHtml(t('student_id_cards.no_students', 'No students found')) + '</div>' +
      '</div>';
    return;
  }
  wrap.innerHTML = '<div class="list-card" style="flex-direction:column;align-items:stretch;padding:4px 16px;">' +
    allStudents.map(s => {
      const initial = (s.name || '?').trim().charAt(0).toUpperCase();
      return (
        '<button type="button" class="id-list-row" data-id="' + s.id + '">' +
          (s.photo
            ? '<img class="list-avatar" src="' + escapeHtml(absoluteUrl(s.photo)) + '" alt="" />'
            : '<span class="list-avatar-fallback">' + escapeHtml(initial) + '</span>') +
          '<span class="list-card-body">' +
            '<span class="list-card-name">' + escapeHtml(s.name) + '</span>' +
            (s.code ? '<div class="list-card-meta">' + escapeHtml(s.code) + '</div>' : '') +
          '</span>' +
          icon('chevron', { size: 16, color: 'var(--subtle)' }) +
        '</button>'
      );
    }).join('') +
  '</div>';

  wrap.querySelectorAll('[data-id]').forEach(row => {
    row.addEventListener('click', () => openCard(parseInt(row.dataset.id, 10)));
  });
}

function cardDataFor(s, profile) {
  const p = profile || {};
  return {
    name: s.name,
    nameAr: p.name_ar ?? s.name_ar ?? null,
    // Prefer the freshly-fetched profile's photo over the list-summary
    // one - admin_children_list is a summary endpoint that may not carry
    // a photo even when the student has one on file; admin_child_profile
    // is the authoritative source.
    photo: p.photo ?? s.photo,
    code: s.code || String(s.id),
    className: s.class_name,
    sectionName: s.section_name,
    schoolName: branding.name,
    // Not every backend deployment's /my_school_branding response includes
    // this yet (the RN app's own school-identity views read it from the
    // separate admin_school_setup_status endpoint) - harmless either way,
    // buildIdCardHtml() just omits the row when it's absent.
    schoolNameAr: branding.name_ar,
    schoolAddress: branding.address,
    // Only present on backends that carry a separate Arabic address -
    // buildIdCardHtml() omits the line entirely when it's absent.
    schoolAddressAr: branding.address_ar,
    schoolLogo: branding.logo,
    // Same "not every backend has this field yet" situation as name_ar
    // above - buildIdCardHtml() just omits the SEC REG line when absent.
    secReg: branding.sec_reg,
    secRegAr: branding.sec_reg_ar,
    background: branding.id_card_background,
    themeKey: branding.id_card_theme,
    dob: p.birthday ?? null,
    address: p.address ?? s.address ?? null,
    emergencyContactName: p.emergency_contact_name ?? null,
    emergencyContactPhone: p.emergency_contact_phone ?? null,
    signatureUrl: p.signature ?? null,
  };
}

function openCard(studentId) {
  const s = allStudents.find(x => x.id === studentId);
  if (!s) return;
  cardStudent = s;
  cardProfile = null;
  renderCardModal();
  document.getElementById('cardModal').classList.add('open');

  // Full profile (DOB, emergency contact, signature) isn't in the list
  // response - fetched on demand the moment a card is opened. The card
  // still renders immediately with the summary fields while this resolves.
  fetchChildProfile(cardToken, studentId).then(profile => {
    if (!cardStudent || cardStudent.id !== studentId) return;
    cardProfile = profile;
    renderCardModal();
  }).catch(() => {});
}
function renderCardModal() {
  const data = cardDataFor(cardStudent, cardProfile);
  document.getElementById('cardModalInner').innerHTML =
    buildIdCardHtml(data) +
    '<button type="button" class="util-save-btn pill" id="printCardBtn" style="max-width:288px;margin-left:auto;margin-right:auto;">' + escapeHtml(t('student_id_cards.print_save_pdf', 'Print / Save as PDF')) + '</button>';

  document.getElementById('printCardBtn').addEventListener('click', () => window.print());
}
function closeCard() {
  document.getElementById('cardModal').classList.remove('open');
  cardStudent = null;
  cardProfile = null;
}

// School-wide background image + batch export, both above the list.
function renderToolbar() {
  const wrap = document.getElementById('idToolbarWrap');
  if (!wrap) return;
  const bgUrl = branding.id_card_background ? absoluteUrl(branding.id_card_background) : null;

  wrap.innerHTML =
    secRegNudgeHtml(branding) +
    '<div class="id-toolbar-label">' + escapeHtml(t('student_id_cards.card_background_label', 'Card background — applies to every student’s card')) + '</div>' +
    // Colour is what shows when no image is uploaded; the swatches stay
    // visible (dimmed) while an image is in place so it's obvious what
    // removing the image will fall back to.
    '<div class="id-bg-colors' + (bgUrl ? ' id-bg-colors-muted' : '') + '">' +
      buildThemeRowHtml(branding.id_card_theme || 'emerald') +
      (bgUrl ? '<div class="id-bg-hint">' + escapeHtml(t('student_id_cards.bg_color_overridden', 'The uploaded image is showing instead. Remove it to use a colour.')) + '</div>' : '') +
    '</div>' +
    '<div class="id-bg-row">' +
      (bgUrl
        ? '<span class="id-bg-thumb" style="background-image:url(\'' + escapeHtml(bgUrl).replace(/'/g, '') + '\');"></span>'
        : '<span class="id-bg-thumb id-bg-thumb-empty">' + icon('images', { size: 16, color: 'var(--subtle)' }) + '</span>') +
      '<div class="id-bg-copy">' +
        '<div class="id-bg-state">' + escapeHtml(bgUrl
          ? t('student_id_cards.bg_set', 'Background image set')
          : t('student_id_cards.bg_none', 'No background image yet')) + '</div>' +
        '<div class="id-bg-hint">' + escapeHtml(t('student_id_cards.bg_hint', 'JPG or PNG, max 3 MB. Every student sees this on their own ID.')) + '</div>' +
      '</div>' +
      '<div class="id-bg-actions">' +
        '<button type="button" class="id-bg-btn" id="idBgChangeBtn"' + (bgBusy ? ' disabled' : '') + '>' +
          escapeHtml(bgBusy
            ? t('student_id_cards.bg_uploading', 'Uploading…')
            : (bgUrl ? t('student_id_cards.bg_change', 'Change') : t('student_id_cards.bg_upload', 'Upload'))) +
        '</button>' +
        (bgUrl && !bgBusy
          ? '<button type="button" class="id-bg-btn id-bg-btn-danger" id="idBgRemoveBtn">' + escapeHtml(t('student_id_cards.bg_remove', 'Remove')) + '</button>'
          : '') +
      '</div>' +
      '<input type="file" id="idBgFile" accept="image/jpeg,image/png" hidden />' +
    '</div>' +
    '<button type="button" class="util-save-btn pill id-batch-btn" id="idBatchDownloadBtn">' + escapeHtml(t('student_id_cards.download_all_btn', 'Download All (PDF)')) + '</button>';

  wireSecRegNudgeDismiss();
  // Swatches are non-interactive (not just dimmed) while an image is set -
  // the image always wins visually, so a color tap here would silently do
  // nothing to what's actually showing, which read as another dead button.
  wrap.querySelectorAll('.theme-swatch').forEach(btn => {
    btn.addEventListener('click', () => { if (!bgBusy && !bgUrl) pickTheme(btn.dataset.key); });
  });
  const fileInput = document.getElementById('idBgFile');
  document.getElementById('idBgChangeBtn').addEventListener('click', () => { if (!bgBusy) fileInput.click(); });
  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    if (ID_CARD_BG_TYPES.indexOf(file.type) === -1) {
      showToast(t('student_id_cards.bg_type_error', 'Choose a JPG or PNG image.'));
      return;
    }
    // Crop/position first, then upload the cropped result - the size cap
    // (ID_CARD_BG_MAX_BYTES) is enforced by the cropper's own JPEG
    // compression, not on the original picked file, since cropping already
    // re-encodes it regardless of how large the source photo was.
    openBackgroundCropper(file, (croppedFile) => uploadBackground(croppedFile));
  });
  document.getElementById('idBgRemoveBtn')?.addEventListener('click', removeBackground);
  document.getElementById('idBatchDownloadBtn').addEventListener('click', () => downloadAllCardsPdf(cardToken));
}

// Applying the new background to `branding` re-renders every card this page
// draws; students pick it up on their next load of their own ID page, since
// both read the same /my_school_branding field.
function applyBackground(school) {
  branding.id_card_background = (school && school.id_card_background) || null;
  if (school && school.id_card_theme) branding.id_card_theme = school.id_card_theme;
  renderToolbar();
  if (cardStudent) renderCardModal();
}
function pickTheme(key) {
  const previous = branding.id_card_theme;
  if (previous === key) return;
  // Optimistic: the swatch and any open card recolour immediately, then
  // roll back to `previous` if the save doesn't stick.
  branding.id_card_theme = key;
  renderToolbar();
  if (cardStudent) renderCardModal();
  saveIdCardTheme(cardToken, key).then(school => {
    applyBackground(school);
    showToast(t('student_id_cards.color_saved', 'Card colour updated for every student.'));
  }).catch(err => {
    branding.id_card_theme = previous;
    renderToolbar();
    if (cardStudent) renderCardModal();
    showToast((err && err.message) || t('student_id_cards.bg_failed', 'Could not update the background.'));
  });
}
function uploadBackground(file) {
  if (ID_CARD_BG_TYPES.indexOf(file.type) === -1) {
    showToast(t('student_id_cards.bg_type_error', 'Choose a JPG or PNG image.'));
    return;
  }
  if (file.size > ID_CARD_BG_MAX_BYTES) {
    showToast(t('student_id_cards.bg_size_error', 'That image is too large (max 3 MB).'));
    return;
  }
  bgBusy = true;
  renderToolbar();
  saveIdCardBackground(cardToken, file).then(school => {
    applyBackground(school);
    showToast(t('student_id_cards.bg_saved', 'Card background updated for every student.'));
  }).catch(err => {
    showToast((err && err.message) || t('student_id_cards.bg_failed', 'Could not update the background.'));
  }).finally(() => {
    bgBusy = false;
    renderToolbar();
  });
}
function removeBackground() {
  if (!window.confirm(t('student_id_cards.bg_remove_confirm', 'Remove the card background? Every student’s ID will fall back to the default.'))) return;
  bgBusy = true;
  renderToolbar();
  clearIdCardBackground(cardToken).then(school => {
    applyBackground(school);
    showToast(t('student_id_cards.bg_removed', 'Card background removed.'));
  }).catch(err => {
    showToast((err && err.message) || t('student_id_cards.bg_failed', 'Could not update the background.'));
  }).finally(() => {
    bgBusy = false;
    renderToolbar();
  });
}

// Runs `fn` over `items` with at most `limit` calls in flight at once -
// used below so exporting a large roster fires a handful of concurrent
// /admin_child_profile requests instead of one unbounded Promise.all
// hitting the API all at the same time.
function mapWithConcurrency(items, limit, fn) {
  return new Promise((resolve) => {
    const results = new Array(items.length);
    if (items.length === 0) { resolve(results); return; }
    let nextIndex = 0;
    let completed = 0;
    function startOne() {
      const i = nextIndex++;
      if (i >= items.length) return;
      fn(items[i], i)
        .then((r) => { results[i] = r; })
        .catch(() => { results[i] = null; })
        .finally(() => {
          completed++;
          if (completed === items.length) resolve(results);
          else startOne();
        });
    }
    const workers = Math.min(limit, items.length);
    for (let k = 0; k < workers; k++) startOne();
  });
}

function downloadAllCardsPdf(token) {
  if (!allStudents.length) { showToast(t('student_id_cards.no_students_to_export', 'No students to export.')); return; }

  const btn = document.getElementById('idBatchDownloadBtn');
  if (btn) { btn.disabled = true; btn.textContent = t('student_id_cards.preparing', 'Preparing…'); }
  closeCard(); // avoid the single-card modal and the batch sheet printing at once

  mapWithConcurrency(allStudents, 6, (s) => fetchChildProfile(token, s.id).catch(() => null))
    .then((profiles) => {
      const printWrap = document.getElementById('idBatchPrintWrap');
      printWrap.innerHTML = allStudents.map((s, i) =>
        '<div class="id-batch-card">' + buildIdCardHtml(cardDataFor(s, profiles[i])) + '</div>'
      ).join('');

      document.body.classList.add('printing-batch');
      // Two rAFs so the browser actually paints the freshly-injected cards
      // (avatars, school logo, QR codes) before the print dialog opens -
      // without this, some browsers snapshot mid-decode and print blank
      // image boxes on the later cards in a long roster.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        window.print();
        document.body.classList.remove('printing-batch');
        if (btn) { btn.disabled = false; btn.textContent = t('student_id_cards.download_all_btn', 'Download All (PDF)'); }
      }));
    });
}

function load(token) {
  cardToken = token;
  document.getElementById('idListWrap').innerHTML = '<div class="list-loading">' + escapeHtml(t('student_id_cards.loading_students', 'Loading students…')) + '</div>';
  Promise.all([fetchStudents(token), fetchMySchoolBranding(token).catch(() => null)]).then(([list, b]) => {
    allStudents = list;
    branding = b || {};

    const gate = schoolProfileGateHtml(branding);
    if (gate) {
      document.getElementById('idToolbarWrap').innerHTML = '';
      document.getElementById('idListWrap').innerHTML = gate;
      return;
    }

    renderToolbar();
    renderList();
  }).catch(() => {
    document.getElementById('idListWrap').innerHTML =
      '<div class="list-error">' + escapeHtml(t('student_id_cards.load_failed', 'Could not load students.')) + '<br><button type="button" class="list-retry-btn" id="retryBtn">' + escapeHtml(t('common.retry', 'Try again')) + '</button></div>';
    document.getElementById('retryBtn')?.addEventListener('click', () => load(token));
  });
}

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML = renderUtilHeader(t('student_id_cards.title', 'Student ID Cards'), t('student_id_cards.subtitle', 'View and print every student’s ID card'), 'admin-dashboard.php', null);
}
renderHeaderText();
onLocaleChange(() => {
  renderHeaderText();
  if (!sidBooted) return;
  renderToolbar();
  renderList();
  if (cardStudent) renderCardModal();
});

document.getElementById('cardModalClose').addEventListener('click', closeCard);
document.getElementById('cardModal').addEventListener('click', e => { if (e.target.id === 'cardModal') closeCard(); });

guardDashboard('admin', function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  document.getElementById('utilBody').style.display = '';
  document.getElementById('bottomNavWrap').innerHTML = renderBottomNav('admin');
  load(token);
  sidBooted = true;
});
