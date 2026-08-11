# FIX v1077 → v1078 (s379) — Purchase Order: entry point UI di modal Detail Produk

## Konteks

Lanjutan langsung Sesi 378: `createPurchaseOrder()`/
`receivePurchaseOrder()` sebelumnya sudah ada & lolos test, tapi cuma
bisa dipanggil programatik — belum ada tombol/UI nyata di modal Detail
Produk/Shop (dicatat sebagai "Belum dikerjakan" di FIX s378). Sesi ini
menutup gap itu.

## Perubahan

- `modules/shared/modals.js` — modal `productModal`: tambah container
  `#productPurchaseOrderBox` di bawah `#productMovementList`.
- `modules/shop/business-flow-presenter.js`:
  - `renderPurchaseOrderBox(productId)` baru.
  - `clickCreatePurchaseOrder(productId)` baru.
  - `clickReceivePurchaseOrder(purchaseId, productId)` baru.
- `modules/shop/cobek-etalase.js` — panggil `renderPurchaseOrderBox()`
  saat `productModal` dibuka (persis di sebelah panggilan
  `renderMovement()` yang sudah ada).
- `tests/inventory-movement-s238.test.js` — +6 test baru.
- `CHANGELOG.md` — entri Sesi 379 (prepend).
- Bundle di-rebuild via `node scripts/build.js` -> versi 1077 -> 1078
  (`index.html`/`app_production.html`/`sw.js`/`app-bundle-a.min.js`/
  `app-bundle-b.min.js` semua ikut ter-update otomatis oleh build
  script, TIDAK diedit manual).

## Cara apply manual (kalau tidak pakai full release)

1. Timpa `modules/shared/modals.js`, `modules/shop/business-flow-presenter.js`,
   `modules/shop/cobek-etalase.js`, dan `tests/inventory-movement-s238.test.js`
   dgn versi di patch ini.
2. Jalankan `node scripts/build.js` di root repo (bukan sekadar timpa
   bundle manual) — ini yang men-generate ulang
   `app-bundle-a.min.js`/`app-bundle-b.min.js`/`index.html`/
   `app_production.html`/`sw.js` dengan versi baru & mengecek sintaks.
3. Prepend entri `CHANGELOG.md`.
4. `node --test tests/*.test.js` -> harus 2570/2572 pass (2 fail
   pre-existing `dashHubNavigateToFeature`, tidak terkait patch ini).

## Belum dikerjakan (butuh keputusan produk terpisah)

- Riwayat semua Purchase Order per produk (bukan cuma yang terbaru).
- Purchase Order lintas-produk (1 PO banyak item, seperti keranjang di
  Inventory Transfer S243).
