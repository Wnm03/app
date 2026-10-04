# S2410 — Fleet provisioning catalog-cache reuse

Baseline: app-main (53)

Scope:
- Reuse the existing per-run `_catalogCache` from `VehicleSOTProvisioning` when `VehicleSOTFleetIntegrity.provisionFleet()` calls `serviceState()`.
- Keep cache lifetime strictly within one `provisionFleet()` invocation.
- Preserve standalone `serviceState()` / `getSchedules()` fresh-read behavior when no cache is supplied.

Evidence:
- Differential fleet output: PASS after normalizing nondeterministic `provisionedAt` timestamps.
- Fixture catalog reads: 3 -> 1 per fleet run.
- Separate fleet runs do not retain cache: PASS (2 runs -> 2 reads).
- Full vehicle suite: 414/414 PASS.
- Bundle-B residency: 359 files, 4,862,578 bytes, PASS.
- Fresh cumulative replay: 0 mismatch for all patch files.
- Production minified build: BLOCK / NOT COMPLETED because esbuild/node_modules are unavailable.

Patch is cumulative from pristine app-main (53) and contains only changed/new repair/test/documentation files.
