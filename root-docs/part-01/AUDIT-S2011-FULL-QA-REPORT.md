# FULL PATCH AUDIT REPORT — S2009 → S2011

Date: 2026-09-25
Baseline: app-main (20)(1).zip
Patch under audit: UPDATE-S2011-SERVICE-COMPONENT-SOT-CUMULATIVE-S2009-S2011.zip

## Functional verification

- Full sharded suite: 7,621 tests / 7,621 pass / 0 fail / 0 cancelled.
- Service SOT integrity gate: PASS.
- SOT integrity gate: PASS.
- Persistence integrity: PASS.
- Architecture integrity: PASS.
- Window expose verification: PASS.
- Bundle freshness verification: PASS.
- Patch integrity verification: PASS.
- Patch contamination verification: PASS.
- Production readiness: 14/14 PASS.
- Reproducible build: PASS.
- Both production bundles: node --check PASS.
- Clean production build: PASS.

## Test-contract maintenance performed during audit

Several existing tests asserted the pre-S2011 UI/data contract rather than the locked S2011 contract. They were updated to test the new behavior instead of weakening production code:

- stock create uses aggregated component stock entries;
- component stock linkage is stored per checklist component while Finance linkage remains on the primary session row;
- action controls are rendered by checklist cards;
- category/component selection is represented by the checklist as the writable surface;
- checklist-only save uses the effective checklist item guard;
- Minimal theme cache version is numeric rather than hard-coded to v=1;
- backup restore snapshot invalidation test accepts the restore stage marker between invalidation and saveFlush.

No production-source workaround was added merely to satisfy those stale assertions.

## Build

Build output version: s1956-service-history-audit-package-2003.

The build regenerated source-version markers, HTML cache versions, service worker cache version, bundles, FILE-MAP and coverage map. Bundle syntax and source consistency checks passed.

## Release blockers / environment limitations

The application functional/regression suite is green, but the release gate is NOT green because the current environment lacks:

1. `eslint` executable — `npm run lint` exits 127 (`eslint: not found`).
2. `esbuild` — production build falls back to non-minified bundles.

Consequences:
- release-check blocks on lint availability and minification;
- performance-budget reports `app-bundle-b.min.js` at 5,167,110 bytes against a 5,000,000-byte budget because the bundle is non-minified.

An attempted `npm install --no-save --ignore-scripts eslint esbuild` could not complete in the available execution window, so these dependencies were not falsely treated as installed.

## Pre-existing / unrelated repository observations

- `audit:system-integrity` and `audit:release-closure` scripts referenced by package.json are absent from the supplied baseline/patch tree, so those commands cannot execute; this is repository/tooling completeness, not a discovered S2011 service regression.
- `modules/vehicle/servis.js` is 1,768 lines and is above the 1,600-line advisory threshold, but below the 1,800-line release guard cap.
- `audit:test-hygiene` reports 33 potentially brittle literal assertions as advisory only; it does not fail.

## Final verdict

FUNCTIONAL QA: PASS
SERVICE SOT: PASS
REGRESSION SUITE: PASS
BUILD/SYNTAX: PASS
PRODUCTION READINESS: PASS
RELEASE GATE: FAIL — environment/tooling blockers (eslint unavailable; esbuild unavailable/minification unavailable).

Therefore this audit does NOT certify the artifact as a fully release-gate-clean production release. It does certify that the tested S2009→S2011 application behavior and regression suite are green within the available environment.
