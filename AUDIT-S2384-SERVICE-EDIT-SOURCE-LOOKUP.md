# S2384 — single lookup for edited service source row

## Finding
The service-save/edit preflight resolved the same `Servis.editId` row multiple times in `D.servisLogs`: once for odometer-change comparison, once for session-edit snapshot identity, and again for legacy category fallback.

## Change
Resolve `_editSessionSourceBefore` once using the existing strict ID equality and null guard. Reuse that row for `existingService` when `Servis.editId` is truthy, and for the session identity and fallback category path. The truthy guard for `existingService` is preserved, as is the `editId !== null` guard for session identity.

## Behavior constraints
- Preserves first matching non-null row and strict `===` ID comparison.
- Does not change category lookup, checklist session filtering, mutation ordering, stock handling, finance handling, or commit/rollback behavior.
- No persistent cache is introduced; the reference is local to one synchronous save/edit operation.

## Validation
Focused tests verify the one-lookup source contract and first-match/strict-ID semantics. Full application suite and release gate must be run separately; this patch is not a release certification.
