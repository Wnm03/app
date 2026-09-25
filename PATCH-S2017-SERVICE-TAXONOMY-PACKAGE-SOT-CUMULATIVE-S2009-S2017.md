# PATCH S2017 — Service Taxonomy + Maintenance/Reminder Package SOT

S2017 adalah patch kumulatif dari S2009–S2016.

## Perubahan inti

`ServiceTaxonomySOT` menjadi facade canonical untuk:

- 13 master category
- 102 service component
- canonical ID resolution
- explicit legacy alias resolution

`ServiceInputCatalog`, Sparepart master-category filter, Reminder Package target normalization, dan package UI label projection memakai facade ini.

## Yang sengaja tidak diubah

- histori servis
- transaction/finance linkage
- `D.sparepartCats` sebagai legacy/domain projection
- `SERVICE_MAINTENANCE_RULES` sebagai policy layer
- `ServiceMasterDB` sebagai storage/projection compatibility layer
- ID canonical yang sudah ada

## Prinsip package

Maintenance/Reminder Package bukan taxonomy baru. Package menyimpan target berupa `masterCategoryId`/`serviceComponentId` canonical dan boleh lintas kategori.

`Perawatan Berkala` bukan master category. `Otomatis` bukan master category.

## Release

Runtime bundle: `app-bundle-b.min.js`
Version query/cache: `2017`

Test baru: `tests/service-taxonomy-sot-s2017.test.js`
