// Ported from StudentIdCardScreen.tsx / components/StudentIdCard.tsx -
// name/photo/code straight from the logged-in user (no new backend call
// needed for the card itself), section best-effort from /my_schedules
// (the self-service profile endpoints don't expose class/section text),
// school branding from /my_school_branding. Uses the same
// buildIdCardHtml() as the admin ID card browsers (student-id-cards.js/
// staff-id-cards.js) so this card is pixel-identical to those.
//
// Read-only by design: a student views their card here but cannot restyle
// it or print it. The background is a school-wide image the admin sets
// (Student ID Cards page), so every student's card looks the same and no
// student can put their own image behind the school's identity block; and
// the printable copy is the school's to issue, so there is no print button
// and the print stylesheet in student-id-card.php replaces the card with a
// short notice if a student reaches for their browser's own Print. That
// last part is a UI-level restriction, not a real lock - a screenshot
// still works - but it removes the "download my own ID" affordance the
// page used to hand out.

let cardState = null;

function renderCard() {
  document.getElementById('idCardContent').innerHTML =
    buildIdCardHtml(cardState) +
    '<div class="idcard-readonly-note">' +
      escapeHtml(t('student_id_card.readonly_note', 'This is your official school ID. Printed copies are issued by the school office.')) +
    '</div>';
}
onLocaleChange(() => { if (cardState) renderCard(); });

function load(user, token) {
  cardState = {
    name: user.name || '',
    nameAr: user.name_ar || null,
    photo: user.photo || null,
    code: user.code || String(user.id),
    className: user.class_name || null,
    sectionName: user.section_name || null,
    schoolName: null,
    schoolNameAr: null,
    schoolAddress: null,
    schoolAddressAr: null,
    schoolLogo: null,
    secReg: null,
    secRegAr: null,
    background: null,
    themeKey: null,
    address: user.address || null,
    // Same five panel rows the admin card browser shows, read straight off
    // the /me record - these are columns on the student's own user row
    // (admin_child_profile returns them for exactly these rows), so a
    // student sees their full card rather than a stub with only an ID
    // number. Each name is tried in a couple of shapes because /me is a
    // plain model dump and older backends spell some of them differently;
    // anything genuinely absent is simply omitted from the panel, which is
    // the same thing buildIdCardHtml() already does for the admin side.
    dob: user.birthday || user.date_of_birth || user.dob || null,
    emergencyContactName: user.emergency_contact_name || user.emergency_contact || null,
    emergencyContactPhone: user.emergency_contact_phone || user.emergency_phone || null,
    signatureUrl: user.signature || null,
  };
  renderCard();

  fetchMySchedule(token).then(rows => {
    const row = rows[0];
    if (!row) return;
    // Only fills gaps - whatever /me already gave us wins.
    if (!cardState.sectionName && row.section_name) cardState.sectionName = row.section_name;
    if (!cardState.className && row.class_name) cardState.className = row.class_name;
    renderCard();
  }).catch(() => {});

  fetchMySchoolBranding(token).then(branding => {
    cardState.schoolName = branding.name || null;
    cardState.schoolNameAr = branding.name_ar || null;
    cardState.schoolAddress = branding.address || null;
    cardState.schoolAddressAr = branding.address_ar || null;
    cardState.schoolLogo = branding.logo || null;
    cardState.secReg = branding.sec_reg || null;
    cardState.secRegAr = branding.sec_reg_ar || null;
    // School-wide background/colour the admin set - read-only here.
    cardState.background = branding.id_card_background || null;
    cardState.themeKey = branding.id_card_theme || null;
    renderCard();
  }).catch(() => {});
}

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML = renderUtilHeader(t('student_dashboard.my_id_card_title', 'My ID Card'), null, 'student-dashboard.php', null);
}
renderHeaderText();
onLocaleChange(renderHeaderText);

guardDashboard('student', function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  document.getElementById('utilBody').style.display = '';
  document.getElementById('bottomNavWrap').innerHTML = renderBottomNav('student');
  load(user, token);
});
