# FIX — Service Worker: "semua tombol tidak berfungsi" (network error total)

## Laporan
User report + screen recording: di halaman Mobil (Car Notes), semua tombol
(Katalog Suku Cadang, chip filter, Lihat Detail, Atur Koreksi Tangki, bottom
nav Beranda/Uang/Shop/Aset/Mobil/Pajak) tidak merespons tap sama sekali,
tanpa error di UI. Console browser menunjukkan:

```
The FetchEvent for "https://wnm03.github.io/repo/" resulted in a network
error response: the promise was rejected.
sw.js:1 Uncaught (in promise) TypeError: Failed to convert value to 'Response'.
```

(Noise lain di console — "Gagal parsing blok ACTION dari AI...", "Gagal
mendekripsi API key..." — berasal dari self-test bawaan app
`computeSelfTestResults()`/`autoRunSelfTestIfNeeded()` yang sengaja menguji
error-handling dengan input rusak; bukan bug, aman diabaikan.)

## Root Cause
`sw.js` fetch handler:
```js
event.respondWith(
  fetch(event.request)
    .then((response) => {...; return response;})
    .catch(() => caches.match(event.request))   // BUG
);
```
`caches.match()` resolve ke `undefined` bila resource tidak ada di cache.
`respondWith()` tidak boleh menerima `undefined` — browser melempar
`TypeError: Failed to convert value to 'Response'`, dan request tersebut
jadi network error total. Kalau ini kena resource inti (HTML/JS bundle) saat
fetch pertama gagal (koneksi tidak stabil, cache belum terisi, dsb), seluruh
app gagal load bersih tanpa indikasi visual apa pun — persis gejala "semua
tombol tidak berfungsi".

## Fix
`catch()` sekarang selalu mengembalikan `Response` asli: fallback ke cache
kalau ada, atau `Response` 503 eksplisit kalau cache juga miss — tidak
pernah `undefined`.

`CACHE_NAME` dinaikkan `kw-cache-v1022` → `kw-cache-v1023` supaya client
lama otomatis buang cache rusak & precache ulang dari awal saat SW baru
`activate`. Referensi `?v=1022` di `index.html`/`app_production.html`
dinaikkan ke `?v=1023` mengikuti konvensi cache-busting yang sudah ada.

## File yang berubah
- `sw.js`
- `index.html` (bump `?v=`)
- `app_production.html` (bump `?v=`)

## Deploy
1. Ganti `sw.js`, `index.html`, `app_production.html` di server (GitHub
   Pages) dengan versi di patch ini.
2. Di sisi client (kalau masih macet setelah deploy): DevTools → Application
   → Service Workers → Unregister → Clear site data → reload. (SW baru
   otomatis `skipWaiting()` + `clients.claim()`, jadi harusnya tidak perlu
   langkah manual ini untuk user baru/reload biasa.)
