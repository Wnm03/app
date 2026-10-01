# AUDIT S2196 — Finance Cross-Entity Atomicity

## Scope
Checkpoint A-S2196 on cumulative S2195 baseline. Focus: atomicity when one Finance operation mutates more than one canonical collection among `D.transactions`, `D.bills`, `D.billsArchive`, `D.debts`, and `D.piutang`.

## Finding
`markBillPaid()` created the payment transaction first and then mutated auto-Piutang, Debt, and Bill/archive state. A later exception could therefore leave a partial cross-entity commit.

## Repair
- Added `modules/finance/finance-cross-entity-atomic.js`.
- The helper snapshots only the affected canonical Finance collections and restores them **in place**, preserving `D` and collection object identity.
- `markBillPaid()` now opens an atomic boundary immediately before the first payment mutation.
- Payment transaction creation now uses the existing `FinanceTxSOT.create()` boundary instead of a direct `D.transactions.push()` at this path.
- On an exception before commit, all five affected collections are restored together; successful completion closes the boundary.
- No UI/schema changes and no legacy path deletion.

## Tests
- S2196 focused: **4/4 PASS**.
- Combined S2186–S2196 targeted regression: **32/32 PASS**.
- Syntax checks: PASS for new helper, `tagihan-kalender.js`, and `build.js`.
- Build: PASS; both generated bundles pass `node --check`.

## Build caveat
`esbuild` is unavailable in the environment, so the generated bundles are unminified. Generated build artifacts are excluded from the S2196 patch.

## Remaining boundary
This checkpoint hardens the bill-payment cross-entity path. Other older multi-domain writers (for example historical service/investment flows) remain separate audit candidates and are not claimed as covered by S2196.
