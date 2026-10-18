# Patch S2151 — Cumulative Service Interval Chain

Apply this patch on top of the exact `app-main (23).zip` baseline. It accumulates S2145–S2151; do not apply it to an unrelated repository revision without reviewing the changed-file list.

## Main fixes
- Scoped KZR 2012 V-Belt replacement guideline: 24,000 km; generic 32,000 km retained outside the scoped model/year.
- Independent inspection/replacement axes preserved for Busi, V-Belt, Roller CVT, Filter Fuel Pump, Minyak Rem, Aki, and Ban Depan.
- Legacy category interval projections no longer overwrite inspection cadence for components explicitly declaring independent axes.
- Manual and AI SOT choices are preserved when a model/year guideline is reconciled.
- Full build regenerated bundles, versioned HTML/SW references, master data, and integrity manifest.

## Verification
See `app-main/AUDIT-S2151-CUMULATIVE-CHAIN-RESULT.md`. Full regression: 8,913 tests, 8,912 pass, 0 fail, 1 skipped across 64 validated shards. One explicit policy review remains for Roller CVT interval guidance; it is not silently overwritten.
