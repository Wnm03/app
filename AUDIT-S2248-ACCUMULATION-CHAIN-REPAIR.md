# Keluarga W — S2248 Accumulation Chain Repair

## Canonical lineage

Baseline canonical: `app-main (46)`.

The previous S2247 ZIP was found incomplete during chain replay: it contained 12 files, while the canonical S2242 cumulative patch contained 20 files. Sixteen S2242 payload files were therefore absent from S2247, including the production bundles, HTML/SW version files, SOT-related source files, package.json, and S2229 regression contract.

This is a **patch packaging/lineage defect**, not evidence that the SOT/domain implementation itself regressed.

## Repair

The canonical S2248 patch is rebuilt as:

`app-main (46) + S2242 cumulative payload + S2246 changes + S2247 audit changes + S2248 contract/documentation fixes`

When files overlap, the later session payload wins.

S2242 production artifacts are retained exactly as supplied by the previously verified bundle-freshness repair (version 2206). No unminified local rebuild is substituted.

## Stale test contracts repaired

1. `tests/servis-s1973-bundle-version-integrity.test.js`
   - Updated the runtime bundle identity expectation from the obsolete 2205 identity to the canonical supplied 2206 artifact.
2. `tests/s1930-mobile-ui-cache-hardening.test.js`
   - Automatically follows `APP_BUILD_VERSION`; it now passes against the restored 2206 bundle artifacts.
3. `tests/s1900-production-readiness.test.js`
   - Removed the obsolete hard-coded `TEST_SHARDS=64 ...` command contract.
   - The package script now delegates to `scripts/run-full-test.js`, allowing explicit shard configuration from the environment.

## Verification

- SOT integrity: PASS
- Architecture integrity: PASS
- Persistence integrity: PASS
- PWA recovery: PASS
- Feature regression: PASS
- Window expose: PASS
- Release firewall: PASS
- Patch contamination: PASS
- Bundle freshness: PASS
- Targeted stale-contract regression: 6/6 PASS
- Repaired full-test shard 16/32: 240/240 PASS

The full 32-shard run was attempted but exceeded the sandbox execution window. No full-suite PASS claim is made from that incomplete run.

## Performance

The existing bundle-B budget remains above target (5,398,399 > 5,000,000 bytes). This remains a separate P2 optimization target; the budget is not increased to manufacture a green gate.

## Decision

S2248 supersedes the previous S2247 ZIP as the canonical patch artifact. Future sessions must start from `app-main (46) + S2248` and must not reconstruct the chain by stacking independent historical ZIPs manually.
