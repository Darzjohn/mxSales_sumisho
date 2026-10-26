// auth.js - simple session gate (see note in README: this is not real security)
window.Auth = (function () {
  const KEY = 'sumisho_session';
  const cfg = window.APP_CONFIG;
 
  function isLoggedIn() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      return !!s && Date.now() - s.t < cfg.sessionHours * 3600 * 1000;
    } catch (e) { return false; }
  }
  function login(user, pass) {
    if (user === cfg.credentials.username && pass === cfg.credentials.password) {
      try { localStorage.setItem(KEY, JSON.stringify({ t: Date.now() })); } catch (e) {}
      return true;
    }
    return false;
  }
  function logout() {
    try { localStorage.removeItem(KEY); } catch (e) {}
    location.replace('login.html');
  }
  function require() {
    if (!isLoggedIn()) { location.replace('login.html'); return false; }
    return true;
  }
  return { isLoggedIn, login, logout, require };
})();
 