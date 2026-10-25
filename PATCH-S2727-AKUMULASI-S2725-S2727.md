# S2727 — Akumulasi S2725 + S2726 + S2727 (kebijakan hapus pembelian stok)
Baseline: app-main_41 (+S2724). Patch ini AKUMULATIF: memuat seluruh S2725 (K1 checkout atomik, K4 peringatan hapus pembelian) dan S2726.

## Ditambahkan di S2727
- **Hapus pembelian stok ditolak bila stok produk < qty pembelian** (sebagian sudah terjual). Helper `stockPurchaseDeleteBlockers(t)` (tx-list-cashflow.js) dicek di `delTx` SEBELUM dialog konfirmasi; tidak ada mutasi. Pesan: sarankan retur atau penyesuaian stok. Berlaku utk jalur `stockItems` dan `stockProductId`.
- Peringatan clamp di `runTxDeleteCascades` dipertahankan sebagai pengaman jalur lain (mis. Renovasi).
- Tes baru: 2 (blockers + delTx ditolak tanpa konfirmasi/mutasi) di `tests/s2726-shop-behavior.test.js`. Build 2705.

(Bagian S2726 di bawah tetap berlaku.)


## Diperbaiki di S2726
1. **Pelunasan piutang Order/Shop kini mencatat pemasukan kas.** Dulu `markPaymentReceived` hanya `lunas=true` -> saldo akun tidak naik.
   - Helper baru (cobek-order.js): `recordShopReceivablePayoff`, `markShopReceivablePaid` (atomik: gagal simpan -> flag & transaksi dibatalkan), `reverseShopReceivablePayoff`.
   - Transaksi pelunasan: income Bisnis/Cobek ke akun order, sebesar sisa piutang, idempoten via `piutang.linkedPayoffTxId`. TIDAK memakai `cobekLinkId` (menghapus transaksi pelunasan tidak ikut menghapus penjualan).
   - Jalur modal Piutang (Piutang.save) untuk piutang Shop ikut sama; membuka kembali piutang membatalkan pemasukannya.
   - Edit Order yang sudah lunas (piutang dibuka lagi/dihapus), hapus Order (Laporan), dan hapus transaksi DP (cascade) ikut membatalkan pemasukan pelunasan -> tidak ada kas ganda/yatim.
   - Akun order tidak ditemukan -> pelunasan ditolak dengan pesan jelas (tidak diam-diam menaruh ke akun lain).
2. **`rollbackShopItems`/`applyBundleLinkedStock`**: `opts` di luar scope diganti parameter `refId`; semua pemanggil (Kasir rollback, recordShopSale, Laporan.delete, cascade hapus transaksi) meneruskan id transaksi -> riwayat stok punya `refId`.
3. **Diskon negatif/berlebih**: `computeTotals` (Kasir & Order) kini juga mengembalikan `diskonEfektif` (0..subtotal). Record, tampilan keranjang, struk memakai nilai efektif. `diskon` mentah tetap dikembalikan (kontrak tes B9).

4. **Hapus pembelian stok**: produk yang kini berstok 0 diberi pesan "tetap ada di Etalase" (tidak dihapus otomatis).

## Tes
- Baru: `tests/s2726-shop-behavior.test.js` (perilaku nyata: payoff, idempotensi, reverse, edit order lunas, refId, diskon, rollback checkout Kasir saat sinkron gagal).
- Diperbarui: business-flow-presenter (fixture butuh akun + SOT), s2725 (regex rollback).

## Belum dikerjakan / keputusan tersisa
- Hapus Order dgn DP + piutang + pelunasan diuji di unit test (vm); klik UI di Chromium belum dijalankan (browser tidak tersedia).
