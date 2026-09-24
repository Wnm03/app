# PATCH S1990 FIXED + TESTS — Canonical Service Hardening (cumulative S1989 + S1990, build 1986)

Base: app-main__15_.zip. Timpa file ke root repo (16 file). Tidak ada file dihapus.

## Isi
- Patch asli S1990: modules/vehicle/servis.js (semua 114 method dipertahankan), app-bundle-b.min.js (di-regenerate build)
- modules/vehicle/servis-b.js: fungsi yang dipindah dari servis.js
- Hasil build 1986: bundle A/B, index.html, app_production.html, sw.js, 5 file konstanta versi, 3 dokumen auto-generated
- BARU tests/servis-canonical-cost-context-s1990.test.js: 14 test runtime untuk fungsi S1990

## Perbaikan atas patch S1990 asli
1. servis.js 1848 -> 1777 baris (cap 1800): pindah ke servis-b.js getCanonicalServiceCost, validateCanonicalServiceCost, syncServiceContextFromChecklist, setManualServiceItemVisible, toggleManualServiceItem, openPhotoLightbox.
2. service-zero-cost-v13: parse biaya legacy di Servis._parseLegacyServiceCost() (baris `const cost=costRaw===''?0:Number(costRaw);` tetap ada di source & bundle).
3. servis-checklist-saveall-sesi2a: syncServiceChecklist(); openModal('servisModal') kembali berurutan.
4. Tidak ada test lama yang diubah.

## Test baru (14) — cakupan
getCanonicalServiceCost (kosong & terisi), validateCanonicalServiceCost (OK, mismatch, negatif/NaN, toleransi 0.005), _parseLegacyServiceCost, setManualServiceItemVisible, toggleManualServiceItem, syncServiceContextFromChecklist (identity, fallback, false), kontrak urutan sync->openModal. Sudah dicek dengan mutation check: mutasi pada toleransi, default biaya kosong, dan guard item terdeteksi.

## Verifikasi
- Full test: 7564/7564 PASS (7550 lama + 14 baru)
- Release gate: LOLOS (lint & minify di-override: eslint/esbuild tak ada di sandbox; bundle belum diminify)
- Versi: s1956-service-history-audit-package-1986 / ?v=1986 / kw-cache-v1986
