# S2145 — CSS budget + sinkron docs/ (kumulatif)

## 1. styles.css di bawah budget
- 198.391 B -> 179.550 B (budget 180.000 B; headroom ±450 B).
- Deklarasi lama yang sudah tertimpa dipangkas (fallback dvh/env()/clamp()/-webkit-/@supports TIDAK disentuh);
  komentar panjang diringkas (penanda Sxxxx dipertahankan). Divalidasi bertahap thd 311 tes yang membaca styles.css.

## 2. Bug diagnostik "MIGRASI STORAGE (LEVEL 3) ... _saveImmediate() seharusnya terpanggil" (screenshot)
- Sebab: docs/ (salinan deploy) basi. docs/app-bundle-b.min.js = build s1861 dan test LEVEL 3-nya masih
  cara lama (menimpa _saveImmediate; rapuh antar-bundle). Cara itu sudah diganti hook observer di S1877;
  bundle root sudah benar. docs/index.html juga masih ?v=1628 dan tidak punya styles.css/manifest/icon.
- Fix: docs/ disinkron byte-identik ke root untuk 18 file yang dirujuk index.html/sw.js
  (2 bundle, index, app_production, sw (kw-cache-v2145), 4 css, manifest, 2 icon, 5 loader modules/shared/*.js, nav-scroll.js).
- Tes penuh 7925 pass / 5 fail (5 fail pre-existing di base asli, tidak terkait). Bundle freshness PASS.

## Catatan
- Layout di screenshot (tab Pengaturan 3 kolom sticky, daftar hasil tes scroll internal max-height 360px)
  adalah desain yang ada; aturan CSS-nya identik sebelum/sesudah pemangkasan.
- Setelah deploy, HP perlu memuat ulang (SW baru kw-cache-v2145 akan mengganti cache lama).
