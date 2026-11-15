# PATCH S2833 — Pembaruan harian aman saat restore & dipicu pageshow/focus (AKUMULATIF S2821 s/d S2833)
Dasar: S2832 -> build 2851. Hasil audit R-04, R-02 (R-03 dinilai ulang). Tanpa flag data baru, tanpa migrasi.

## Perubahan
- `modules/finance/akun.js` `_accHandleDayChange`: bila `window.__kwRestoreActive===true` langsung keluar (tanpa invalidasi cache, sinkron aset, atau `save()`), dan `_accWatchDay` TIDAK diperbarui sehingga pengecekan diulang pada pemicu berikutnya (R-04).
- `modules/finance/akun.js` `installAccDayRollover`: tambah listener `pageshow` dan `focus` selain `visibilitychange`/timer tengah malam; idempoten karena hari yang sama langsung return (R-02).
- `modules/shared/backup-restore.js`: `applyRestoredData` kini pembungkus tipis yang menyalakan `window.__kwRestoreActive` dan SELALU melepasnya (try/finally) lalu memanggil isi lama `_applyRestoredDataCore` tanpa perubahan logika.
- `tests/s2833-hari-berganti-restore-aktif.test.js`: 4 tes.

## Penilaian ulang R-03 (tanpa perubahan kode)
`saveTx` (`transaksi-b.js:51`) sudah menolak tanggal >1 tahun ke depan atau <2000 lewat `isTxDateImplausible`, dan input tanggal memakai min/max. Risiko tersisa hanya pada jalur non-UI (import CSV/backup) yang tidak divalidasi; tanggal non-ISO diperlakukan sebagai sudah terjadi (aman). Tidak diubah di patch ini.

## Batas
- Timer, `pageshow`, `focus` dan penanda restore diuji dengan stub, belum di perangkat nyata.
- F-02 (versi package.json 0.85.10 vs build 2851) belum diseragamkan: keputusan penamaan versi ada pada pemilik proyek.

## Bukti
- Suite penuh: 9.892 lulus, 0 gagal, 1 skip; bundle segar; `FILE-HASHES-SHA256.txt` disinkronkan (`refresh-file-hashes.py --write`).
