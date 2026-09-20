# PATCH S1863 — Service Master Database Integration

## Base

`app-main (9).zip`

## Target

`s1863-service-master-db-1863`

## Scope

Integrasi `database-kategori-komponen-servis.json` sebagai canonical Service Master ke arsitektur existing tanpa membuat IndexedDB wrapper kedua.

## Master

- 13 master categories
- 50 components
- 44 `linkCat:true`
- stable `masterCategoryId`
- stable `componentId`
- SHA-256: `86c8aad0afd273acf6611bf22fe64877ace163c0e53a3f338df163e3da20a486`

## Storage decision

Existing persistence is `IDBStore` / `kw_idb_v1` / `kv`. Therefore the patch stores the master aggregate at:

`service-master:store`

No `deleteDatabase()`, no DB version bump, no second DB wrapper, and no parallel maintenance-history store.

## New runtime pieces

- `service-master-data.generated.js` — generated artifact from canonical JSON
- `service-master-database.js` — idempotent master import/version/deprecation layer
- `service-maintenance-engine.js` — structured KM/time/both health calculation
- `service-maintenance-repository.js` — CRUD adapter over existing `D.servisLogs`
- `generate-service-master-data.js` — deterministic generator/validation

## Compatibility

`servis-checklist.js` no longer contains a manually maintained duplicate of the 13/50 master. Existing checklist APIs and IDs remain unchanged.

## Verification

- Targeted regression: **48/48 PASS**
- Bundle syntax: **PASS**
- Build/lint gates: **PASS**
- Full `npm test`: started but environment timed out before terminal summary; no failure was observed through test #3499. Therefore this patch does **not** claim full-suite green.

## Bundle note

`esbuild` was unavailable in the build environment. Bundles are syntactically valid but not minified. A release environment with `esbuild` should rebuild the same version before production packaging.

## Packaging

Patch ZIP contains changed/new files only and excludes `backups/`.
