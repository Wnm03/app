# PATCH S2825 — Tagihan tertaut proyek bisa mengisi item RAB yang sudah ada + kategori bawaan Renovasi (AKUMULATIF S2821 + S2822 + S2823 + S2824 + S2825)
Dasar: S2824 (build 2839) -> build 2841. Sumber: sisa temuan audit E2E browser nyata (Chromium), data uji buatan sendiri.

## Temuan #1 — bayar tagihan tertaut proyek membuat item BARU (total rencana dobel)
Sebelumnya `applyRenovBillPayment` selalu membuat/memakai item bentukan bill (`billLinkId`). Bila rencana yang sama sudah ada di RAB (mis. "Keramik" 3 jt), total rencana jadi dobel.
- `modules/finance/tx-renov.js`: bill boleh membawa `renovItemLinkId`. Bila diisi dan item masih ada, pembayaran masuk sebagai payment item itu; harga rencana TIDAK berubah (naik hanya bila terbayar melebihi rencana); lunas otomatis saat terbayar >= harga. Item RAB lama model 1-transaksi (`txId`, tanpa `payments`) dipertahankan sebagai pembayaran pertama. Item dipilih sudah dihapus / tak ada pilihan -> perilaku S2822 (1 item per bill).
- `updateBillRenovItemOptions` (baru): dropdown "Isi item RAB yang sudah ada (opsional)" di form Tagihan, muncul setelah proyek dipilih; hanya item belum lunas dan bukan item bentukan bill.
- `modules/shared/modals.js`: select `billRenovItem` + `data-onchange` di dropdown proyek.
- `modules/finance/tagihan-kalender.js`: simpan/baca `renovItemLinkId` pada bill.
- Hapus/edit transaksi tetap lewat `Renov.onLinkedTxDeleted/Edited` (item RAB tidak ikut terhapus; status lunas dihitung ulang).

## Temuan #2 (bagian kategori) — transaksi tagihan proyek berkategori "Tagihan"
- `tx-renov.js`: `renovBillDefaultCategory()` (kategori pengeluaran yang dikenali `isRenovCatName`). `markBillPaid` memakainya bila bill tertaut proyek dan tidak punya kategori sendiri. Kategori yang dipilih user tetap dihormati.

## Sengaja TIDAK diubah — pengeluaran bertanggal masa depan memotong saldo hari ini
Seluruh model saldo aplikasi (`recalcAccBalance`, saldo berjalan, laporan) menjumlah semua transaksi tanpa memandang tanggal. Mengubahnya menyentuh seluruh keuangan, bukan hanya Renovasi, dan butuh keputusan desain terpisah (mis. flag "terjadwal"). Dicatat sebagai temuan terbuka.

## Tes & gerbang
- `tests/s2825-renov-bill-isi-item-rab.test.js`: 8 tes baru lulus (+ 8 tes S2822 tetap lulus).
- Suite penuh: 9.856 tes, 3 gagal BAWAAN zip (S1780, s1608, S2308), sama seperti S2823/S2824. verify-bundle-freshness OK, verify-window-expose OK, `build --require-minify` OK.
- Browser (Chromium): form Tagihan -> pilih proyek -> dropdown memuat "Keramik", "Cat"; simpan bill tertaut item; Bayar -> item Keramik tetap 1 (harga 3.000.000), payment 1, transaksi berkategori Renovasi + `renovItemLinkId`; 0 error JS.

## Belum diuji / diketahui
- Dialog Tanggal/Konfirmasi pembayaran di-stub saat uji browser (onboarding menutupi layar); logika setelahnya diuji nyata.
- Pembayaran cicilan dari txModal (`transaksi-b.js`) belum punya pilihan item RAB; tetap membuat item bentukan bill.
- Export/Import Excel & PDF belum teruji di browser (pustaka dari CDN).
- Import CSV hanya membawa item rencana (DP/Termin, cicilan, status lunas tidak ikut).
- Saldo vs tanggal masa depan (lihat di atas).
