# S2041.2 — Hentikan loop render `part-crud-s2041` (idle 110 mutasi/10 dtk → 1)

Baseline: app-main (13), v2279. Hasil build: v2280. Patch delta-only.

## Masalah (terukur di Chromium, CPU 4x, idle 10 dtk setelah boot 6 dtk)
- `#servisPartId` dimutasi ±11x/detik, 110 mutasi, 26–30 long task, ±1,6–1,9 dtk main thread, tanpa interaksi.
- Berlangsung ±120 detik pertama setiap aplikasi dibuka (observer baru diputus oleh timer 120 dtk).

## Akar masalah
1. `boot()` di `modules/vehicle/part-crud-s2041.js` memasang `MutationObserver` di `document.body` (childList+subtree, debounce 80 ms) -> `refreshAll()`.
2. `refreshSelect()` sebenarnya sudah punya pelindung "tulis hanya jika opsi berubah", TETAPI di build produksi `#servisPartId` adalah `<input type="hidden">` (`modules/shared/modals.js`), bukan `<select>`. `sel.options` undefined -> `oldOpts` kosong -> `currentHtml===''` -> `nextHtml!==currentHtml` selalu benar -> `sel.innerHTML` ditulis tiap `refreshAll()`.
3. Penulisan itu memicu observer lagi (umpan balik tertutup). Observer a11y di `a11y-action-controls.js` (body, rAF) ikut menjalankan ulang `querySelectorAll` selector 1.481 karakter tiap mutasi, sehingga biayanya berlipat.

## Perubahan
- `modules/vehicle/part-crud-s2041.js` `refreshSelect()`: `if(!sel.options)return false;` + komentar "why" (S2041.2). Perilaku `<select>` tidak berubah. Injeksi UI satu kali di `injectPicker` tidak diubah.
- Test baru: `tests/s2041-2-part-crud-nonselect-no-rewrite.test.js` (2 tes). Tes 1 GAGAL di source lama, lulus di source baru.
- Build resmi `node scripts/build.js` (esbuild 0.24.0): bundle B dibangun ulang; versi 2279 -> 2280 (index.html, app_production.html, sw.js CACHE_NAME, stempel versi di 5 file source, FILE-MAP.md, COVERAGE-PER-MODULE.md). Bundle A hanya berubah stempel versi.

## Verifikasi
- Browser (CPU 4x), idle 10 dtk: sebelum 110 mutasi / 26 long task / 1.582 ms; sesudah 1 mutasi / 0 long task / 0 ms. 0 error halaman; `PartCrudS2041.PartPicker` tetap ada, `refreshAll()` jalan.
- Suite penuh `tests/*.test.js`: 8.714 tes, 8.706 lulus, 7 gagal. Ketujuhnya GAGAL JUGA di baseline asli (identik): `perf-navigation-v1825` (6) dan `s2462-finance-stale-write-and-input-guards` (1). Tidak terkait patch ini.
- `verify-bundle-freshness` (A & B segar), `verify-window-expose`, `audit:performance-budget`, `audit-lazy-boundaries` (99/99), kontrak performa: PASS.

## Belum dikerjakan (sengaja di luar cakupan)
- Observer a11y masih mengamati seluruh `body`; sapuan `querySelectorAll` besar masih jalan di tiap mutasi DOM normal (mis. pindah halaman). Kandidat sesi berikutnya (batasi ke kontainer terdaftar).
- `smoke-test.js` + `self-test*.js` berjalan saat startup produksi (±340 ms CPU pada 4x).
- 7 tes gagal pra-eksisting di atas.

## Deploy
Upload ULANG semua file di ZIP (bundle A & B, kedua HTML, sw.js). Bump CACHE_NAME sudah termasuk.
