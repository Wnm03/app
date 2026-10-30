# S2286 — Domain Idempotency Sweep

## Scope
Follow-up to S2285. Audit domain-side duplicate protection on write-capable paths reached by the lazy feature boundary and adjacent stock/PO flows.

## Result
**12/12 static contract checks PASS. No new substantive domain defect was proven in this sweep.**

### Verified contracts
- Vehicle Catalog scanner/OCR calls share a canonical-code in-flight promise and clean it up on settlement.
- Catalog import commits through `VehicleCatalogWriteSOT.ensurePart()` rather than bypassing the catalog writer.
- Catalog-to-stock synchronization first reuses an existing linked stock row and creates through `StockCommandSOT` only when absent.
- Purchase-order receiving is state/idempotent-key guarded: already received is a no-op, stock movement carries an idempotency key, and the finance transaction carries a receipt key.
- Shop inventory ledger has duplicate-key handling.
- Lazy UI dispatcher remains separate from domain idempotency; no UI lock is treated as a substitute for domain protection.

## Boundary
This is a deterministic static contract sweep. It does not prove all possible browser/device concurrency scenarios or database-level multi-process locking. The audited local-first runtime is single-page JavaScript; the checks verify the established in-memory/SOT contracts rather than introducing an unnecessary global mutex.
