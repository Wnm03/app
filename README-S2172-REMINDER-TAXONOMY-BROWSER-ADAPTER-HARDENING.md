# S2172 — Reminder Taxonomy Browser Adapter Hardening

## Root cause audited
S2171 fixed `ServiceTaxonomySOT` so it can read the generated browser taxonomy export `globalThis.__SERVICE_CHECKLIST_GROUPS__`. A follow-up audit found five other service/reminder consumers that still depended on the non-exported `SERVICE_CHECKLIST_GROUPS` binding directly.

In a production/browser context where the generated master-data module exposes only the `__SERVICE_CHECKLIST_GROUPS__` global, those consumers could see an empty taxonomy even though canonical data existed. This is the same class of runtime-global mismatch that caused the S2171 reminder-card regression.

## Fix
S2172 adds a browser-safe fallback to the generated canonical global for:
- `service-input-catalog.js`
- `service-history-sot-normalizer.js`
- `servis.js`
- `honda-oem-service-mapping.js`
- `sparepart-servis.js`

The existing direct binding remains preferred when present; the generated `globalThis.__SERVICE_CHECKLIST_GROUPS__` export is used when the direct lexical binding is unavailable.

No new storage owner is introduced. No canonical data is copied into a second persistent store.

## Regression coverage
Added `tests/s2172-reminder-taxonomy-browser-adapters.test.js` covering:
- ServiceInputCatalog browser-global fallback.
- Honda OEM adapter browser-global hardening.
- Service history normalizer canonical lookup through generated browser global.
- Static guard coverage for remaining direct checklist consumers.

Focused S2170/S2171/S2172 suite: **12/12 PASS**.

## Full verification
- Full suite: **8016/8016 PASS**.
- Post-build full suite: **8016/8016 PASS**.
- SOT integrity: PASS.
- Architecture integrity: PASS.
- Persistence integrity: PASS.
- S2163 legacy mapping gate: PASS 8/8.
- S2165 post-migration reconciliation: PASS.
- S2166 runtime projection: PASS.
- S2167 production runtime wiring: PASS.
- Production build: PASS, version **2175**.
- Both bundles: `node --check` PASS.

## Release caveat
`esbuild` is unavailable in the offline environment, so the generated production bundles are valid but **not minified**. Do not claim minified-release certification until the build is rerun with `esbuild` available.
