// Each row opens a bottom sheet for one setting and saves instantly, no
// separate "Save" step. Toggles (show email/phone) stay inline.

const LANGUAGE_LABELS = { en: 'English', ar: 'العربية' };
function labelize(v) {
  return String(v).charAt(0).toUpperCase() + String(v).slice(1).replace(/_/g, ' ');
}
function languageLabel(code) {
  return LANGUAGE_LABELS[code] || labelize(code);
}

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(t('account_settings.header_title', 'Account Settings'), t('account_settings.header_subtitle', 'Language, appearance, privacy and password'));
}
renderHeaderText();
onLocaleChange(renderHeaderText);

function iconRow(iconName) {
  return '<span class="util-row-icon" style="background:transparent;">' + icon(iconName, { size: 16, color: 'var(--ink)' }) + '</span>';
}

function renderSettingRow(iconName, title, value, onOpen) {
  const row = document.createElement('button');
  row.type = 'button';
  row.className = 'util-row';
  row.innerHTML =
    iconRow(iconName) +
    '<span class="util-row-title">' + escapeHtml(title) + '</span>' +
    '<span class="util-row-value">' + escapeHtml(value) + '</span>' +
    icon('chevron', { size: 18, color: 'var(--subtle)' });
  row.addEventListener('click', onOpen);
  return row;
}

function renderSwitchRow(iconName, title, checked, onToggle) {
  const row = document.createElement('label');
  row.className = 'util-row';
  row.innerHTML =
    iconRow(iconName) +
    '<span class="util-row-title">' + escapeHtml(title) + '</span>' +
    '<span class="switch"><input type="checkbox" ' + (checked ? 'checked' : '') + '><span class="switch-track"></span></span>';
  row.querySelector('input').addEventListener('change', e => onToggle(e.target.checked));
  return row;
}

guardDashboard(null, function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();

  fetchUserSettings(token).then(({ settings, options }) => {
    document.getElementById('utilBody').style.display = '';

    const langCard = document.getElementById('langAppearanceCard');
    const privacyCard = document.getElementById('privacyCard');
    const languageOptions = Array.from(new Set([...(options.languages || []), 'en', 'ar']));

    // Every setting instantly saves on pick, then re-renders both cards
    // from the updated `settings` object - matches AccountSettingsScreen's
    // useFocusEffect re-fetch, without the round-trip: the sheet's own
    // save already tells us the new value. Also registered with
    // onLocaleChange so switching the language re-renders every row's
    // label in the new language, not just the Language row's own value.
    function renderAll() {
      langCard.innerHTML = '';
      langCard.appendChild(renderSettingRow('globe', t('account_settings.language_label', 'Language'), languageLabel(settings.language), () => {
        openOptionSheet(t('account_settings.language_label', 'Language'), languageOptions.map(code => ({ key: code, label: languageLabel(code) })), settings.language, (key) =>
          saveUserSettings(token, { language: key })
            .then(() => {
              settings.language = key;
              // Fetches the new language's bundle and re-runs every
              // onLocaleChange listener (this page's renderAll/
              // renderHeaderText included) - the switch is visible right
              // here, no reload needed.
              return loadLocale(token, key);
            })
        );
      }));
      langCard.appendChild(renderSettingRow('palette', t('account_settings.theme_label', 'Theme'), labelize(settings.theme), () => {
        openOptionSheet(t('account_settings.theme_label', 'Theme'), (options.themes || []).map(v => ({ key: v, label: labelize(v) })), settings.theme, (key) =>
          saveUserSettings(token, { theme: key }).then(() => { settings.theme = key; renderAll(); })
        );
      }));
      langCard.appendChild(renderSettingRow('calendar', t('account_settings.calendar_label', 'Calendar'), labelize(settings.calendar_type), () => {
        openOptionSheet(t('account_settings.calendar_label', 'Calendar'), (options.calendar_types || []).map(v => ({ key: v, label: labelize(v) })), settings.calendar_type, (key) =>
          saveUserSettings(token, { calendar_type: key }).then(() => { settings.calendar_type = key; renderAll(); })
        );
      }));
      langCard.appendChild(renderSettingRow('calendar', t('account_settings.date_format_label', 'Date format'), settings.date_format, () => {
        openOptionSheet(t('account_settings.date_format_label', 'Date format'), (options.date_formats || []).map(v => ({ key: v, label: v })), settings.date_format, (key) =>
          saveUserSettings(token, { date_format: key }).then(() => { settings.date_format = key; renderAll(); })
        );
      }));

      privacyCard.innerHTML = '';
      privacyCard.appendChild(renderSettingRow('shield', t('account_settings.profile_visibility_label', 'Profile visibility'), labelize(settings.profile_visibility), () => {
        openOptionSheet(t('account_settings.profile_visibility_label', 'Profile visibility'), (options.profile_visibility || []).map(v => ({ key: v, label: labelize(v) })), settings.profile_visibility, (key) =>
          saveUserSettings(token, { profile_visibility: key }).then(() => { settings.profile_visibility = key; renderAll(); })
        );
      }));
      privacyCard.appendChild(renderSwitchRow('mail', t('account_settings.show_email_label', 'Show email on my profile'), settings.show_email, (v) => {
        const prev = settings.show_email;
        settings.show_email = v;
        saveUserSettings(token, { show_email: v }).catch(() => { settings.show_email = prev; renderAll(); });
      }));
      privacyCard.appendChild(renderSwitchRow('phone', t('account_settings.show_phone_label', 'Show phone on my profile'), settings.show_phone, (v) => {
        const prev = settings.show_phone;
        settings.show_phone = v;
        saveUserSettings(token, { show_phone: v }).catch(() => { settings.show_phone = prev; renderAll(); });
      }));
      privacyCard.appendChild(renderSettingRow('bell', t('account_settings.digest_emails_label', 'Digest emails'), labelize(settings.digest_frequency), () => {
        openOptionSheet(t('account_settings.digest_emails_label', 'Digest emails'), (options.digest_frequency || []).map(v => ({ key: v, label: labelize(v) })), settings.digest_frequency, (key) =>
          saveUserSettings(token, { digest_frequency: key }).then(() => { settings.digest_frequency = key; renderAll(); })
        );
      }));
    }
    renderAll();
    onLocaleChange(renderAll);

    // ── Security ──
    const securityCard = document.getElementById('securityCard');
    function renderSecurity() {
      securityCard.innerHTML = '';
      const changePwRow = document.createElement('a');
      changePwRow.href = 'change-password.php';
      changePwRow.className = 'util-row';
      changePwRow.innerHTML =
        iconRow('lock') +
        '<span class="util-row-title">' + escapeHtml(t('account_settings.change_password', 'Change password')) + '</span>' +
        icon('chevron', { size: 18, color: 'var(--subtle)' });
      securityCard.appendChild(changePwRow);
    }
    renderSecurity();
    onLocaleChange(renderSecurity);
  }).catch(() => {
    showToast(t('account_settings.load_error', 'Could not load your settings.'));
  });
});
