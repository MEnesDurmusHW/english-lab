/* ============================================================
   English Lab — standart flash kart denetleyicisi

   Üç alan da (Vocabulary · B1 · Review Deck) bunu kullanır. Sayfa yalnızca
   veriyi ve gezinmeyi yönetir; kartın iskeleti, çevirme davranışı, puanlama
   düğmeleri ve geri bildirim buradan gelir — böylece akış her yerde aynı.

   Kullanım:
     const fc = NSFlash.mount(hostEl, {
       onRate(hit, card) {},        // Bildim / Bilemedim
       onFlip(flipped, card) {},    // isteğe bağlı
       labels: {...},               // isteğe bağlı metin değişiklikleri
       tappable: true,              // false ise kart tıklanmaz, yalnızca düğme
       docked: false,               // true ise çevir/puanla şeridi ekranın altına sabitlenir
       onPrev() {}, onNext() {}     // isteğe bağlı: verilirse "Cevabı göster"in iki yanında gezinme düğmeleri
     });
     fc.show({ pos, term, ipa, hint, answer, answerIpa, answerHint, badge, idx });
     fc.flip() · fc.reset() · fc.isFlipped()

   show() alanları:
     pos/badge/idx  üst satır ve tür etiketi (boşsa yer korunur, içerik yok)
     term/ipa/hint  SORU yüzü
     answer/answerIpa/answerHint  CEVAP yüzü (verilmezse soru yüzü kopyalanır)
   hint ve answerHint HTML kabul eder (maskeleme <span class="masked"> ile
   gelir); diğer alanlar düz metin olarak kaçışlanır.

   success-fx.js varsa puanlamada successFX()/failFX() çağrılır; yoksa sessizce
   geçer — bileşen ona bağımlı değildir.
   ============================================================ */
(function () {
  'use strict';

  var ICON_EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  var ICON_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  var ICON_PREV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>';
  var ICON_NEXT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>';
  var ICON_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

  var DEFAULTS = {
    reveal: 'Cevabı göster',
    hide: 'Cevabı gizle',
    miss: 'Bilemedim',
    hit: 'Bildim',
    tap: 'çevirmek için dokun',
    kbd: 'Boşluk çevir · N bilemedim · M bildim',
    prev: 'Önceki',
    next: 'Sonraki'
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function mount(host, opts) {
    opts = opts || {};
    var L = {};
    Object.keys(DEFAULTS).forEach(function (k) { L[k] = k; });
    Object.keys(DEFAULTS).forEach(function (k) { L[k] = DEFAULTS[k]; });
    if (opts.labels) Object.keys(opts.labels).forEach(function (k) { L[k] = opts.labels[k]; });

    /* Her iki yüz de aynı iskeleti taşır — hizalama buna dayanıyor. */
    function faceHTML(side) {
      return '<div class="fc-face fc-' + side + '">' +
        '<div class="fc-pos" data-f="pos"></div>' +
        '<div class="fc-termbox"><h2 class="fc-term" data-f="term"></h2></div>' +
        '<p class="fc-ipa" data-f="ipa"></p>' +
        '<div class="fc-hint" data-f="hint"></div>' +
      '</div>';
    }

    host.innerHTML =
      '<div class="fc-stage">' +
        '<article class="fc" tabindex="0" role="button" aria-label="Kartı çevir">' +
          /* rozet (durum/öncelik) sağ üstte, sayaç sağ altta */
          '<div class="fc-meta"><span class="fc-badge"></span></div>' +
          '<div class="fc-faces">' + faceHTML('front') + faceHTML('back') + '</div>' +
          '<div class="fc-foot"><span class="fc-flip-hint">' + esc(L.tap) + '</span><span class="fc-idx"></span></div>' +
        '</article>' +
        '<div class="fc-dock">' +
          ((opts.onPrev || opts.onNext)
            ? '<div class="fc-navrow">' +
                '<button class="fc-nav fc-prev" type="button" aria-label="' + esc(L.prev) + '">' + ICON_PREV + '<span>' + esc(L.prev) + '</span></button>' +
                '<button class="fc-reveal" type="button">' + ICON_EYE + '<span class="fc-reveal-label">' + esc(L.reveal) + '</span></button>' +
                '<button class="fc-nav fc-next" type="button" aria-label="' + esc(L.next) + '"><span>' + esc(L.next) + '</span>' + ICON_NEXT + '</button>' +
              '</div>'
            : '<button class="fc-reveal" type="button">' + ICON_EYE + '<span class="fc-reveal-label">' + esc(L.reveal) + '</span></button>') +
          '<div class="fc-rate">' +
            '<button class="fc-miss" type="button">' + ICON_X + esc(L.miss) + '</button>' +
            '<button class="fc-hit" type="button">' + ICON_OK + esc(L.hit) + '</button>' +
          '</div>' +
          '<p class="fc-kbd">' + esc(L.kbd) + '</p>' +
        '</div>' +
      '</div>';

    if (opts.docked) host.querySelector('.fc-stage').classList.add('is-docked');
    var card = host.querySelector('.fc');
    var badgeEl = host.querySelector('.fc-badge');
    var idxEl = host.querySelector('.fc-idx');
    var revealBtn = host.querySelector('.fc-reveal');
    var revealLabel = host.querySelector('.fc-reveal-label');
    var front = host.querySelector('.fc-front');
    var back = host.querySelector('.fc-back');

    var cur = null, flipped = false;

    function part(face, name) { return face.querySelector('[data-f="' + name + '"]'); }

    /* Terim üç satıra sığmıyorsa punto düşer; eşik karakter sayısına göre,
       çünkü kutu genişliği viewport'a bağlı ve burada ölçülemez. */
    function setTerm(face, text) {
      var el = part(face, 'term');
      el.textContent = String(text == null ? '' : text);
      el.classList.toggle('is-long', el.textContent.length > 72);
    }

    function paint(face, pos, term, ipa, hint) {
      part(face, 'pos').textContent = String(pos == null ? '' : pos);
      setTerm(face, term);
      part(face, 'ipa').textContent = String(ipa == null ? '' : ipa);
      part(face, 'hint').innerHTML = hint == null ? '' : String(hint);
    }

    function setFlipped(on) {
      flipped = !!on;
      card.classList.toggle('is-flipped', flipped);
      revealLabel.textContent = flipped ? L.hide : L.reveal;
      if (opts.onFlip) opts.onFlip(flipped, cur);
    }

    function flip() { setFlipped(!flipped); }

    function rate(hit) {
      if (!cur) return;
      /* Geri bildirim bileşenin işi: üç alanda da aynı ses ve aynı HUD. */
      try {
        if (hit && typeof window.successFX === 'function') window.successFX();
        else if (!hit && typeof window.failFX === 'function') window.failFX();
      } catch (e) {}
      if (opts.onRate) opts.onRate(!!hit, cur);
    }

    if (opts.tappable === false) card.classList.add('is-static');
    else {
      card.addEventListener('click', flip);
      card.addEventListener('keydown', function (e) {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); }
      });
    }
    revealBtn.addEventListener('click', flip);
    if (opts.onPrev) host.querySelector('.fc-prev').addEventListener('click', function () { opts.onPrev(); });
    if (opts.onNext) host.querySelector('.fc-next').addEventListener('click', function () { opts.onNext(); });
    host.querySelector('.fc-miss').addEventListener('click', function () { rate(false); });
    host.querySelector('.fc-hit').addEventListener('click', function () { rate(true); });

    return {
      el: card,
      /* Yeni kart göster. Cevap yüzü verilmezse soru yüzü kopyalanır —
         tek yüzlü kullanım da aynı iskeleti korur. */
      show: function (c) {
        cur = c || {};
        badgeEl.textContent = String(cur.badge == null ? '' : cur.badge);
        badgeEl.className = 'fc-badge' + (cur.badgeClass ? ' ' + cur.badgeClass : '');
        idxEl.textContent = String(cur.idx == null ? '' : cur.idx);
        paint(front, cur.pos, cur.term, cur.ipa, cur.hint);
        paint(back, cur.pos,
          cur.answer === undefined ? cur.term : cur.answer,
          cur.answerIpa === undefined ? cur.ipa : cur.answerIpa,
          cur.answerHint === undefined ? cur.hint : cur.answerHint);
        setFlipped(false);
        return this;
      },
      flip: flip,
      reset: function () { setFlipped(false); return this; },
      isFlipped: function () { return flipped; },
      card: function () { return cur; },
      /* Klavye: sayfanın kendi kısayollarıyla çakışmasın diye bağlamayı
         çağırana bırakıyoruz. Puanlama kart çevrilmeden de çalışır —
         bildiğin kelimede fazladan dokunuş istemiyoruz. */
      handleKey: function (e) {
        if (e.metaKey || e.ctrlKey || e.altKey) return false;
        var k = String(e.key || '').toLowerCase();
        if (e.key === ' ') { flip(); return true; }
        if (k === 'm') { rate(true); return true; }
        if (k === 'n') { rate(false); return true; }
        return false;
      }
    };
  }

  window.NSFlash = { mount: mount };
})();
