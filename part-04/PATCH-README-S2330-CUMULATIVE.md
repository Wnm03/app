# S2330 — Cumulative build/test hardening patch

Baseline: `app-main (51).zip` (the uploaded full source tree, including its existing accumulated S2180–S2229 work).
Target build identity: `s2041-1-part-sot-hardening-2217` / `?v=2217` / `kw-cache-v2217`.

## Changes in this patch

1. Fix `SCHEMA_VERSION` being swallowed by a `//` comment in `modules/shared/features-helpers-global-security.js`. Keep the source file within the existing GROUP_B byte-size contract.
2. Rebuild Bundle A and Bundle B and synchronize the five source build-version markers, `index.html`, `app_production.html`, and `sw.js` to 2217.
3. Fix service-worker activation so it deletes only stale caches in the app's `kw-cache-` namespace and leaves unrelated origin caches untouched.
4. Update the PWA recovery gate and its regression test to match the namespace-scoped cache contract.
5. Update the persistence recovery test to assert the actual `_blockSaveFlushOnRecovery()` guard contract rather than a stale literal `return false` implementation.
6. Retain `DELETE-FILES.txt` in the patch package so the established deletion step remains explicit (`pro-ui-layer.css`).

## Apply

- Extract/overlay these patch files at the repository root, preserving paths.
- Apply every entry in `DELETE-FILES.txt` before deployment.
- Upload all changed runtime files, including both bundles, both HTML entry points, and `sw.js`.

## Verification

- Build: PASS; source/bundle syntax checks PASS.
- Focused regression tests: 53 assertions/subtests across the selected test files PASS (see the session test logs for exact group totals).
- Full suite: **8233 tests, 8232 pass, 0 fail, 1 skipped**.
- Bundle freshness, version integrity, delete manifest, PWA recovery, deep release firewall, SOT and Car Notes integrity gates: PASS.
- `verify-release-ready.js`: PASS with two documented environment overrides only: ESLint is not installed, and esbuild is not installed, so generated bundles are valid but not minified. Install those tools and rerun the gate for a no-override release.

This is a delta patch against the uploaded baseline, not a replacement full-source ZIP. Existing accumulated code/fixes in the baseline are preserved; this package contains the current-stage changes plus the mandatory delete manifest.
