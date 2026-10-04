# AUDIT S2511 — Baseline app-main (7) → cumulative closure

## Scope
Audit baseline `app-main (7).zip` against the cumulative S2282–S2510 chain, then rebuild and retest.

## Findings
### F1 — stale Bundle A (substantive deployment gap)
`verify-bundle-freshness.js` initially failed because `app-bundle-a.min.js` did not match the current source hash. Bundle B was fresh.

**Fix:** rebuilt the complete runtime with `node scripts/build.js`, advancing runtime/cache version from 2234 to 2235 and refreshing Bundle A/B, HTML and Service Worker.

### F2 — no new Restore/SOT regression
S2451/S2455/S2461 and S2509/S2503/S2504–S2508 regression tests pass after rebuild.

### F3 — release-environment blockers (not substantive application gaps)
- `esbuild` unavailable: build output is valid but unminified.
- `eslint` unavailable/permission denied.
- strict source-size guard flags `servis.js` and `features-helpers-global-security.js`.
These remain release/tooling/maintainability gates and are not treated as data-integrity or functional gaps.

## Verified gates
- bundle freshness: PASS
- SOT integrity: PASS
- architecture integrity: PASS
- persistence integrity: PASS
- PWA recovery integrity: PASS
- S2451/S2455/S2461: PASS (8/8)
- S2509: PASS (2/2)
- S2503: PASS (1/1)
- S2504–S2508: PASS (1/1)
- bundle syntax: PASS

## Release status
Functional/data/SOT substantive gap: **0 found in the audited chain**.
Production release certification: **BLOCKED** until a release environment provides working eslint and esbuild, and strict source-size policy is resolved or explicitly accepted by project policy.
