#!/usr/bin/env node
/* Review Deck — önerilen yamayı Firestore'a yazmadan önce denetler.

   Kullanım: node scripts/verify.js /tmp/review-patch.json [--work /tmp/review-work.json]

   Yama biçimi: [{ en, tr, note, pos, ipa }, ...]

   Buradaki kuralların çoğu gözle yakalanmaz; en sinsisi maskeleme tuzağı:
   kart ön yüzünde açıklamanın içinde geçen başlık kelimesi "·····" ile
   gizlenir, dolayısıyla açıklamada başlık kelimesini kullanmak ipucunu
   yok eder. */
'use strict';

const fs = require('fs');
const args = process.argv.slice(2);
const PATCH = args[0];
const WORK = (i => i >= 0 ? args[i + 1] : '/tmp/review-work.json')(args.indexOf('--work'));

if (!PATCH) { console.error('Kullanım: verify.js <patch.json> [--work <work.json>]'); process.exit(2); }

const POS_OK = ['noun', 'verb', 'adjective', 'adverb', 'phrasal verb', 'idiom', 'phrase'];
const STOP = ['with', 'down', 'into', 'some', 'that', 'this', 'from', 'over', 'your', 'someone',
  'something', 'about', 'back', 'away', 'been', 'have', 'take', 'come', 'what', 'when', 'will'];
const SINGLE_POS = ['noun', 'verb', 'adjective', 'adverb'];
const MULTI_POS = ['phrasal verb', 'idiom', 'phrase'];

const patch = JSON.parse(fs.readFileSync(PATCH, 'utf8'));
const work = fs.existsSync(WORK) ? JSON.parse(fs.readFileSync(WORK, 'utf8')) : null;
const srcOf = {};
if (work) work.targets.forEach(t => srcOf[t.key] = t);

const reEsc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const errs = [], warns = [];
const seen = new Set();

if (!Array.isArray(patch)) { console.error('Yama bir dizi olmalı.'); process.exit(1); }

patch.forEach((r, i) => {
  const at = '[' + i + '] ' + (r && r.en ? r.en : '?');
  if (!r || typeof r !== 'object') { errs.push(at + ': nesne değil'); return; }
  ['en', 'tr', 'note', 'pos'].forEach(f => {
    if (!String(r[f] || '').trim()) errs.push(at + ': ' + f + ' boş');
  });
  const key = String(r.en || '').trim().toLowerCase();
  if (seen.has(key)) errs.push(at + ': aynı kelime yamada iki kez');
  seen.add(key);

  /* maskeleme tuzağı — uygulamanın kendi regex'iyle birebir aynı */
  if (r.note && r.en) {
    const re = new RegExp('\\b' + reEsc(r.en) + '[a-z]*', 'i');
    if (re.test(r.note)) errs.push(at + ': açıklamada başlık kelimesi geçiyor (kartta maskelenir)');
    /* çok kelimeli başlıkta uygulama yalnızca tam ifadeyi gizler; tek tek
       kelimeler açıkta kalır ve cevabı ele verebilir. İşlev sözcükleri
       ("with", "down", "into"…) İngilizce cümlede zaten kaçınılmaz ve
       tek başlarına cevabı ele vermez — onları eleyip gerçek sızıntıyı
       (içerik sözcüğünü) görünür bırakıyoruz. */
    if (/\s/.test(r.en)) {
      String(r.en).split(/\s+/).filter(t => t.length >= 4 && STOP.indexOf(t.toLowerCase()) < 0).forEach(tok => {
        const rt = new RegExp('\\b' + reEsc(tok) + '[a-z]*', 'i');
        if (rt.test(r.note)) warns.push(at + ': açıklamada "' + tok + '" geçiyor (maskelenmez, cevabı sızdırabilir)');
      });
    }
  }

  if (String(r.note || '').indexOf('|') >= 0) errs.push(at + ': açıklamada | var (liste ayracı)');
  const len = String(r.note || '').length;
  if (len && (len < 80 || len > 260)) warns.push(at + ': açıklama ' + len + ' karakter (hedef 110-220)');
  if (/[çğıöşüÇĞİÖŞÜ]/.test(String(r.note || ''))) errs.push(at + ': açıklama İngilizce olmalı, Türkçe karakter içeriyor');

  if (POS_OK.indexOf(r.pos) < 0) errs.push(at + ': geçersiz tür "' + r.pos + '"');
  else {
    const multi = /\s/.test(String(r.en).trim());
    if (multi && SINGLE_POS.indexOf(r.pos) >= 0) warns.push(at + ': çok kelimeli ama tür "' + r.pos + '"');
    if (!multi && MULTI_POS.indexOf(r.pos) >= 0) warns.push(at + ': tek kelime ama tür "' + r.pos + '"');
  }

  /* projede karşılığı varsa tr ve ipa oradan BİREBİR gelmeli */
  const t = srcOf[key];
  if (t && t.source) {
    if (String(r.tr) !== String(t.source.tr)) {
      errs.push(at + ': tr ' + t.source.from + ' ile birebir değil\n      yama : ' + r.tr + '\n      kaynak: ' + t.source.tr);
    }
    if (t.source.uk && String(r.ipa || '') !== String(t.source.uk)) {
      errs.push(at + ': ipa ' + t.source.from + ' ile birebir değil (' + r.ipa + ' ≠ ' + t.source.uk + ')');
    }
  }
});

if (work) {
  const missing = work.targets.map(t => t.key).filter(k => !seen.has(k));
  if (missing.length) warns.push('iş dosyasındaki şu kayıtlar yamada yok: ' + missing.join(', '));
}

console.log('yamadaki kayıt: ' + patch.length);
const dist = {}; patch.forEach(r => dist[r.pos] = (dist[r.pos] || 0) + 1);
console.log('tür dağılımı  : ' + JSON.stringify(dist));
if (warns.length) { console.log('\nUYARI (' + warns.length + '):'); warns.forEach(w => console.log('  ~ ' + w)); }
if (errs.length) { console.log('\nHATA (' + errs.length + '):'); errs.forEach(e => console.log('  ✗ ' + e)); process.exit(1); }
console.log('\nTÜM DENETİMLER GEÇTİ' + (warns.length ? ' (uyarılar gözden geçirilmeli)' : ''));
process.exit(0);
