# PATCH S2835 — Sinkron proyeksi kas, Dana Titipan Akun saat hari berganti, hapus akun (AKUMULATIF S2821 s/d S2835)
Dasar: S2834 (build 2852) -> build 2853. Hasil cek sinkron antar-jalur (proyek, titipan, akun, tagihan, cicilan, bayar bulan depan, utang-piutang). Tanpa migrasi data.

## Perbaikan
1. `modules/finance/cash-projection.js` — Tagihan dibayar di muka ("Bayar Bulan Depan") dicatat bertanggal jatuh tempo (masa depan): keluar dari sisa kewajiban tetapi saldo AKTUAL (S2830) belum terpotong, sehingga `proyeksiSaldoAkhirBulan` terlalu besar. Kini dikurangi `billPaidFutureTotal` (expense ber-`billLinkId`, tanggal > hari ini s/d akhir bulan/siklus, akun yang ikut total saldo, bukan `hitungKas:false`). Field baru `billPaidFutureTotal` di hasil proyeksi.
2. `modules/finance/akun.js` `_accHandleDayChange` — saat hari berganti, `TitipanSync.reconcileAccounts()` ikut dijalankan; `save()` hanya bila baris utang titipan atau nilai aset tertaut benar-benar berubah.
3. `modules/finance/akun.js` `delAcc` — `D.eduFunds[].accountId` dan `D.sewaKios.units[].accountId` ikut dipindah ke akun tujuan, dihitung di `hasLinkedData`, dan ikut snapshot/rollback.

## Bukti
- `tests/s2835-sinkron-proyeksi-titipan-hapus-akun.test.js`: 4 tes (RED sebelum perbaikan -> GREEN). Probe awal: proyeksi akhir bulan 1.000.000 (seharusnya 900.000); utang titipan 500.000 setelah saldo aktual 600.000 (seharusnya 300.000).
- Build 2853 (`node scripts/build.js`), bundle segar, `FILE-HASHES-SHA256.txt` disinkronkan.
- Terapkan `DELETE-FILES.txt` (`node scripts/apply-delete-manifest.js`) setelah ekstrak agar 3 tes bawaan (S1780, s1608, S2308) lulus.

## Batas
- Belum diuji di browser/perangkat nyata; timer tengah malam diuji dengan stub.
- Transaksi non-tagihan bertanggal masa depan sengaja tidak dikurangkan di proyeksi (proyeksi kas memang hanya memuat tagihan + gaji + kiriman).

## Tambahan (gerbang rilis)
- `no-personal-data`: 3 file `data-fix/backup-keluarga-W-...json` + `laporan-perubahan-S2733.json` (berisi transaksi & akun pribadi) dihapus dari repo lewat `DELETE-FILES.txt`. Simpan salinannya di luar repo bila masih perlu.
- `docs-sync`: `docs/` disinkronkan ke root (index.html, app_production.html, sw.js, styles.css, modern-ui-layer.css, pwa-ui-layer.css, tokens.css).
- `verify-release-ready.js` kini LOLOS setelah `apply-delete-manifest`.
