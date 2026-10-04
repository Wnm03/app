# S2404 — Vehicle service-reminder catalog snapshot reuse

Baseline: app-main (53)
Accumulated through: S2404

## Change
- VehicleServiceReminderSOT.provision/getSchedules now accepts an optional `_catalogCache` from a fleet run.
- When the existing S2403 VehicleCatalog compatibility index is present, service-reminder provisioning reuses the indexed vehicle/model rows instead of calling `VehicleCatalog.getAll()` again.
- Individual provisioning without `_catalogCache` remains fresh and keeps the previous read behavior.
- No global cache, no schema change, no SOT ownership change, no network dependency.

## Validation
- Vehicle suite: 405/405 PASS.
- S2404 cache-specific test: PASS.
- S2403 catalog-index regression: 2/2 PASS.
- S2402 fleet-cache regression: 2/2 PASS.
- S2401 summary regression: 1/1 PASS.
- S2400 taxonomy-cache regression: 1/1 PASS.
- Production minified build: NOT COMPLETED/BLOCK because esbuild/node_modules unavailable.
