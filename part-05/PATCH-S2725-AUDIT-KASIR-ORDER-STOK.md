# S2725 — Audit browser: Kasir AI, hapus/retur Order & Laporan, pembelian stok
Baseline: app-main_41 + patch S2724. Diuji di Chromium headless (klik UI nyata).
## Diperbaiki
1. K1 Kasir checkout: ongkir negatif membuat total < 0 -> syncShopSalePayment menolak SETELAH stok terpotong & D.cobek dibuat (penjualan yatim, tanpa transaksi, keranjang tetap -> klik ulang menggandakan). Fix: ongkir dibatasi >=0 (paritas Order S2307), preflight total, dan rollback penuh (stok via rollbackShopItems, baris D.cobek, tx/piutang parsial) bila sinkron pembayaran gagal/throw (kasir.js).
2. K4 hapus transaksi pembelian stok: bila stok sudah sebagian terjual, stok di-clamp 0 diam-diam; kini ada peringatan (tx-list-cashflow.js).
## Terverifikasi benar (tanpa perubahan)
Modal edit Order terbuka via klik baris (C2); edit qty/DP menyinkronkan stok, tx, piutang; Order sudah membatasi ongkir.
## Belum diputuskan / belum diuji
- markPaymentReceived hanya set piutang.lunas, tanpa transaksi pemasukan pelunasan (mungkin disengaja).
- Produk baru dari pembelian stok tetap ada (stok 0) setelah transaksi dihapus.
- rollbackShopItems merujuk `opts` di luar scope (refId riwayat stok kemungkinan kosong).
- Diskon negatif di Kasir tersimpan apa adanya (diskon -50000 di record) — belum diuji bersih.
Tes: npm test 9283 lulus; gagal hanya S2613 (pra-ada).
