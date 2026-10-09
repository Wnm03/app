# S2552 — kumulatif di atas S2551 (dan S2550)

Tanpa perubahan kode produksi; bundle tidak di-rebuild.

## D — kontrak CI
- `ci.yml`: `npm ci --no-audit --no-fund` (sebelumnya `npm install --package-lock=false`).
- `package.json`: `optionalDependencies` `@esbuild/linux-x64` 0.24.0. `package-lock.json`: root diselaraskan, flag `dev` dihapus dari entri linux-x64 (edit minimal manual; versi sah: workflow "Regenerate lockfile").
- `production-release.yml` TIDAK diubah (menunggu keputusan).

## E — triase
- `docs/TRIAGE-S2552-KELOMPOK-E.md`. Tidak ada tes E diubah. s2462 = regresi nyata, butuh keputusan.

## A — tes teks bundle minify
- `tests/helpers/bundleSource.js`: teks bundle tanpa minify, menolak jika marker hash basi.
- `tests/s2552-bundle-source-parity-gate.test.js`: bundle == esbuild 0.24.0(source), byte-identik.
- `tests/helpers/loadBundleVm.js` + `tests/s2552-bundle-vm-runtime.test.js`: bundle minify dijalankan di VM (SOT, navigasi, stok).
- 26 file tes kelompok A membaca `bundleSource` (opsi 3) alih-alih bundle minify.

## Lain-lain
- `FILE-HASHES-SHA256.txt`: 3 hash diperbarui (s2012, s2016, s2017) agar `s256au` tetap hijau.
- Patch ini memuat seluruh isi S2551 (kumulatif). `DELETE-FILES.txt` tetap kumulatif.

## Status tes (full test sharded, 1352 file, 8712 tes)
- 7 gagal, semuanya sengaja ditahan menunggu keputusan: 6 `perf-navigation-v1825` (tes usang) + `s2462` (regresi nyata).
- Dari 44 kegagalan awal: B 5, C 1, D 3, A 28 selesai.
