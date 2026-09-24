/* ============================================================
   English Lab — Tekrar Edilecekler (global tekrar listesi)

   Vocabulary ve B1 kendi alanlarında kapalı kutulardır; bu liste ikisinin
   de üstünde durur. Amaç "yeni öğrenmek" değil, öğrenileni unutmamak:
   kelime nereden gelirse gelsin buraya düşer ve buradan tekrar edilir.

   Depolama (NSStore, girdi bazlı birleşir — çakışan sekme/cihaz güvenli):
     ns-review        { "abandon": {en,tr,note,pos,ipa,src,at}, ... }
     ns-review-stats  { "abandon": [bildim, bilemedim], ... }

   Anahtar HER ZAMAN küçük harfli İngilizce kelimedir; aynı kelime iki
   kaynaktan gelse bile tek kayıt olur.

   HAZIRLIK KAPISI: bir kayıt ancak hem Türkçe karşılığı hem de ayırt
   edici açıklaması varsa çalışılabilir. Eksik olanlar "gap" listesinde
   toplanır; kullanıcı o listeyi sohbete verip doldurtur.

   store.js'ten SONRA, defer'siz yüklenmeli (gövdede NSStore.map çağırır).
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'ns-review';
  var STATS_KEY = 'ns-review-stats';

  var DATA = {};
  var STATS = {};
  var STORE = NSStore.map(KEY, DATA);
  var STATS_STORE = NSStore.map(STATS_KEY, STATS);

  function norm(en) { return String(en || '').trim().toLowerCase(); }
  function clean(s) { return String(s == null ? '' : s).trim(); }
  function filled(s) { return clean(s).length > 0; }

  /* ---- okuma ---- */
  function has(en) { return !!DATA[norm(en)]; }
  function get(en) { return DATA[norm(en)] || null; }
  function count() { return Object.keys(DATA).length; }

  /* Kayıt sırası kullanıcının eklediği sıra değil, alfabetik: liste
     büyüdükçe aranan kelimeyi göz taramayla bulmak kolay olsun. */
  function all() {
    return Object.keys(DATA).sort().map(function (k) { return DATA[k]; });
  }

  /* ---- hazırlık ---- */
  /* Hangi alanlar eksik? Boş dizi dönerse kayıt çalışmaya hazırdır. */
  function missingOf(it) {
    if (!it) return ['tr', 'note'];
    var m = [];
    if (!filled(it.tr)) m.push('tr');
    if (!filled(it.note)) m.push('note');
    return m;
  }
  function isReady(it) { return missingOf(it).length === 0; }
  function ready() { return all().filter(isReady); }
  function gaps() { return all().filter(function (it) { return !isReady(it); }); }

  /* ---- yazma ---- */
  /* Var olan kaydın üstüne yazarken dolu alanı boşla EZMEZ: kullanıcı
     elle bir açıklama girdiyse, kelimeyi başka bir kaynaktan tekrar
     eklemek onu silmemeli. */
  function add(entry) {
    var en = norm(entry && entry.en);
    if (!en) return null;
    var old = DATA[en] || {};
    var next = {
      en: en,
      tr: filled(entry.tr) ? clean(entry.tr) : clean(old.tr),
      note: filled(entry.note) ? clean(entry.note) : clean(old.note),
      pos: filled(entry.pos) ? clean(entry.pos) : clean(old.pos),
      ipa: filled(entry.ipa) ? clean(entry.ipa) : clean(old.ipa),
      src: clean(old.src) || clean(entry.src) || 'custom',
      at: old.at || (entry.at || nowStamp())
    };
    DATA[en] = next;
    STORE.touch(en).commit();
    return next;
  }

  /* Tek alan güncelle (satır içi düzenleme). Boş string geçerlidir —
     kullanıcı bilerek silebilmeli. */
  function set(en, patch) {
    var k = norm(en);
    var it = DATA[k];
    if (!it) return null;
    var next = {};
    Object.keys(it).forEach(function (f) { next[f] = it[f]; });
    Object.keys(patch).forEach(function (f) { next[f] = clean(patch[f]); });
    next.en = k;
    next.at = it.at;
    DATA[k] = next;
    STORE.touch(k).commit();
    return next;
  }

  function remove(en) {
    var k = norm(en);
    if (!DATA[k]) return false;
    delete DATA[k];
    STORE.touch(k).commit();
    /* İstatistik de gitsin: kelime listeden çıktıysa geçmişi anlamsız. */
    if (STATS[k]) { delete STATS[k]; STATS_STORE.touch(k).commit(); }
    return true;
  }

  /* Listede varsa çıkarır, yoksa ekler. Eklendiyse true döner. */
  function toggle(entry) {
    var k = norm(entry && entry.en);
    if (!k) return false;
    if (DATA[k]) { remove(k); return false; }
    add(entry);
    return true;
  }

  /* ---- istatistik ---- */
  /* B1 ile aynı dört durumlu model: dördü birbirini dışlar ve birlikte
     listenin tamamını kapsar. Denenmemiş kelime "sallantıda" değildir. */
  var KNOWN_AT = 2;
  var STATUS_ORDER = ['known', 'shaky', 'weak', 'fresh'];
  var STATUS_LABEL = {
    known: 'Known',
    shaky: 'Shaky',
    weak:  'Weak',
    fresh: 'Untried'
  };

  function pair(en) { var p = STATS[norm(en)]; return Array.isArray(p) ? p : [0, 0]; }
  function hits(en) { return pair(en)[0]; }
  function misses(en) { return pair(en)[1]; }
  function tries(en) { var p = pair(en); return p[0] + p[1]; }
  function net(en) { var p = pair(en); return p[0] - p[1]; }
  function statusOf(en) {
    if (!tries(en)) return 'fresh';
    var n = net(en);
    if (n >= KNOWN_AT) return 'known';
    if (n < 0) return 'weak';
    return 'shaky';
  }
  function accText(en) {
    var t = tries(en);
    return t ? Math.round(hits(en) / t * 100) + '%' : 'denenmedi';
  }
  function addResult(en, hit) {
    var k = norm(en);
    var p = pair(k).slice();
    p[hit ? 0 : 1]++;
    STATS[k] = p;
    STATS_STORE.touch(k).commit();
  }
  function resetWord(en) {
    var k = norm(en);
    if (!STATS[k]) return;
    delete STATS[k];
    STATS_STORE.touch(k).commit();
  }

  /* Çalışılacaklar: hazır olup da oturmamışlar. Denenmemişler burada
     yok — onlar "çalışılacak" değil, henüz sınanmamış. */
  function toStudy() {
    return ready().filter(function (it) {
      var s = statusOf(it.en);
      return s === 'weak' || s === 'shaky';
    });
  }

  function summary() {
    var a = all(), r = 0;
    a.forEach(function (it) { if (isReady(it)) r++; });
    return { total: a.length, ready: r, gap: a.length - r, study: toStudy().length };
  }

  /* ---- kaynaktan kayda çevirme ----
     Ayırt edici açıklama uydurulmaz. Kaynakta gerçekten ayrım anlatan
     bir alan yoksa note boş bırakılır ki kayıt gap listesine düşsün;
     genel bir tanımı buraya koymak eksikliği gizlerdi. */
  function fromVocab(w) {
    var note = '';
    if (w.hint) note = w.hint;
    else if (w.similar) {
      var m = String(w.similar).split(/\.\s*Fark:\s*/);
      if (m.length > 1) note = m[1];
    }
    return {
      en: w.en, tr: w.tr, note: stripTags(note),
      pos: w.type || '', ipa: w.uk || w.us || '', src: 'vocab'
    };
  }
  function fromB1(w) {
    return {
      en: w.en, tr: w.tr, note: w.note || '',
      pos: w.pos || '', ipa: w.ipa || w.ipaUs || '', src: 'b1'
    };
  }
  function stripTags(s) { return String(s || '').replace(/<[^>]*>/g, '').trim(); }

  /* Date.now() doğrudan: sıralama için değil, yalnızca "ne zaman
     eklendi" bilgisi. Sıralama alfabetik. */
  function nowStamp() { try { return Date.now(); } catch (e) { return 0; } }

  /* ---- sohbete verilecek eksik dökümü ---- */
  function gapReport() {
    var g = gaps();
    if (!g.length) return '';
    var lines = g.map(function (it) {
      var m = missingOf(it);
      var want = m.map(function (f) {
        return f === 'tr' ? 'Türkçe karşılık' : 'ayırt edici açıklama';
      }).join(' + ');
      var got = filled(it.tr) ? ' (mevcut TR: ' + it.tr + ')' : '';
      return '- ' + it.en + ' -> eksik: ' + want + got;
    });
    return 'Tekrar listemde şu kelimelerin alanları eksik. Her biri için ' +
      'Türkçe karşılığı ve kelimeyi yakın anlamlılarından ayıran kısa bir ' +
      'açıklamayı doldurur musun?\n\n' + lines.join('\n');
  }

  /* Notun içinde başlık kelimesi geçiyorsa kart ön yüzünde cevabı ele
     vermesin diye maskelenir — B1 ile aynı davranış. */
  function maskHead(text, en) {
    if (!text) return '';
    var esc = escapeHTML(text);
    var re = new RegExp('\\b' + String(en).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[a-z]*', 'gi');
    return esc.replace(re, '<span class="masked" title="gizlendi">·····</span>');
  }
  function escapeHTML(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  window.NSReview = {
    KEY: KEY, STATS_KEY: STATS_KEY,
    data: DATA, stats: STATS,
    has: has, get: get, count: count, all: all,
    add: add, set: set, remove: remove, toggle: toggle,
    missingOf: missingOf, isReady: isReady, ready: ready, gaps: gaps,
    toStudy: toStudy, summary: summary, gapReport: gapReport,
    STATUS_ORDER: STATUS_ORDER, STATUS_LABEL: STATUS_LABEL,
    statusOf: statusOf, tries: tries, hits: hits, misses: misses, net: net,
    accText: accText, addResult: addResult, resetWord: resetWord,
    fromVocab: fromVocab, fromB1: fromB1,
    maskHead: maskHead, escapeHTML: escapeHTML
  };
})();
