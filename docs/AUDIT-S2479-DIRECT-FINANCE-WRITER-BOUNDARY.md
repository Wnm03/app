# Audit S2479 — Direct Finance Writer Boundary

## Scope

Audit direct Finance-owned mutations outside canonical writer/SOT boundaries, with emphasis on account CRUD, Universal OCR account import, stale cross-tab state, persistence failure rollback, and post-commit event delivery.

## Findings repaired

1. `saveAcc()` / `_saveAccInner()` mutated account-linked projections before `save()` was known to persist successfully. Added snapshot + rollback and fail-closed handling for `save() === false`.
2. Universal OCR account import mutated `D.accounts` without stale preflight and without rollback on persistence rejection. Added stale preflight and account snapshot rollback.
3. `TitipanReconcile` had three direct post-commit `AIBus.emit()` paths. Replaced them with `FinanceEventOutbox.emitOrEnqueue()` so synchronous/asynchronous consumer failure cannot silently lose the committed event.

## Validation

- S2479 direct-writer boundary: 2/2 PASS
- S2470 post-commit recovery: 3/3 PASS after repair
- System Integrity: 7/7 PASS
- App-wide: 9/9 PASS
- SOT production wiring: PASS
- SOT drift: 6/6 PASS

## Verdict

For the audited direct Finance writer and post-commit event boundary: **0 substantive gaps identified after S2479**.

Global release closure remains a separate scope.
