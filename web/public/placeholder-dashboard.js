// Fallback for any role without its own dashboard (parent, librarian,
// warden, etc). No expected role of its own - guardDashboard(null, ...)
// accepts whatever role /me returns.
  document.getElementById('footerWrap').innerHTML = renderLogoutFooter();

  guardDashboard(null, function (user) {
    const label = (user.role || 'Account').replace(/(^|_)([a-z])/g, (_, sep, c) => (sep ? ' ' : '') + c.toUpperCase());
    document.getElementById('roleBadge').textContent = label;
    document.getElementById('placeholderTitle').textContent = label + ' dashboard';
    const heroHeightPx = document.querySelector('.header-row').offsetHeight;
    document.getElementById('heroBg').style.height = heroHeightPx + 'px';
    wireParallax('heroBg', heroHeightPx);
    // Role isn't known until the /me response lands (guardDashboard(null,...)
    // accepts any role), so the nav - and its per-role center action, if
    // any - renders here instead of before guardDashboard like the other
    // four dashboards.
    document.getElementById('bottomNavWrap').innerHTML = renderBottomNav(user.role);
  });
