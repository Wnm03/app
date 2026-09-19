# S1852 — Standalone Mutation Refresh Regression Hardening

Cumulative follow-up to S1851.

## Fixes
- Guard `refreshAfterMutation()` in isolated mutation modules where tests/loaders can execute without the shared helper:
  - `modules/finance/tagihan-kalender.js`
  - `modules/shop/cobek-etalase.js`
  - `modules/vehicle/servis.js`
  - `modules/home/renovasi.js`
- Remove the empty-catch pattern from performance telemetry (`features-helpers-global-security.js`) without changing behavior: telemetry remains best-effort and cannot affect app flow.
- Harden the S1851 regression test so it accepts the normalized category-index fallback already present in `tx-list-cashflow.js`.
- Add S1852 regression tests for standalone refresh safety and telemetry catch contract.

## Validation
- S1852 targeted hardening + affected historical regressions: PASS.
- Full 32-shard run was attempted; sandbox execution window timed out before a complete valid all-shard gate. Therefore this patch makes **no full-suite PASS claim**.

No schema changes, no feature removal, no UI redesign.
