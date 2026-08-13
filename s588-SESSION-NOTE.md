# SESI 588 — Gate 4 "version-sync" di verify-release-ready.js

## Konteks
Menindaklanjuti bug cache basi (?v=1314 tidak dinaikkan bareng CACHE_NAME
sw.js walau fix logic "Kuota sisa" sudah benar di source — lihat
PATCH-README-v1316-cache-bump.md). `scripts/bump-version.sh` sudah ada dan
sudah benar untuk MENAIKKAN versi, tapi belum ada gate yang BLOCK ZIP kalau
ternyata versi masih tidak sinkron sebelum rilis.

## Perubahan
- `scripts/verify-release-ready.js`: fungsi baru `checkVersionSync()` +
  Gate 4 baru di `main()`. BLOCK ZIP (tanpa opsi override, sama seperti
  Gate 3 html-sync) kalau:
  - `?v=N` di `index.html` tidak seragam antar tag, atau
  - `?v=N` (HTML) tidak sama dengan `CACHE_NAME` `kw-cache-vN` di `sw.js`,
    atau
  - salah satu file/pola tidak ditemukan.
  `checkVersionSync` ditambahkan ke `module.exports`.
- `tests/verify-release-ready-s575-version-sync.test.js` (baru, 4 test):
  gate lolos terhadap repo asli (sudah sinkron di v1316), replikasi logika
  deteksi mismatch, deteksi `?v=` tidak seragam, dan guard file hilang.

## Verifikasi
- `node --test tests/verify-release-ready-s575-version-sync.test.js` →
  **4/4 pass**.
- `node scripts/verify-release-ready.js` → baris baru:
  `✓ GATE version-sync: index.html (?v=1316) & sw.js (CACHE_NAME) sinkron.`
  (lint/minify tetap gagal di sandbox ini karena eslint/esbuild tidak
  terinstall — bukan berkaitan dengan patch ini, murni batasan environment
  tanpa akses jaringan.)
- Full `npm test` (`node --test tests/*.test.js`): **4144 test, 4053 pass,
  91 fail**. Baseline TANPA file test baru sesi ini: **4140 test, 4049
  pass, 91 fail juga** — identik. Jadi **0 regresi baru**; keempat test
  baru semuanya pass. 91 kegagalan itu pre-existing (di modul lain: asset
  owners, data-health-check, dll — tidak tersentuh sesi ini).

## Scope
Hanya 2 file disentuh: `scripts/verify-release-ready.js` (edit) dan
`tests/verify-release-ready-s575-version-sync.test.js` (baru). 0 perubahan
ke logic aplikasi/UI.
