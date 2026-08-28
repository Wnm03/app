// Service Worker - Keluarga W
// Strategi: network-first (biar update selalu terambil saat online),
// fallback ke cache saat offline. Precache file inti saat install.

const CACHE_NAME = 'kw-cache-v1399';
const PRECACHE_URLS = [
  './index.html',
  './app_production.html',
  './styles.css',
  './app-bundle-a.min.js',
  './app-bundle-b.min.js',
  './modules/shared/smoke-test.js',
  './manifest.json',
  './icon-192.svg',
  './icon-512.svg'
];

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
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Jangan cache request ke API eksternal (Gemini, Google Drive/Sheets, dsb)
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const resClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        return response;
      })
      .catch(async () => {
        // FIX (patch sw-fetch-undefined-response): caches.match() resolve ke
        // `undefined` kalau resource belum/tidak ada di cache. respondWith()
        // TIDAK BOLEH menerima undefined -- browser lempar
        // "TypeError: Failed to convert value to 'Response'" dan request
        // jadi network error total. Kalau ini kena file inti (HTML/JS bundle)
        // saat fetch pertama gagal, seluruh app gagal load tanpa error di UI
        // (gejala: "semua tombol tidak berfungsi"). Selalu kembalikan Response
        // asli, jangan pernah undefined.
        const cached = await caches.match(event.request);
        if (cached) return cached;
        return new Response('Offline atau resource tidak tersedia', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      })
  );
});
