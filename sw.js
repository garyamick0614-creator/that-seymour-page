/* TCG Phase E SW template (placed at /sw.js on each Netlify site).
   Policy:
     - HTML (navigation requests) -> network-only (never cache; freshness > offline).
     - Static assets (css/js/svg/png/woff/ico) -> cache-first, indefinite (cache-busted by URL).
     - /api/* -> network-first with 24h max age (cache-fallback if offline).
   Bump SW_VERSION to invalidate.
*/
const SW_VERSION = 'tcg-phase-e-that-seymour-page-2026-05-29-v2';
const STATIC_CACHE = SW_VERSION + '-static';
const API_CACHE    = SW_VERSION + '-api';
const API_MAX_AGE_MS = 24 * 60 * 60 * 1000;

self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => !k.startsWith(SW_VERSION)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

function isStatic(url) {
  return /\.(?:css|js|mjs|svg|png|jpg|jpeg|webp|gif|ico|woff2?|ttf|otf|json|webmanifest)$/i.test(url.pathname);
}
function isApi(url) {
  return url.pathname.startsWith('/api/') || /api\.thatcomputerguy26\.org/.test(url.hostname);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Cross-origin requests: never intercept. Let the browser fetch them natively
  // so they are governed only by their own CSP directive (img/script/style-src),
  // NOT by a SW-initiated fetch (connect-src). This is what lets self-hosted or
  // CDN map libraries + OpenStreetMap/Carto/Esri tiles load without a connect-src
  // block. The API host we DO want to cache is matched by isApi() before this.
  if (url.origin !== self.location.origin && !/api\.thatcomputerguy26\.org/.test(url.hostname)) {
    return; // browser default handling
  }

  // HTML navigations: never cache. Network only.
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(fetch(req).catch(() => new Response(
      '<!doctype html><meta charset=utf-8><title>Offline</title><body style="font:14px/1.5 system-ui;padding:24px;background:#0e1116;color:#cbd5e1"><h1>Offline</h1><p>This page requires a network connection. Retry when you are back online.</p>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )));
    return;
  }

  if (isApi(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(API_CACHE);
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) {
          const clone = fresh.clone();
          const wrapped = new Response(await clone.blob(), {
            status: fresh.status, statusText: fresh.statusText,
            headers: new Headers(fresh.headers)
          });
          wrapped.headers.set('x-tcg-sw-cached-at', String(Date.now()));
          cache.put(req, wrapped.clone());
          return fresh;
        }
        throw new Error('non-ok');
      } catch (e) {
        const cached = await cache.match(req);
        if (cached) {
          const ts = parseInt(cached.headers.get('x-tcg-sw-cached-at') || '0', 10);
          if (Date.now() - ts < API_MAX_AGE_MS) return cached;
        }
        return new Response(JSON.stringify({ error: 'offline', source: 'tcg-sw' }), {
          status: 503, headers: { 'Content-Type': 'application/json' }
        });
      }
    })());
    return;
  }

  if (isStatic(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok && url.origin === self.location.origin) {
          cache.put(req, fresh.clone());
        }
        return fresh;
      } catch (e) {
        return cached || new Response('', { status: 504 });
      }
    })());
    return;
  }

  // Default: passthrough
});
