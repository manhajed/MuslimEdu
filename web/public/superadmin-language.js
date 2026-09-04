// Platform-wide language & translation management, mirroring the
// AcademicLocaleController superadmin (school_id = null) endpoints -
// backs the "Languages" card on the superadmin dashboard. These are the
// defaults every school inherits unless a school admin overrides a given
// key for their own school via LocalizationSettingsScreen/admin-locale
// pages (admin_locale_list_save / admin_translations_save).

document.getElementById('utilHeaderWrap').innerHTML =
  renderUtilHeader('Languages', 'Platform-wide language list and word-by-word translations', 'superadmin-dashboard.php');

let locales = [];
let selectedLocale = null;
let translations = {};
let dirtyKeys = new Set();

function renderLocales() {
  const card = document.getElementById('langCard');
  if (locales.length === 0) {
    card.innerHTML = '<div class="util-row"><span class="util-row-title" style="color:var(--subtle);">No languages configured yet.</span></div>';
    return;
  }
  card.innerHTML = '';
  locales.forEach(l => {
    const row = document.createElement('div');
    row.className = 'util-row';
    row.innerHTML =
      '<span class="util-row-icon">' + icon('globe', { size: 16, color: 'var(--ink)' }) + '</span>' +
      '<span class="util-row-title">' + escapeHtml(l.name) +
        (l.is_rtl ? ' <span class="mini-chip ok" style="margin-left:6px;">RTL</span>' : '') + '</span>' +
      '<span class="util-row-value">' + escapeHtml(l.code) + '</span>';
    card.appendChild(row);
  });
}

function renderChips() {
  document.getElementById('langChipRow').innerHTML = locales.map(l =>
    '<button type="button" class="chip' + (selectedLocale === l.code ? ' selected' : '') + '" data-code="' + escapeHtml(l.code) + '">' + escapeHtml(l.name) + '</button>'
  ).join('');
  document.querySelectorAll('#langChipRow .chip').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedLocale = btn.getAttribute('data-code');
      renderChips();
      loadTranslations(getStoredToken());
    });
  });
}

function renderTranslations() {
  const card = document.getElementById('translationsCard');
  const keys = Object.keys(translations).sort();
  if (keys.length === 0) {
    card.innerHTML = '<div class="util-row"><span class="util-row-title" style="color:var(--subtle);">No overrides yet for this language.</span></div>';
    return;
  }
  card.innerHTML = '';
  keys.forEach(key => {
    const row = document.createElement('div');
    row.className = 'util-row';
    row.style.alignItems = 'flex-start';
    row.style.flexDirection = 'column';
    row.style.gap = '6px';
    row.innerHTML =
      '<span class="util-row-title" style="font-size:11.5px; color:var(--subtle); font-weight:700;">' + escapeHtml(key) + '</span>' +
      '<input type="text" class="util-input" data-key="' + escapeHtml(key) + '" value="' + escapeHtml(translations[key] || '') + '" />';
    card.appendChild(row);
  });
  card.querySelectorAll('input[data-key]').forEach(input => {
    input.addEventListener('input', () => {
      const key = input.getAttribute('data-key');
      translations[key] = input.value;
      dirtyKeys.add(key);
      updateSaveBtn();
    });
  });
}

function updateSaveBtn() {
  const btn = document.getElementById('saveTranslationsBtn');
  btn.disabled = dirtyKeys.size === 0;
  btn.textContent = dirtyKeys.size > 0 ? 'Save Changes (' + dirtyKeys.size + ')' : 'Save Changes';
}

function loadLocales(token) {
  document.getElementById('langCard').innerHTML = '<div class="util-row"><span class="util-row-title" style="color:var(--subtle);">Loading…</span></div>';
  return authedPost('/superadmin_locale_list', token).then(d => {
    locales = d.locales || [];
    renderLocales();
    renderChips();
    if (!selectedLocale && locales.length) {
      selectedLocale = locales[0].code;
      renderChips();
    }
    if (selectedLocale) loadTranslations(token);
  }).catch(() => {
    document.getElementById('langCard').innerHTML = '<div class="util-row"><span class="util-row-title" style="color:var(--subtle);">Could not load languages.</span></div>';
  });
}

function loadTranslations(token) {
  if (!selectedLocale) return;
  document.getElementById('translationsCard').innerHTML = '<div class="util-row"><span class="util-row-title" style="color:var(--subtle);">Loading…</span></div>';
  dirtyKeys = new Set();
  updateSaveBtn();
  authedPost('/superadmin_translations', token, { locale: selectedLocale }).then(d => {
    translations = d.translations || {};
    renderTranslations();
  }).catch(() => {
    document.getElementById('translationsCard').innerHTML = '<div class="util-row"><span class="util-row-title" style="color:var(--subtle);">Could not load translations.</span></div>';
  });
}

function openAddLanguageForm(token) {
  let backdrop = document.getElementById('langFormBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'langFormBackdrop';
    backdrop.className = 'sheet-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.classList.remove('open'); });
  }
  backdrop.innerHTML =
    '<div class="sheet-panel form">' +
      '<div class="sheet-handle"></div>' +
      '<div class="sheet-title-row"><span class="sheet-title">Add Language</span>' +
        '<button type="button" class="sheet-close-btn" id="langCloseBtn">' + icon('close', { size: 16, color: 'var(--subtle)' }) + '</button></div>' +
      '<label class="util-label" style="margin-top:0;">Code (e.g. ar)</label>' +
      '<input type="text" id="langCode" class="util-input" placeholder="ar" maxlength="12" autocapitalize="off" autocorrect="off" />' +
      '<label class="util-label">Name (e.g. العربية)</label>' +
      '<input type="text" id="langName" class="util-input" placeholder="Arabic" />' +
      '<label class="util-row" style="padding:10px 0;">' +
        '<span class="util-row-title">Right-to-left</span>' +
        '<span class="switch"><input type="checkbox" id="langRtl"><span class="switch-track"></span></span>' +
      '</label>' +
      '<div class="sheet-form-actions">' +
        '<button type="button" class="sheet-btn-secondary" id="langCancelBtn">Cancel</button>' +
        '<button type="button" class="sheet-btn-primary" id="langSubmitBtn"><span id="langSubmitLabel">Add</span></button>' +
      '</div>' +
    '</div>';
  document.getElementById('langCloseBtn').addEventListener('click', () => backdrop.classList.remove('open'));
  document.getElementById('langCancelBtn').addEventListener('click', () => backdrop.classList.remove('open'));
  document.getElementById('langSubmitBtn').addEventListener('click', () => {
    const code = document.getElementById('langCode').value.trim().toLowerCase();
    const name = document.getElementById('langName').value.trim();
    if (!code || !name) { showToast('Code and name are required.'); return; }
    const isRtl = document.getElementById('langRtl').checked;
    const merged = [
      ...locales.map(l => ({ code: l.code, name: l.name, is_rtl: l.is_rtl })),
      { code, name, is_rtl: isRtl },
    ];
    const btn = document.getElementById('langSubmitBtn');
    const label = document.getElementById('langSubmitLabel');
    btn.disabled = true; label.innerHTML = '<span class="util-spinner"></span>';
    authedPost('/superadmin_locale_list_save', token, { locales: merged }).then(d => {
      locales = d.locales || merged;
      backdrop.classList.remove('open');
      showToast('Language added.');
      selectedLocale = code;
      renderLocales();
      renderChips();
      loadTranslations(token);
    }).catch(err => showToast(err.message || 'Could not add language.'))
      .finally(() => { btn.disabled = false; label.textContent = 'Add'; });
  });
  backdrop.classList.add('open');
}

guardDashboard('superadmin', function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  document.getElementById('utilBody').style.display = '';
  document.getElementById('addLangBtn').addEventListener('click', () => openAddLanguageForm(token));

  document.getElementById('addTermBtn').addEventListener('click', () => {
    if (!selectedLocale) { showToast('Add a language first.'); return; }
    const keyInput = document.getElementById('termKey');
    const valueInput = document.getElementById('termValue');
    const key = keyInput.value.trim();
    const value = valueInput.value.trim();
    if (!key || !value) { showToast('Key and text are both required.'); return; }
    translations[key] = value;
    dirtyKeys.add(key);
    renderTranslations();
    updateSaveBtn();
    keyInput.value = '';
    valueInput.value = '';
  });

  document.getElementById('saveTranslationsBtn').addEventListener('click', () => {
    if (!selectedLocale || dirtyKeys.size === 0) return;
    const rows = Array.from(dirtyKeys).map(key => ({ locale: selectedLocale, key, value: translations[key] || '' }));
    const btn = document.getElementById('saveTranslationsBtn');
    btn.disabled = true;
    const original = btn.textContent;
    btn.innerHTML = '<span class="util-spinner"></span>';
    authedPost('/superadmin_translations_save', token, { translations: rows }).then(() => {
      dirtyKeys = new Set();
      updateSaveBtn();
      showToast('Translations saved.');
    }).catch(err => {
      showToast(err.message || 'Could not save.');
      btn.disabled = false;
      btn.textContent = original;
    });
  });

  loadLocales(token);
});
