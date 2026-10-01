# S2153 — App-Wide SOT Architecture Map

## Tujuan

Menetapkan jalur data kanonik agar satu fakta dapat dipakai oleh banyak fitur tanpa membuat salinan fakta baru.

Prinsip yang dikunci:

1. **One canonical owner per fact/domain.**
2. **One authorized write path per mutable domain.**
3. **Many readers/projections are allowed.**
4. UI, dashboard, history, reminder, checklist, insight, dan statistik bukan storage fakta kedua.
5. `vehicleId`, `serviceComponentId`, `serviceSessionId`, `serviceEventId`, `partId`, dan `transactionId` adalah identity key; nama/label bukan identity.
6. Vehicle context harus menjadi partition/filter lintas fitur, bukan filter lokal yang dibuat ulang oleh masing-masing UI.

## Peta canonical

```text
                         MASTER / CANONICAL IDENTITY
                                     |
             +-----------------------+-----------------------+
             |                       |                       |
             v                       v                       v
        VEHICLE SOT             SERVICE MASTER          PART MASTER
             |                       |                       |
             |              +--------+--------+              |
             |              |                 |              |
             v              v                 v              v
      ACTIVE VEHICLE   CATEGORY         COMPONENT        PART/STOCK
             |              |                 |              |
             +--------------+-----------------+--------------+
                            |
                            v
                     SERVICE SESSION
                            |
                            v
                      SERVICE EVENT
                            |
             +--------------+--------------+
             |              |              |
             v              v              v
          HISTORY       REMINDER       CHECKLIST
          (VIEW)       (PLAN/VIEW)       (VIEW)
             |              |              |
             +--------------+--------------+
                            v
                        DASHBOARD
                          (VIEW)
```

## Ownership matrix

| Domain / fakta | Canonical owner | Storage owner saat ini | Write authority | Pembaca utama | Status S2153 |
|---|---|---|---|---|---|
| Vehicle identity | Vehicle SOT | `D.vehicles` | Vehicle lifecycle/API | semua domain | Canonical boundary |
| Active vehicle context | `VehicleScopedSOT` | runtime context `curVehicleId` | `VehicleScopedSOT.setActive()` | semua UI/domain | Canonical context |
| Service category/component identity | `ServiceTaxonomySOT` / generated service master | `SERVICE_CHECKLIST_GROUPS` / generated master | master/build pipeline | Service, Checklist, Reminder, History | Canonical identity |
| Service session identity | `ServiceSessionSOT` | `D.servisLogs[].sessionId` | session mutation/SOT | Service, History, Reminder | Canonical projection over storage |
| Service event/history fact | `ServiceEventSOT` | `D.servisLogs` | service mutation path | History, Reminder, Dashboard, intelligence | **Primary fact source** |
| Checklist execution state | `ServiceChecklistExecutionSOT` | checklist inside service records | service/checklist mutation path | Service UI, Event, History | Derived state on event/session |
| Service interval/policy | `ServiceIntervalSOT` | service master / canonical policy fields | interval policy path | Reminder, Service | Canonical policy |
| Reminder package/plan | `ServiceReminderPackageSOT` | `D.serviceReminderPackages` | reminder package SOT | Reminder UI, Service completion bridge | **Plan/config, not service fact** |
| Reminder due status | derived from Event + Interval + Vehicle | no separate fact required | none | Reminder UI, Dashboard | **Should remain derived** |
| Part stock quantity | `StockCommandSOT` | `D.partsStock` | `StockCommandSOT` | Service, Finance, Sparepart, Dashboard | Canonical mutable stock |
| Part catalog identity | Vehicle Catalog SOT | catalog store | catalog write SOT | Stock, Service, Sparepart | Canonical identity |
| Finance transaction | Finance transaction domain | `D.transactions` | finance transaction path | Finance, Service/Stock bridge | Canonical finance fact |
| Dashboard cards/insights | projection | no domain storage | none | Dashboard | Must not become SOT |

## Canonical sharing rules

### Service

```text
ServiceTaxonomySOT
       |
       +--> serviceComponentId / masterCategoryId
                     |
                     v
              ServiceEventSOT
                     |
          +----------+----------+
          |          |          |
       History    Reminder   Dashboard
```

A component name must not be independently persisted by every feature as a new identity. A feature may cache/display a label, but identity resolves through the canonical master.

### Vehicle scope

```text
VehicleScopedSOT.currentId()
            |
            +--> Service
            +--> History
            +--> Reminder
            +--> Checklist
            +--> Stock compatibility/usage
            +--> Dashboard
```

Any cross-vehicle row appearing in a vehicle-specific view is an isolation defect unless the view explicitly requests a fleet/all-vehicles scope.

### Stock

```text
D.partsStock
     ^
     |
StockCommandSOT
     |
 +---+---------+----------+
 |             |          |
Service      Finance   Sparepart
```

No consumer should mutate `D.partsStock` directly.

## High-risk areas found by the first static audit

1. `D.servisLogs` is the largest vehicle/service fact store and is referenced by many service modules. It must remain the single persisted service-fact source.
2. `D.serviceReminderPackages` is a separate persisted structure by design, but it represents a **reminder plan/configuration**, not another copy of service history. Completion/due calculations must reconcile to the canonical event facts.
3. `D.sparepartCats` is legacy/compatibility data and must not become a competing service taxonomy identity source.
4. `D.partsStock` is correctly protected by `StockCommandSOT`, but consumers still need to be audited for read/write boundary consistency.
5. The duplicate-code audit reports **245 repeated symbol names across 465 JS files**. Many are intentionally duplicated compatibility/runtime helpers, but this is a consolidation candidate, not evidence that every duplicate is a bug.
6. Existing SOT gates currently pass; this S2153 phase therefore focuses on **architecture consolidation and dependency direction**, not weakening existing contracts.

## Refactor order

### Phase A — identity

Consolidate all service category/component identity reads to `ServiceTaxonomySOT` / generated master.

### Phase B — vehicle context

Make vehicle-scoped readers consume one context resolver and reject cross-vehicle records by default.

### Phase C — service fact

Make `D.servisLogs` + `ServiceEventSOT` the only canonical service-event fact path. History/reminder/dashboard become projections.

### Phase D — reminder

Keep `D.serviceReminderPackages` only for plans/state; derive completion/due facts from ServiceEvent + Interval + Vehicle context.

### Phase E — stock/finance bridge

Preserve `D.partsStock` ownership under `StockCommandSOT` and `D.transactions` under finance transaction authority; bridges reference IDs rather than copying facts.

### Phase F — UI cleanup

Remove feature-local copies and duplicate calculations only after A–E are green.

## Do not do yet

- Do not delete legacy fields before migration coverage is proven.
- Do not merge all SOT modules into one giant file.
- Do not create a new `HistorySOT`, `DashboardSOT`, or `ReminderFactSOT` just to hide duplication.
- Do not change UI layout as part of the SOT consolidation unless a UI is actually exposing a data-contract defect.
- Do not bypass existing P4 stock write gates.

## Definition of done for the architecture

```text
ONE FACT
  -> ONE OWNER
  -> ONE WRITE AUTHORITY
  -> MANY READERS
  -> ZERO DUPLICATE FACT STORAGE
  -> VEHICLE-SCOPED BY DEFAULT
  -> ID-BASED LINKING
```
