/* IPAK Portal - shared auth guard.  Har inner page ke <head> mein sab se pehle load karein. */
(function () {
  // >>> Apps Script "Web app" URL yahan paste karein <<<
  var AUTH_API = 'https://script.google.com/macros/s/AKfycbwyAd40gnv6SDfJ1rTkosjYCsJkrfFDz1haKmSyHqZRwSdLxWI4VXw9Woq0UCtiWLk0cA/exec';
  var KEY = 'ipak_session';

  function read() {
    try {
      var raw = sessionStorage.getItem(KEY) || localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function save(s, remember) {
    clear();
    (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(s));
  }
  function clear() {
    try { sessionStorage.removeItem(KEY); localStorage.removeItem(KEY); } catch (e) {}
  }
  function call(body) {
    return fetch(AUTH_API, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },   // preflight se bachne ke liye
      body: JSON.stringify(body)
    }).then(function (r) { return r.json(); });
  }
  function toLogin() {
    clear();
    var here = location.pathname.split('/').pop() || '';
    location.replace('index.html' + (here && here !== 'index.html' ? '?next=' + encodeURIComponent(here) : ''));
  }

  window.IPAKAuth = {
    user: function () { var s = read(); return s ? s.user : null; },
    login: function (id, password, remember) {
      return call({ action: 'login', id: id, password: password, remember: !!remember }).then(function (r) {
        if (r.ok) save({ token: r.token, exp: r.exp, user: r.user }, remember);
        return r;
      });
    },
    logout: function () { clear(); location.replace('index.html'); },
    isLoggedIn: function () { var s = read(); return !!(s && s.exp > Date.now()); }
  };
  window.logout = window.IPAKAuth.logout;     // purane onclick="logout()" chalte rahein

  // login page par guard nahi chalana
  if (document.documentElement.hasAttribute('data-public')) return;

  // page chhupa do jab tak check na ho jaye
  var st = document.createElement('style');
  st.id = 'ipak-guard';
  st.textContent = 'html{visibility:hidden!important}';
  document.head.appendChild(st);
  function reveal() { var e = document.getElementById('ipak-guard'); if (e) e.remove(); }

  var s = read();
  if (!s || !s.token || s.exp <= Date.now()) return toLogin();
  reveal();                                    // local check pass -> foran dikhao

  // server se confirm (token tamper / user removed / password changed)
  call({ action: 'verify', token: s.token }).then(function (r) {
    if (r && r.ok === false) toLogin();
  }).catch(function () { /* network issue: session chalne dein */ });
})();
