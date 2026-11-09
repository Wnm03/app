# FASE 1 — Token & tipografi (kumulatif di atas Fase 0), build s2433-fase1-tokens-tipografi-2756 (kw-cache-v2756)

## Verifikasi pemetaan tema (prasyarat rencana B)
`THEME_ALIASES` (modules/shared/format-tema.js): ocean->dark, stone->light, slate->graphite. Tema kanonik hanya
`dark, light, modern, graphite` (+auto). Dropdown onboarding menawarkan nama alias, sehingga "Ocean" == "Dark" (temuan #4 terkonfirmasi).
CSS: [data-theme] graphite 14x, modern 12x, light 2x, dark 2x di styles.css.

## Perubahan
- `tokens.css` BARU (dimuat terakhir; terdaftar di index.html, app_production.html, sw.js precache, performance-budget, build-preview, sync-docs, verify-docs-sync):
  token --fs-xs/sm/md/lg/xl (12/14/16/20/28), --space-*, --radius-*, --elev-*, --density (Comfort 1 / Compact .86 di >=1100px), --touch-min;
  token lama --fs-caption/label/body/body-lg/title-sm/title/icon/icon-lg/stat dipetakan ke skala 5 ukuran;
  `tabular-nums` di body; lantai 12px untuk teks sekunder berukuran literal (selector spesifik, tanpa !important); label bottom nav tidak membungkus.
- Tes baru: tests/fase0-fase1-ui-tokens.test.js (4 tes).

## Hasil
| Metrik | Awal | Fase 0 | Fase 1 |
|---|---|---|---|
| Teks <=11px, Pengaturan mobile | 41 node | 41 | 1 |
| Teks <=11px, 8 halaman mobile (elemen unik) | banyak | - | ~25 sisa (lihat bawah) |
| Kontrol <40px mobile | 0-3 | 0 | 0 |
| Error konsol / scroll horizontal | 0/0 | 0/0 | 0/0 |
Full suite: 9491 pass / 15 fail; semua 15 juga gagal di baseline asli (42 gagal sebelum rebuild bundle). 0 kegagalan baru.

## Belum / jujur
- `!important` TIDAK dikurangi di fase ini (styles 106, modern 78, pwa 3 baris; angka rencana 115 menghitung berbeda). Migrasi @layer berisiko besar
  terhadap ~1500 test kontrak CSS; disarankan fase terpisah (1b) dengan daftar per-selector.
- Sisa <12px: ikon `.header-badge` (font-size 0 disengaja), `.u-fs14` pada kartu Kekayaan Bersih (10.92px, rule clamp),
  beberapa label dengan selector ber-ID. 
- Skala body 13->14px belum diperiksa pada seluruh sub-tab (hanya 8 halaman default).
- Font web tidak termuat di sandbox.
Release gate lint/minify: tidak dijalankan penuh (sandbox tanpa jaringan).
