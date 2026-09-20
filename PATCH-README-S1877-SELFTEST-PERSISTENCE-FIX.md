# S1877 — Persistence Self-Test Reliability Fix

## Scope
- Adds an optional `globalThis.__kwSaveImmediateObserver` invocation observer to `_saveImmediate()`.
- Updates the two persistence self-tests to observe real invocations instead of replacing `_saveImmediate()` through brittle monkey-patching.
- Ensures the migration test isolates and restores cross-tab stale state.

## Why
The UI showed two failures in the persistence tests. The tests were instrumenting a private function by assignment, which is fragile after source concatenation/browser bundling and can report a false negative even when the debounce/flush path runs.

## Safety
- No user data is changed.
- No backup records are deleted.
- The observer is optional and wrapped in a defensive try/catch.
- Production persistence behavior is unchanged; only diagnostic observability and test isolation are adjusted.

## Validation
- `node --check` passed for all three modified JavaScript files.
- Full browser self-test, production build, and full regression suite must still be run after integrating the source files into the build output.
