# S2461 — Finance Category/Subcategory Type Isolation & Atomicity

## Scope
Audit kategori/subkategori transaksi keuangan: income vs expense isolation, rename propagation, lookup fallback, duplicate identity, and persistence rejection rollback.

## Findings fixed
1. Category rename previously matched `D.transactions` by category name only; it now requires the same transaction `type`.
2. Expense bill category/subcategory propagation is restricted to expense category mutations; income category changes no longer alter bills.
3. Subcategory rename now requires matching transaction `type` + parent category.
4. `getCatByType()` no longer falls back to a category from the opposite type; missing type/category returns `null`.
5. Duplicate category names within one transaction type and duplicate subcategory names within one parent are rejected case-insensitively.
6. Category/subcategory mutations snapshot affected finance state and roll back if `save()` explicitly rejects the mutation.

## Validation
- `node --check modules/finance/kategori.js` — PASS.
- `node --test tests/s2461-finance-category-subcategory-isolation.test.js` — 7/7 PASS.
- Fresh replay from pristine app-main (53) + cumulative patch — run after packaging; expected mismatch = 0.

## Non-scope
This patch does not change transaction schema, FinanceTxSOT, accounting category semantics, backup schema, or production bundles.
