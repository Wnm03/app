# PATCH MANIFEST — S2295 Cumulative Regression Repair

## Baseline / apply contract
- Baseline archive: `app-main (15).zip`, build v2290.
- Cumulative chain: S2291 → S2292 → S2293 → S2294 → S2295.
- Target: `s2041-1-part-sot-hardening-2295`, HTML `?v=2295`, SW cache `kw-cache-v2295`.
- Type: cumulative delta relative to the named baseline. Apply every file in this archive over that exact baseline; do not apply only HTML or SW.
- This patch preserves baseline backup artifacts and does not ask the installer to delete files.

## S2295 changes
1. Fix valid backdated BBM entry by validating odometer against nearest prior and next dated logs, excluding the record currently being edited.
2. Preserve editing of legacy transactions whose category was removed, provided the category remains unchanged; unknown category on new/changed transaction is still rejected.
3. Add `tests/s2295-backdate-legacy-category-regression.test.js`.
4. Rebuild and synchronize HTML, production HTML, bundle A/B, service worker cache, generated file map and module coverage; refresh audit matrix inventory.
5. Carry forward the S2291–S2294 cumulative source and regression tests.
6. Add `tests/s2295-behavioral-bbm-category.test.js` (12 behavioural tests that execute the real `BBM._saveInner` and `_saveTxInner` in a vm sandbox; fail on S2294 for R1/R2). No runtime source, bundle, HTML or SW change; build version stays 2295.

## Verification (independent re-audit, 2026-10-11)
- ZIP integrity: PASS; 34 unique file entries, no corrupt archive members.
- Clean overlay: baseline `app-main (15).zip` + every patch entry extracted successfully.
- `npm run build`: PASS. Build script increments the supplied v2295 tree to v2296; this is expected build-script behavior, not a silent change to the submitted ZIP.
- Reproducible build: PASS. Two independent clean overlays produced identical bundle SHA-256 values after build to v2296:
  - `app-bundle-a.min.js`: `91e92b8f47bf2354d9976594bc1e23664f3bcd1b56964b1b1ec11df2836b26ee`
  - `app-bundle-b.min.js`: `988a749a8f73efe698b93337294f67895f77d5a2ba0acd4d5024167e38b600c5`
- `npm run release-check`: PASS, exit 0 on rebuilt v2296; lint gate 0 errors, version/cache and bundle freshness synchronized. Three oversized-source warnings remain non-blocking within guard caps.
- `npm run test:critical`: 10/10 PASS.
- S2295 targeted regression tests: 2/2 PASS; targeted BUG-01..BUG-09 + crash replay set: 17/17 PASS (these tests include source-level assertions and do not establish full UI behavior).
- `npm run test:full` with 64 shards: PASS, 8754 tests, 8753 pass, 0 fail, 0 cancelled, 1 skipped.
- Source-guard execution against the actual BBM neighbor-selection and transaction-category guard snippets: 16 assertions PASS, including backdate, equal-KM boundaries, edit-middle exclusion, same-date behavior, unchanged orphan category, changed unknown category, and missing edit ID. This is a focused guard test, **not** a replacement for end-to-end UI testing.
- Chromium `npm run test:e2e`: BLOCKED before app startup. The managed browser environment displayed “Your organization doesn’t allow you to view this site” for loopback and file URLs. This is an environment restriction, not evidence that the app passed or failed UI behavior.
- ESLint on the changed runtime/test files: 0 errors, 10 `no-unused-vars` warnings.

## Acceptance limitation
Full sharded test suite and release gate pass, but actual Chromium UI verification of R1/R2 and broader UI regressions remains unverified because browser navigation is blocked by the environment. Do not claim “0 gap substantif” or final acceptance until UI behavior is tested in an environment that permits loading the app.

## Independent verification addendum (tests-only increment)
- Full suite via `node scripts/run-full-test.js` (TEST_SHARDS=64, TEST_CONCURRENCY=1): 64/64 shards, 8766 tests, 8765 pass, 0 fail, 1 skipped (pre-existing S2224 replay fixture), ~140 s.
- Release gate: PASS. Bundle bodies match a fresh build (only the src-hash header differs by version number).
- Chromium (programmatic, not UI clicks): R1/R2 edge cases and BUG-01..09 regressions verified.
- Still open: UI-click E2E, offline/import-export, Shop cashier flow, malformed-restore feedback, 71 smoke-test IDs.

## Files changed relative to baseline
See the archive contents. The patch is cumulative and includes prior S2291–S2294 changes as well as S2295 fixes.

## Exact changed-file inventory (relative to baseline)
- `app-main/AUDIT-RANTAI-AKUMULASI-KW-S2295.md`
- `app-main/AUDIT-REKOMENDASI-S2294.md`
- `app-main/PATCH-MANIFEST-S2294.md`
- `app-main/PATCH-MANIFEST-S2295.md`
- `app-main/app-bundle-a.min.js`
- `app-main/app-bundle-b.min.js`
- `app-main/app_production.html`
- `app-main/car-notes.js`
- `app-main/chat-action-handlers.js`
- `app-main/docs/AUDIT_MATRIX.md`
- `app-main/docs/COVERAGE-PER-MODULE.md`
- `app-main/docs/FILE-MAP.md`
- `app-main/index.html`
- `app-main/modules/asset/aset.js`
- `app-main/modules/dashboard-hub/dashboard-hub.js`
- `app-main/modules/finance/akun.js`
- `app-main/modules/finance/piutang-utang.js`
- `app-main/modules/finance/transaksi-b.js`
- `app-main/modules/shared/backup-restore.js`
- `app-main/modules/shared/features-helpers-global-security.js`
- `app-main/modules/shared/modals.js`
- `app-main/modules/shared/modules-calc.js`
- `app-main/modules/shared/modules-render-b.js`
- `app-main/modules/shared/modules-render.js`
- `app-main/modules/shared/smoke-test.js`
- `app-main/modules/shop/cobek-etalase.js`
- `app-main/modules/vehicle/vehicle-core.js`
- `app-main/sw.js`
- `app-main/tests/bug-report-v2290-hardening.test.js`
- `app-main/tests/bug-report-v2290-regression.test.js`
- `app-main/tests/dashboard-performance-hardening.test.js`
- `app-main/tests/release-hardening-s1770-1775.test.js`
- `app-main/tests/s2294-smoke-test-lazy-actions.test.js`
- `app-main/tests/s2295-backdate-legacy-category-regression.test.js`
- `app-main/tests/s2295-behavioral-bbm-category.test.js`
