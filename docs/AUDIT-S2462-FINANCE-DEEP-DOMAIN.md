# AUDIT S2462 — Finance Deep Domain / Stale-Write & Mutation Boundary

## Scope
Deep follow-up across Finance mutation surfaces after S2461 category/subcategory audit:
- transaksi umum + cicilan/langganan
- akun & ownership akun
- target tabungan
- transfer antar akun
- tagihan/bill history
- kategori/subkategori
- zakat/PBB/PPh finance settings and generated bill/transaction paths
- Dana Titipan expense/commitment/return/pool mutation APIs
- cross-tab stale-state persistence boundary

## Findings fixed

### P1 — Finance mutation could start while cross-tab state was stale
`save()` already rejected a stale tab, but several Finance entrypoints mutated `D.*` **before** calling `save()`. A `save() === false` therefore did not undo the in-memory mutation.

Fix:
- add `_financeMutationBlockedByStaleState()` preflight;
- `withSaveGuard()` and `withSaveGuardAsync()` now reject before invoking the mutation callback;
- direct Finance mutation entrypoints (account delete/owners, category CRUD, bill history/delete, transaction save/delete, target CRUD, transfer, tax/zakat/PBB paths) preflight the same guard.

Result: stale cross-tab state cannot enter a Finance mutation path through the audited entrypoints.

### P1 — Target tabungan accepted invalid/non-positive target values
`saveTarget()` accepted values through truthiness alone. Negative values could be persisted.

Fix:
- trim target name;
- require finite `amount > 0`;
- return false on rejection.

### P2 — PBB bill edit bypassed the canonical Finance bill writer
PBB bill creation already used `BillDebtPiutangCanonicalWriter`, but existing PBB bill edits mutated the bill object directly.

Fix:
- route PBB bill update through `BillDebtPiutangCanonicalWriter.updateById()`.

### P2 — Dana Titipan mutation APIs were not protected by the Finance stale-state preflight
The newer object APIs for expense, commitment/return, and pool mutations could still mutate `D.*` before the generic `save()` stale check.

Fix: add the same Finance stale-state preflight to their mutation entrypoints.

## Validation
- Syntax checks: PASS for all modified Finance sources.
- S2462 targeted: **3/3 PASS**.
- Cumulative Finance regression slice S2452–S2462: **15/15 PASS** on fresh replay.
- Fresh replay from pristine app-main (53) + cumulative patch: **15/15 PASS** for the cumulative targeted slice.
- Fresh replay `audit:system-integrity`: **PASS, 7/7 gates**.
- Fresh replay `audit:app-wide`: **PASS, 9/9 contracts**.
- Fresh replay `audit:sot-production-wiring`: **PASS**.

## Important non-findings / environment limits
The broad 189-file Finance-named legacy test sweep was **not used as a release PASS**: it produced many harness/load-order failures such as missing `BillDebtPiutangCanonicalWriter`, `FinanceCrossEntityAtomic`, and `extractFunction`. These failures are test-environment composition failures, not evidence of a newly reproduced Finance production defect. The focused fresh-replay suite is the authoritative S2462 regression evidence.

Global release readiness remains separate from this Finance audit. Historical blockers remain: production Bundle-A/B freshness, real minified build/lint availability, and complete full-suite execution.

## Verdict
For the S2462 mutation-boundary scope, no remaining substantive gap was reproduced after the fixes. This is **not** a claim that the entire application is release-ready or that every Finance calculation has been mathematically exhaustively proven.
