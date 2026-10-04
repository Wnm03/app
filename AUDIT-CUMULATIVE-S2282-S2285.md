# Cumulative Audit S2282–S2285

## Included
- S2282/S2283 lazy-load regression hardening from the previous cumulative patch.
- S2284 startup persistence fail-closed: unexpected load/migration/SOT errors can no longer fall through to `showMain()` and later overwrite the real snapshot with default/partial state.
- S2285 deploy/data-continuity gate: blocks stale bundles and persistence namespace/schema drift before deployment.
- Regression tests for the new fail-closed boundary.

## Critical deployment rule
This is a source/test patch. Because `features-helpers-global-security.js` belongs to Bundle B, **do not deploy this patch by copying source files alone**. Run the production build and deploy the generated bundles + HTML + SW together. The new gate intentionally blocks while Bundle B is stale.

## Data-loss diagnosis
Browser persistence is origin-scoped. A change of origin (domain/subdomain/protocol) creates a different storage namespace; no service-worker cache update can migrate localStorage/IndexedDB across origins. In addition, before S2284 an unexpected `load()` exception could show an error but still let runtime boot continue with a partial/default `D`; a subsequent save could overwrite the durable snapshot. S2284 closes that destructive path.
