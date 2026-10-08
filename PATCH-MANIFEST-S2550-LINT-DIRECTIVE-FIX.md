# PATCH-MANIFEST-S2550-LINT-DIRECTIVE-FIX

Patch inkremental kecil di atas S2549 (A1/B7) setelah CI nyata menunjukkan `npm run lint` gagal dengan 61 error.
Baseline: tree S2549 yang sudah di-build (bundle v2274 segar, release-check hanya gagal di gate lint).
Tidak ada perubahan perilaku runtime.

## Akar masalah (dari log CI)
- `modules/vehicle/vehicle-active-sot-s2061.js` (7 komentar): `/* global lexical scope may be ... */` dibaca ESLint sebagai direktif `/* global ... */` yang mendeklarasikan global bernama lexical, scope, may, be, unavailable, in, isolated/test, contexts;, safe, fallback. Akibatnya 60 error `no-redeclare`. Komentar hanya direword (diawali "the lexical scope of globals ...").
- `modules/vehicle/honda-pdf-catalog-auto-import.js`: kunci duplikat `'air cleaner':'filter-udara'` di `HPC_ALIAS` (1 error `no-dupe-keys`). Dua entri bernilai sama, jadi menghapus duplikat tidak mengubah perilaku.

## Tidak diubah (warning saja, bukan pemblokir)
- `modules/shared/features-helpers-global-security.js` baris ~495 punya komentar `/* global export is optional ... */` dengan penyebab sama (hanya warning). Sengaja tidak disentuh agar hash registry dan ukuran file tidak ikut berubah.

## Verifikasi lokal (tanpa eslint/esbuild)
- node --check kedua file: PASS. Tidak ada lagi komentar `/* global ` di dua file itu.
- Tes terkait: honda-pdf-catalog-auto-import 3/3, vehicle-scoped-sot-s2061 9/9, car-notes-vehicle-sot-s2071 6/6, s2258 3/3, s2154-s2159 4/4.
- Suite penuh: 8693 tes, 13 gagal, himpunan kegagalan identik dengan S2549.
- BELUM terverifikasi: `npm run lint` (perlu eslint), build ulang, hash.

## Wajib setelah apply
`vehicle-active-sot-s2061.js` termasuk bundle, jadi: `npm run build` (minify) -> `python3 scripts/refresh-file-hashes.py --write` -> `npm run lint` -> `npm test` -> `npm run release-check`.

BEGIN_APPLY_FILES
modules/vehicle/vehicle-active-sot-s2061.js
modules/vehicle/honda-pdf-catalog-auto-import.js
PATCH-MANIFEST-S2550-LINT-DIRECTIVE-FIX.md
END_APPLY_FILES

BEGIN_DELETE_FILES
END_DELETE_FILES
