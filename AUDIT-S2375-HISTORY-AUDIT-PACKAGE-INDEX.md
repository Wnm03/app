# S2375 — Single Index for Service History Audit Package Creation

## Finding
`Servis.createHistoryAuditPackage()` previously called `find()` over the full service-log array once for every selected ID, then scanned it again to resolve `Servis.editId`. Selection is capped at 100, but the repeated work still scales as selected IDs × total service logs on this user-triggered path.

## Change
- Build one local `Map` from `D.servisLogs` at the start of package creation.
- Resolve selected source rows and the current edit row from that index.
- Preserve selected-ID order, missing-ID rejection, and first-match semantics for duplicate IDs (`Array.find` behavior).
- No persistence schema, package API, business validation, or UI action contract changed.

## Validation
Focused regression test verifies the single-index source contract and behavior for selection ordering, duplicate IDs, and missing IDs. Full suite/release readiness must be reported separately; source-level optimization alone is not a performance benchmark.
