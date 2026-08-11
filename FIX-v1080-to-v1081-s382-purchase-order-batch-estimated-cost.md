# FIX v1080 → v1081 (s382) — Estimasi Biaya PO Multi-Produk

## Konteks

Follow-up dari Sesi 381 (PO Multi-Produk). Item paling ringan dari 4
ide follow-up yang diajukan user: keranjang PO Multi-Produk belum
menunjukkan estimasi total modal (Rp) sebelum PO disimpan, padahal
kalkulatornya (`PurchaseEngine.estimatedCost()`, S198) sudah ada dan
dipakai fitur lain (Stock Reko Widget).

## Perubahan

- `modules/shop/business-flow-presenter.js`:
  - `_purchaseOrderBatchCartEstimatedCost()` baru — 100% REUSE
    `PurchaseEngine.estimatedCost()` yang sudah ada, 0 rumus baru.
    Cuma memetakan keranjang `_purchaseOrderBatchCartState`
    (`{productId,qty}`) ke shape yang diharapkan
    `PurchaseEngine.restockPlan()`/`estimatedCost()` (`{product,
    restockQty}`), item dengan produk yang tidak ditemukan di-skip
    (tidak error). Guard `typeof PurchaseEngine` supaya aman kalau
    modul belum dimuat.
  - `_renderPurchaseOrderBatchCart()` — ringkasan `#pobCartSummary`
    sekarang menambahkan `· Estimasi Biaya: Rp ...` kalau totalnya >
    0 (pola sama baris "Total Produk"/"Total PCS" yang sudah ada,
    disembunyikan kalau 0 supaya tidak menampilkan "Rp 0" yang
    membingungkan untuk produk tanpa `hargaBeli`).
- `tests/purchase-order-batch-s381.test.js` — +3 test baru
  (`_purchaseOrderBatchCartEstimatedCost()` hitung benar, keranjang
  kosong/tanpa hargaBeli = 0, dan `_renderPurchaseOrderBatchCart()`
  menampilkan label Estimasi Biaya di summary).
- Bundle di-rebuild via `node scripts/build.js` — versi 1080 → 1081.

## Verifikasi

- `node --test tests/*.test.js` — 2596 test, 2594 pass, 2 fail
  (pre-existing, sama persis dengan yang tercatat di sesi-sesi
  sebelumnya: `dashHubNavigateToFeature` "Penasihat AI"/"Life OS").
- `node scripts/build.js` — lolos penuh, sintaks kedua bundle valid.

## Belum dikerjakan / catatan lanjutan

3 ide follow-up lain dari Sesi 381 masih terbuka, belum dikerjakan
sesi ini (sengaja dibatasi 1 concern per sesi):

- Pilih Supplier/Produsen per batch (field baru, ikut pola PO
  single-produk lama yang juga belum punya field ini).
- Riwayat batch PO — pisah "aktif" vs "riwayat" di
  `renderPurchaseOrderBatchList()` (pola sama Buku Tagihan yang
  punya archive), belum dibutuhkan sampai daftar batch cukup
  panjang.
- Auto-suggest qty dari stok minimum ke keranjang PO Multi-Produk
  (mirip `restockTripCandidate()` yang sudah ada buat Trip).
