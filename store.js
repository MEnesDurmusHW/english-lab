/* ============================================================
   English Lab — NSStore: girdi bazlı, birleştirerek yazan yerel depo

   Sorun: sayfalar durumu açılışta bir kez localStorage'dan okuyup
   bellekte tutuyor, her kayıtta da tüm nesneyi geri yazıyordu. Saatlerdir
   açık duran bir sekmede tek bir cevap, o sekmenin eski anlık görüntüsünü
   diske basıyor ve arada kazanılan her şeyi siliyordu.

   Çözüm: yazma anında disk yeniden okunur, taban olarak o alınır ve
   yalnızca bu sayfanın touch() ile işaretlediği girdiler üstüne konur.
   Dokunulmayan hiçbir girdiye el sürülmez.

   Dışarıdan (başka sekme, bulut) değişiklik geldiğinde bellek yerinde
   tazelenir — nesne kimliği korunur, çünkü sayfalar SCORES/FLAGS gibi
   referansları tutuyor — ve 'ns-state-changed' olayı yayınlanır.

   Son başarılı buluta yazmadan beri dokunulan girdiler ns-sync-pending'de
   birikir; sync.js birleştirmede hangi tarafın kazandığını o listeden
   okur. Sayfa yenilense de çevrimdışı kalınsa da kaybolmaz.

   sync.js'ten ÖNCE, defer'siz yüklenmeli: lab-core.js / b1-core.js
   gövdelerinde senkron olarak NSStore.map() çağırıyor.
   ============================================================ */
(function () {
  'use strict';

  var PENDING_KEY = 'ns-sync-pending';
  var _setItem = localStorage.setItem.bind(localStorage);
  var _removeItem = localStorage.removeItem.bind(localStorage);

  /* ns-sync-* ve cihaza özel tercihler buluta gitmez. */
  function syncable(k) {
    return /^ns-/.test(k) && !/^ns-sync/.test(k) && k !== 'ns-theme' && k !== 'ns-a2hs-hint';
  }

  /* Düz map ise nesneyi, değilse null döner — dizi ve skalerler
     girdi bazında birleştirilemez. */
  function readRaw(raw) {
    try {
      if (!raw) return null;
      var v = JSON.parse(raw);
      return (v && typeof v === 'object' && !Array.isArray(v)) ? v : null;
    } catch (e) { return null; }
  }
  function readJSON(key) { return readRaw(localStorage.getItem(key)); }

  /* Belleği diskle eşitler ama nesne kimliğini korur. */
  function adopt(mem, disk) {
    Object.keys(mem).forEach(function (k) {
      if (!Object.prototype.hasOwnProperty.call(disk, k)) delete mem[k];
    });
    Object.keys(disk).forEach(function (k) { mem[k] = disk[k]; });
  }

  /* ---- bekleyen girdiler: { "ns-vocab-score": { "abandon": 1 }, ... } ---- */
  function loadPending() { return readJSON(PENDING_KEY) || {}; }
  function savePending(p) {
    if (!Object.keys(p).length) { _removeItem(PENDING_KEY); return; }
    try { _setItem(PENDING_KEY, JSON.stringify(p)); } catch (e) {}
  }
  function markPending(key, entries) {
    if (!syncable(key) || !entries.length) return;
    var p = loadPending();
    var bag = p[key] || (p[key] = {});
    entries.forEach(function (e) { bag[e] = 1; });
    savePending(p);
  }
  /* taken verilirse yalnızca push'a dahil edilenler düşülür — push
     sürerken gelen yeni değişiklik bekleyende kalmalı. */
  function clearPending(taken) {
    if (!taken) { _removeItem(PENDING_KEY); return; }
    var p = loadPending();
    Object.keys(taken).forEach(function (key) {
      var bag = p[key];
      if (!bag) return;
      Object.keys(taken[key]).forEach(function (e) { delete bag[e]; });
      if (!Object.keys(bag).length) delete p[key];
    });
    savePending(p);
  }

  /* Yereldeki bütün map girdilerini "bu cihazda değişti" diye işaretler.
     İlk kez oturum açıldığında gerekiyor: giriş öncesi biriken ilerleme
     hiç push edilmediği için bekleyen sayılmaz ve mergeRemote onu sessizce
     uzaktakiyle değiştirirdi. Sahiplenince iki taraf da birleşerek kalır. */
  function claimAll() {
    var keys = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (syncable(k)) keys.push(k);             // önce topla: markPending araya yazıyor
    }
    var p = loadPending();
    keys.forEach(function (k) {
      var obj = readJSON(k);
      if (!obj) return;
      var bag = p[k] || (p[k] = {});
      Object.keys(obj).forEach(function (e) { bag[e] = 1; });
    });
    savePending(p);
  }

  /* ---- kayıtlı depolar ---- */
  var STORES = {};

  function makeStore(key, data) {
    var dirty = {};

    /* Kirli girdileri verilen taban nesnenin üstüne koyar. Bellekte
       olmayan kirli girdi = bilerek silinmiş, tabandan da düşer. */
    function overlay(base) {
      Object.keys(dirty).forEach(function (e) {
        if (Object.prototype.hasOwnProperty.call(data, e)) base[e] = data[e];
        else delete base[e];
      });
      return base;
    }

    var store = {
      key: key,
      data: data,

      /* Değiştirilen girdiyi işaretle. commit() yalnızca bunları yazar. */
      touch: function () {
        for (var i = 0; i < arguments.length; i++) {
          var a = arguments[i];
          if (Array.isArray(a)) a.forEach(function (e) { dirty[e] = 1; });
          else dirty[a] = 1;
        }
        return store;
      },

      /* Diski taban al, kirli girdileri üstüne koy, yaz. Araya giren
         başka bir sekmenin ya da bulutun yazdıkları böylece korunur. */
      commit: function () {
        var entries = Object.keys(dirty);
        var disk = overlay(readJSON(key) || {});
        adopt(data, disk);
        try { localStorage.setItem(key, JSON.stringify(disk)); } catch (e) {}
        if (entries.length) markPending(key, entries);
        dirty = {};
        return store;
      },

      /* Disk dışarıdan değişti: belleği tazele, henüz kaydedilmemiş
         kirli girdileri kaybetme. */
      refresh: function () {
        adopt(data, overlay(readJSON(key) || {}));
        return store;
      }
    };
    return store;
  }

  /* Düz map biçimindeki bir durumu kaydeder. data YERİNDE doldurulur;
     çağıranın tuttuğu referans hiç değişmez. */
  function map(key, data) {
    data = data || {};
    var disk = readJSON(key);
    if (disk) adopt(data, disk);
    var store = makeStore(key, data);
    STORES[key] = store;
    return store;
  }

  function refreshAll() {
    Object.keys(STORES).forEach(function (k) { STORES[k].refresh(); });
  }

  /* ---- uzak anlık görüntüyü yerele işle ----
     Kural: son push'tan beri bu cihazda dokunulmuş girdiler yerelden,
     geri kalan her şey uzaktan. Hiçbir yerde "hepsini ez" yok.

     Yazarken ham setItem kullanılır; bu bir buluta gönderim tetiklemez —
     çağıran gerekiyorsa kendisi zamanlar. Yerelde bir şey değiştiyse
     true döner. */
  function mergeRemote(blob) {
    var pending = loadPending();
    var changed = false;

    Object.keys(blob).forEach(function (key) {
      if (!syncable(key)) return;
      var remoteRaw = blob[key];
      if (typeof remoteRaw !== 'string') return;
      var localRaw = localStorage.getItem(key);
      if (localRaw === remoteRaw) return;

      var mine = pending[key];
      if (!mine) {                                 // bu cihaz dokunmadı -> uzak
        _setItem(key, remoteRaw);
        changed = true;
        return;
      }
      if (mine['*']) return;                       // bütün-anahtar talebi -> yerel kazanır

      var remoteObj = readRaw(remoteRaw);
      var localObj = localRaw === null ? null : readRaw(localRaw);
      if (!remoteObj || !localObj) return;         // düz değer -> dokunan taraf kazanır

      var merged = {};
      Object.keys(remoteObj).forEach(function (e) { merged[e] = remoteObj[e]; });
      Object.keys(mine).forEach(function (e) {
        if (Object.prototype.hasOwnProperty.call(localObj, e)) merged[e] = localObj[e];
        else delete merged[e];                     // yerelde silinmiş -> mezar taşı
      });

      var out = JSON.stringify(merged);
      if (out !== localRaw) { _setItem(key, out); changed = true; }
    });

    return changed;
  }

  var notifyTimer = null;
  function notify(reason) {
    if (notifyTimer) clearTimeout(notifyTimer);
    notifyTimer = setTimeout(function () {
      notifyTimer = null;
      refreshAll();
      window.dispatchEvent(new CustomEvent('ns-state-changed', { detail: { reason: reason } }));
    }, 0);
  }

  /* Aynı cihazın başka bir sekmesi yazdı. */
  window.addEventListener('storage', function (e) {
    if (!e.key || !syncable(e.key)) return;
    notify('storage');
  });

  /* Sekme öne geldi: uzun süre arkada kalmış olabilir, diski bir daha oku. */
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') notify('visible');
  });
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) notify('bfcache');
  });

  window.NSStore = {
    map: map,
    isStore: function (k) { return !!STORES[k]; },
    mergeRemote: mergeRemote,
    refreshAll: refreshAll,
    notify: notify,
    syncable: syncable,
    claimAll: claimAll,
    pending: loadPending,
    markPending: markPending,
    clearPending: clearPending
  };
})();
