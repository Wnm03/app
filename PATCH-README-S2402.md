# S2402 — VehicleCatalog read reuse within fleet provisioning

Baseline: app-main (53)
Accumulated through: S2402

Change:
- `VehicleSOTProvisioning` accepts an internal `_catalogCache` supplied only by fleet provisioning.
- `VehicleSOTFleetIntegrity.provisionFleet()` creates a fresh catalog cache for each fleet run.
- Multiple vehicles in one fleet run therefore share one `VehicleCatalog.getAll()` promise/read.
- Standalone `provisionVehicle()` calls do not retain a cache across calls.
- Vehicle-level and model-level compatibility filtering remains unchanged.
- Added regression coverage for one-read-per-fleet and no cross-call cache retention.
- Refreshed S2252 Bundle-B source-size pin from measured source payload.

Validation:
- Vehicle/SOT/catalog regression: 108/108 PASS.
- Bundle-B residency contract: PASS.
- Fleet catalog read count: 1 read for 3 vehicles in regression harness.
- Standalone provisioning cache-retention regression: PASS.
- Production minified build: NOT COMPLETED/BLOCK because esbuild/node_modules unavailable.
