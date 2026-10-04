/* ============================================================
   English Lab — kelimenin yolculuğu (öğrenme akışı)

   Vocabulary'nin pratik skoru (ns-vocab-score) serbest bir alıştırma
   sayacıdır: grup grup sıfırlanabilir. Bu dosya ondan BAĞIMSIZ, kalıcı
   bir kayıt tutar — her kelimenin akıştaki yeri. Sıfırlama buna dokunmaz.

     new ──(farklı 2 günde doğru)──► sentence ──(Learned)──► review
      └────────────(Learned: kısa yol, Low)───────────────►
     review ──(kartta üst üste 2 kez bilemedi)──► sentence

   Depo (NSStore, girdi bazlı birleşir):
     ns-flow { "<en>": { s, c, d, pri, card:{step,due,last,miss}, sent:{step,due,last} } }
       s     'new' | 'sentence' | 'review'
       c     farklı günlerde doğru sayacı (yalnızca new aşamasında işler)
       d     sayacın en son arttığı gün (YYYY-MM-DD)
       pri   'low' | 'med' | 'high' (review aşamasında)

   Anahtar data.js'teki `en` değeridir. Ayrıntı: docs/PLAN-flow.md

   store.js'ten SONRA, defer'siz yüklenmeli.
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'ns-flow';
  var DATA = {};
  var STORE = NSStore.map(KEY, DATA);

  var NEED_DAYS = 2;        // sentence aşamasına geçmek için farklı gün sayısı
  var LAPSE_LIMIT = 2;      // review kartında üst üste bilememe -> geri düşme

  /* Basamaklı aralıklar (gün). Son basamakta sabit kalır. */
  var CARD_IV = {
    high: [1, 3, 7, 14, 30, 60],
    med:  [2, 5, 12, 25, 50, 100],
    low:  [4, 10, 25, 60, 120, 240]
  };
  var SENT_IV = {
    high: [3, 7, 14, 30, 60, 120],
    med:  [7, 14, 30, 60, 120, 240],
    low:  [14, 30, 60, 120, 240, 365]
  };
  var PRI_ORDER = { high: 0, med: 1, low: 2 };
  var PRI_LABEL = { low: 'Low', med: 'Medium', high: 'High' };

  /* ---- tarih: yerel gün, YYYY-MM-DD ---- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fmt(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function today() { return fmt(new Date()); }
  function parse(s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(s, n) { var d = parse(s); d.setDate(d.getDate() + n); return fmt(d); }
  function daysBetween(a, b) { return Math.round((parse(b) - parse(a)) / 86400000); }

  function iv(table, pri, step) {
    var arr = table[pri] || table.med;
    return arr[Math.min(step, arr.length - 1)];
  }

  /* ---- okuma ---- */
  function get(en) { return DATA[en] || null; }
  function stageOf(en) { var j = DATA[en]; return j ? j.s : 'new'; }
  function inReview(en) { return stageOf(en) === 'review'; }
  function daysCount(en) { var j = DATA[en]; return j && j.s === 'new' ? (j.c || 0) : NEED_DAYS; }

  function put(en, j) { DATA[en] = j; STORE.touch(en).commit(); }
  function copy(j) { return JSON.parse(JSON.stringify(j || { s: 'new', c: 0 })); }

  /* ---- 1. new: pratik cevabı ----
     Yeni bir günde verilen doğru cevap sayacı artırır; aynı gün ikinci doğru
     sayılmaz (kısa süreli hafıza). Yanlış cevap sayacı sıfırlar.
     Eşik aşılınca 'sentence' döner — sayfa kelimeyi cümle listesine ekler. */
  function recordPractice(en, hit) {
    var j = copy(DATA[en]);
    if (j.s !== 'new') return null;
    var t = today();
    if (hit) {
      if (j.d === t) return null;
      j.c = (j.c || 0) + 1;
      j.d = t;
      if (j.c >= NEED_DAYS) { j.s = 'sentence'; put(en, j); return 'sentence'; }
    } else {
      if (!j.c) return null;
      j.c = 0;
    }
    put(en, j);
    return null;
  }

  /* ---- 2. Learned: review'a giriş ----
     sentence aşamasından gelen Medium, new'den kısa yolla gelen Low başlar.
     startIn: ilk kart tarihini kaydırmak için (geçişte yığılmayı önler). */
  function learn(en, opts) {
    opts = opts || {};
    var j = copy(DATA[en]);
    if (j.s === 'review') return j;
    var t = today();
    var pri = opts.pri || (j.s === 'sentence' ? 'med' : 'low');
    j.from = j.s;              // geri alınırsa döneceği aşama
    j.s = 'review';
    j.pri = pri;
    j.card = { step: 0, last: t, miss: 0, due: addDays(t, opts.startIn != null ? opts.startIn : iv(CARD_IV, pri, 0)) };
    j.sent = { step: 0, last: t, due: addDays(t, iv(SENT_IV, pri, 0)) };
    put(en, j);
    return j;
  }

  /* Learned geri alındı: review kaydı silinir, kelime geldiği aşamaya döner
     (yanlışlıkla basılan kısa yol kelimeyi cümle aşamasına itmesin).
     Döner: yeni aşama — sayfa cümle listesini buna göre ayarlar. */
  function unlearn(en) {
    var j = DATA[en];
    if (!j || j.s !== 'review') return stageOf(en);
    var back = j.from === 'new' ? { s: 'new', c: j.c || 0, d: j.d } : { s: 'sentence', c: NEED_DAYS, d: j.d || today() };
    put(en, back);
    return back.s;
  }

  /* Elle cümle listesine alma / listeden çıkarma. Cümle listesinde olmak
     = sentence aşamasında olmak; ikisi hep birlikte değişir. Çıkarılan
     kelime sayacı sıfırdan başlar, farklı 2 günde bilinince yine gelir. */
  function promote(en) {
    var j = copy(DATA[en]);
    if (j.s !== 'new') return;
    j.s = 'sentence';
    put(en, j);
  }
  function demote(en) {
    var j = DATA[en];
    if (!j || j.s !== 'sentence') return;
    put(en, { s: 'new', c: 0 });
  }

  /* ---- 3. review: kart ----
     Döner: 'fallback' ise kelime sentence aşamasına geri düştü; sayfa
     Learned işaretini kaldırıp cümle listesine eklemeli. */
  function rateCard(en, hit) {
    var j = copy(DATA[en]);
    if (j.s !== 'review') return null;
    var t = today();
    if (hit) {
      j.card.step = (j.card.step || 0) + 1;
      j.card.miss = 0;
      j.card.last = t;
      j.card.due = addDays(t, iv(CARD_IV, j.pri, j.card.step));
      put(en, j);
      return 'ok';
    }
    j.card.miss = (j.card.miss || 0) + 1;
    if (j.card.miss >= LAPSE_LIMIT) {
      put(en, { s: 'sentence', c: NEED_DAYS, d: t });
      return 'fallback';
    }
    j.card.step = 0;
    j.card.last = t;
    j.card.due = addDays(t, 1);
    put(en, j);
    return 'miss';
  }

  /* ---- 3. review: cümle ---- */
  function sentenceDone(en, date) {
    var j = copy(DATA[en]);
    if (j.s !== 'review') return;
    var d = date || today();
    j.sent.step = (j.sent.step || 0) + 1;
    j.sent.last = d;
    j.sent.due = addDays(d, iv(SENT_IV, j.pri, j.sent.step));
    put(en, j);
  }

  /* Öncelik değişince sonraki tarihler son tekrar gününe yeni aralık
     eklenerek yeniden hesaplanır. */
  function setPriority(en, pri) {
    var j = copy(DATA[en]);
    if (j.s !== 'review' || !CARD_IV[pri] || j.pri === pri) return;
    j.pri = pri;
    j.card.due = addDays(j.card.last, iv(CARD_IV, pri, j.card.step));
    j.sent.due = addDays(j.sent.last, iv(SENT_IV, pri, j.sent.step));
    put(en, j);
  }

  /* ---- listeler ---- */
  function reviewWords() {
    return Object.keys(DATA).filter(function (en) { return DATA[en].s === 'review'; });
  }
  function byPriorityThenDate(field) {
    return function (a, b) {
      var A = DATA[a], B = DATA[b];
      var p = PRI_ORDER[A.pri] - PRI_ORDER[B.pri];
      if (p) return p;
      return A[field].due < B[field].due ? -1 : A[field].due > B[field].due ? 1 : 0;
    };
  }
  function cardsDue(on) {
    var t = on || today();
    return reviewWords().filter(function (en) { return DATA[en].card.due <= t; }).sort(byPriorityThenDate('card'));
  }
  function sentencesDue(on) {
    var t = on || today();
    return reviewWords().filter(function (en) { return DATA[en].sent.due <= t; }).sort(byPriorityThenDate('sent'));
  }
  /* Önümüzdeki n günün kart yükü: [{date, cards, sents}] — bugün hariç. */
  function upcoming(n) {
    var t = today(), out = [];
    for (var i = 1; i <= n; i++) out.push({ date: addDays(t, i), cards: 0, sents: 0 });
    reviewWords().forEach(function (en) {
      var j = DATA[en];
      var dc = daysBetween(t, j.card.due), ds = daysBetween(t, j.sent.due);
      if (dc >= 1 && dc <= n) out[dc - 1].cards++;
      if (ds >= 1 && ds <= n) out[ds - 1].sents++;
    });
    return out;
  }

  window.NSJourney = {
    KEY: KEY, NEED_DAYS: NEED_DAYS, LAPSE_LIMIT: LAPSE_LIMIT,
    PRI_LABEL: PRI_LABEL, CARD_IV: CARD_IV, SENT_IV: SENT_IV,
    data: DATA,
    today: today, addDays: addDays, daysBetween: daysBetween,
    get: get, stageOf: stageOf, inReview: inReview, daysCount: daysCount,
    recordPractice: recordPractice, learn: learn, unlearn: unlearn,
    promote: promote, demote: demote,
    rateCard: rateCard, sentenceDone: sentenceDone, setPriority: setPriority,
    reviewWords: reviewWords, cardsDue: cardsDue, sentencesDue: sentencesDue,
    upcoming: upcoming
  };
})();
