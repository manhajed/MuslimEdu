// Redeems a pending deep link before the page paints. Runs on login.php,
// which is now the app's entry point (manifest start_url) now that
// index.php has been removed - public_html owns the site's index, and
// this app folder no longer has one of its own.
//
// (Signed-in users don't need a bounce here: login.js's own on-load
// check already sends them straight to their dashboard.)
(function () {
  var PENDING_DEEP_LINK_KEY = 'muslimedu_pending_deep_link';

  // student-preregister.php requires the installed app (display-mode:
  // standalone) before it'll show its form - a student who hit that gate
  // saved their intended URL here right before showing it, since
  // installing doesn't retroactively make their current browser tab
  // standalone: they have to close it and relaunch from the home screen
  // icon they just created, which opens this page (login.php, the
  // manifest's start_url), not the specific school_id link they started
  // from. Consumed once (removed immediately) so it can't strand a later,
  // unrelated launch on a stale redirect.
  var pendingDeepLink = null;
  try { pendingDeepLink = localStorage.getItem(PENDING_DEEP_LINK_KEY); } catch (e) {}
  if (pendingDeepLink) {
    try { localStorage.removeItem(PENDING_DEEP_LINK_KEY); } catch (e) {}
    window.location.replace(pendingDeepLink);
  }
})();
