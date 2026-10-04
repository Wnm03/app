# Cumulative Audit S2282–S2286

- S2282/S2283: lazy-load timeout/retry + Business Intelligence/ShopInsight boundary.
- S2284: persistence load fail-closed.
- S2285: deploy/data-continuity gate for fresh bundles, persistence namespace/schema, and HTML/SW version alignment.
- S2286: final `showMain()` recovery barrier so a partially patched runtime cannot expose default/partial state after persistence recovery is required.

## Important audit limitation
The cumulative patch is intentionally a fix/test patch, not a complete application tree. Its standalone test run therefore cannot certify the full repository: two tests reference baseline files that are not included in the fix-only ZIP (`modules/shop/business-intelligence-presenter.js` and `modules/shared/app-init-runtime.js`). After applying the patch to the complete baseline, those files are expected to exist. This is a packaging/scope limitation, not a production data-loss fix to hide.

## Current release blockers
- Production rebuild has not been certified in this sandbox because the full baseline/build artifact tree is not present in the fix-only patch.
- `audit:deploy-data-continuity` must be run against the complete baseline after applying the cumulative patch.
- The gate intentionally blocks when Bundle B is stale after source changes; this is required behavior.

## Data-loss conclusion
The destructive persistence path is now protected at load, save, flush, and UI boundaries. Remaining deployment risks are environmental/origin/artifact concerns that require the complete production tree and real deployment URL to verify; they must not be declared PASS without that evidence.

## S2287 — Deploy Data Continuity Sentinel
- Added release-to-release sentinel using persisted runtime metadata.
- Critical collections that were populated in the previous build cannot silently become empty on the next build.
- Recovery mode is entered before runtime metadata is overwritten or any subsequent save can persist the damaged state.
- Same-build normal edits are not treated as deploy regressions.

## S2287 — Deploy Data Continuity Sentinel
- Added `kw_v4_continuity_highwater_v1` as a monotonic high-water marker.
- Critical populated collections cannot silently become empty across a build transition.
- The previous high-water counts cannot be replaced by zeros by a bad release.
- Recovery is entered before runtime metadata/high-water state is updated and before normal UI/write flow.
- Same-build user edits are not blocked by this deployment guard.
