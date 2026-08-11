# Sesi 422 (item TERAKHIR "saran tambahan" rencana "Fuel Estimation Auto-Update", lanjutan s420/s421)

## Konteks

s421 mengerjakan 2 dari 3 "saran tambahan" yang dicadangkan di s420
(nudge km non-monoton + badge skor eksplisit), dan mencatat 1 item
tersisa: guard akumulasi error fill-parsial berturut-turut. Sesi ini
mengerjakan item terakhir itu — rencana "Fuel Estimation Auto-Update"
beserta seluruh saran tambahannya kini benar-benar SELESAI.

## Perubahan

- `modules/vehicle/fuel-state-estimator.js`:
  - `PARTIAL_FILL_DRIFT_THRESHOLD: 3` (konstanta ambang, BARU).
  - Field BARU `partialFillDriftRisk` di return `estimateCurrentLiter()`
    — `true` kalau `partialFillsCounted` (SUDAH dihitung sebelumnya) >=
    ambang. 0 rumus baru, murni hitung ulang angka yang sudah ada
    (`partials.length`).
- `modules/vehicle/fuel-card.js`:
  - `_partialFillDriftHint(vehicleId)` (BARU) — 100% REUSE
    `FuelStateEstimator.estimateCurrentLiter().partialFillDriftRisk`,
    pola guard identik `_kmClampedHint()`/`_lowConfidenceHint()`.
  - `_body()` — sisipkan nudge "⚠️ Sudah beberapa kali isi BBM parsial
    berturut-turut. Disarankan Full Tank atau koreksi manual biar akurat
    lagi." di antara nudge km-clamped & nudge low-confidence — ketiganya
    independen, bisa tampil bersamaan.
- `tests/fuel-state-estimator.test.js` — 3 test baru (drift risk true/
  false berdasar ambang, referenceKm null tetap false).
- `tests/fuel-card.test.js` — 7 test baru (`_partialFillDriftHint()` 4
  kasus guard, nudge tampil/tidak tampil/bersamaan dgn km-clamped).
- 0 field `D`/`fuelState` baru ditulis — murni derivasi dari data yang
  sudah ada (log BBM parsial, sudah dihitung `_partialFillsSince()`
  sejak s415).

## Verifikasi

- `node --test tests/*.test.js` → **2836/2836 pass** (2826 lama + 10
  baru), 0 fail.
- `node scripts/build.js s422-fuel-estimation-partial-fill-drift-guard`
  → build sukses, sintaks kedua bundle valid, versi `v1128` -> `v1129`.

## Status rencana "Fuel Estimation Auto-Update"

SELESAI SEPENUHNYA — Sesi 1-6 asli (s415-s420) + ketiga "saran tambahan"
(s421: nudge km-clamped + badge skor eksplisit; s422: guard partial-fill
drift) semua sudah dikerjakan. 0 item tersisa dari rencana ini.
