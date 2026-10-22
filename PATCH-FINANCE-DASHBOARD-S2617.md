# Patch kumulatif Finance Dashboard & UX — S2617 / build v2617

Basis: `app-main (33).zip` + seluruh file dari `PATCH-dashboard-audit-v2616.zip`. ZIP final hanya memuat file baru/berubah dibanding baseline.

## Implementasi yang termasuk
- Akumulasi dashboard audit v2616: presenter ringkasan read-only, pusat perhatian lintas domain, pantau domain, tren 6 bulan, empty-state lebih bersih, serta perapihan tab/kartu dashboard.
- Transfer dari saldo akun yang tidak cukup kini memunculkan konfirmasi lunak sebelum mutasi; pengguna tetap dapat melanjutkan jika menyetujui. Saldo dibaca melalui `recalcAccBalance()`.
- FAB Uang dan FAB Laporan yang tidak terjangkau dinonaktifkan dari layout/hit-testing; jalur tambah transaksi dan export yang terlihat tetap tersedia.
- Bundle dibangun ulang dan versi disinkronkan ke v2617.
- Tes regresi baru untuk konfirmasi saldo minus dan FAB mati.

## Verifikasi
- `npm run build`: LULUS; kedua bundle lolos `node --check`; HTML dan cache service worker sinkron v2617.
- Tes regresi S2617: 2/2 lulus.
- `npm test`: proses suite penuh melewati batas waktu lingkungan saat sekitar tes 3.417; tidak ada klaim full-suite lulus. Jalankan ulang di lingkungan tanpa batas waktu untuk hasil final.
- Lint dan browser E2E pasca-patch belum diverifikasi.

## Batas cakupan
- Patch ini belum menyatukan semua presenter analitik menjadi satu proyeksi/kartu kanonis, belum memindahkan semua tile sparepart secara struktural, dan belum mengimplementasikan lazy-render per sub-tab. Perubahan itu membutuhkan restrukturisasi presenter/UI lebih luas agar tidak memutus selector dan navigasi. Jangan anggap rekomendasi tersebut selesai hanya dari patch ini.
