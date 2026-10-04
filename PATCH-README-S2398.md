# S2398 — VehiclePartSOT seed lazy materialization

Baseline: app-main (53)

Accumulated through: S2398

Change:
- VehiclePartSOT seed is retained byte-for-byte as canonical JSON payload but parsed only on first access.
- Public `VehiclePartSOT.seed` remains an array via getter; callers are unchanged.
- `vpsEnsureSeeded()` uses the same cached seed.
- No external fetch, no network dependency, no schema/SOT identity change.
- Updated scope and Bundle-B residency tests for the new representation/measurement.

Validation:
- Targeted vehicle/SOT/lazy/master-data gates: 42/42 PASS.
- Replay baseline app-main (53): 0 mismatch.
- Production minified build: NOT COMPLETED/BLOCK because esbuild/node_modules unavailable.
