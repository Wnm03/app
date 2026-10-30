# PATCH v1393 → v1396 (audit-backup-partsstock — Fix id collision + migrasi self-healing dedupe & vehicleId backfill)

ZIP LENGKAP — gabungan 3 patch berurutan dari audit backup user (v1393→v1394
fix generation, v1394→v1395 migrasi dedupe id, v1395→v1396 migrasi backfill
vehicleId). 1 ZIP ini = 1 deployment penuh, tidak perlu apply berurutan.

## Status
- **4749/4749 test PASS** (`node --test tests/*.test.js`) — 4741 baseline +
  8 test baru, 0 regresi.
- `node scripts/build.js s-audit-backup-partsstock-vehicleid-backfill-schema9`
  dijalankan: `?v=` **1393 → 1396**, `CACHE_NAME` → `kw-cache-v1396`.
- Bundle unminified (esbuild tidak tersedia di sandbox ini) — sintaks lolos
  `node --check`.

## Temuan awal (audit backup user)
Backup produksi user diaudit: dari 296 baris `D.partsStock`, cuma 40 id
unik (292 baris tabrakan), dan 293/296 baris tidak punya `vehicleId`. Root
cause id: `syncPartsStockFromCatalog()` bikin id lewat `Date.now()` mentah
dalam loop sinkron (bulk-import katalog) → banyak baris ke-generate di
milidetik sama. Root cause vehicleId: fix SOT sebelumnya forward-only, tidak
ada backfill retroaktif.

## Apa yang berubah (logika)
1. **Fix generation (`SCHEMA_VERSION` tidak berubah di sini):**
   `modules/finance/tx-stok-sparepart.js` — `_genId()` baru (pakai `uid()`
   SOT app kalau ada, fallback counter monotonic lokal kalau file di-load
   berdiri sendiri/test). 4 titik id `Date.now()` mentah diganti `_genId()`.

2. **`SCHEMA_VERSION` 7 → 8 + migrasi `toVersion:8`:** dedupe id
   `partsStock` yang tabrakan (baris pertama per id dipertahankan, duplikat
   diberi id baru `_dupN` — 0 baris dihapus). Jalan otomatis tiap restore
   backup lama.

3. **`SCHEMA_VERSION` 8 → 9 + migrasi `toVersion:9`:** backfill
   `partsStock[].vehicleId` yang kosong, dari `_vehicleCatalogStore.items`
   (HANYA kalau `catalogId` cocok ke pas 1 `compatibleVehicleIds` — 0
   tebakan kalau ambigu). Untuk ini bisa jalan, `modules/shared/backup-restore.js`
   (`applyRestoredData()`) diubah: `delete D._vehicleCatalogStore` digeser
   ke SETELAH `runDataMigrations()` (bukan sebelum) — supaya data katalog
   masih ada saat migrasi baca, lalu tetap dibersihkan setelahnya spy tidak
   nyangkut permanen di `D` (0 perubahan behavior lain di fungsi ini,
   diverifikasi test `tests/backup-restore-regression-s266.test.js`
   termasuk test invariant "titipan IndexedDB tidak nyangkut jadi field
   liar di D"). Migrasi ini no-op di jalur startup normal (app.load()) —
   data katalog memang tidak tersedia di titik itu, cuma di jalur restore
   JSON.

## File yang berubah
- `modules/finance/tx-stok-sparepart.js` — fix generation (`_genId()`).
- `modules/shared/features-helpers-global-security.js` — `SCHEMA_VERSION`
  9 + 2 migrasi baru (`toVersion:8`, `toVersion:9`).
- `modules/shared/backup-restore.js` — urutan `delete D._vehicleCatalogStore`
  digeser ke setelah `runDataMigrations()`.
- `tests/s-audit-backup-partsstock-id-dedup-migration.test.js` — baru (3 test).
- `tests/s-audit-backup-partsstock-vehicleid-backfill-migration.test.js` —
  baru (3 test).
- `tests/tx-stok-sparepart-bulk-id-collision.test.js` — baru (2 test, guard
  regresi bulk-loop).
- `app-bundle-a.min.js`, `app-bundle-b.min.js` — hasil build ulang.
- `index.html`, `app_production.html` — `?v=1393` → `?v=1396`.
- `sw.js` — `CACHE_NAME` → `kw-cache-v1396`.
- `modules/shared/modals.js`, `modules/shared/modules-render.js`,
  `modules/shared/modules-calc.js`, `chat-action-handlers.js` — konstanta
  versi ikut di-bump (0 perubahan logic lain).
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` — regenerasi otomatis.

## Cara pakai patch ini
Timpa semua file di atas ke lokasi yang sama di deployment v1393 kamu (jaga
struktur folder ZIP — path relatif root repo), upload SEMUA file termasuk
`app-bundle-a.min.js`/`app-bundle-b.min.js`.

Setelah patch ini live, backup lama (`schemaVersion<9`) otomatis ke-dedupe
DAN ke-backfill `vehicleId`-nya (kalau bisa ditentukan dgn pasti) pas
di-restore lewat tombol Restore app — tidak perlu script manual
(`backfill-vehicleid.py`) lagi ke depannya.
