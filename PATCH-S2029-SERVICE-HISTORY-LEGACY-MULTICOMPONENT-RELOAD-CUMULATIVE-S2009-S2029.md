# PATCH S2029 — Legacy + Multi-Component + Reload Integrity

S2029 menambahkan read-only audit/projection untuk memastikan Service History dapat direkonstruksi setelah reload tanpa mengubah persisted history.

## Added

- `modules/vehicle/service-history-legacy-multicomponent-reload-s2029.js`
- `tests/service-history-legacy-multicomponent-reload-s2029.test.js`
- `AUDIT-S2029-LEGACY-MULTICOMPONENT-RELOAD-INTEGRITY.md`
- `S2029-IMPLEMENTATION-MANIFEST.md`
- `S2029-FILE-HASHES.txt`

## Updated

- `index.html`
- `app_production.html`
- `sw.js`
- prior service-history regression tests: cache expectation → `kw-cache-v2029`

## API

`ServiceHistoryLegacyMultiComponentReloadS2029.resolve()`

`audit()`

`compareAfterReload()`

`roundTrip()`

`classify()`

`sessionRows()`

`sessionComponents()`

## Safety

Read-only, additive, no schema migration, no finance relink, no evidence mutation, no automatic legacy backfill.
