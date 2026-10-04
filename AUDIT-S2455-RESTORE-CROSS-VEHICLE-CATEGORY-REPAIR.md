# S2455 — Restore Cross-Vehicle Category Reference Repair

## Observed production symptom
Restore stopped at `category-component-sot-reconciliation` with `CROSS_VEHICLE_CATEGORY_REFERENCE_UNRESOLVED`, while the backup contained historical service logs whose category projection belonged to another vehicle.

## Root cause
The restore reconciler correctly refused to copy a foreign vehicle's category projection, but it treated every such reference as unrecoverable. That was too strict for records whose `serviceComponentId` is a canonical global taxonomy identity. A historical record can legitimately carry a stale/foreign legacy `categoryId` while still having a resolvable canonical component.

## S2455 fix
- Never copy the foreign category object into the target vehicle.
- Resolve the record/foreign row through `ServiceTaxonomySOT`.
- If the canonical component is valid, provision a fresh target-vehicle `VehicleCarNotesSOT` category/projection using the canonical component identity.
- Rewrite the historical record to that target-vehicle projection.
- Keep fail-closed behavior for genuinely unknown/custom cross-vehicle references.
- Refresh the cached canonical rows after provisioning.

## Real backup verification
The 2026-10-04 backup contains 4 vehicles, 73 sparepart categories, 297 stock rows, and 88 service logs. Before S2455, the fixture exposed 8 repairable cross-vehicle service-log references. After S2455:
- reconciliation: `ok=true`
- unresolved cross-vehicle issues: `0`
- repairable cross-vehicle repairs: `8`

The Vario 110 `Throttle Body (bersihkan)` history now gets a local Vario 110 category projection instead of being rejected because its legacy category ID belongs to Vario 125.

## Safety invariant
An unresolved reference remains an error. S2455 does not guess across vehicles; it only repairs when the component itself is canonical and independently resolvable.
