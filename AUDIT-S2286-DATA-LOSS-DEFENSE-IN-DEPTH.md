# S2286 — Data-loss defense-in-depth audit

## Finding
S2284 correctly blocks `save()` and `saveFlush()` after persistence recovery is required, but `showMain()` itself had no independent guard. A partially patched/older runtime could therefore still expose the UI even though persistence was in recovery mode. That is a safety gap because the visible app could operate on default/partial in-memory state.

## Fix
`showMain()` now checks `window.__kwPersistenceRecoveryRequired` before changing the UI to the main application. It returns `false` and leaves the app locked when recovery is required.

## Layered contract
1. `load()` catches post-read/migration/SOT failures and enters recovery mode.
2. `save()` refuses persistence while recovery is required.
3. `saveFlush()` refuses lifecycle persistence while recovery is required.
4. `showMain()` refuses to expose the main UI while recovery is required.
5. S2285 blocks deployment when served bundles or persistence contracts are stale/drifted.

## Regression
S2286 adds a static regression gate for the final UI boundary and verifies that the persistence protection remains layered.
