# PATCH S2840 — Audit Proyek -> Dana Titipan / Dana Kelolaan / Kepemilikan
Basis: app-main_17.

## Perbaikan
1. modules/home/renovasi.js
   - Baru renovHasClientFlows(p). renovClassifyProject menolak klien->pribadi bila proyek sudah punya DP/refund (sebelumnya DP hilang dari pemasukan DAN tidak tercatat sbg dana tertahan).
   - isAliranKlien: DP/refund hanya dianggap aliran klien bila proyeknya berklasifikasi 'klien' (proyek yatim tetap dianggap klien). Menyembuhkan data lama yg sudah terlanjur diubah ke pribadi.
2. modules/finance/dana-kelolaan.js — sumDanaProyekKlien() (reuse renovDanaTertahan); summary() +danaProyekKlien dan ikut `total`. Mesin renovasi.js lazy: bila belum dimuat -> 0 + ensureKlienEngineSafe(). Tidak dobel-hitung (akun SELF tak dijumlah di sumAccounts).
3. modules/finance/dana-kelolaan-presenter.js — kartu/baris "Dana Klien Proyek (tertahan)" + teks insight.
4. Tes: tests/s2840-proyek-klien-klasifikasi-dan-dana-kelolaan.test.js (6, baru); disesuaikan: tests/renov-client-funds-integration.test.js (toggle klasifikasi tanpa DP), tests/finance-nav-consistency-s254a.test.js (7->8 kartu).

## Verifikasi
Full suite TZ=UTC: base 10010 tes/38 gagal; patch 10016 tes/38 gagal, daftar nama gagal IDENTIK (bundle/freshness/orphan).
## Belum
Bundle produksi belum dibangun ulang (jalankan scripts/build.js); belum diuji di browser/Android.
Temuan 3 (duplikasi aturan pemilik akun di renovClientAccountEligible) tidak diubah.
