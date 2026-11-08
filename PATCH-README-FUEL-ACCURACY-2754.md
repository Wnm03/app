# Patch Kumulatif — build 2754 (menggantikan 2749, 2751, 2752, 2753)

Baseline: `app-main (3).zip`. File berubah saja (kumulatif Fuel Accuracy 2741–2753 + fitur Shop 2754). Bukan full release. Tanpa data/backup pengguna.
Rincian perbaikan Fuel: `PATCH-README-FUEL-ACCURACY-2753.md`, `-2752.md`, `-2749.md`.

## Tambahan S2754 — Edit harga & jumlah produk di keranjang Transaksi Shop
Sebelumnya produk yang sudah masuk "daftar" hanya bisa dihapus lalu ditambah ulang. Kini setiap baris punya tombol ✏️ (tombol 🗑 tetap ada).

**Pembelian (Tambah ke Stok Shop)** — panel edit: Jumlah, Harga Beli/pcs, Harga Jual/pcs.
- Nominal transaksi dihitung ulang otomatis dari daftar.
- Harga beli tersimpan lewat jalur lama (ProductRepository.mutateSetPrice + hargaByProdusen).
- Harga jual HANYA menimpa harga jual produk bila diisi/diubah di panel (produk lama tidak berubah diam-diam).

**Penjualan Shop** — panel edit: Jumlah, Harga Jual/pcs (khusus transaksi ini).
- Total, diskon, DP/piutang, dan estimasi untung dihitung ulang dari jalur lama.
- Centang opsional "Jadikan harga jual produk" memperbarui harga jual produk saat transaksi disimpan (gate mutateSetPrice). Tanpa centang, harga Etalase tidak berubah.

Validasi: jumlah > 0; harga jual penjualan > 0; harga beli >= 0; harga jual pembelian >= 0 (kosong = tidak diubah). Input salah ditolak dan panel tetap terbuka.
Tidak mengubah SOT/jalur simpan: handler hanya mengubah state keranjang; penulisan stok/harga tetap lewat fungsi yang sama.

File: `modules/shop/cobek-tx-cart.js` (handler), `modules/shop/cobek-io.js` (tampilan baris), `modules/shared/pwa-ux-performance.js` (hint nominal ikut refresh), `FILE-HASHES-SHA256.txt` (hash disegarkan), tes `tests/shop-cart-edit-price-s2754.test.js` (8 tes).

## Langkah wajib setelah menerapkan
Jalankan sekali `node scripts/apply-delete-manifest.js` (menghapus 5 file lama bawaan baseline; aman diulang). Lihat README 2753.

## Validasi
- Full suite 9492 tes: 9491 lulus setelah hash disegarkan + manifest hapus; 0 gagal, 1 dilewati.
- Uji di aplikasi nyata (Chromium headless, klik lewat dispatcher asli, lebar 390px): edit baris Penjualan & Pembelian, total dan hint nominal ter-update, tanpa error halaman.
- ESLint 0 error; build minified lulus; bundle A/B segar; window-expose OK.
- Belum diuji: perangkat Android nyata (keyboard numerik, mode terang).
