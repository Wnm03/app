# FIX v1124 -> v1125 — Sesi 418 (FUEL-AUTOSYNC-07, prediction/insight live liter)

## Ringkasan

`FuelPredictionEngine` & `FuelInsightEngine` sekarang ambil liter BBM
lewat `FuelStateEstimator.estimateCurrentLiter()` (s415) kalau tersedia
— bukan `fuelState.currentFuelLiter` mentah (snapshot beku). Prediksi
jarak/tanggal isi ulang & insight reserve/gauge ikut "hidup" mengikuti
km, selaras `FuelCard` (s417).

## File yang berubah

- `modules/vehicle/fuel-prediction-engine.js` — `_currentLiter()` (baru),
  dipakai `predictRemainingDistance()` & `predictNextRefuel()`.
- `modules/vehicle/fuel-insight-engine.js` — `_currentFuelLiter()`
  diperluas (satu titik, otomatis dipakai `_reserveFuelInsight()` &
  `_fuelGaugeData()`).
- `tests/fuel-prediction-engine.test.js` — +4 test, `makeCtx()` terima
  parameter `FuelStateEstimator`.
- `tests/fuel-insight-engine.test.js` — +4 test, `mocks.FuelStateEstimator`
  diteruskan ke `makeCtx()`.
- `app-bundle-a.min.js`, `app-bundle-b.min.js` — hasil build ulang.
- `index.html`, `app_production.html`, `sw.js` — bump versi (v1124 ->
  v1125).
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` — regenerasi
  otomatis.

## Cakupan & batasan (lihat `s418-SESSION-NOTE.md`)

- `predictMonthlyFuelUsage()`/`predictYearlyFuelUsage()` tidak disentuh
  (tidak baca `fuelState.currentFuelLiter`).
- `confidenceScore` masih statis (Sesi 5 confidence decay belum
  dikerjakan).

## Verifikasi

```
node --test tests/*.test.js
# 2791/2791 pass (naik dari 2783, +8 test baru)

node scripts/build.js s418-fuel-prediction-insight-live-liter
# ✅ build sukses, sintaks valid, v1124 -> v1125
```
