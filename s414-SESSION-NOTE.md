# Sesi 414 (FUEL-AUTOSYNC-03, lanjutan rencana "Fuel Estimation Auto-Update")

## Konteks

Lanjutan dari s412 (full-tank auto-sync) & s413 (badge sumber estimasi).
Dari sisa rencana (6 sesi inti + saran tambahan), dipilih **histori
estimasi** — item yang di rencana asli ditandai "opsional, bukan
prioritas", tapi paling ringan di antara SISA yang belum dikerjakan:
tidak bergantung ke `estimateCurrentLiter()` (Sesi 1 asli rencana, belum
ada) krn cuma menyalin field yang SUDAH ditulis 2 jalur yang sudah ada
(`FuelBarCorrection.save()` & `syncFuelStateFromFullTankBbm()`). Guard KM
non-monoton & guard akumulasi error fill-parsial (saran tambahan lain)
TIDAK bisa dikerjakan duluan krn keduanya baru relevan setelah
`estimateCurrentLiter()` (Sesi 1 asli) ada — jadi ditunda.

## Perubahan

- `modules/vehicle/fuel-state-history.js` (BARU) — modul `FuelStateHistory`,
  lapisan simpan+baca murni (pola sama persis `FuelStorage`/`D.bbmLogs`):
  - `record(vehicleId, fuelState)` — tambah 1 snapshot ke koleksi flat
    baru `D.fuelStateHistory` (currentFuelBar/currentFuelLiter/
    estimatedSource/confidenceScore/recordedAt, disalin APA ADANYA dari
    fuelState yang diberikan — 0 kalkulasi baru). Diam kalau `D`/
    `vehicleId`/`fuelState.currentFuelLiter` tidak valid.
  - `_trim(vehicleId)` — cap `MAX_ENTRIES_PER_VEHICLE` (200) PER
    kendaraan, buang entry TERLAMA milik kendaraan itu saja (kendaraan
    lain tidak ikut terpotong).
  - `list(vehicleId?)`/`latest(vehicleId?)`/`count(vehicleId?)` — read
    helper, guard `D`/`D.fuelStateHistory` belum ada.
- `modules/vehicle/fuel-intelligence-ui.js`: `FuelBarCorrection.save()`
  — tambah 1 baris `FuelStateHistory.record(this.curVehicleId,
  veh.fuelState)` tepat setelah `veh.fuelState` ditulis (sebelum
  `save()` global). Guard `typeof FuelStateHistory` — diam kalau modul
  belum dimuat, TIDAK PERNAH menggagalkan koreksi manual gara-gara
  histori opsional ini.
- `modules/finance/tx-bbm.js`: `syncFuelStateFromFullTankBbm()` — baris
  yang sama persis, dipanggil setelah `veh.fuelState` full-tank ditulis.
- `scripts/build.js`: daftarkan `fuel-state-history.js` di GROUP_A,
  ditaruh berdekatan dgn `fuel-storage.js` (lapisan data domain fuel yang
  sama, 0 dependency). Urutan tepatnya tidak kritikal krn konsumennya
  baca lewat guard `typeof` di dalam fungsi (runtime, bukan saat
  parse/load bundle) — pola sama persis `tx-bbm.js` yang sudah lebih
  dulu ada di GROUP_B walau referensi modul GROUP_A.
- Test baru:
  - `tests/fuel-state-history.test.js` (9 test) — coverage penuh modul
    baru: record/list/latest/count, guard field kosong/tidak valid, cap
    `MAX_ENTRIES_PER_VEHICLE` per-kendaraan, guard `D` belum ada.
  - `tests/fuel-state-autosync.test.js` (+3 test) — integrasi
    `syncFuelStateFromFullTankBbm()` -> `FuelStateHistory.record()`:
    snapshot tercatat saat full-tank, TIDAK tercatat saat parsial, guard
    `typeof FuelStateHistory` tidak dimuat.
  - `tests/fuel-intelligence-ui.test.js` (+2 test) — integrasi
    `FuelBarCorrection.save()` -> `FuelStateHistory.record()`: dipanggil
    dgn `fuelState` yang PERSIS baru ditulis, guard tidak dimuat.

## Yang BELUM ditangani (sisa rencana)

- Belum ada UI/konsumen apa pun yang MEMBACA `D.fuelStateHistory` —
  sesi ini murni menulis histori, belum ada fitur "validasi akurasi vs
  realita" yang direncanakan memakainya (bukan prioritas sesi ini).
- Sesi 1 asli rencana: `estimateCurrentLiter()` pure engine (akumulasi
  fill parsial + km driven) — masih paling berat & jadi fondasi Sesi 2-6.
- Sesi 2-6 & guard KM non-monoton/akumulasi error fill-parsial — semua
  masih menunggu Sesi 1.
- Audit `withSaveGuard()` utk penulisan `fuelState` — dicek: `withSave
  Guard()` di codebase ini spesifik utk proteksi double-submit tombol
  Simpan MODAL (butuh `modalId` & cek `.open` class), BUKAN wrapper
  generik utk sembarang penulisan `D`. `FuelBarCorrection.save()` sendiri
  (penulis `fuelState` yang sudah ada sejak TASK-144) juga belum
  memakainya — di luar scope sesi kecil ini utk diubah (perubahan pada
  fungsi save() modal yang sudah stabil butuh sesi terpisah & lebih
  hati-hati, bukan "1 baris tambahan" seperti histori).

## Verifikasi

- `node --test tests/*.test.js` → **2760/2760 pass** (2746 lama + 14
  baru: 9 + 3 + 2), 0 fail.
- `node scripts/build.js s414-fuel-state-history` → build sukses,
  sintaks kedua bundle valid, versi `v1120` -> `v1121`.
