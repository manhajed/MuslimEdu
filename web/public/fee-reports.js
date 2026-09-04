// Tapping a row opens the payment-recording flow, which isn't built on
// the web yet, so it toasts like any other unwired destination.

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(t('fee_reports.title', 'Fee Reports'), t('fee_reports.subtitle', 'Search invoices and filter by payment status.'), 'admin-dashboard.php');
}
renderHeaderText();
onLocaleChange(() => { renderHeaderText(); renderFilters(); renderList(); });
document.getElementById('searchIcon').innerHTML = icon('search', { size: 17, color: 'var(--subtle)' });

const STATUS_META = {
  unpaid: { color: '#EF4444', soft: 'rgba(239,68,68,0.1)' },
  partial: { color: '#B8860B', soft: '#FBF2DE' },
  paid: { color: 'var(--ink)', soft: 'var(--emerald-soft)' },
};
function filters() {
  return [
    { key: 'all', label: t('cashier_fees.filter_all', 'All') },
    { key: 'unpaid', label: t('cashier_fees.filter_unpaid', 'Unpaid') },
    { key: 'partial', label: t('cashier_fees.filter_partial', 'Partial') },
    { key: 'paid', label: t('cashier_fees.filter_paid', 'Paid') },
  ];
}

let allInvoices = [];
let statusFilter = 'all';
let searchQuery = '';
let searchTimer = null;

function money(n) {
  return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function renderFilters() {
  const row = document.getElementById('filterRow');
  row.innerHTML = filters().map(f =>
    '<button type="button" class="filter-chip' + (statusFilter === f.key ? ' active' : '') + '" data-key="' + f.key + '">' + escapeHtml(f.label) + '</button>'
  ).join('');
  row.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => { statusFilter = btn.dataset.key; renderFilters(); renderList(); });
  });
}

function renderList() {
  const wrap = document.getElementById('listContent');
  let filtered = statusFilter === 'all' ? allInvoices : allInvoices.filter(i => i.status === statusFilter);
  const q = searchQuery.trim().toLowerCase();
  if (q) {
    filtered = filtered.filter(i =>
      (i.student_name || '').toLowerCase().includes(q) ||
      (i.student_code || '').toLowerCase().includes(q) ||
      (i.title || '').toLowerCase().includes(q)
    );
  }

  if (filtered.length === 0) {
    wrap.innerHTML =
      '<div class="list-empty"><div class="list-empty-title">' + escapeHtml(t('cashier_fees.empty_title', 'No invoices found')) + '</div>' +
      '<div class="list-empty-sub">' + escapeHtml(q || statusFilter !== 'all' ? t('cashier_fees.empty_sub_filtered', 'Try a different search or filter.') : t('cashier_fees.empty_sub_default', 'Invoices created for students will show up here.')) + '</div></div>';
    return;
  }

  wrap.innerHTML = '';
  filtered.forEach(inv => {
    const meta = STATUS_META[inv.status] || STATUS_META.unpaid;
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'list-card';
    row.innerHTML =
      '<span class="list-avatar-fallback" style="border-radius:12px;background:var(--emerald-gradient-soft);color:var(--ink);">' + icon('document', { size: 18, color: 'var(--ink)' }) + '</span>' +
      '<span class="list-card-body">' +
        '<span class="list-card-name">' + escapeHtml(inv.title || '') + '</span>' +
        '<div class="list-card-meta">' + escapeHtml(inv.student_name || t('cashier_fees.unknown_student', 'Unknown student')) + (inv.student_code ? ' · ' + escapeHtml(inv.student_code) : '') + '</div>' +
        '<span class="status-pill" style="background:' + meta.soft + ';color:' + meta.color + '">' + money(inv.paid_amount) + ' / ' + money(inv.total_amount) + '</span>' +
        (inv.recorded_by_name ? '<div class="list-card-meta" style="margin-top:4px;">' + escapeHtml(t('fee_reports.recorded_by', 'Recorded by {name}').replace('{name}', inv.recorded_by_name)) + '</div>' : '') +
      '</span>' +
      icon('chevron', { size: 18, color: 'var(--subtle)' });
    row.addEventListener('click', notWiredYet);
    wrap.appendChild(row);
  });
}

document.getElementById('searchInput').addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { searchQuery = e.target.value; renderList(); }, 200);
});

renderFilters();

guardDashboard('admin', function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  document.getElementById('listContent').innerHTML = '<div class="list-loading">' + escapeHtml(t('common.loading', 'Loading…')) + '</div>';
  fetchAdminFeeList(token).then((invoices) => {
    allInvoices = invoices;
    renderList();
  }).catch(() => {
    document.getElementById('listContent').innerHTML =
      '<div class="list-error">' + escapeHtml(t('fee_reports.load_failed', 'Failed to load fee reports.')) + '<br><button type="button" class="list-retry-btn" id="retryBtn">' + escapeHtml(t('common.retry', 'Try again')) + '</button></div>';
    document.getElementById('retryBtn')?.addEventListener('click', () => window.location.reload());
  });
});
