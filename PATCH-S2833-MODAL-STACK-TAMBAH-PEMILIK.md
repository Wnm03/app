# PATCH S2833 — Tambah Pemilik tidak bisa diklik (Proyek Renovasi)
Build: s2433-dana-titipan-akumulatif-2859

Akar masalah: accountOwnersModal dibuka di atas renovItemModal; keduanya z-index 200 & bersaudara di #mainApp,
modal Renovasi lebih belakang di DOM sehingga menutupi modal pemilik (tombol tertimpa).

Perbaikan:
- modules/shared/modal-navigasi.js: openModal() menaikkan z-index inline modal bertumpuk (+1 dari overlay terbuka tertinggi, <300);
  dilepas di closeModal().
- modules/asset/aset-owners.js: tombol "Tambah Pemilik" dinonaktifkan untuk aset belum tersimpan.
- tests/modal-stacked-zindex-s2833.test.js (baru). Bundle & file ber-versi ikut ter-rebuild.

Verifikasi: uji browser (Chromium 390x844) — klik Tambah Pemilik dari Renovasi: 3 -> 6 input. Full suite 9913 tes, 3 gagal
(pre-existing di ZIP asli: S1780, s1608 modals.js orphan, S2308 shadow files).
Catatan: docs/app-bundle-*.min.js tidak diubah (salinan docs/ lama, belum memuat dropdown pemilik Renovasi).
