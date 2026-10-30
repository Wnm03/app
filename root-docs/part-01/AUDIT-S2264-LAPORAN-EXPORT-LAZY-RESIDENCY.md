# S2264 — Laporan Export Lazy Residency Audit

## Scope
Audit Bundle-B terhadap `laporan-export.js` dan boundary export PDF/gambar.

## Finding
`laporan-export.js` adalah feature-only adapter. Source hanya menyediakan:
- `buildLaporanExportData()` untuk kebutuhan export;
- `exportLaporanPDF()` yang dipanggil oleh action export PDF;
- `exportLaporanImage()` yang dipanggil oleh action export gambar.

Dependency data (`getRange`, `getLaporanFilters`, `txMatchesFilters`, `D`) tetap eager. Dependency renderer PDF/image (`ensureJsPDF`, `ensureHtml2Canvas`) sudah lazy dan tidak berubah.

Tidak ditemukan consumer startup yang membutuhkan `laporan-export.js`. Satu wrapper FAB (`laporanFabExportPDF`) kini menunggu loader sebelum memanggil export.

## Repair
1. Hapus `laporan-export.js` dari `GROUP_B` eager.
2. Tambahkan `ensureLaporanExportScripts()` ke `feature-lazy-loader.js` memakai `_loadScriptOnce()` dengan dedup + reset-on-error.
3. Tambahkan lazy retry untuk `exportLaporanPDF` dan `exportLaporanImage` pada dispatcher `data-action`.
4. Update `laporanFabExportPDF()` agar memuat modul sebelum eksekusi.
5. Pertahankan source `laporan-export.js` sebagai file runtime yang sama; tidak ada perubahan logic export.

## Measured State
- GROUP_B: **360 files**
- GROUP_B source bytes: **4,902,461 B**
- Bundle-B: **4,917,498 B**, UNMINIFIED
- `laporan-export.js`: **8,217 B** dipindahkan dari eager residency ke on-demand residency.

## Verification
- Bundle freshness: PASS
- Bundle syntax: PASS
- S2250/S2253/S2254/S2258/S2261/S2262 regression: PASS
- Backup integrity S1901: PASS
- Backup snapshot consistency S2216: PASS
- Cross-tab restore convergence S2217: PASS
- S2264 targeted tests: **4/4 PASS**
- Combined targeted regression: **26/26 PASS**

## Build limitation
`node scripts/build.js` tetap BLOCKED sebelum bundle generation karena 4 konstanta versi legacy (`MODULE_RENDER_VERSION`, `MODAL_VERSION`, `MODULE_CALC_VERSION`, `MODULE_FEATURES_VERSION`) masih `s2041-1-part-sot-hardening-2206` sementara canonical version terdeteksi `s2041-1-part-sot-hardening-2207`.

Bundle-B kemudian diregenerasi secara deterministik dari GROUP_B aktual tanpa version bump, sehingga `verify-bundle-freshness.js` tetap PASS. Production minification juga belum dapat diverifikasi karena `esbuild` tidak tersedia.
