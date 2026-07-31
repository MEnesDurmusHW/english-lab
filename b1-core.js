/* ============================================================
   B1 Recall — izole flashcard mantığı
   Bağımlılık: b1-data.js  (B1, B1_PACKS, B1_POS)
   Depolama: yalnızca ns-b1-*  ·  lab-core.js ve ns-vocab-* ile
   hiçbir ortak durumu yoktur.

   Kart yönü varsayılan olarak TR → EN: Türkçe görünür, kullanıcı
   İngilizcesini kendi kendine tahmin eder, sonra kartı çevirir.
   ============================================================ */
'use strict';

/* ============ ETİKETLER ============ */
const B1_STATUS_LABEL = { known: 'Biliyorum', shaky: 'Sağlam değil', weak: 'Zayıf' };
const B1_POS_LABEL = { noun: 'Noun', verb: 'Verb', adjective: 'Adjective', adverb: 'Adverb' };
const B1_KNOWN_AT = 2;          // net (bildim - bilemedim) >= 2  ->  Biliyorum

/* ============ İSTATİSTİK (bildim / bilemedim) ============
   ns-b1-stats = { "manage": [bildim, bilemedim], ... }
   Net puan durumu, oran ise "doğru olma skoru"nu verir. */
const B1_STATS_KEY = 'ns-b1-stats';
let B1_STATS = {};
try { B1_STATS = JSON.parse(localStorage.getItem(B1_STATS_KEY)) || {}; } catch (e) { B1_STATS = {}; }
function b1SaveStats() { try { localStorage.setItem(B1_STATS_KEY, JSON.stringify(B1_STATS)); } catch (e) {} }

function b1Pair(en) { const p = B1_STATS[en]; return Array.isArray(p) ? p : [0, 0]; }
function b1Hits(en) { return b1Pair(en)[0]; }
function b1Misses(en) { return b1Pair(en)[1]; }
function b1Tries(en) { const p = b1Pair(en); return p[0] + p[1]; }
function b1Net(en) { const p = b1Pair(en); return p[0] - p[1]; }
function b1StatusOf(en) { const n = b1Net(en); if (n >= B1_KNOWN_AT) return 'known'; if (n < 0) return 'weak'; return 'shaky'; }
/* doğru olma oranı: hiç denenmediyse null */
function b1Acc(en) { const t = b1Tries(en); return t ? b1Hits(en) / t : null; }
function b1AccText(en) { const a = b1Acc(en); return a === null ? 'denenmedi' : Math.round(a * 100) + '%'; }
function b1AddResult(en, hit) {
  const p = b1Pair(en).slice();
  p[hit ? 0 : 1]++;
  B1_STATS[en] = p;
  b1SaveStats();
}
function b1ResetWord(en) { delete B1_STATS[en]; b1SaveStats(); }

/* ============ ÖĞRENDİM (rotasyondan çıkar) ============ */
const B1_HIDE_KEY = 'ns-b1-hidden';
let B1_HIDDEN = {};
try { B1_HIDDEN = JSON.parse(localStorage.getItem(B1_HIDE_KEY)) || {}; } catch (e) { B1_HIDDEN = {}; }
function b1SaveHidden() { try { localStorage.setItem(B1_HIDE_KEY, JSON.stringify(B1_HIDDEN)); } catch (e) {} }
function b1IsHidden(en) { return !!B1_HIDDEN[en]; }
function b1ToggleHidden(en) { if (B1_HIDDEN[en]) delete B1_HIDDEN[en]; else B1_HIDDEN[en] = 1; b1SaveHidden(); }

/* ============ İŞARETLİLER ============ */
const B1_FLAG_KEY = 'ns-b1-flag';
let B1_FLAGS = {};
try { B1_FLAGS = JSON.parse(localStorage.getItem(B1_FLAG_KEY)) || {}; } catch (e) { B1_FLAGS = {}; }
function b1SaveFlags() { try { localStorage.setItem(B1_FLAG_KEY, JSON.stringify(B1_FLAGS)); } catch (e) {} }
function b1IsFlagged(en) { return !!B1_FLAGS[en]; }
function b1ToggleFlag(en) { if (B1_FLAGS[en]) delete B1_FLAGS[en]; else B1_FLAGS[en] = 1; b1SaveFlags(); }

/* ============ FİLTRE ============
   Dört bağımsız faset: paket · tür · durum · kaydedilenler.
   Faset boşsa o boyutta kısıt yoktur; faset içi VEYA, fasetler arası VE.

   ÖNEMLİ: kaydedilen paket seçimi, o an var olan paket listesiyle birlikte
   saklanır (kp). Sonradan yeni paket eklenirse otomatik olarak seçime girer;
   böylece yeni kelimeler asla sessizce gizlenmez. */
const B1_FILTER_KEY = 'ns-b1-filter';
let b1SelPacks = [], b1SelPos = [], b1SelStatus = [], b1SelSaved = [];
(function b1LoadFilter() {
  let f = {};
  try { f = JSON.parse(localStorage.getItem(B1_FILTER_KEY)) || {}; } catch (e) {}
  if (Array.isArray(f.p)) b1SelPacks = f.p.slice();
  if (Array.isArray(f.t)) b1SelPos = f.t.slice();
  if (Array.isArray(f.s)) b1SelStatus = f.s.slice();
  if (Array.isArray(f.v)) b1SelSaved = f.v.slice();

  const allPacks = B1_PACKS.map(p => p.id);
  if (b1SelPacks.length) {
    const known = Array.isArray(f.kp) ? f.kp : [];
    const fresh = allPacks.filter(id => known.indexOf(id) < 0);   // filtre kaydedildikten sonra eklenenler
    b1SelPacks = b1SelPacks.concat(fresh);
  }
  b1SelPacks = b1SelPacks.filter(id => allPacks.indexOf(id) >= 0);
  b1SelPos = b1SelPos.filter(id => B1_POS.some(p => p.id === id));
})();
function b1SaveFilter() {
  try {
    localStorage.setItem(B1_FILTER_KEY, JSON.stringify({
      p: b1SelPacks, t: b1SelPos, s: b1SelStatus, v: b1SelSaved,
      kp: B1_PACKS.map(p => p.id)
    }));
  } catch (e) {}
}
function b1FilterCount() { return b1SelPacks.length + b1SelPos.length + b1SelStatus.length + b1SelSaved.length; }
function b1FilterSig() { return JSON.stringify([b1SelPacks, b1SelPos, b1SelStatus, b1SelSaved]); }
function b1ClearFilter() { b1SelPacks = []; b1SelPos = []; b1SelStatus = []; b1SelSaved = []; b1SaveFilter(); }

function b1Matches(w) {
  if (b1SelPacks.length && b1SelPacks.indexOf(w.pack) < 0) return false;
  if (b1SelPos.length && b1SelPos.indexOf(w.pos) < 0) return false;
  const learned = b1IsHidden(w.en);
  if (b1SelSaved.indexOf('learned') >= 0) { if (!learned) return false; }   // yalnızca öğrenilenler
  else if (learned) return false;                                          // öğrenilenler normalde gizli
  if (b1SelSaved.indexOf('flagged') >= 0 && !b1IsFlagged(w.en)) return false;
  if (b1SelStatus.length && b1SelStatus.indexOf(b1StatusOf(w.en)) < 0) return false;
  return true;
}
function b1Active() { return B1.filter(b1Matches); }

/* ============ YARDIMCILAR ============ */
function b1Shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}
function b1Escape(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function b1ReEscape(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
/* ayrım notu kartın ÖN yüzünde gösterilir; içinde başlık kelimesi geçiyorsa
   cevabı ele vermesin diye maskelenir */
function b1MaskHead(text, en) {
  if (!text) return '';
  return b1Escape(text).replace(new RegExp('\\b' + b1ReEscape(en) + '[a-z]*', 'gi'),
    '<span class="masked" title="gizlendi">·····</span>');
}

/* ============ FİLTRE PANELİ ============ */
const B1_FILTER_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M7 12h10M10 18h4"/></svg>';
function b1FltArr(kind) {
  return kind === 'p' ? b1SelPacks : kind === 't' ? b1SelPos : kind === 's' ? b1SelStatus : b1SelSaved;
}
function b1FltChip(kind, val, label) {
  const on = b1FltArr(kind).indexOf(val) >= 0;
  return '<button type="button" class="flt-chip' + (on ? ' on' : '') + '" data-k="' + kind + '" data-v="' + val +
    '" aria-pressed="' + (on ? 'true' : 'false') + '">' + label + '</button>';
}
function b1MountFilter(host, onChange) {
  host.innerHTML =
    '<div class="filter-wrap">' +
      '<button type="button" class="filter-btn" id="b1FltBtn" aria-haspopup="dialog" aria-expanded="false" aria-label="Filtrele">' +
        B1_FILTER_ICON + '<span class="flt-badge" id="b1FltBadge" hidden></span>' +
      '</button>' +
      '<div class="filter-panel" id="b1FltPanel" role="dialog" aria-label="Filtre" hidden></div>' +
    '</div>';
  const btn = host.querySelector('#b1FltBtn'), panel = host.querySelector('#b1FltPanel'), badge = host.querySelector('#b1FltBadge');

  function updateBadge() {
    const n = b1FilterCount();
    badge.hidden = !n;
    badge.textContent = n || '';
  }
  function paint() {
    let h = '';
    h += '<div class="flt-sec"><div class="flt-lbl">Paketler</div><div class="flt-chips">' +
      B1_PACKS.map(p => b1FltChip('p', p.id, 'Paket ' + p.id + ' <i>' + p.count + '</i>')).join('') +
      '</div></div>';
    if (B1_POS.length > 1) {
      h += '<div class="flt-sec"><div class="flt-lbl">Kelime türü</div><div class="flt-chips">' +
        B1_POS.map(p => b1FltChip('t', p.id, (B1_POS_LABEL[p.id] || p.id) + ' <i>' + p.count + '</i>')).join('') +
        '</div></div>';
    }
    h += '<div class="flt-sec"><div class="flt-lbl">Durum</div><div class="flt-chips">' +
      ['known', 'shaky', 'weak'].map(s => b1FltChip('s', s, B1_STATUS_LABEL[s])).join('') +
      '</div></div>';
    h += '<div class="flt-sec"><div class="flt-lbl">Kaydedilenler</div><div class="flt-chips">' +
      b1FltChip('v', 'flagged', 'İşaretlediklerim') + b1FltChip('v', 'learned', 'Öğrendiklerim') +
      '</div></div>';
    h += '<div class="flt-foot"><button type="button" class="flt-clear" id="b1FltClear">Filtreyi temizle</button>' +
      '<span class="flt-count" id="b1FltCount"></span></div>';
    panel.innerHTML = h;
    panel.querySelector('#b1FltCount').textContent = b1Active().length + ' kelime eşleşiyor';
    updateBadge();
  }
  /* mobilde panel alt sayfa olarak açılır; arkasına karartma koyulur */
  function backdrop(on) {
    const bd = document.getElementById('backdrop');
    if (!bd) return;
    if (window.matchMedia('(max-width:600px)').matches) bd.hidden = !on;
    else if (!on) bd.hidden = true;
  }
  function open() { paint(); panel.hidden = false; btn.setAttribute('aria-expanded', 'true'); backdrop(true); }
  function close() {
    const wasOpen = !panel.hidden;
    panel.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    /* karartma sayfadaki diğer alt sayfalarla ortak — yalnızca biz açtıysak kapat.
       Aksi halde belge düzeyindeki "dışına tıkla" dinleyicisi, panel kapalıyken bile
       başka bir alt sayfanın karartmasını siliyor. */
    if (wasOpen) backdrop(false);
  }

  btn.addEventListener('click', e => { e.stopPropagation(); panel.hidden ? open() : close(); });
  panel.addEventListener('click', e => {
    e.stopPropagation();
    if (e.target.closest('#b1FltClear')) { b1ClearFilter(); paint(); onChange(); return; }
    const chip = e.target.closest('.flt-chip');
    if (!chip) return;
    const kind = chip.dataset.k;
    let val = chip.dataset.v;
    if (kind === 'p') val = +val;
    const arr = b1FltArr(kind);
    const at = arr.indexOf(val);
    if (at >= 0) arr.splice(at, 1); else arr.push(val);
    b1SaveFilter();
    paint();            // panel açık kalsın
    onChange();
  });
  document.addEventListener('click', e => { if (!e.target.closest('.filter-wrap')) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  updateBadge();
  return { refresh: paint, close: close };
}
