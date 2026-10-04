# AUDIT S2467 — Finance Piutang/Utang Atomicity & Stale-Write Boundary

## Scope
Deep audit boundary Piutang/Utang: create/edit/delete, linked cashflow transaction, payoff transaction, Debt.syncBill(), generated bill/piutang linkage, stale cross-tab rejection, canonical Bill/Debt/Piutang writer.

## Findings repaired
1. Piutang/Utang mutation entrypoints could mutate in-memory state before `save()` rejected a stale cross-tab state.
2. Piutang/Utang multi-entity mutation had no explicit rollback boundary when persistence preflight rejected the write.
3. Piutang edit directly mutated the Piutang row with `Object.assign`, bypassing `BillDebtPiutangCanonicalWriter`.
4. Debt sync can mutate linked Bill/Piutang state; exceptions now restore the pre-mutation snapshot.
5. Piutang/Utang delete now restores canonical state when `save()` rejects the mutation.

## Repair
- Added Finance stale-state preflight helper.
- Added atomic snapshots for Piutang/Utang and related transaction/bill collections.
- Rollback uses `FinanceTxSOT.replaceSnapshot()` for transactions and `BillDebtPiutangCanonicalWriter.replace()` for Bill/Debt/Piutang collections.
- Piutang edit now commits through `BillDebtPiutangCanonicalWriter.updateById()`.
- Debt `syncBill()` is enclosed in rollback boundary.

## Validation
Fresh replay from pristine app-main 53 + cumulative S2467:
- 49/49 focused cumulative tests PASS
- 0 fail / 0 cancelled / 0 skipped
- System Integrity: PASS 7/7
- App-wide: PASS 9/9
- SOT Production Wiring: PASS
- SOT Drift: PASS 6/6
- ZIP integrity: PASS

## Scope verdict
**0 substantive gaps identified in the audited Piutang/Utang atomicity, stale-write and canonical-writer scope after S2467.**

This is a domain-scope verdict, not a global release-readiness claim. Global release blockers such as production bundle freshness/minification/lint/deep release closure remain separate.
