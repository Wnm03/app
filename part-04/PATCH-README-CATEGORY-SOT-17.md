# PATCH-CATEGORY-SOT-17 — FILTER CATEGORY → COMPONENT

Cumulative dari PATCH-CATEGORY-SOT-16.

## Tujuan
Memperluas pola S16 dari **input servis** ke **pembacaan/penelusuran histori servis**:

`Kategori -> daftar komponen -> pilih komponen -> filter Service Event`

Kategori tetap hanya sebagai pengelompokan/filter. Kategori TIDAK berarti semua komponennya dikerjakan.

## Perubahan
- `car-notes.js`
  - Riwayat Servis sekarang memiliki filter komponen yang mengikuti kategori master aktif.
  - Saat kategori berubah, filter komponen di-reset agar tidak terjadi hasil silang kategori.
  - Filter komponen hanya mencocokkan `D.servisLogs[].checklist[].itemId`, yaitu komponen yang benar-benar dicentang saat servis.
  - Tidak membuat field SoT baru.
- `modules/vehicle/vehicle-trend-api.js`
  - Menambah `VehicleTrendAPI.serviceLogs({vehicleId, masterCategoryId, serviceComponentId})` sebagai API read-only untuk query histori servis berbasis kategori/komponen.
  - Tetap membaca `D.servisLogs`; tidak membuat store baru dan tidak mengubah interval/reminder SoT.
- `tests/service-filter-s17.test.js`
  - Verifikasi cascading filter, reset lintas kategori, dan API filter histori.

## Validasi
Suite relevan S12-S17: **14/14 PASS**.
Syntax check `car-notes.js` dan `vehicle-trend-api.js`: PASS.

Full regression aplikasi **belum diklaim PASS** pada patch ini.
