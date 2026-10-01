# S2171 — Reminder Taxonomy Browser-Global Recovery & Projection Hardening

Cumulative chain: **S2153 → S2167 → S2170 → S2171**.

## Root cause fixed

`Kelola Pengingat`/category UI could render from the legacy `D.sparepartCats` projection while canonical `VehicleCarNotesSOT` already contained the category. The result was an apparent data loss/empty UI.

## Fix

- `VehicleCarNotesSOT.reconcileLegacyCategoryProjection(vehicleId)` explicitly and idempotently rebuilds the legacy compatibility projection from canonical SOT.
- Reconciliation is vehicle-scoped and never imports another vehicle.
- `getReminderCategoriesForVehicle()` is read/projection-only and no longer performs a silent canonical upsert while rendering.
- Legacy universal categories remain usable as compatibility inputs for the active vehicle.
- `Sparepart.renderCatList()` reconciles canonical SOT before rendering its legacy-compatible consumer list.
- Added S2170 regression tests for data recovery, idempotency, cross-vehicle isolation, read purity, and UI reconciliation.

## Validation

- Focused S2031 + S2170: **10/10 PASS**
- Full application suite: **8009/8009 PASS, 0 FAIL**
- SOT integrity: PASS (version 2173)
- Architecture integrity: PASS
- Persistence integrity: PASS
- Service SOT gate: PASS (full regression already passed separately)
- App-wide hardening: **9/9 contracts PASS**
- S2163: 8/8 PASS
- S2164: 10/10 PASS
- S2165: 5/5 PASS
- S2166: PASS
- S2167: PASS
- Bundle `node --check`: PASS
- Build: PASS, but **minification not certified** because `esbuild` is unavailable in the offline environment.

## Release note

The full test result is verified on the patched baseline. Production-minified release certification remains blocked only by the unavailable `esbuild` dependency.


## S2171 follow-up root cause

The browser bundle exposes the generated service checklist as `globalThis.__SERVICE_CHECKLIST_GROUPS__`, not as `globalThis.SERVICE_CHECKLIST_GROUPS`. `ServiceTaxonomySOT` previously read only the latter and therefore saw zero taxonomy groups in the real browser bundle.

Fixes:
- `ServiceTaxonomySOT.rawGroups()` reads the generated browser-global `__SERVICE_CHECKLIST_GROUPS__` fallback.
- Added canonical aliases for legacy labels `V-Belt (CVT)`, `V Belt (CVT)`, `V-Belt CVT`, `Aki (cek/ganti)`, and `Aki cek/ganti`.
- `ServiceRuntimeProjectionSOT.reminderCatalog()` no longer silently drops unresolved legacy categories; it keeps them vehicle-scoped using a deterministic legacy identity until canonical mapping is available.
- Added browser-global regression tests that do not inject `SERVICE_CHECKLIST_GROUPS`.

## S2171 validation

- Focused S2170 + S2171: **8/8 PASS**
- Full application suite: **8012/8012 PASS, 0 FAIL**
- Post-build full application suite: **8012/8012 PASS, 0 FAIL**
- S2163: 8/8 PASS
- S2165: PASS
- S2166: PASS
- S2167: PASS
- SOT integrity: PASS, version 2174
- Architecture integrity: PASS
- Persistence integrity: PASS
- Bundle `node --check`: PASS
- Build: PASS, version 2174
- Production minification: **NOT CERTIFIED** because `esbuild` is unavailable in the offline environment.

The generated `backups/` and `.test-checkpoints/` artifacts are intentionally excluded from the cumulative patch ZIP.
