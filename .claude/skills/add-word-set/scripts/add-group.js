#!/usr/bin/env node
/* ============================================================
   data.js'e yeni bir kelime grubu ekler.

   Kullanım:
     node .claude/skills/add-word-set/scripts/add-group.js <payload.json> [--dry]

   payload.json biçimi:
     [ { en, tr, type, uk, us, note, detail, ex, exTr, ex2, exTr2,
         hint?, extra?, similar?, opposite?, coll, ce: [...] }, ... ]

   - grp numarası otomatik: mevcut en yüksek grup + 1 (--grp N ile zorlanabilir)
   - ce = COLL_EX örnek cümleleri; coll parça sayısıyla birebir aynı olmalı
   - Zaten var olan `en` kayıtları atlanır (LOOKUP'ı bozmamak için)
   - Yazmadan önce data.js.bak yedeği alınır
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../../..');
const DATA = path.join(ROOT, 'data.js');

const argv = process.argv.slice(2);
const payloadPath = argv.find(a => !a.startsWith('--'));
const DRY = argv.includes('--dry');
const grpArg = argv.find(a => a.startsWith('--grp='));

if (!payloadPath) {
  console.error('kullanım: add-group.js <payload.json> [--dry] [--grp=N]');
  process.exit(2);
}

const TYPES = ['kelime', 'sıfat', 'kalıp', 'deyim', 'phrasal fiil', 'cümle'];
const REQUIRED = ['en','tr','type','uk','us','note','detail','ex','exTr','ex2','exTr2','coll'];
const ORDER = ['en','tr','type','uk','us','note','detail','ex','exTr','ex2','exTr2','hint','extra','similar','opposite','coll'];

const src = fs.readFileSync(DATA, 'utf8');
const cur = eval(src + '; ({WORDS, COLL_EX});');   // data.js düz veri; tarayıcıdaki yükleme sırasını taklit eder
const have = new Set(cur.WORDS.map(w => w.en.toLowerCase()));
const maxGrp = Math.max.apply(null, cur.WORDS.map(w => w.grp || 0));
const GRP = grpArg ? Number(grpArg.split('=')[1]) : maxGrp + 1;

let payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));
if (!Array.isArray(payload)) { console.error('payload bir dizi olmalı'); process.exit(2); }

/* ---- zaten var olanları ayıkla ---- */
const skipped = payload.filter(w => have.has(String(w.en).toLowerCase())).map(w => w.en);
payload = payload.filter(w => !have.has(String(w.en).toLowerCase()));
if (!payload.length) { console.error('eklenecek yeni kayıt yok'); process.exit(1); }

/* ---- doğrulama ---- */
const errs = [];
const seen = new Set();
payload.forEach(w => {
  const id = w.en || '(en yok)';
  REQUIRED.forEach(k => { if (!w[k]) errs.push(`MISSING ${k}: ${id}`); });
  if (w.type && TYPES.indexOf(w.type) < 0) errs.push(`BAD type "${w.type}": ${id} (geçerli: ${TYPES.join(', ')})`);
  if (seen.has(w.en)) errs.push(`payload içinde tekrar: ${id}`);
  seen.add(w.en);
  if (cur.COLL_EX[w.en]) errs.push(`COLL_EX zaten var: ${id}`);
  const chips = String(w.coll || '').split(' · ').map(s => s.trim()).filter(Boolean);
  const ce = w.ce || [];
  if (chips.length !== ce.length) errs.push(`COLL/ce sayısı uyuşmuyor: ${id} chips=${chips.length} ce=${ce.length}`);
  chips.forEach(c => { if (/(^|\s)I(\s|$)/.test(c)) errs.push(`coll içinde tek başına büyük "I": ${id} → "${c}" (arayüz onu küçültüp vurgular)`); });
  if (String(w.en).indexOf('`') >= 0) errs.push(`en içinde backtick: ${id}`);
});
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }

/* ---- serialize (dosyadaki backtick biçemiyle) ---- */
const bt = s => '`' + String(s).replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${') + '`';
const entries = payload.map(w => {
  const parts = ORDER.filter(k => w[k] != null && w[k] !== '').map(k => k + ':' + bt(w[k]));
  parts.push('grp:' + GRP);
  return '{' + parts.join(', ') + '}';
}).join(',  ');
const collLines = payload.map(w =>
  '  ' + JSON.stringify(w.en) + ': [' + w.ce.map(s => JSON.stringify(s)).join(', ') + ']'
).join(',\n');

/* ---- splice ---- */
let out = src;
const wordsEnd = out.lastIndexOf('}];');          // WORDS dizisinin kapanışı (tek satır)
if (wordsEnd < 0) { console.error('WORDS kapanışı (}];) bulunamadı'); process.exit(1); }
out = out.slice(0, wordsEnd) + '},  ' + entries + '];' + out.slice(wordsEnd + 3);

const collEnd = out.lastIndexOf('\n};');          // COLL_EX kapanışı
if (collEnd < 0) { console.error('COLL_EX kapanışı (\\n};) bulunamadı'); process.exit(1); }
out = out.slice(0, collEnd) + ',\n' + collLines + out.slice(collEnd);

/* ---- yazdıktan sonraki hâli doğrula ---- */
let after;
try { after = eval(out + '; ({WORDS, WORD_GROUPS, COLL_EX});'); }
catch (e) { console.error('sonuç parse edilemedi: ' + e.message); process.exit(1); }

const post = [];
if (after.WORDS.length !== cur.WORDS.length + payload.length) post.push('kelime sayısı beklenmedik: ' + after.WORDS.length);
if (!after.WORDS.every((w, i) => w._i === i)) post.push('_i indeksleri bozuk');
const ens = after.WORDS.map(w => w.en);
if (new Set(ens).size !== ens.length) post.push('yinelenen en alanı var');
after.WORDS.forEach(w => {
  const chips = String(w.coll || '').split(' · ').map(s => s.trim()).filter(Boolean);
  const ce = after.COLL_EX[w.en] || [];
  if (chips.length !== ce.length) post.push(`COLL_EX uyuşmazlığı: ${w.en} (${chips.length}/${ce.length})`);
});
Object.keys(after.COLL_EX).forEach(k => { if (ens.indexOf(k) < 0) post.push('sahipsiz COLL_EX anahtarı: ' + k); });
if (post.length) { console.error(post.join('\n')); process.exit(1); }

if (DRY) {
  console.log(`[dry] grup ${GRP}: ${payload.length} kayıt eklenebilir · toplam ${after.WORDS.length}`);
  if (skipped.length) console.log('[dry] atlanan (zaten var): ' + skipped.join(', '));
  process.exit(0);
}

fs.writeFileSync(DATA + '.bak', src);
fs.writeFileSync(DATA, out);
console.log(`grup ${GRP}: ${payload.length} kayıt eklendi · toplam ${after.WORDS.length} kelime`);
console.log('gruplar: ' + after.WORD_GROUPS.map(g => 'g' + g.id + '=' + g.count).join(' '));
if (skipped.length) console.log('atlanan (zaten var): ' + skipped.join(', '));
console.log('yedek: data.js.bak');
