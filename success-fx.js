/* ============================================================
   English Lab — answer feedback (mark HUD + short sound)
   Self-contained, no dependencies. Loaded on every game page.

   Usage:  successFX()   -> her doğru/başarılı cevapta çağır.
           failFX()      -> her yanlış/bilinemedi cevabında çağır.

   Davranış:
   - Ekran ortasında Apple tarzı yarı saydam + blur'lu, üstünde
     gri bir işaret (doğruda checkmark, yanlışta çarpı) olan küçük
     bir HUD ~0.3s görünür, sonra yumuşakça kaybolur.
     pointer-events:none olduğu için sonraki soruya geçişi hiçbir
     şekilde engellemez / bekletmez.
   - Kısa bir ses çalar (WebAudio, dosya yok): doğruda yukarı çıkan
     parlak bir "trink", yanlışta aşağı inen boğuk bir "thunk".
     Yanlış sesi bilerek daha alçak ve daha yumuşak — burası bir
     çalışma uygulaması, cezalandırıcı bir ton istemiyoruz.
   Ses istenmezse: localStorage['ns-success-sound'] = 'off'.
   ============================================================ */
(function () {
  'use strict';

  var HOLD_MS = 300;   // ekranda tam görünür kaldığı süre (~0.3s)
  var IN_MS   = 110;   // belirme
  var OUT_MS  = 240;   // kaybolma

  /* ---- stil (bir kez enjekte edilir) ---- */
  var css =
    '.sfx-hud{position:fixed;left:50%;top:50%;z-index:2147483000;' +
      'transform:translate(-50%,-50%) scale(.82);opacity:0;' +
      'width:96px;height:96px;border-radius:22px;pointer-events:none;' +
      'display:flex;align-items:center;justify-content:center;' +
      'background:rgba(150,150,150,.16);' +
      '-webkit-backdrop-filter:blur(14px) saturate(1.1);backdrop-filter:blur(14px) saturate(1.1);' +
      'box-shadow:0 8px 30px rgba(0,0,0,.14);' +
      'transition:opacity ' + IN_MS + 'ms ease-out,transform ' + IN_MS + 'ms cubic-bezier(.2,.9,.3,1.3);' +
      'will-change:opacity,transform}' +
    ".sfx-hud[data-show='1']{opacity:1;transform:translate(-50%,-50%) scale(1)}" +
    '.sfx-hud[data-hide="1"]{opacity:0;transform:translate(-50%,-50%) scale(1.04);' +
      'transition:opacity ' + OUT_MS + 'ms ease-in,transform ' + OUT_MS + 'ms ease-in}' +
    '.sfx-hud svg{width:52px;height:52px;display:block}' +
    '.sfx-hud path{fill:none;stroke:#8a8a8f;stroke-width:9;' +
      'stroke-linecap:round;stroke-linejoin:round}' +
    "html[data-theme='dark'] .sfx-hud{background:rgba(120,120,125,.22);" +
      'box-shadow:0 8px 30px rgba(0,0,0,.35)}' +
    "html[data-theme='dark'] .sfx-hud path{stroke:#b9b9c0}" +
    '@media (prefers-reduced-motion:reduce){.sfx-hud{transition-duration:1ms}}';

  var styleInjected = false;
  function injectStyle() {
    if (styleInjected) return;
    styleInjected = true;
    var s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
  }

  /* İki geri bildirim aynı HUD'u kullanır, yalnızca içindeki işaret değişir:
     üst üste iki farklı katman açıp birinin diğerini gölgelemesini istemiyoruz. */
  var MARK_CHECK = '<path d="M17 34 L28 45 L48 20"/>';
  var MARK_CROSS = '<path d="M21 21 L43 43"/><path d="M43 21 L21 43"/>';

  var hud = null, tShow = null, tHide = null, tGone = null;
  function ensureHud() {
    if (hud) return hud;
    hud = document.createElement('div');
    hud.className = 'sfx-hud';
    hud.setAttribute('aria-hidden', 'true');
    document.body.appendChild(hud);
    return hud;
  }

  function showMark(mark) {
    var el = ensureHud();
    el.innerHTML = '<svg viewBox="0 0 64 64" aria-hidden="true">' + mark + '</svg>';
    clearTimeout(tShow); clearTimeout(tHide); clearTimeout(tGone);
    // sıfırla
    el.removeAttribute('data-hide');
    el.removeAttribute('data-show');
    // yeniden akış (transition'ı tetiklemek için)
    // eslint-disable-next-line no-unused-expressions
    void el.offsetWidth;
    tShow = setTimeout(function () { el.setAttribute('data-show', '1'); }, 0);
    tHide = setTimeout(function () {
      el.removeAttribute('data-show');
      el.setAttribute('data-hide', '1');
    }, IN_MS + HOLD_MS);
    tGone = setTimeout(function () {
      el.removeAttribute('data-hide');
    }, IN_MS + HOLD_MS + OUT_MS);
  }

  /* ---- sesler (WebAudio) ----
     İki ses aynı borudan geçer, yalnızca reçete değişir: iki ayrı
     AudioContext açmak mobilde gereksiz yük. Nota: [hz, gecikme, süre, tepe]. */
  var TRINK = {                                  // yukarı çıkan parlak "tri-nk"
    gain: 0.16, type: 'sine',                    // hafif, dikkat dağıtmayan
    notes: [[1318.51, 0, 0.16, 1.0], [1975.53, 0.075, 0.20, 0.85]]   // E6 -> B6
  };
  var THUNK = {                                  // aşağı inen boğuk "thunk"
    gain: 0.12, type: 'triangle',                // başarı sesinden daha alçak
    notes: [[261.63, 0, 0.20, 1.0], [196.00, 0.085, 0.30, 0.9]]      // C4 -> G3
  };

  var actx = null;
  function play(kit) {
    try {
      if (localStorage.getItem('ns-success-sound') === 'off') return;
    } catch (e) { /* localStorage yoksa devam */ }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      if (!actx) actx = new AC();
      if (actx.state === 'suspended') actx.resume();
      var now = actx.currentTime;
      var master = actx.createGain();
      master.gain.value = kit.gain;
      master.connect(actx.destination);
      for (var i = 0; i < kit.notes.length; i++) {
        var n = kit.notes[i];
        tone(n[0], now + n[1], n[2], n[3], master, kit.type);
      }
    } catch (e) { /* ses çalınamazsa sessizce geç */ }
  }

  function tone(freq, start, dur, peak, dest, type) {
    var osc = actx.createOscillator();
    var g = actx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(peak, start + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(g); g.connect(dest);
    osc.start(start);
    osc.stop(start + dur + 0.03);
  }

  /* ---- genel API ---- */
  /* Geri bildirim hiçbir koşulda akışı kesmemeli: HUD çizilemese de
     çağıran taraf hata almasın, kart bir sonrakine geçsin. */
  function fire(mark, kit) {
    try { injectStyle(); showMark(mark); } catch (e) {}
    play(kit);
  }
  window.successFX = function () { fire(MARK_CHECK, TRINK); };
  window.failFX    = function () { fire(MARK_CROSS, THUNK); };
})();
