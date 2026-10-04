# S2501 — Finance Taxonomy Closure (Cumulative)

Scope: cumulative S56–S2500 baseline + latest `app-main (1)`, with prior fixes retained.

## Implemented in this one accumulation stage

- Duplicate Finance categories/subcategories are merged through `FinanceCategorySOT`; surviving IDs are deterministic and all affected transaction/budget references are remapped before the duplicate disappears.
- Budget legacy aliases remain compatible, while ambiguous unscoped subcategory aliases are rejected rather than guessed.
- Boot reconciles/merges taxonomy before budget reference reconciliation.
- `BudgetReko` resolves category IDs only through `FinanceCategorySOT`.
- AI learned mappings persist canonical `categoryId`/`subcategoryId`; old string mappings remain readable and are upgraded when resolved.
- OCR learned mappings use the canonical resolver and migrate legacy string values when possible.
- Finance category/subcategory writers, backup restore taxonomy writers, and vehicle-finance taxonomy writers fail closed when the canonical SOT is unavailable.
- Legacy helper copies no longer contain direct Finance taxonomy writer fallbacks.
- One new S2501 regression test covers merge/remap, budget resolver, AI/OCR canonical references, writer boundary, and build order.

## Validation

- Consolidated taxonomy regression: **25/25 PASS** (S2452, S2481–S2488, S2501).
- Production bundle freshness: **PASS** for both A/B bundles after rebuild.
- Bundle syntax: **PASS**.
- Build completed as development/unminified build because `esbuild` was unavailable in the supplied environment; no source minifier was bypassed silently—the build explicitly reported the limitation.
- An earlier full-suite attempt (`TEST_SHARDS=1 npm run test:full`) exceeded the environment timeout before producing a complete aggregate result; therefore the full application suite is **not claimed green**.

## Patch rule

`CHANGED-FILES-S2501-TAXONOMY-CLOSURE.txt` contains only files whose bytes changed relative to the combined S56–S2500 + latest `app-main (1)` baseline. No transaction data was migrated or invented during this stage.
