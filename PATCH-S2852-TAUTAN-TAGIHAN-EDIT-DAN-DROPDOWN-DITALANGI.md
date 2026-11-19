# PATCH S2852 — Edit modal mempertahankan tautan tagihan; dropdown "ditalangi" disaring
Tanggal: 19 November 2026. Basis: app-main_17 + patch kumulatif S2840–S2851 (zip ini kumulatif; build v2875).

## Perubahan
| # | Perubahan | File |
|---|---|---|
| 1 | Edit pembayaran tagihan lewat modal (cabang umum `_saveTxInner`) tidak lagi melepas `billLinkId` bila tagihan masih ada (aktif atau arsip lunas), transaksi tetap pengeluaran, dan Cara Bayar tidak diganti pengguna. Helper `billLinkKeepOnGenericEdit`. Tetap dilepas bila: Cara Bayar diganti pengguna, diubah jadi pemasukan, atau tagihan sudah tak ada (tautan yatim dibersihkan) | finance/tx-renov.js, finance/transaksi-b.js |
| 2 | Dropdown "🤝 <nama> (ditalangi)" hanya menawarkan pemilik yang punya kartu Dana Titipan nyata (`DanaTitipanPortfolioAPI.build().owners`); nama yang hanya ada di registri pemilik tidak lagi muncul. Pemilik yang sudah tersimpan di tagihan tetap ditawarkan saat edit. `build()` tak ada/gagal = daftar penuh (perilaku S2850) | finance/tx-renov.js |
| 3 | Perbaikan di luar cakupan: lint e2e + mirror docs (lihat Verifikasi) | e2e/dana-proyek-browser/full.js, docs/index.html, docs/app_production.html, docs/sw.js |
| Tes | `s2852-tautan-tagihan-edit-dan-dropdown-ditalangi.test.js` (7 tes) | tests |

`tagihan-kalender.js` tidak diubah (tetap 1599 baris). Cabang tagihan/utang/cicilan/langganan aktif sudah mempertahankan tautan sejak S316 dan tidak diubah.

## Verifikasi
- Full suite TZ=UTC: 10119 tes, 10118 lulus, 0 gagal, 1 skip (sebelumnya 10112).
- Build v2875 via `node scripts/build.js s2852-tautan-tagihan-dropdown-ditalangi-2875`; gate version-integrity, html-sync, version-sync, bundle-freshness, sot-integrity, window-expose: lolos.
- Gate yang tadinya gagal sejak app-main_17 kini beres: `lint` (12 error `no-undef` di `e2e/dana-proyek-browser/full.js` -> header `/* global ... */`; 1815 peringatan lama tidak disentuh) dan `docs-sync` (mirror `docs/index.html`, `docs/app_production.html`, `docs/sw.js` disalin ulang). `verify-release-ready.js` LOLOS (override sandbox hanya bila esbuild/eslint tak ada; kali ini terdeteksi jalan).

## Belum
- Belum diuji di browser (e2e Chromium tidak dijalankan sesi ini); Android, Safari, Firefox juga belum.
- Pembayaran yang Cara Bayar-nya sengaja diganti pengguna di modal tetap melepas tautan (disengaja).

## Terapkan
- Ekstrak zip di atas repo. Zip tidak bisa menghapus file: jalankan `node scripts/apply-delete-manifest.js` (atau build) bila `modules/modals.js` dan `modules/shop/modals.js` masih ada.
