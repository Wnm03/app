# PATCH S2900 — Audit dana proyek: pencairan laba FINAL (sekali), bagi per pemilik, masuk rekening masing-masing
Basis: app-main_21 (build 2910) -> build 2913 (S2900 + S2901 akumulatif). Semua file berubah di ZIP ini; salin menimpa (struktur folder sama).

## Hasil audit (wallpanel, backup 2026-11-21)
1. Laba tidak otomatis = pemasukan - pengeluaran (4 angka: LabaMaks, estimasi RAB-item, laba manual, laba diakui; pengguna memilih jumlah akui).
2. Akui/cairkan bisa berkali-kali.
3. Hanya baris W yang bisa dicairkan; bagian pemilik lain hanya "utang" (529.169) tanpa jalur pencairan.
4. Pencairan hanya entri ledger: tidak ada rekening tujuan, saldo tidak pindah.

## Perbaikan (modules/home/renovasi.js)
- renovLabaFinalHitung(p): laba = penerimaan bersih (DP - refund) - biaya proyek (SEMUA item, termasuk belum terbayar; cadangan atestasi ikut), dibatasi LabaMaks lama (aturan aman tidak dilonggarkan). Wallpanel: 7.000.000 - 4.636.900 = 2.363.100.
- renovFinalPembagian: bagi sesuai porsi bagi hasil (total porsi wajib 100%, pemilik non-W wajib dipilih dari daftar pemilik; selisih pembulatan ke porsi terbesar).
- renovCairkanFinal(p,{rekening,sumberAkunId,tanggal,kunci}): SEKALI (p.pencairanFinal). Atomik + rollback bila save gagal. Langkah: (a) akui selisih laba (laba diakui lama TIDAK dibatalkan, hanya ditambah); (b) bagian W -> ledger cairkan = pendapatan pribadi; (c) utang bagi hasil pemilik lain -> lunas; (d) bagian yang rekening tujuannya beda dgn rekening dana proyek -> transfer antar rekening (transfer_out/transfer_in, transferPairId); (e) simpan rincian per pemilik + rekening.
- Validasi rekening: W -> rekening pribadi dalam cakupan saldo; pemilik lain -> rekening yang memuat porsi pemilik itu (Porsi Akun).
- Dana tertahan dikurangi pencairan ke pemilik lain (renovPencairanLain) -> sisa = biaya belum terbayar.
- Kunci: akui/koreksi/cairkan/batal ledger lama ditolak setelah final. Panel: tombol akui/cairkan lama diganti "Cairkan laba (sekali)"; setelah final tampil rincian per pemilik -> rekening; kolom "Sudah dicairkan" per pemilik terisi.
- Modal baru: Renov.openPencairanFinal / Renov.submitPencairanFinal (pilih rekening tiap pemilik, rekening asal, tanggal, konfirmasi).

## Data wallpanel (uji pada backup asli + rekening home in)
laba 2.363.100: W 800.000 (33,8538%), home in 1.563.100 (66,1462%). Dana tertahan 2.667.582 -> 304.482 (3 item belum terbayar). Syarat: buat rekening dgn Porsi home in 100% sebelum mencairkan.

## Tes & gerbang
Baru: tests/s2900-pencairan-final.test.js (10). tests/s2897-...-sw.test.js dibuat tidak bergantung nomor build. Full suite 10273 tes: 10272 lulus, 0 gagal, 1 dilewati. Release gate LOLOS. Bundle segar, build 2912.
Belum: uji browser/perangkat; transfer tidak memeriksa saldo rekening asal cukup (bisa minus).
File lama yatim yang tetap perlu dihapus manual bila masih ada: modules/modals.js, modules/shop/modals.js (DELETE-FILES.txt).

## S2901 — lanjutan (akumulasi di atas S2900)
1. Cek saldo rekening asal: total transfer > saldo -> pencairan ditolak (minus:true); UI menampilkan konfirmasi "Saldo akan minus", lanjut hanya bila disetujui (izinkanMinus).
2. Tombol "➕ Buat rekening <pemilik>" di modal pencairan bila pemilik belum punya rekening (renovBuatRekeningPemilik: ownership INVESTOR = di luar saldo pribadi, owners = pemilik 100%, idempoten, rollback bila simpan gagal). Menutup syarat manual "buat rekening home in dulu".
3. Integritas: renovLedgerIssues memeriksa pencairan final (total bagian = laba, kedua kaki transfer ada, ledger pencairan = bagian W).
4. Panel: peringatan bila Laba manual berbeda dari laba terhitung (tidak dipakai saat final); setelah final tampil sisa dana tertahan (biaya belum terbayar).
Tes: tests/s2901-pencairan-final-lanjutan.test.js (6). Full suite 10279 tes: 10278 lulus, 0 gagal, 1 dilewati. Release gate LOLOS, build 2913.
Belum: uji browser/perangkat.
