# FIX v1125 -> v1126 — Sesi 419 (FUEL-AUTOSYNC-08, confidence decay dinamis)

## Ringkasan

`confidenceScore` BBM (estimasi seberapa bisa dipercaya angka liter
saat ini) sekarang meluruh (decay) seiring km ditempuh sejak titik
acuan terakhir, lewat field baru `decayedConfidenceScore` di
`FuelStateEstimator.estimateCurrentLiter()`. Sebelum sesi ini skornya
statis (70/90/100 tergantung sumber tulis) dan tidak pernah turun
walau sudah lama tidak dikoreksi/BBM log. `FuelPredictionEngine`,
`FuelCostAnalytics`, dan `FuelCard` (rekomendasi pasif low-confidence)
sekarang semua baca skor yang sudah meluruh ini — fallback ke skor
mentah tetap ada kalau estimator belum dimuat/belum ada titik acuan.

## File yang berubah

- `modules/vehicle/fuel-state-estimator.js` — `DECAY_KM_PER_POINT` (15),
  `MIN_CONFIDENCE_SCORE` (30) (baru), field `decayedConfidenceScore`
  (baru, additive) di `estimateCurrentLiter()`.
- `modules/vehicle/fuel-prediction-engine.js` — `_confidence()` sekarang
  terima `vehicleId`, reuse `decayedConfidenceScore`.
- `modules/vehicle/fuel-cost-analytics.js` — `_confidenceScore()` pola
  sama, reuse `decayedConfidenceScore`.
- `modules/vehicle/fuel-card.js` — `_currentConfidence()` (baru),
  `_lowConfidenceHint()` sekarang decay-aware.
- `tests/fuel-state-estimator.test.js` — +6 test.
- `tests/fuel-prediction-engine.test.js` — +3 test.
- `tests/fuel-cost-analytics.test.js` — +3 test, `makeCtx()` terima
  parameter `FuelStateEstimator`.
- `tests/fuel-card.test.js` — +2 test.
- `app-bundle-a.min.js`, `app-bundle-b.min.js` — hasil build ulang.
- `index.html`, `app_production.html`, `sw.js` — bump versi (v1125 ->
  v1126).
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` — regenerasi
  otomatis.

## Cakupan & batasan (lihat `s419-SESSION-NOTE.md`)

- Field `confidenceScore` lama TIDAK diubah/dihapus di mana pun — 0
  breaking change utk konsumen yang masih baca field lama.
- Tidak ada badge/UI baru yang menampilkan angka `decayedConfidenceScore`
  secara eksplisit — sesi ini murni membuat decay-nya ADA & dipakai
  hint low-confidence yang sudah ada (TASK-145).
- Sesi 6 (regression suite komprehensif lintas Sesi 1-5) belum
  dikerjakan.

## Verifikasi

```
node --test tests/*.test.js
# 2804/2804 pass (naik dari 2791, +13 test baru)

node scripts/build.js s419-fuel-confidence-decay
# ✅ build sukses, sintaks valid, v1125 -> v1126
```
