/* ============================================================
   English Lab — service worker

   Bump VERSION whenever a precached file changes. The old caches
   are dropped on activate, so a bump is the whole update story.

   Strategies
     navigations      network first, cached page as the offline fallback
     same-origin GET  stale-while-revalidate (fast, self-healing)
     Google Fonts     cache first (they never change under a given URL)
     everything else  untouched — Firebase auth/Firestore and the
                      analytics beacon must go straight to the network
   ============================================================ */
const VERSION = '2026-08-02a';
const SHELL = `nsel-shell-${VERSION}`;
const RUNTIME = `nsel-runtime-${VERSION}`;
const FONTS = `nsel-fonts-${VERSION}`;
const KEEP = [SHELL, RUNTIME, FONTS];

const PRECACHE = [
  './',
  'index.html',
  'vocabulary.html',
  'collocations.html',
  'articles.html',
  'synonyms.html',
  'grammar.html',
  'book.html',
  'b1.html',
  'progress.html',
  'styles.css',
  'lab.css',
  'b1.css',
  'theme.js',
  'share.js',
  'sync.js',
  'pwa.js',
  'appbar.js',
  'success-fx.js',
  'lab-core.js',
  'b1-core.js',
  'data.js',
  'b1-data.js',
  'favicon.svg',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-192.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png'
];

const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

/* Store under `path` even when hosting redirected us somewhere else.
   Firebase has cleanUrls on, so /b1.html answers 301 -> /b1, and a redirected
   Response cannot be handed to Cache.put as-is. Copy it into a plain one. */
async function cachePut(cache, path, response) {
  if (!response.redirected) return cache.put(path, response.clone());
  const body = await response.clone().blob();
  return cache.put(path, new Response(body, {
    status: 200,
    statusText: 'OK',
    headers: response.headers
  }));
}

/* ---- install: fill the shell cache, one file at a time so a single
        404 can't fail the whole install ---- */
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    await Promise.allSettled(PRECACHE.map(async (path) => {
      const response = await fetch(path, { cache: 'reload', credentials: 'same-origin' });
      if (!response.ok) throw new Error(path + ' -> ' + response.status);
      await cachePut(cache, path, response);
    }));
  })());
});

/* ---- activate: drop caches from older versions ---- */
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    if (self.registration.navigationPreload) {
      await self.registration.navigationPreload.enable().catch(() => {});
    }
    const names = await caches.keys();
    await Promise.all(
      names.filter((n) => n.startsWith('nsel-') && !KEEP.includes(n)).map((n) => caches.delete(n))
    );
    await self.clients.claim();
  })());
});

/* ---- pwa.js asks for this when the user taps "Güncelle" ---- */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

function cacheable(response) {
  return response && response.status === 200 && response.type === 'basic';
}

/* Network first: the page is always fresh online, and still opens offline. */
async function handleNavigation(event) {
  const request = event.request;
  try {
    // A navigation request carries redirect mode "manual", so fetching it
    // directly turns Firebase's cleanUrls 301 (/b1.html -> /b1) into an opaque
    // redirect. Handing one of those back breaks the navigation inside an
    // installed iOS app — the page never paints and Safari's error chrome
    // appears. Refetch by URL so the redirect is followed here instead and the
    // browser only ever sees a real page.
    const preloaded = await event.preloadResponse;
    const response = preloaded && preloaded.type !== 'opaqueredirect'
      ? preloaded
      : await fetch(request.url, { credentials: 'same-origin', redirect: 'follow' });
    if (cacheable(response)) {
      caches.open(RUNTIME).then((c) => cachePut(c, request.url, response)).catch(() => {});
    }
    return response;
  } catch (err) {
    const url = new URL(request.url);
    const hit = await caches.match(request, { ignoreSearch: true });
    if (hit) return hit;
    // Firebase Hosting has cleanUrls on: /vocabulary is served as vocabulary.html
    if (!/\.\w+$/.test(url.pathname) && !url.pathname.endsWith('/')) {
      const asHtml = await caches.match(url.pathname + '.html', { ignoreSearch: true });
      if (asHtml) return asHtml;
    }
    const home = await caches.match('index.html') || await caches.match('./');
    if (home) return home;
    return new Response(
      '<!doctype html><meta charset="utf-8"><title>Offline</title>' +
      '<p style="font:16px system-ui;padding:32px">Bu sayfa henüz çevrimdışı kaydedilmemiş.</p>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

/* Serve from cache immediately, refresh it in the background. */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (cacheable(response)) cachePut(cache, request.url, response).catch(() => {});
      return response;
    })
    .catch(() => null);
  if (hit) return hit;
  const fresh = await network;
  if (fresh) return fresh;
  throw new Error('offline and not cached: ' + request.url);
}

async function handleFont(request) {
  const cache = await caches.open(FONTS);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  // Google Fonts replies are cors/basic; opaque ones are still worth keeping.
  if (response && (response.ok || response.type === 'opaque')) {
    cache.put(request, response.clone()).catch(() => {});
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(event));
    return;
  }

  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(handleFont(request).catch(() => fetch(request)));
    return;
  }

  // Same origin, inside our scope: app assets.
  if (url.origin === self.location.origin && url.pathname.startsWith(new URL('./', self.location.href).pathname)) {
    const cacheName = PRECACHE.some((p) => new URL(p, self.location.href).pathname === url.pathname)
      ? SHELL
      : RUNTIME;
    event.respondWith(staleWhileRevalidate(request, cacheName).catch(() => fetch(request)));
  }

  // Anything else (Firebase SDK, auth, Firestore, GoatCounter) falls through untouched.
});
