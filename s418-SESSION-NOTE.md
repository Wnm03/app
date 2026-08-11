# Sesi 418 (FUEL-AUTOSYNC-07, "Sesi 4" rencana "Fuel Estimation Auto-Update")

## Konteks

Lanjutan s417 (Sesi 3: `FuelCard._liveEstimate()`). Giliran **Sesi 4 asli
rencana**: selaraskan `FuelPredictionEngine`/`FuelInsightEngine` — dulu
keduanya baca `fuelState.currentFuelLiter` mentah (snapshot beku),
sekarang ikut lewat `FuelStateEstimator.estimateCurrentLiter()` (s415)
kalau tersedia, pola SAMA PERSIS `FuelCard._liveEstimate()` (s417).

## Perubahan

- `modules/vehicle/fuel-prediction-engine.js`:
  - `_currentLiter(vehicleId, fuelState)` (BARU) — 100% reuse
    `FuelStateEstimator.estimateCurrentLiter()`, fallback ke
    `fuelState.currentFuelLiter` (pola lama) kalau estimator belum
    dimuat/`ok:false`.
  - `predictRemainingDistance()` — liter input ke
    `FuelGaugeEngine.estimateRemainingDistance()` & field balik
    `currentFuelLiter` sekarang lewat `_currentLiter()`.
  - `predictNextRefuel()` — liter input ke
    `FuelGaugeEngine.getReserveStatus()` sekarang lewat `_currentLiter()`.
  - `predictMonthlyFuelUsage()`/`predictYearlyFuelUsage()` TIDAK disentuh
    — keduanya sudah 100% dari `fuelEfficiency().estMonthlyLiter/Cost`,
    0 baca `fuelState.currentFuelLiter` sama sekali.
- `modules/vehicle/fuel-insight-engine.js`:
  - `_currentFuelLiter(vehicleId)` — diperluas pakai
    `FuelStateEstimator.estimateCurrentLiter()` dulu (fallback ke
    `fuelState.currentFuelLiter` apa adanya) — SATU titik perubahan ini
    otomatis ikut dipakai `_reserveFuelInsight()` & `_fuelGaugeData()`
    (keduanya sudah panggil `_currentFuelLiter()`, 0 perubahan lain
    dibutuhkan di kedua fungsi itu).
- 0 field baru ditulis ke `D`, 0 rumus konsumsi/reserve/bar baru — murni
  ganti sumber liter input ke engine yang SUDAH ADA.

## Yang BELUM ditangani (sisa rencana)

- Sesi 5: confidence decay dinamis — `confidenceScore` masih statis,
  tidak menurun seiring waktu/km sejak titik acuan.
- Sesi 6: regression test suite komprehensif lintas Sesi 1-5.

## Verifikasi

- `node --test tests/*.test.js` → **2791/2791 pass** (2783 lama + 8
  baru: 4 di `fuel-prediction-engine.test.js` + 4 di
  `fuel-insight-engine.test.js`), 0 fail.
- `node scripts/build.js s418-fuel-prediction-insight-live-liter` →
  build sukses, sintaks kedua bundle valid, versi `v1124` -> `v1125`.
