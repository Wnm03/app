# S2225 — Production Build Closure

Date: 2026-10-01
Baseline: S2180–S2224 / workspace S2224

## Scope

This session audited the production build/release artifact chain without changing application runtime logic.

## Real defect found

`node scripts/build.js --require-minify` previously performed the version bump before checking whether `esbuild` was available. In an environment without `esbuild`, the command could terminate after changing the six version constants to the next version while `index.html`, `app_production.html`, and `sw.js` remained on the previous version.

This was a build-tooling transactional-integrity defect: a failed required-minification build could leave the repository in a mixed-version state.

## Repair

`scripts/build.js` now runs `preflightRequiredMinifier()` before:

- generated service-master-data mutation;
- version detection/bump;
- bundle backup;
- bundle generation;
- HTML/SW version mutation.

When `--require-minify`/`REQUIRE_MINIFY=1` is active and `esbuild` cannot be loaded, the build fails closed before mutating the repository.

## Verification

- Required-minify failure: expected non-zero exit.
- Version-source hashes before/after required-minify failure: unchanged.
- HTML/SW remained at version 2205.
- Explicit offline rebuild at version 2205: PASS.
- Bundle syntax: PASS.
- Bundle freshness: PASS.
- Reproducible build: PASS (5 artifacts byte-identical).
- Release firewall: PASS 10/10.
- Production readiness: PASS 14/14.
- Final UI/critical gate: 43/43 PASS.
- Performance budget: bundle-A PASS; bundle-B remains 5,397,720 bytes > 5,000,000 because no minifier is available.

## Environment limitation

`esbuild` is declared in `package.json` but is not installed. No local esbuild/terser/uglifyjs/swc/deno/bun binary or npm cache was available. Therefore a genuinely minified production bundle could not be produced in this environment.

The performance budget was not weakened and no stale/foreign minified bundle was substituted.

## Release status

Source/runtime gates are clean. Release artifact closure remains BLOCKED only by the unavailable minification dependency and the resulting bundle-B size budget.
