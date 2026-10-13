/* ============================================================
   English Lab — günlük kayıt (NSDay)

   Skor ve akış depoları "şu an"ı tutar; hangi gün ne yapıldığını
   bilmezler. Bu dosya her cevabı ve her aşama değişimini o günün
   kaydına işler; today.html bunları okur.

   Depo (NSStore, girdi bazlı birleşir):
     ns-day { "<YYYY-MM-DD>~<cihaz>": {
       b1:[doğru,yanlış]  v:[doğru,yanlış]  rc:[doğru,yanlış]   B1 · Vocabulary · Review kartı
       bx:{en:n}  vx:{en:n}       o gün yanlış bilinen kelimeler ve kaç kez
       toS:{en:1}                 cümle aşamasına geçenler
       out:{en:1}                 Sentences'tan "Not yet" ile geri gönderilenler
       learn:{en:'new'|'sentence'} Review'a girenler (değer: geldiği aşama)
       fall:{en:1}                Review'da üst üste 2 kez bilinemeyip geri düşenler
       rs:{en:1}                  Review'da cümle pratiği işaretlenenler
       t:saniye  at:ms            yaklaşık aktif süre · son olayın zamanı
     } }

   Girdi anahtarında cihaz kimliği var: iki cihaz aynı gün çalışınca
   girdiler birbirini ezmez, okurken toplanır. Kimlik ns-sync-device'ta
   durur (ns-sync-* buluta gitmez).

   store.js'ten SONRA, journey-core.js / lab-core.js / b1-core.js'ten
   ÖNCE, defer'siz yüklenmeli.
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'ns-day';
  var GOAL_KEY = 'ns-day-goal';
  var DATA = {};
  var STORE = NSStore.map(KEY, DATA);
  var GOALS = {};
  var GOAL_STORE = NSStore.map(GOAL_KEY, GOALS);

  var DEFAULT_GOALS = { b1: 20, v: 20 };
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

  /* Yazmadan önce diski yeniden oku: aynı cihazın başka bir sekmesi bu
     girdiye yazmış olabilir, sayaçlar eski bellekten artmasın. */
  function edit(date, fn) {
    STORE.refresh();
    var id = (date || today()) + '~' + DEV;
    var e = DATA[id] ? JSON.parse(JSON.stringify(DATA[id])) : {};
    fn(e);
    if (!date || date === today()) {
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

  /* Review cümle pratiği geçmiş bir tarihe de işaretlenebilir: o güne yazılır. */
  function sentencePractised(en, date) {
    edit(date && date !== today() ? date : null, function (e) { setAdd(e, 'rs', en); });
  }

  /* ---- okuma: bir günün bütün cihazlardaki girdileri toplanır ---- */
  function day(date) {
    var out = { b1: [0, 0], v: [0, 0], rc: [0, 0], bx: {}, vx: {}, toS: {}, out: {}, learn: {}, fall: {}, rs: {}, t: 0 };
    var pre = date + '~';
    Object.keys(DATA).forEach(function (id) {
      if (id.indexOf(pre) !== 0) return;
      var e = DATA[id];
      ['b1', 'v', 'rc'].forEach(function (k) { if (e[k]) { out[k][0] += e[k][0] || 0; out[k][1] += e[k][1] || 0; } });
      ['bx', 'vx'].forEach(function (k) { if (e[k]) Object.keys(e[k]).forEach(function (en) { out[k][en] = (out[k][en] || 0) + e[k][en]; }); });
      ['toS', 'out', 'learn', 'fall', 'rs'].forEach(function (k) { if (e[k]) Object.keys(e[k]).forEach(function (en) { out[k][en] = e[k][en]; }); });
      out.t += e.t || 0;
    });
    return out;
  }
  function active(d) {
    return d.b1[0] + d.b1[1] + d.v[0] + d.v[1] + d.rc[0] + d.rc[1] > 0 ||
      ['toS', 'out', 'learn', 'fall', 'rs'].some(function (k) { return Object.keys(d[k]).length > 0; });
  }
  function firstDay() {
    var min = null;
    Object.keys(DATA).forEach(function (id) { var d = id.split('~')[0]; if (!min || d < min) min = d; });
    return min;
  }

  function goals() {
    return {
      b1: typeof GOALS.b1 === 'number' ? GOALS.b1 : DEFAULT_GOALS.b1,
      v: typeof GOALS.v === 'number' ? GOALS.v : DEFAULT_GOALS.v
    };
  }
  function setGoal(k, n) {
    if (!(k in DEFAULT_GOALS)) return;
    n = Math.max(0, Math.min(999, Math.round(+n || 0)));
    GOALS[k] = n;
    GOAL_STORE.touch(k).commit();
  }

  window.NSDay = {
    KEY: KEY,
    today: today, addDays: addDays,
    answer: answer, stage: stage, sentencePractised: sentencePractised,
    day: day, active: active, firstDay: firstDay,
    goals: goals, setGoal: setGoal
  };
})();
