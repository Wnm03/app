// Service Worker - Keluarga W
// S1818: cache only static app assets; keep navigations fresh when online.
const CACHE_NAME = 'kw-cache-v2030';
const PRECACHE_URLS = [
  './index.html',
  './app_production.html',
  './styles.css',
  './modern-ui-layer.css',
  './minimal-ui-theme.css',
  './pwa-ui-layer.css',
  './app-bundle-a.min.js',
  './app-bundle-b.min.js',
  './modules/vehicle/service-reminder-vehicle-scope-s2015.js',
  './modules/vehicle/service-history-context-s2018.js',
  './modules/vehicle/service-history-multichecklist-s2019.js',
  './modules/vehicle/service-history-context-hardening-s2020.js',
  './modules/vehicle/service-history-evidence-s2021.js',
  './modules/vehicle/service-history-evidence-lifecycle-s2022.js',
  './modules/vehicle/service-history-evidence-completeness-s2023.js',
  './modules/vehicle/service-history-evidence-provenance-s2024.js',
  './modules/vehicle/service-history-evidence-ux-s2025.js',
  './modules/vehicle/service-history-reminder-component-s2026.js',
  './modules/vehicle/service-history-reminder-history-roundtrip-s2027.js',
  './modules/vehicle/service-history-history-reminder-audit-roundtrip-s2028.js',
  './modules/vehicle/service-history-legacy-multicomponent-reload-s2029.js',
  './modules/vehicle/service-history-final-e2e-s2030.js',
  './modules/shared/smoke-test.js',
  './manifest.json',
  './icon-192.svg',
  './icon-512.svg'
];

function isSameOriginStatic(request) {
  if (request.method !== 'GET') return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  const path = url.pathname.toLowerCase();
  return /\.(?:html?|css|js|mjs|json|svg|png|jpe?g|webp|woff2?|ico)$/.test(path);
}

function isNavigation(request) {
  return request.mode === 'navigate' ||
    (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch((err) => console.warn('[SW] Precache gagal:', err))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const request = event.request;
  if (!isSameOriginStatic(request)) return;

  // HTML navigations should prefer the newest deployed shell while online.
  if (isNavigation(request)) {
    event.respondWith(
      fetch(request).then(async (response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
          return response;
        }
        // SPA deep-link/reload hardening: a hosting layer may answer an app
        // route with HTTP 404/5xx even though the cached shell is valid.
        if (response.status >= 400) {
          const shell = await caches.match('./index.html');
          if (shell) return shell;
        }
        return response;
      }).catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        const shell = await caches.match('./index.html');
        if (shell) return shell;
        return new Response('Offline atau resource tidak tersedia', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      })
    );
    return;
  }

  // S1930 — online update hardening: do NOT let an old cached JS/CSS asset
  // survive a deployment that accidentally reuses the same query version.
  // Fetch the newest same-origin static asset first (with HTTP-cache
  // revalidation), then refresh the SW cache. If offline, fall back to the
  // cached copy so the PWA remains usable without a network.
  event.respondWith(
    fetch(request, { cache: 'no-cache' }).then((response) => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
      }
      return response;
    }).catch(async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      return new Response('Resource tidak tersedia', {
        status: 503,
        statusText: 'Service Unavailable'
      });
    })
  );
});
