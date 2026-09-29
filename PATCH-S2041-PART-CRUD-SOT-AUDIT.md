# S2041 — Part CRUD + SOT Integrity Audit

## Scope
Car Notes motor lama only. No KPB/new-motor logic.

## Findings
1. Stock modal had JS support for `stockServiceComponentId`, but the externalized modal did not expose the selector. Manual stock edit therefore could not explicitly choose the canonical service component.
2. Manual stock edit directly overwrote `qty`; this could destroy the audit trail of purchase/usage-derived quantity.
3. Manual stock delete could physically remove a stock row even when purchase/service references existed, leaving dangling references.
4. Purchase flow already has rollback/reapply through `applyStockPurchase`/`revertStockPurchase` and transaction linkage.
5. Service usage already reconciles on service edit/delete through `replaceStockUsages`/`revertStockUsage`.
6. Manual part creation from service/purchase contexts was not consistently exposed as a direct UI action.

## S2041 changes
- Add a compatibility CRUD layer loaded after S2040.
- Expose canonical component selection in stock-part editing.
- Add OEM/reference field for manual part identity.
- Add `adjustmentHistory` when manual quantity is changed.
- Preserve purchase-derived average price when editing a part with purchase history; price remains controlled by purchase transactions.
- Archive, instead of hard-delete, parts that have purchase/service/catalog references.
- Keep hard delete only for unreferenced stock rows.
- Add `+ Add Manual Part` and `Edit Part` entry points from service and purchase stock selectors.
- Keep Vehicle Catalog as part identity SOT bridge; D.partsStock remains stock/quantity owner.

## SOT
Service category -> service component -> stock part -> Vehicle Catalog identity -> purchase history -> service usage history.

## Validation
- `node --check modules/vehicle/part-crud-s2041.js` PASS
- `node tests/part-crud-s2041.test.js` PASS

## S2041 accumulation — canonical PartPicker
- Added `PartPickerS2041` as the single UI resolver over `D.partsStock` for existing/legacy motorcycles.
- Service and purchase part selectors get contextual `+ Tambah Part Manual` and `Edit Part` actions without replacing the existing ledger engines.
- New part creation carries current vehicle/category/component context into the stock-part editor when available.
- Canonical component identity remains `serviceComponentId`; OEM/reference is stored on the stock part and bridged to VehicleCatalog SOT.
- Archived parts are excluded from new picker results but remain addressable by historical IDs.
- Generic future selectors can opt in using `data-part-picker`.
- Production HTML now loads the same S2041 compatibility layer as the development index.
- No KPB/new-bike logic added.

## Safe implementation sequence
1. Keep existing purchase/service ledgers untouched.
2. Load Part CRUD compatibility layer after the main app bundle.
3. Inject component/OEM fields only when the stock modal exists.
4. Inject picker actions only when target selectors exist.
5. Create/edit part through the existing stock modal/SOT bridge.
6. Refresh selectors after mutation; never rewrite existing history IDs.
7. Archive referenced parts instead of hard-delete.
8. Validate syntax + static contracts before packaging.
