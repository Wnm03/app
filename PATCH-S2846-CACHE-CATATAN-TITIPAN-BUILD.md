# PATCH S2846 (akumulasi di atas S2840–S2845)
Basis: app-main_17. ZIP kumulatif S2840–S2846. Identitas "renov" dan "home in" TIDAK digabung. Tidak ada perubahan angka dibanding S2845.

- finance/akun.js: cache pemilik akun per putaran sinkron (`_dedOwnersOfSafe`, dibuang via microtask) -> `isTxDeductionNonSelfSafe` tidak mencari pemilik per transaksi. Helper baru `adaTxTitipanPemilikSafe`, `titipanPemilikBulanSafe`, `catatanHubTitipanSafe`; `laporanTotalsSafe` mengembalikan `titipanKeluar`; `adaAkunBukanPribadiSafe` juga true bila ada transaksi titipan pemilik lain (grafik Laporan ikut basis pribadi).
- dashboard-hub/dashboard-hub.js: catatan "Pengeluaran bulan ini belum termasuk titipan pemilik lain Rp…" di bawah saldo hero.
- shared/modules-render-b.js: kotak basis Laporan (Pribadi / Arus fisik) juga muncul bila ada titipan pemilik lain; catatan menyebut "titipan pemilik lain (keluar Rp…)" bersama/tanpa dana klien.
- scripts/build.js: menerapkan DELETE-FILES.txt otomatis sebelum preflight.
- tests/s2845-*.test.js: +3 tes. e2e/s2845-form-tagihan.js: +cek catatan Hub & Laporan.

## Verifikasi
Build resmi --require-minify lolos (v2863). Full suite TZ=UTC: 10067 tes, 10066 lulus, 0 gagal, 1 skip. Browser (Chromium 390x844, backup wallpanel-rab): semua cek lulus; Hub catatan titipan Rp4.407.418, Laporan basis pribadi memuat catatan titipan.

## Belum / menunggu keputusan
Perbaikan data lama (transaksi titipan sebelum S2844), default pemilik di transaksi biasa untuk akun pemilik tunggal non-SELF, pelacakan talangan; Android/Safari/Firefox; upload build resmi.
