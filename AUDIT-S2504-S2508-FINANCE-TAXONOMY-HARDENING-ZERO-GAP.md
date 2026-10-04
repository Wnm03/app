# S2504–S2508 — Finance Taxonomy Hardening / Zero Substantive Gap

## Scope
Cumulative hardening after S2503: taxonomy invariants, adversarial import/restore, cross-page classification consistency, mutation-boundary enforcement, and the seven-classification contract.

## Changes
- Explicit unknown/cross-category subcategory references are fail-closed (`SUBCATEGORY_UNRESOLVED`).
- `FinanceTxSOT.createMany()` canonicalizes cloned rows before storage; a rejected batch cannot mutate caller-owned objects.
- `FinanceTxSOT.replaceSnapshot()` uses the same clone-before-validate boundary.
- Existing Finance writers remain fail-closed; no silent direct `D.transactions` fallback remains in the audited production writer set.
- Report and Finance filters use `FinanceCategorySOT.resolveSeven()` through `fClass` / `kfClass`.
- Seven filterable classifications remain exactly: POKOK, WAJIB, RUTIN, KEINGINAN, BISNIS, INVESTASI, SOSIAL. Income/non-spend/unresolved classifications are not forced into those seven.
- Production build order keeps `FinanceCategorySOT` before `FinanceTxSOT`.

## Validation
- Combined hardening gate: **1/1 PASS**
- Existing Finance/SOT regression boundary: **22/22 PASS**
- Bundle A syntax: PASS
- Bundle B syntax: PASS
- Build: PASS, version advanced 2230 -> 2231 by repository build contract
- esbuild: unavailable; bundles are valid but not minified
- Full `npm test`: not declared green; environment run exceeded 120s. The standalone `tests/pajak-pbb-zakat-crud.test.js` also fails because its harness does not expose the expected PBB/Zakat/PPh21 globals. These failures are outside the Finance taxonomy hardening scope and were not masked.

## Release rule
This patch is an overlay. Apply it on the S2503 cumulative baseline; do not treat it as a standalone repository snapshot.
