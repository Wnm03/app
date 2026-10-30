# Patch: pecah modules/vehicle/sparepart-servis.js

Lanjutan audit ukuran file (kandidat berikutnya setelah cleanup dead
files sesi sebelumnya). File terbesar kedua setelah `scripts/build.js`.

## modules/vehicle/sparepart-servis.js (2053 -> 1350 baris)

Titik potong bersih: TEPAT SETELAH `window.Sparepart = Sparepart;`
(baris terakhir object `Sparepart`).

- **Diubah:** `modules/vehicle/sparepart-servis.js` — sisa bagian
  PERTAMA (fungsi helper global + object `Sparepart` lengkap +
  `window.Sparepart=Sparepart`).
- **Baru:** `modules/vehicle/sparepart-servis-b.js` (727 baris) —
  object `SparepartCsvImport`, `TORSI_DB`/`VEHICLE_SPEC_DB`,
  `MY_WRENCH_SCALE`, wrapper global ke `Servis` (car-notes.js), &
  fitur prediksi/AI kendaraan (predictService, maintenanceForecast,
  registerVehicleAIRules, dkk).

Sama seperti pola split `modules-render.js`: murni deklarasi
`function`/`const` top-level (bukan mixin di object literal), jadi
TIDAK butuh `Object.assign` — cukup `sparepart-servis-b.js` dimuat
SETELAH `sparepart-servis.js` (urutan dijaga di `scripts/build.js`,
entri baru tepat setelah file utama).

## Test

3 file test disesuaikan (`loadSource([...])` ditambah
`modules/vehicle/sparepart-servis-b.js`) karena menguji fungsi yang
ikut pindah:
- `tests/sparepart-interval-bulan.test.js` — pakai `predictService()`.
- `tests/sparepart-recommend-categories.test.js` — pakai `TORSI_DB`/
  `findTorsiDb()`/`suggestServiceIntervalKm()`.
- `tests/sparepart-sync-from-catalog-s331.test.js` — pakai `TORSI_DB`/
  `suggestServiceIntervalKm()`.

7 file test lain yang menyebut `sparepart-servis.js` dicek satu per
satu — TIDAK butuh perubahan (fungsi yang mereka pakai tetap di bagian
PERTAMA, atau sudah punya guard `typeof` terhadap fungsi yang pindah,
mis. `tests/sparepart-catmodal-vehicle-edit-audit.test.js` sudah
mengantisipasi `suggestServiceIntervalKm` bisa balik `null`).

## Verifikasi

- `node --test tests/*.test.js` -> **4857 pass, 0 fail** (sama persis
  sebelum & sesudah split).
- Build: versi `s674-cashflow-siklus-legacy-card`, `?v=1419`,
  `index.html`/`app_production.html`/`sw.js` sinkron.
- Lint "file kegedean" (ambang 1600 baris): **4 -> 3** file (di luar
  `scripts/build.js` yang wajar). Sisa: `modules/finance/transaksi.js`
  (1900), `modules/shared/scan-ocr.js` (1677),
  `modules/finance/dana-titipan-portfolio-render.js` (1616) —
  kandidat sesi split berikutnya.
- Release gate: lint & minify di-override (eslint/esbuild tidak
  tersedia di sandbox); html-sync & version-sync lolos murni.
  **Gate akhir: LOLOS.**

## Setelah menimpa file-file ini, jalankan:
```
npm test          # harus tetap 4857 pass, 0 fail
npm run build     # sudah dijalankan di sesi ini -- hasil rebuild ada di ZIP
```
