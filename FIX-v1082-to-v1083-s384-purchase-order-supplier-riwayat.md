# FIX v1082 → v1083 (s384) — Supplier per Batch + Riwayat PO Multi-Produk

## Konteks

2 ide follow-up TERAKHIR yang tersisa dari Sesi 381 (PO Multi-Produk),
disebut di catatan lanjutan FIX v1081→v1082 (s383):
1. Pilih Supplier/Produsen per batch.
2. Riwayat batch PO — pisah "aktif" vs "riwayat".

## Perubahan

- `modules/shop/business-flow-presenter.js`:
  - `createPurchaseOrderBatch({items,note,supplier})` — parameter baru
    `supplier` (opsional, free-text — BUKAN master data terpisah, follow
    pola PO single-produk lama yang juga belum punya field ini). Disimpan
    di-trim ke field `supplier` pada TIAP record `D.purchaseOrders` dalam
    batch tsb (additive, 0 breaking change).
  - `purchaseOrderBatches()` — tambah field `supplier` di tiap ringkasan
    batch (diambil dari record pertama grup; batch lama S381/S382 tanpa
    field ini fallback `''`).
  - `openPurchaseOrderBatchModal()`/`savePurchaseOrderBatchFromModal()` —
    baca/reset input `#pobSupplier` baru, diteruskan ke
    `createPurchaseOrderBatch()`.
  - `renderPurchaseOrderBatchList()` — 2 perubahan: (a) tampilkan nama
    supplier per baris kalau diisi; (b) batch dipisah 2 kelompok (aktif =
    ORDERED, riwayat = RECEIVED, pola sama `billArchiveList` di Buku
    Tagihan) dengan label section HANYA muncul kalau kedua kelompok
    sama-sama ada isinya — tetap ringkas selama daftar masih pendek,
    belum perlu modal archive terpisah/collapsible.
- `modules/shared/modals.js` — field baru "Supplier / Produsen (opsional)"
  (`#pobSupplier`) di `purchaseOrderBatchModal`, di atas daftar chip
  produk.
- `tests/purchase-order-batch-s381.test.js` — +9 test baru: supplier
  tersimpan/di-trim, default kosong, ikut di `purchaseOrderBatches()`,
  dibaca dari DOM saat simpan (+reset form), tampil di list, label
  Aktif/Riwayat cuma muncul kalau perlu, batch RECEIVED tetap tampil
  tanpa tombol Terima Semua.
- Bundle di-rebuild via `node scripts/build.js` — versi 1082 → 1083.

## Verifikasi

- `node --test tests/*.test.js` — 2608 test, 2606 pass, 2 fail
  (pre-existing, sama persis dengan sesi-sesi sebelumnya:
  `dashHubNavigateToFeature` "Penasihat AI"/"Life OS").
- `node scripts/build.js` — lolos penuh, sintaks kedua bundle valid.

## Status

Semua 4 ide follow-up dari Sesi 381 (PO Multi-Produk) sekarang sudah
selesai dikerjakan: Restock Autofill (s383) + Supplier per batch &
Riwayat batch (s384, sesi ini).
