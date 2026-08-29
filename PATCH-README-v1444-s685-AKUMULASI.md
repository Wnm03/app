# PATCH AKUMULASI — v1444 (s685) — SUDAH DI-BUILD & DITES

ZIP ini akumulasi dari SEMUA perubahan sesi-sesi terakhir (bukan cuma sesi
paling baru) — timpa 19 file ini ke project asli, tidak ada langkah lain.

## Isi (akumulasi, urut sesi)

**Sesi 1 — Vehicle Asset Auto-Create (Opsi A):**
- `modules/vehicle/vehicle-core.js` — auto-create Aset dari kendaraan SELF
- `modules/shared/modals.js` — field `#vehNilai` di modal Kendaraan
- `data-health-check.js` — reminder kendaraan lama belum tercatat di Buku Aset

**Sesi 2 — Test untuk fitur di atas:**
- `tests/vehicle-asset-auto-create-opsiA.test.js`
- `tests/data-health-check-vehicle-self-uncovered-opsiA.test.js`

**Sesi 3 — Fix gap hitungKas di Cash Flow Forecast:**
- `modules/finance/tx-list-cashflow.js` — `computeCashflowForecast()`
  sekarang guard `t.hitungKas!==false`. SSOT yang dipakai
  `financial-forecast-presenter.js` DAN `cashflow-projection-presenter.js`
  (0 akses `D` langsung di keduanya), jadi 1 titik fix ini menutup gap di
  2 dari 6 file yang tercatat pending di sesi hitungKas T4+ sebelumnya.
- `tests/cashflow-projection-settings.test.js` — 3 test baru ditambahkan
  ke file existing.

**Sesi 4 (baru) — Fix gap nama aset auto-created tidak ikut sync:**
- `modules/vehicle/vehicle-core.js` — `_autoCreateVehicleAsset()`: saat
  kendaraan yang sudah tertaut aset auto-created (`autoCreatedFromVehicleId`
  cocok) di-rename & disimpan ulang, `a.name` sekarang ikut disinkron satu
  arah mengikuti nama kendaraan terbaru — sebelum ini nama di Buku Aset
  tetap yang lama. Pola & baris SAMA PERSIS sync `ownership` yang sudah ada
  (Sesi 1), aset hasil LINK MANUAL tetap TIDAK disentuh sama sekali.
- `tests/vehicle-asset-auto-create-opsiA.test.js` — 2 test baru: rename
  ikut sync (positive) + aset auto-created kendaraan LAIN tidak ikut
  kesenggol (negative).

**Hasil build.js (regenerasi otomatis, wajib ikut diupload):**
- `app-bundle-a.min.js`, `app-bundle-b.min.js` — bundle (⚠️ belum diminify,
  esbuild tidak tersedia di sandbox build; sintaks sudah divalidasi
  `node --check`, aman dipakai)
- `index.html`, `app_production.html` — `?v=1444`
- `sw.js` — `CACHE_NAME` → `kw-cache-v1444`
- `modules/shared/modules-render.js`, `modules/shared/modules-calc.js`,
  `modules/shared/features-helpers-global-security.js`,
  `chat-action-handlers.js` — konstanta versi disamakan (0 perubahan logic)
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md`, `docs/RELEASE-GATE-LOG.md`
  — dokumentasi regenerasi otomatis

## Verifikasi sesi ini (Sesi 4)
- Fix diverifikasi **red→green**: sync `a.name` di-revert sementara →
  1 test baru gagal (`not ok`) → dikembalikan → semua hijau lagi.
- `node scripts/build.js` → sukses, v1443 → **v1444**
- `node --test tests/*.test.js` → **4894/4894 pass**, 0 fail
- `verify-window-expose.js` → OK
- `verify-release-ready.js` → lolos (2 gate lint/minify di-override manual,
  sandbox tanpa akses npm registry — dicatat di `docs/RELEASE-GATE-LOG.md`)

## Belum dikerjakan (rekomendasi sesi lanjutan)
- `filter-laporan.js` — **beda karakter**, 4 titik akses `D.transactions`
  langsung, tapi ini file *filter tampilan daftar transaksi* (bukan agregat
  kas) — perlu didiskusikan dulu apakah "Catatan saja" MEMANG harus hilang
  dari daftar/laporan yang dilihat user, jangan asal tempel guard yang sama.
- `debt-optimizer-api.js`/`debt-optimizer-presenter.js`/`dana-kelolaan.js`
  — belum dicek detail apakah baca `D.transactions` langsung sama sekali
  (kalau tidak, kemungkinan besar tidak perlu disentuh, sama seperti kasus
  forecast yang cukup dibenahi lewat 1 titik SSOT).
- Rekomendasi lain dari sesi audit awal (zakatable hardcoded di aset
  auto-created, backfill UX quick-action) masih terbuka, belum dikerjakan.
