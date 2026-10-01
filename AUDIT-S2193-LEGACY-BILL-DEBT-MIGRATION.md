# AUDIT S2193 — Legacy Bill/Debt/Piutang Migration Integrity

## Scope
Audit migration legacy Bill/Debt/Piutang after S2191-S2192, with emphasis on `billLinkId` references and ID representation compatibility.

## Finding
`DATA_MIGRATIONS` toVersion 5 previously built `liveIds` with strict Set membership. Runtime reconciliation uses semantic ID equality (`sameId` / string-equivalent IDs). Therefore a legacy transaction with `billLinkId: "101"` pointing to a bill with numeric `id: 101` could be incorrectly treated as dangling and have its link removed during migration.

## Repair
Migration toVersion 5 now normalizes both bill IDs and transaction `billLinkId` to `String(...)` for comparison only. Stored values are not rewritten. No schema version change is required.

## Safety
- Active bill links preserved.
- Archived bill links preserved.
- Truly dangling links are still removed.
- Transaction records are never deleted by this migration.
- No UI/schema change.
- No legacy feature removal.

## Verification
- S2193 migration tests: 2/2 PASS.
- Combined S2188-S2193 targeted regression: 16/16 PASS.
- Build: PASS.
- Both generated bundles: node --check PASS.
- esbuild unavailable; build output is unminified.

## Acceptance
S2193 closes a concrete legacy migration compatibility gap. No additional production mutation repair was required in this checkpoint.
