# PATCH S2828 — Preview Import CSV memberi tahu seksi yang tidak diimpor (AKUMULATIF S2821 s/d S2828)
Dasar: S2827 (build 2843) -> build 2844.

## Perbaikan
- `modules/home/renovasi.js`: `Renov._csvSkippedSections(rows)` menghitung baris seksi DP / TERMIN dan RIWAYAT CICILAN. Dialog konfirmasi Import CSV menambah catatan "N baris DP/Termin dan M baris Riwayat Cicilan tidak ikut diimpor (hanya item rencana)". Perilaku impor item tidak berubah; CSV polos tidak menampilkan catatan.

## Keputusan desain yang direkomendasikan (belum dikerjakan, menunggu persetujuan)
1. Saldo vs pengeluaran bertanggal masa depan: saldo akun hari ini hanya menjumlah transaksi bertanggal <= hari ini; tambah "saldo proyeksi" yang memuat semuanya. Perlu invalidasi cache saat tanggal berganti dan uji di running balance, laporan, aset tertaut, dan restore backup.
2. Import CSV DP/Termin/cicilan: tetap hanya item rencana; DP/Termin dicatat lewat form DP agar tercatat sebagai transaksi nyata.
3. Export/Import Excel & PDF: uji manual di perangkat dengan internet.

## Tes & gerbang
- `tests/s2828-renov-import-csv-seksi-dilewati.test.js`: 3 tes baru (RED -> GREEN).
