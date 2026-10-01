# A-S2194 — Post-migration Bill/Debt/Piutang reconciliation

## Scope
Validate that legacy DATA_MIGRATIONS output is checked against the canonical Bill/Debt/Piutang invariants after migration, not merely accepted because the migration runner completed.

## Result
- Clean legacy state remains reconciliation-clean after migration.
- Numeric/string bill IDs preserve valid links.
- Truly dangling `billLinkId` is removed by the existing toVersion:5 migration.
- Duplicate Bill IDs are detected by the read-only reconciler.
- Reciprocal Bill↔Debt mismatch is detected by the read-only reconciler.

## Production change
No production behavior change was required in S2194. The existing S2191 restore boundary already invokes `BillDebtPiutangReconciler` after migrations. This checkpoint adds explicit post-migration regression coverage.

## Acceptance
S2194 targeted tests: 4/4 PASS.
UI/schema/legacy deletion: none.
