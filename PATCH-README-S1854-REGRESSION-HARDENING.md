# S1854 — Performance Regression Hardening

Cumulative follow-up to S1841–S1853.

## Fixes
- Hardened `modules/shared/modules-render-b.js` date-cache calls with a standalone-safe fallback when `getCachedTxDateMs` is not loaded by an isolated harness.
- Hardened the transaction category index fallback when `getAllCats` is unavailable in isolated render tests.
- Updated the S292 isolated mark-bill-paid harness to include its real `_billTxDateMs` helper dependency.
- Updated the S314 render checklist harness to model the new `refreshAfterMutation()` routing while preserving the six logical refresh targets.
- Updated the S468c isolated render harness to provide the optional performance/category dependencies explicitly.

## Validation
- Targeted S292 + S314 + S468c: PASS after hardening.
- Baseline comparison confirms the two remaining shard failures (`DELETE-FILES` contract and Car Notes Pro rollback) are pre-existing in the original app-main and are not S1854 regressions.
- No schema change or feature removal.
