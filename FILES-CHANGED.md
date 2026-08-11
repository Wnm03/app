# FILES-CHANGED — Modul 16

## Source (logic)
- `modules/business/shop-data-io-api.js` — `ShopDataIO.importShopJSON()`:
  update produk existing + create produk baru + create produsen baru
  dialihkan ke `ProductRepository`/`SupplierStore`.
- `modules/shop/cobek-io.js` — `ImportShopExcel.commit()` (`target==='produsen'`):
  update supplier + create supplier baru dialihkan ke `SupplierStore`.

## Test (baru)
- `tests/shop-jsonimport-produsenexcel-mutation-gate-mod16.test.js` (15 test)

## Dokumen (baru, deliverable sesi ini)
- `CHANGELOG-MODUL16.md`
- `FILES-CHANGED.md`
- `SESSION-NOTE.md`
- `FINAL-DIFF-MODUL16.patch` (source .js + test baru saja — format sama
  seperti `FINAL-DIFF.patch` sesi s373, TIDAK termasuk bundle/versi
  auto-generated di bawah)

## Auto-terupdate oleh `scripts/build.js` (versi 1071 → 1072, TIDAK ada
## logic bisnis yang diubah manual di file-file ini)
- `app-bundle-a.min.js`, `app-bundle-b.min.js` (rebuild, tanpa minify —
  esbuild tidak tersedia di environment ini)
- `app_production.html`, `index.html` (`?v=1072`)
- `sw.js` (`CACHE_NAME` -> `kw-cache-v1072`)
- `modules/shared/modules-render.js`, `modules/shared/modals.js`,
  `modules/shared/modules-calc.js`, `chat-action-handlers.js`,
  `modules/shared/features-helpers-global-security.js` (konstanta versi
  disamakan otomatis oleh build.js, bukan perubahan manual)
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` (regenerasi otomatis)

## TIDAK diubah
- `ProductRepository`/`SupplierStore`/`CategoryStore` — 0 gate baru, 0
  validasi baru, 0 method baru. 100% reuse.
- Test lama (`shop-data-io-json-import.test.js`,
  `import-shop-excel-create-mutation-gate-mod14.test.js`) — tetap PASS
  tanpa modifikasi (jalur fallback otomatis aktif di sandbox test lama
  yang tidak me-load `ProductRepository`/`SupplierStore`).
