# PATCH S2433.1 — Kompatibilitas komponen servis per tipe kendaraan (kumulatif di atas S2433)
Base: app-main (15). Build: s2041-1-part-sot-hardening-2326. Mencakup seluruh isi PATCH-S2433.

## Perubahan
- data/database-kategori-komponen-servis.json: metadata aditif per komponen (vehicleTypeScope, bodyTypeScope, modelScope, universal, scopeStatus). 102 item/id tidak berubah.
- scripts/generate-service-master-data.js (+ modules/vehicle/service-master-data.generated.js): meneruskan field baru (jalur eager & lazy).
- scripts/apply-service-component-scope.js (baru, idempoten): sumber klasifikasi 59 universal / 12 motor / 18 motor matic (CVT) / 13 belum pasti.
- servis-checklist.js: isItemApplicable/isItemVisible/visibleItemsOfGroup/scopeKeyForVehicle (proyeksi; indeks item tidak berubah).
- servis.js: kartu checklist menyembunyikan komponen tak kompatibel (kecuali sudah punya state); hitungan memakai item tampil.
- sparepart-servis.js: kategori tak kompatibel tidak diproyeksikan; kunci memo ikut tipe/model kendaraan.
- Aturan konservatif: tipe tak dikenal/listrik/bodyType kosong/unverified => tetap tampil. Master & riwayat tidak dihapus.
- Tes baru: tests/servis-component-scope-s24331.test.js (8). tests/service-master-data-lazy-s2397.test.js: checksum master diperbarui (perubahan master disengaja).
- docs/INVENTARIS-KOMPATIBILITAS-KOMPONEN-S2433-1.md: klasifikasi 102 item.

## Verifikasi
Full test (32 shard): 8830 tes, 8828 lulus, 1 gagal, 1 skip. Satu-satunya gagal = absensi (payroll-absensi-minggu-template-sabs1 #169), gagal identik di baseline. service-sot-gate: 9 pemeriksaan servis PASS; gate hanya FAIL karena tes absensi tersebut.
audit:sot/architecture/carnotes/patch-integrity, verify-bundle, verify-version-integrity PASS.
