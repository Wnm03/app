# Patch S2150 — Independent service interval axes

This patch continues the cumulative S2145–S2149 service reminder audit/fix series.

### Fix
V-Belt CVT now preserves the inspection cadence as a separate axis from the active per-vehicle replacement interval. `ServiceIntervalSOT` remains the source of truth for replacement cadence; manual values are not overwritten.

### Tests
Run:

```bash
node --test tests/service-reminder-independent-interval-axes-s2150.test.js tests/service-reminder-slide-piece-replacement-reset-s2145.test.js tests/service-reminder-filter-fuel-pump-dual-interval-s2146.test.js tests/service-interval-conflicts-s2148.test.js tests/service-master-data-lazy-s2397.test.js
npm run build
node scripts/verify-bundle-freshness.js
TEST_SHARDS=64 npm run test:full
```

### Important limitation
This patch does not resolve the model/year-specific 24,000 km vs generic 32,000 km V-Belt replacement interval. Do not call this a final zero-bug release until model/year-scoped guideline resolution and the complete full regression suite are finished.
