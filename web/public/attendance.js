// Admin "Attendance" (Activity & Requests group) - ported from
// AdminAttendanceAnalyticsScreen.tsx: range + class filters, an
// attendance-rate hero, a status breakdown bar, a daily trend chart, and
// admin-only unlock of a submitted-and-locked roster. Backend calls live
// in dashboard.js (fetchAttendanceAnalytics/fetchAttendanceLocks/
// unlockAttendance/fetchAdminClasses).

function rangePresets() {
  return [
    { key: '7d', label: t('attendance_analytics.range_7d', '7 days'), days: 7 },
    { key: '30d', label: t('attendance_analytics.range_30d', '30 days'), days: 30 },
    { key: '90d', label: t('attendance_analytics.range_90d', '90 days'), days: 90 },
  ];
}
function statusMeta() {
  return {
    present: { label: t('student_progress.present', 'Present'), color: 'var(--ink)' },
    late: { label: t('student_progress.late', 'Late'), color: '#B8860B' },
    absent: { label: t('student_progress.absent', 'Absent'), color: '#E5484D' },
    excused: { label: t('student_progress.excused', 'Excused'), color: '#4C6EF5' },
    leave: { label: t('attendance_analytics.leave', 'Leave'), color: '#8A5CF6' },
  };
}

let rangeKey = '30d';
let selectedClassId = null;
let classes = [];
let locks = [];
let unlockingKey = null;
let attBooted = false;

function toISODate(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function currentRange() {
  const presets = rangePresets();
  const preset = presets.find(r => r.key === rangeKey) || presets[1];
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (preset.days - 1));
  return { dateFrom: toISODate(from), dateTo: toISODate(to) };
}

function renderRangeChips() {
  document.getElementById('rangeChipRow').innerHTML = rangePresets().map(p =>
    '<button type="button" class="filter-chip' + (rangeKey === p.key ? ' active' : '') + '" data-key="' + p.key + '">' +
      escapeHtml(p.label) + '</button>'
  ).join('');
  document.getElementById('rangeChipRow').querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      rangeKey = btn.dataset.key;
      renderRangeChips();
      load(getStoredToken());
    });
  });
}

function renderClassChips() {
  const items = [{ id: null, name: t('attendance_analytics.all_classes', 'All classes') }].concat(classes);
  document.getElementById('classChipRow').innerHTML = items.map(c =>
    '<button type="button" class="filter-chip' + (selectedClassId === c.id ? ' active' : '') + '" data-id="' + (c.id == null ? '' : c.id) + '">' +
      escapeHtml(c.name) + '</button>'
  ).join('');
  document.getElementById('classChipRow').querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedClassId = btn.dataset.id ? Number(btn.dataset.id) : null;
      renderClassChips();
      load(getStoredToken());
    });
  });
}

function buildStatusBar(counts, total) {
  if (total === 0) {
    return '<div class="attbar-track"><div class="attbar-seg" style="flex:1;background:#E5E7EB;"></div></div>';
  }
  const meta = statusMeta();
  const segs = Object.keys(meta).map(key =>
    counts[key] > 0
      ? '<div class="attbar-seg" style="flex:' + counts[key] + ';background:' + meta[key].color + ';"></div>'
      : ''
  ).join('');
  return '<div class="attbar-track">' + segs + '</div>';
}

function buildLegend(counts) {
  const meta = statusMeta();
  return '<div class="attbar-legend">' + Object.keys(meta).map(key =>
    '<span class="attbar-legend-item"><span class="attbar-dot" style="background:' + meta[key].color + ';"></span>' +
      escapeHtml(meta[key].label) + ' ' + (counts[key] || 0) + '</span>'
  ).join('') + '</div>';
}

// Hand-rolled bar chart (no chart library in this project) - one bar per
// day, height by attendance % for that day, color-coded same as the RN
// TrendChart (green >=90%, amber >=75%, red below). The >=90% tier uses
// the same emerald gradient as every primary button/hero card in the app
// (--pale-green -> --emerald-deep) rather than a flat colour - it used to
// be #1C1C1E (--ink, near-black), which read as a broken/unstyled solid
// black block instead of a "good" result.
function buildTrendChart(trend) {
  if (!trend.length) {
    return '<div class="trend-empty">' + escapeHtml(t('attendance_analytics.trend_empty', 'No attendance recorded in this range yet.')) + '</div>';
  }
  const width = 320, height = 120, gap = 3;
  const barWidth = Math.max((width - gap * (trend.length - 1)) / trend.length, 2);
  const bars = trend.map((day, i) => {
    const total = (day.present || 0) + (day.late || 0) + (day.absent || 0) + (day.excused || 0) + (day.leave || 0);
    const pct = total === 0 ? 0 : ((day.present || 0) + (day.late || 0)) / total;
    const barHeight = Math.max(pct * (height - 8), 2);
    const fill = pct >= 0.9 ? 'url(#trendGreenGrad)' : pct >= 0.75 ? '#B8860B' : '#E5484D';
    const x = i * (barWidth + gap);
    const y = height - barHeight;
    return '<rect x="' + x + '" y="' + y + '" width="' + barWidth + '" height="' + barHeight + '" rx="2" fill="' + fill + '" />';
  }).join('');
  const defs =
    '<defs><linearGradient id="trendGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">' +
      '<stop offset="0%" stop-color="#7FD9A8" />' +
      '<stop offset="100%" stop-color="#0F7A3D" />' +
    '</linearGradient></defs>';
  return '<svg width="100%" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" preserveAspectRatio="none">' + defs + bars + '</svg>';
}

function lockKey(l) {
  return l.section_id + ':' + l.subject_id + ':' + l.date;
}

function renderLocks() {
  const wrap = document.getElementById('lockedWrap');
  if (!wrap) return;
  if (locks.length === 0) {
    wrap.innerHTML = '<div class="lock-empty">' + escapeHtml(t('attendance_analytics.nothing_locked', 'Nothing is currently locked.')) + '</div>';
    return;
  }
  wrap.innerHTML = locks.map(l => {
    const key = lockKey(l);
    const title = [l.section_name || t('attendance_analytics.section_fallback', 'Section'), l.class_name, l.subject_name].filter(Boolean).join(' · ');
    const meta = l.date + (l.locked_by_name ? ' ' + t('attendance_analytics.by_suffix', '· by {name}').replace('{name}', l.locked_by_name) : '');
    return (
      '<div class="lock-row">' +
        '<div><div class="lock-row-title">' + escapeHtml(title) + '</div><div class="lock-row-meta">' + escapeHtml(meta) + '</div></div>' +
        '<button type="button" class="lock-unlock-btn" data-key="' + escapeHtml(key) + '"' + (unlockingKey === key ? ' disabled' : '') + '>' +
          (unlockingKey === key ? '…' : escapeHtml(t('attendance_analytics.unlock_btn', 'Unlock'))) +
        '</button>' +
      '</div>'
    );
  }).join('');
  wrap.querySelectorAll('.lock-unlock-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      const l = locks.find(x => lockKey(x) === key);
      const token = getStoredToken();
      if (!l || !token) return;
      unlockingKey = key;
      renderLocks();
      unlockAttendance(token, l.section_id, l.subject_id, l.date).then(() => {
        locks = locks.filter(x => lockKey(x) !== key);
        unlockingKey = null;
        renderLocks();
      }).catch(err => {
        unlockingKey = null;
        renderLocks();
        showToast(err && err.message ? err.message : t('attendance_analytics.unlock_failed', 'Could not unlock.'));
      });
    });
  });
}

function loadLocks(token) {
  fetchAttendanceLocks(token)
    .then(rows => { locks = rows; renderLocks(); })
    .catch(() => { locks = []; renderLocks(); });
}

function load(token) {
  const wrap = document.getElementById('attendanceContent');
  wrap.innerHTML = '<div class="list-loading">' + escapeHtml(t('attendance_analytics.loading', 'Loading attendance analytics…')) + '</div>';
  const range = currentRange();
  fetchAttendanceAnalytics(token, { classId: selectedClassId, dateFrom: range.dateFrom, dateTo: range.dateTo })
    .then(data => {
      const counts = data.status_counts;
      wrap.innerHTML =
        '<div class="stat-hero">' +
          '<div class="stat-hero-label">' + escapeHtml(t('attendance_analytics.attendance_rate', 'Attendance rate')) + '</div>' +
          '<div class="stat-hero-value">' + (data.attendance_percentage || 0) + '%</div>' +
          '<div class="stat-hero-sub">' + escapeHtml(t('attendance_analytics.records_marked', '{n} records marked').replace('{n}', data.total_marked || 0)) + '</div>' +
        '</div>' +
        '<div class="util-card padded">' +
          '<div class="util-section-title" style="margin-top:0;">' + escapeHtml(t('attendance_analytics.status_breakdown', 'Status breakdown')) + '</div>' +
          buildStatusBar(counts, data.total_marked || 0) +
          buildLegend(counts) +
        '</div>' +
        '<div class="util-card padded">' +
          '<div class="util-section-title" style="margin-top:0;">' + escapeHtml(t('attendance_analytics.daily_trend', 'Daily trend')) + '</div>' +
          '<div style="margin-top:8px;">' + buildTrendChart(data.daily_trend || []) + '</div>' +
        '</div>' +
        '<div class="util-card padded">' +
          '<div class="util-section-title" style="margin-top:0;">' + escapeHtml(t('attendance_analytics.locked_attendance', 'Locked attendance')) + '</div>' +
          '<div id="lockedWrap"></div>' +
        '</div>';
      renderLocks();
    })
    .catch(err => {
      wrap.innerHTML = '<div class="list-error">' + escapeHtml(err && err.message ? err.message : t('attendance_analytics.load_failed', 'Could not load attendance analytics.')) + '</div>';
    });
}

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(t('attendance_analytics.title', 'Attendance'), t('attendance_analytics.subtitle', 'Track daily attendance'), 'admin-dashboard.php', null);
}
renderHeaderText();

onLocaleChange(() => {
  renderHeaderText();
  if (!attBooted) return;
  renderRangeChips();
  renderClassChips();
  load(getStoredToken());
});

guardDashboard('admin', function (user, token) {
  document.getElementById('utilBody').style.display = '';
  document.getElementById('bottomNavWrap').innerHTML = renderBottomNav('admin');
  renderRangeChips();
  renderClassChips();
  fetchAdminClasses(token).then(rows => { classes = rows; renderClassChips(); }).catch(() => {});
  load(token);
  loadLocks(token);
  attBooted = true;
});
