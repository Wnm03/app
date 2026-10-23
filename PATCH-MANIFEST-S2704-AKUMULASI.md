# PATCH-MANIFEST S2704 — Akumulasi S2653 + S2701 + S2702 + S2703 + memo servisLogMatchesCat

- Baseline: `app-main (36)`, SHA-256 `e907ea71dc49c1febae6e461bf604b70841d92b6b0363e326d21c9ddc76777a6`
- Versi runtime: `s2595-carnotes-null-interval-guard-2658`
- Format: overlay, hanya file yang berbeda dari baseline + file baru. Tidak ada file dihapus; `backups/` tidak disertakan.

## File berubah (21)
- `CHANGELOG.md`
- `FILE-HASHES-SHA256.txt`
- `app-bundle-a.min.js`
- `app-bundle-b.min.js`
- `app_production.html`
- `chat-action-handlers.js`
- `docs/COVERAGE-PER-MODULE.md`
- `docs/FILE-MAP.md`
- `index.html`
- `modern-ui-layer.css`
- `modules/shared/features-helpers-global-security.js`
- `modules/shared/modals.js`
- `modules/shared/modules-calc.js`
- `modules/shared/modules-render.js`
- `modules/shared/pwa-ux-performance.js`
- `modules/vehicle/service-category-sot-reconciliation-s2007.js`
- `modules/vehicle/service-input-catalog.js`
- `modules/vehicle/sparepart-servis.js`
- `modules/vehicle/vehicle-core.js`
- `scripts/verify-window-expose.js`
- `sw.js`

## File baru (23)
- `AUDIT-S2653-KEUANGAN-RINGKAS.md`
- `AUDIT-S2702-INSIGHT-CATALOG-LOOKUP.md`
- `AUDIT-S2703-INSIGHT-INFER-FUEL-CACHE.md`
- `AUDIT-S2704-SERVIS-LOG-MATCH-MEMO.md`
- `CHANGED-FILES-S2701.txt`
- `CHANGED-FILES-S2702.txt`
- `CHANGED-FILES-S2703.txt`
- `CHANGED-FILES-S2704.txt`
- `PATCH-MANIFEST-S2701.md`
- `PATCH-MANIFEST-S2702-AKUMULASI.md`
- `PATCH-MANIFEST-S2703-AKUMULASI.md`
- `PATCH-MANIFEST-S2704-AKUMULASI.md`
- `TEST-RESULTS-S2701.md`
- `TEST-RESULTS-S2703.md`
- `TEST-RESULTS-S2704.md`
- `tests/fixtures/s2007-reference-original.js`
- `tests/fixtures/s2703-service-input-catalog-original.js`
- `tests/fixtures/s2703-vehicle-core-fuel-original.js`
- `tests/fixtures/s2704-sparepart-servis-original.js`
- `tests/s2652-keuangan-ringkas.test.js`
- `tests/s2702-catalog-lookup-cache.test.js`
- `tests/s2703-fuel-infer-cache.test.js`
- `tests/s2704-servis-log-match-memo.test.js`

## Penerapan
1. Ekstrak ZIP ini di atas salinan baseline `app-main (36)`.
2. `python3 scripts/refresh-file-hashes.py --check` (harus basi=0), `npm run verify-bundle`, `npm test`.

## Rollback
Ekstrak ulang baseline, hapus file baru di atas.
