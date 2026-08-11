# FIX v1122 -> v1123 — Sesi 416 (FUEL-AUTOSYNC-05, SSOT write hook partial fill)

## Ringkasan

`recordBbmLog()` sekarang menulis `fuelState` juga untuk isi BBM PARSIAL
(sebelumnya cuma full tank/koreksi manual) — pakai
`FuelStateEstimator.estimateCurrentLiter()` (s415), `estimatedSource:
'auto-bbm-log'`, `confidenceScore:70`. `referenceKm` diperbarui tiap
tulis supaya tidak dobel-hitung akumulasi di panggilan berikutnya.

## File yang berubah

- `modules/finance/tx-bbm.js` — `recordBbmLog()` panggil fungsi baru
  `syncFuelStateFromEstimator()` di cabang non-full-tank.
- `tests/fuel-state-estimator-sync.test.js` — baru, 6 test.
- `tests/fuel-state-autosync.test.js` — 2 nama/komentar test disesuaikan
  (0 perubahan assertion).
- `app-bundle-a.min.js`, `app-bundle-b.min.js` — hasil build ulang.
- `index.html`, `app_production.html`, `sw.js` — bump versi (v1122 ->
  v1123).
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` — regenerasi
  otomatis.

## Cakupan & batasan (lihat `s416-SESSION-NOTE.md`)

- Kalau belum pernah ada titik acuan sama sekali (belum pernah koreksi
  manual/full-tank fill), isi parsial TETAP tidak menulis apa pun (sama
  seperti sebelum sesi ini) — perilaku ini SENGAJA, bukan bug.
- Belum ada UI yang berubah — badge sumber estimasi (`fuel-card.js`, s413)
  otomatis ikut menampilkan `auto-bbm-log` begitu field ini terisi, tapi
  0 perubahan kode di file itu sesi ini.

## Verifikasi

```
node --test tests/*.test.js
# 2776/2776 pass (naik dari 2770, +6 test baru)

node scripts/build.js s416-fuel-state-autosync-partial
# ✅ build sukses, sintaks valid, v1122 -> v1123
```
