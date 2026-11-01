# DESAIN P4 — DP Preorder melalui FinanceTxSOT (BELUM DIIMPLEMENTASIKAN)

Status: **DESAIN SAJA**. Dokumen ini tidak menambah atau mengubah kode mutasi uang, stok, atau piutang. Implementasi memerlukan persetujuan eksplisit sebelum dikerjakan.

## Tujuan dan batasan

DP preorder harus menjadi pembayaran awal atas pesanan, bukan penjualan kedua dan bukan ledger baru. Semua pemasukan tetap dibuat/dihapus melalui `FinanceTxSOT`; hubungan piutang tetap memakai `BillDebtPiutangCanonicalWriter`; penjualan akhir tetap melalui `recordShopSale()` dan `syncShopSalePayment()`. `D.preorders[]` hanya menyimpan metadata pesanan dan referensi ID transaksi DP yang kanonis.

## Model data yang diusulkan

Tambahan metadata pada preorder yang sudah ada:

- `dpTxId`: ID transaksi pemasukan DP yang dibuat melalui `FinanceTxSOT`.
- `dpAmount`: nilai DP yang tercatat (metadata untuk rekonsiliasi; bukan sumber saldo).
- `dpAccountId`, `dpDate`: referensi akun dan tanggal pembayaran.
- `dpStatus`: `none | paid | reversed | applied`.

Tidak membuat `D.preorderPayments`, tabel uang, atau rumus saldo baru. Nilai uang yang benar tetap dibaca dari `D.transactions` melalui SOT. Validasi harus memastikan `dpTxId` menunjuk transaksi yang benar dan belum dipakai preorder lain.

## Alur pencatatan DP

1. Validasi preorder `open`, produk masih ada, nominal DP finite dan > 0, akun valid, dan belum ada `dpTxId`.
2. Buat transaksi pemasukan melalui `FinanceTxSOT.create()` dengan metadata `preorderId`, `preorderDp:true`, dan referensi preorder. Tidak boleh `D.transactions.push()` langsung.
3. Simpan `dpTxId`/metadata pada preorder, lalu `save()`.
4. Jika penyimpanan preorder gagal, panggil `FinanceTxSOT.removeById(dpTxId)` sebagai kompensasi. Jika kompensasi gagal, hentikan dan laporkan status rekonsiliasi manual; jangan pura-pura sukses.
5. Gunakan idempotency key deterministik per preorder + tahap DP agar double tap tidak menciptakan pemasukan ganda.

## Saat preorder dipenuhi — DP tidak dihitung ganda

`recordShopSale()` tetap mencatat penjualan penuh satu kali dan `syncShopSalePayment()` tetap menjadi satu-satunya jalur rekonsiliasi pembayaran penjualan. Sebelum memanggil `syncShopSalePayment()`, hitung DP yang sudah dibayar hanya dari transaksi kanonis yang terverifikasi oleh `FinanceTxSOT` dan cocok `preorderId`.

Perlu kontrak baru yang disetujui pada `syncShopSalePayment()` untuk menerima pembayaran terdahulu sebagai bagian dari total, atau fungsi kanonis yang sudah tersedia bila audit membuktikannya. **Jangan** sekadar mengirim `dpRaw = total` atau mengurangi nominal transaksi pemasukan DP secara manual; keduanya berisiko menggandakan pemasukan atau membuat saldo akun tidak konsisten. Sampai kontrak itu tersedia dan diuji, fitur DP tidak boleh diaktifkan.

Setelah penjualan dan pembayaran akhir berhasil, tandai transaksi DP sebagai `applied` hanya sebagai metadata; transaksi pemasukan DP tetap tercatat satu kali. Sisa piutang harus sebesar `max(0, total - DP tervalidasi - pembayaran tambahan)` melalui jalur piutang kanonis yang sama.

## Batal / refund dan reversal atomik

- Batalkan preorder tanpa DP: perilaku tahap 1 tetap seperti sekarang.
- Batalkan preorder dengan DP yang belum dipenuhi: validasi dahulu transaksi DP, statusnya belum reversed, dan saldo/akun refund tersedia sesuai aturan bisnis yang disetujui.
- Reversal harus memakai jalur refund/FinanceTxSOT kanonis yang telah diaudit. Jangan menghapus transaksi DP secara diam-diam jika kebijakan akuntansi mengharuskan jejak refund.
- Jalankan mutasi dalam urutan validasi → tulis refund/reversal melalui SOT → update status preorder → `save()`. Jika salah satu gagal, kompensasi melalui SOT yang sama dan kembalikan status preorder.
- Idempotensi refund menggunakan ID preorder + jenis aksi; klik ulang tidak boleh menghasilkan refund kedua.

## Backup, restore, dan migrasi

`D.preorders[]` dan metadata DP ikut payload backup karena berada di dalam `D`. Restore lama tanpa `preorders` harus menginisialisasi array kosong. Restore harus memvalidasi referensi `dpTxId`; referensi hilang dilaporkan sebagai warning, bukan membuat transaksi uang sintetis. Tidak ada migrasi yang membuat ulang pemasukan DP berdasarkan `dpAmount`.

## Matriks uji wajib sebelum implementasi

| Skenario | Ekspektasi |
|---|---|
| Buat DP valid | Satu transaksi FinanceTxSOT, satu `dpTxId`, saldo akun bertambah tepat DP |
| Double tap DP | Tidak ada transaksi kedua |
| DP + pelunasan saat Penuhi | Total pemasukan tidak melebihi nilai penjualan; DP tidak dihitung dua kali |
| DP + sisa piutang | Piutang = total dikurangi DP dan pembayaran tambahan |
| Gagal simpan preorder setelah DP dibuat | Kompensasi melalui FinanceTxSOT; saldo kembali persis |
| Batal preorder ber-DP | Satu reversal/refund kanonis, tidak ada refund ganda |
| Gagal saat reversal | Status preorder dan keuangan kembali konsisten |
| Backup → restore | Referensi DP dan preorder tetap cocok |
| Restore backup lama | Tidak error; tidak menciptakan DP |
| Hapus transaksi DP dari Keuangan | Preorder ditandai perlu rekonsiliasi / dibuka kembali sesuai keputusan bisnis, bukan diam-diam tetap paid |
| Audit saldo | `D.transactions`, `D.cobek`, `D.piutang`, saldo akun sebelum/sesudah cocok pada tiap tahap |

**Keputusan yang masih diperlukan sebelum coding:** apakah refund DP harus menghapus transaksi asli (jika kebijakan internal mengizinkan) atau membuat transaksi refund/reversal terpisah lewat FinanceTxSOT. Desain ini tidak memilih salah satunya tanpa persetujuan.
