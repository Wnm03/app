# S2250 — Bundle-B Residency / Dependency Audit

## Baseline

Canonical working tree: `app-main (47)` = `app-main (46) + S2248`.

S2247 remains superseded and is not part of the canonical lineage.

## Finding

`scripts/build.js` is the canonical build manifest. In the rebased S2254 state it defines **369 GROUP_B JavaScript entries**; all 369 source files exist. The earlier S2250 helper incorrectly read the stale root `build.js` and reported 377; that measurement is superseded.
The largest raw source contributors include:

- `modules/vehicle/servis.js` — 171,362 bytes
- `modules/vehicle/service-master-data.generated.js` — 119,918 bytes
- `modules/finance/tagihan-kalender.js` — 98,765 bytes
- `modules/shared/features-helpers-global-security.js` — 90,801 bytes
- `modules/finance/dana-titipan-portfolio-render.js` — 90,490 bytes
- `modules/vehicle/vehicle-core.js` — 85,261 bytes
- `modules/shop/business-flow-presenter.js` — 85,187 bytes
- `modules/finance/transaksi.js` — 81,768 bytes
- `ai-chat.js` — 80,579 bytes
- `modules/vehicle/vehicle-part-sot.js` — 77,495 bytes

These are **raw source sizes**, not proof that any individual file is safe to lazy-load.

## Critical artifact finding

The supplied `app-bundle-b.min.js` is currently an **unminified fallback artifact**. Its first bundle header contains the build.js generated header marker. The build implementation in `scripts/build-core.js` uses esbuild when available and otherwise concatenates raw source.

Therefore the observed ~5.4 MB Bundle-B size cannot yet be treated as the true optimized production size.

`package.json` already has the correct release contract:

- `build:release` requires `--require-minify`.
- `release:preflight` runs the release verification gate.
- `scripts/verify-release-ready.js` blocks unminified bundles unless an explicit environment limitation override is supplied.

## Safe lazy-load exclusions already present

The following modules are intentionally outside GROUP_B and are loaded on demand:

- `modules/home/renovasi.js`
- `modules/business/sewakios.js`
- `modules/shop/business-intelligence-presenter.js`

S2250 regression guard keeps these exclusions intact.

## Decision

**Do not perform a broad GROUP_B split in S2250.**

A broad split before obtaining a real minified artifact would mix two independent variables:

1. release/build environment (minification), and
2. application architecture (lazy loading).

That would make size measurements and regression diagnosis unreliable.

## Next solution path

### S2251 — Reproducible production build

Run on an environment with dependencies installed:

```text
npm ci
npm run build:release
node scripts/verify-release-ready.js
```

The resulting Bundle-B size must be measured again **after minification**.

### S2252 — Bundle-B residency optimization, only if still over budget

If the real minified Bundle-B remains above 5 MB:

1. rank modules by minified contribution, not raw source size;
2. map runtime consumers and startup requirements;
3. select feature-only clusters;
4. add lazy loaders with explicit dependency ordering;
5. preserve SOT/event/persistence behavior;
6. run targeted + full regression;
7. re-measure Bundle-B and startup performance.

The 5 MB budget must not be raised merely to manufacture a PASS.

## Added S2250 guard

`scripts/audit-bundle-b-residency.js` is read-only and reports the canonical `scripts/build.js` GROUP_B size/residency plus the current artifact mode.

`tests/s2250-bundle-b-residency-audit.test.js` prevents accidental re-bundling of the three already-safe lazy modules and ensures release builds continue to require minification.

## S2251 follow-up

S2251 verified the production-build contract before any GROUP_B split. The project
already requires `--require-minify` for release builds and has a hard-stop guard plus
an independent release gate for unminified artifacts. The sandbox could not install
the declared dependencies within its execution limit, so the supplied ~5.4 MB Bundle-B
remains classified as an unminified fallback artifact. No broad lazy-load refactor is
justified until a real minified artifact is measured.
