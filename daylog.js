/* ============================================================
   English Lab — günlük kayıt ve günlük puan (NSDay)

   Skor ve akış depoları "şu an"ı tutar; hangi gün ne yapıldığını
   bilmezler. Bu dosya her cevabı ve her aşama değişimini o günün
   kaydına işler; today.html ve ana sayfa kartı bunları okur.

   Depo (NSStore, girdi bazlı birleşir):
     ns-day { "<YYYY-MM-DD>~<cihaz>": {
       b1:[doğru,yanlış]  v:[doğru,yanlış]  rc:[doğru,yanlış]   B1 · Vocabulary · Review kartı
       bx:{en:n}  vx:{en:n}       o gün yanlış bilinen kelimeler ve kaç kez
       toS:{en:1}                 cümle aşamasına geçenler
       out:{en:1}                 Sentences'tan "Not yet" ile geri gönderilenler
       learn:{en:'new'|'sentence'} Review'a girenler (değer: geldiği aşama)
       fall:{en:1}                Review'da üst üste 2 kez bilinemeyip geri düşenler
       rs:{en:1}                  Review'da cümle pratiği işaretlenenler
       rv:[kart,cümle,ms]         o an Review'da bekleyen iş (son görülen durum)
       t:saniye  at:ms            yaklaşık aktif süre · son olayın zamanı
     } }

   Girdi anahtarında cihaz kimliği var: iki cihaz aynı gün çalışınca
   girdiler birbirini ezmez, okurken toplanır. Kimlik ns-sync-device'ta
   durur (ns-sync-* buluta gitmez).

   Günlük puan: her iş POINTS'teki kadar puan getirir. Gün başarılı
   sayılır = toplam >= GOAL ve o günün Review'u bitmiş. Review'un
   bitip bitmediği geçmiş gün için bilinemez; bu yüzden Review durumu
   değiştikçe rv anlık görüntüsü o güne yazılır, geçmiş gün onun en
   sonuncusuyla değerlendirilir.

   store.js'ten SONRA, journey-core.js / lab-core.js / b1-core.js'ten
   ÖNCE, defer'siz yüklenmeli.
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'ns-day';
  var DATA = {};
  var STORE = NSStore.map(KEY, DATA);

  var GOAL = 100;
  var POINTS = {
    b1: 1,      // B1 Recall doğru cevap
    v: 2,       // Vocabulary doğru cevap
    toS: 3,     // Sentences'a geçen kelime
    learn: 5,   // Learned, Review'a giren kelime
    rc: 2,      // Review kartı (bilse de bilmese de)
    rs: 5       // Review cümle pratiği
  };
  var IDLE_MS = 5 * 60 * 1000;   // iki olay arası bundan uzunsa mola sayılır, süreye eklenmez

  var DEV = (function () {
    var k = 'ns-sync-device', id = null;
    try { id = localStorage.getItem(k); } catch (e) {}
    if (!id) {
      id = Math.random().toString(36).slice(2, 8);
      try { localStorage.setItem(k, id); } catch (e) {}
    }
    return id;
  })();

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fmt(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function today() { return fmt(new Date()); }
  function parse(s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(s, n) { var d = parse(s); d.setDate(d.getDate() + n); return fmt(d); }
  function size(o) { return Object.keys(o).length; }

  /* Yazmadan önce diski yeniden oku: aynı cihazın başka bir sekmesi bu
     girdiye yazmış olabilir, sayaçlar eski bellekten artmasın.
     quiet: kullanıcı işi değil (Review anlık görüntüsü), süreye sayılmaz. */
  function edit(date, fn, quiet) {
    STORE.refresh();
    var id = (date || today()) + '~' + DEV;
    var e = DATA[id] ? JSON.parse(JSON.stringify(DATA[id])) : {};
    fn(e);
    if (!quiet && (!date || date === today())) {
      var now = Date.now();
      if (e.at && now - e.at < IDLE_MS && now > e.at) e.t = (e.t || 0) + Math.round((now - e.at) / 1000);
      e.at = now;
    }
    DATA[id] = e;
    STORE.touch(id).commit();
  }

  /* ---- yazma ---- */
  var AREAS = { b1: 'bx', v: 'vx', rc: null };
  function answer(area, en, hit) {
    if (!(area in AREAS)) return;
    edit(null, function (e) {
      var p = e[area] || [0, 0];
      p[hit ? 0 : 1]++;
      e[area] = p;
      var mk = AREAS[area];
      if (!hit && mk && en) { var m = e[mk] || (e[mk] = {}); m[en] = (m[en] || 0) + 1; }
    });
  }

  function setHas(e, k, en) { return !!(e[k] && Object.prototype.hasOwnProperty.call(e[k], en)); }
  function setAdd(e, k, en, v) { (e[k] || (e[k] = {}))[en] = v == null ? 1 : v; }
  function setDel(e, k, en) { if (e[k]) { delete e[k][en]; if (!Object.keys(e[k]).length) delete e[k]; } }

  /* Aşama olayları. Aynı gün geri alınan işlem kaydı da geri alır:
     cümleye alınıp hemen çıkarılan kelime ne "geçti" ne "geri gönderildi". */
  function stage(ev, en, from) {
    edit(null, function (e) {
      if (ev === 'toS') { if (setHas(e, 'out', en)) setDel(e, 'out', en); else setAdd(e, 'toS', en); }
      else if (ev === 'out') { if (setHas(e, 'toS', en)) setDel(e, 'toS', en); else setAdd(e, 'out', en); }
      else if (ev === 'learn') setAdd(e, 'learn', en, from || 'sentence');
      else if (ev === 'unlearn') setDel(e, 'learn', en);
      else if (ev === 'fall') setAdd(e, 'fall', en);
    });
  }

  /* Review cümle pratiği geçmiş bir tarihe de işaretlenebilir: o güne yazılır.
     Kelime o gün zaten bekliyorduysa (wasDue) o günün son Review görüntüsünde
     kalan cümle sayısı da bir azalır; yoksa gün "Review bitmedi" kalırdı. */
  function sentencePractised(en, date, wasDue) {
    var past = date && date !== today();
    if (!past) { edit(null, function (e) { setAdd(e, 'rs', en); }); return; }
    var last = day(date).rv;
    edit(date, function (e) {
      setAdd(e, 'rs', en);
      if (wasDue && last && last[1] > 0) e.rv = [last[0], last[1] - 1, last[2] + 1];
    });
  }

  /* ---- Review'da bekleyen iş ----
     Review sayfası data.js'ten çıkmış kelimeleri göstermiyor; aynı süzgeç
     burada da olmalı, yoksa bitirilemeyecek bir iş "bekliyor" görünür.
     WORDS (data.js) ve NSJourney olmayan sayfada bilinemez: null. */
  var known = null;
  function liveReview() {
    var J = window.NSJourney;
    if (!J || typeof WORDS === 'undefined') return null;
    if (!known) { known = {}; WORDS.forEach(function (w) { known[w.en] = 1; }); }
    var f = function (en) { return known[en]; };
    return [J.cardsDue().filter(f).length, J.sentencesDue().filter(f).length];
  }
  function noteReview() {
    var live = liveReview();
    if (!live) return;
    var cur = DATA[today() + '~' + DEV];
    cur = cur && cur.rv;
    if (cur && cur[0] === live[0] && cur[1] === live[1]) return;
    edit(null, function (e) { e.rv = [live[0], live[1], Date.now()]; }, true);
  }
  window.addEventListener('load', noteReview);
  window.addEventListener('ns-state-changed', noteReview);

  /* ---- okuma: bir günün bütün cihazlardaki girdileri toplanır ---- */
  function day(date) {
    var out = { b1: [0, 0], v: [0, 0], rc: [0, 0], bx: {}, vx: {}, toS: {}, out: {}, learn: {}, fall: {}, rs: {}, t: 0, rv: null };
    var pre = date + '~';
    Object.keys(DATA).forEach(function (id) {
      if (id.indexOf(pre) !== 0) return;
      var e = DATA[id];
      ['b1', 'v', 'rc'].forEach(function (k) { if (e[k]) { out[k][0] += e[k][0] || 0; out[k][1] += e[k][1] || 0; } });
      ['bx', 'vx'].forEach(function (k) { if (e[k]) Object.keys(e[k]).forEach(function (en) { out[k][en] = (out[k][en] || 0) + e[k][en]; }); });
      ['toS', 'out', 'learn', 'fall', 'rs'].forEach(function (k) { if (e[k]) Object.keys(e[k]).forEach(function (en) { out[k][en] = e[k][en]; }); });
      out.t += e.t || 0;
      if (e.rv && (!out.rv || e.rv[2] > out.rv[2])) out.rv = e.rv;   // en son görülen durum
    });
    return out;
  }
  function active(d) {
    return d.b1[0] + d.b1[1] + d.v[0] + d.v[1] + d.rc[0] + d.rc[1] > 0 ||
      ['toS', 'out', 'learn', 'fall', 'rs'].some(function (k) { return size(d[k]) > 0; });
  }
  function firstDay() {
    var min = null;
    Object.keys(DATA).forEach(function (id) { var d = id.split('~')[0]; if (!min || d < min) min = d; });
    return min;
  }

  /* ---- puan ----
     left: [kart, cümle] Review'da kalan; bugün canlı hesaplanır.
     reviewDone: true / false / null (bilinmiyor) */
  function score(date) {
    var d = day(date);
    var parts = {
      b1: d.b1[0] * POINTS.b1,
      v: d.v[0] * POINTS.v,
      toS: size(d.toS) * POINTS.toS,
      learn: size(d.learn) * POINTS.learn,
      rc: (d.rc[0] + d.rc[1]) * POINTS.rc,
      rs: size(d.rs) * POINTS.rs
    };
    var practice = parts.b1 + parts.v + parts.toS + parts.learn;
    var review = parts.rc + parts.rs;
    var left = (date === today() && liveReview()) || (d.rv ? [d.rv[0], d.rv[1]] : null);
    var reviewDone = left ? left[0] + left[1] === 0 : null;
    return {
      date: date, day: d, parts: parts,
      practice: practice, review: review, total: practice + review,
      left: left, reviewDone: reviewDone,
      success: practice + review >= GOAL && reviewDone === true
    };
  }

  /* ---- ortak gösterim: puan çubuğu (ana sayfa kartı + today.html) ----
     Stiller lab.css'te (.dscore). */
  function plural(n, one) { return n + ' ' + one + (n === 1 ? '' : 's'); }
  function scoreHTML(s) {
    var scale = Math.max(GOAL, s.total);
    var isToday = s.date === today();
    var badge = s.success ? 'Success'
      : s.total >= GOAL ? 'Review left'
      : (GOAL - s.total) + ' to go';
    var rv, rvCls;
    if (s.reviewDone === true) {
      rvCls = 'ok';
      rv = s.review || !isToday ? 'Review done' : 'Nothing due in Review today';
    } else if (s.reviewDone === false) {
      rvCls = 'todo';
      var bits = [];
      if (s.left[0]) bits.push(plural(s.left[0], 'card'));
      if (s.left[1]) bits.push(plural(s.left[1], 'sentence'));
      rv = isToday ? 'Review is required: ' + bits.join(' and ') + ' left' : 'Review was not finished';
    } else {
      rvCls = 'unk';
      rv = 'Review status not recorded for this day';
    }
    return '<div class="dscore' + (s.success ? ' is-success' : '') + '">' +
      '<div class="dscore-top">' +
        '<span class="dscore-num"><b>' + s.total + '</b> / ' + GOAL + ' points</span>' +
        '<span class="dscore-badge">' + badge + '</span>' +
      '</div>' +
      '<div class="dscore-bar" role="img" aria-label="' + s.practice + ' practice points and ' + s.review + ' review points out of ' + GOAL + '">' +
        (s.practice ? '<i class="p" style="width:' + (s.practice / scale * 100) + '%"></i>' : '') +
        (s.review ? '<i class="r" style="width:' + (s.review / scale * 100) + '%"></i>' : '') +
      '</div>' +
      '<div class="dscore-legend">' +
        '<span><i class="sw p"></i>Practice ' + s.practice + '</span>' +
        '<span><i class="sw r"></i>Review ' + s.review + '</span>' +
        '<span class="dscore-rv ' + rvCls + '">' + rv + '</span>' +
      '</div>' +
    '</div>';
  }

  window.NSDay = {
    KEY: KEY, GOAL: GOAL, POINTS: POINTS,
    today: today, addDays: addDays,
    answer: answer, stage: stage, sentencePractised: sentencePractised, noteReview: noteReview,
    day: day, active: active, firstDay: firstDay,
    score: score, scoreHTML: scoreHTML
  };
})();
