# FIX v1120 -> v1121 — Sesi 414 (FUEL-AUTOSYNC-03, histori estimasi)

## Ringkasan

Tiap kali `fuelState` kendaraan ditulis (baik lewat koreksi manual "⚙️
Koreksi" maupun auto-sync full-tank BBM), sekarang tersimpan juga 1
snapshot ke koleksi baru `D.fuelStateHistory` — bahan buat validasi
akurasi rumus estimasi / fitur "seberapa akurat estimasi vs realita" di
masa depan. Murni tambahan data (0 UI baru, 0 rumus baru, 0 field
`fuelState` yang ada berubah).

## File yang berubah

- `modules/vehicle/fuel-state-history.js` — BARU, modul `FuelStateHistory`.
- `modules/vehicle/fuel-intelligence-ui.js` — `FuelBarCorrection.save()`
  panggil `FuelStateHistory.record()`.
- `modules/finance/tx-bbm.js` — `syncFuelStateFromFullTankBbm()` panggil
  `FuelStateHistory.record()`.
- `scripts/build.js` — daftarkan `fuel-state-history.js` di GROUP_A.
- `tests/fuel-state-history.test.js` — baru, 9 test.
- `tests/fuel-state-autosync.test.js`, `tests/fuel-intelligence-ui.test.js`
  — +3/+2 test integrasi.
- `app-bundle-a.min.js` — hasil build ulang (semua file di atas GROUP_A).
- `index.html`, `app_production.html`, `sw.js` — bump versi global
  (v1120 -> v1121).
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` — regenerasi
  otomatis oleh `build.js`.

## Cakupan & batasan (lihat `s414-SESSION-NOTE.md` untuk detail)

✅ Snapshot tercatat otomatis di 2 jalur yang sudah menulis `fuelState`
(manual & auto full-tank), dgn cap 200 entry per kendaraan.
✅ Guard lengkap: `D` belum ada, `vehicleId` kosong, `fuelState` tanpa
`currentFuelLiter` valid — semua diam (tidak menulis, tidak throw).

❌ Belum ada UI/fitur yang MEMBACA `D.fuelStateHistory` — sesi ini murni
menulis histori.
❌ Isi BBM parsial masih belum mengubah `fuelState` sama sekali (jadi
juga belum masuk histori) — masih menunggu Sesi 1 asli rencana
(`estimateCurrentLiter()`).

## Verifikasi

- `node --test tests/*.test.js` → 2760/2760 pass.
- `node scripts/build.js s414-fuel-state-history` → build sukses, sintaks
  kedua bundle valid.
