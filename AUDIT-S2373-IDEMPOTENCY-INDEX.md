# S2373 — Service checklist idempotency index

## Finding
The checklist save guard called `ServiceEventIdempotencySOT.find()` once per generated row. That helper performs a linear `find()` over all service logs, so `k` checklist rows and `n` existing logs could require O(k*n) comparisons.

## Change
When there are truthy keys to check and the SOT helper is available, the guard now indexes existing log keys once in a local `Set`, keyed by trimmed idempotency key and (when supplied) trimmed vehicle ID. It then checks each generated key using Set membership. No long-lived cache is introduced.

## Compatibility notes
- The check still runs only when the SOT helper and its `find` API exist.
- The duplicate toast and early return are preserved.
- Vehicle scoping follows the SOT contract: a falsy vehicle ID does not scope by vehicle.
- Keys and vehicle IDs use the same trim/string normalization as the SOT helper.
- The index is local to this save operation, avoiding stale cross-save state.

## Validation
Focused tests compare indexed membership with the current SOT `find` semantics across matching, non-matching, cross-vehicle, and trimmed values. The cumulative focused set passes 24/24 and `node --check` passes. Production build completed at version 2226; both bundles are fresh. The full suite timed out, and release gate remains blocked by unavailable ESLint and missing esbuild/minification.
