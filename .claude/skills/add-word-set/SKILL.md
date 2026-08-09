---
name: add-word-set
description: english-lab data.js'e yeni kelime/ifade seti ekler. Kullanıcı düz metin bir kelime listesi yapıştırıp "yeni kelime seti geldi", "bunları ekle", "yeni grup ekle" dediğinde kullan. Her madde için Türkçe karşılık, IPA, köken, açıklama, örnek cümleler, benzer/zıt kelimeler, collocation ve COLL_EX örneklerini üretir; yeni bir grup numarasıyla data.js'e yazar.
---

# Yeni kelime seti ekleme

Kullanıcı satır satır bir kelime/ifade listesi verir. Görev: her maddeyi tam içerikli bir kayda dönüştürüp `data.js` içindeki `WORDS` dizisine **yeni bir grup numarasıyla** eklemek ve `COLL_EX` örnek cümlelerini eşleştirmek.

Arayüz tamamen veriye bağlıdır — grup filtresi `grp` alanından otomatik türer. **HTML/CSS/JS dosyalarına dokunma.**

## Akış

1. **Mevcut durumu oku** (yalnızca bunlar; tüm dosyayı okumaya çalışma, `WORDS` tek satırda ~85 KB):
   ```
   node -e "const {WORDS,WORD_GROUPS}=eval(require('fs').readFileSync('data.js','utf8')+'; ({WORDS,WORD_GROUPS});'); console.log(WORDS.length, JSON.stringify(WORD_GROUPS)); console.log(WORDS.map(w=>w.en).join(', '))"
   ```
   Bu çıktı hem yeni grup numarasını hem de mükerrer kontrolünü verir.

2. **Payload JSON yaz.** `/tmp/word-set.json` içine, listedeki her madde için bir nesne. Zaten `WORDS` içinde olan maddeleri **dahil etme** (script yine atlar ama kullanıcıya bildirmek için baştan tespit et).

3. **Kuru çalıştır, sonra yaz:**
   ```
   node .claude/skills/add-word-set/scripts/add-group.js /tmp/word-set.json --dry
   node .claude/skills/add-word-set/scripts/add-group.js /tmp/word-set.json
   ```
   Script grup numarasını otomatik verir (en yüksek + 1), tüm doğrulamaları yapar, `data.js.bak` yedeği alır ve yazdıktan sonra sonucu yeniden parse ederek kontrol eder. Hata varsa hiçbir şey yazılmaz.

4. **Raporla:** eklenen madde sayısı, grup numarası, atlanan mükerrerler, yeni toplam. Kullanıcı istemedikçe commit etme.

## Kayıt alanları

Zorunlu: `en, tr, type, uk, us, note, detail, ex, exTr, ex2, exTr2, coll` + `ce` (COLL_EX örnekleri).
İsteğe bağlı: `hint, hintCard, extra, similar, opposite`. `grp` ve `_i` elle yazılmaz.

| alan | içerik |
|---|---|
| `en` | başlık ifade, küçük harf. Eşanlamlı biçimler ` / ` ile (`pseudonym / pen name`) |
| `tr` | Türkçe karşılık(lar), virgülle |
| `type` | **yalnızca**: `kelime`, `sıfat`, `kalıp`, `deyim`, `phrasal fiil`, `cümle` |
| `uk` / `us` | IPA, eğik çizgi içinde. Farklıysa gerçekten farklı yaz (`/ˈθʌrə/` vs `/ˈθɜːroʊ/`) |
| `note` | **Köken.** Latince/Eski İngilizce kök, parçalara ayır, imgeyi anlat. Türkçe. |
| `detail` | Türkçe tanım, tek cümle, başlık kelimesini kullanmadan |
| `ex` / `exTr` | doğal İngilizce örnek + Türkçe çevirisi |
| `ex2` / `exTr2` | ikinci örnek, farklı bir kullanımı göstersin |
| `hint` | **yalnızca** gerçek eşanlamlılar arasında hangisinin doğru kelime olduğunu ayırt eden kısa ipucu (bkz. aşağıdaki "hint ve hintCard" bölümü) |
| `extra` | "iyi bilinmesi gereken" ek anlam ya da yakın kalıp |
| `similar` | `a, b, c. Fark: <a> ...; <b> ...; <c> ...` biçimi zorunlu — arayüz `. Fark:` ile ikiye böler |
| `opposite` | zıt kelimeler, virgülle, sonunda nokta |
| `coll` | ` · ` ile ayrılmış 3 collocation |
| `ce` | `coll` parçalarıyla **aynı sırada, aynı sayıda** tam örnek cümle |

## `hint` ve `hintCard`

`hint` iki farklı yerde görünebilir ve bu ikisinin kuralları farklıdır:

1. **Kart üzerinde** (Türkçe → İngilizce yönünde, cevap görünmeden önce) — yalnızca `hintCard:true` de eklenmiş kayıtlarda gösterilir.
2. **Detay panelinde** ("Nüans" satırı, kullanıcı elle açana kadar gizli) — `hintCard` olsun olmasın her zaman gösterilir.

`hintCard:true` **sadece** şu durumda eklenmeli: aynı gruptaki ya da Türkçe karşılığı çakışan gerçek bir eşanlamlısı var ve `hint`, doğru kelimeyi seçmeye yarayan kısa bir ayrım cümlesi (İngilizce, "Emphasis: ..." ya da "A positive/negative word: ..." kalıbında — bkz. `exasperated`, `assertive`). Kart üzerinde göründüğü için **başlık kelimesini asla içermemeli** (bkz. Maskeleme).

Edat, `-ing` zorunluluğu, okunuş/yazım karışması, özne kısıtı gibi kullanım notları `hint`'e yazılabilir ama **`hintCard` eklenmez** — bunlar yalnızca detay panelinde görünsün, kartta görünmesin. Bu tür notlar için `extra` alanı da uygun bir seçenektir.

## Tip seçimi

- tek sözcük → `kelime`; sıfatsa → `sıfat`
- fiil + edat/zarf (`follow up on`, `run out of`, `come to terms with`) → `phrasal fiil`
- mecazi, anlamı parçalarından çıkmayan → `deyim`
- sabit ama şeffaf söz kalıbı (`on the whole`, `when it comes to`, `take into account`) → `kalıp`

## `coll` yazım kuralları

- **BÜYÜK HARFLİ** sözcükler arayüzde vurgu anahtarıdır; küçültülüp kalın gösterilir. Vurgulanması gereken edat/fiil/eşdizim sözcüğünü büyük yaz: `follow up ON a request/lead` , `frustrated WITH sb/sth` , `HIGHLY reliable`.
- Değişkenler küçük: `sb`, `sth`.
- Seçenekleri `/` ile ver: `a reliable SOURCE/witness`.
- **Tek başına büyük `I` yazma** — küçültülüp `i` olarak vurgulanır. `as far as I know` için `as far as sb KNOWS · as far as sb is AWARE · as far as WE know` gibi biçimler kullan. (Script bunu hata olarak yakalar.)

## `ce` (COLL_EX) kuralları

Her `coll` parçası için sırayla bir tam cümle. Cümle o parçanın kalıbını gerçekten içermeli — 3. chip `iron out a few KINKS/wrinkles` ise cümle de "a few kinks to iron out" demeli. Cümleler tam, doğal ve tek başına anlaşılır olmalı.

## Maskeleme

**data.js/vocabulary.html'de otomatik gizleme yoktur** (bu yalnızca izole B1 modülünde, `b1MaskHead` ile var). Yani `note`, `detail`, `hint` içine yazılan her şey elle kontrol edilmeli:
- `detail` ve `note` içinde başlık kelimesini kullanmaktan kaçın — cevabı doğrudan ele verir.
- `hint` içinde başlık kelimesi **kesinlikle** geçmemeli, özellikle `hintCard:true` eklenmişse: bu alan cevap açılmadan ÖNCE kartın üzerinde görünür, kelimeyi (herhangi bir çekimini de) içermesi cevabı doğrudan verir.
- `similar`'ın "Fark:" kısmında başlık kelimesi geçebilir — bu alan yalnızca elle açılan detay panelinde göründüğü için sorun değil.
- `ex`, `ex2`, `coll`, `ce` zaten kelimeyi açıkça göstermesi gereken alanlardır.

## Örnek payload maddesi

```json
{
  "en": "factor in",
  "tr": "hesaba katmak",
  "type": "phrasal fiil",
  "uk": "/ˌfæktər ˈɪn/",
  "us": "/ˌfæktər ˈɪn/",
  "note": "Matematikteki \"factor\" (çarpan, etken) sözcüğünden; bir etkeni hesabın içine dahil etmeyi anlatır.",
  "detail": "Bir hesap yaparken ya da karar verirken bir etkeni de dikkate almak.",
  "ex": "Don't forget to factor in the cost of insurance.",
  "exTr": "Sigorta masrafını hesaba katmayı unutma.",
  "ex2": "We factored in a two-week delay.",
  "exTr2": "İki haftalık bir gecikmeyi de hesaba kattık.",
  "similar": "take into account, allow for, include. Fark: factor in bir hesaba somut/sayısal bir etken eklemektir; take into account daha genel bir dikkate almadır; allow for olası sapmaya pay bırakmaktır.",
  "opposite": "overlook, ignore, leave out.",
  "coll": "factor IN the cost · factor in a DELAY/risk · FORGET to factor sth in",
  "ce": [
    "Remember to factor in the cost of insurance and fuel.",
    "We factored in a two-week delay for customs clearance.",
    "They forgot to factor in the extra staff needed at weekends."
  ]
}
```

## Kalite ölçütü

Mevcut kayıtlar referanstır: köken gerçekten öğretici, `Fark:` açıklamaları eşanlamlıları gerçekten ayırıyor, örnekler kalıp cümle değil. Aynı seviyeyi tut — 30+ maddede tempo düşmesin.
