# S2254 — Accumulation Chain Rebase to app-main (47)

Canonical baseline: `app-main (47)` uploaded 2026-10-02.

This corrected cumulative overlay represents S2248 → S2250 → S2251 → S2252 → S2253 → S2254, rebased against app-main (47).

## Chain audit
- app-main (47) already contains the S2248 lineage payload, so S2248 is not redundantly copied into this delta.
- The previous S2254 cumulative artifact was based on app-main (46). Replay against app-main (47) exposed reintroduction of the 14 S2253 lazy vehicle/catalog entries and removal of `feature-lazy-loader.js` from GROUP_A.
- Corrected state restores all S2253 exclusions, keeps the two S2254 diagnostic exclusions, and restores `feature-lazy-loader.js` to GROUP_A.
- Corrected GROUP_B: 369 entries; raw source: 5,083,334 bytes; fallback Bundle-B: 5,098,694 bytes.
- Baseline files removed: 0.
- Generated build backup artifacts are intentionally excluded from the repair patch.
- S2254 re-audit also corrected the S2250 residency helper/test to read canonical `scripts/build.js`; the stale root `build.js` measurement of 377 entries is no longer used.

## Delta files from app-main (47)
- `AUDIT-S2250-BUNDLE-B-RESIDENCY.md`
- `AUDIT-S2251-REPRODUCIBLE-BUILD.md`
- `AUDIT-S2253-BUNDLE-B-LAZY-RESIDENCY.md`
- `AUDIT-S2254-CHAIN-REBASE-APP-MAIN-47.md`
- `app-bundle-b.min.js`
- `docs/AUDIT-S2252-BUNDLE-B-RESIDENCY.md`
- `docs/AUDIT-S2254-DIAGNOSTIC-AI-RESIDENCY.md`
- `docs/AUDIT_MATRIX.md`
- `docs/COVERAGE-PER-MODULE.md`
- `docs/FILE-MAP.md`
- `modules/shared/boot-early.js`
- `modules/shared/feature-lazy-loader.js`
- `modules/shared/features-helpers-global-security.js`
- `modules/vehicle/vehicle-catalog-ui.js`
- `package.json`
- `scripts/audit-bundle-b-residency.js`
- `scripts/build.js`
- `scripts/s2252-bundle-b-residency-audit.js`
- `self-test.js`
- `tests/s2250-bundle-b-residency-audit.test.js`
- `tests/s2251-production-build-contract.test.js`
- `tests/s2252-bundle-b-residency-contract.test.js`
- `tests/s2253-vehicle-catalog-lazy-residency.test.js`
- `tests/s2254-diagnostic-lazy-residency.test.js`
