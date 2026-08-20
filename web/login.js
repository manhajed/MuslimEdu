// ── Real backend contract — same as src/services/authService.ts ────
const API_BASE_URL = 'https://manhaje.com/apps/api';
const ENDPOINTS = {
  login: API_BASE_URL + '/login',
  me: API_BASE_URL + '/me',
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Mirrors saveToken/getStoredToken/clearToken (Keychain on native).
// "Remember me" picks which storage backs the session: localStorage
// survives closing the tab, sessionStorage clears with it.
const TOKEN_KEY = 'muslimedu_auth_token';

// Two-factor accounts aren't supported on the web yet - deliberately not
// part of this page's logic (see dashboard.js's guardDashboard for the
// per-role landing pages this redirects to once real login succeeds).
const DASHBOARD_BY_ROLE = {
  admin: 'admin-dashboard.php',
  superadmin: 'superadmin-dashboard.php',
  teacher: 'teacher-dashboard.php',
  student: 'student-dashboard.php',
};
function dashboardUrlForRole(role) {
  return DASHBOARD_BY_ROLE[role] || 'placeholder-dashboard.php';
}

let step = 1;
let rememberMe = false;
let secure = true;
let currentEmail = '';
let currentPassword = '';

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

  if (newStep === 1) {
    topbar1.style.display = 'flex';
    topbarOther.style.display = 'none';
    pill.textContent = 'STEP 1 OF 2';
  } else {
    topbar1.style.display = 'none';
    topbarOther.style.display = 'flex';
    document.getElementById('topbarOtherTitle').textContent = 'Sign in';
    pill.textContent = 'STEP 2 OF 2';
  }

  document.getElementById('dot1').classList.toggle('active', newStep === 1);
  document.getElementById('dot2').classList.toggle('active', newStep === 2);

  document.getElementById('bodyScroll').scrollTo({ top: 0, behavior: 'smooth' });
  step = newStep;
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
  goToStep1();
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

function handleSubmit() {
  const btn = document.getElementById('loginBtn');
  if (btn.disabled || btn.classList.contains('loading')) return;
  currentPassword = document.getElementById('passwordInput').value;

  const label = document.getElementById('loginBtnLabel');
  btn.classList.add('loading');
  btn.disabled = true;
  label.textContent = 'Please wait…';
  clearLoginError();

  fetch(ENDPOINTS.login, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email: currentEmail, password: currentPassword, device_name: 'muslimedu-web' }),
  })
    .then(res => res.json().catch(() => ({})).then(data => ({ res, data })))
    .then(({ res, data }) => {
      // Two-factor isn't wired up on the web - tell the account holder
      // plainly instead of silently failing or crashing on a step that
      // no longer exists here.
      if (res.ok && data && data.requires_two_factor) {
        setError('loginError', 'This account has two-factor authentication enabled, which isn’t supported on the web yet. Please sign in from the MuslimEdu app.');
        return;
      }
      if (!res.ok) {
        setError('loginError', (data && data.message) || 'Login failed.');
        return;
      }
      saveToken(data.token);
      window.location.href = dashboardUrlForRole(data.user.role);
    })
    .catch(() => {
      setError('loginError', 'Could not reach the server. Check your internet connection.');
    })
    .finally(() => {
      btn.classList.remove('loading');
      label.textContent = 'Log In';
      updateSubmitState();
    });
}

function openSheet() {
  document.getElementById('modalBackdrop').classList.add('open');
}
function closeSheet() {
  document.getElementById('modalBackdrop').classList.remove('open');
}

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

  document.querySelectorAll('.footer-noop').forEach(a => a.addEventListener('click', e => e.preventDefault()));

  const modalBackdrop = document.getElementById('modalBackdrop');
  modalBackdrop.addEventListener('click', e => { if (e.target === modalBackdrop) closeSheet(); });
  document.getElementById('sheetHandleZone').addEventListener('click', closeSheet);
  document.getElementById('alumniOption').addEventListener('click', () => document.getElementById('alumniNote').classList.add('show'));

  // ── On load: already signed in -> go straight to the right dashboard,
  //    same as AuthContext's launch check deciding "skip login" on native. ──
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
    .then(data => { window.location.href = dashboardUrlForRole(data.user.role); })
    .catch(() => clearStoredToken());
}

document.addEventListener('DOMContentLoaded', wireUp);
