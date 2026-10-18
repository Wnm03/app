# S2150 — Audit and fix: independent service interval axes

## Scope
Continues the cumulative S2145–S2149 service-reminder patch on the `app-main (23).zip` baseline.

## Confirmed defect fixed
The active `ServiceIntervalSOT` interval was being forced onto one action axis for every `periksa-conditional` component. For V-Belt CVT, that erased the 8,000 km inspection cadence whenever the active interval was treated as the replacement-reset interval. This meant the UI/runtime could not preserve both inspection and replacement semantics at once.

## Implementation
- Added explicit `intervalAxes: "independent"` metadata only for `v-belt-cvt` in `data/database-kategori-komponen-servis.json`.
- Updated `scripts/generate-service-master-data.js` so the optional field survives both checklist generation and lazy master reconstruction without changing the legacy shape for other components.
- Updated `getMaintenanceSchedule()` to preserve the declared inspection axis while mapping the active per-vehicle `ServiceIntervalSOT` interval to the replacement axis.
- The active SOT remains authoritative for replacement cadence. A manual interval is not overwritten.
- Added `tests/service-reminder-independent-interval-axes-s2150.test.js` covering default guideline (inspection 8,000 / replacement 32,000) and manual override (inspection 8,000 / replacement 24,000), plus due-date snapshot baselines.

## Verification
- `npm run build`: PASS, build version 2563, both bundles syntax-checked by the build.
- Targeted regression tests: 10/10 PASS (S2145, S2146, S2148, S2150, S2397).
- Full regression runner: **8,909 tests; 8,908 pass, 0 fail, 0 cancelled, 1 skipped** across all 64 shards; all shard checkpoints validated. The one skipped test is reported by the runner and is not counted as a pass.
- `node --check` for changed runtime sources and bundles: PASS.
- `node scripts/verify-bundle-freshness.js`: PASS.
- `SERVICE_SOT_SKIP_FULL_REGRESSION=1 node scripts/service-sot-integrity-gate.js`: non-full-regression checks pass. The full regression was then run independently and passed as detailed above. Running the combined `npm run service-sot-gate` command timed out in this environment, so that wrapper itself is not marked PASS.

## Remaining substantive issue — not closed
V-Belt replacement interval still has a model/year conflict: the generic master/SOT guideline is 32,000 km, while the accumulated KZR 2012 guidance says 24,000 km. A Wahana Honda technical-advice article about Vario Techno 125 model year 2012 recommends replacement at 24,000 km; the current master catalog's KZRJ source is for later 2013–2015 catalog coverage. The safe resolution is a model/year-scoped guideline with migration of guideline-sourced SOT records only; manual SOT values must remain untouched. This patch does **not** silently change the generic 32,000 km interval and therefore does not claim zero substantive findings.

Other audit findings (including steering-head service policy and rear-tire interval policy) still require explicit canonical policy decisions rather than guessed values.
