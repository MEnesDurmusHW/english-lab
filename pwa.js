/* ============================================================
   English Lab — PWA glue

   - registers the service worker
   - offers "Güncelle" when a new version is waiting
   - offers "Ana ekrana ekle" where the browser supports it
   - on iPhone/iPad Safari, shows the manual Share → Add to Home
     Screen hint once (Safari has no install prompt)

   Adds .pwa-standalone on <html> when running as an installed app.
   ============================================================ */
(function () {
  'use strict';

  var HINT_KEY = 'ns-a2hs-hint';
  var standalone = window.matchMedia('(display-mode: standalone)').matches ||
                   window.navigator.standalone === true;
  if (standalone) document.documentElement.classList.add('pwa-standalone');

  /* ---------- shared chrome for the little bottom cards ---------- */
  var styled = false;
  function injectStyles() {
    if (styled) return;
    styled = true;
    var css = document.createElement('style');
    css.textContent =
      '.pwa-toast{position:fixed;left:50%;transform:translateX(-50%) translateY(12px);' +
      'bottom:calc(18px + env(safe-area-inset-bottom));z-index:9999;display:flex;align-items:center;gap:12px;' +
      'box-sizing:border-box;width:min(430px,calc(100vw - 28px));padding:11px 12px 11px 16px;' +
      'background:var(--surface,#fff);color:var(--text,#0F1729);' +
      'border:1px solid var(--border,rgba(15,23,41,.12));border-radius:14px;' +
      'box-shadow:0 12px 34px rgba(15,23,41,.18);font:500 .9rem/1.4 var(--sans,system-ui,-apple-system,"Segoe UI",sans-serif);' +
      'opacity:0;pointer-events:none;transition:opacity .24s ease,transform .24s ease}' +
      '.pwa-toast.show{opacity:1;transform:translateX(-50%) translateY(0);pointer-events:auto}' +
      '.pwa-toast p{margin:0;flex:1;min-width:0}' +
      '.pwa-toast small{display:block;margin-top:2px;font-weight:400;opacity:.7;font-size:.82rem}' +
      '.pwa-toast button{flex:none;font:inherit;font-weight:600;cursor:pointer;border-radius:9px;' +
      'padding:8px 14px;border:0;background:var(--accent,#4F46E5);color:#fff}' +
      '.pwa-toast button:hover{filter:brightness(1.08)}' +
      '.pwa-toast .pwa-x{background:transparent;color:inherit;opacity:.5;padding:8px 6px;font-weight:400;font-size:1.15rem;line-height:1}' +
      '.pwa-toast .pwa-x:hover{opacity:1;filter:none}';
    document.head.appendChild(css);
  }

  /* B1 Recall pins an answer dock to the bottom edge; sit above whatever is
     already parked down there instead of covering it. Takes the topmost of
     every bar touching the bottom, since a dock can be several siblings. */
  function bottomGap() {
    var vh = window.innerHeight, highest = vh;
    var nodes = document.body.getElementsByTagName('*');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var st = getComputedStyle(el);
      if (st.position !== 'fixed' && st.position !== 'sticky') continue;
      if (st.visibility === 'hidden' || st.display === 'none' || st.opacity === '0') continue;
      var box = el.getBoundingClientRect();
      if (box.height < 1 || box.width < 60) continue;
      if (box.height > vh * 0.45) continue;         // a full-screen overlay, not a dock
      if (box.bottom < vh - 16 || box.top >= vh) continue;  // must actually reach the bottom
      if (box.top < highest) highest = box.top;
    }
    return highest >= vh ? 18 : Math.round(vh - highest) + 12;
  }

  function toast(html, actionLabel, onAction, onDismiss) {
    injectStyles();
    // One at a time — they share the same slot, and the newest matters most
    // (an available update outranks the install nudge).
    var open = document.querySelectorAll('.pwa-toast');
    for (var i = 0; i < open.length; i++) open[i].remove();

    var gap = bottomGap();
    var el = document.createElement('div');
    el.className = 'pwa-toast';
    el.style.bottom = 'calc(' + gap + 'px + env(safe-area-inset-bottom))';
    el.setAttribute('role', 'status');
    el.innerHTML = '<p>' + html + '</p>';

    if (actionLabel) {
      var go = document.createElement('button');
      go.type = 'button';
      go.textContent = actionLabel;
      go.addEventListener('click', function () { close(); onAction && onAction(); });
      el.appendChild(go);
    }
    var x = document.createElement('button');
    x.type = 'button';
    x.className = 'pwa-x';
    x.setAttribute('aria-label', 'Kapat');
    x.innerHTML = '&times;';
    x.addEventListener('click', function () { close(); onDismiss && onDismiss(); });
    el.appendChild(x);

    function close() {
      el.classList.remove('show');
      setTimeout(function () { el.remove(); }, 260);
    }

    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('show'); });
    return close;
  }

  /* ---------- service worker ---------- */
  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol === 'file:') return;

    navigator.serviceWorker.register('sw.js', { scope: './' }).then(function (reg) {
      var reloading = false;
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (reloading) return;
        reloading = true;
        location.reload();
      });

      function offerUpdate(worker) {
        toast('Yeni sürüm hazır.<small>Sayfa yenilenip güncellenecek.</small>', 'Güncelle', function () {
          worker.postMessage('SKIP_WAITING');
        });
      }

      // A worker already sitting in "waiting" (update found on an earlier visit).
      if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);

      reg.addEventListener('updatefound', function () {
        var next = reg.installing;
        if (!next) return;
        next.addEventListener('statechange', function () {
          // controller check: on the very first install there is nothing to update from.
          if (next.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(next);
        });
      });

      // Look for a new version when the app comes back to the foreground.
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') reg.update().catch(function () {});
      });
    }).catch(function (e) {
      console.warn('[pwa] service worker registration failed', e);
    });
  }

  /* ---------- install prompt (Chrome, Edge, Samsung, Android) ---------- */
  var deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    if (localStorage.getItem(HINT_KEY) === 'off') return;
    toast(
      'Ana ekrana ekle.<small>Uygulama gibi tam ekran açılır, çevrimdışı da çalışır.</small>',
      'Ekle',
      function () {
        var p = deferredPrompt;
        deferredPrompt = null;
        if (!p) return;
        p.prompt();
        p.userChoice.then(function (choice) {
          if (choice.outcome === 'accepted') localStorage.setItem(HINT_KEY, 'off');
        });
      },
      function () { localStorage.setItem(HINT_KEY, 'off'); }
    );
  });

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    localStorage.setItem(HINT_KEY, 'off');
  });

  /* ---------- iOS: no prompt API, so explain the manual steps once ---------- */
  function maybeIOSHint() {
    if (standalone) return;
    if (localStorage.getItem(HINT_KEY) === 'off') return;

    var ua = navigator.userAgent;
    var iOS = /iPad|iPhone|iPod/.test(ua) ||
              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS
    if (!iOS) return;
    // Chrome/Firefox/Edge on iOS can't add to the home screen; only Safari can.
    if (/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)) return;

    setTimeout(function () {
      toast(
        'Ana ekrana ekle.<small>Paylaş <span aria-hidden="true">&#x2934;</span> &rarr; “Ana Ekrana Ekle” — uygulama gibi açılır.</small>',
        null,
        null,
        function () { localStorage.setItem(HINT_KEY, 'off'); }
      );
    }, 2500);
  }

  function start() {
    registerSW();
    maybeIOSHint();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
