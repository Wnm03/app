# S2170 — Reminder SOT Recovery & Regression Hardening

Cumulative chain: **S2153 → S2167 → S2170**.

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
