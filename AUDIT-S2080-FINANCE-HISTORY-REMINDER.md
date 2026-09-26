# S2080 — Real Car Notes Flow Audit: Finance → History → Reminder

## Scope
Audit the real persisted path for a service transaction, from Finance input through Service History and Service Reminder, with `vehicleId` as the isolation boundary and `D.vehicles[].sot` as the canonical per-vehicle Car Notes SOT.

## Canonical flow

`Finance transaction`
→ `servisLinkId`
→ `D.servisLogs[]` (`txLinkId`)
→ `sessionId` / `serviceComponentId` / `masterCategoryId`
→ `VehicleCarNotesSOT` + canonical service projection
→ `Reminder` for the same `vehicleId`

Reverse flow is also supported:

`Servis form`
→ creates/updates Finance transaction with the same `vehicleId`
→ creates/updates Service History
→ lifecycle refresh
→ Reminder recomputation from the same vehicle scope.

## Findings fixed

1. Finance transactions created by Service were not consistently stamped with `vehicleId`. They are now explicitly vehicle-scoped.
2. Finance → Service sync could fall back to the first vehicle when no active vehicle was selected. The fallback is now the active vehicle only; no silent first-vehicle selection.
3. Editing a Finance transaction linked to Service could attempt to move the existing Service record to another vehicle. This is now rejected as a cross-vehicle mutation.
4. New categories created from the Service form did not explicitly carry `vehicleId` before projection. They now do.
5. A runtime `VehicleCarNotesSOT.auditFinanceHistoryReminder(vehicleId)` diagnostic was added. It checks Finance ↔ History backlinks, cross-vehicle linkage, Reminder vehicle scope, and canonical service-component identity.

## Deletion path verified

Finance transaction deletion cascades to the linked Service History record and invokes Service lifecycle removal. Service deletion removes the linked Finance transaction and emits the corresponding finance lifecycle event. Session deletion handles all component rows and their linked Finance transactions.

## Canonical ownership

- Per-vehicle persisted SOT: `D.vehicles[].sot` via `VehicleCarNotesSOT`.
- Service History: `D.servisLogs[]`, vehicle-scoped event records; not a second vehicle SOT.
- Finance: `D.transactions[]`, vehicle-scoped when the transaction represents a service event; linked by `servisLinkId`.
- Reminder: projection/read model for the active vehicle; it must not become an independent service-history store.
- `ServiceInputCatalog` / taxonomy: global reference master, not vehicle data SOT.
- `D.sparepartCats`: legacy compatibility/projection index, not canonical vehicle SOT.

## S2080 verification

- New focused tests: 5/5 PASS.
- JS syntax checks: PASS for changed source and bundle.
- Runtime audit test: clean Finance → History → Reminder round-trip for one vehicle.
- Runtime cross-vehicle leakage test: correctly detected and rejected by the audit.

## Remaining verification boundary

The complete repository-wide test suite was not rerun in this patch-only audit environment. The focused S2080 tests and syntax checks passed; this report does not claim a full-suite pass.
