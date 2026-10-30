# S1877 Rebuild — Laporan Final

**Versi final:** `s1877-selftest-persistence-fix-1874` (`?v=1874`, `kw-cache-v1874`)
**Basis:** app-main (34) v1871 — patch kumulatif S1874–S1877 + rebuild + perbaikan test.

## Yang dikerjakan
1. `node scripts/build.js s1877-selftest-persistence-fix-1874` → APP_BUILD_VERSION, index.html, app_production.html, sw.js, app-bundle-a, app-bundle-b konsisten di 1874 (marker versi di chat-action-handlers.js, modals.js, modules-calc.js, modules-render.js ikut diselaraskan oleh build).
2. `tests/car-notes-json-roundtrip-s1829.test.js` ditulis ulang: menjalankan blok import BBM JSON asli dari backup-restore.js di sandbox vm dan memvalidasi perilaku (source id dipertahankan, dedupe id, dedupe konten, id baru utk legacy tanpa id, fallback vehicleId, idempotent re-import). Bagian service tetap kontrak struktural berbasis regex, bukan literal string lama. 11/11 PASS.

## Hasil
- Full test suite: **7164 tests, 7162 pass, 2 fail** (2 fail = pre-existing baseline, lihat bawah)
- Version-integrity: PASS (1874 / 1874 / kw-cache-v1874)
- SOT / architecture / persistence / PWA-recovery / feature-regression / production-hardening / s1860 hardening / window-expose (82 modul): PASS
- Bundle vs source hash: bundle-a `4702c845f1731db6`, bundle-b `511471f5f850e8ab` — segar
- Release gate: **tidak lolos, hanya karena 2 pre-existing baseline** (firewall 1/10 gate = delete-manifest). 9/10 gate PASS.
- Override sandbox (sama seperti sebelumnya, tanpa override baru): lint/eslint tidak tersedia, minify/esbuild tidak tersedia (bundle tidak diminify, sama dengan baseline).

## 2 failure pre-existing (juga gagal di app-main (34) tanpa patch)
1. `carnotes-theme-pro-rollback` — Pro UI layer masih ada (`pro-ui-layer.css`).
2. `delete-manifest-contract-s1780` — `DELETE-FILES.txt` menunjuk `pro-ui-layer.css` yang masih ada di repo.
`node scripts/service-sot-integrity-gate.js` dijalankan standalone ikut FAIL karena sub-langkah full regression-nya memuat 2 test di atas (baseline juga sama); semua check SOT lain di gate itu PASS, dan di dalam `verify-release-ready.js` gate service-sot-integrity dilaporkan PASS.
Tidak ada override yang dipakai untuk menyembunyikan failure ini.

## Catatan
- `docs/RELEASE-GATE-LOG.md` sengaja tidak disertakan (log lokal sandbox).
- Bundle belum diminify (esbuild tak tersedia di sandbox).
