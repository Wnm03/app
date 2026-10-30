# Session Note — Sesi B, CODING gap (a): `DatabaseAPI.vehicle.registerSource()` (v1665)

## Task
`ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md` §2g/§7 — giliran sesi
berikutnya: **sesi CODING gap (a)**, syarat mulai 3 keputusan terbuka di
`DESAIN-SESI-B-GAP-A-VEHICLE-DB-REGISTRASI.md` §5 dijawab W dulu.

## 3 keputusan §5 — dijawab W sebelum coding dimulai
1. **Additive (A)** — `VEHICLE_DB_RECORDS` TIDAK dihapus sesi ini, tetap
   fallback paling akhir. Full-cutover (opsi B) ditunda ke sesi terpisah.
2. **Nama fungsi: `registerSource`** — dipakai apa adanya.
3. **Pairing toleran** torsi-only/spec-only — record dgn cuma salah satu
   field tetap terdaftar, field lain `undefined`.

Implementasi mengikuti persis rencana desain v1664 (§7 dokumen desain),
tidak ada penyimpangan dari yang dirancang.

## Perubahan

### `modules/engine/database-api.js`
- `_registeredVehicleSource` (state baru, `null` = belum ada registrasi).
- `dbVehicleRegisterSource(entries)` — validasi `Array.isArray`, no-op
  kalau bukan array.
- `_vehicleDbRecords()` jadi 3-tier: `_vehicleDbActiveRecords ||
  _registeredVehicleSource || VEHICLE_DB_RECORDS`.
- `_vehicleModelRecords()` — cabang baru: kalau `_vehicleDbActiveRecords`
  kosong TAPI `_registeredVehicleSource` ada, turunkan model list dari
  situ (bukan `VEHICLE_MODELS` literal beku). Ekstrak mapping jadi helper
  `_toVehicleModelRecord(r)` supaya tidak duplikasi logic antara 2 cabang.
- `_vehicleDbDoLoad()` — baris seed diganti dari
  `VEHICLE_DB_RECORDS.slice()` jadi `_vehicleDbRecords().slice()` (di
  titik ini `_vehicleDbActiveRecords` masih `null`, jadi otomatis jatuh
  ke `_registeredVehicleSource || VEHICLE_DB_RECORDS`).
- `DatabaseAPI.vehicle.registerSource` — expose di namespace publik.

### `modules/vehicle/sparepart-servis-b.js`
- `id`/`displayName` additive ditambah ke 2 entri `TORSI_DB`
  (`vario-125`, `beat-fi`) dan 2 entri `VEHICLE_SPEC_DB` (sama id) — 0
  field/nilai lama diubah, diverifikasi `findTorsiDb()`/`findVehicleSpec()`
  tidak membaca field ini (0 dampak titik baca lama).
- IIFE `_registerVehicleDbSource()` ditambah top-level, tepat setelah
  `VEHICLE_SPEC_DB` selesai didefinisikan (sebelum `findVehicleSpec`):
  guard `typeof DatabaseAPI==='undefined'` (pola sama 4 konsumen lain),
  pairing by `id` lewat objek `byId`, panggil
  `DatabaseAPI.vehicle.registerSource(Object.values(byId))`.

### Test baru
`tests/database-api-vehicledb-registersource-sesi-gap-a.test.js` — 13
test, cakupan persis §6 dokumen desain:
- `registerSource()` dgn data override → `getAll()`/`getById()`/
  `findTorsiByName()`/`findSpecByName()` semua baca dari situ.
- Argumen bukan array → no-op.
- Pairing toleran: torsi-only (spec `undefined`), spec-only (torsi
  `undefined`).
- `DatabaseAPI.vehicleModel.getAll()` ikut pakai registered source
  walau storage IndexedDB belum pernah dimuat.
- Seed IndexedDB (`ensureLoaded()` storage kosong): dgn registerSource
  → seed dari situ; tanpa → tetap `VEHICLE_DB_RECORDS` literal (0
  regresi).
- Muat KEDUA file bersama (pola nyata app): registerSource() otomatis
  terpanggil, hasil `getAll()`/`findTorsiByName()`/`findSpecByName()`
  IDENTIK dgn sebelum sesi ini (parity by construction) — termasuk
  verifikasi eksplisit `matchNames` torsi vs spec BeAT FI TETAP beda
  (`vario 110` cuma di torsi) setelah pairing by id, sesuai catatan
  desain §3.
- Konsumen lama (`findTorsiDb()`/`findVehicleSpec()` di
  `sparepart-servis-b.js`) tetap dapat hasil sama lewat DatabaseAPI.
- 0 regresi: `database-api.js` sendirian → fallback literal;
  `sparepart-servis-b.js` sendirian → IIFE no-op, literal tetap jalan.

## Verifikasi
- `node --check` kedua file diubah: lolos.
- `node --test tests/database-api-*.test.js
  tests/suggest-service-interval-database-api-wiring-v1645.test.js
  tests/collect-known-groups-database-api-wiring-v1645.test.js` — 64/64
  pass (semua test lama area vehicle/database-api, 0 regresi).
- `node --test` (full suite, checkout dgn patch): **6373 test, 6367
  pass, 6 fail.**
- `node --test` (full suite, checkout ASLI tanpa patch, dijalankan
  ulang sebagai pembanding): **6360 test, 6354 pass, 6 fail** — **6
  kegagalan yang sama persis** (`lifeos/adapters/s456-goal-adapter-
  exclude-titipan.test.js`, `self-test.js`,
  `verify-release-ready (end-to-end) — eslint TIDAK TERSEDIA + override
  valid...`, `checkBundleFreshness() — repo asli saat ini...`, `S468d
  skenario gabungan...`, `txHTML() — item virtual (prefix vbill_)...`).
  **Dikonfirmasi 100% pre-existing, tidak tersentuh patch ini** — 0
  regresi baru dari sesi ini. Selisih 13 test = 13 test baru sesi ini,
  semua pass.

## Status roadmap setelah sesi ini
**Fase 1 TUNTAS 5/5.** Larangan §6 ("jangan loncat ke Fase 2 sebelum
Fase 1 tuntas") resmi lepas. **Sesi D** (`service_categories`
13-kategori-terkunci) boleh mulai di sesi berikutnya. `VEHICLE_DB_RECORDS`
literal sengaja masih ada (keputusan additive) — full-cutover (hapus
literal + update 7 test) tetap item Critical §3 terakhir yang belum
dikerjakan, ditunda ke sesi terpisah lagi, 0 urgensi karena literal
sudah mati di produksi (selalu kalah dari registered source begitu
`sparepart-servis-b.js` ikut termuat, yang selalu terjadi di app nyata).

## ZIP delta ini
Isi HANYA file yang diubah/ditambah sesi ini (bukan checkout penuh):
- `modules/engine/database-api.js` (diubah)
- `modules/vehicle/sparepart-servis-b.js` (diubah)
- `tests/database-api-vehicledb-registersource-sesi-gap-a.test.js` (baru)
- `ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md` (diubah — §2h baru, banner
  §7, baris Sesi B & Sesi D)
- `CHANGELOG.md` (diubah — entri v1665 ditambah di atas)
- `SESSION-NOTE-sesi-b-gap-a-coding-registersource-v1665.md` (baru, file
  ini)
