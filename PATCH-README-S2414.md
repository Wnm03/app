S2414 — Repair F2: S2391 GROUP_B source-size contract refresh

Baseline: app-main (53), cumulative through S2412.

Finding closed:
- F2 — tests/s2391-regression-contract-realignment.test.js pinned stale GROUP_B source payload 4,914,176 bytes.
- Current canonical GROUP_B remains 359 files and measures 4,863,453 bytes.

Change:
- Refresh only the stale byte-count assertion from 4,914,176 to 4,863,453.

Verification:
- node --test tests/s2391-regression-contract-realignment.test.js
- Result: 4/4 PASS.

Not included:
- No Bundle-B regeneration in S2414 because esbuild is unavailable.
- No unrelated source/runtime changes.
