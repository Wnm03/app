# S2015 — Compatibility Projection + Safe Dedupe Hardening

## Cumulative scope

S2015 accumulates S2009–S2014 and closes the follow-up gaps found in the
S2014 vehicle-scope/deduplication audit.

Production entry point:

`modules/vehicle/service-reminder-vehicle-scope-s2015.js`

`service-reminder-vehicle-scope-s2014.js` remains only as a compatibility shim
for older direct references. It is not loaded by the production HTML.

## 1. One compatibility resolver

Added `isCatalogItemCompatibleWithVehicle(item, vehicleId)` as the shared
resolver for service-category projection and catalog/stock visibility.

Rules:

- no `compatibleVehicleIds` and no `compatibleModelIds` = universal;
- matching `compatibleVehicleIds` = compatible;
- matching vehicle `modelId` against `compatibleModelIds` = compatible;
- when both explicit lists exist, either matching dimension is sufficient;
- explicit compatibility with no match = foreign/incompatible;
- model-only compatibility cannot be proven when the active vehicle has no
  `modelId`, so it is not leaked.

The resolver is exposed through `ServiceReminderVehicleScopeS2014` and the
S2015 alias for testability/reuse.

## 2. VehicleCatalog filter hardening

`VehicleCatalog.filterForVehicle()` is wrapped at runtime by the S2015 layer
so existing catalog consumers use the same vehicle/model compatibility rule.
The original function is retained on the wrapper for rollback/debugging.

This removes the previous inconsistency where `compatibleModelIds` was
understood by the S2014 projection but ignored by the base catalog filter.

## 3. Catalog recommendation + stock compatibility hardening

`VehicleCatalog.recommend()` is also wrapped so model-compatible parts are not
excluded from recommendation merely because the legacy recommender only scored
`compatibleVehicleIds`.

`Sparepart.isPartForVehicle()` is wrapped when available so a stock row linked
to a catalog part uses the same shared compatibility resolver. Existing
fail-open behavior is preserved while the catalog is not yet loaded.

## 4. Persisted dedupe is now conservative

S2014 could persistently hide two rows solely because their component and
vehicle scope matched. That was unsafe when the two rows pointed to different
catalog parts with different compatibility sets.

S2015 only persists a duplicate marker when equivalence is proven:

- both rows are unlinked catalog-wise, or
- both rows point to the exact same `catalogPartId`.

Different catalog links remain persisted independently. The projection may
still collapse them for a particular active vehicle, but cleanup no longer
turns an ambiguous data distinction into `showInReminder=false`.

## 5. Stale S2014 marker recovery

Rows carrying `_s2014DuplicateOf` are re-evaluated. If S2015 can no longer
prove that the row is a safe duplicate, the S2014 marker is removed and the
S2014-generated `showInReminder=false` mutation is restored to `true`.

No history IDs are deleted and no finance/transaction/history records are
rewritten.

## 6. Consumer consistency

The existing Reminder path already consumes:

`getReminderCategoriesForVehicle()` → `dedupeServiceCategoriesForVehicle()`

S2015 keeps that SOT/projection path intact and extends compatibility to the
catalog and stock consumers. Raw `D.sparepartCats` access used by category
management/editing remains intentionally raw so users can inspect/edit
persisted records; it is not treated as a Reminder projection.

## 7. Dedupe policy for showInReminder

Reminder rendering continues to filter `showInReminder=false` before the
final reminder projection. S2015 therefore does not let an alias with a true
flag override an explicit hidden canonical record merely through scoring.

## Regression coverage

New S2015 tests cover:

1. universal catalog compatibility;
2. vehicle compatibility;
3. model compatibility;
4. vehicle OR model compatibility;
5. shared `VehicleCatalog.filterForVehicle()` behavior;
6. foreign catalog isolation;
7. model-compatible projection;
8. ambiguous catalog-linked rows are not persistently deduped;
9. safe unlinked alias dedupe remains idempotent;
10. stale S2014 duplicate-marker restoration.

Executed:

- `service-reminder-vehicle-scope-s2014.test.js` → PASS
- `service-reminder-vehicle-scope-s2015.test.js` → PASS

The historical S2012 regression test is present in the cumulative archive but
its helper dependency is not included in this patch-only package, so a full
repository-suite claim is intentionally not made here.

## Cache / wiring

- cache: `kw-cache-v2015`
- bundle query: `v2015`
- production entry: `service-reminder-vehicle-scope-s2015.js`
- both `index.html` and `app_production.html` updated
- service worker precache updated

No new Reminder SOT/store was introduced.
