# PATCH S2834 — Peringatan tanggal tak wajar saat import & dokumen sumber versi (AKUMULATIF S2821 s/d S2834)
Dasar: S2833 -> build 2852. Menutup sisa temuan audit R-03 dan F-02. Tanpa migrasi data.

## Perubahan
- `modules/shared/backup-restore.js`: `_importImplausibleDateNote(rows)` memakai `isTxDateImplausible` (aturan sama dengan `saveTx`: >1 tahun ke depan atau <2000). Hasilnya ditambahkan ke pesan konfirmasi import (JSON/CSV/Cashew) berisi jumlah dan contoh tanggal. Data TIDAK diubah/dibuang; pengguna bisa membatalkan. (R-03)
- `docs/VERSI-APLIKASI.md`: mendokumentasikan sumber versi (nomor build) dan alasan `package.json` tidak diseragamkan. (F-02, tanpa perubahan kode)
- `tests/s2834-import-tanggal-tidak-wajar.test.js`: 2 tes.

## Keputusan yang direkomendasikan
1. **F-02 — jangan ubah `package.json`.** Gerbang rilis memakai nomor build; mengubah versi npm hanya menambah risiko lockfile. Terapkan dokumen ini sebagai acuan.
2. **R-03 — peringatan, bukan penolakan.** Menolak baris bisa memblokir import sah (arsip lama); peringatan sudah menutup kasus salah ketik tahun.
3. **R-06 — tetap lapor-saja.** Perbaikan otomatis relasi yatim saat restore mengubah data keuangan tanpa persetujuan; biarkan pengguna memeriksa lewat audit penanda Renovasi.
4. **Uji manual sebelum rilis** (belum bisa diuji di sini): transaksi bertanggal besok → saldo aktual/proyeksi; hapus transaksi tertaut item lama; restore backup tanpa modul Renovasi; import CSV bertanggal tahun salah; ekspor PDF/Excel; layar 390×844 dan 360×640 terang/gelap.

## Bukti
- Suite penuh: 9.894 lulus, 0 gagal, 1 skip; bundle segar; VERSION-INTEGRITY PASS (2852); hash file disinkronkan.
