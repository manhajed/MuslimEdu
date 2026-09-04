// Install gate removed: this used to hard-redirect any page opened outside
// the installed PWA back to login.php. Left in place (as a no-op) only so
// pages that still reference <script src="pwa-guard.js"> in their <head>
// don't 404 - it no longer blocks or redirects anything.
