# AUDIT S2186 — Bill / Debt / Piutang Canonical Writer

## Scope

S2186 consolidates mutation boundaries for the Finance Bill/Debt/Piutang state without changing UI or schema and without deleting legacy paths.

Canonical collections covered:
- `D.bills`
- `D.billsArchive`
- `D.debts`
- `D.piutang`

## Implementation

Added `modules/finance/bill-debt-piutang-canonical-writer.js` with collection-level operations:
- `ensure()`
- `add()` with duplicate-ID protection
- `updateById()`
- `removeById()`
- `removeByPredicate()`
- `replace()`
- `moveById()`

Production mutation paths routed through the boundary include:
- manual Piutang / Utang CRUD and cascade writers
- `Debt.syncBill()` bill creation/removal
- bill create/edit/delete/archive/payment flows
- transaction-created cicilan/langganan bills
- PBB-generated bills
- vehicle tax/SIM-generated bills
- OCR/paylater-generated bills
- Shop/Kasir Piutang creation/removal
- Asset/Investment/Dana Titipan debt creation/removal/reconciliation
- owner-registry and titipan debt row updates

Read/projection logic remains outside the writer. No schema changes, UI changes, or legacy deletion were performed.

## Regression gates

Focused canonical writer + Finance regression: **58/58 PASS**.

Broader affected-domain regression after dependency-harness updates: **131/131 PASS**.

Additional bill/payment/cascade regression: **28/28 PASS**.

Cumulative build:
- **PASS**
- bundle A/B syntax checks: PASS
- esbuild unavailable in environment, so bundles were not minified
- generated build version advanced to `2178`; generated artifacts are intentionally excluded from this patch

Full `node --test tests/*.test.js` was started but timed out in the environment after reaching at least test #1300. It is therefore **inconclusive**, not counted as PASS/FAIL.

## Architectural result

S2186 establishes a single production mutation boundary for Bill/Debt/Piutang state while retaining existing domain orchestration and backward-compatible data behavior. Legacy mutation code is not removed until later post-stability/dead-code review.

## Next checkpoint

A-S2187 should audit the remaining non-UI consumers and cross-feature reconciliation around Bill/Debt/Piutang, then map any residual direct row mutation or projection drift before legacy cleanup.
