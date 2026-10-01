# S2152 P4.6 — FULL MUTATION & REGRESSION AUDIT

## Scope
Close remaining indirect/alias-based runtime writes to `D.partsStock`, including catalog synchronization, migration, bundled self-tests, and regression coverage. Preserve `D.partsStock` as the storage owner and `StockCommandSOT` as the sole runtime mutation authority.

## Findings fixed
1. `modules/vehicle/vehicle-stock-sot.js`
   - `VehicleStockSOT.apply()` previously mutated catalog identity fields directly on a stock row.
   - Now delegates the complete patch to `StockCommandSOT.update()`.
2. `modules/vehicle/vehicle-catalog-migration-sot.js`
   - Stock-domain catalog backfill previously mutated stock rows directly.
   - Stock-domain writes now use `StockCommandSOT.update()`; non-stock migration domains retain their existing behavior.
3. `data-health-check.js`
   - Catalog unlink now uses `StockCommandSOT.update()` instead of direct field mutation.
4. `modules/shared/self-test-cases-a.js` and `modules/shared/self-test-cases-b.js`
   - Bundled self-tests no longer push/replace `D.partsStock` directly; temporary rows use `StockCommandSOT`.
5. Added `tests/s2152-p4-6-zero-alias-write.test.js`
   - Detects alias-based stock field mutation in known stock mutator modules.
   - Verifies VehicleStockSOT and catalog migration use StockCommandSOT.
   - Verifies bundled self-tests do not bypass stock authority.

## Validation
- P3/P4 focused regression + S2047/S2048/S2049/S2050: **41/41 PASS**.
- P4.5 zero-direct-write tests: **PASS**.
- P4.6 alias-write tests: **PASS**.
- SOT Integrity: **PASS**, runtimeSources=421, build=2164.
- Architecture Integrity: **PASS**, runtime entries=421.
- Bundle Freshness: **PASS**.
- Window expose: **PASS**.
- Production build: **PASS**, version `s2041-1-part-sot-hardening-2164`.
- Bundle syntax: **PASS** for both bundles.
- Root `app-bundle-a/b` direct `D.partsStock = / push / splice` scan: **0** matches.
- esbuild unavailable: bundles are valid but **not minified**.
- Full `npm test`: started and reached test 2125 before the execution time limit; therefore not claimed as complete.
- Service-SOT gate: timed out; **not claimed PASS**.

## Build notes
Build advanced version 2163 -> 2164 and regenerated service master data, FILE-MAP, and COVERAGE-PER-MODULE. `docs/AUDIT_MATRIX.md` remains stale according to the build warning; this is documentation drift, not a P4.6 runtime failure.

## Baseline status
P4.6 is a validated cumulative patch over P4.5. Do not mark the entire release as final until P4.7 closes the remaining full-suite/service-SOT/final production gate.
