/* ============================================================
   English Lab — cihazlar arası ilerleme senkronu (Firebase)

   ns-* durumunu Firestore'da users/{uid} altına aynalar. Bağımlılık:
   store.js (NSStore) — bu dosyadan önce yüklenmeli.

   Yazmadan önce bulut okunur ve birleştirilir; körlemesine üzerine yazma
   yoktur. Birleştirmenin kuralı tek cümle: son başarılı push'tan beri BU
   cihazda dokunulmuş girdiler yerelden, geri kalan her şey buluttan
   gelir. Dokunulan girdilerin listesini NSStore ns-sync-pending'de tutar,
   sayfa yenilense de çevrimdışı kalınsa da kaybolmaz.

   Okuma tarafı onSnapshot: uzaktaki değişiklik açık duran sekmeye anında
   düşer, sayfa reload'una gerek kalmaz.
   ============================================================ */
(function () {
  'use strict';

  var CONFIG = {
    apiKey: "AIzaSyB5BGtV0uF13QTrNoWNfpqtm3WpUbpw7mw",
    authDomain: "nss-english-lab.firebaseapp.com",
    projectId: "nss-english-lab",
    storageBucket: "nss-english-lab.firebasestorage.app",
    messagingSenderId: "343220344822",
    appId: "1:343220344822:web:d9631f48c5aea04ea599d7"
  };

  var SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
  var TS_KEY = 'ns-sync-ts';          // "<uid>|<ts>" — içselleştirdiğimiz bulut updatedAt'i
  var Store = window.NSStore;

  function configured() { return CONFIG.apiKey && CONFIG.apiKey.indexOf('PASTE') !== 0; }
  if (!configured()) return;
  if (!Store) { console.warn('[sync] store.js yüklenmedi, senkron kapalı'); return; }

  var auth = null, db = null, fs = null, uid = null, user = null;
  var started = false, unwatch = null;
  var pushTimer = null, pushing = null, pushAgain = false, backoff = 0;

  var _setItem = localStorage.setItem.bind(localStorage);

  /* Damga hesaba bağlı yazılır. Başka bir hesaba geçilirse eski damga
     geçersizdir: sıfır sayılır, ilk senkron yolu işler ve A hesabının
     ilerlemesi B'nin dokümanına basılmaz. Eski düz sayı biçimi de sıfıra
     düşer — o cihazlar bir kez birleştirmeden geçer. */
  function localTs() {
    var raw = localStorage.getItem(TS_KEY) || '';
    var at = raw.indexOf('|');
    if (at < 0) return 0;
    return raw.slice(0, at) === uid ? (+raw.slice(at + 1) || 0) : 0;
  }
  function setLocalTs(ts) { _setItem(TS_KEY, uid + '|' + ts); }

  /* ---- localStorage yardımcıları ---- */
  function collectBlob() {
    var blob = {};
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (Store.syncable(k)) blob[k] = localStorage.getItem(k);
    }
    return blob;
  }

  /* Uygulama yazmalarını yakala -> buluta gönderimi zamanla.
     NSStore'a kayıtlı anahtarlar bekleyen girdilerini commit()'te
     kendileri işaretler; kalanlar (filtre, sekme, ses tercihi) bütün
     olarak işaretlenir. */
  localStorage.setItem = function (k, v) {
    _setItem(k, v);
    if (!Store.syncable(k)) return;
    // Oturum kapalıyken de işaretlenir: kullanıcı çıkış yapıp çalışmaya
    // devam ederse, tekrar girdiğinde o ilerleme bulut tarafından silinmesin.
    if (!Store.isStore(k)) Store.markPending(k, ['*']);
    if (uid) schedulePush();
  };

  /* ---- push: oku, birleştir, yaz — hepsi tek transaction içinde ----
     Eski sürüm doğrudan setDoc ediyordu; geride kalmış bir sekme taze bir
     zaman damgasıyla bayat blob'u yazıp tüm cihazların ilerlemesini
     siliyordu. Artık yazmadan önce bulut okunuyor ve araya girilirse
     transaction baştan çalışıyor. */
  function pushNow() {
    if (!uid || !db) return Promise.resolve();
    if (pushing) { pushAgain = true; return pushing; }

    setPill('saving');
    var ref = fs.doc(db, 'users', uid);
    var taken = Store.pending();

    pushing = fs.runTransaction(db, function (tx) {
      return tx.get(ref).then(function (snap) {
        var data = snap.exists() ? (snap.data() || {}) : {};
        var cloudTs = data.updatedAt || 0;
        var pulled = false;
        if (cloudTs > localTs() && data.blob) pulled = Store.mergeRemote(data.blob);

        // Saati geride kalmış bir cihaz da ilerletebilsin diye monoton.
        var ts = Math.max(Date.now(), cloudTs + 1);
        tx.set(ref, { blob: collectBlob(), updatedAt: ts }, { merge: true });
        return { ts: ts, pulled: pulled };
      });
    }).then(function (res) {
      setLocalTs(res.ts);
      Store.clearPending(taken);
      backoff = 0;
      setPill('synced');
      if (res.pulled) Store.notify('cloud');
    }).catch(function (e) {
      console.warn('[sync] push failed', e);
      setPill('error');
      backoff = Math.min(backoff ? backoff * 2 : 4000, 60000);
      schedulePush(backoff);
    }).then(function () {
      pushing = null;
      if (pushAgain) { pushAgain = false; schedulePush(500); }
    });

    return pushing;
  }

  function schedulePush(delay) {
    setPill('saving');
    if (pushTimer) clearTimeout(pushTimer);
    // delay === 0 anlamlı: "hemen". `delay || 1500` onu 1.5 sn'ye çevirirdi.
    pushTimer = setTimeout(function () { pushTimer = null; pushNow(); },
      delay === undefined ? 1500 : delay);
  }

  /* ---- pull: dokümanı canlı dinle ----
     Eskiden tek seferlik getDoc vardı, yani uzun süre açık duran sekme
     buluttaki değişikliği hiç öğrenmiyordu. Artık anında düşüyor ve
     sayfa reload'a gerek kalmadan tazeleniyor. */
  function watch() {
    if (!uid || !db) return;
    if (unwatch) { unwatch(); unwatch = null; }
    unwatch = fs.onSnapshot(fs.doc(db, 'users', uid), function (snap) {
      if (!snap.exists()) { schedulePush(0); return; }
      var data = snap.data() || {};
      var cloudTs = data.updatedAt || 0;
      if (cloudTs <= localTs() || !data.blob) { setPill('synced'); return; }

      var changed = Store.mergeRemote(data.blob);
      setLocalTs(cloudTs);
      setPill('synced');
      if (changed) Store.notify('cloud');
      // Bulutta olmayan yerel girdiler kaldıysa geri yaz.
      if (Object.keys(Store.pending()).length) schedulePush();
    }, function (e) {
      console.warn('[sync] watch failed', e);
      setPill('error');
    });
  }

  window.addEventListener('online', function () { if (uid) schedulePush(500); });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && uid && Object.keys(Store.pending()).length) schedulePush(500);
  });

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
      fs = {
        doc: dbMod.doc, getDoc: dbMod.getDoc, setDoc: dbMod.setDoc,
        onSnapshot: dbMod.onSnapshot, runTransaction: dbMod.runTransaction,
        GoogleAuthProvider: authMod.GoogleAuthProvider,
        signInWithPopup: authMod.signInWithPopup, signOut: authMod.signOut
      };
      authMod.onAuthStateChanged(auth, function (u) {
        user = u; uid = u ? u.uid : null;
        if (uid) {
          // Bu hesapla ilk senkron: giriş öncesi biriken yerel ilerleme
          // hiç push edilmediği için bekleyen sayılmaz ve bulut onu
          // silerdi. Sahiplen ki iki taraf birleşsin.
          if (!localTs()) Store.claimAll();
          setPill('synced');
          watch();
        }
        else {
          if (unwatch) { unwatch(); unwatch = null; }
          setPill('signedout');
        }
      });
    }).catch(function (e) {
      console.warn('[sync] SDK load failed', e); setPill('error');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
