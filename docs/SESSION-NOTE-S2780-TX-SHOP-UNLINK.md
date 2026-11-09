# SESSION-NOTE S2780 — Lepas tautan Stok Shop & Penjualan Shop dari form Transaksi

Kumulatif di atas S2779 (build 2779 → 2780). Baseline: app-main_6.

## Perilaku
| Panel | Centang dimatikan pada transaksi tertaut | Ditolak (sebelum mutasi) bila |
|---|---|---|
| Stok Shop | stok produk dikurangi, tautan stok dilepas | stok produk < qty yang dibatalkan (sebagian sudah terjual) |
| Penjualan Shop | stok dikembalikan, piutang sisa & catatan penjualan dihapus, transaksi tetap | piutang penjualan sudah lunas |

- Konfirmasi memakai dialog S2778/S2779 yang sama (satu dialog memuat semua tautan yang dilepas).
- Eksekusi di `applyTxShopStockFromTx()` / `applyTxShopSaleFromTx()` (pola `applyTxStockFromTx` S2778), yaitu SETELAH langkah yang bisa melempar error (stok sparepart, servis, BBM), jadi tidak butuh snapshot rollback tambahan.
- `stockRev` dipertahankan agar key idempotensi penambahan berikutnya (`stockRev+1`) tidak bentrok.
- Gate jalur: `curPayMethod==='tunai'&&!existingBill` (sama dgn S2779).

## Verifikasi
- `tests/s2780-tx-shop-unlink.test.js` (6) PASS; suite terkait S2433/S2732/S2779 PASS.
- Full suite + build: lihat laporan akhir sesi.
- Belum diuji di browser nyata.
