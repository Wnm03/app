# FIX v1126 -> v1127 — Sesi 420 (FUEL-AUTOSYNC-09, regression suite Sesi 1-5)

## Ringkasan

Item TERAKHIR rencana "Fuel Estimation Auto-Update" (Sesi 6): regression
test suite komprehensif lintas Sesi 1-5 (s415-s419). Sesi-sesi
sebelumnya masing-masing menguji SATU modul terisolasi (dependency lain
di-mock) — sesi ini memuat SEMUA modul asli rantai fitur ini bersamaan
dalam satu sandbox & menjalankan skenario dunia-nyata end-to-end (full-
tank fill -> partial fill -> km berjalan -> decay confidence), lalu
memverifikasi invarian lintas modul yang belum pernah dites bersamaan:
konsistensi liter/confidence di semua konsumen (FuelCard/
FuelPredictionEngine/FuelCostAnalytics/FuelInsightEngine), rebasing
referenceKm (0 double-count), full-tank fill sbg ground truth (reset
drift), guard "0 breaking change" saat FuelStateEstimator absen (semua
konsumen fallback serentak), backward-compat data lama, guard km
non-monoton, dan isolasi antar-kendaraan. 0 perubahan ke source
`modules/**/*.js` — murni menambah test.

## File yang berubah

- `tests/fuel-estimation-autoupdate-regression-s420.test.js` (BARU, 12
  test).

## Verifikasi

- `node --test tests/*.test.js` -> 2816/2816 pass (2804 lama + 12 baru),
  0 fail.
- `node scripts/build.js s420-fuel-estimation-regression-suite` -> build
  sukses, sintaks kedua bundle valid, versi v1126 -> v1127.
