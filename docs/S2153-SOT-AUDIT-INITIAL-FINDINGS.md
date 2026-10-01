# S2153 — Initial App-Wide SOT Audit Findings

## Baseline

- Baseline: `app-main (42)` / P4.8 finalized source.
- Existing SOT integrity gate: PASS.
- Existing architecture integrity gate: PASS.
- Existing persistence integrity gate: PASS.
- Existing app-wide hardening gate: PASS.

## Static inventory

- Runtime JS files: 465 scanned by duplicate-code audit.
- Repeated symbol names: 245 (advisory; not all are defects).
- High-use storage roots observed in runtime include `D.transactions`, `D.products`, `D.assets`, `D.servisLogs`, `D.profile`, `D.vehicles`, `D.accounts`, `D.partsStock`, `D.sparepartCats`, `D.bills`, `D.partsCatalog`, `D.components`, and others.

## Canonical domain candidates

### Service event

`D.servisLogs` is the persisted service-fact owner. `ServiceEventSOT` is the canonical validator/normalizer/projection layer over that storage. History, reminder completion, maintenance intelligence, and dashboard calculations should consume this fact rather than create parallel service-fact records.

### Service taxonomy

`ServiceTaxonomySOT` and the generated service master provide canonical `masterCategoryId` / `serviceComponentId`. Legacy category structures must reference these IDs rather than create competing identities.

### Vehicle context

`VehicleScopedSOT` provides the vehicle partition boundary. Vehicle-specific views should default to the active vehicle and only show fleet/all-vehicle data when explicitly requested.

### Reminder

`ServiceReminderPackageSOT` owns reminder plans/packages in `D.serviceReminderPackages`. This is a legitimate domain store, but it must not become a second history store. Due/completion facts must reconcile against service events and canonical interval policy.

### Stock

`D.partsStock` remains the storage owner and `StockCommandSOT` the write authority. This is already strongly hardened by P4.1–P4.8 and should not be refactored casually.

### Finance

`D.transactions` remains the finance fact store. Service/stock integrations should use IDs/references and transaction authority rather than cloning financial facts.

## First consolidation targets

1. **Service identity graph** — remove feature-local category/component identity resolution where canonical resolver exists.
2. **Vehicle scope** — make all service/reminder/history projections consume the same active vehicle context.
3. **Service event graph** — distinguish event facts from projections and compatibility records.
4. **Reminder normalization** — deduplicate plans by canonical target identity without duplicating service history.
5. **Cross-domain references** — prefer stable IDs over copied names/labels/data snapshots except where a historical snapshot is explicitly required.
6. **Duplicate helper families** — consolidate only proven-common helpers after behavior equivalence tests; do not bulk-merge compatibility modules.

## Important distinction

Not every duplicate-looking record is wrong. Historical snapshots, audit trails, immutable evidence, and policy snapshots may legitimately duplicate values. The audit must therefore classify every duplication as one of:

- canonical fact,
- historical snapshot,
- derived projection,
- cache,
- compatibility/legacy data,
- actual duplicate fact.

Only the last category should be removed automatically.

## Next implementation gate

Before production refactoring, each target domain must satisfy:

```text
canonical identity -> canonical storage -> single write authority -> projections -> UI
```

The S2153 map and tests establish this contract without changing existing runtime behavior.
