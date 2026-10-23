# PATCH-MANIFEST S2707 — Akumulasi S2653 + S2701–S2706 + tes batas performa

- Baseline `app-main (36)` SHA-256 `e907ea71dc49c1febae6e461bf604b70841d92b6b0363e326d21c9ddc76777a6`; build `...-2660` (tidak berubah dari S2706).
- Overlay: hanya file berbeda dari baseline + file baru; tanpa penghapusan; `backups/` tidak disertakan.
- Perubahan S2707 hanya: `tests/s2707-perf-budget.test.js` (baru), `tests/s2704-tx-date-cache.test.js` (diperbaiki), `CHANGELOG.md`, `TEST-RESULTS-S2707.md`, manifest/daftar file.

## Daftar file (60)
- `AUDIT-S2653-KEUANGAN-RINGKAS.md`
- `AUDIT-S2702-INSIGHT-CATALOG-LOOKUP.md`
- `AUDIT-S2703-INSIGHT-INFER-FUEL-CACHE.md`
- `AUDIT-S2704-SERVIS-LOG-MATCH-MEMO.md`
- `AUDIT-S2705-TX-DATE-CACHE.md`
- `AUDIT-S2706-FI-ANNUAL-EXPENSE.md`
- `CHANGED-FILES-S2701.txt`
- `CHANGED-FILES-S2702.txt`
- `CHANGED-FILES-S2703.txt`
- `CHANGED-FILES-S2704.txt`
- `CHANGED-FILES-S2705.txt`
- `CHANGED-FILES-S2706.txt`
- `CHANGED-FILES-S2707.txt`
- `CHANGELOG.md`
- `FILE-HASHES-SHA256.txt`
- `PATCH-MANIFEST-S2701.md`
- `PATCH-MANIFEST-S2702-AKUMULASI.md`
- `PATCH-MANIFEST-S2703-AKUMULASI.md`
- `PATCH-MANIFEST-S2704-AKUMULASI.md`
- `PATCH-MANIFEST-S2705-AKUMULASI.md`
- `PATCH-MANIFEST-S2706-AKUMULASI.md`
- `PATCH-MANIFEST-S2707-AKUMULASI.md`
- `TEST-RESULTS-S2701.md`
- `TEST-RESULTS-S2703.md`
- `TEST-RESULTS-S2704.md`
- `TEST-RESULTS-S2705.md`
- `TEST-RESULTS-S2706.md`
- `TEST-RESULTS-S2707.md`
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
- `tests/fixtures/s2007-reference-original.js`
- `tests/fixtures/s2703-service-input-catalog-original.js`
- `tests/fixtures/s2703-vehicle-core-fuel-original.js`
- `tests/fixtures/s2704-features-helpers-original.js`
- `tests/fixtures/s2704-sparepart-servis-original.js`
- `tests/fixtures/s2705-modules-calc-original.js`
- `tests/s2652-keuangan-ringkas.test.js`
- `tests/s2702-catalog-lookup-cache.test.js`
- `tests/s2703-fuel-infer-cache.test.js`
- `tests/s2704-servis-log-match-memo.test.js`
- `tests/s2704-tx-date-cache.test.js`
- `tests/s2705-fi-annual-expense-alloc-free.test.js`
- `tests/s2707-perf-budget.test.js`

## Penerapan
Ekstrak di atas baseline, lalu `refresh-file-hashes.py --check`, `npm run verify-bundle`, `npm test`.
