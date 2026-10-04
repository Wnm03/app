# S2405 — Vehicle service-state traversal/index hardening

Baseline: `app-main (53)`
Previous cumulative session: `S2404`

## Scope

Harden `VehicleSOTFleetIntegrity.serviceState()` against repeated per-rule scans:

- Build a **per-run** `servisLogs` latest-service index keyed by `vehicleId + catalogPartId`.
- Preserve the existing latest-service ordering semantics: newest `date`, then highest numeric `km` on the same date.
- Resolve current vehicle KM once per `serviceState()` run and reuse it for all rules and the projection.
- Keep fallback behavior in `vsfiLatestService()` / `vsfiDue()` when no index/current-KM snapshot is supplied.
- No global cache, no persistence/schema change, no historical-data mutation.

## Evidence

- S2405 dedicated regression/semantics test: PASS.
- `node --test tests/vehicle-*.test.js`: **406/406 PASS**.
- Bundle-B residency audit: **PASS**, 359 files, measured source bytes **4,861,922**.
- Production minified build: **NOT COMPLETED / BLOCK** because `node_modules` / `esbuild` are unavailable in the replay environment.

## Patch hygiene

Patch remains cumulative from `app-main (53)` and contains only changed/new repair/test/documentation files; no full release, `node_modules`, temp/log/sandbox, or zip-in-zip content.
