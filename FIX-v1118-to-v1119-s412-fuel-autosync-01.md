# FIX v1118 -> v1119 — Sesi 412 (FUEL-AUTOSYNC-01)

## Ringkasan

`FuelPredictionEngine`/`FuelInsightEngine.getReserveStatus()` sekarang
dapat data otomatis begitu user catat isi BBM **full tank** — sebelumnya
kedua fitur ini selalu minta "lakukan Koreksi BBM dulu" walau user sudah
rajin catat transaksi BBM, karena `D.vehicles[i].fuelState.
currentFuelLiter` cuma ditulis lewat tombol manual "⚙️ Koreksi".

## File yang berubah

- `modules/finance/tx-bbm.js` — fungsi baru `syncFuelStateFromFullTankBbm()`,
  dipanggil dari `recordBbmLog()`.
- `tests/fuel-state-autosync.test.js` — baru, 7 test.
- `app-bundle-b.min.js` — hasil build ulang (tx-bbm.js ada di GROUP_B).
- `app-bundle-a.min.js`, `index.html`, `app_production.html`, `sw.js` —
  ikut ter-update krn bump versi global (v1118 -> v1119), isi fungsional
  GROUP_A tidak berubah.
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` — regenerasi otomatis
  oleh `build.js`.

## Cakupan & batasan (lihat `s412-SESSION-NOTE.md` untuk detail)

✅ Isi BBM **full tank** (baik lewat modal "Catat Isi BBM" maupun toggle
"Sinkron BBM" di form Transaksi) → `fuelState` auto tertulis,
`estimatedSource:'auto-bbm-log-full'`, `confidenceScore:90`.

❌ Isi BBM **parsial** → belum ada update otomatis (butuh formula
akumulasi+depletion km, sesi terpisah).
❌ Belum ada peluruhan `confidenceScore`/estimasi berbasis waktu-km
setelah full-tank fill (sesi terpisah).

## Verifikasi

- `node --test tests/*.test.js` → 2739/2739 pass.
- `node scripts/build.js s412-fuel-autosync-01` → build sukses, sintaks
  valid.
