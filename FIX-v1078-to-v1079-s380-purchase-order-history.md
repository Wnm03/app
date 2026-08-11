# FIX v1078 → v1079 (s380) — Purchase Order: riwayat semua PO per produk

## Konteks

Lanjutan langsung Sesi 379: `renderPurchaseOrderBox()` cuma nampilin
PO TERBARU per produk (via `_latestPurchaseForProduct()`) — dicatat
sebagai "Belum dikerjakan" di FIX s379 ("Riwayat semua Purchase Order
per produk, bukan cuma yang terbaru"). Sesi ini menutup gap itu.

## Perubahan

- `modules/shared/modals.js` — modal `productModal`: tambah container
  `#productPurchaseOrderHistory` di bawah `#productPurchaseOrderBox`.
- `modules/shop/business-flow-presenter.js`:
  - `renderPurchaseOrderHistory(productId)` baru.
  - `clickCreatePurchaseOrder()`/`clickReceivePurchaseOrder()` — ikut
    re-render riwayat.
- `modules/shop/cobek-etalase.js` — panggil `renderPurchaseOrderHistory()`
  saat `productModal` dibuka.
- `tests/inventory-movement-s238.test.js` — +6 test baru.
- `CHANGELOG.md` — entri Sesi 380 (prepend).
- Bundle di-rebuild via `node scripts/build.js` -> versi 1078 -> 1079
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
4. `node --test tests/*.test.js` -> harus 2574/2576 pass (2 fail
   pre-existing `dashHubNavigateToFeature`, tidak terkait patch ini).

## Belum dikerjakan (butuh keputusan produk terpisah)

- Purchase Order lintas-produk (1 PO banyak item, seperti keranjang di
  Inventory Transfer S243).
