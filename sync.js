/* ============================================================
   English Lab — cross-device progress sync (Firebase)
   Signs in with Google, mirrors all ns-* localStorage keys to
   Firestore under users/{uid}. Last-writer-wins by timestamp.

   To activate: paste your Firebase web config into CONFIG below.
   Until then the script stays silent (no sign-in pill appears).
   ============================================================ */
(function () {
  'use strict';

  // ---- 1) PASTE YOUR FIREBASE WEB CONFIG HERE ----
  var CONFIG = {
    apiKey: "AIzaSyB5BGtV0uF13QTrNoWNfpqtm3WpUbpw7mw",
    authDomain: "nss-english-lab.firebaseapp.com",
    projectId: "nss-english-lab",
    storageBucket: "nss-english-lab.firebasestorage.app",
    messagingSenderId: "343220344822",
    appId: "1:343220344822:web:d9631f48c5aea04ea599d7"
  };
  // -------------------------------------------------

  var SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
  var TS_KEY = 'ns-sync-ts';
  function configured() { return CONFIG.apiKey && CONFIG.apiKey.indexOf('PASTE') !== 0; }
  function syncable(k) { return /^ns-/.test(k) && !/^ns-sync/.test(k) && k !== 'ns-theme'; }

  if (!configured()) return; // not set up yet -> stay invisible

  var auth = null, db = null, fs = null, uid = null, user = null;
  var suspend = false, pushTimer = null, started = false;

  /* ---- localStorage helpers ---- */
  var _setItem = localStorage.setItem.bind(localStorage);
  function collectBlob() {
    var blob = {};
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (syncable(k)) blob[k] = localStorage.getItem(k);
    }
    return blob;
  }
  function blobDiffers(blob) {
    var keys = Object.keys(blob);
    for (var i = 0; i < keys.length; i++) {
      if (localStorage.getItem(keys[i]) !== blob[keys[i]]) return true;
    }
    return false;
  }
  function applyBlob(blob) {
    suspend = true;
    try { Object.keys(blob).forEach(function (k) { _setItem(k, blob[k]); }); }
    finally { suspend = false; }
  }
  // intercept app writes to ns-* keys -> schedule a cloud push
  localStorage.setItem = function (k, v) {
    _setItem(k, v);
    if (!suspend && uid && syncable(k)) schedulePush();
  };

  /* ---- cloud ops ---- */
  function pushNow() {
    if (!uid || !db) return Promise.resolve();
    var ts = Date.now();
    return fs.setDoc(fs.doc(db, 'users', uid), { blob: collectBlob(), updatedAt: ts }, { merge: true })
      .then(function () { _setItem(TS_KEY, String(ts)); setPill('synced'); })
      .catch(function (e) { console.warn('[sync] push failed', e); setPill('error'); });
  }
  function schedulePush() {
    setPill('saving');
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(pushNow, 1500);
  }
  function initialSync() {
    if (!uid || !db) return;
    fs.getDoc(fs.doc(db, 'users', uid)).then(function (snap) {
      var localTs = +(localStorage.getItem(TS_KEY) || 0);
      if (!snap.exists()) { pushNow(); return; }
      var data = snap.data() || {};
      var cloudTs = data.updatedAt || 0;
      var blob = data.blob || {};
      if (cloudTs > localTs && blobDiffers(blob)) {
        applyBlob(blob);
        _setItem(TS_KEY, String(cloudTs));
        setPill('synced');
        // the app already read localStorage at init; reload once to reflect cloud state
        if (!sessionStorage.getItem('ns-sync-reloaded')) {
          sessionStorage.setItem('ns-sync-reloaded', '1');
          location.reload();
        }
      } else if (cloudTs > localTs) {
        _setItem(TS_KEY, String(cloudTs));
        setPill('synced');
      } else {
        pushNow();
      }
    }).catch(function (e) { console.warn('[sync] initial sync failed', e); setPill('error'); });
  }

  /* ---- UI pill ---- */
  var pill, pillText;
  function buildPill() {
    pill = document.createElement('button');
    pill.className = 'sync-pill';
    pill.type = 'button';
    pill.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg><span class="sync-pill-text">Sign in to sync</span>';
    pillText = pill.querySelector('.sync-pill-text');
    pill.addEventListener('click', onPillClick);
    // Prefer an in-page host (e.g. the app bar); fall back to the floating corner.
    var host = document.getElementById('syncHost');
    if (host) { pill.classList.add('sync-pill--bar'); host.appendChild(pill); }
    else document.body.appendChild(pill);
  }
  function setPill(state) {
    if (!pill) return;
    pill.dataset.state = state;
    if (state === 'signedout') { pillText.textContent = 'Sign in to sync'; pill.title = 'Sync progress across devices'; }
    else if (state === 'saving') { pillText.textContent = 'Saving...'; }
    else if (state === 'synced') { pillText.textContent = 'Synced'; pill.title = user ? (user.email || 'Signed in') : 'Synced'; }
    else if (state === 'error') { pillText.textContent = 'Sync error'; }
    else if (state === 'busy') { pillText.textContent = 'Connecting...'; }
  }
  function onPillClick() {
    if (!auth) return;
    if (!uid) {
      var provider = new fs.GoogleAuthProvider();
      fs.signInWithPopup(auth, provider).catch(function (e) {
        console.warn('[sync] sign-in failed', e); setPill('error');
      });
    } else {
      if (confirm('Sign out of sync on this device? Your local progress stays.')) {
        fs.signOut(auth);
      }
    }
  }

  /* ---- boot: dynamically load Firebase modular SDK ---- */
  function boot() {
    if (started) return; started = true;
    buildPill(); setPill('busy');
    Promise.all([
      import(SDK + 'firebase-app.js'),
      import(SDK + 'firebase-auth.js'),
      import(SDK + 'firebase-firestore.js')
    ]).then(function (mods) {
      var appMod = mods[0], authMod = mods[1], dbMod = mods[2];
      var app = appMod.initializeApp(CONFIG);
      auth = authMod.getAuth(app);
      db = dbMod.getFirestore(app);
      // expose the firestore/auth helpers we need
      fs = {
        doc: dbMod.doc, getDoc: dbMod.getDoc, setDoc: dbMod.setDoc,
        GoogleAuthProvider: authMod.GoogleAuthProvider,
        signInWithPopup: authMod.signInWithPopup, signOut: authMod.signOut
      };
      authMod.onAuthStateChanged(auth, function (u) {
        user = u; uid = u ? u.uid : null;
        if (uid) { setPill('synced'); initialSync(); }
        else { setPill('signedout'); }
      });
    }).catch(function (e) {
      console.warn('[sync] SDK load failed', e); setPill('error');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
