# S2266 — Shop PDF Import Lazy Residency

## Scope
Shop PDF supplier import UI was reviewed as a feature-scoped adapter. `VehicleCatalogImport` remains behind its existing vehicle-catalog lazy boundary and is loaded before the Shop PDF UI.

## Change
- Removed `modules/business/shop-pdf-import-ui.js` from eager `GROUP_B`.
- Added `ensureShopPdfImportScripts()` with deduplication and retry-on-error.
- Dispatcher retries `ShopPdfImportUI.*` after the loader resolves.
- Existing `data-action="ShopPdfImportUI.open"` contract remains unchanged.

## Measurement
- GROUP_B: 359 files
- GROUP_B raw source: 4,893,036 bytes
- Bundle-B raw: 4,908,032 bytes
- Production minification: not verified because esbuild is unavailable in the environment.

## Safety
No SOT, persistence, database, event-bus, or commit logic changed. The Shop PDF UI still commits through the existing `ShopDataIO.commitShopRows()` path.
