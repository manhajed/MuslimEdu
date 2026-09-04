// Connection watcher for offline.html: flips the status line and returns to
// the requested page as soon as the network is back.
(function () {
  'use strict';
  var text = document.getElementById('statusText');
  var dot = document.querySelector('.dot');
  var btn = document.getElementById('retry');

  function online() {
    text.textContent = 'Back online — reloading…';
    dot.classList.remove('off');
    setTimeout(function () { location.reload(); }, 600);
  }

  function check() {
    text.textContent = 'Checking…';
    // A same-origin asset the service worker will not answer from cache
    // when the network is genuinely reachable.
    fetch('manifest.webmanifest?probe=' + Date.now(), { cache: 'no-store' })
      .then(online)
      .catch(function () {
        text.textContent = 'Still offline — check your connection';
        dot.classList.add('off');
      });
  }

  btn.addEventListener('click', check);
  window.addEventListener('online', online);
  if (navigator.onLine) check();
})();
