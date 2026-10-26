// theme.js - light / dark blue theme switch (remembered on this device)
(function () {
  var KEY = 'sumisho_theme', root = document.documentElement;
  var saved = null; try { saved = localStorage.getItem(KEY); } catch (e) {}
  root.setAttribute('data-theme', saved === 'dark' ? 'dark' : 'light');

  function apply(t) {
    root.setAttribute('data-theme', t);
    var m = document.querySelector('meta[name=theme-color]');
    if (m) m.content = t === 'dark' ? '#0f1d4a' : '#2e4c9a';
    var b = document.getElementById('themeBtn');
    if (b) {
      b.firstElementChild.className = t === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
      b.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
      b.title = b.getAttribute('aria-label');
    }
  }
  document.addEventListener('DOMContentLoaded', function () {
    apply(root.getAttribute('data-theme'));
    var b = document.getElementById('themeBtn');
    if (b) b.addEventListener('click', function () {
      var n = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(KEY, n); } catch (e) {}
      apply(n);
    });
  });
})();
