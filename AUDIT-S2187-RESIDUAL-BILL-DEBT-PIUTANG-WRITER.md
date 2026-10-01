# AUDIT S2187 — Residual Bill/Debt/Piutang Writer Sweep

## Scope
Follow-up to S2186 canonical writer consolidation. Scope is production-path residual mutation only; UI and schema are unchanged.

## Findings
- No remaining direct `push`, `splice`, collection replacement, or indexed assignment was found for `D.bills`, `D.billsArchive`, `D.debts`, or `D.piutang` in the audited production modules.
- Remaining state-field mutations that affect canonical Bill/Debt/Piutang rows were routed through `BillDebtPiutangCanonicalWriter.updateById()`.
- Collection initialization in payment/archive paths now uses the canonical writer boundary (`ensure()`).
- Read-only projections, renderers, migration initialization, and self-test fixtures remain intentionally outside the production writer sweep.

## Changed paths
- `modules/finance/piutang-utang.js`
- `modules/finance/tagihan-kalender.js`
- `modules/asset/investasi.js`
- `tests/s2187-bill-debt-piutang-residual-writer.test.js`

## Constraints preserved
- No UI changes.
- No schema changes.
- No legacy deletion.
- Existing domain rules remain in their original modules.

## Verification
- Residual writer sweep: PASS.
- S2186 Bill/Debt/Piutang regression set: PASS after S2187 changes.
- Full suite status must be reported separately if the environment times out.
