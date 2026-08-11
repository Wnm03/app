# FIX v1121 -> v1122 — Sesi 415 (FUEL-AUTOSYNC-04, `estimateCurrentLiter()`)

## Ringkasan

Fondasi (Sesi 1 asli rencana "Fuel Estimation Auto-Update"): modul baru
`FuelStateEstimator.estimateCurrentLiter(vehicleId)` — rumus terpusat
buat estimasi liter BBM terkini dari titik acuan terakhir (koreksi manual
atau full-tank fill, mana yang lebih baru) + akumulasi log BBM parsial +
konsumsi km sejak titik acuan. Pure engine, 0 nulis ke D, 0 UI — belum
ada konsumen yang memakainya (itu Sesi 2-6 lanjutan).

## File yang berubah

- `modules/vehicle/fuel-state-estimator.js` — BARU, modul
  `FuelStateEstimator`.
- `modules/vehicle/fuel-intelligence-ui.js` — `FuelBarCorrection.save()`
  tambah field `referenceKm` ke `fuelState` yang ditulis.
- `modules/finance/tx-bbm.js` — `syncFuelStateFromFullTankBbm()` tambah
  field `referenceKm` ke `fuelState` yang ditulis.
- `scripts/build.js` — daftarkan `fuel-state-estimator.js` di GROUP_A.
- `tests/fuel-state-estimator.test.js` — baru, 10 test.
- `app-bundle-a.min.js`, `app-bundle-b.min.js` — hasil build ulang.
- `index.html`, `app_production.html`, `sw.js` — bump versi global
  (v1121 -> v1122).
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` — regenerasi
  otomatis oleh `build.js`.

## Cakupan & batasan (lihat `s415-SESSION-NOTE.md` untuk detail)

- Field `referenceKm` BARU pada `fuelState` — data lama (ditulis sebelum
  sesi ini) tidak punya field ini. Engine menangani ini via
  `estimationLimited:true` (balikin `baseLiter` apa adanya, tanpa
  extrapolasi km) — TIDAK ada migrasi data diperlukan, TIDAK ada
  perilaku lama yang berubah.
- Guard km non-monoton versi DASAR sudah ada (clamp diam-diam ke 0,
  `kmClamped:true`) — versi lengkap dgn nudge UI masih ditunda.
- Belum ada UI/konsumen apa pun yang memanggil
  `FuelStateEstimator.estimateCurrentLiter()` — 0 perubahan perilaku
  yang terlihat user di sesi ini (murni fondasi backend).

## Verifikasi

```
node --test tests/*.test.js
# 2770/2770 pass (naik dari 2760, +10 test baru)

node scripts/build.js s415-fuel-state-estimator
# ✅ build sukses, sintaks valid, v1121 -> v1122
```
