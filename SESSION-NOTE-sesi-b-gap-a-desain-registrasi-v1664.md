# Session Note — Sesi B Gap (a): Desain Mekanisme Registrasi (v1664)

## Konteks
Lanjutan dari ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §2f/§7 (urutan
sesi ringan berikutnya poin 1, status v1663): "Sesi B — sesi desain
tersendiri untuk gap (a) (`VEHICLE_DB_RECORDS` literal → mekanisme
registrasi `TORSI_DB`/`VEHICLE_SPEC_DB` ke `DatabaseAPI`) → baru setelah
ini Fase 1 TUNTAS & Sesi D boleh mulai." Sesuai keputusan eksplisit v1661
— gap ini butuh desain+review dulu, bukan langsung coding.

## Yang dikerjakan
**0 (nol) kode produksi diubah sesi ini.** Murni sesi desain, sama
filosofi sesi audit sebelumnya (mis. `AUDIT-SESI-C-EVENTBUS-D-WRITES-NO-EMIT.md`
v1651, 0 kode).

Isi: `DESAIN-SESI-B-GAP-A-VEHICLE-DB-REGISTRASI.md` — audit kode
lengkap (`database-api.js` + `sparepart-servis-b.js` + urutan muat
`scripts/build.js` GROUP_B + 7 file test yang me-load `database-api.js`
standalone lewat `loadSource()`), lalu rancangan:
- API `DatabaseAPI.vehicle.registerSource(entries)` — dipanggil
  `sparepart-servis-b.js` di top-level setelah `TORSI_DB`/`VEHICLE_SPEC_DB`
  didefinisikan. Timing aman: `ensureLoaded()` (pemanggil nyata pertama)
  baru jalan runtime setelah SEMUA script (termasuk `sparepart-servis-b.js`)
  selesai dieksekusi saat page load — dikonfirmasi lewat titik panggil
  `ensureLoaded()` di `features-helpers-global-security.js` (`load()`).
- Perlu tambah field `id`/`displayName` (additive) ke tiap entri
  `TORSI_DB`/`VEHICLE_SPEC_DB` supaya bisa dipasangkan jadi 1 record —
  `matchNames` torsi vs spec TIDAK bisa dipakai sebagai kunci pasangan
  karena sengaja beda untuk BeAT FI (dikonfirmasi lewat
  `database-api-vehicle-migration.test.js`, bagian "perilaku asimetris").
- `_vehicleDbRecords()` jadi 3-tier:
  `_vehicleDbActiveRecords (IndexedDB) > _registeredVehicleSource > VEHICLE_DB_RECORDS (literal)`.
  `_vehicleModelRecords()` & seed `_vehicleDbDoLoad()` perlu 1 titik
  tambahan masing-masing supaya ikut 3-tier ini (detail di dokumen).

## Keputusan yang SENGAJA tidak ditebak (perlu jawaban W)
1. **Additive (literal `VEHICLE_DB_RECORDS` TETAP ADA, jadi fallback
   mati di produksi tapi masih dipakai 7 test standalone) vs full
   cutover (hapus literal + ubah 7 test sekaligus).** Direkomendasikan
   additive untuk sesi coding berikutnya; full cutover diusulkan jadi
   sesi terpisah LAGI setelahnya (selaras urutan yang sudah tertulis di
   roadmap §3 Critical — 2 baris terpisah, bukan 1 langkah).
2. Nama fungsi (`registerSource` diusulkan, bukan keputusan final).
3. Perilaku pairing kalau kendaraan baru nanti cuma punya `torsi` ATAU
   `spec` saja (toleran diusulkan, bukan wajib keduanya).

## Kenapa tidak sekalian coding
`ensureLoaded()` sudah diaudit teliti 2x sebelumnya (v1650 gap awal,
v1661 followup dedup) dan keduanya secara eksplisit MENOLAK perubahan di
luar cakupan sempit yang diminta saat itu. Mekanisme registrasi ini
menyentuh 4 fungsi inti (`_vehicleDbRecords`, `_vehicleModelRecords`,
`_vehicleDbDoLoad`, ditambah API baru) + file kedua
(`sparepart-servis-b.js`) + berpotensi 7 file test — cakupannya jelas di
luar "1 gap kecil", konsisten dengan alasan v1661 menunda ini jadi sesi
sendiri. Keputusan §5 (dokumen desain) perlu dijawab dulu supaya sesi
coding tidak menebak-nebak arah yang mungkin harus diulang.

## Belum / sengaja tidak dikerjakan
- Kode `registerSource()` itu sendiri — menunggu keputusan §5.
- Sesi D (`service_categories`) — TETAP menunggu, larangan §6 belum
  lepas sampai sesi coding gap (a) ini benar-benar tuntas & hijau.
- Perubahan test apa pun — sesi ini 0 kode termasuk 0 test baru.

## File yang berubah/ditambah
- `DESAIN-SESI-B-GAP-A-VEHICLE-DB-REGISTRASI.md` (baru)
- `SESSION-NOTE-sesi-b-gap-a-desain-registrasi-v1664.md` (baru, file ini)
- `ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md` (§2g baru, banner §7
  diperbarui)
- `CHANGELOG.md` (entri v1664)
