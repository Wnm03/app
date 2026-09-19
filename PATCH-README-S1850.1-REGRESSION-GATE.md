# S1850.1 — Regression Gate Correction

Cumulative follow-up to S1850.

## Purpose
Fix the S1843 persistence regression test so it matches the S1850 snapshot-cache architecture.

## Change
- The S1843 gate previously assumed `saveFlush()` directly called `_buildSaveJson()`.
- S1850 correctly moved serialization behind `_getSaveSnapshotForVersion(version)` so lifecycle flushes can reuse the same snapshot.
- The test now extracts balanced function bodies and verifies exactly one `_buildSaveJson()` call across the flush + snapshot-helper path.
- No production behavior/schema/UI/data behavior is changed.

## Validation
- S1841–S1842: PASS
- S1843: 4/4 PASS
- S1844: 3/3 PASS
- S1845: 3/3 PASS
- S1846–S1849: 5/5 PASS
- S1850: 6/6 PASS
- Combined performance regression: 23/23 PASS
- Production syntax check: PASS

## Full suite note
The repository-wide suite was started against app-main (28), but the environment exceeded the available execution window before completion. The partial run reached 5,177 individual tests and exposed existing/non-performance failures; it is not reported as a full-suite PASS.
