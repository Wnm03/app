# S2040 — Car Notes Maintenance untuk Motor Lama

## Scope
Car Notes hanya menangani maintenance motor lama/existing. KPB dan milestone motor baru tidak dibuat di Car Notes; workflow motor baru tetap dapat ditangani oleh Motorku X.

## Perubahan
- `modules/vehicle/service-legacy-maintenance.js`
  - profile `legacy` eksplisit
  - baseline dari history servis aktual + KM aktual
  - interval action-aware: periksa / bersih / ganti
  - tidak membuat due date palsu jika action belum punya history
  - audit profile/history
- `modules/vehicle/sparepart-servis.js`
  - jika profile legacy aktif, urgency memakai engine S2040 sebelum fallback reminder lama
- `modules/vehicle/vehicle-core.js`
  - checkbox **Motor lama — mode maintenance Car Notes** pada form motor
  - aktivasi/deaktivasi profile tersimpan per kendaraan
- `scripts/build.js`
  - mendaftarkan modul S2040 ke production bundle
- `tests/service-legacy-maintenance-s2040.test.js`
  - 4 test khusus legacy maintenance

## Perilaku
1. Edit/tambah motor dan centang **Motor lama — mode maintenance Car Notes**.
2. Car Notes memakai servis terakhir yang benar-benar tercatat sebagai baseline.
3. Tidak ada KPB 1.000 km / KPB 2 / KPB 3 / KPB 4 di engine ini.
4. Jika history tindakan tertentu belum ada, statusnya `BASELINE_REQUIRED`, bukan mengarang servis terakhir.
5. History lama tidak dimutasi.

## Verification
- S2040 tests: PASS 4/4
- Combined service regression: PASS 32/32 pada run terakhir sebelum packaging
- Production build: PASS
- Bundle syntax: PASS (`node --check` A dan B)
- Build version: 2149

## Catatan build
Environment audit ini tidak memiliki `esbuild`, sehingga build menghasilkan bundle valid tetapi belum diminify. Untuk production-size normal, jalankan build di environment proyek yang memiliki `esbuild`.
