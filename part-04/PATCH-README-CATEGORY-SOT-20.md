# PATCH-CATEGORY-SOT-20 — Honda OEM Catalog Canonical Adapter

Cumulative from S19.

## Implemented
- Added `HondaOemCatalogMaster` as a READ-ONLY adapter for Honda parts-catalog text.
- Normalizes unique OEM code, part name, catalog block, catalog block name, relative ref, source page, source provenance, and occurrence count.
- Verified against the supplied Honda Vario Techno 125 (2013) catalog: **550 unique OEM codes / 607 occurrences** across the main catalog pages.
- Does **not** create `masterCategoryId` or `serviceComponentId` automatically. Catalog block is provenance/catalog taxonomy, not proof of service taxonomy.
- Does not write `D`, `VehicleCatalog`, or IndexedDB.
- Added a full extracted-text regression fixture and S20 tests.

## Build
- Production/source version synchronized by build to **v1659**.
- `index.html`, `app_production.html`, and `sw.js` synchronized.
- Both bundles pass `node --check`.
- esbuild is unavailable in the environment, so bundles are valid but not minified.

## Validation
- S20: 2/2 PASS.
- Related PDF/catalog/parser/dashboard/filter tests: 62/62 + 16/16 + 6/6 + 3/3 PASS in the targeted run.
- Full regression is not claimed PASS because the known baseline full-suite failure/timeout remains outside this patch.
