# PATCH AKUMULASI S2812–S2820 (build 2832) — di atas basis app-main (10)

Satu zip berisi SEMUA sesi patch: S2812, S2813, S2814, S2815, S2816 (B1–B8 + rebuild), S2817 (Export/Import Excel Renovasi, build 2829) dan S2818 (F1–F4, F7–F9 sinkron keuangan) S2819 (nominal rupiah utuh, F10, guard kategori; PATCH-S2819-NOMINAL-BULAT.md) dan S2820 (tautkan log kendaraan; PATCH-S2820-TAUTKAN-LOG-KENDARAAN.md). Tidak ada sesi yang hilang; catatan tiap sesi ada di PATCH-S28xx-*.md.

## Cara pasang
1. Unggah/timpa SEMUA file di zip ini ke folder app-main (10), termasuk bundle, index.html, app_production.html, sw.js.
2. Hapus 5 file di DELETE-FILES-S2816-APPLY.txt (`npm run apply-delete-manifest`). ZIP tidak bisa membawa penghapusan.
3. Tidak perlu build lagi (bundle sudah dibangun dari source akhir ini, versi 2830).

## Cara penggabungan
- Basis: app-main (10).
- + isi PATCH-S2816-S2817-AKUMULASI-2829 (source + bundle build 2829).
- + 5 file penuh S2818 (transaksi-b.js, renovasi.js, tes s2817, tes s2818 x2) menimpa versi S2817.
- + S2818-SOURCE.patch (piutang-utang.js, titipan-reconcile.js, data-health-check.js, 4 tes lama): terpasang tanpa konflik.
- Bundle S2818 yang source-only sengaja tidak dipakai; bundle dibangun ulang dari basis (10) yang benar: `node scripts/build.js --require-minify` (2829 -> 2830, 2831 setelah S2819, 2832 setelah S2820). Ini sekaligus menutup masalah `patchMetaById` yang tidak ada di basis (9).

## Hasil
- Full suite `node --test tests/*.test.js`: 9820 tes, 9819 lulus, 0 gagal, 1 skip.
- Build lolos cek sintaks; refresh-file-hashes --write dijalankan.
- Belum diuji di sini: browser (Chromium), SheetJS/jsPDF asli (CDN), Android.
