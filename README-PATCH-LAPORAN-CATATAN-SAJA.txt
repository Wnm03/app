PATCH AKUMULATIF: Laporan catatan-saja (v2925) + perbaikan audit browser Sesi A (B3, B1, B2) + Sesi B (U1, U2, D4) + A2#3 + Sesi C (D1, D2, D3) + Sesi D (D3 akun dipersempit, impor CSV Hitung Kas) + Sesi E (uji yang belum teruji: round-trip backup penuh, D3 via pembayaran tagihan, varian backup)
Baseline: app-main.zip. Timpa semua file, lalu jalankan: npm run apply-delete-manifest
Build akhir: versi 2931 (sw kw-cache-v2931)

[Lama] Laporan/Kelola tidak menghitung "catatan saja" (hitungKas:false) ke total (modules/finance/akun.js).
  tests/laporan-laba-memo-tidak-ganda.test.js

[B3] Anggaran tidak menghitung hitungKas:false: budget.js (matchesTx, getUsed, rollover getEffectiveLimit; drill-down ikut konsisten).
  tests/budget-catatan-saja-b3-v2925.test.js

[B1/B2] Pelunasan piutang (pemasukan 'Piutang') dan pelunasan/cicilan utang (pengeluaran 'Utang') tidak lagi gagal FINANCE_CATEGORY_UNRESOLVED.
  - FinanceCategorySOT.ensureDebtLedgerCategories() (idempoten, per tipe+nama) + unresolvedMessage()
  - default baru cat_piutang_in / cat_utang_out (data-default.js)
  - dipanggil saat boot (backup lama ikut terperbaiki, tanpa bump schema), di createPiutangUtangAutoTx, dan markBillPaid
  - kategori tetap tak ditemukan -> toast jelas + rollback bersih (tidak lagi toast generik)
  tests/piutang-utang-kategori-lawan-b1b2-v2925.test.js

[U1] Tab Laporan Shop: tombol "📤 Excel" (card-setting-btn, pola sama tab Pelanggan/Etalase) memanggil exportLaporanShopXLSX (index.html).
  FAB #shopLaporanFab sengaja tetap pensiun (aria-hidden inert; dikunci tests/s2618-shop-audit-regressions).
[U2] Dropdown akun "Catat juga sebagai transaksi arus kas" (piutang & utang) diawali opsi "— Pilih akun —" (nilai kosong),
  sehingga guard "Pilih Akun dulu" terjangkau dan akun tidak otomatis Cash (modules/finance/piutang-utang.js).
[D4] CSV Laporan: kolom baru di AKHIR "Hitung Kas" (Ya/Tidak) dan "Aliran Klien" (Ya/Tidak); kolom lama tak bergeser,
  parser impor CSV tetap kompatibel; penanda dipulihkan saat impor: lihat [Sesi D] (modules/shared/backup-restore.js).
  tests/sesi-b-ui-ekspor-u1u2d4-v2925.test.js
FILE-HASHES-SHA256.txt ikut diperbarui (tes S256AU).

[A2#3] Transaksi kategori Piutang/Utang (beri/terima pinjaman + pelunasan) = perpindahan uang: tidak masuk pendapatan/biaya pribadi
  (isAliranKlienSafe, modules/finance/akun.js; dipakai DSR, proyeksi kas, Beranda, Laporan basis pribadi, dst). Saldo akun tidak berubah.
  Backup 21 Nov: 0 transaksi berkategori ini -> angka lama tidak berubah. tests/debt-ledger-bukan-pendapatan-biaya-v2925.test.js
[D1] Nilai piutang/utang yang tertaut transaksi arus kas dikunci saat edit (toast menjelaskan; hapus transaksi dulu bila salah).
[D2] Buka lagi piutang/utang tertaut yang lunas membatalkan transaksi pelunasan; lunas lagi membuat tepat 1 yang baru.
[D3] Piutang otomatis "Ditanggung Bersama" ditandai lunas: pilih akun penerima (atau "Jangan catat"); batal = tidak tersimpan; buka lagi membatalkan pemasukan.
  (modules/finance/piutang-utang.js) tests/sesi-c-piutang-utang-d1d2d3-v2925.test.js

[Sesi D] Tindak lanjut opsional dari verifikasi browser Sesi A-C.
  - D3 dialog akun: daftar pilihan akun penerima pelunasan piutang "Ditanggung Bersama" kini hanya rekening milik sendiri
    (isAccOwnershipSelf) + "Jangan catat pemasukan"; akun INVESTOR/pihak lain (mis. "Saldo tagihan") tidak muncul.
    Bila tidak ada akun milik sendiri, fallback ke semua akun (tidak buntu). Indeks pilihan dipetakan ke daftar yang sudah disaring.
  - Impor CSV: kolom "Hitung Kas" = Tidak memulihkan hitungKas:false (catatan saja). Nilai lain/kosong/kolom tak ada = perilaku lama.
    "Aliran Klien" SENGAJA tidak dipulihkan: itu nilai turunan (dihitung dari tautan proyek/pemilik akun), bukan field tersimpan;
    menyimpannya sebagai flag akan tidak terbaca dan bisa menyesatkan. Kolom itu tetap informatif di ekspor.
  tests/sesi-d-d3-akun-csv-hitungkas-v2925.test.js (3 tes gagal di kode lama, 5 lulus di kode baru)
Build ulang 2930: bundle, html, sw.js, 5 file konstanta versi, docs/FILE-MAP.md & docs/COVERAGE-PER-MODULE.md, FILE-HASHES-SHA256.txt.
Catatan: app-main.zip masih membawa modules/modals.js yatim; jalankan npm run apply-delete-manifest dulu (2 tes S1780/s1608 gagal tanpa itu).

[Sesi E] Menutup 3 celah "belum teruji" dari verifikasi Sesi A-C. Semua skenario lulus di browser nyata tanpa temuan bug.
  - Round-trip backup JSON penuh: buildBackupPayload -> importData (input file nyata) -> jumlah semua koleksi, saldo 9 akun, hash transaksi/akun/piutang/utang/tagihan sama; ekspor ulang identik (kanonik, tanpa cap waktu).
  - D3 lewat PEMBAYARAN TAGIHAN nyata (markBillPaid, bukan data langsung): piutang otomatis 200.000 -> dialog akun -> BRI (1 pemasukan Piutang 200.000, Cash tetap) / buka lagi (dibatalkan) / batal dialog (tak tersimpan).
  - Varian backup (bukan hanya backup 21 Nov): C1 akun tanpa field kepemilikan (semua tampil), C2 semua akun INVESTOR (fallback ke semua akun, tidak buntu), C3 tanpa kategori Piutang/Utang (dipulihkan saat boot, alur tetap jalan).
  File baru: e2e/sesi-e-roundtrip-d3.js (47 pemeriksaan; opt-in, BACKUP=/path npm run test:e2e:sesi-e; E2E_SKIP_OK=1 untuk CI tanpa data; tidak menulis file),
  tests/sesi-e-e2e-roundtrip-d3-kontrak.test.js (3 tes: terdaftar, skip bersih, tidak menulis file/angka pribadi), skrip npm test:e2e:sesi-e (package.json), bagian baru e2e/README.md.
  Catatan temuan uji: selisih koleksi saat round-trip hanya _serviceEventOutbox/_financeEventOutbox (array runtime berawalan "_", tidak ikut payload) - bukan kehilangan data.
  Masih tersisa: uji hanya memakai backup 21 Nov + 3 varian turunannya; belum ada backup nyata lain, dan Android/Safari/Firefox belum diuji.
  Rekomendasi tambahan (kode, v2931): dialog D3 mengurutkan akun includeInBalance:false (mis. "p") ke paling bawah sebelum "Jangan catat pemasukan";
  tetap bisa dipilih (akun sendiri yang tidak dihitung bisa jadi tujuan sah), indeks pilihan tetap dipetakan benar (modules/finance/piutang-utang.js; +1 tes di tests/sesi-d-d3-akun-csv-hitungkas-v2925.test.js).
  Build ulang 2931: bundle, html, sw.js, konstanta versi, FILE-MAP/COVERAGE, FILE-HASHES-SHA256.txt (tes S256AU).

Verifikasi: npm test 10.355 tes, 0 gagal (1 skip); e2e Sesi E 47 pemeriksaan lulus di Chromium 390x844 tanpa pageerror; build + node --check lolos.
