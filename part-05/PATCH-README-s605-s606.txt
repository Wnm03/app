PATCH s605-s606 — untuk app-main__19_.zip (v1331 -> v1332)
================================================================

Isi zip ini HANYA file yang berubah/baru (bukan seluruh app). Cara pakai:
timpa (overwrite) file-file di bawah ke atas folder app-main__19_ kamu,
di path relatif yang SAMA PERSIS seperti struktur folder di dalam zip ini.

1) HAPUS dulu (2 target orphan, tidak dipakai di mana pun -- lihat
   CHANGED-FILES-s605-s606.txt untuk detail audit & verifikasi):
   - folder finance/  (SELURUH folder top-level, 40 file .js)
   - modules/shared/akun.js

2) TIMPA file-file berikut dengan versi di zip ini:
   - app-bundle-a.min.js
   - app-bundle-b.min.js
   - app_production.html
   - chat-action-handlers.js
   - docs/COVERAGE-PER-MODULE.md
   - docs/FILE-MAP.md
   - docs/RELEASE-GATE-LOG.md
   - index.html
   - modules/shared/features-helpers-global-security.js
   - modules/shared/modals.js
   - modules/shared/modules-calc.js
   - modules/shared/modules-render.js
   - sw.js

3) TAMBAH file baru (catatan sesi, opsional tapi disarankan disimpan):
   - CHANGED-FILES-s605-s606.txt

Setelah itu app-main__19_ kamu akan identik dengan hasil build s606 (v1332),
sudah termasuk semua fitur S601-604 yang sudah ada di zip aslimu (TIDAK
disentuh sama sekali) DITAMBAH pembersihan 2 orphan di atas.

Kenapa tidak ada file lain yang berubah:
Sesi ini murni penghapusan 2 target orphan + build sync (versi angka,
bundle, FILE-MAP.md, COVERAGE-PER-MODULE.md, RELEASE-GATE-LOG.md). 0 baris
logic produksi di modul manapun (termasuk modules/finance/akun.js,
modules/asset/aset.js, modules/asset/investasi-view.js -- semua logic
S601-604 kamu tetap apa adanya) diedit.

Verifikasi yang sudah dijalankan (detail lengkap di
CHANGED-FILES-s605-s606.txt):
- npm test -> 4216/4216 pass, sama persis sebelum & sesudah patch
- node scripts/build.js -> sukses, v1331 -> v1332
- node scripts/verify-window-expose.js -> OK
- node scripts/verify-bundle-freshness.js -> OK
- node scripts/verify-release-ready.js -> LOLOS (lint & minify di-override,
  keterbatasan sandbox tanpa akses jaringan, bukan temuan dari kode)

Sebelum deploy sungguhan, disarankan jalankan manual di environment dengan
akses internet:
  npm run lint
  npm install --save-dev esbuild && npm run build
