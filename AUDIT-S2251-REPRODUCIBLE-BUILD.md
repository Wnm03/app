# S2251 — Reproducible Production Build Gate

## Baseline

Canonical baseline: `app-main (47) + S2250`.

S2247 remains superseded. No source/domain/SOT redesign is introduced by S2251.

## Objective

Separate **release-build/toolchain correctness** from Bundle-B architecture optimization.
The Bundle-B size observed in the supplied artifact must not be used as the basis for
lazy-loading decisions while the artifact is still the unminified `build.js` fallback.

## Findings

### 1. Release contract is already correctly designed

`package.json` contains:

- `build:release = node scripts/build.js --require-minify`
- `release:preflight = node scripts/build.js --require-minify && node scripts/verify-release-ready.js`
- `esbuild` in `devDependencies`
- `eslint` in `devDependencies`

`build.js` also contains a defense-in-depth hard stop: when `--require-minify`
or `REQUIRE_MINIFY=1` is active, a build that cannot minify either bundle exits non-zero.

`verify-release-ready.js` independently detects the generated unminified marker and
blocks the release gate unless an explicit, auditable environment override is supplied.

### 2. Sandbox limitation remains real

The S2251 environment has no installed `node_modules` and no dependency lockfile.
An attempt to install the declared dependencies timed out before `esbuild` became
available. Therefore a genuine minified production build cannot be produced or
verified in this environment.

This is an **environment/toolchain limitation**, not evidence of a Bundle-B source
regression.

### 3. Current artifact classification

The supplied Bundle-A/B artifacts contain the `build.js` unminified marker and are
therefore classified as **unminified fallback artifacts**.

They must not be treated as the final production-size measurement for Bundle-B.

## S2251 solution

A regression contract was added at:

`tests/s2251-production-build-contract.test.js`

It statically protects the release contract so future changes cannot silently:

- remove `--require-minify` from `build:release`;
- remove the minification requirement from `release:preflight`;
- remove `esbuild` from `devDependencies`;
- remove the hard-stop guard from `build.js`; or
- remove the unminified-artifact blocking logic from `verify-release-ready.js`.

## Gate result

- S2251 contract test: **PASS**
- S2250 residency test: **PASS**
- Source/BUNDLE structural gates: **PASS**
- Real minified production build: **BLOCKED BY ENVIRONMENT** (dependency installation timeout)

The blocked build is intentionally **not** represented as a production PASS.

## Next step

Run on a real build environment with dependencies available:

```text
npm ci
npm run build:release
node scripts/verify-release-ready.js
```

Only after obtaining the actual minified Bundle-B should S2252 decide whether
feature-level lazy loading is still required.

Do **not** raise the 5 MB budget to hide the unresolved measurement.
