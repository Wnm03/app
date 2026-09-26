# S2081–S2090 — Car Notes Full Flow / Final SOT Gate

## Scope
Audit and harden the persisted service journey:

`Finance → Service History → Checklist/Session → Interval/Next Due → Reminder`

with the reverse path from Service/Reminder back to Finance, plus edit, delete, rollback, multi-component session, restore/import boundary, duplicate detection, reload, and vehicle isolation.

## Implemented

### S2081 — Transaction source audit
- Service transactions created through the Service module already carry `vehicleId`; the chat-action service path is now explicitly vehicle-scoped as well.
- Finance → Service continues to reject missing/changed vehicle identity instead of silently moving a linked service event.

### S2082 — Delete / rollback
- Session deletion now resolves session identity through `sessionId`, `serviceJobId`, or row id, preventing partial deletion when older session rows use a different compatible identifier.
- Existing snapshot/rollback protection remains in place for Service rows, Finance rows, and linked stock quantities.

### S2083 — Edit
- Existing `servisLinkId`/Service event is reused during Finance edits.
- A Service event cannot acquire a second Finance owner.
- Idempotency keys continue to converge retries on the same Service event.

### S2084 — Interval SOT
- Finance → History next-due snapshots now prefer the canonical per-vehicle `VehicleCarNotesSOT` service category before falling back to the legacy compatibility projection.
- `buildServiceNextDueSnapshot()` remains the single calculation point for interval/next-due snapshots.

### S2085 — Date / odometer
- Service odometer validation remains before Finance → History commit.
- History keeps the committed service date and odometer with the same service event.

### S2086 — Multi-component transaction/session
- Final SOT audit detects duplicate `vehicleId + sessionId + serviceComponentId` identities and component collisions inside a session.
- Removing a single component does not require deleting sibling components; session deletion remains the explicit whole-session path.

### S2087 — Restore/import
- Restore continues through the application's existing migration path.
- The Car Notes canonical state remains `D.vehicles[].sot`; restore does not introduce a second persisted vehicle SOT owner.

### S2088 — Duplicate/conflict gate
The new final audit detects:
- duplicate session/component identity;
- duplicate Reminder projection identity;
- conflicting interval owners for the same service component;
- Finance ↔ History missing/cross-vehicle links;
- Reminder cross-vehicle/component identity errors.

### S2089 — Real journey gate
Added runtime coverage for a clean vehicle-A flow and isolation from vehicle B.

### S2090 — Final Car Notes SOT gate
Added `VehicleCarNotesSOT.auditFullFlow(vehicleId)` as a diagnostic gate. It checks the persisted Finance/History/Reminder graph plus session/component identity, interval integrity, duplicate projections, and vehicle boundary.

## Verification

- New S2081–S2090 focused suite: **12/12 PASS**.
- Changed source files: `node --check` PASS.
- Updated application bundles: `node --check` PASS.
- This patch does **not** claim a repository-wide full-suite pass; the full repository test suite should be run after applying the cumulative patch to the clean application baseline.

## Canonical rule

`1 vehicle = 1 VehicleCarNotesSOT = D.vehicles[].sot`

Finance and Service History are linked projections/events for that vehicle; Reminder is a projection/read model, not another SOT.
