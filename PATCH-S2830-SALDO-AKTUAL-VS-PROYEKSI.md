# PATCH S2830 — Saldo aktual vs proyeksi untuk transaksi bertanggal masa depan (AKUMULATIF S2821 s/d S2830)
Dasar: S2829 -> build 2848. Keputusan: opsi 1 (disetujui). Tanpa flag baru, tanpa migrasi data; baseline S2812–S2813 tidak disentuh.

## Aturan
- Saldo AKTUAL (`recalcAccBalance`, `totalSaldoAkun`) = baseBalance + transaksi bertanggal <= hari ini. Transaksi tanpa tanggal / tanggal non-ISO dianggap sudah terjadi (data lama tidak berubah). `hitungKas:false` tetap diabaikan.
- Saldo PROYEKSI (`recalcAccProjectedBalance`, `totalSaldoProyeksi`) = aktual + transaksi bertanggal setelah hari ini. Filter akun total sama persis dengan total aktual.
- Transfer bertanggal masa depan tidak mengubah saldo aktual di kedua akun.

## Perubahan
- `modules/finance/akun.js`: rumus bersama `_accCalcBalance`; cache saldo dikunci ke tanggal hari ini (`_accEnsureDay`) sehingga hari berganti membuang cache otomatis; `splitTxRealisasiProyeksi`; saldo berjalan diurut string tanggal (stabil untuk tanggal sama) dan tetap ledger penuh (baris masa depan menunjukkan saldo proyeksi); `installAccDayRollover` (timer tengah malam + visibilitychange): buang cache, sinkron nilai aset tertaut (disimpan hanya bila ada yang berubah), segarkan halaman aktif.
- `modules/asset/aset-misc.js`: `syncLinkedAssetNilaiFromAkun` mengembalikan jumlah aset yang berubah (0 bila tidak ada); karena memakai saldo aktual, aset tertaut tidak lagi menyerap transaksi masa depan.
- `modules/shared/modules-render.js`: kartu akun menampilkan "📅 Proyeksi ..." bila berbeda dari aktual.
- `modules/shared/modules-render-b.js`: Laporan menambah catatan `lapProyeksiNote` (realisasi vs proyeksi); total Laporan tetap memuat keduanya.
- Restore backup & save() sudah memanggil `invalidateAccBalCache()` (dikunci oleh tes).
- `tests/s2606-...`: tes penjaga sumber disesuaikan karena rumus pindah ke `_accCalcBalance` (tujuan penjaga sama).

## Bukti
- `tests/s2830-saldo-aktual-vs-proyeksi.test.js`: 11 tes (RED -> GREEN).
- Browser (Chromium, build 2847): saldo awal 1.000.000, pengeluaran hari ini 100.000, pemasukan lalu 50.000, pengeluaran +5 hari 400.000 -> aktual 950.000, proyeksi 550.000, total aktual/proyeksi sama; kartu akun memuat "Proyeksi"; catatan Laporan benar; setelah tanggal digeser +5 hari aktual jadi 550.000 lalu kembali 950.000 tanpa invalidate manual; 0 error JS.

## Batas
- Pembaruan tengah malam menyegarkan halaman aktif lewat renderPageContent; timer nyata di perangkat belum diuji (diuji dengan stub timer dan pergeseran tanggal).
- Kartu ringkasan lain (Dasbor, Net Worth) otomatis memakai saldo aktual lewat fungsi yang sama; tidak ada tampilan proyeksi tambahan di sana.
