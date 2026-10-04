# S2509 — Finance Accumulation Chain / Regression Audit

## Scope
Audit kumulatif baseline `app-main (1)` + S2501 + S2503 + S2504-S2508.
Tidak reset sesi sebelumnya.

## Chain verification
- S2501 overlay -> S2503 overlay -> S2504-S2508 overlay: deterministic.
- Final chained tree matches the S2504-S2508 working tree before S2509: 0 mismatches.
- Previous SOT/build-order/filter/merge/import hardening retained.

## Regression found and fixed
`FinanceTxSOT.updateById()` could reject a valid legacy category-only edit because the old subcategory field remained on the transaction after changing category. The canonical boundary now clears the old subcategory when category changes without an explicit new subcategory.

Cross-category explicit subcategory references remain fail-closed.

## Test-contract drift found and fixed
S2466 rollback test still expected direct `D.transactions=JSON.parse(...)`, while the canonical rollback path intentionally uses `FinanceTxSOT.replaceSnapshot(...)`. The test was updated to assert the SOT contract instead of the obsolete direct-write implementation detail.

## Validation
- Finance/SOT related test set: **31/31 PASS**
- S2501: PASS
- S2503: PASS
- S2504-S2508: PASS
- S2181: PASS
- S2196: PASS
- S2227: PASS
- S2305: PASS
- S2309: PASS
- S2463: PASS
- S2464: PASS
- S2466: PASS
- Car Notes Finance linkage: PASS
- Service zero-cost Finance boundary: PASS
- Build 2232: PASS
- Bundle A syntax: PASS
- Bundle B syntax: PASS
- index/app_production sync: PASS
- cache version: 2232
- esbuild unavailable; bundles valid but not minified.

## Full-suite limitation
A full `npm test` green result is not claimed because this repository snapshot does not expose a package.json/npm test contract in the inspected root and the prior environment run was time-limited. The targeted Finance/SOT regression set is fully green.

## Release conclusion
No remaining Finance taxonomy/SOT regression was found in the audited chain. The one substantive backward-compatibility regression discovered during accumulation was fixed and covered by the existing S2503 contract.
