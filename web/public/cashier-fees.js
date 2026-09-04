// Same invoice list as the admin's fee-reports.php (admin_fee_list is
// shared - requireAdminOrAccountant on the backend), but each row actually
// opens a "record a payment" sheet here instead of toasting not-wired-yet.
// admin_fee_record_payment was already live on the backend and callable by
// both roles; this is just the first web UI for it.

function renderHeaderText() {
  document.getElementById('utilHeaderWrap').innerHTML =
    renderUtilHeader(t('cashier_dashboard.record_payment_title', 'Collect Fees'), t('cashier_fees.subtitle', 'Search invoices and record a payment.'), 'cashier-dashboard.php');
}
renderHeaderText();
onLocaleChange(renderHeaderText);
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
function paymentMethods() {
  return [
    t('cashier_fees.method_cash', 'Cash'),
    t('cashier_fees.method_bank', 'Bank Transfer'),
    t('cashier_fees.method_mobile', 'Mobile Money'),
    t('cashier_fees.method_cheque', 'Cheque'),
  ];
}

let allInvoices = [];
let statusFilter = 'all';
let searchQuery = '';
let searchTimer = null;
let authToken = null;

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
onLocaleChange(renderFilters);

let lastListRendered = false;
function renderList() {
  lastListRendered = true;
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
      '</span>' +
      (inv.status !== 'paid' ? icon('chevron', { size: 18, color: 'var(--subtle)' }) : '');
    row.addEventListener('click', () => {
      if (inv.status === 'paid') { showToast(t('cashier_fees.already_paid', 'This invoice is already fully paid.')); return; }
      openPaymentSheet(inv);
    });
    wrap.appendChild(row);
  });
}
onLocaleChange(() => { if (lastListRendered) renderList(); });

function closePaymentSheet() {
  document.getElementById('paySheetBackdrop')?.remove();
}

function openPaymentSheet(invoice) {
  let backdrop = document.getElementById('paySheetBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'paySheetBackdrop';
    backdrop.className = 'sheet-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) closePaymentSheet(); });
  }

  const balance = Math.max(0, Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0));
  let selectedMethod = '';

  backdrop.innerHTML =
    '<div class="sheet-panel form">' +
      '<div class="sheet-handle"></div>' +
      '<div class="sheet-title-row"><span class="sheet-title">' + escapeHtml(t('cashier_dashboard.record_payment_title', 'Record Payment')) + '</span>' +
        '<button type="button" class="sheet-close-btn" id="payCloseBtn">' + icon('close', { size: 16, color: 'var(--subtle)' }) + '</button></div>' +

      '<div class="list-empty-sub" style="text-align:left;margin:0 0 12px;">' +
        escapeHtml(invoice.title || '') + ' — ' + escapeHtml(invoice.student_name || t('cashier_fees.unknown_student', 'Unknown student')) +
        (invoice.student_code ? ' · ' + escapeHtml(invoice.student_code) : '') + '<br>' +
        escapeHtml(t('cashier_fees.total_label', 'Total')) + ' ' + money(invoice.total_amount) + ' · ' + escapeHtml(t('cashier_fees.paid_label', 'Paid')) + ' ' + money(invoice.paid_amount) + ' · ' + escapeHtml(t('cashier_fees.balance_label', 'Balance')) + ' ' + money(balance) +
      '</div>' +

      '<label class="util-label" style="margin-top:0;">' + escapeHtml(t('cashier_fees.amount_label', 'Amount Being Paid Now')) + '</label>' +
      '<input type="number" inputmode="decimal" id="payAmount" class="util-input" min="0" step="0.01" placeholder="0.00" value="' + (balance > 0 ? balance : '') + '" />' +

      '<label class="util-label">' + escapeHtml(t('cashier_fees.method_label', 'Payment Method')) + '</label>' +
      '<div class="stage-chip-row" id="payMethodRow">' +
        paymentMethods().map(m => '<button type="button" class="stage-chip" data-value="' + escapeHtml(m) + '">' + escapeHtml(m) + '</button>').join('') +
      '</div>' +
      '<input type="text" id="payMethodInput" class="util-input" placeholder="' + escapeHtml(t('cashier_fees.method_placeholder', 'e.g. Cash, Bank Transfer, Mobile Money')) + '" />' +

      '<div class="sheet-form-error" id="payFormError">' + icon('warning', { size: 14, color: '#B3261E' }) + '<span></span></div>' +

      '<div class="sheet-form-actions">' +
        '<button type="button" class="sheet-btn-secondary" id="payCancelBtn">' + escapeHtml(t('common.cancel', 'Cancel')) + '</button>' +
        '<button type="button" class="sheet-btn-primary" id="paySubmitBtn"><span id="paySubmitLabel">' + escapeHtml(t('cashier_dashboard.record_payment_title', 'Record Payment')) + '</span></button>' +
      '</div>' +
    '</div>';

  document.getElementById('payCloseBtn').addEventListener('click', closePaymentSheet);
  document.getElementById('payCancelBtn').addEventListener('click', closePaymentSheet);

  document.getElementById('payMethodRow').querySelectorAll('.stage-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      selectedMethod = chip.dataset.value;
      document.getElementById('payMethodInput').value = selectedMethod;
      document.getElementById('payMethodRow').querySelectorAll('.stage-chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
    });
  });

  document.getElementById('paySubmitBtn').addEventListener('click', () => {
    const amount = Number(document.getElementById('payAmount').value);
    const method = document.getElementById('payMethodInput').value.trim();

    const errorEl = document.getElementById('payFormError');
    const setError = (msg) => { errorEl.querySelector('span').textContent = msg; errorEl.classList.add('show'); };
    errorEl.classList.remove('show');

    if (!amount || amount <= 0) { setError(t('cashier_fees.err_amount', 'Enter an amount greater than zero.')); return; }
    if (!method) { setError(t('cashier_fees.err_method', 'Payment method is required.')); return; }

    const btn = document.getElementById('paySubmitBtn');
    const label = document.getElementById('paySubmitLabel');
    btn.disabled = true;
    label.innerHTML = '<span class="util-spinner"></span>';

    recordFeePayment(authToken, invoice.id, amount, method)
      .then((updated) => {
        const idx = allInvoices.findIndex(i => i.id === invoice.id);
        if (idx !== -1 && updated) allInvoices[idx] = Object.assign({}, allInvoices[idx], updated);
        closePaymentSheet();
        showToast(t('cashier_fees.recorded', 'Payment recorded.'));
        renderList();
      })
      .catch(err => {
        const msg = (err && err.message) || t('cashier_fees.record_failed', 'Could not record payment.');
        setError(msg);
        showToast(msg);
        btn.disabled = false;
        label.textContent = t('cashier_dashboard.record_payment_title', 'Record Payment');
      });
  });
}

document.getElementById('searchInput').addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { searchQuery = e.target.value; renderList(); }, 200);
});

renderFilters();

guardDashboard('accountant', function (user, token) {
  authToken = token;
  document.getElementById('routeGuardSplash')?.remove();
  document.getElementById('listContent').innerHTML = '<div class="list-loading">' + escapeHtml(t('common.loading', 'Loading…')) + '</div>';
  fetchAdminFeeList(token).then((invoices) => {
    allInvoices = invoices;
    renderList();
  }).catch(() => {
    lastListRendered = false;
    document.getElementById('listContent').innerHTML =
      '<div class="list-error">' + escapeHtml(t('cashier_fees.load_failed', 'Failed to load invoices.')) + '<br><button type="button" class="list-retry-btn" id="retryBtn">' + escapeHtml(t('common.retry', 'Try again')) + '</button></div>';
    document.getElementById('retryBtn')?.addEventListener('click', () => window.location.reload());
  });
});
