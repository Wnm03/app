# S2258 — Honda PDF Import Lazy Residency

## Baseline
- Canonical base: `app-main (47)`
- Cumulative prior patch: `PATCH-ACCUMULATED-BASELINE-APP-MAIN-47-THROUGH-S2254-REWORK2.zip`
- S2255/S2256 artifacts were not present in the workspace and are not treated as canonical.

## Finding
The Honda PDF catalog/import pipeline was listed in `GROUP_B` although its runtime entry is feature-only. The pipeline consists of:
- `honda-pdf-catalog-auto-import.js`
- `honda-pdf-import.js`
- `honda-pdf-import-extract.js`
- `honda-pdf-import-parse.js`
- `honda-pdf-import-commit.js`
- `honda-pdf-import-ui.js`

The UI depends on the already-existing vehicle catalog import cluster. No core Service/Finance SOT or persistence authority is moved.

## Repair
1. Remove the six Honda PDF modules from eager `GROUP_B` residency.
2. Add `ensureHondaPdfImportScripts()` to the existing CSP-aware lazy loader.
3. Preserve explicit dependency order: vehicle catalog feature cluster first, then Honda auto-import, store, extract, parse, commit, UI.
4. Add lazy-dispatch retry for `HondaPdfImportUI.*` actions.
5. Make the modal sweep await asynchronous openers so lazy feature openers are tested after loading completes.
6. Add a source contract test for residency, ordering, retry/dedup, and modal-sweep integration.

## Measurement
S2254-REWORK2 canonical GROUP_B: 369 files / 5,083,334 bytes raw.
S2258 GROUP_B: 363 files / 5,026,674 bytes raw.
Bundle-B raw: 5,098,694 -> 5,041,769 bytes (~56.9 KB / 1.12% reduction).

The small difference between source-residency delta and bundle delta is expected because the build concatenation includes surrounding bundle markers/loader code and current source-version normalization.

## Regression
- S2253 + S2254 + S2258 targeted: **6/6 PASS**.
- Full `npm test`: execution exceeded the environment's 300-second tool timeout before producing a final TAP summary. No failure was observed in the captured tail, so this is recorded as **TIMEOUT / INCOMPLETE**, not PASS.
- `node scripts/verify-bundle-freshness.js`: **PASS**; both bundles fresh.
- `node --check app-bundle-b.min.js`: PASS.

## Scope safety
No Service/Reminder SOT, Finance SOT, event bus/outbox, persistence schema, atomic boundary, or domain write authority was changed.
