# PATCH S1868 — Dynamic Vehicle Onboarding & Maintenance Template

Patch ini adalah **cumulative patch** berbasis workspace yang sudah memuat S1863, S1864, S1865, S1866, dan S1867. Tidak mengganti atau menghapus pekerjaan sesi sebelumnya.

## Fitur utama

- Tambah kendaraan tetap memakai `vehicleModal` dan `saveVehicle()` existing.
- Pilihan `Jenis Kendaraan` menghasilkan template kategori + komponen perawatan berkala secara dinamis.
- User dapat memilih komponen sebelum kendaraan dibuat.
- Template tersimpan di `D.vehicles[].maintenanceTemplate` sebagai projection/metadata.
- Service Master tetap menjadi SOT komponen.
- Katalog PDF S1867 dapat dipakai untuk memperkaya template melalui `vehicleId`.
- Interval hanya berasal dari Service Master/evidence katalog yang sudah tersedia.
- KZRJ/K46 tetap terisolasi.
- Vehicle model registry diperbaiki untuk API produksi `DatabaseAPI.vehicleModel.getAll()`.

## Cumulative preservation

Patch tidak menghapus:

- S1863 Service Master Database
- S1864 Service Master Catalog Expansion
- S1865 KZRJ Part Catalog
- S1866 Vario 110 FI K46 Part Catalog
- S1867 Honda PDF Catalog Auto-Import
- data katalog, generated master, tests, dan dokumentasi sesi sebelumnya

## Verifikasi

Build version: `s1868-dynamic-vehicle-maintenance-template-1871`.

`app-bundle-a.min.js` dan `app-bundle-b.min.js` lulus `node --check`. Karena `esbuild` tidak tersedia, bundle belum diminify.

Targeted S1868 + cumulative regression PASS seperti dicatat pada `AUDIT-S1868-DYNAMIC-VEHICLE-ONBOARDING-TEMPLATE.md`.
