# AUDIT S2282-S2283 — Lazy-load timeout / cross-boundary hardening

## Temuan substantif
1. `_loadScriptOnce()` sudah retry ketika `script.onerror`, tetapi **timeout 12 detik tidak retry**. Screenshot runtime menunjukkan tepat failure mode ini: `Timeout memuat modules/shop/business-intelligence-presenter.js` dan `laporan-export.js`. Akibatnya transient network/PWA/service-worker delay menjadi false-negative diagnostik dan fitur lazy tampak hilang walau file ada.
2. `BusinessIntelligencePresenter` (lazy) bergantung pada `ShopInsight` (eager). Boundary tersebut sebelumnya implisit melalui global lexical binding. Sekarang dependency dipublikasikan eksplisit sebagai `window.ShopInsight` tanpa membuat engine/rumus kedua.
3. Test helper `loadSource()` hanya membaca `ctx[key]`, sehingga API top-level `const`/`let` lintas classic-script tidak terbaca sebagai export VM. Ini menyebabkan false test failures pada Business Intelligence walau source dependency tersedia.

## Perbaikan
- Timeout lazy-load dinaikkan menjadi 15 detik dan **mendapat retry 1x dengan cache-buster**, sama seperti `onerror`.
- Jika retry timeout juga gagal, pesan error menyebut retry + kemungkinan koneksi/cache/service worker/Brave Shields.
- `ShopInsight` dipublish eksplisit untuk consumer lazy.
- `tests/helpers/loadSource.js` sekarang resolve global-lexical binding via `vm.runInContext()` lalu fallback ke property global.
- Tambah gate S2282 untuk mengunci ownership ShopInsight → Business Intelligence.
- Tambah regression test timeout retry di `boot-early.test.js`.

## Verifikasi
- Targeted tests: **83/83 PASS** (boot-early, Business Intelligence, S2282, lazy cold-start/runtime, restore S2451/S2454, runtime projection S2166).
- Lazy boundary audit: **99/99 PASS**.
- Lazy race matrix S2279: **8/8 PASS**.
- Lazy failure recovery S2280: **46/46 PASS**.
- Lazy multi-failure isolation S2281: **12/12 PASS**.
- Runtime projection S2166: **PASS**.
- Production runtime wiring S2167: **PASS**.

## Build limitation
`npm run build -- --require-minify` belum dapat dijalankan sampai selesai karena dependency `esbuild` tidak tersedia pada sandbox (`Cannot find module 'esbuild'`). Tidak ada bundle/version bump yang dibuat secara manual untuk menghindari state parsial.

## Catatan restore backup
Backup terlampir memiliki 4 kendaraan, 73 `sparepartCats`, 297 `partsStock`, dan 88 `servisLogs`. Ditemukan satu kategori universal (`Busa Filter CVT`) dengan `vehicleId:null`; ini **bukan cross-vehicle corruption** dan harus tetap diperlakukan sebagai kategori global. Gate S2451/S2454 tetap PASS dan tidak mengubah kategori universal menjadi milik kendaraan secara menebak.
