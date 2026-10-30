# Sesi 543 — Re-fix: UI Ride Hilang Lagi dari Tab "Jalan" Car Notes

## Root cause (audit)
Fix S532 (v1264, patch `s531-s532-merged`) SEMPAT berhasil mewiring
`RideUI` (S525) ke Car Notes lewat tab baru "🚴 Jalan":
- `index.html`/`app_production.html`: tombol tab + pane `#cnTab-jalan`
- `modules/shared/modules-render.js`: `RideUI.render()` dipanggil di
  `renderCnTab()`

Wiring ini masih ada & benar sampai patch **s537** (v1266-1267,
holdings-empty-state). Tapi di patch **s538** (v1266-1267,
sticky-summary) — `index.html` turun ukuran dari 290.675 → 287.893 byte
(selisih ±2.782 byte, persis seukuran blok markup tab Jalan yang
hilang). Indikasi kuat: build s538 dilakukan dari base HTML yang lebih
lama (sebelum S532), bukan dari hasil s537, sehingga fix S532 ter-revert
tanpa sengaja. `modules-render.js` ikut kehilangan panggilan
`RideUI.render()` di build-build berikutnya (dikonfirmasi hilang total
mulai s540c).

Regresi ini terbawa terus tanpa terdeteksi sampai ke **S542-FULL-RELEASE**
(v1275) — 7 sesi (`s538`→`s542`) berturut-turut mewarisi `index.html`
yang sama (287.893 byte) tanpa tab Jalan, dan `modules-render.js` tanpa
panggilan `RideUI.render()`. Sisa jejak: array tab di `setCnTab()`
(`modules/vehicle/vehicle-core.js`) masih menyebut `'jalan'` (komentar
S532 masih ada di sana) — makanya switch-tab "tahu" ada tab itu, tapi
pane HTML-nya kosong & presenter-nya tidak pernah dipanggil, jadi kalau
tab diklik pun tidak menampilkan apa-apa.

## Perbaikan sesi ini
Root cause SAMA PERSIS seperti S532 — jadi solusinya murni PASANG ULANG
3 perubahan asli S532 (0 logic baru, 0 perubahan ke RideUI/
RideGpsRecorder/RideStorage/RideActivityMetrics/RideMap), di atas base
kode terbaru (S542-FULL-RELEASE / v1275):

1. `index.html`, `app_production.html`
   - Tombol tab `🚴 Jalan` (`data-action="setCnTab"`, args `["jalan"]`)
   - Pane `#cnTab-jalan` dengan field id `rideStatusText`/
     `rideDistanceText`/`rideDurationText`/`rideAvgSpeedText`/
     `rideMaxSpeedText`/`rideErrorText` + tombol
     `rideStartBtn`/`ridePauseBtn`/`rideResumeBtn`/`rideStopBtn`/
     `rideDiscardBtn` (`data-action="RideUI.*"`) — persis field/id yang
     dibaca `RideUI.render()`, tidak ada satupun yang diubah.
2. `modules/shared/modules-render.js` — +1 baris
   `if(typeof RideUI!=='undefined')RideUI.render();` di `renderCnTab()`,
   tepat setelah `VehicleAutomationPresenter.render()` (posisi sama
   persis seperti S532).
3. `modules/vehicle/vehicle-core.js` — TIDAK diubah (array `'jalan'` &
   komentar S532 di `setCnTab()` sudah bertahan sejak awal, tidak
   pernah ikut regresi).

Tidak menyentuh `ride-activity-metrics.js`/`ride-gps-recorder.js`/
`ride-storage.js`/`ride-history.js`/`ride-map.js`/
`ride-vehicle-integration.js`/`ride-ui.js` sama sekali.

## Build
`node scripts/build.js` dijalankan di environment tanpa akses jaringan
→ `esbuild` tidak tersedia, jadi `app-bundle-a.min.js`/
`app-bundle-b.min.js` **valid tapi TIDAK diminify** (ukuran lebih besar
dari build sebelumnya). Fungsionalitas 100% sama — sintaks kedua bundle
sudah lolos `node --check`. Kalau mau ukuran sekecil versi sebelumnya,
jalankan `npm install --save-dev esbuild` (butuh internet) lalu
`node scripts/build.js` ulang di environment yang online.

Versi naik: `s542-custodian-registry-rename-remove` →
`s543-custodian-registry-rename-remove` (build v1275 → v1276).

## Verifikasi
- `node scripts/verify-window-expose.js` → ✓ OK, 70 modul window-expose
  lengkap.
- `node scripts/verify-bundle-freshness.js` → ✓ kedua bundle segar
  (hash source cocok).
- `node --test tests/ride-ui.test.js` → 31/31 pass.
- `node --test tests/*.test.js` (full suite) → **3753/3753 pass, 0
  gagal, 0 regresi.**

## File yang berubah (union, path asli repo)
- `index.html` (fix tab Jalan + version bump)
- `app_production.html` (fix tab Jalan + version bump, disalin persis
  dari index.html oleh build.js)
- `modules/shared/modules-render.js` (fix `RideUI.render()` + version
  sync)
- `modules/shared/modals.js` (version sync — `MODAL_VERSION` saja)
- `modules/shared/modules-calc.js` (version sync — `MODULE_CALC_VERSION`
  saja)
- `modules/shared/features-helpers-global-security.js` (version sync —
  `APP_BUILD_VERSION`/`PRODUCTION_BUILD_SYNCED_VERSION` saja)
- `chat-action-handlers.js` (version sync — `MODULE_FEATURES_VERSION`
  saja)
- `app-bundle-a.min.js`, `app-bundle-b.min.js` (rebuild, TIDAK minified
  — lihat catatan Build di atas)
- `sw.js` (`CACHE_NAME` → `kw-cache-v1276`)
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` (regenerasi
  otomatis oleh build.js, bukan perubahan manual)

Upload SEMUA file di atas (jangan cuma HTML) — sesuai catatan
`scripts/build.js`.

## Rekomendasi supaya tidak regresi lagi
Regresi s538 kemungkinan besar terjadi karena build session itu memulai
dari salinan `index.html`/`app_production.html` yang bukan hasil
terbaru (s537). Disarankan: sebelum mulai sesi baru, selalu `diff`
ukuran/hash `index.html` & `app_production.html` terhadap patch sesi
sebelumnya (bukan cuma bundle) — `verify-bundle-freshness.js` sudah
mengecek kesegaran bundle vs source, tapi belum mengecek drift HTML vs
HTML sesi sebelumnya.
