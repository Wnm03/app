# S2400 — Fleet taxonomy reuse within one provisioning run

Baseline: app-main (53)
Accumulated through: S2400

Change:
- `VehicleSOTFleetIntegrity.provisionFleet()` now creates a per-run taxonomy cache keyed by model id.
- `VehicleSOTProvisioning.provisionVehicle()` accepts the internal `_taxonomyCache` option only when supplied by the fleet workflow.
- Individual provisioning/preview behavior remains unchanged; no global cache is introduced.
- Canonical `VehicleModelRegistrySOT.taxonomy()` output and `VehiclePartSOT.seed` remain unchanged.

Validation:
- Fleet taxonomy cache regression: PASS.
- Production minified build remains NOT COMPLETED/BLOCK if esbuild/node_modules are unavailable.
