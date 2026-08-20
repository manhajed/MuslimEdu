// ── Real backend contract — same as src/services/authService.ts ────
const API_BASE_URL = 'https://manhaje.com/apps/api';
const ENDPOINTS = {
  login: API_BASE_URL + '/login',
  me: API_BASE_URL + '/me',
  logout: API_BASE_URL + '/logout',
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Mirrors saveToken/getStoredToken/clearToken (Keychain on native).
// "Remember me" picks which storage backs the session: localStorage
// survives closing the tab, sessionStorage clears with it.
const TOKEN_KEY = 'muslimedu_auth_token';
// Auto-logout after this much inactivity on the signed-in panel. A stolen
// token in localStorage/sessionStorage (the XSS risk a browser can't avoid
// the way a native Keychain does) is only useful while it's both valid AND
// sitting in storage - this bounds how long an abandoned, unlocked tab
// stays a live session.
const IDLE_LOGOUT_MS = 15 * 60 * 1000;

let step = 1;
let rememberMe = false;
let secure = true;
let currentEmail = '';
let currentPassword = '';
let idleTimer = null;

function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}
function saveToken(token) {
  (rememberMe ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
}
function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 1800);
}

function clearEmailError() {
  document.getElementById('emailError').classList.remove('show');
}
function clearLoginError() {
  document.getElementById('loginError').classList.remove('show');
  document.getElementById('twoFactorError').classList.remove('show');
}
function setError(id, message) {
  const el = document.getElementById(id);
  el.textContent = message;
  el.classList.add('show');
}

function switchPanel(newStep, direction) {
  document.querySelectorAll('.panel').forEach(p => p.style.display = 'none');
  const panel = document.getElementById('panel' + newStep);
  panel.style.display = 'block';
  panel.classList.remove('enter', 'enter-back');
  void panel.offsetWidth; // reflow to restart animation
  panel.classList.add(direction === 1 ? 'enter' : 'enter-back');

  const topbar1 = document.getElementById('topbarStep1');
  const topbarOther = document.getElementById('topbarStepOther');
  const pill = document.getElementById('stepPillText');
  const footer = document.getElementById('pageFooter');

  if (newStep === 1) {
    topbar1.style.display = 'flex';
    topbarOther.style.display = 'none';
    pill.textContent = 'STEP 1 OF 2';
  } else if (newStep === 4) {
    topbar1.style.display = 'flex';
    topbarOther.style.display = 'none';
    pill.textContent = 'SIGNED IN';
  } else {
    topbar1.style.display = 'none';
    topbarOther.style.display = 'flex';
    document.getElementById('topbarOtherTitle').textContent = newStep === 3 ? "Verify it's you" : 'Sign in';
    pill.textContent = newStep === 3 ? 'TWO-FACTOR' : 'STEP 2 OF 2';
  }

  document.getElementById('dot1').classList.toggle('active', newStep === 1);
  document.getElementById('dot2').classList.toggle('active', newStep === 2);
  footer.style.display = newStep === 1 || newStep === 4 ? '' : 'none';

  document.getElementById('bodyScroll').scrollTo({ top: 0, behavior: 'smooth' });
  step = newStep;
  updateIdleWatch();
}

function goToStep2() {
  const email = document.getElementById('emailInput').value.trim();
  if (!EMAIL_RE.test(email)) {
    document.getElementById('emailError').classList.add('show');
    return;
  }
  clearEmailError();
  currentEmail = email;
  document.getElementById('emailChipText').textContent = email;
  switchPanel(2, 1);
  setTimeout(() => document.getElementById('passwordInput').focus(), 100);
}

function goToStep1() {
  switchPanel(1, -1);
}

function handleBack() {
  if (step === 3) {
    document.getElementById('twoFactorInput').value = '';
    clearLoginError();
    switchPanel(2, -1);
  } else {
    goToStep1();
  }
}

function togglePassword() {
  const input = document.getElementById('passwordInput');
  secure = !secure;
  input.type = secure ? 'password' : 'text';
  const icon = document.getElementById('eyeIcon');
  icon.innerHTML = secure
    ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#6B8C88" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><line x1="4" y1="20" x2="20" y2="4" stroke="#6B8C88" stroke-width="1.7" stroke-linecap="round"/>'
    : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#6B8C88" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="#6B8C88" stroke-width="1.7"/>';
}

function toggleRemember() {
  rememberMe = !rememberMe;
  document.getElementById('rememberCheckbox').classList.toggle('checked', rememberMe);
}

function updateSubmitState() {
  const email = document.getElementById('emailInput').value.trim();
  const pw = document.getElementById('passwordInput').value;
  document.getElementById('loginBtn').disabled = !(email.length > 0 && pw.length > 0);
}

function updateTwoFactorState() {
  const code = document.getElementById('twoFactorInput').value.trim();
  document.getElementById('verifyBtn').disabled = code.length === 0;
}

function handleSubmit() {
  const btn = document.getElementById('loginBtn');
  if (btn.disabled) return;
  currentPassword = document.getElementById('passwordInput').value;
  submitLogin(btn, 'loginBtnLabel', 'Log In', null);
}

function handleSubmitTwoFactor() {
  const btn = document.getElementById('verifyBtn');
  if (btn.disabled) return;
  const code = document.getElementById('twoFactorInput').value.trim();
  submitLogin(btn, 'verifyBtnLabel', 'Verify', code);
}

// POST /login — email+password, then again with two_factor_code once the
// server flags the account as requiring it. Mirrors authService.loginRequest.
function submitLogin(btn, labelId, idleLabel, twoFactorCode) {
  const label = document.getElementById(labelId);
  btn.classList.add('loading');
  btn.disabled = true;
  label.textContent = 'Please wait…';
  clearLoginError();

  const body = {
    email: currentEmail,
    password: currentPassword,
    device_name: 'muslimedu-web',
  };
  if (twoFactorCode) body.two_factor_code = twoFactorCode;

  fetch(ENDPOINTS.login, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  })
    .then(res => res.json().catch(() => ({})).then(data => ({ res, data })))
    .then(({ res, data }) => {
      if (res.ok && data && data.requires_two_factor) {
        switchPanel(3, 1);
        setTimeout(() => document.getElementById('twoFactorInput').focus(), 100);
        return;
      }
      if (!res.ok) {
        setError(twoFactorCode ? 'twoFactorError' : 'loginError', data && data.message ? data.message : 'Login failed.');
        return;
      }
      saveToken(data.token);
      // The password only exists in memory to authenticate this request -
      // nothing past this point needs it, so drop it immediately rather
      // than leaving it sitting in a JS variable for the rest of the tab's
      // life.
      currentPassword = '';
      document.getElementById('passwordInput').value = '';
      renderSession(data.user);
    })
    .catch(() => {
      setError(
        twoFactorCode ? 'twoFactorError' : 'loginError',
        'Could not reach the server. Check your internet connection.',
      );
    })
    .finally(() => {
      btn.classList.remove('loading');
      label.textContent = idleLabel;
      updateSubmitState();
      updateTwoFactorState();
    });
}

// ── Signed-in panel ─────────────────────────────────────────────
function renderSession(user) {
  document.getElementById('sessionAvatar').textContent = (user.name || '?').trim().charAt(0).toUpperCase();
  document.getElementById('sessionName').textContent = user.name;
  document.getElementById('sessionEmail').textContent = user.email;
  document.getElementById('sessionRole').textContent = user.role;
  switchPanel(4, 1);
}

function handleLogout() {
  const btn = document.getElementById('logoutBtn');
  const label = document.getElementById('logoutBtnLabel');
  const token = getStoredToken();
  btn.classList.add('loading');
  btn.disabled = true;
  label.textContent = 'Please wait…';

  const finish = () => {
    clearStoredToken();
    currentEmail = '';
    currentPassword = '';
    document.getElementById('emailInput').value = '';
    document.getElementById('passwordInput').value = '';
    btn.classList.remove('loading');
    btn.disabled = false;
    label.textContent = 'Log Out';
    switchPanel(1, -1);
  };

  if (!token) { finish(); return; }
  fetch(ENDPOINTS.logout, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: 'Bearer ' + token },
  }).then(finish).catch(finish);
}

function openSheet() {
  document.getElementById('modalBackdrop').classList.add('open');
}
function closeSheet() {
  document.getElementById('modalBackdrop').classList.remove('open');
}

// ── Idle auto-logout while signed in (see IDLE_LOGOUT_MS above) ────
function updateIdleWatch() {
  clearTimeout(idleTimer);
  if (step === 4) {
    idleTimer = setTimeout(() => {
      showToast('Signed out after inactivity');
      handleLogout();
    }, IDLE_LOGOUT_MS);
  }
}
['mousemove', 'keydown', 'click', 'touchstart', 'scroll'].forEach(evt =>
  document.addEventListener(evt, () => { if (step === 4) updateIdleWatch(); }, { passive: true }),
);

// ── Wire up all interactive elements (CSP script-src 'self' blocks
//    inline onclick/oninput attributes, so everything binds here) ──
function wireUp() {
  document.getElementById('langChip').addEventListener('click', () => showToast('Language — coming soon'));
  document.getElementById('backBtn').addEventListener('click', handleBack);

  const emailInput = document.getElementById('emailInput');
  emailInput.addEventListener('input', clearEmailError);
  emailInput.addEventListener('keydown', e => { if (e.key === 'Enter') goToStep2(); });
  document.getElementById('continueBtn').addEventListener('click', goToStep2);

  document.querySelectorAll('.get-started-link').forEach(el => el.addEventListener('click', openSheet));

  const passwordInput = document.getElementById('passwordInput');
  passwordInput.addEventListener('input', () => { clearLoginError(); updateSubmitState(); });
  passwordInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleSubmit(); });
  document.getElementById('eyeBtn').addEventListener('click', togglePassword);
  document.getElementById('rememberRow').addEventListener('click', toggleRemember);
  document.getElementById('forgotText').addEventListener('click', () => showToast('Reset link sent — coming soon'));
  document.getElementById('loginBtn').addEventListener('click', handleSubmit);

  const twoFactorInput = document.getElementById('twoFactorInput');
  twoFactorInput.addEventListener('input', () => { clearLoginError(); updateTwoFactorState(); });
  twoFactorInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleSubmitTwoFactor(); });
  document.getElementById('verifyBtn').addEventListener('click', handleSubmitTwoFactor);

  document.getElementById('logoutBtn').addEventListener('click', handleLogout);

  document.querySelectorAll('.footer-noop').forEach(a => a.addEventListener('click', e => e.preventDefault()));

  const modalBackdrop = document.getElementById('modalBackdrop');
  modalBackdrop.addEventListener('click', e => { if (e.target === modalBackdrop) closeSheet(); });
  document.getElementById('sheetHandleZone').addEventListener('click', closeSheet);
  document.getElementById('alumniOption').addEventListener('click', () => document.getElementById('alumniNote').classList.add('show'));

  // ── On load: restore session, same as AuthContext's launch check ──
  const token = getStoredToken();
  if (!token) return;
  fetch(ENDPOINTS.me, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: 'Bearer ' + token },
  })
    .then(res => {
      if (!res.ok) throw new Error('invalid session');
      return res.json();
    })
    .then(data => renderSession(data.user))
    .catch(() => clearStoredToken());
}

document.addEventListener('DOMContentLoaded', wireUp);
