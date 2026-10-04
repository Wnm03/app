# S2401 — VehicleSOTProvisioning summary traversal reuse

Baseline: `app-main (53)`
Accumulated through: `S2401`

## Change
- `VehicleSOTProvisioning.provisionVehicle()` now reuses the already-built category projection when producing `componentSummary()`.
- This removes a redundant category projection traversal during provisioning while preserving public API/output shape.
- `vehicleDatabaseItems` counting remains exact and independent of category de-duplication.
- Added a regression test covering category de-duplication and item-count invariants.
- Refreshed Bundle-B residency expected size from the actual cumulative source tree: 4,859,671 bytes.
- Removed `service-maintenance-guidance.js` from the patch because it is byte-identical to pristine `app-main (53)` and therefore is not a changed/new repair file.

## Validation
- Targeted provisioning/registry/fleet regression: 12/12 PASS.
- Full vehicle/SOT-related suite: 825/825 PASS.
- Pristine app-main (53) replay: 0 mismatch on changed/new patch files.
- Bundle-B residency contract: PASS at 4,859,671 bytes.
- Production minified build: NOT COMPLETED/BLOCK because `esbuild/node_modules` is unavailable.
