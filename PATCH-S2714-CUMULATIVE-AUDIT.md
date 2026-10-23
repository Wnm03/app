# S2714 — Cumulative Car Notes SOT and regression audit

## Work included
- Fixed the stale service-history source-contract test to assert the current `sessionCountLabel` behavior, including filtered-vs-total count disclosure and deletion scope.
- Added conservative deduplication at `VehicleCarNotesSOT.getServiceCategories()` for rows that share the exact category ID and canonical component and have equivalent effective interval/reminder values. Missing `intervalBulan` and explicit `0` are treated as the same effective interval.
- Conflicting intervals and distinct category IDs are deliberately preserved for review; this is not a blanket merge by name/component and does not silently overwrite reminder intervals.
- Added regression tests for the backup-derived duplicate `Oli Mesin` row and for preserving conflicting/different-ID rows.
- Refreshed `docs/AUDIT_MATRIX.md` counts to the canonical build inventory so the build no longer warns that the coverage baseline is stale.
- Rebuilt bundles and bumped synchronized runtime/cache version to 2672.

## Verification
- Full test runner: 9231 tests, 9230 pass, 0 fail, 0 cancelled, 1 skipped. All 32 shard checkpoints verified under the same manifest.
- Focused SOT regression: 12/12 pass for S2071, S2459 residuals, and S2714 backup duplicate-category handling.
- Reminder/history regression group: 17/17 pass.
- `npm run build`: passed; both generated bundles passed `node --check`, HTML shells synchronized, service worker cache version synchronized.
- `node scripts/verify-bundle-freshness.js`: passed after final rebuild.
- `node scripts/verify-carnotes-integrity.js`: passed, with 0 forbidden declarations and 0 duplicate IDs.

## Remaining non-blocking review notes
- `modules/vehicle/servis.js` remains 2054 lines, above the 1600-line maintainability threshold; build warns but passes. This is a refactor risk, not a reproduced runtime bug, so it was not split mechanically in this patch.
- No claim is made that a real Chromium/mobile device session was run against the uploaded backup. Backup-derived data cases are covered by deterministic Node regressions.
- One test is marked skipped by the existing full-suite harness; no test failures remain in the verified full suite.
