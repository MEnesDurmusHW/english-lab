#!/usr/bin/env node
/* Review Deck — Firestore'daki desteyi çeker, doldurulması/uyumlanması
   gereken kayıtları kaynak malzemesiyle birlikte bir iş dosyasına yazar.

   Kullanım:
     node scripts/fetch.js            -> yalnızca sorunlu kayıtlar
     node scripts/fetch.js --all      -> bütün deste
     node scripts/fetch.js --out X    -> çıktı yolu (varsayılan /tmp/review-work.json)

   "Sorunlu" demek: Türkçe karşılığı ya da ayırt edici açıklaması boş,
   YA DA data.js/b1-data.js'te aynı kelime varken ondan sapmış (tr farklı,
   pos/ipa boş, kaynak etiketi yanlış). İkincisi önemli: düz kelime listesi
   yapıştırıldığında kayıt kaynağından kopuk doğuyor ve sessizce ayrışıyor. */
'use strict';

const fs = require('fs');
const path = require('path');
const REPO = path.resolve(__dirname, '../../../..');

const args = process.argv.slice(2);
const ALL = args.includes('--all');
const OUT = (i => i >= 0 ? args[i + 1] : '/tmp/review-work.json')(args.indexOf('--out'));

/* ---- proje verisi ---- */
function loadArray(file, name) {
  const src = fs.readFileSync(path.join(REPO, file), 'utf8');
  const start = src.indexOf('const ' + name + ' = [');
  if (start < 0) throw new Error(name + ' bulunamadı: ' + file);
  let i = src.indexOf('[', start), depth = 0, end = -1;
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (!depth) { end = j + 1; break; } }
  }
  return eval(src.slice(i, end));
}
const strip = s => String(s || '').replace(/<[^>]*>/g, '').trim();

const WORDS = loadArray('data.js', 'WORDS');
const B1 = loadArray('b1-data.js', 'B1');
const wmap = {}; WORDS.forEach(w => wmap[w.en.toLowerCase()] = w);
const bmap = {}; B1.forEach(w => bmap[w.en.toLowerCase()] = w);

/* data.js'in `type` alanı kategori, sözcük türü değil — isimler de
   "kelime" olarak geçiyor. Gerçek türü buradan çıkaramayız; yalnızca
   sıfat ve phrasal fiil güvenilir. Kalanı modelin kararına bırakıyoruz. */
const TYPE_HINT = {
  'sıfat': 'adjective', 'phrasal fiil': 'phrasal verb',
  'deyim': 'idiom', 'kalıp': 'phrase', 'cümle': 'phrase', 'kelime': null
};

function sourceFor(key) {
  const w = wmap[key];
  if (w) {
    const parts = String(w.similar || '').split(/\.\s*Fark:\s*/);
    return {
      from: 'vocab', tr: w.tr, uk: w.uk || '', us: w.us || '',
      type: w.type, pos_hint: TYPE_HINT[w.type] || null,
      detail: strip(w.detail), hint: strip(w.hint),
      similar_list: parts.length > 1 ? strip(parts[0]) : strip(w.similar),
      similar_fark: parts.length > 1 ? strip(parts[1]) : '',
      opposite: strip(w.opposite), ex: strip(w.ex), exTr: strip(w.exTr)
    };
  }
  const b = bmap[key];
  if (b) {
    return {
      from: 'b1', tr: b.tr, uk: b.ipa || '', us: b.ipaUs || '',
      type: b.pos, pos_hint: b.pos || null,
      detail: '', hint: strip(b.note), similar_list: '', similar_fark: '',
      opposite: '', ex: '', exTr: ''
    };
  }
  return null;
}

/* ---- Firestore ---- */
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
initializeApp({ credential: cert(require(path.join(REPO, 'fb-key.json'))) });
const db = getFirestore();

(async () => {
  const snap = await db.collection('users').get();
  const owners = [];
  snap.forEach(doc => {
    const blob = (doc.data() || {}).blob || {};
    if (blob['ns-review']) owners.push({ id: doc.id, data: doc.data() });
  });
  if (!owners.length) { console.error('Hiçbir kullanıcıda ns-review yok.'); process.exit(1); }
  if (owners.length > 1) {
    console.error('Birden fazla kullanıcıda ns-review var, hangisi belirsiz:');
    owners.forEach(o => console.error('  ' + o.id + '  updatedAt=' + o.data.updatedAt));
    process.exit(1);
  }

  const { id: uid, data } = owners[0];
  const review = JSON.parse(data.blob['ns-review'] || '{}');
  const keys = Object.keys(review).sort();

  const targets = [];
  keys.forEach(k => {
    const cur = review[k];
    const src = sourceFor(k);
    const why = [];
    if (!String(cur.tr || '').trim()) why.push('tr boş');
    if (!String(cur.note || '').trim()) why.push('açıklama boş');
    if (!String(cur.pos || '').trim()) why.push('tür boş');
    if (src) {
      if (String(cur.tr || '').trim() !== String(src.tr || '').trim()) why.push('tr ' + src.from + ' ile uyuşmuyor');
      if (src.uk && String(cur.ipa || '').trim() !== src.uk) why.push('ipa ' + src.from + ' ile uyuşmuyor');
      if (cur.src !== src.from) why.push('kaynak etiketi "' + cur.src + '", "' + src.from + '" olmalı');
    }
    if (!ALL && !why.length) return;
    targets.push({ en: cur.en, key: k, why, current: cur, source: src });
  });

  const out = {
    uid, updatedAt: data.updatedAt,
    total: keys.length, targetCount: targets.length,
    mode: ALL ? 'all' : 'problems-only',
    targets
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  console.log('uid           : ' + uid);
  console.log('destedeki kayıt: ' + keys.length);
  console.log('ele alınacak   : ' + targets.length + (ALL ? ' (tüm deste)' : ' (yalnızca sorunlular)'));
  const withSrc = targets.filter(t => t.source).length;
  console.log('  projede karşılığı olan: ' + withSrc + '  · yalnızca destede: ' + (targets.length - withSrc));
  const reasons = {};
  targets.forEach(t => t.why.forEach(r => { const g = r.replace(/"[^"]*"/g, '…'); reasons[g] = (reasons[g] || 0) + 1; }));
  Object.keys(reasons).sort().forEach(r => console.log('  - ' + r + ': ' + reasons[r]));
  console.log('iş dosyası     : ' + OUT);
  process.exit(0);
})().catch(e => { console.error('HATA:', e.message); process.exit(1); });
