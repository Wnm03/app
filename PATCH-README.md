# CUMULATIVE-6 CORRECTED — Persistence Contract + Fresh Bundle

Basis: CUMULATIVE-5-COMPLETE layered onto the full app-main tree.

## Corrections
- Updated legacy persistence tests to assert the serialized persistence-queue contract instead of fixed `IDBStore.set()` counts.
- Updated S1850 to assert the current queue/snapshot contract instead of the removed `_saveQueuedVersion!==version` flush guard.
- Updated S1843/S1851 hard-flush mirror assertions to accept the current `_saveImmediate(json)` contract and versioned snapshot helper.
- Rebuilt `app-bundle-b.min.js` with `node scripts/build.js s1793-final-hardening-1825` so the embedded source hash is fresh.
- Synchronized `docs/app-bundle-b.min.js` with the freshly built bundle-B.
- No manual bundle editing was used.

## Verification performed
- Targeted persistence/regression tests: 12/12 PASS.
- `node scripts/verify-bundle-freshness.js`: PASS.
- `node scripts/persistence-integrity-gate.js`: PASS.
- `node scripts/verify-window-expose.js`: PASS (82 modules).
- Full `npm test` was started in this environment but exceeded the execution time limit before completion; therefore this patch does NOT claim full-suite green here. Run the full suite in the target tree.

## Important
Apply this patch on the same full tree used for the 7097-test run. Do not mix it with an older bundle-B. The corrected regression tests are included in this patch.
