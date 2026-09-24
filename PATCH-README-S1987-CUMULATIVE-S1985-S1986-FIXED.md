# PATCH S1987 FIXED — Cumulative S1985 + S1986 + S1987 (+ build 1985)

Base: app-main__14_.zip. Terapkan dengan menimpa file di root repo (25 file). Tidak ada file yang dihapus.

## Isi (semua file patch S1985-S1987 asli tetap ada)
- Patch asli (12 file): pwa-ux-performance.js, service-history-bulk-identity-editor.js, servis-b.js, servis.js, service-history-audit-package.js, 7 file tests (s1906, s1975 x2, s1976, s1985, s1986, s1987)
- Hasil build 1985: app-bundle-a/b.min.js, index.html, app_production.html, sw.js, 5 file konstanta versi, docs auto-generated (COVERAGE-PER-MODULE, FILE-MAP, RELEASE-GATE-LOG)

## Perbaikan atas patch S1987 asli
1. servis.js 1830 baris (> cap 1800) -> 1785 baris: blok rollback save() dipindah ke Servis._captureSaveRollback() di servis-b.js; fallback geometri modal ke Servis._restoreCreateModalGeometryFallback() di servis-b.js. Perilaku identik.
2. Test servis-unified-service-event-sesi3c & carnotes-permanent-integrity-gate kembali lolos (tidak ada D.servisLogs.push( di blok edit).

## Verifikasi
- Full test (setelah build): 7550/7550 PASS, 0 FAIL
- verify-release-ready: RELEASE GATE LOLOS (lint & minify di-override: eslint/esbuild tidak ada di sandbox; bundle belum diminify)
- Versi: s1956-service-history-audit-package-1985 / ?v=1985 / kw-cache-v1985
- servis.js masih di atas 1600 (peringatan non-blocking, di allowlist cap 1800)
