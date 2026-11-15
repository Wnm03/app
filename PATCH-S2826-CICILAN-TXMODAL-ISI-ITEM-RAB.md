# PATCH S2826 — Cicilan dari form Transaksi bisa mengisi item RAB yang sudah ada (AKUMULATIF S2821 s/d S2826)
Dasar: S2825 (build 2841) -> build 2842. Menutup sisa temuan S2825: "cicilan dari txModal belum punya pilihan item RAB".

## Perbaikan
- `modules/shared/modals.js`: select `txRenovItem` ("Isi item RAB yang sudah ada", khusus cicilan) di panel Renovasi form Transaksi; dropdown proyek memanggil `updateTxRenovItemOptions`.
- `modules/finance/tx-renov.js`: `updateTxRenovItemOptions()` — tampil hanya bila Cara Bayar = Cicilan, panel dicentang, dan proyek punya item belum lunas yang bukan item bentukan bill. Dipanggil dari `toggleTxRenovFields`.
- `modules/finance/transaksi.js`: `setPayMethod` menyegarkan dropdown saat Cara Bayar berganti.
- `modules/finance/transaksi-b.js`: item terpilih (divalidasi masih ada di proyek) masuk `renovItemLinkId` pada bill cicilan (tenor 1x maupun >=2x). Pembayaran pertama dan seluruh cicilan berikutnya (lewat markBillPaid, S2825) mengisi item itu; tanpa pilihan -> perilaku lama.

## Tes & gerbang
- `tests/s2826-renov-cicilan-txmodal-isi-item-rab.test.js`: 4 tes baru lulus. Suite penuh 9.860 tes, 3 gagal BAWAAN zip (S1780, s1608, S2308). verify-bundle-freshness, verify-window-expose, `build --require-minify` OK.
- Browser (Chromium): kategori Renovasi + Cicilan 3x + proyek Dapur -> dropdown memuat "Keramik"; simpan -> 1 bill (renovItemLinkId=item, sisa 2x), item tetap 1 (harga 3.000.000, 1 pembayaran), transaksi tertaut item itu; 0 error JS.

## Masih terbuka
- Saldo vs pengeluaran bertanggal masa depan (keputusan desain, lihat S2825).
- Export/Import Excel & PDF belum teruji di browser (pustaka CDN).
- Import CSV hanya membawa item rencana.
- Mengubah pilihan item pada cicilan yang sudah dibuat (edit bill dari Tagihan sudah bisa; edit lewat form Transaksi belum).
