# Audit ketergantungan tanggal pada tes (r3, 2026-10-13)
Alat: `scripts/uji-geser-jam-preload.js` + `scripts/audit-ketergantungan-tanggal-tes.sh` (alat audit saja; TIDAK dimuat aplikasi; tidak ada tes/source yang diubah di r3).
Metode: suite penuh dijalankan dengan jam tergeser (proses + semua konteks vm). Validasi harness: pada 2026-10-12 hasilnya identik dengan jalan normal (8853 tes, 0 gagal pada r2).

| Tanggal tergeser | r2 (rantai lengkap) | Baseline app-main_15 murni |
|---|---|---|
| 2026-10-12 (tanggal penulisan) | 8852 lulus, 0 gagal | (tidak dijalankan) |
| 2026-10-19 | 8852 lulus, 0 gagal | (tidak dijalankan) |
| 2026-12-31 23:30 | 4 gagal | 5 gagal (4 sama + #2979) |
| 2027-03-01 | 10 gagal | 11 gagal (10 sama + #2979) |

Kesimpulan 1: semua kegagalan ini SUDAH ADA di baseline `app-main_15` sebelum patch S2433 apa pun; rantai patch tidak menyebabkan atau memperburuknya. #2979 sudah diperbaiki di r2.
Kesimpulan 2: ini bukan cacat produk yang terbukti; ini tes yang lulus/gagalnya bergantung kapan dijalankan. Contoh bukti kode: `tests/hitungkas-normalisasi-financial-calc.test.js` membangun tanggal fixture dari `new Date()` (bulan/hari berjalan, baris 61-69, 156), sehingga pada awal bulan/akhir tahun jendela tanggal bergeser. Penyebab per tes lain BELUM diselidiki satu per satu.

Tes yang gagal (nomor urut dapat bergeser; kenali dari nama):
- 2026-12-31: "dashboard insight menampilkan ringkasan audit tanpa mengubah transaksi"; "incomeVsExpense() — range eksplisit tetap ikut filter ownership…"; "incomeVsExpense resolves ownership once per account per aggregation…"; "ownership resolution cache is per call…".
- 2027-03-01: yang pertama di atas; "FinCoach.compute() — proyeksiKas >= 0…"; empat tes "FI.annualExpense()/FI.monthlySurplus()" dan "SalaryAllocation.avgMonthlyIncome()" hitungKas; "DanaDaruratAI.computeRecommendation()…"; "KeuanganInsight.compute() cek anggaran…"; "S2337 recommendation keeps Catatan saja income excluded…".

Risiko: gerbang rilis (`service-sot-integrity-gate` -> FULL REGRESSION) bisa gagal pada hari tertentu tanpa perubahan kode (mis. 1 Maret 2027 atau 31 Desember).
Rekomendasi: patch TERPISAH khusus tes keuangan (fixture tanggal eksplisit/clock tetap), dengan persetujuan Anda, TIDAK dicampur dengan rantai S2433 dan tanpa mengubah kode produksi. Sampai itu dikerjakan, jalankan gerbang rilis pada tanggal yang diketahui aman, atau terima kegagalan ini secara eksplisit.
Batas: hanya 4 tanggal diuji; tanggal lain dapat menyingkap tes rapuh tambahan. Zona waktu proses tidak digeser.
