# PATCH S2411 — Fleet provisioning category-cache reuse

Baseline: app-main (53)
Session: S2411

## Scope
- Reuse `vspsCategoriesForModel()` result per model during one `provisionFleet()` run.
- Cache is local to the fleet operation; no global/stale cache.
- Standalone `provisionVehicle()` behavior remains unchanged.

## Evidence
- Differential output: identical after normalizing runtime timestamps.
- Category traversal: reduced for repeated models within one fleet run.
- Full vehicle suite: 415/415 PASS.
- Bundle-B source residency: 4,862,989 bytes, contract PASS.
- Production minified build remains BLOCK because esbuild/node_modules are unavailable.
