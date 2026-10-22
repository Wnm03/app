# Patch Kumulatif S2618 — Audit Shop, overlay Finance S2617

Baseline: `app-main (33).zip`  
Patch akumulasi sebelumnya: `PATCH-APP-MAIN-S2617-FINANCE-DASHBOARD-v2617.zip`  
Build hasil overlay: `s2595-carnotes-null-interval-guard-2619` / cache `kw-cache-v2619`.

## Perbaikan yang diterapkan

1. CSS Kasir: grid hanya aktif ketika `.kasir-wrap` tidak memiliki `u-dnone`; menambah ruang bawah untuk mengurangi tabrakan checkout dengan floatbar.
2. Produsen: menambahkan wrapper global `openProdusenActionsMenu()` untuk dispatcher `data-action`; nama supplier dinormalisasi (Unicode NFKC, trim, spasi berulang, huruf kecil) dan duplikat ditolak pada create/update dengan pesan yang benar.
3. Produk: nama duplikat dinormalisasi dan ditolak; stok negatif, harga jual di bawah/sama dengan modal, serta penambahan stok dengan modal Rp0 mendapat konfirmasi lunak.
4. Kategori: hasil gagal tidak lagi memberi toast sukses; kategori yang sudah ada diberi pesan informatif.
5. Penghapusan produk: konfirmasi menyebut jumlah transaksi terkait dan bahwa histori disimpan sebagai snapshot; transaksi yang merujuk produk yang sudah dihapus tidak lagi membuka modal edit dengan keranjang kosong—pengguna diberi nama snapshot dan instruksi memulihkan produk terlebih dahulu.
6. Pembayaran pelanggan: badge `DP / belum lunas` di riwayat dan total sisa piutang per pelanggan.
7. BI Shop: kontainer presenter Health Score, Decision, Trend, Executive Summary, dan AI Insight tersedia di DOM; tiga modul ringkasan yang berulang disembunyikan di BI agar tidak menumpuk duplikasi; hero Shop mengarah ke Laporan alih-alih menjadi pintu ekspor kedua.
8. Pengiriman: trip KPI hanya menghitung transaksi delivered dengan ongkir positif. Label harga produk menyebut `markup`, bukan margin.
9. Teks lokasi tetap dibuat generik (lokasi asal/tujuan), bukan mengunci kota tertentu.
10. FAB Laporan Shop yang duplikatif dinonaktifkan; FAB utama Shop dipertahankan. FAB Laporan Keuangan yang sudah ditangani patch kumulatif S2617 tetap mengikuti patch tersebut.
11. Menambahkan `tests/s2618-shop-audit-regressions.test.js`.

## Verifikasi

- Build minified: **LULUS**, kedua bundle lolos `node --check`.
- `npm run verify-bundle`: **LULUS**.
- `npm run verify-window-expose`: **LULUS**.
- Tes terpilih yang mencakup regresi Shop, generic Shop, business flow, BI overview, dan impor/ekspor: **172/172 lulus**.
- ESLint untuk file JavaScript terkait: **0 error**, 58 warning `no-unused-vars` (pola deklarasi global/dispatcher yang sudah digunakan oleh HTML; tidak ada error lint).
- `npm test` penuh: **tidak selesai dalam batas waktu lingkungan**; bukan klaim lulus.
- Browser E2E setelah patch: **belum dijalankan**.

## Sisa rekomendasi yang belum selesai

Patch ini menutup bug fungsional utama yang teridentifikasi dan menambahkan regresi, tetapi **belum menyelesaikan seluruh daftar rekomendasi**:

- Enam jalur impor Etalase belum disatukan menjadi satu menu pilihan format.
- Logika DP/piutang yang mirip antara Kasir dan Order belum dikonsolidasikan ke satu fungsi kanonis; kedua jalur tetap menggunakan `recordShopSale()` untuk posting penjualan, tetapi fan-out piutang masih perlu audit integrasi khusus.
- Belum ada toggle laporan untuk memilih omzet termasuk ongkir vs omzet tanpa ongkir; yang diperbaiki di sini adalah definisi hitungan trip dan label markup agar tidak menyesatkan.
- Audit browser E2E untuk tombol checkout/floatbar, seluruh jalur impor/ekspor, dan siklus edit/hapus dengan produk historis yang dihapus masih perlu dilakukan.

Tidak ada migrasi atau penulisan ulang data pengguna di patch ini. Buat backup sebelum overlay.
