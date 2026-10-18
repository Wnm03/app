# S2031–S2033 — Cumulative Reset-Interval Compatibility Audit

## Baseline and accumulation chain
- Baseline: `app-main (20).zip`.
- Carried forward S2031: `PATCH-S2031-REMINDER-RESET-CONDITION-MODE.zip` changes and contract tests.
- Carried forward S2033: explicit action-filter matching, legacy action alias normalization, and bundle/cache synchronization.
- Follow-up correction in this final cumulative pass: no-filter `periksa-conditional` reminder matching must use the inspection axis (`periksa`), rather than falling through to the generic replacement-reset family.

## Business contract
1. `periksa` updates inspection/condition evidence; it must not reset replacement age.
2. `ganti`, `pasang`/`pasang baru`, and `overhaul`/repair aliases can establish a replacement-family reset baseline when the relevant reset action is requested.
3. `periksa-conditional` reminder projection with no explicit action filter uses `periksa` history as its baseline.
4. With `gantiResetsInterval === false`, a `ganti` record is excluded from the conditional reminder reset basis. Explicit action filters remain authoritative for other actions and do not broaden `periksa` into unrelated actions.
5. Legacy logs without `actionType` remain backward-compatible; no historical data migration or destructive rewrite is performed.

## Root cause found during full-suite audit
The S2033 matcher correctly applied explicit filters, but the no-filter fallback normalized `periksa-conditional` to `periconditional`, excluded that mode from the special-mode branch, and then returned the generic reset-family predicate. This made an ordinary `periksa` history row fail to match in the no-filter conditional reminder path. The same behavior existed in both `sparepart-servis.js` and `servis-b.js`.

## Fixes
- `modules/vehicle/sparepart-servis.js`: explicit no-filter conditional reminder branch returns only `effType === 'periksa'`.
- `modules/vehicle/servis-b.js`: mirrored the same conditional-axis behavior so the reminder matcher and urgency projection remain consistent.
- `tests/s2423-artifact-fingerprint-propagation.test.js`: removed a stale session-specific build-label expectation; the audit now validates the current canonical version shape and synchronization.
- `tests/s2152-p4-7-final-gate.test.js`: made the runtime-version check version-agnostic while preserving one-version, numeric-suffix, and cache-bust assertions.
- Rebuilt with pinned esbuild minification; synchronized source version, HTML query versions, production HTML, service-worker cache, and bundle fingerprints.

## Validation results
- Targeted reset/action/chain tests: **28 passed, 0 failed**.
- Full repository suite (`TEST_FORCE_RERUN=1`): **8,888 tests; 8,887 pass; 0 fail; 1 skipped**.
- `service-sot-integrity-gate.js`: **PASS**.
- `verify-bundle-freshness.js`: **PASS** for both bundles.
- `verify-window-expose.js`: **PASS**, 83 modules checked for data-action exposure.
- S2552 byte-parity: **PASS** for both bundles against pinned esbuild output.
- P4.7 final static gate: **25/25 PASS**.
- Release hardening (run through npm toolchain PATH): **PASS**, both bundles within fixed size budgets, tools available, hashes fresh, HTML mirror and SW cache synchronized.
- `verify-release-ready.js`: **PASS** including service SOT, bundle freshness, cache/version sync, lint and deep release firewall.
- ESLint: **0 errors**, 1,802 warnings across the repository (existing warning inventory; no lint errors).
- `verify-source-size.js --strict`: exit 0; 3 known oversized files remain under their configured guard caps.

## Incomplete composite check
`npm run release:final-gate` did not finish within the execution window while running its `critical-integrity` substep. This is **not** counted as PASS. The full suite and the individual release/SOT gates listed above completed independently and passed.

## Release identity
- Canonical build: `s2033-reset-interval-chain-audit-2553`.
- HTML cache-bust: `?v=2553` in `index.html` and `app_production.html`.
- Service-worker cache: `kw-cache-v2553`.
- Bundle A/B are minified, syntactically valid, source-fresh, and byte-identical to pinned esbuild transforms.
