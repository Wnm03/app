# S2423 — Artifact Fingerprint / Version Propagation Hardening

## Scope
Read-only guard for the end-to-end release artifact chain:

`APP_BUILD_VERSION → runtime version constants → index.html → app_production.html → sw.js CACHE_NAME → bundle source fingerprints`

## Finding
No new production defect was introduced or fixed in this session.

The guard confirms the current known release blocker remains:
- `app-bundle-a.min.js`: fresh (`9fdcaaa6da911fe0`)
- `app-bundle-b.min.js`: stale — source `6a7306385a0b77d1`, embedded `221da3874ea0ea76`

The canonical version chain itself is synchronized at release suffix `2225`.

## Files
- `scripts/audit-artifact-fingerprint-propagation.js`
- `tests/s2423-artifact-fingerprint-propagation.test.js`

## Verification
- S2423 targeted tests: 2/2 PASS
- External-CWD execution: PASS (script resolves repository root from `__dirname`)
- Audit result: BLOCKED only by the pre-existing stale Bundle-B
- No build/minification attempted; `esbuild` remains unavailable.
