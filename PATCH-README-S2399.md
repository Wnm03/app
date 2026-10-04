# S2399 — VehicleModelRegistry taxonomy traversal optimization

Baseline: app-main (53)
Accumulated through: S2399

Change:
- `VehicleModelRegistrySOT.taxonomy()` now uses a local category `Map` while building taxonomy from `VehiclePartSOT.seed`.
- Removes repeated `cats.find(...)` scans for every seed row/component.
- Public taxonomy shape, ordering, category/subcategory/component ownership, and fallback behavior are preserved.
- No SOT identity/schema change, no network/fetch, no eager seed materialization change.

Validation:
- Vehicle registry/catalog scope regression: 16/16 PASS.
- Bundle-B source residency measured at 4,858,767 bytes after S2399.
- Production minified build remains subject to the existing esbuild/node_modules gate.
