# PATCH S1994 — S1988–S1993 cumulative service/Finance fix, verified against full repo

## What changed vs the S1993 overlay ZIP

Nothing in source. S1994 is not a new fix — it's the S1988-S1993 cumulative
patch (servis session-edit hardening + Finance-link fixes, BUG-021..026)
applied onto the **complete** `app-main (16)` repository (not a 26-file
overlay) and run through the real, unmodified test/build/gate pipeline.

## Verification (this session, full repo, official tooling — no custom harness)

- `node --test tests/*.test.js`: **7585/7585 PASS** (984 test files)
- `node scripts/verify-bundle-freshness.js`: PASS
- `node scripts/verify-window-expose.js`: PASS — 83 modules
- `node scripts/service-sot-integrity-gate.js`: PASS, including its full
  regression phase
- `node scripts/build.js`: PASS — version bumped 1990 → **1991** (only the
  build number moved; no other source changed), HTML/sw.js/bundles
  resynchronized, bundle syntax valid
- Full suite re-run at v1991: **7585/7585 PASS**
- `node scripts/verify-source-size.js --strict`: 1 warning, non-blocking —
  `servis.js` is 1785 lines (>1600 warning threshold, under the 1800 hard cap)

## Known blockers (sandbox limitation, not a code defect)

`node scripts/verify-release-ready.js` reports 2 blocking gates because this
sandbox has no network access to install dependencies:
- **lint**: `eslint` is not installed
- **minify**: `esbuild` is not installed — both bundles in this ZIP are
  **valid but unminified** (larger than a normal release build)

Before cutting an official release ZIP, run on a machine with network access:
```
npm install
npm run lint
node scripts/build.js --require-minify
node scripts/verify-release-ready.js
```

## Files

This ZIP carries only what actually changed or was regenerated relative to
the `app-main (16)` baseline you uploaded: the 9 S1988-S1993 source files,
the 9 new test files, `docs/BUG_REGISTRY.md`, and everything `build.js`
regenerated (`app-bundle-a.min.js`, `app-bundle-b.min.js`, `index.html`,
`app_production.html`, `sw.js`, `docs/FILE-MAP.md`,
`docs/COVERAGE-PER-MODULE.md`). Apply these paths over the full repo.
