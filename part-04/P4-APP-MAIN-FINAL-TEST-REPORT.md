# P4.1–P4.7 APP-MAIN FINAL INTEGRATION TEST REPORT

Baseline: `app-main (41)`
Final integrated build: `s2041-1-part-sot-hardening-2169`

## Full regression

| Run | Total | Pass | Fail | Cancelled |
|---|---:|---:|---:|---:|
| Baseline `app-main (41)` | 7947 | 7940 | 7 | 0 |
| Final baseline + P4.1–P4.7 | 7973 | 7966 | 7 | 0 |

The final 7 failures are the same baseline failures and were not introduced by P4:
- S1860 app-wide hardening gate
- `showFilteredTx` (2 tests)
- empty catch v22
- `vehJenisFieldsHtml` / `vehMetaText` (3 tests)

No additional regression failure remained after the P4 integration fixes.

## P4 / targeted validation

- P4.1–P4.7 regression tests: PASS
- Final P4 static gate: 25/25 PASS
- Targeted integration/regression set after final fixes: PASS
- SOT integrity: PASS
- Architecture integrity: PASS
- Persistence integrity: PASS
- Feature regression: PASS
- Window expose: PASS
- Bundle freshness: PASS
- Production build: PASS
- Bundle syntax: PASS

## Integration fixes included

1. Restored original P2 `modules/vehicle/car-notes-sot.js` dependency.
2. Updated `loadSource` dependency wiring so SOT-dependent isolated tests load `StockCommandSOT`.
3. Updated stale pre-P4 regex/assertion tests to validate the SOT contract.
4. Fixed manual stock-edit journaling so the recorded `qtyBefore` reflects the pre-edit quantity.
5. Fixed bulk-history preservation ordering: restore the removed row through SOT before archiving it.
6. Fixed manual stock catalog-linking to update the canonical stored row through SOT after creation.
7. Fixed catalog→stock synchronization to return/update canonical rows through `StockCommandSOT` rather than detached objects/direct field writes.
8. Updated affected test fixtures to model the post-P4 contract: stock rows under test belong to `D.partsStock`.
9. Updated interval runtime reads to delegate directly to `ServiceIntervalSOT.resolveCanonicalInterval()` before compatibility fallbacks.
10. Synchronized build/version artifacts to build 2169.

## Environment limitations

- `esbuild` is unavailable, so the production bundles are valid but not minified.
- `eslint` is unavailable in the supplied environment, so lint is not certified here.
- The standalone `service-sot-gate` still reports its embedded full-regression subgate as failed because that gate treats the 7 known baseline failures as release failures. Its interval-enforcement check was fixed; the independent full regression confirms there are no new failures.

## Release interpretation

This patch is an integration patch over `app-main (41)`, not a replacement application tree. Apply it on top of that exact baseline.
