#!/usr/bin/env node
/* Review Deck — doğrulanmış yamayı Firestore'a yazar.

   Kullanım:
     node scripts/apply.js /tmp/review-patch.json           -> prova (yazmaz)
     node scripts/apply.js /tmp/review-patch.json --write   -> yazar

   Güvenlik kuralları:
   - Önce belgenin tamamı yedeklenir.
   - Transaction içinde çalışır; araya giren bir yazma olursa baştan döner.
   - merge:true ile YALNIZCA blob['ns-review'] yazılır; diğer anahtarlara
     (ns-vocab-*, ns-b1-*, ns-review-stats) dokunulmaz.
   - `at` ve tekrar geçmişi korunur; yalnızca tr/note/pos/ipa/src güncellenir.
   - Destede olmayan kelime EKLENMEZ. Deste kullanıcının; ekleme sayfadan
     yapılır, bu betik yalnızca var olanı doldurur/uyumlar.
   - updatedAt monoton artırılır, yoksa istemci (cloudTs > localTs şartı)
     değişikliği hiç çekmez. */
'use strict';

const fs = require('fs');
const path = require('path');
const REPO = path.resolve(__dirname, '../../../..');

const args = process.argv.slice(2);
const PATCH = args[0];
const WRITE = args.includes('--write');
if (!PATCH) { console.error('Kullanım: apply.js <patch.json> [--write]'); process.exit(2); }

/* Denetimi burada da koş: verify.js'i ayrı çalıştırıp çıktısına bakmadan
   apply'a geçmek kolay bir hata ve sonucu veri kaybı (bir kez boş IPA
   yazıp kaydın okunuşunu sildim). Artık geçmeyen yama yazılamıyor;
   uyarılar engellemez, yalnızca hatalar engeller. */
const { execFileSync } = require('child_process');
try {
  const v = execFileSync(process.execPath,
    [path.join(__dirname, 'verify.js'), PATCH].concat(args.slice(1).filter(a => a !== '--write')),
    { encoding: 'utf8' });
  const warn = v.split('\n').filter(l => l.trim().startsWith('~'));
  if (warn.length) console.log('denetim uyarıları (' + warn.length + '):\n' + warn.join('\n'));
} catch (e) {
  console.error('DENETİM GEÇMEDİ — yazma iptal:\n' + (e.stdout || e.message));
  process.exit(1);
}

const patch = JSON.parse(fs.readFileSync(PATCH, 'utf8'));
const byKey = {};
patch.forEach(r => byKey[String(r.en).trim().toLowerCase()] = r);

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
initializeApp({ credential: cert(require(path.join(REPO, 'fb-key.json'))) });
const db = getFirestore();

/* data.js/b1-data.js'te varsa kaynak etiketi ona göre düzelir */
function loadArray(file, name) {
  const src = fs.readFileSync(path.join(REPO, file), 'utf8');
  const start = src.indexOf('const ' + name + ' = [');
  let i = src.indexOf('[', start), depth = 0, end = -1;
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (!depth) { end = j + 1; break; } }
  }
  return eval(src.slice(i, end));
}
const inVocab = {}, inB1 = {};
loadArray('data.js', 'WORDS').forEach(w => inVocab[w.en.toLowerCase()] = 1);
loadArray('b1-data.js', 'B1').forEach(w => inB1[w.en.toLowerCase()] = 1);

(async () => {
  const snap = await db.collection('users').get();
  const owners = [];
  snap.forEach(doc => { const b = (doc.data() || {}).blob || {}; if (b['ns-review']) owners.push(doc); });
  if (owners.length !== 1) { console.error('Tam olarak bir ns-review sahibi bekleniyordu, bulunan: ' + owners.length); process.exit(1); }
  const uid = owners[0].id;
  const ref = db.collection('users').doc(uid);

  if (WRITE) {
    const stamp = String(owners[0].data().updatedAt || 'x');
    const bak = '/tmp/review-backup-' + stamp + '.json';
    fs.writeFileSync(bak, JSON.stringify(owners[0].data(), null, 1));
    console.log('yedek: ' + bak);
  }

  const res = await db.runTransaction(async tx => {
    const s = await tx.get(ref);
    const data = s.data() || {};
    const review = JSON.parse((data.blob || {})['ns-review'] || '{}');

    let updated = 0; const notInDeck = [], unchanged = [];
    Object.keys(byKey).forEach(k => {
      const cur = review[k];
      if (!cur) { notInDeck.push(k); return; }
      const r = byKey[k];
      const src = inVocab[k] ? 'vocab' : inB1[k] ? 'b1' : (cur.src || 'custom');
      const next = Object.assign({}, cur, {
        tr: String(r.tr), note: String(r.note),
        pos: String(r.pos), ipa: String(r.ipa || ''), src: src
      });
      if (JSON.stringify(next) === JSON.stringify(cur)) { unchanged.push(k); return; }
      review[k] = next; updated++;
    });

    const gap = Object.values(review).filter(x =>
      !String(x.tr || '').trim() || !String(x.note || '').trim()).length;
    const out = { total: Object.keys(review).length, updated, notInDeck, unchanged: unchanged.length, gap };
    if (!WRITE) return out;

    const ts = Math.max(Date.now(), (data.updatedAt || 0) + 1);
    tx.set(ref, { blob: { 'ns-review': JSON.stringify(review) }, updatedAt: ts }, { merge: true });
    out.ts = ts;
    return out;
  });

  console.log(WRITE ? '\n--- YAZILDI ---' : '\n--- PROVA (yazılmadı) ---');
  console.log('uid            : ' + uid);
  console.log('destedeki kayıt: ' + res.total);
  console.log('güncellenen    : ' + res.updated + ' · zaten aynı: ' + res.unchanged);
  console.log('kalan eksik    : ' + res.gap);
  if (res.notInDeck.length) console.log('DESTEDE YOK (atlandı): ' + res.notInDeck.join(', '));
  if (res.ts) console.log('yeni updatedAt : ' + res.ts + '  ' + new Date(res.ts).toISOString());
  process.exit(0);
})().catch(e => { console.error('HATA:', e.message); process.exit(1); });
