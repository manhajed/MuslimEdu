// Ported from StaffIdCardsScreen.tsx - teachers, cashiers, and
// registrars each have their own list endpoint, switched between with a
// role tab bar. Reuses the same buildIdCardHtml() as
// student-id-cards.js/student-id-card.js, with personType "staff".
// Backend: POST /admin_teacher_list | /admin_accountant_list |
// /admin_registrar_list, plus /my_school_branding.

let activeRole = 'teacher';
let currentToken = null;
let rows = [];
let branding = {};
let cardRow = null;
let cardProfile = null;
let sicBooted = false;

function fetchForRole(token, role) {
  if (role === 'teacher') return fetchTeacherList(token);
  if (role === 'accountant') return fetchCashierAccounts(token);
  return fetchRegistrarAccounts(token);
}
function fetchProfileForRole(token, role, id) {
  if (role === 'teacher') return fetchTeacherProfile(token, id);
  if (role === 'accountant') return fetchCashierProfile(token, id);
  return fetchRegistrarProfile(token, id);
}

function renderList() {
  const wrap = document.getElementById('idListWrap');
  if (!rows.length) {
    wrap.innerHTML = '<div class="list-empty"><div class="list-empty-title">' + escapeHtml(t('staff_id_cards.no_records', 'No records found')) + '</div></div>';
    return;
  }
  wrap.innerHTML = '<div class="list-card" style="flex-direction:column;align-items:stretch;padding:4px 16px;">' +
    rows.map(s => {
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
    photo: p.photo ?? s.photo,
    code: s.code || String(s.id),
    schoolName: branding.name,
    schoolNameAr: branding.name_ar,
    schoolAddress: branding.address,
    schoolAddressAr: branding.address_ar,
    schoolLogo: branding.logo,
    secReg: branding.sec_reg,
    secRegAr: branding.sec_reg_ar,
    background: branding.id_card_background,
    themeKey: branding.id_card_theme,
    dob: p.birthday ?? null,
    address: p.address ?? null,
    emergencyContactName: p.emergency_contact_name ?? null,
    emergencyContactPhone: p.emergency_contact_phone ?? null,
    signatureUrl: p.signature ?? null,
  };
}

function openCard(id) {
  const s = rows.find(x => x.id === id);
  if (!s) return;
  cardRow = s;
  cardProfile = null;
  const role = activeRole;
  renderCardModal();
  document.getElementById('cardModal').classList.add('open');

  // Full profile (DOB, emergency contact, signature) isn't in the list
  // response for any of the three roles - fetched on demand, same as
  // student-id-cards.js.
  fetchProfileForRole(currentToken, role, id).then(profile => {
    if (!cardRow || cardRow.id !== id || activeRole !== role) return;
    cardProfile = profile;
    renderCardModal();
  }).catch(() => {});
}
function renderCardModal() {
  const data = cardDataFor(cardRow, cardProfile);
  document.getElementById('cardModalInner').innerHTML =
    buildIdCardHtml(data) +
    '<button type="button" class="util-save-btn pill" id="printCardBtn" style="max-width:288px;margin-left:auto;margin-right:auto;">' + escapeHtml(t('staff_id_cards.print_save_pdf', 'Print / Save as PDF')) + '</button>';

  document.getElementById('printCardBtn').addEventListener('click', () => window.print());
}
function closeCard() {
  document.getElementById('cardModal').classList.remove('open');
  cardRow = null;
  cardProfile = null;
}

function load(role) {
  activeRole = role;
  document.getElementById('idListWrap').innerHTML = '<div class="list-loading">' + escapeHtml(t('common.loading', 'Loading…')) + '</div>';
  Promise.all([fetchForRole(currentToken, role), fetchMySchoolBranding(currentToken).catch(() => null)]).then(([list, b]) => {
    rows = list;
    branding = b || {};

    const gate = schoolProfileGateHtml(branding);
    if (gate) {
      document.getElementById('idNudgeWrap').innerHTML = '';
      document.getElementById('tabRow').style.display = 'none';
      document.getElementById('idListWrap').innerHTML = gate;
      return;
    }
    document.getElementById('tabRow').style.display = '';
    document.getElementById('idNudgeWrap').innerHTML = secRegNudgeHtml(branding);
    wireSecRegNudgeDismiss();

    renderList();
  }).catch(() => {
    document.getElementById('idListWrap').innerHTML =
      '<div class="list-error">' + escapeHtml(t('staff_id_cards.load_failed', 'Could not load staff.')) + '<br><button type="button" class="list-retry-btn" id="retryBtn">' + escapeHtml(t('common.retry', 'Try again')) + '</button></div>';
    document.getElementById('retryBtn')?.addEventListener('click', () => load(role));
  });
}

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML = renderUtilHeader(t('staff_id_cards.title', 'Staff ID Cards'), t('staff_id_cards.subtitle', 'View and print teacher, cashier and registrar ID cards'), 'admin-dashboard.php', null);
}
renderHeaderText();
onLocaleChange(() => {
  renderHeaderText();
  if (!sicBooted) return;
  renderList();
  if (cardRow) renderCardModal();
});

document.getElementById('cardModalClose').addEventListener('click', closeCard);
document.getElementById('cardModal').addEventListener('click', e => { if (e.target.id === 'cardModal') closeCard(); });

document.getElementById('tabRow').querySelectorAll('.role-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.getElementById('tabRow').querySelectorAll('.role-tab').forEach(t => t.classList.toggle('active', t === tab));
    load(tab.dataset.role);
  });
});

guardDashboard('admin', function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  document.getElementById('utilBody').style.display = '';
  document.getElementById('bottomNavWrap').innerHTML = renderBottomNav('admin');
  currentToken = token;
  load('teacher');
  sicBooted = true;
});
