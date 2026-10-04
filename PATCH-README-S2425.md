# S2425 — Toolchain / Dependency Reproducibility Readiness

## Baseline

`app-main (53)` + canonical S2423 + S2424 state.

## Finding

The production build contract correctly requires `esbuild` and `--require-minify`,
but the repository has **no `package-lock.json` or `npm-shrinkwrap.json`** while
`package.json` uses a caret range (`esbuild: ^0.24.0`).

This has two separate effects:

1. `npm ci` cannot run at all without a lockfile.
2. Dependency resolution is not fully pinned for a reproducible release install.

The current environment also has no `node_modules`, so `esbuild` and `eslint` are
unavailable. An offline `npm install --package-lock-only` attempt failed because
the required registry metadata was not cached. No dependency file was fabricated.

## Repair

S2425 makes the existing read-only `audit:release-contract` explicitly classify
missing dependency lockfiles as `BLOCK`. This does **not** pretend that the
missing lockfile or toolchain has been repaired.

No source/runtime/bundle/HTML/SW artifact is changed.

## Validation

- S2425 contract test: PASS.
- `npm ci --offline`: BLOCK — no lockfile.
- `npm install --package-lock-only --offline`: BLOCK — registry metadata unavailable.
- `npm run build -- --require-minify`: BLOCK — `esbuild` unavailable.
- Bundle-B freshness: BLOCK — source `6a7306385a0b77d1` vs embedded `221da3874ea0ea76`.
- Bundle-A freshness: PASS — `9fdcaaa6da911fe0`.

## Required external completion

In a networked/release environment:

```text
npm install
npm ci
npm run build:release
node scripts/verify-bundle-freshness.js
node scripts/verify-reproducible-build.js
npm run lint
```

The resulting lockfile must be committed and the real minified Bundle-B must be
rebuilt. No stale or unminified bundle is accepted as release evidence.
