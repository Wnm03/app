# S2509 — Finance legacy taxonomy restore closure

## Root cause

The restore boundary correctly routed all restored transactions through `FinanceTxSOT.replaceSnapshot()`, but the current Finance taxonomy no longer contained two historical shapes present in the 2026-10-04 backup:

1. `expense.category = "Tagihan"`, `subcategory = "Pulsa/Kuota"`
   - `Tagihan` already had a deterministic alias to canonical `Tagihan & Biaya`.
   - The missing legacy subcategory `Pulsa/Kuota` caused `FINANCE_CATEGORY_UNRESOLVED`.
2. `expense.category = "Dana Titipan"`
   - This historical category is still semantically meaningful to the Dana Titipan feature but was absent from the persisted Finance category SOT.

The first failing row masked the later two `Dana Titipan` rows because `replaceSnapshot()` is intentionally fail-closed.

## Fix

Added `FinanceCategorySOT.reconcileLegacyTransactionTaxonomy(rows)` and invoke it at the restore boundary immediately before `FinanceTxSOT.replaceSnapshot()`.

Only deterministic, explicitly-known legacy mappings are repaired:

- `Tagihan` → existing `Tagihan & Biaya` alias.
- `Tagihan / Pulsa/Kuota` → provision the missing canonical subcategory under `Tagihan & Biaya`.
- `Dana Titipan` → provision a stable canonical Finance category with `NON_BELANJA` classification.

Unknown legacy categories remain fail-closed and still produce `FINANCE_CATEGORY_UNRESOLVED`.

## Evidence against real backup

Backup: `backup-keluarga-W-2026-10-04.json`

- Finance transactions: **1,219**
- Legacy taxonomy repairs: **2**
- Reconciliation issues: **0**
- Finance SOT restore rows after repair: **1,219**
- Per-row unresolved Finance taxonomy records: **0**

## Tests

Targeted cumulative suite: **14/14 PASS**

Includes S2451/S2455/S2461 restore SOT, S2464 import atomicity, S2503/S2504-S2508 Finance taxonomy gates, and new S2509 legacy restore tests.

## Build limitation

`npm run build -- --require-minify` was attempted. The repository's required `esbuild` dependency is not available in the execution environment, and an attempt to install `esbuild@0.24.0` timed out. Therefore a fresh minified production build could not be certified in this environment.

Both existing production bundle artifacts were syntax-checked after the accumulated S2509 changes. The final release gate remains blocked until the normal build environment regenerates the bundles with the required minifier.
