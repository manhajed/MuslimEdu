// Shared across every *-dashboard.php page: route guard (redirect to
// login.php if not signed in), header population from /me, logout, a small
// inline-SVG icon set (outline style matching lucide-react-native, used by
// the RN screens), and a toast for menu items that don't have a web page
// yet.
const API_BASE_URL = 'https://manhaje.com/apps/api';
const ENDPOINTS = { me: API_BASE_URL + '/me', logout: API_BASE_URL + '/logout' };
const TOKEN_KEY = 'muslimedu_auth_token';

function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}
function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 1800);
}

// Every menu tile on the web points to a full sub-screen that only exists
// in the RN app so far - clicking one is honest about that instead of
// linking to a 404 or silently doing nothing.
function notWiredYet() {
  showToast('Not built on the web yet — open the MuslimEdu app for this');
}

const DASHBOARD_BY_ROLE = {
  admin: 'admin-dashboard.php',
  superadmin: 'superadmin-dashboard.php',
  teacher: 'teacher-dashboard.php',
  student: 'student-dashboard.php',
};
function dashboardUrlForRole(role) {
  // placeholder-dashboard.php derives its own label from /me, so no query
  // param is needed here - it just needs to not be a core-role URL.
  return DASHBOARD_BY_ROLE[role] || 'placeholder-dashboard.php';
}

// Runs on every dashboard page load: no token -> back to login; valid token
// -> populate the shared header (name/avatar/role badge) and hand the full
// user object to the page's own render function. Redirects to the *correct*
// dashboard if the signed-in user's role doesn't match this page (e.g. a
// teacher token landing on admin-dashboard.php via a stale bookmark).
function guardDashboard(expectedRole, onReady) {
  const token = getStoredToken();
  if (!token) {
    window.location.href = 'login.php';
    return;
  }
  fetch(ENDPOINTS.me, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: 'Bearer ' + token },
  })
    .then(res => {
      if (!res.ok) throw new Error('invalid session');
      return res.json();
    })
    .then(data => {
      const user = data.user;
      if (expectedRole && user.role !== expectedRole) {
        window.location.href = dashboardUrlForRole(user.role);
        return;
      }
      renderHeader(user);
      document.getElementById('routeGuardSplash')?.remove();
      // The page's own render function (onReady) builds the body content,
      // including the #logoutBtn footer - wireLogout has to run after that
      // exists in the DOM, not before.
      onReady(user, token);
      wireLogout(token);
    })
    .catch(() => {
      clearStoredToken();
      window.location.href = 'login.php';
    });
}

function renderHeader(user) {
  const nameEl = document.getElementById('greetingName');
  if (nameEl) nameEl.textContent = user.name || '';

  const avatarWrap = document.getElementById('avatarWrap');
  if (avatarWrap) {
    const initial = (user.name || '?').trim().charAt(0).toUpperCase();
    if (user.photo) {
      avatarWrap.innerHTML =
        '<img class="avatar" src="' + escapeHtml(user.photo) + '" alt="" onerror="this.replaceWith(Object.assign(document.createElement(\'div\'),{className:\'avatar-fallback\',textContent:\'' + initial + '\'}))" />';
    } else {
      avatarWrap.innerHTML = '<div class="avatar-fallback">' + initial + '</div>';
    }
  }

  document.querySelectorAll('[data-user-name]').forEach(el => (el.textContent = user.name || ''));
  document.querySelectorAll('[data-user-email]').forEach(el => (el.textContent = user.email || ''));
  document.querySelectorAll('[data-user-code]').forEach(el => {
    const row = el.closest('[data-user-code-row]');
    if (user.code) {
      el.textContent = user.code;
      if (row) row.style.display = '';
    } else if (row) {
      row.style.display = 'none';
    }
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function wireLogout(token) {
  const btn = document.getElementById('logoutBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (!confirm('Log out of your account?')) return;
    btn.style.opacity = '0.6';
    btn.style.pointerEvents = 'none';
    const finish = () => {
      clearStoredToken();
      window.location.href = 'login.php';
    };
    fetch(ENDPOINTS.logout, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: 'Bearer ' + token },
    }).then(finish).catch(finish);
  });
}

// Wires a live text filter over one or more .group-section blocks: hides
// rows whose title doesn't match, hides empty sections, shows a "no
// results" message when every section is empty. Also hides the given
// "featured" elements (hero/secondary cards) while searching, matching
// AdminDashboard's own isSearching behavior.
function wireSearch(inputId, opts) {
  const input = document.getElementById(inputId);
  const bar = input?.closest('.search-bar');
  const clearBtn = bar?.querySelector('.search-clear');
  const sections = document.querySelectorAll('.group-section');
  const noResults = document.getElementById('noResults');
  const featured = (opts && opts.hideWhileSearching) || [];

  function apply() {
    const q = input.value.trim().toLowerCase();
    bar?.classList.toggle('has-value', q.length > 0);
    let anyVisible = false;
    sections.forEach(section => {
      let sectionHasMatch = false;
      section.querySelectorAll('.row').forEach(row => {
        const title = (row.dataset.title || row.querySelector('.row-title')?.textContent || '').toLowerCase();
        const match = q.length === 0 || title.includes(q);
        row.style.display = match ? '' : 'none';
        if (match) sectionHasMatch = true;
      });
      section.style.display = sectionHasMatch ? '' : 'none';
      if (sectionHasMatch) anyVisible = true;
    });
    featured.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = q.length > 0 ? 'none' : '';
    });
    if (noResults) noResults.style.display = q.length > 0 && !anyVisible ? '' : 'none';
  }
  input?.addEventListener('input', apply);
  clearBtn?.addEventListener('click', () => { input.value = ''; apply(); input.focus(); });
}

// Compact icon set (24x24, outline, strokeWidth ~1.8) - not every lucide
// icon the RN screens use, just enough distinct shapes that each dashboard
// section stays visually identifiable, in the same visual language.
const ICONS = {
  users: '<path d="M17 20h5v-2a3 3 0 00-5.36-1.86M17 20H7m10 0v-2a4 4 0 00-3-3.87M7 20H2v-2a3 3 0 015.36-1.86M7 20v-2a4 4 0 013-3.87m0 0a4 4 0 110-7.75 4 4 0 010 7.75zm6-3a4 4 0 100-8 4 4 0 000 8z"/>',
  presentation: '<path d="M3 4h18M4 4v11a1 1 0 001 1h5l-1 4h6l-1-4h5a1 1 0 001-1V4M11 15v1"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 4.5A2.5 2.5 0 016.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15z"/>',
  banknote: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/><path d="M9 15l2 2 4-4"/>',
  idcard: '<rect x="2" y="4" width="20" height="16" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M15 9h4M15 13h4M6 17h6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 005.6 15a1.65 1.65 0 00-1.51-1H4a2 2 0 010-4h.09A1.65 1.65 0 005.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9c.14.32.22.66.24 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>',
  gradcap: '<path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1.3 2.7 2.5 6 2.5s6-1.2 6-2.5v-5"/>',
  logout: '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7"/>',
  person: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a8 8 0 0116 0v1"/>',
  camera: '<path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>',
  bell: '<path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>',
  document: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/>',
  megaphone: '<path d="M3 11v3a1 1 0 001 1h1l3 6h2l-1-6h6l4 3V5l-4 3H8L5 7H4a1 1 0 00-1 1z"/>',
  clipboard: '<rect x="4" y="4" width="16" height="18" rx="2"/><path d="M9 2h6v4H9z"/><path d="M9 12l2 2 4-4"/>',
  star: '<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.8 21l1.2-6.9-5-4.9 6.9-1z"/>',
  layers: '<path d="M12 2L2 8l10 6 10-6-10-6z"/><path d="M2 14l10 6 10-6"/>',
  school: '<path d="M14 22v-4a2 2 0 00-4 0v4M4 12l8-6 8 6M6 12v10h12V12"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M10.85 12.15L19 4M17 6l2 2M15 8l2 2"/>',
  activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  flag: '<path d="M4 2v20M4 4h13l-2 4 2 4H4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
  trash: '<path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>',
  images: '<rect x="3" y="3" width="14" height="14" rx="2"/><path d="M7 21h11a2 2 0 002-2V8"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M3 13l3-3 3 3 4-4 4 4" stroke-linecap="round"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>',
};
function icon(name, opts) {
  opts = opts || {};
  const size = opts.size || 20;
  const color = opts.color || 'currentColor';
  const body = ICONS[name] || ICONS.gear;
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>';
}

// ── Builder helpers used by each dashboard page's inline render script ──
// item.tint (a solid hex color) mirrors AdminDashboard's TINT map: a tinted
// row gets a solid-color icon square with a white icon; untinted rows fall
// back to the light emerald square with an emerald icon - same rule the RN
// grouped-list rows use.
function renderRow(item) {
  const tintBg = item.tint || 'var(--emerald-soft)';
  const iconColor = item.tint ? '#FFFFFF' : 'var(--emerald)';
  return (
    '<button class="row" type="button" data-title="' + escapeHtml(item.title) + '" onclick="' + (item.onclick || 'notWiredYet()') + '">' +
      '<span class="row-icon" style="background:' + tintBg + ';color:' + iconColor + '">' + icon(item.icon, { size: 19, color: iconColor }) + '</span>' +
      '<span class="row-text"><span class="row-title">' + escapeHtml(item.title) + '</span><span class="row-desc">' + escapeHtml(item.desc) + '</span></span>' +
      '<span class="row-chevron">' + icon('chevron', { size: 18 }) + '</span>' +
    '</button>'
  );
}
function renderGroupSection(label, items) {
  if (!items.length) return '';
  return (
    '<div class="group-section"><div class="group-label">' + escapeHtml(label) + '</div>' +
    '<div class="group-card">' + items.map(renderRow).join('') + '</div></div>'
  );
}
function renderLogoutFooter() {
  return (
    '<button class="logout-card" id="logoutBtn" type="button">' +
      '<span class="logout-icon-badge">' + icon('logout', { size: 18, color: '#D9534F' }) + '</span>' +
      '<span><span class="logout-title">Log Out</span><br><span class="logout-subtitle">Sign out of your account</span></span>' +
    '</button>'
  );
}
