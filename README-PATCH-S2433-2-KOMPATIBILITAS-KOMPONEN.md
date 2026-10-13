# PATCH S2433.2 — Perbaikan hasil audit S2433.1 (kumulatif di atas S2433 + S2433.1)
Base: app-main (15). Build: s2041-1-part-sot-hardening-2329. Mencakup seluruh isi PATCH-S2433-1 (tanpa file S2433.1 yang dihapus).

## Perubahan
1. **Prioritas `jenis` vs `vehicleType`** (bug di S2433.1): `servis-checklist.js _vehicleProfile` kini `jenis` (field yang diedit user) > `vehicleType` (turunan provisioning) > `type`. Hanya BACA (proyeksi tampilan). Jalur tulis edit kendaraan (`vehicle-core.js`) TIDAK diubah: percobaan menyinkronkan `vehicleType` terbukti memunculkan `SOT_VEHICLE_TYPE_MISMATCH` pada audit `VehicleCarNotesSOT` (snapshot `sot.vehicleType` basi), sehingga dicabut.
2. **Normalisasi id kendaraan campuran angka/string** (`String()`; nullish tetap strict agar perilaku lama terjaga):
   - `sparepart-servis.js`: `catVisibleForVehicle`, `Sparepart.isPartForVehicle`, 6 filter `servisLogs` (helper lokal `_spVidEq`).
   - `service-event-adapter.js`: `findServiceEventForTransaction`, `findServiceEventByIdempotencyKey`, `isServiceEventForVehicle` (helper `_seaVidEq`).
   - `tx-servis.js`: guard isolasi P14 (2 tempat), kandidat `existingServisId`, `ServisChecklist._vehicleId` vs `vehicleId`.
   - `fuel-storage.js`: `FuelStorage.logs(vehicleId)`.
3. **Chip "Kategori Servis"** (`servis.js renderServiceMasterCategoryChips`): kategori tanpa komponen tampil bagi kendaraan aktif disembunyikan (mobil tidak lagi melihat "Servis CVT"/kartu kosong 0/0). Kategori yang sudah terpilih tetap tampil.
4. **Dropdown "Komponen"** (`servis.js renderServiceComponentFilter`): hanya komponen yang `isItemVisible` bagi kendaraan aktif (komponen ber-state tetap tampil).

## Jaminan SOT (tidak ada data/SOT tersimpan yang berubah)
- Semua perubahan kode bersifat baca-saja/tampilan: tidak ada penulisan ke D.vehicles, D.servisLogs, D.bbmLogs, D.sparepartCats, master servis, maupun `vehicle.sot`. Dibuktikan tes snapshot (S2433.2 tes ke-6).
- data/database-kategori-komponen-servis.json & service-master-data.generated.js identik dengan S2433.1; vehicle-core.js identik dengan S2433.1.
- scripts/service-sot-integrity-gate.js: pemeriksaan VEHICLE ISOLATION kini menerima `_seaVidEq(log.vehicleId, vehicleId)` selain `log.vehicleId === vehicleId` (batas kendaraan tetap wajib). Satu-satunya perubahan pada gate.
- Divergensi lama yang MASIH ADA (bukan dibuat patch ini, butuh keputusan): konsumen SOT `vehicle-active-sot-s2061.js`, `vehicle-car-notes-sot-s2071.js` (3 tempat), `vehicle-sot-provisioning.js:109`, membaca `vehicleType||jenis`, sedangkan proyeksi S2433 membaca `jenis||vehicleType`. Pada kendaraan yang `jenis`-nya diedit, `vehicleType` basi sehingga kedua pihak bisa berbeda.

## Sengaja TIDAK diubah (butuh keputusan)
`ServiceInputCatalog`, `ServiceTaxonomySOT`, penyebut `summaryFromLog` (102), `ServisChecklist.renderHtml()`; ~60 perbandingan `===` id lain (mis. `backup-restore.js:533,579`, `servis-b.js:211`) — dibiarkan agar riwayat/restore tidak berubah diam-diam.

## Tes
- Baru: tests/servis-component-scope-s24332.test.js (6 tes; semuanya GAGAL pada bundle S2433.1, LULUS sekarang).
- tests/service-vehicle-isolation-p14.test.js: pencocokan teks diperbarui ke bentuk `String(...)` (perubahan disengaja).
- Full test (32 shard): 8836 tes, 8834 lulus, 1 gagal, 1 skip. Satu-satunya gagal = absensi (payroll-absensi-minggu-template-sabs1 #169), identik dgn baseline S2433.1.
- service-sot-gate: 9 pemeriksaan servis PASS (gate hanya FAIL di FULL REGRESSION karena tes absensi yang sama). verify-bundle, audit:sot, audit:architecture, audit:carnotes, audit:patch-integrity, verify-window-expose: PASS. Bundle dibangun dengan `node scripts/build.js --require-minify` (bukan bump manual).
