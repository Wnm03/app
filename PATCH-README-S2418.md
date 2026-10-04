# S2418 — Self-contained Vehicle Differential Replay Fixes

## Scope
Remove test dependencies on session-local historical replay directories and make the affected Vehicle differential tests reproducible from pristine `app-main (53)`.

## Changes
- Added pristine-baseline reference fixtures under `tests/fixtures/replay-reference/modules/vehicle/` for:
  - `vehicle-sot-fleet-integrity.js`
  - `vehicle-sot-provisioning.js`
  - `vehicle-service-reminder-sot.js`
- S2404 loads the current module from the repository instead of `/mnt/data/replay2404`.
- S2408/S2409/S2410/S2411 use the bundled pristine-baseline fixtures instead of historical replay directories.
- Differential expectations were realigned to the actual app-main (53) baseline: S2410 baseline catalog reads = 4; S2411 baseline category reads = 18 with an 8-read differential.
- S2409 keeps the no-argument behavioral equivalence check and separately verifies the intentional explicit-catalog contract introduced by the cumulative optimization.

## Verification
These tests must run from a clean extraction of `app-main (53)` with the cumulative repair patch applied; no `/mnt/data/replayNNNN` directory is required.
