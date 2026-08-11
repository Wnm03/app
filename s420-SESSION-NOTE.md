# Sesi 420 (FUEL-AUTOSYNC-09, "Sesi 6" rencana "Fuel Estimation Auto-Update")

## Konteks

Lanjutan s415-s419 (Sesi 1-5: `FuelStateEstimator.estimateCurrentLiter()`,
SSOT write hook `recordBbmLog()`, `FuelCard._liveEstimate()`,
`FuelPredictionEngine`/`FuelInsightEngine` ikut estimator, confidence
decay dinamis). Giliran **Sesi 6 asli rencana, item terakhir**: regression
test suite komprehensif lintas Sesi 1-5 — audit ulang menyeluruh, bukan
cuma test per-perubahan yang sudah ditambah tiap sesi (yang masing-masing
menguji SATU modul terisolasi dgn dependency lain di-mock).

## Perubahan

- `tests/fuel-estimation-autoupdate-regression-s420.test.js` (BARU, 12
  test) — memuat SEMUA modul asli rantai Sesi 1-5 (`FuelStorage`,
  `FuelTankProfile`, `FuelGaugeEngine`, `FuelStateEstimator`, `tx-bbm.js`
  [`recordBbmLog`/`syncFuelStateFromEstimator`/
  `syncFuelStateFromFullTankBbm`], `FuelPredictionEngine`,
  `FuelCostAnalytics`, `FuelInsightEngine`, `FuelCard`) dalam satu sandbox
  & menjalankan skenario dunia-nyata end-to-end, memverifikasi invarian
  LINTAS MODUL yang tidak pernah dites bersamaan sebelumnya:
  1. Konsistensi liter (`FuelCard._liveEstimate`,
     `FuelPredictionEngine._currentLiter`,
     `FuelInsightEngine._currentFuelLiter`) & confidence
     (`FuelCard._currentConfidence`, `FuelPredictionEngine._confidence`,
     `FuelCostAnalytics._confidenceScore`) — kelimanya HARUS balikin
     angka yang SAMA PERSIS di titik waktu yang sama (100% reuse
     `estimateCurrentLiter()` yang sama).
  2. Rebasing `referenceKm` (s416): setelah `syncFuelStateFromEstimator()`
     menulis titik acuan baru, panggilan berikutnya TIDAK dobel-hitung
     partial fill yang sudah "dibekukan" (`partialFillsCounted` harus 0).
  3. Decay confidence (s419) berlanjut dari BASELINE BARU setelah rebase
     partial fill (bukan terus dari full-tank lama) — dan low-confidence
     hint (TASK-145) ikut ter-trigger otomatis via `_currentConfidence()`.
  4. Full-tank fill berikutnya = ground truth, menimpa drift
     decay/akumulasi partial fill sebelumnya SEPENUHNYA (reset
     `referenceKm`/confidence).
  5. Guard "0 breaking change": kalau `FuelStateEstimator` TIDAK dimuat
     sama sekali, SEMUA 5 titik konsumen (2 di `FuelCard`, 2 di
     `FuelPredictionEngine`, 1 di `FuelCostAnalytics`, 1 di
     `FuelInsightEngine`) fallback ke snapshot statis lama SERENTAK —
     termasuk `recordBbmLog()` sendiri tidak boleh crash/mengubah
     `fuelState` gara-gara sync opsional yang tidak bisa jalan.
  6. Backward-compat data lama (fuelState pra-s415 tanpa `referenceKm`):
     `estimationLimited:true` konsisten di semua konsumen, 0 tebakan.
  7. Guard km non-monoton (odometer reset) tidak memicu decay/konsumsi
     palsu di modul manapun.
  8. Isolasi antar-kendaraan: partial fill/decay kendaraan lain tidak
     bocor ke kendaraan yang tidak jalan.
- 0 perubahan ke source `modules/**/*.js` mana pun — sesi ini murni
  menambah lapisan test, sesuai scope "Sesi 6: regression test suite"
  (bukan sesi perbaikan bug/fitur baru).

## Verifikasi

- `node --test tests/*.test.js` → **2816/2816 pass** (2804 lama + 12
  baru), 0 fail.
- `node scripts/build.js s420-fuel-estimation-regression-suite` → build
  sukses, sintaks kedua bundle valid, versi `v1126` -> `v1127`.

## Status rencana "Fuel Estimation Auto-Update"

Sesi 1-6 SEMUA sudah dikerjakan (s415-s420). Rencana ini selesai. Sisa
item yang sengaja dicadangkan/di luar cakupan (lihat catatan
"Yang BELUM ditangani" di masing-masing sesi s415-s419), bukan bagian
Sesi 1-6:
- Guard km non-monoton versi LENGKAP (logging/nudge UI proaktif "⚠️
  Estimasi mulai kurang akurat") & guard akumulasi error fill-parsial
  berturut-turut — "saran tambahan" di rencana asli, versi dasar (clamp
  diam-diam) sudah cukup utk korektnes engine.
- Badge UI baru yang eksplisit menampilkan angka `decayedConfidenceScore`
  di `_sourceBadgeHtml()` — scope Sesi 5 murni membuat decay-nya ADA &
  dipakai hint yang sudah ada (TASK-145), bukan presenter baru.
