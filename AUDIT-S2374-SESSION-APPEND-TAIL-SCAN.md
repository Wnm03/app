# S2374 — Service-session append-tail scan

## Finding
The checklist-save flow appends the new session rows to `D.servisLogs`, then performs a full-array filter to find those rows for catalog snapshots. After an asynchronous catalog lookup, the catalog-link pass performs another full-array filter for the same session.

## Change
Capture `D.servisLogs.length` immediately before appending the new rows. Both later passes slice from this append boundary and retain the explicit `sessionId` predicate. The second pass also retains its exclusion of the primary `servisId` row. This narrows scan work from all historical logs to the newly appended tail while preserving row order and guarding against unrelated rows appended after an `await` by retaining the session predicate.

## Safety boundaries
- No persistent cache or index is introduced.
- No log rows are removed or reordered.
- Session ID matching and primary-row exclusion remain unchanged.
- Concurrently appended rows from other sessions are excluded by the session predicate.

## Validation
See `tests/s2374-service-session-tail-scan.test.js` and updated S2372 source-contract test. Full-suite/build/release validation must be rerun before deployment.
