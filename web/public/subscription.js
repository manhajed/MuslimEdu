// Ported from SubscriptionDetailsScreen.tsx (tapped when status.active) and
// SubscribeScreen.tsx (tapped when !status.active) - RN routes to one or
// the other before either mounts; this single page just re-checks the
// same status.active flag itself and renders the matching layout, so
// there's one URL for the dashboard's subscription card to link to
// regardless of state. Backend: POST /admin_subscription_status,
// /admin_subscription_packages, /admin_subscription_request_create.

let currentToken = null;
let status = null;
let packages = [];
let selectedId = null;
let paymentReference = '';
let isSubmitting = false;

function intervalLabel(interval) {
  if (interval === 'monthly') return 'Monthly';
  if (interval === 'yearly') return 'Yearly';
  if (interval === 'life_time') return 'One-time, lifetime';
  return 'Days';
}

function packageCardHtml(pkg) {
  const isSelected = pkg.id === selectedId;
  return (
    '<div class="sub-package-card' + (isSelected ? ' active' : '') + '" data-id="' + pkg.id + '">' +
      '<div class="sub-package-header-row">' +
        '<span class="sub-package-name">' + escapeHtml(pkg.name) + '</span>' +
        (isSelected ? '<span class="sub-package-selected-dot"></span>' : '') +
      '</div>' +
      '<div class="sub-package-price">' + escapeHtml(String(pkg.price)) + ' · ' + intervalLabel(pkg.interval) + '</div>' +
      '<div class="sub-package-meta">' + escapeHtml(pkg.student_limit || 'Unlimited') + ' students</div>' +
      (pkg.description ? '<div class="sub-package-desc">' + escapeHtml(pkg.description) + '</div>' : '') +
    '</div>'
  );
}

function render() {
  const wrap = document.getElementById('subContent');
  if (!status) return;

  const pendingRequest = status.pending_request || null;
  const currentPackage = packages.find(p => p.name === status.package) || null;
  const expireDate = status.expire_date != null ? Number(status.expire_date) : null;
  const isLifetime = expireDate === 0;
  const daysRemaining = expireDate != null && !isLifetime ? Math.round((expireDate * 1000 - Date.now()) / 86400000) : null;
  const otherPackages = status.active ? packages.filter(p => p.id !== (currentPackage && currentPackage.id)) : packages;

  let html = '';

  // "Current plan" card only makes sense once there's something to show -
  // an active plan, or an expired one that used to have a package name.
  // A school with no subscription at all skips straight to the catalog,
  // same as SubscribeScreen.tsx (which never had a plan card to begin with).
  if (status.package || status.active || status.reason === 'expired') {
    html += '<div class="sub-plan-card">' +
      '<div class="sub-plan-top-row">' +
        '<span class="sub-plan-icon-wrap">' + icon('creditcard', { size: 20, color: '#fff' }) + '</span>' +
        '<span class="sub-plan-pill ' + (status.active ? 'active' : 'expired') + '">' + (status.active ? 'Active' : 'Expired') + '</span>' +
      '</div>' +
      '<div class="sub-plan-name">' + escapeHtml(status.package || 'Subscription') + '</div>' +
      '<div class="sub-plan-expiry">' +
        (isLifetime
          ? 'Never expires'
          : expireDate != null
            ? escapeHtml(status.active
                ? 'Renews on ' + new Date(expireDate * 1000).toLocaleDateString()
                : 'Expired on ' + new Date(expireDate * 1000).toLocaleDateString())
            : 'Contact your account owner to activate a plan.') +
      '</div>' +
      (!isLifetime && daysRemaining != null
        ? '<div class="sub-days-row"><span class="sub-days-num" style="color:' + (status.active ? '#6EE7B7' : '#FCA5A5') + '">' + Math.abs(daysRemaining) + '</span>' +
            '<span class="sub-days-label">' + (status.active ? 'days remaining' : 'days overdue') + '</span></div>'
        : '') +
      (currentPackage && currentPackage.student_limit
        ? '<div class="sub-meta-row"><span class="sub-meta-label">Student limit</span><span class="sub-meta-value">' + escapeHtml(currentPackage.student_limit) + '</span></div>'
        : '') +
      (currentPackage && !pendingRequest
        ? '<button type="button" class="sub-renew-btn" id="renewBtn"' + (isSubmitting ? ' disabled' : '') + '>' + icon('refresh', { size: 16, color: '#fff' }) + '<span>Renew</span></button>'
        : '') +
    '</div>';
  }

  if (pendingRequest) {
    html += '<div class="sub-pending-card">' +
      '<span class="sub-pending-icon-wrap">' + icon('clock', { size: 18, color: '#92400E' }) + '</span>' +
      '<div>' +
        '<div class="sub-pending-title">Request pending review</div>' +
        '<div class="sub-pending-body">You requested ' + escapeHtml(pendingRequest.package || '') + ' on ' +
          escapeHtml(new Date(pendingRequest.requested_at).toLocaleDateString()) + '. A superadmin will review it soon.</div>' +
      '</div>' +
    '</div>';
  } else {
    html += '<div class="util-section-title" style="margin-top:0;">' + (status.active ? 'Available Packages' : 'Choose a Plan') + '</div>';

    if (!otherPackages.length) {
      html += '<div class="sub-empty-text">' + (status.active ? 'There\u2019s nothing else to switch to right now.' : 'No packages are available yet - check back soon.') + '</div>';
    } else {
      html += '<div id="packageList">' + otherPackages.map(packageCardHtml).join('') + '</div>';
    }

    if (selectedId) {
      html +=
        '<label class="util-label">Payment note (optional)</label>' +
        '<input type="text" id="paymentRefInput" class="util-input" placeholder="e.g. bank transfer ref, or &quot;will pay in cash&quot;" value="' + escapeHtml(paymentReference) + '" />' +
        '<button type="button" class="util-save-btn pill" id="submitReqBtn"' + (isSubmitting ? ' disabled' : '') + '>' +
          '<span id="submitReqLabel">' + (status.active ? 'Request This Plan' : 'Request Plan') + '</span>' +
        '</button>';
    }
  }

  wrap.innerHTML = html;
  wire();
}

function wire() {
  document.getElementById('renewBtn')?.addEventListener('click', handleRenew);
  document.getElementById('packageList')?.querySelectorAll('.sub-package-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = parseInt(card.dataset.id, 10);
      selectedId = selectedId === id ? null : id;
      paymentReference = '';
      render();
    });
  });
  document.getElementById('paymentRefInput')?.addEventListener('input', e => { paymentReference = e.target.value; });
  document.getElementById('submitReqBtn')?.addEventListener('click', () => {
    if (!selectedId) return;
    submitRequest(selectedId, paymentReference);
  });
}

function handleRenew() {
  const currentPackage = packages.find(p => p.name === status.package);
  if (!currentPackage) return;
  if (!window.confirm('Renew ' + currentPackage.name + '? This submits a request for a superadmin to review, same as choosing a new plan - it\u2019s not automatic.')) return;
  submitRequest(currentPackage.id, '');
}

function submitRequest(packageId, note) {
  isSubmitting = true;
  render();
  submitSubscriptionRequest(currentToken, { package_id: packageId, payment_reference: note.trim() || undefined }).then(() => {
    showToast('Request submitted - we\u2019ll let you know once it\u2019s reviewed.');
    selectedId = null;
    paymentReference = '';
    return load();
  }).catch(err => {
    showToast((err && err.message) || 'Couldn\u2019t submit request. Please try again.');
  }).finally(() => {
    isSubmitting = false;
    render();
  });
}

function load() {
  return Promise.all([
    fetchAdminSubscriptionStatus(currentToken),
    fetchAdminSubscriptionPackages(currentToken),
  ]).then(([statusData, packagesData]) => {
    status = statusData;
    packages = packagesData;
    render();
  }).catch(() => {
    document.getElementById('subContent').innerHTML =
      '<div class="list-error">Failed to load subscription plans.<br><button type="button" class="list-retry-btn" id="retryBtn">Try again</button></div>';
    document.getElementById('retryBtn')?.addEventListener('click', load);
  });
}

document.getElementById('utilHeaderWrap').innerHTML = renderUtilHeader('Subscription', null, 'admin-dashboard.php', null);

guardDashboard('admin', function (user, token) {
  document.getElementById('routeGuardSplash')?.remove();
  document.getElementById('utilBody').style.display = '';
  document.getElementById('bottomNavWrap').innerHTML = renderBottomNav('admin');
  currentToken = token;
  document.getElementById('subContent').innerHTML = '<div class="list-loading">Loading subscription…</div>';
  load();
});
