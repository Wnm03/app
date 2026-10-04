# S2412 — Vehicle model resolver fleet-local base lookup cache

Baseline: app-main (53)

Scope:
- Reuse VehicleModelRegistrySOT.find() base-model lookup through a per-run `_baseModelCache` during VehicleSOTFleetIntegrity.provisionFleet().
- Cache lifetime is one provisionFleet() invocation only; standalone VehicleModelResolverSOT.resolve() remains fresh.
- No schema, persistence, SOT ownership, historical-data, or global-cache changes.

Validation:
- S2412 targeted: PASS
- Full vehicle suite: 416/416 PASS
- Bundle-B source residency: 4,863,453 bytes, PASS after manifest refresh
- Cumulative replay: 0 source mismatch
- Production minified build: BLOCK / NOT COMPLETED (esbuild/node_modules unavailable)
