# PATCH S2433 — Belanja produk dari Transaksi tidak menambah stok etalase Shop (KUMULATIF, build 2721)

## Akar masalah
1. **Daftar produk kosong** — centang "Tambah ke Stok Shop" aktif tapi produk belum diklik "Tambahkan Produk ke Daftar":
   transaksi tersimpan dulu, baru `applyTxShopStockFromTx` menolak; toast peringatan langsung ditimpa
   "Transaksi tersimpan" -> uang keluar, stok tidak naik, tanpa tanda.
2. **Edit transaksi belanja** — key idempotensi ledger (`tx-stock-receipt:<tx>:<produk>`) sama di tiap simpan:
   rollback jalan, penambahan ulang dilewati (duplicate) -> stok turun & tertahan (10 -> 15 -> edit -> 10).

## Perbaikan (additive)
- `modules/shop/cobek-tx-cart.js`: `txShopStockPrecheck()` baru; key idempotensi kini memuat revisi (`:r<n>`, `tx.stockRev`).
- `modules/finance/transaksi-b.js`: precheck dipanggil SEBELUM transaksi dipersist (sejajar `txShopSalePrecheck`).
- `tests/s2433-shop-stock-tx-edit-precheck.test.js`: 6 test eksekusi nyata (baru, edit sama, edit qty, edit berulang, legacy, precheck).
- Build 2720 (bundle a/b, index/app_production/sw, 5 konstanta versi, docs/index+app_production+sw disinkronkan; bundle docs/ sengaja tidak diubah karena test S1843 membaca docs/app-bundle-b.min.js apa adanya; FILE-MAP/COVERAGE).

## Verifikasi
- Baseline app-main__47_: 9349 pass / 2 fail. Setelah patch + build: 9355 pass / 2 fail (6 test baru), **0 regresi**.
- 2 fail pre-existing & tidak terkait: guard orphan `modules/modals.js` & shadow global-security (S2720) — file orphan masih ada di base.
- Release gate: semua PASS kecuali `no-personal-data` (pre-existing: 3 file `data-fix/backup-keluarga-W-*.json` ada di base, TIDAK dimasukkan ke patch; hapus/pindahkan sebelum rilis).

## Tambahan sesi lanjutan (S2433-C/D, build 2721)
- **C — edit cicilan/langganan**: jalur ini menghapus tx lama & membuat id baru sehingga stok tx lama tidak pernah
  di-rollback (stok dobel). `applyTxShopStockFromTx(txId,note,existingTx,prevTx)` kini menerima `prevTx` (opsional) khusus
  rollback; 2 call site di `transaksi-b.js` meneruskan `existingTx`. Tanpa prevTx perilaku sama seperti sebelumnya.
- **D — petunjuk kategori**: panel Stok Shop tetap hanya muncul utk kategori/sub Shop (aturan tidak diubah). Kini bila
  expense, catatan cocok nama produk Shop, tapi kategori bukan Shop (& tak ada panel Kendaraan/Sparepart), muncul petunjuk
  kecil `#txShopCatHint` (dibuat dinamis, tanpa mengubah MODAL_HTML). `syncTxShopCatHint()` dipanggil dari `updateTxVehiclePanels()`.
- Test baru: `tests/s2433-shop-stock-prevtx-cathint.test.js` (6 test).
- Verifikasi: 9361 pass / 2 fail (2 fail = pre-existing guard orphan S2720, identik baseline), 0 regresi.
- Build 2721 menggantikan 2720 (satu ZIP kumulatif; terapkan langsung di atas app-main__47_).
