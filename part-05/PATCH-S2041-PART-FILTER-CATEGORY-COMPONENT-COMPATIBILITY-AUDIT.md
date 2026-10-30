# S2041 — PartPicker Filter Accumulation Audit

## Scope
Additive/backward-compatible refinement for Car Notes legacy motorcycles. No KPB/new-bike logic.

## Implemented
- One canonical source remains `D.partsStock` + canonical component/catalog links.
- Category filter is strict when a category is selected.
- Component filter is strict when a component is selected.
- Unclassified parts are not silently mixed into a selected category/component.
- Vehicle compatibility supports `vehicleIds[]` when present and retains existing global-part behavior when `vehicleId` is absent.
- Archived parts remain excluded.
- Available-stock filter remains `qty > 0`.
- Service usage picker defaults `Hanya tampilkan stok tersedia` to ON.
- Purchase picker defaults the same filter to OFF, because zero-stock parts can legitimately be selected for purchasing/replenishment.
- Checkbox state is read back into the refresh context so MutationObserver/UI refresh does not silently lose the selected stock filter.
- `PartPickerS2041.available(context)` remains available for programmatic positive-stock filtering.

## Filtering order
`vehicle compatibility → category → component → stock status`

## Safety
- Existing service/purchase ledgers remain authoritative.
- No history deletion.
- No KPB logic introduced.
- No second Part SOT introduced.

## Validation
- `node --check modules/vehicle/part-crud-s2041.js` PASS
- `node tests/part-crud-s2041.test.js` PASS
- Existing S2041 assertions PASS
- New assertions for strict category/component, vehicle compatibility, and context defaults PASS
