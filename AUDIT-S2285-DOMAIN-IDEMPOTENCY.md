# S2285 — Cross-Element Domain Side-Effect Idempotency Audit

## Scope
Audit the domain layer behind lazy `data-action` paths. S2284 already proved that the UI dispatcher deduplicates one DOM element; S2285 checks whether two independent callers can still create the same logical domain record twice.

## Finding
A concrete defect was found in `VehicleCatalog.handleScan()` (and the parallel OCR path): both callers could independently execute `findByCode()` before either reached `create()`. Because `create()` is asynchronous, two concurrent callers for the same unseen code could both create drafts.

This is a **domain idempotency gap**, not a UI-dispatcher gap.

## Fix
Added `_vehicleCatalogCodeInflight` keyed by normalized canonical code. The first caller registers the promise before its first `await`; subsequent callers share that promise. The shared operation still performs a canonical existence check before creation, and the key is released in `finally` so failures remain retryable.

Both direct barcode scan and OCR label handling use the same domain helper, preventing cross-entry-point duplication for the same code.

## Other audited lazy-side-effect paths
- Honda PDF commit reuses `VehicleCatalogImport.commitRows()` and its `VehicleCatalogWriteSOT.ensurePart()` boundary.
- Vehicle catalog import also routes creation through `VehicleCatalogWriteSOT.ensurePart()`.
- Shop PDF import routes through the single `ShopDataIO.commitShopRows()` boundary; stock mutations elsewhere use ProductRepository/ShopInventoryLedger idempotency keys.
- Data Health and Laporan Export are read/diagnostic operations, so no domain write idempotency is required for their lazy dispatch path.
- S2284 UI pending/token guards remain UI-only and are not treated as a substitute for domain idempotency.

## Validation boundary
Deterministic Node/VM tests and static source assertions. No browser/device concurrent-event E2E was run in this session.
