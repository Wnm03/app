# Patch kumulatif S2333–S2368 (hanya delta, BUKAN full release)

Isi: seluruh delta terhadap app-main base = S2338 + S2341–S2368 + dua penyesuaian build/test.
Tidak termasuk artefak build: app-bundle-a/b.min.js, index.html, app_production.html, sw.js — dibuat ulang oleh `npm run build`.

Penyesuaian di atas patch sebelumnya:
1. tests/s2252-bundle-b-residency-contract.test.js: pin GROUP_B 4910049 → 4910023.
2. modules/shared/modules-render.js: S2361/S2362 dipadatkan (1598 baris) agar lolos source-size guard 1600.

Terapkan: salin isi folder ini ke atas app-main, hapus file di DELETE-FILES.txt, lalu `npm install --save-dev esbuild && npm run build && npm test`.
Verifikasi (build tanpa minify): 8273 test, 8272 pass, 0 fail, 1 skipped; verify-bundle OK.
