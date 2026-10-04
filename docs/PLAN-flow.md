# Öğrenme akışı — plan

Durum: **tamamlandı** · Başlangıç: 2026-10-04

Sitede 8 sayfa eşit ağırlıkta duruyordu. Bu plan onları tek bir akışa
oturtuyor: kelime B1'den girer, Review'dan çıkmaz.

## Kararlar

- **İki alan.**
  - *Flow:* B1 Recall → Vocabulary → Articles → Collocations → Sentences → Review
  - *Library:* Synonym Constellation, Grammar Patterns, Collocations in Use
- **B1 → Vocabulary elle.** Önemli kelimeleri kullanıcı seçer, `add-word-set`
  skill'i grubu kurar. Sitede otomatik bir taşıma yok.
- **Articles kapı değil, takviye.** Article'lar grubun yalnızca zorlanılan
  10–20 kelimesi için yazılıyor. En iyi zaman: flashcard ile cümle aşaması arası.
- **Collocations** cümle yazarken bakılan malzeme; aşama sayılmaz.
- **Review kelime bazlı** ve yalnızca Vocabulary kelimelerini içerir.
  Açıklamaları `data.js`'ten çeker, kendi kopyasını tutmaz.
- **Vocabulary pratiği serbest.** `ns-vocab-score` (−3…+5) olduğu gibi kalır,
  grup grup sıfırlanabilir. Akış sayacı ondan bağımsızdır; sıfırlama ona dokunmaz.
- **Yeni sayfalar İngilizce.** Eski Türkçe arayüz şimdilik kalır.

## Bir kelimenin yolu

```
new ──(farklı 2 günde doğru)──► sentence ──(Learned)──► review
 │                                 ▲                       │
 └──────(Learned: kısa yol)────────┼──────► review (Low)   │
                                   └──(Review kartında üst üste 2 kez bilemedi)
```

1. **new** — Vocabulary'de pratik yapılıyor. Doğru cevap verilen her *yeni gün*
   sayacı 1 artırır; yanlış cevap sayacı sıfırlar. Sayaç 2 olunca kelime
   **sentence** aşamasına geçer ve otomatik olarak Sentences sayfasına (`sentences.html`) düşer.
2. **sentence** — kullanıcı Claude chat'te cümle kurar, sonra **Learned** der.
   Kelime Review'a **Medium** öncelikle girer.
3. **Kısa yol** — kelime hâlâ *new* iken **Learned** denirse cümle aşaması
   atlanır, kelime Review'a **Low** öncelikle girer.
4. **review** — iki ayrı takvim (aşağıda).
5. **Geri düşme** — Review kartında üst üste 2 kez bilemezse kelime Review'dan
   çıkar, "Learned" işareti kalkar, tekrar **sentence** aşamasına döner.
6. **Learned geri alınırsa** (Vocabulary'de işaret kaldırılırsa) kelime
   Review'dan çıkar ve geldiği aşamaya döner: kısa yoldan geldiyse *new*,
   cümle aşamasından geldiyse *sentence* (Sentences listesine geri girer).
7. **Kural:** Sentences listesinde olmak = *sentence* aşamasında olmak.
   Elle listeye eklenen kelime (Vocabulary'deki kalem düğmesi / L) cümle
   aşamasına geçer; listeden çıkarılan kelime *new* olur, sayacı sıfırlanır.

"Learned" = `ns-flow-learned` işareti. Sentences sayfasından (tek tek ya da
toplu) ve Vocabulary'deki ✓ ile verilir; hangisinden basılırsa basılsın aynı
geçiş olur. Collocations'taki eski *Consolidate* düğmesi kaldırıldı: Learned
kararı Sentences adımının işi.

Vocabulary'de her kelimenin yanında akış rozeti durur (*Day 1/2*, *Sentences*,
*Review*). Yalnızca bilgi verir; pratik skoru ("Biliyorum +2") akıştan ayrıdır.

## Review takvimleri

Öncelik (Low / Medium / High) tekrar aralığını belirler. Aralıklar gün cinsinden,
basamak basamak ilerler; son basamakta sabit kalır.

| Öncelik | Kart tekrarı               | Cümle tekrarı                 |
|---------|----------------------------|-------------------------------|
| High    | 1 · 3 · 7 · 14 · 30 · 60   | 3 · 7 · 14 · 30 · 60 · 120    |
| Medium  | 2 · 5 · 12 · 25 · 50 · 100 | 7 · 14 · 30 · 60 · 120 · 240  |
| Low     | 4 · 10 · 25 · 60 · 120 · 240 | 14 · 30 · 60 · 120 · 240 · 365 |

- **Kart:** bildin → bir basamak ileri. Bilemedin → basamak 0, ertesi gün tekrar.
  Üst üste 2 kez bilemezsen geri düşme işler.
- **Cümle:** gün gelince kelime "sentence practice due" listesine düşer.
  **Copy** ile chat'e taşınır, dönüşte **Mark done** ile tarih girilir
  (varsayılan bugün; geçmiş bir gün de seçilebilir). Bir basamak ileri gider.
- Öncelik değişince sonraki tarih, son tekrar tarihine yeni aralık eklenerek
  yeniden hesaplanır.
- Aynı gün birden fazla kelimenin tekrarı geliyorsa High olanlar listenin başında durur.

## Veri

Depolar (NSStore, girdi bazlı birleşir, buluta senkronlanır). Anahtar
`data.js`'teki `en` değeridir.

- `ns-flow` — her kelimenin akıştaki yeri (aşağıda)
- `ns-flow-learned` — Learned işareti (eski `ns-vocab-hidden`'ın yerine)
- `ns-flow-sentence` — "Cümlede çalışacaklarım" (eski `ns-vocab-flag`'in yerine)

```js
"abandon": {
  s: "new" | "sentence" | "review",
  c: 0..2,              // farklı günlerde doğru sayacı (new aşaması)
  d: "2026-10-04",      // sayacın en son arttığı gün
  pri: "low" | "med" | "high",            // review'da
  card: { step, due, last, miss },        // miss: üst üste bilememe
  sent: { step, due, last }
}
```

`review-core.js` ve B1/Vocabulary'deki "Review'a ekle" düğmeleri kaldırıldı.

## Sıfırdan başlangıç (2026-10-04)

Akış öncesi işaretler taşınmadı: bütün kelimeler *new* olarak başlar. Emekli
anahtarlar (`store.js` → `RETIRED`) ne okunur ne senkronlanır, her açılışta
yerelden silinir: `ns-review`, `ns-review-stats`, `ns-journey`,
`ns-journey-adopted`, `ns-vocab-hidden`, `ns-vocab-flag`. Pratik skoru
(`ns-vocab-score`) ve yazılmış cümleler (`ns-vocab-sentences`) yerinde kalır.

## Adımlar

- [x] 1. `journey-core.js`: aşamalar, sayaç, takvimler, geçiş
- [x] 2. `lab-core.js` bağlantıları: `addScore` → sayaç, `toggleHidden` → Learned/geri alma
- [x] 3. Vocabulary & B1: "Review'a ekle" düğmelerini kaldır, `review-core.js` bağımlılığını sil
- [x] 4. `review.html` baştan: Today (kart + cümle), liste, öncelik, kart oturumu
- [x] 5. `index.html`: Flow / Library bölümleri, altta "How the flow works" düğmesi
- [x] 6. `flow.html`: akışı anlatan sayfa (İngilizce)
- [x] 7. `sw.js`: yeni dosyalar, sürüm artışı
- [x] 8. Eski Review verisini temizle (kullanıcı onayıyla) ve `review-gap` skill'ini kaldır
