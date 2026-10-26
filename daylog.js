/* ============================================================
   English Lab — günlük kayıt ve günlük puan (NSDay)

   Skor ve akış depoları "şu an"ı tutar; hangi gün ne yapıldığını
   bilmezler. Bu dosya her cevabı ve her aşama değişimini o günün
   kaydına işler; today.html ve ana sayfa kartı bunları okur.

   Depo (NSStore, girdi bazlı birleşir):
     ns-day { "<YYYY-MM-DD>~<cihaz>": {
       b1:[doğru,yanlış]  v:[doğru,yanlış]  rc:[doğru,yanlış]   B1 · Vocabulary flashcard · Review kartı
       vq:[doğru,yanlış]          Vocabulary quiz, fill-in, liste düğmeleri (puan vermez)
       n:[doğru,yanlış]           Shades senaryo soruları
       bp  vp  np                 puana sayılan doğrular (kelime / soru başına günde en çok PER_WORD)
       bc:{en:n}  vc:{en:n}  nc:{soru:n}
                                  doğru sayacı — yalnızca bugün için tutulur,
                                  ertesi gün bu cihazın eski girdilerinden silinir (boyut)
       bx:{en:n}  vx:{en:n}  nx:{en:n}
                                  o gün yanlış bilinen kelimeler ve kaç kez
       toS:{en:1}                 cümle aşamasına geçenler
       out:{en:1}                 Sentences'tan "Not yet" ile geri gönderilenler
       learn:{en:'new'|'sentence'} Review'a girenler (değer: geldiği aşama)
       fall:{en:1}                Review'da üst üste 2 kez bilinemeyip geri düşenler
       rs:{en:1}                  Review'da cümle pratiği işaretlenenler
       ar:{başlık:kelime}         Articles'ta çalışıldı işaretlenen makaleler
       rv:[kart,cümle,ms]         o an Review'da bekleyen iş (son görülen durum)
       sq:[kalan,ms]              o an Sentences aşamasında bekleyen kelime sayısı (son görülen durum)
       t:saniye  at:ms            yaklaşık aktif süre · son olayın zamanı
     } }

   Girdi anahtarında cihaz kimliği var: iki cihaz aynı gün çalışınca
   girdiler birbirini ezmez, okurken toplanır. Kimlik ns-sync-device'ta
   durur (ns-sync-* buluta gitmez).

   Yazılan metinler (Shades > Write) ayrı depoda, metin başına bir girdi:
     ns-write { "<ms>~<cihaz>": { d:'YYYY-MM-DD', at:ms, p:görev, text, n:kelime } }
   Articles'ta çalışıldı işaretlenen makaleler ns-day girdisinde (ar).
   Puanı d gününe yazılır: kelime başına POINTS.wr. Silinen metnin puanı
   da gider. Metin kendi girdisinde durduğu için hangi cihazda yazıldığı
   önemsizdir; her cihaz silebilir.

   ---- Günlük puan ----
   Çubuk üç bölme: Default · Sentences · Review. Günün hedefi GOAL + borç
   + Sentences'a taşınan kelimelerin puanı.
   Review bölmesi o günün Review işi kadar (yapılan + kalan; kaçırılan
   kartların kaybı düşülür), Sentences bölmesi yalnızca zorunlu kısım
   (SENT_GOAL kelime + taşınan). Default kalanı alır: flashcard'lar, zorunlunun
   üstündeki cümleler ve Review kaybı orada kapanır.
   Gün başarılı = toplam >= hedef, Review bitmiş ve Sentences zorunluluğu
   karşılanmış.

   Review'un bitip bitmediği geçmiş gün için bilinemez; bu yüzden Review
   durumu değiştikçe rv anlık görüntüsü o güne yazılır, geçmiş gün onun
   en sonuncusuyla değerlendirilir. Hiç açılmayan günler için ilk açılışta
   o günlerde bekleyen iş geriye dönük yazılır (backfill).

   Sentences zorunluluğu: o gün Sentences'ta (ilerletilenler + kalanlar)
   SENT_GOAL'den fazla kelime varsa en az SENT_GOAL + taşınan kelime
   kadarı (havuzdan fazla değil) Review'a ilerletilmeli. sq kaydı olmayan
   eski günler bu şarta takılmaz.

   Borç (DEBT_START'tan itibaren): eksik kalan gün ertesi güne taşınır.
     Review kısmı tam taşınır — bu kendiliğinden olur, yapılmayan kartlar
     ertesi gün de bekler ve Review bölmesini büyütür; ayrıca eklenmez.
     Review dışı kısmın (Flashcards + Sentences) açığının yarısı borç olur.
     Borç birikmez-katlanmaz: her gün yalnızca kendi açığının yarısını
     ekler; hedefi aşan puan borçtan düşer. En çok DEBT_CAP.
     Sentences zorunluluğu da aynı tarzda, kelime cinsinden taşınır:
     SENT_GOAL'e göre eksik kalan kelimelerin yarısı (yukarı yuvarlanır)
     ertesi günün zorunluluğuna eklenir, SENT_GOAL'ü aşan ilerletmeler
     taşınandan düşer. En çok SENT_CARRY_CAP. Zorunluluğu olmayan gün
     (havuz SENT_GOAL'den küçük ya da eşit) taşınanı sıfırlar; sq kaydı
     olmayan gün ona dokunmaz. Puan hedefi bundan etkilenmez: Sentences
     bölmesi büyür, Default o kadar küçülür.

   Seri: başarılı günler; arada en çok STREAK_GRACE gün kaçırılabilir.

   store.js'ten SONRA, journey-core.js / lab-core.js / b1-core.js'ten
   ÖNCE, defer'siz yüklenmeli.
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'ns-day';
  var DATA = {};
  var STORE = NSStore.map(KEY, DATA);

  var GOAL = 100;
  var SENT_GOAL = 5;         // Sentences'ta bundan fazla kelime birikmişse günde en az bu kadarı Review'a ilerletilir
  var SENT_GOAL_FROM = '2026-10-26';   // 5 bu günden itibaren; öncesi 20 ile oynandı, geçmiş günler öyle kalır
  var SENT_GOAL_OLD = 20;
  var PER_WORD = 2;          // aynı kelimenin doğrusu günde en çok bu kadar kez puan verir
  var STREAK_GRACE = 4;      // seri bozulmadan arka arkaya kaçırılabilecek gün
  var DEBT_START = '2026-10-17';   // borç bu puan kurallarıyla başlar; öncesi eski kurallarla oynandı
  var DEBT_CAP = 400;        // birikebilecek en yüksek borç
  var SENT_CARRY_CAP = 4 * SENT_GOAL;   // Sentences zorunluluğuna taşınabilecek en çok kelime (DEBT_CAP / GOAL gibi 4 x SENT_GOAL)
  function sentGoal(date) { return date < SENT_GOAL_FROM ? SENT_GOAL_OLD : SENT_GOAL; }
  function sentCap(date) { return 4 * sentGoal(date); }
  var POINTS = {
    b1: 0.5,       // B1 Recall doğru (yanlış: 0)
    v: 0.5,        // Vocabulary flashcard doğru
    vMiss: -0.5,   // Vocabulary flashcard yanlış
    toS: 0,        // Sentences'a geçen kelime (Vocabulary'deki doğruların yan ürünü)
    learn: 2,      // Sentences'ta cümlesi yazılıp Learned olan kelime
    shortcut: 0,   // Vocabulary'den doğrudan Learned (cümle yazılmadı)
    rc: 1,         // Review kartı doğru
    rcMiss: -0.5,  // Review kartı yanlış
    rs: 2,         // Review cümle pratiği
    n: 0.5,        // Shades senaryo sorusu doğru (yanlış: 0)
    wr: 1,         // Shades > Write: kaydedilen metindeki her kelime
    ar: 1          // Articles: çalışıldı işaretlenen makalenin her kelimesi
  };
  var WKEY = 'ns-write';
  var WDATA = {};
  var WSTORE = NSStore.map(WKEY, WDATA);
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
  function r1(n) { return Math.round(n * 10) / 10; }   // yarım puanlar: tek ondalık

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

  /* Kelime başına doğru sayaçları yalnızca bugün işe yarar; bu cihazın
     eski günlerinden silinir ki depo (ve bulut belgesi) şişmesin.
     Oturumda bir kez yeter. */
  var pruned = false;
  function prune() {
    if (pruned) return;
    pruned = true;
    var t = today(), suf = '~' + DEV, ids = [];
    Object.keys(DATA).forEach(function (id) {
      var e = DATA[id];
      if (id.slice(-suf.length) === suf && id.split('~')[0] < t && (e.bc || e.vc || e.nc)) {
        delete e.bc; delete e.vc; delete e.nc;
        ids.push(id);
      }
    });
    if (ids.length) STORE.touch(ids).commit();
  }

  /* ---- yazma ----
     alan: [doğru/yanlış sayacı, yanlış kelimeler, puan sayacı, kelime sayacı]
     vq (quiz/fill-in/liste) yanlışları da görünür ama puan vermez.
     key: tavan sayacının anahtarı (verilmezse en). Shades'te tavan soru
     başına, yanlışlar ise doğru kelime adına tutulur. */
  var AREAS = {
    b1: ['b1', 'bx', 'bp', 'bc'],
    v:  ['v',  'vx', 'vp', 'vc'],
    vq: ['vq', 'vx', null, null],
    rc: ['rc', null, null, null],
    n:  ['n',  'nx', 'np', 'nc']
  };
  /* Puana sayıldıysa true döner (tavana takılan doğru: false). */
  function answer(area, en, hit, key) {
    var a = AREAS[area], counted = false;
    if (!a) return counted;
    prune();
    edit(null, function (e) {
      var p = e[a[0]] || [0, 0];
      p[hit ? 0 : 1]++;
      e[a[0]] = p;
      if (!hit && a[1] && en) { var m = e[a[1]] || (e[a[1]] = {}); m[en] = (m[en] || 0) + 1; }
      if (hit && a[2]) {
        var k = key || en;
        var c = e[a[3]] || (e[a[3]] = {});
        var n = c[k] || 0;
        if (n < PER_WORD) { e[a[2]] = (e[a[2]] || 0) + 1; counted = true; }
        c[k] = n + 1;
      }
    });
    return counted;
  }

  /* ---- yazılan metinler (ns-write) ----
     Kelime sayısı kaydederken bir kez hesaplanır ve girdide durur:
     puan sonradan sayma kuralı değişse de oynamaz. */
  function countWords(text) {
    var m = String(text || '').match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g);
    return m ? m.length : 0;
  }
  function saveWriting(text, prompt) {
    text = String(text || '').trim();
    var n = countWords(text);
    if (!n) return null;
    WSTORE.refresh();
    var now = Date.now(), id = now + '~' + DEV;
    WDATA[id] = { d: today(), at: now, p: prompt || '', text: text, n: n };
    WSTORE.touch(id).commit();
    edit(null, function () {});   // aktif süre ve "son olay" bugüne işlensin
    return id;
  }
  function deleteWriting(id) {
    WSTORE.refresh();
    if (!WDATA[id]) return;
    delete WDATA[id];
    WSTORE.touch(id).commit();
  }
  function writings() {
    return Object.keys(WDATA).map(function (id) { var w = WDATA[id]; return { id: id, d: w.d, at: w.at, p: w.p, text: w.text, n: w.n || 0 }; })
      .sort(function (a, b) { return b.at - a.at; });
  }

  /* ---- Articles: makale çalışıldı ----
     ar:{başlık:kelime} bugünün girdisine yazılır; aynı makale günde bir kez
     sayılır (cihazlar arasında da: okurken başlık bazında birleşir). Başka
     bir gün yeniden çalışılırsa o gün yine puan alır. on=false bugünkü
     işareti geri alır. */
  function articleDone(title, n, on) {
    if (on) { edit(null, function (e) { setAdd(e, 'ar', title, n); }); return; }
    // geri alma: başka cihazda işaretlenmişse onun bugünkü girdisinden de
    STORE.refresh();
    var pre = today() + '~', ids = [];
    Object.keys(DATA).forEach(function (id) {
      if (id.indexOf(pre) === 0 && setHas(DATA[id], 'ar', title)) { setDel(DATA[id], 'ar', title); ids.push(id); }
    });
    if (ids.length) STORE.touch(ids).commit();
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

  /* ---- Review / Sentences'ta bekleyen iş ----
     Review sayfası data.js'ten çıkmış kelimeleri göstermiyor; aynı süzgeç
     burada da olmalı, yoksa bitirilemeyecek bir iş "bekliyor" görünür.
     WORDS (data.js) ve NSJourney olmayan sayfada bilinemez: null. */
  var known = null;
  function isKnown(en) {
    if (!known) { known = {}; WORDS.forEach(function (w) { known[w.en] = 1; }); }
    return known[en];
  }
  function liveReview(on) {
    var J = window.NSJourney;
    if (!J || typeof WORDS === 'undefined') return null;
    return [J.cardsDue(on).filter(isKnown).length, J.sentencesDue(on).filter(isKnown).length];
  }
  function liveSentences() {
    var J = window.NSJourney;
    if (!J || typeof WORDS === 'undefined' || !J.sentenceWords) return null;
    return J.sentenceWords().filter(isKnown).length;
  }

  /* Hiç açılmayan günler: o günlerde ne beklediği, ilk açılışta bugünkü
     takvimden çıkarılır — arada iş yapılmadığı için tarihler değişmedi.
     Zaman damgası 0: o gün başka bir cihazda gerçekten görülen durum
     senkronla gelirse o kazanır. En çok 60 gün geriye. */
  function backfill(sent) {
    var t = today(), seen = {}, last = null;
    Object.keys(DATA).forEach(function (id) {
      var d = id.split('~')[0];
      seen[d] = 1;
      if (d < t && (!last || d > last)) last = d;
    });
    if (!last) return;
    var from = addDays(t, -60);
    for (var d = addDays(last, 1), i = 0; d < t && i < 60; d = addDays(d, 1), i++) {
      if (seen[d] || d < from) continue;
      var rv = liveReview(d);
      edit(d, function (e) { e.rv = [rv[0], rv[1], 0]; if (sent != null) e.sq = [sent, 0]; }, true);
    }
  }

  function noteReview() {
    var live = liveReview(), sent = liveSentences();
    if (!live) return;
    backfill(sent);
    var cur = DATA[today() + '~' + DEV] || {};
    var sameRv = cur.rv && cur.rv[0] === live[0] && cur.rv[1] === live[1];
    var sameSq = sent == null || (cur.sq && cur.sq[0] === sent);
    if (sameRv && sameSq) return;
    edit(null, function (e) {
      if (!sameRv) e.rv = [live[0], live[1], Date.now()];
      if (!sameSq) e.sq = [sent, Date.now()];
    }, true);
  }
  window.addEventListener('load', noteReview);
  window.addEventListener('ns-state-changed', noteReview);

  /* ---- okuma: bir günün bütün cihazlardaki girdileri toplanır ---- */
  function day(date) {
    var out = { b1: [0, 0], v: [0, 0], vq: [0, 0], rc: [0, 0], n: [0, 0], bp: 0, vp: 0, np: 0, bx: {}, vx: {}, nx: {}, toS: {}, out: {}, learn: {}, fall: {}, rs: {}, t: 0, rv: null, sq: null, wr: 0, wrN: 0, ar: {}, arW: 0 };
    var pre = date + '~';
    Object.keys(DATA).forEach(function (id) {
      if (id.indexOf(pre) !== 0) return;
      var e = DATA[id];
      ['b1', 'v', 'vq', 'rc', 'n'].forEach(function (k) { if (e[k]) { out[k][0] += e[k][0] || 0; out[k][1] += e[k][1] || 0; } });
      /* bp/vp'siz girdi tavan kuralından önce yazıldı: her doğrusu sayılır */
      out.bp += e.bp != null ? e.bp : (e.b1 ? e.b1[0] : 0);
      out.vp += e.vp != null ? e.vp : (e.v ? e.v[0] : 0);
      out.np += e.np || 0;
      ['bx', 'vx', 'nx'].forEach(function (k) { if (e[k]) Object.keys(e[k]).forEach(function (en) { out[k][en] = (out[k][en] || 0) + e[k][en]; }); });
      ['toS', 'out', 'learn', 'fall', 'rs', 'ar'].forEach(function (k) { if (e[k]) Object.keys(e[k]).forEach(function (en) { out[k][en] = e[k][en]; }); });
      out.t += e.t || 0;
      if (e.rv && (!out.rv || e.rv[2] > out.rv[2])) out.rv = e.rv;   // en son görülen durum
      if (e.sq && (!out.sq || e.sq[1] > out.sq[1])) out.sq = e.sq;
    });
    Object.keys(WDATA).forEach(function (id) {
      var w = WDATA[id];
      if (w.d === date) { out.wr += w.n || 0; out.wrN++; }
    });
    Object.keys(out.ar).forEach(function (k) { out.arW += out.ar[k] || 0; });
    return out;
  }
  function active(d) {
    return d.b1[0] + d.b1[1] + d.v[0] + d.v[1] + d.vq[0] + d.vq[1] + d.rc[0] + d.rc[1] + d.n[0] + d.n[1] + d.wrN > 0 ||
      ['toS', 'out', 'learn', 'fall', 'rs', 'ar'].some(function (k) { return size(d[k]) > 0; });
  }
  function firstDay() {
    var min = null;
    Object.keys(DATA).forEach(function (id) { var d = id.split('~')[0]; if (!min || d < min) min = d; });
    Object.keys(WDATA).forEach(function (id) { var d = WDATA[id].d; if (d && (!min || d < min)) min = d; });
    return min;
  }

  /* ---- puan: borçsuz temel hesap ----
     reviewRaw: o günün Review bölmesi — bütün Review işi puan olarak
       (yapılan + kalan, hepsi doğru bilinse alınacak puan), eksi
       kaçırılan kartların kaybı. Kayıp (doğru puanı + ceza) Default
       bölmesine geçer; böylece Review bitince bölmesi hep dolar.
     sentRaw: Sentences bölmesi — yalnızca zorunlu kısım (sentNeed x puan).
       İlk sentNeed kelime onu doldurur, fazlası Default'a sayılır.
     sCarry: önceki günlerden taşınan zorunlu kelime (sentMap'ten; verilmezse 0).
       Parametre olarak gelir ki taşıma döngüsü base'i kendi değeriyle
       çağırabilsin, döngüsel bağımlılık olmasın. */
  function base(date, sCarry) {
    var d = day(date);
    var adv = 0, shortcut = 0;
    Object.keys(d.learn).forEach(function (en) { if (d.learn[en] === 'new') shortcut++; else adv++; });
    var parts = {
      b1: d.bp * POINTS.b1,
      v: d.vp * POINTS.v + d.v[1] * POINTS.vMiss,
      toS: size(d.toS) * POINTS.toS,
      learn: adv * POINTS.learn + shortcut * POINTS.shortcut,
      rc: d.rc[0] * POINTS.rc + d.rc[1] * POINTS.rcMiss,
      rs: size(d.rs) * POINTS.rs,
      n: d.np * POINTS.n,
      wr: d.wr * POINTS.wr,
      ar: d.arW * POINTS.ar
    };
    /* flash = Default bölmesine düşen pratik: flashcard'lar + Shades + Articles */
    var flash = parts.b1 + parts.v + parts.toS + parts.n + parts.wr + parts.ar;
    var sent = parts.learn;
    var review = parts.rc + parts.rs;

    var left = (date === today() && liveReview()) || (d.rv ? [d.rv[0], d.rv[1]] : null);
    var reviewDone = left ? left[0] + left[1] === 0 : null;
    var reviewLoss = d.rc[1] * (POINTS.rc - POINTS.rcMiss);
    var reviewRaw = (d.rc[0] + d.rc[1] + (left ? left[0] : 0)) * POINTS.rc +
                    (size(d.rs) + (left ? left[1] : 0)) * POINTS.rs - reviewLoss;

    var sq = date === today() && liveSentences() != null ? liveSentences() : (d.sq ? d.sq[0] : null);
    var sentPool = sq == null ? null : adv + sq;
    var goal = sentGoal(date);
    var sentNeed = sentPool != null && sentPool > goal ? Math.min(goal + (sCarry || 0), sentPool) : 0;
    var sentRaw = sentNeed * POINTS.learn;
    var sentIn = Math.min(adv, sentNeed) * POINTS.learn;   // Sentences bölmesine düşen
    var sentExtra = sent - sentIn;                          // fazlası Default'a

    return {
      date: date, day: d, parts: parts,
      flash: flash, sent: sent, review: review,
      def: flash + sentExtra, sentIn: sentIn, sentExtra: sentExtra,
      left: left, reviewDone: reviewDone, reviewRaw: reviewRaw, reviewLoss: reviewLoss,
      sentAdv: adv, sentShortcut: shortcut, sentNeed: sentNeed, sentPool: sentPool, sentOk: adv >= sentNeed, sentRaw: sentRaw,
      sentGoal: goal,
      sentCarry: sentNeed > goal ? sentNeed - goal : 0   // zorunluluğa fiilen eklenen taşınan kelime
    };
  }

  /* ---- borç ----
     Her gün: Review dışı hedef = GOAL - o günün Review işi. Açığın yarısı
     ertesi güne eklenir; hedefi aşan Review dışı puan önce borçtan düşer.
     Aynı döngüde Sentences'a taşınan kelime de tutulur (sent): o günün
     SENT_GOAL'e göre eksiğinin yarısı (yukarı yuvarlanır) eklenir, fazlası
     düşülür; zorunluluk yoksa sıfırlanır, sq kaydı yoksa olduğu gibi kalır.
     Sonuç ns-day ve ns-write değişmedikçe önbellekte. */
  var debtCache = { raw: null, t: null, map: null, sent: null };
  function carries() {
    var raw = null;
    try { raw = localStorage.getItem(KEY) + '|' + localStorage.getItem(WKEY); } catch (e) {}
    var t = today();
    if (debtCache.map && debtCache.raw === raw && debtCache.t === t) return debtCache;
    var map = {}, sent = {}, debt = 0, carry = 0, first = firstDay();
    if (!first) { debtCache = { raw: raw, t: t, map: map, sent: sent }; return debtCache; }   // hiç kayıt yok: borç da yok
    var d = first > DEBT_START ? first : DEBT_START;
    for (var i = 0; d <= t && i < 3650; d = addDays(d, 1), i++) {
      map[d] = r1(debt);
      // 20'li günlerden kalan taşınan 5'li güne aynı oranda küçülerek geçer
      if (i && sentGoal(d) !== sentGoal(addDays(d, -1))) carry = Math.ceil(carry * sentGoal(d) / sentGoal(addDays(d, -1)));
      sent[d] = carry;
      if (d === t) break;
      var b = base(d, carry);
      var nonReview = Math.max(0, GOAL - Math.min(GOAL, b.reviewRaw));
      var earned = b.flash + b.sent;
      var shortBy = Math.max(0, nonReview - earned);
      var surplus = Math.max(0, earned - nonReview);
      debt = Math.min(DEBT_CAP, Math.max(0, debt - surplus) + shortBy / 2);
      if (b.sentPool == null) continue;                      // havuz bilinmiyor: taşınan değişmez
      if (b.sentPool <= b.sentGoal) { carry = 0; continue; }  // zorunluluk yok: sıfırlanır
      var sShort = Math.max(0, b.sentGoal - b.sentAdv);
      var sSurplus = Math.max(0, b.sentAdv - b.sentGoal);
      carry = Math.min(sentCap(d), Math.max(0, carry - sSurplus) + Math.ceil(sShort / 2));
    }
    debtCache = { raw: raw, t: t, map: map, sent: sent };
    return debtCache;
  }
  function debtMap() { return carries().map; }
  function sentMap() { return carries().sent; }

  /* ---- puan: günün tamamı ----
     Hedef = GOAL + borç + Sentences'a taşınan kelimelerin puanı (taşınan
     kelime başına POINTS.learn). Taşınan cümleler hedefe ayrıca eklenir ki
     Default'un payını yemesin.
     Bölme payları hedefe sığdırılır: önce Review, sonra
     Sentences (zorunlu kısım), kalanı Default — flashcard'lar, zorunlunun
     üstündeki cümleler ve Review'da kaçırılanların kaybı oradan kapanır. */
  function score(date) {
    var b = base(date, date >= DEBT_START ? (sentMap()[date] || 0) : 0);
    var debt = date >= DEBT_START ? (debtMap()[date] || 0) : 0;
    var carried = r1(debt + b.sentCarry * POINTS.learn);   // GOAL'ün üstüne binen toplam
    var target = GOAL + carried;
    var reviewSlot = r1(Math.max(0, Math.min(target, b.reviewRaw)));
    var sentSlot = r1(Math.min(target - reviewSlot, b.sentRaw));
    var defSlot = r1(target - reviewSlot - sentSlot);
    var total = r1(b.flash + b.sent + b.review);
    ['flash', 'sent', 'review', 'def', 'sentIn', 'sentExtra', 'reviewLoss'].forEach(function (k) { b[k] = r1(b[k]); });
    b.debt = debt; b.carried = carried; b.target = r1(target); b.total = total;
    b.defSlot = defSlot; b.sentSlot = sentSlot; b.reviewSlot = reviewSlot;
    b.success = total >= b.target && b.reviewDone === true && b.sentOk;
    return b;
  }

  /* Seri: bugünden geriye başarılı günler. Bugün henüz başarılı değilse
     kaçırılmış sayılmaz. Arka arkaya STREAK_GRACE günden fazla kaçırınca biter. */
  function streak() {
    var t = today(), first = firstDay(), n = 0, miss = 0;
    if (!first) return 0;
    var d = score(t).success ? t : addDays(t, -1);
    for (var i = 0; d >= first && i < 3650; d = addDays(d, -1), i++) {
      if (score(d).success) { n++; miss = 0; }
      else if (++miss > STREAK_GRACE) break;
    }
    return n;
  }

  /* ---- ortak gösterim: puan çubuğu (ana sayfa kartı + today.html) ----
     Tek çubuk, üç bölme: Default · Sentences · Review. Bölme genişliği
     payı gösterir, her bölme kendi payına göre dolar. Payı olmayan
     Sentences ve Review bölmeleri de dar ama görünür kalır.
     Stiller lab.css'te (.dscore). */
  var MIN_W = 12;   // %: Sentences / Review bölmesinin en dar hâli
  function plural(n, one) { return n + ' ' + one + (n === 1 ? '' : 's'); }
  function fill(got, slot, emptyFull) { return slot > 0 ? Math.max(0, Math.min(1, got / slot)) : (emptyFull ? 1 : 0); }
  function scoreHTML(s) {
    var isToday = s.date === today();
    var miss = [];
    if (s.reviewDone === false) miss.push('Review');
    if (!s.sentOk) miss.push('Sentences');
    var badge = s.success ? 'Success'
      : s.total >= s.target && miss.length ? miss.join(' + ') + ' left'
      : r1(s.target - s.total) + ' to go';

    var rw = Math.max(MIN_W, s.reviewSlot / s.target * 100);
    var sw = Math.max(MIN_W, s.sentSlot / s.target * 100);
    var pw = Math.max(0, 100 - rw - sw);

    /* Review durumu */
    var rv, rvCls;
    if (s.reviewDone === true) { rvCls = 'ok'; rv = s.reviewSlot ? 'done' : 'nothing due'; }
    else if (s.reviewDone === false) {
      rvCls = 'todo';
      var bits = [];
      if (s.left[0]) bits.push(plural(s.left[0], 'card'));
      if (s.left[1]) bits.push(plural(s.left[1], 'sentence'));
      rv = isToday ? bits.join(' + ') + ' left' : 'not finished';
    } else { rvCls = 'unk'; rv = 'not recorded'; }

    /* Sentences durumu */
    var st, stCls;
    if (s.sentNeed) {
      stCls = s.sentOk ? 'ok' : 'todo';
      st = s.sentOk ? 'done' : isToday ? (s.sentNeed - s.sentAdv) + ' more' : 'not reached';
    } else { stCls = 'ok'; st = 'none required'; }
    /* Sentences kelime cinsinden gösterilir (puan değil): zorunlu
       kısma sayılan ilerletme / zorunluluk; taşınan varsa ayrıca yazılır. */
    var sentGot = Math.min(s.sentAdv, s.sentNeed);
    var sentCarry = s.sentCarry ? s.sentGoal + ' + ' + s.sentCarry + ' carried over' : '';

    var head = '<b>' + s.total + '</b> / ' + s.target + ' points' +
      (s.carried ? ' <span class="dscore-debt">' + GOAL + ' + ' + s.carried + ' carried over</span>' : '');

    return '<div class="dscore' + (s.success ? ' is-success' : '') + '">' +
      '<div class="dscore-top">' +
        '<span class="dscore-num">' + head + '</span>' +
        '<span class="dscore-badge">' + badge + '</span>' +
      '</div>' +
      '<div class="dscore-bar" role="img" aria-label="Default ' + s.def + ' of ' + s.defSlot +
        ', Sentences ' + (s.sentNeed ? sentGot + ' of ' + s.sentNeed + ' words' + (sentCarry ? ', ' + sentCarry : '') + ' (' + st + ')' : st) + ', Review ' + s.review + ' of ' + s.reviewSlot + ' (' + rv + ')">' +
        '<span class="dscore-seg p" style="flex-grow:' + pw + '"><i style="width:' + fill(s.def, s.defSlot, true) * 100 + '%"></i></span>' +
        '<span class="dscore-seg s ' + stCls + '" style="flex-grow:' + sw + '"><i style="width:' + fill(s.sentIn, s.sentSlot, s.sentOk) * 100 + '%"></i></span>' +
        '<span class="dscore-seg r ' + rvCls + '" style="flex-grow:' + rw + '"><i style="width:' + fill(s.review, s.reviewSlot, s.reviewDone !== false) * 100 + '%"></i></span>' +
      '</div>' +
      '<div class="dscore-legend">' +
        '<span><i class="sw p"></i>' + s.def + ' / ' + s.defSlot + '</span>' +   /* Default: adsız, yalnızca sayı */
        '<span><i class="sw s"></i>Sentences ' + (s.sentNeed ? sentGot + ' / ' + s.sentNeed + ' · ' : '') +
          '<b class="dscore-rv ' + stCls + '">' + st + '</b>' +
          (sentCarry ? '<span class="dscore-debt">' + sentCarry + '</span>' : '') + '</span>' +
        '<span><i class="sw r"></i>Review ' + (s.reviewSlot ? s.review + ' / ' + s.reviewSlot + ' · ' : '') +
          '<b class="dscore-rv ' + rvCls + '">' + rv + '</b></span>' +
      '</div>' +
    '</div>';
  }

  window.NSDay = {
    KEY: KEY, GOAL: GOAL, POINTS: POINTS, PER_WORD: PER_WORD, SENT_GOAL: SENT_GOAL, STREAK_GRACE: STREAK_GRACE, DEBT_CAP: DEBT_CAP, SENT_CARRY_CAP: SENT_CARRY_CAP,
    today: today, addDays: addDays, r1: r1,
    answer: answer, stage: stage, sentencePractised: sentencePractised, noteReview: noteReview,
    countWords: countWords, saveWriting: saveWriting, deleteWriting: deleteWriting, writings: writings, articleDone: articleDone,
    day: day, active: active, firstDay: firstDay,
    score: score, streak: streak, scoreHTML: scoreHTML
  };
})();
