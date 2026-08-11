# FIX v1123 -> v1124 — Sesi 417 (FUEL-AUTOSYNC-06, FuelCard live estimate)

## Ringkasan

`FuelCard._gaugeHtml()` sekarang auto-refresh berbasis KM — 100% reuse
`FuelStateEstimator.estimateCurrentLiter()` (s415) lewat helper baru
`_liveEstimate()`, bukan snapshot beku `fuelState.currentFuelLiter`
langsung. Gauge kini "hidup": posisi bar turun mengikuti km kendaraan
tiap kali card di-render (tab switch/dashboard refresh), tanpa nunggu
BBM log baru atau koreksi manual.

## File yang berubah

- `modules/vehicle/fuel-card.js` — `_liveEstimate()` (baru) +
  `_gaugeHtml()` diarahkan ke helper baru; fallback ke
  `FuelBarCorrection._currentEstimate()` tetap ada (0 behavior lama
  hilang, cuma diprioritaskan ulang sumbernya).
- `tests/fuel-card.test.js` — 7 test baru (`_liveEstimate()` x4,
  `_gaugeHtml()` x3), `makeCtx()` diperluas terima
  `FuelTankProfile`/`FuelGaugeEngine`/`FuelBarCorrection`/
  `FuelStateEstimator`.
- `app-bundle-a.min.js`, `app-bundle-b.min.js` — hasil build ulang.
- `index.html`, `app_production.html`, `sw.js` — bump versi (v1123 ->
  v1124).
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` — regenerasi
  otomatis.

## Cakupan & batasan (lihat `s417-SESSION-NOTE.md`)

- `FuelIntelligenceEngine.vehicleInsight()` tidak disentuh — dikonfirmasi
  lewat audit tidak baca `fuelState.currentFuelLiter` mentah.
- `FuelPredictionEngine`/`FuelInsightEngine` (Sesi 4) BELUM diselaraskan
  — keduanya masih baca `fuelState.currentFuelLiter` langsung.
- `confidenceScore` masih statis (Sesi 5 confidence decay belum
  dikerjakan).

## Verifikasi

```
node --test tests/*.test.js
# 2783/2783 pass (naik dari 2776, +7 test baru)

node scripts/build.js s417-fuel-card-live-estimate
# ✅ build sukses, sintaks valid, v1123 -> v1124
```
