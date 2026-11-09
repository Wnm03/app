# FASE 0 — UI quick win (RENCANA-UPGRADE-FRONTEND.md), build s2433-fase0-ui-quickwin-2755

Target: 5 butir Fase 0. Hanya CSS (0 perubahan markup/logic).
- `styles.css`: ring inset `:where(...,.active)` kini `.active:not(.page)` -> bingkai `.page.active` hilang (temuan #1).
- `modern-ui-layer.css` (blok "FASE 0" di akhir file; tidak ditaruh di pwa-ui-layer.css karena budget 15 KB, dan tanpa selector `[data-action]` sesuai kontrak S2103/S256AD):
  - bottom nav latar hampir solid + blur (#11)
  - FAB "＋" ikon putih di atas aksen digelapkan, kontras terjaga di semua tema (#4 sebagian)
  - kartu 3 kolom -> 2 kolom + 1 penuh di <=420px, `min-width:0`, `tabular-nums`, baris ringkasan rata baseline (#6)
  - target sentuh >=44px (<=1024px / pointer:coarse) untuk tombol kendaraan, "Isi KM awal", nominal klik; header badge >=44px, tab >=40px (#10)
## Hasil (capture-baseline.py)
| Metrik | Sebelum | Sesudah |
|---|---|---|
| Kontrol <40px mobile (8 halaman) | 3 di Keuangan, 2 di Car Notes | 0 di semua |
| Kontrol <40px tablet | Keuangan 3, Car Notes 2 | 0 |
| Desktop Car Notes / Pengaturan | 19 / 30 | 12 / 12 (target <3 -> Fase 4) |
| Error konsol / scroll horizontal | 0 / 0 | 0 / 0 |
## Test
Full suite: 9485 pass / 17 fail. Baseline sebelum patch: 42 fail (bundle basi). 17 sisanya semua juga gagal di baseline; 0 kegagalan baru.
Build: `node scripts/build.js s2433-fase0-ui-quickwin-2755` (cache kw-cache-v2755); `refresh-file-hashes.py --write` dijalankan.
Release gate lint/minify: tidak dijalankan penuh di sandbox (tanpa jaringan).
## Belum / lanjut
Fase 1 (token & tipografi). Teks <=11px, `!important`, desktop layout belum disentuh.
