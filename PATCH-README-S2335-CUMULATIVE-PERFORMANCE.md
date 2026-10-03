# Cumulative Performance Patch S2335

This patch accumulates S2333 (viewport update coalescing), S2334 (service checklist stock-option reuse), and S2335 (budget recommendation transaction-scan reduction) on top of the supplied `app-main (52).zip` baseline.

## Apply

1. Extract the patch at the same root as the `app-main` project so paths under `app-main/` overlay the existing project.
2. Review and apply `DELETE-FILES.txt`; it preserves the existing convention to remove `pro-ui-layer.css`.
3. Do not deploy until the release toolchain is available and the release gate passes.

## Verification summary

- Selected cumulative performance tests: **33/33 PASS**.
- Bundle freshness: **PASS**.
- Performance budget: **PASS**, but HTML/CSS and Bundle B remain close to configured limits.
- Patch integrity / contamination checks: **PASS**.
- Full suite: **not confirmed** (previous attempts exceeded the execution time limit).
- Release readiness: **BLOCKED** because `esbuild`/`eslint` are unavailable in the build environment; the regenerated bundles are syntactically valid but unminified.
- Browser/device profile: not run. No measured Android/WebView latency claim is made.

See `AUDIT-S2333-BASELINE-PERFORMANCE-OPTIMIZATION.md`, `AUDIT-S2334-CHECKLIST-STOCK-RENDER-OPTIMIZATION.md`, and `AUDIT-S2335-BUDGET-RECOMMENDATION-SCAN-REDUCTION.md` for scope and limitations.
