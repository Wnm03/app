# PATCH S2832 — Restore: konfirmasi backup parsial & laporan relasi Renovasi (AKUMULATIF S2821 s/d S2832)
Dasar: S2831 -> build 2850. Hasil audit R-05 & R-06. Tanpa flag baru, tanpa migrasi data.

## Masalah
- R-05: restore memakai merge dangkal (`D={...D,...imp}`); backup yang hanya memuat Transaksi ATAU Proyek Renovasi membuat sisi lainnya memakai data saat ini, sehingga tautan `renovItemLinkId`/`payments[].txId` bisa menunjuk transaksi yang tidak ada.
- R-06: restore tidak memeriksa relasi Renovasi↔transaksi.

## Perubahan (`modules/shared/backup-restore.js`)
- `_restoreRenovPartialRisk(imp,cur)`: true bila backup hanya memuat salah satu sisi dan data saat ini punya sisi lainnya. `applyRestoredData` meminta konfirmasi ("Backup Tidak Lengkap") SEBELUM snapshot/mutasi apa pun; batal = tidak ada perubahan.
- `_restoreRenovRelationIssues()`: memakai `renovMarkerAudit()` (tx-renov.js), hanya jenis `payment-yatim` dan `proyek-hilang`. Setelah commit atomik, bila ada, ditampilkan peringatan "Periksa Relasi Renovasi". Data TIDAK diubah dan restore TIDAK ditolak (backup lama bisa sudah memuat yatim akibat bug F-03, sehingga menolak akan mengunci pemulihan). Kegagalan laporan ditelan dan tidak memicu rollback.
- `tests/s2832-restore-relasi-renovasi.test.js`: 3 tes.
- Build ulang, `?v=2850`, `CACHE_NAME kw-cache-v2850`.

## Batas
- Belum diuji di browser/perangkat (modal konfirmasi dan peringatan diuji lewat kode + tes unit, bukan runtime UI).
- Jenis relasi lain (`tanpa-payment`, penanggung) sengaja tidak dilaporkan saat restore.

## Bukti
- Suite penuh: 9.888 lulus, 0 gagal, 1 skip. Bundle segar (verify-bundle-freshness).
- `FILE-HASHES-SHA256.txt` disinkronkan lewat `python3 scripts/refresh-file-hashes.py --write` setelah build (prosedur repo; tes S256AU).
