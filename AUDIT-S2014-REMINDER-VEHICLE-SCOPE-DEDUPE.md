# AUDIT S2014 — Reminder Vehicle Scope + Component Deduplication

## Scope

Cumulative base: S2009–S2013 patch.

User-observed regressions from screenshots:
- Reminder/component rows were not strictly projected to the active vehicle.
- Legacy aliases and canonical component names produced duplicate reminder rows.
- `D.sparepartCats` remained a legacy projection while `VehicleServiceSOT`/VehicleCatalog also carried service metadata.
- Category management could expose universal/foreign catalog-linked rows even when the active vehicle was different.

## Root causes fixed

1. Vehicle scope was based primarily on `cat.vehicleId`; explicit VehicleCatalog compatibility was not enforced for universal legacy rows.
2. Component identity was sometimes name-only; aliases such as `Saringan udara` vs `Filter Udara`, `Drive belt (v-belt CVT)` vs `V-Belt CVT`, `Cairan pendingin radiator (coolant)` vs `Coolant`, and `Oli Gardan/Transmisi` vs `Oli Gardan/Final Drive` could coexist.
3. Reminder consumers could read a legacy category projection instead of a single vehicle/component projection.
4. Existing duplicate rows were not normalized idempotently.

## Implementation

Added `modules/vehicle/service-reminder-vehicle-scope-s2014.js` as an additive compatibility/projection layer.

### Canonical identity

Legacy names resolve to the canonical `serviceComponentId` before reminder projection. Canonical IDs remain the identity; display names are not used as the SOT.

### Vehicle scope

- Explicit `cat.vehicleId` must match the active vehicle.
- Explicit VehicleCatalog `compatibleVehicleIds` must contain the active vehicle.
- Model-level compatibility is honored when available.
- A universal category with an explicit catalog link to a different vehicle is hidden for the active vehicle.
- A vehicle-specific category for a component suppresses the universal alias for that vehicle.

### Deduplication

One visible reminder row is retained per canonical component + scope. Priority is deterministic:
- vehicle-specific over universal;
- canonical `serviceComponentId`/canonical name over legacy alias;
- linked catalog row over unlinked row;
- usable interval/show-in-reminder metadata over weaker rows.

### Persisted compatibility cleanup

The migration is idempotent and non-destructive to history IDs:
- backfills `serviceComponentId` and `masterCategoryId` where the canonical resolver is unambiguous;
- duplicate category rows are retained for historical compatibility but marked `_s2014DuplicateOf` and `showInReminder=false` so they cannot leak into reminder/dashboard projections;
- `save()` runs only when changes exist.

### SOT wiring

`getReminderCategoriesForVehicle()` and `VehicleServiceSOT.getReminderCategoriesForVehicle()` now use the same S2014 projection. No second persisted reminder/interval store is introduced.

## Test results

- S2014 focused regression test: PASS.
- Canonical alias dedupe: PASS.
- Foreign vehicle isolation: PASS.
- Explicit catalog compatibility isolation: PASS.
- Duplicate marker isolation: PASS.
- Idempotent cleanup: PASS.
- Legacy alias canonicalization: PASS.
- JavaScript syntax check: PASS — 15 JS files.
- HTML script wiring check: PASS for `index.html` and `app_production.html`.

A complete application/browser suite is not claimed from this patch-only archive because the cumulative patch package does not contain the full repository test helper tree. The previous S2013 full-suite result remains historical evidence, not a rerun in this environment.

## Release notes

Cache version bumped to `v2014`; Bundle-B query bumped to `v2014`; the new projection script is added to service-worker precache.

No minifier/esbuild dependency was introduced. Strict production minification/lint still depends on the release environment providing those tools.
