# S2280 — Lazy Loader Failure-Recovery / Partial-Load Matrix

## Scope

Audit the five production lazy-loader boundaries in `modules/shared/feature-lazy-loader.js` for partial-load failures and subsequent retry behavior.

The matrix injects deterministic failures at the first, middle, and final dependency boundary, then retries through the same loader context. For chained features (Honda PDF and Shop PDF), a failure in the already-resolved Vehicle Catalog dependency is treated differently from a failure in the feature's own scripts: once Vehicle Catalog has resolved, a retry must not duplicate that dependency load.

## Result

**46/46 PASS**.

Coverage:

- Vehicle Catalog / Scanner: first, middle, final dependency failure + recovery.
- Honda PDF: failure in Vehicle Catalog dependency and Honda PDF chain + recovery.
- Data Health: single-script failure + recovery.
- Laporan Export: single-script failure + recovery.
- Shop PDF: failure in Vehicle Catalog dependency and Shop PDF chain + recovery.
- Explicit stale-promise check after the first Vehicle Catalog dependency fails.
- Concurrent callers receive rejection from the same failed in-flight promise.
- Retry begins from the appropriate valid boundary and does not retain a rejected promise.

## Finding

No production defect was identified in the audited failure/recovery contract. The existing `.catch()` handlers reset the corresponding loader promise to `null` after rejection, while already-resolved dependencies remain resolved and are not redundantly reloaded on later feature retries.

## Boundary

This is deterministic Node/VM contract simulation. It does not constitute browser/device E2E, real Service Worker execution, or network-failure testing.
