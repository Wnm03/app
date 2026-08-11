# FIX v1079 → v1080 (s381) — PO Multi-Produk (Purchase Order Batch)

## Konteks

Lanjutan dari Sesi 378-380 (Purchase Order per produk, 1 produk per
panggilan `createPurchaseOrder()`). Sesi ini menambahkan PO
Multi-Produk: 1 kali pesan ke Supplier bisa berisi banyak produk
sekaligus, mirror pola cart Inventory Transfer (S243/S374).

## Perubahan

- `modules/shop/business-flow-presenter.js`:
  - `createPurchaseOrderBatch({items})` baru — validasi per-item reuse
    logic `createPurchaseOrder()` (produk harus ada di Etalase, qty
    >0/finite); tiap produk tetap 1 record `D.purchaseOrders` terpisah
    + field baru `batchId` (additive, sama utk 1 batch). 0 breaking
    change ke `createPurchaseOrder()`/`receivePurchaseOrder()`/
    `renderPurchaseOrderBox()`/`renderPurchaseOrderHistory()` lama.
  - `receivePurchaseOrderBatch(batchId)` baru — delegasi
    `receivePurchaseOrder()` per item, idempotent.
  - `purchaseOrderBatches()` baru — ringkasan grouping by batchId.
  - UI cart baru: `_purchaseOrderBatchCartState`,
    `openPurchaseOrderBatchModal()`,
    `renderPurchaseOrderBatchProductChips()`,
    `tapPurchaseOrderBatchChip()`, `removePurchaseOrderBatchCartItem()`,
    `_renderPurchaseOrderBatchCart()`,
    `savePurchaseOrderBatchFromModal()`,
    `renderPurchaseOrderBatchList()`,
    `receivePurchaseOrderBatchFromUI()`.
  - Tombol "🧾 Buat PO Multi-Produk" ditambah di kartu Purchase
    (`render()`, card index 0).
  - `renderPurchaseOrderBatchList()` dipanggil di akhir `render()`
    (pola sama `renderTransferList()`).
- `modules/shared/modals.js` — modal baru `purchaseOrderBatchModal`
  disisipkan di `MODAL_HTML` tepat setelah `inventoryTransferModal`
  (jadi index 89; `shopKatalogDinamisModal` geser ke index 90).
- `index.html`/`app_production.html`:
  - Container `#businessFlowPurchaseOrderBatchList` ditambah di bawah
    `#businessFlowTransferList`.
  - `document.write(MODAL_HTML[89])` diganti jadi
    `purchaseOrderBatchModal`, ditambah baris baru
    `document.write(MODAL_HTML[90])` utk `shopKatalogDinamisModal`
    (drift index sesuai insersi di tengah array).
- `tests/purchase-order-batch-s381.test.js` — file baru, 17 test
  (createPurchaseOrderBatch/receivePurchaseOrderBatch/
  purchaseOrderBatches/cart UI/render list).
- Bundle di-rebuild via `node scripts/build.js` — versi 1079 → 1080.

## Verifikasi

- `node --test tests/*.test.js` — 2593 test, 2591 pass, 2 fail
  (pre-existing, sama persis dgn yang tercatat di sesi-sesi
  sebelumnya: `dashHubNavigateToFeature` "Penasihat AI"/"Life OS").
- `node scripts/build.js` — lolos penuh, termasuk lint drift index
  `MODAL_HTML` (sempat gagal 1x krn `app_production.html` belum
  disamakan manual, sudah diperbaiki & lolos di run kedua).

## Belum dikerjakan / catatan lanjutan

- PO Multi-Produk saat ini belum dukung pilih Supplier/produsen per
  batch (mengikuti pola PO single-produk lama yang juga belum ada
  field ini) — bisa jadi follow-up sesi berikutnya kalau dibutuhkan.
