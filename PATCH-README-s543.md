# PATCH v1277 → v1278 (S543 — Fix dropdown "Pilih Aset" Dana Titipan ter-reset diam-diam)

Detail lengkap (root cause, fix, test): `FIX-v1277-to-v1278-s543-titipan-assetpick-dropdown-preserve-selection.md`.

## Status
- **3757/3757 test PASS** (`node --test tests/*.test.js`) — 3753 baseline
  + 4 test baru (`tests/s543-titipan-asset-pick-preserve-selection.test.js`).
- `node scripts/build.js s543-titipan-assetpick-dropdown-preserve-selection`
  dijalankan: `?v=` **1277 → 1278**, `CACHE_NAME` → `kw-cache-v1278`.
  `app_production.html` sudah disinkronkan ulang dari `index.html`.
- Bundle unminified (esbuild tidak tersedia di sandbox ini) — sintaks
  lolos `node --check`, 100% valid dipakai. `verify-bundle-freshness.js`
  konfirmasi kedua bundle segar (hash source cocok).
- Release Gate (`verify-release-ready.js`): **LOLOS** — lint & minify
  di-override (eslint/esbuild tidak tersedia, sandbox tanpa akses
  jaringan), html-sync lolos murni. Tercatat di `docs/RELEASE-GATE-LOG.md`.

## Apa yang berubah (logika)
- `modules/finance/dana-titipan-portfolio-presenter.js` — root cause:
  `_renderNow()` mengganti seluruh `el.innerHTML` tiap dipanggil ulang
  (dipicu render lain di halaman, mis. harga investasi live update),
  jadi pilihan dropdown "Pilih Aset" per kartu owner diam2 ter-reset ke
  placeholder sebelum sempat klik "Atur Porsi Aset". Fix: tambah
  `_captureAssetPickSelections()`/`_restoreAssetPickSelections()` (baru),
  dipanggil di awal/akhir `_renderNow()`; preservasi PER `ownerId` (via
  `data-owner-id` baru di tiap `<select id="titipanAssetPick_N">`, BUKAN
  index — index bisa bergeser antar render kalau urutan owners berubah).
  Guard `typeof el.querySelectorAll` — aman di test harness ringan tanpa
  querySelectorAll. 0 logika projection/aggregasi lain disentuh.
- `tests/s543-titipan-asset-pick-preserve-selection.test.js` — baru, 4
  test case (baseline tanpa interaksi, preservasi setelah render ulang,
  preservasi saat urutan owner bergeser index, guard DOM tanpa
  querySelectorAll).

## Apa yang berubah (murni hasil build, 0 logika baru)
- `app-bundle-a.min.js`, `app-bundle-b.min.js` — rebuild penuh dari
  source (unminified, esbuild tidak tersedia di sandbox).
- `sw.js`, `index.html`, `app_production.html` — `?v=`/`CACHE_NAME` →
  v1278.
- `modules/shared/modules-render.js`, `modules/shared/modals.js`,
  `modules/shared/modules-calc.js`,
  `modules/shared/features-helpers-global-security.js`,
  `chat-action-handlers.js` — HANYA konstanta versi
  (`MODULE_RENDER_VERSION`/`MODAL_VERSION`/`MODULE_CALC_VERSION`/
  `MODULE_FEATURES_VERSION`/`APP_BUILD_VERSION`/
  `PRODUCTION_BUILD_SYNCED_VERSION`) di-bump ke label sesi ini
  (`s543-titipan-assetpick-dropdown-preserve-selection`) — 0 baris logic
  lain berubah (diverifikasi `diff` baris-per-baris, cuma 1 baris per
  file).
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` — regenerasi
  otomatis dari `scripts/build.js`.
- `docs/CLAUDE.md` — log sesi 543 ditambahkan (append).
- `docs/RELEASE-GATE-LOG.md` — 2 entri override lint/minify (append
  otomatis oleh `verify-release-ready.js`).
- `FIX-v1277-to-v1278-s543-titipan-assetpick-dropdown-preserve-selection.md` —
  baru (dokumentasi fix sesi ini).

## Belum dikerjakan (dicatat, bukan bagian patch ini)
Item #2 laporan user ("hapus akun pemilik" / global owner deletion) —
dikonfirmasi BUKAN bug, tapi keputusan desain S523-C yang sengaja
melarangnya sampai keputusan produk §4 rekomendasi S523 diambil. TIDAK
disentuh di patch ini, menunggu klarifikasi user.

## Cara pakai patch ini
Timpa file-file di atas ke lokasi yang sama di deployment v1277 kamu.
Upload SEMUA file yang berubah (bukan cuma HTML/sw.js) — bundle
(`app-bundle-a.min.js`/`app-bundle-b.min.js`) WAJIB ikut ter-upload
karena itu yang sebenarnya dijalankan browser.
