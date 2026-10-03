# Laporan Build & Test — Akumulasi S2369–S2391

Basis: `app-main (16).zip` (baseline) + `PATCH-S2369-S2391-CUMULATIVE`. `DELETE-FILES.txt` diproses (`pro-ui-layer.css` sudah tidak ada di baseline).
Jenis paket: **patch saja** — tidak digabung menjadi full source, dan hasil build tidak disertakan.

| Langkah | Hasil |
|---|---|
| Baseline murni, `node --test tests/*.test.js` | 8273 test, 8271 pass, 1 fail (dashboard insight, sudah ada sebelum patch), 1 skipped |
| Baseline + S2369–S2390, test penuh | 8328 test, 8321 pass, 6 fail (kontrak sumber/ukuran tertinggal setelah optimasi `servis.js`) |
| Baseline + S2369–S2391, test penuh (`scripts/run-full-test.js`, apply bersih tanpa build) | **8332 test, 8331 pass, 0 fail, 1 skipped** |
| Tes terfokus S2391 | 4/4 pass |
| `node scripts/build.js` (tanpa minify) | OK — sintaks kedua bundle valid |
| `verify-bundle-freshness` | OK — bundle A dan B segar |
| `build.js --require-minify` | GAGAL — esbuild tidak tersedia (sandbox tanpa jaringan) |
| ESLint / `npm run lint` | TIDAK DIJALANKAN — ESLint tidak tersedia |
| `release-check`, `release-final-gate` | TIDAK DIJALANKAN |

## Catatan
- S2391 hanya mengubah 5 file tes (`s2252`, `sa-c`, `s2001-s2003`, `v27`, `v28`) dan menambah tes S2391; folder `modules/` identik dengan S2390 (tanpa perubahan runtime).
- Hasil test penuh yang sama (8332/8331/0) didapat pada tree yang sudah di-build maupun apply bersih tanpa build.
- `build.js` menaikkan versi dan meregenerasi bundle/sw.js/index.html; hasil itu **tidak** menjadi bagian patch ini.
- Dua file di root zip lama (`s2377-...test.js`, `s2389-...test.js`) adalah duplikat dari `tests/`; paket ini tidak menyertakannya.

## Status
Valid untuk uji fungsional, **bukan release-ready**. Untuk rilis: `npm install --save-dev esbuild && npm run build && npm run lint && npm run release-check`, lalu gate release lainnya, di environment yang lengkap.
