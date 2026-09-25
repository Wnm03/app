# AUDIT S2017 — Service Taxonomy + Maintenance/Reminder Package SOT Consolidation

## Tujuan

Menyatukan **identity Kategori Servis + Komponen Servis** ke satu facade canonical tanpa membuat database/SOT kedua, lalu memastikan Reminder Package memakai identity yang sama.

## Temuan

1. `SERVICE_CHECKLIST_GROUPS` adalah sumber canonical taxonomy: 13 `masterCategoryId` dan 102 `serviceComponentId`.
2. `ServiceInputCatalog` sebelumnya membaca `SERVICE_CHECKLIST_GROUPS` langsung. S2017 membuat `ServiceTaxonomySOT` sebagai facade canonical sehingga consumer tidak perlu membaca struktur mentah.
3. `DatabaseAPI.masterCategory` dipertahankan sebagai compatibility/projection; tidak dihapus dan tidak menjadi sumber identity baru.
4. `D.sparepartCats` dipertahankan sebagai legacy/domain projection. `group/groupIcon` tidak lagi diprioritaskan jika `serviceComponentId`, `masterCategoryId`, atau alias canonical dapat di-resolve.
5. `ServiceReminderPackageSOT` sudah mendukung multi-target/multi-category. S2017 mengubah canonicalization target agar memakai `ServiceTaxonomySOT` terlebih dahulu.
6. `Perawatan Berkala` tidak dijadikan master category. Ia tetap dapat muncul sebagai legacy label/package title, tetapi target package harus mengacu pada canonical component IDs.
7. `Otomatis` tetap mode/provisioning, bukan kategori taxonomy.
8. Maintenance policy (`SERVICE_MAINTENANCE_RULES`) tetap terpisah dari taxonomy identity. Interval/action tidak dipindahkan ke taxonomy baru.

## Implementasi

- Tambah `modules/vehicle/service-taxonomy-sot.js`.
- `ServiceInputCatalog.groups()` mendelegasikan ke `ServiceTaxonomySOT.groups()` dengan fallback legacy.
- Alias aman yang sudah terdokumentasi diarahkan ke canonical component:
  - `Saringan udara` → `filter-udara`
  - `Drive belt (v-belt CVT)` → `v-belt-cvt`
  - `Cairan pendingin radiator (coolant)` → `coolant`
  - `Oli Gardan/Transmisi` → `oli-gardan`
- Tidak ada fuzzy partial matching di SOT canonical resolver; nama yang tidak pasti tidak ditebak.
- Filter master category Sparepart menggunakan `ServiceTaxonomySOT.categories()`.
- Reminder Package canonical target menggunakan `ServiceTaxonomySOT.resolve()`.
- UI info/checklist package melakukan re-resolve label melalui canonical SOT sehingga nama kategori/komponen konsisten.
- Cache/version query dinaikkan ke 2017.

## Non-destructive policy

- Tidak menghapus `D.sparepartCats`.
- Tidak menghapus histori servis.
- Tidak me-rename ID existing.
- Tidak mengubah maintenance policy menjadi taxonomy.
- Tidak membuat kategori ke-14 `Perawatan Berkala`.
- Package dapat berisi target dari beberapa canonical category.

## Validasi

PASS:

- Node syntax `service-taxonomy-sot.js`
- Node syntax `sparepart-servis.js`
- Node syntax `app-bundle-b.min.js`
- S2017 taxonomy regression
- S2014 regression
- S2015 regression
- S2016 Reminder → History regression
- bundle integration assertions
- cache/version wiring

`S2012` tidak diklaim rerun karena helper test repository lengkap (`tests/helpers/loadSource`) tidak tersedia di patch kumulatif. Test S2012 historis tetap dipertahankan di archive.
