# S2403 — VehicleCatalog compatibility index
Baseline: app-main (53)
Accumulated through: S2403

Change:
- VehicleSOTProvisioning keeps the existing per-run VehicleCatalog.getAll() promise reuse from S2402.
- Adds a local compatibility index (vehicleId/modelId) built once per supplied catalog cache.
- Preserves vehicle-first then model-only ordering and duplicate-id replacement semantics.
- Draft catalog rows remain excluded exactly as before.
- Cache remains caller/run-scoped; no global cache and no storage/schema/SOT contract changes.
- Added regression coverage for compatibility, ordering, draft filtering, and cache isolation.
- Refreshed Bundle-B residency measurement from the actual GROUP_B source tree.

Validation:
- Targeted S2400–S2403 vehicle/catalog/registry/scope gates: PASS.
- S2403 focused regression: 13/13 PASS.
- GROUP_B: 359 files; 4,860,584 bytes; contract PASS.
- Production minified build: NOT COMPLETED/BLOCK because esbuild/node_modules unavailable.
