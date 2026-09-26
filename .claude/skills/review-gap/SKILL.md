---
name: review-gap
description: Review Deck'teki (Firestore ns-review) eksik ve tutarsız kayıtları doldurur. Kullanıcı düz kelime listesi yapıştırıp sonra "review deck'i düzelt", "gap'i doldur", "eksikleri tamamla", "tekrar listesini düzenle" dediğinde kullan. Firestore'a bağlanır, data.js/b1-data.js'i kaynak alarak Türkçe karşılık, İngilizce ayırt edici açıklama, sözcük türü ve IPA'yı yazar.
---

# Review Deck eksiklerini doldurma

Kullanıcı Review Deck sayfasına düz bir kelime listesi yapıştırır. Bu kayıtlar alanları boş doğar ("Missing") ve kaynaklarıyla bağları yoktur. Sonra sana "düzelt" der. Görev: **Firestore'a bağlanıp eksikleri doldurmak ve kaynağından sapmış kayıtları geri hizalamak.**

Çalışma dizini repo kökü (`fb-key.json` orada, gitignore'lu). `firebase-admin` gerekiyor; kurulu değilse geçici bir dizine kur ve `NODE_PATH` ile çalıştır — **repoya bağımlılık ekleme, `package.json` oluşturma.**

## Akış

### 1. Çek
```
node .claude/skills/review-gap/scripts/fetch.js
```
`/tmp/review-work.json` yazar ve neyin neden ele alınacağını özetler. Tüm desteyi gözden geçirmek için `--all`.

Her hedef şunu taşır: `current` (destedeki hâli) ve `source` (`data.js` ya da `b1-data.js` karşılığı; yoksa `null`).

### 2. Yamayı yaz
`/tmp/review-patch.json` içine bir dizi: `[{ en, tr, note, pos, ipa }, ...]`

Alan kuralları aşağıda. **İş dosyasındaki her hedef için bir kayıt üret.**

### 3. Doğrula
```
node .claude/skills/review-gap/scripts/verify.js /tmp/review-patch.json
```
Hata varsa düzelt ve tekrar çalıştır. **Uyarıları da oku** — özellikle çok kelimeli başlıklarda sızıntı uyarısı gerçek bir kusurdur.

### 4. Prova, sonra yaz
```
node .claude/skills/review-gap/scripts/apply.js /tmp/review-patch.json
node .claude/skills/review-gap/scripts/apply.js /tmp/review-patch.json --write
```
Prova çıktısındaki "güncellenen" ve "DESTEDE YOK" satırlarını kullanıcıya bildir. `--write` önce belgeyi `/tmp/review-backup-*.json` olarak yedekler.

### 5. Raporla
Kaç kayıt dolduruldu, kaçı kaynaktan geldi, kaçında karşılaştırmayı sen seçtin. **Kaynakta ayrım metni olmayan kayıtları ayrıca say** — oradaki ayrımlar projenin öğrettiği değil senin kararın, kullanıcı görmek ister.

## Alan kuralları

### `tr` — Türkçe karşılık
`source` varsa **BİREBİR kopyala**, tek karakter değiştirme. `data.js` bu projenin kaynağıdır; desteyi ona hizalamak bu işin asıl amacı. Parantezli anlam ayrımları (`(bıçak) kör; (konuşma) dobra`) bilerek yazılmıştır, sadeleştirme.

`source` yoksa kısa ve kartın ön yüzünde okunur bir karşılık yaz.

### `note` — ayırt edici açıklama
Kartın ön yüzünde ipucu olarak görünür. Amacı: kullanıcı yalnızca Türkçeyi görürken **doğru İngilizce kelimeyi** hatırlayabilsin.

- **İngilizce yaz.** Kaynaktaki `hint` / `similar_fark` Türkçedir; anlamını çevir, farklı bir ayrım uydurma.
- Öncelik: `source.similar_fark` → `source.hint` → `source.detail` (+`ex`). İlk ikisi projenin öğrettiği ayrımdır, onları koru ve **aynı karşılaştırma kelimelerini** tek tırnak içinde kullan.
- Kaynak yoksa tanımı yaz ve gerçekten yakın bir eşanlamlıyla karşılaştır.
- **Başlık kelimesini kullanma.** Uygulama açıklamada geçen başlığı `·····` ile gizler (`\b<en>[a-z]*`, büyük/küçük harf duyarsız), yani yazarsan ipucu yok olur. "it" / "this word" diye dolan.
- **Çok kelimeli başlıklarda tek tek kelimeler maskelenmez.** `detached house` için `'semi-detached'` yazmak "detached"i açıkta bırakır. `hiccough` için "older spelling of 'hiccup'" demek cevabı verir. `verify.js` bunu uyarır, uyarıyı ciddiye al.
- 110-220 karakter. Karşılaştırmadan önce noktalı virgül:
  `Saying things without softening them; 'frank' is honest too but carries no intent to wound.`
- İngiliz imlası. `|` karakteri kullanma (liste ayracı).

### `pos` — sözcük türü
Küçük harf, şu yediden biri: `noun` `verb` `adjective` `adverb` `phrasal verb` `idiom` `phrase`

**`source.type`'ı olduğu gibi kopyalama** — o kategori, sözcük türü değil: `arsonist`, `blunder`, `burden` hepsi "kelime" olarak geçer. `source.pos_hint` güvenilir olduğunda doludur (sıfat, phrasal fiil, deyim, kalıp); `null` ise türü sen belirle.

- Tek kelime → gerçek tür. Kararsız kalırsan `source.ex` cümlesindeki kullanıma bak: `nod` için örnek "She gave a slight nod" ise `noun`.
- Çok kelimeli → `phrasal verb` / `idiom` / `phrase`. Kaynak kategorisi açıkça yanlışsa düzelt.
- `pseudonym / pen name` gibi eğik çizgili çiftlerde seçeneklerden biri tek kelimeyse tek kelime say.

### `ipa`
`source.uk` varsa birebir kopyala. Yoksa boş bırak — uydurma.

### `src`
Yamada verme; `apply.js` kelimenin `data.js`/`b1-data.js`'te olup olmamasına göre kendisi yazar.

## Dikkat

- **Destede olmayan kelime eklenmez.** Deste kullanıcınındır; ekleme sayfadan yapılır. `apply.js` bunları atlar ve bildirir.
- **`ns-review` dışındaki hiçbir anahtara dokunma.** Tekrar geçmişi (`ns-review-stats`), skorlar ve filtreler ayrı anahtarlarda; `apply.js` merge ile yalnızca desteyi yazar.
- **`updatedAt` monoton artmalı.** İstemci yalnızca `cloudTs > localTs` ise çeker. `apply.js` hallediyor, elle yazma.
- **Kullanıcının cihazında gönderilmemiş değişiklik varsa** yazdığın kayıt yerelde geçersiz kalabilir: `store.js` son push'tan beri dokunulan girdilerde yereli kazandırır. Sayfa açıkken düzeltme yaparsan kullanıcıya sayfayı bir kez yenilemesini söyle.
- İşin sonunda desteyi tekrar okuyup **kalan eksik sayısının 0** olduğunu doğrula.
