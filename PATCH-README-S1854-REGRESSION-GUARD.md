# S1854 — Performance Regression Guard

Cumulative follow-up to S1841–S1853.

Fixes standalone/isolated-module crashes caused by unguarded `refreshAfterMutation(...)` calls introduced by the performance render-scope optimization. Calls now execute only when the helper exists, preserving normal runtime behavior while keeping modules independently testable.

Regression: S1854 standalone guard test passes; shard 6 regression reproduced before patch and passes after patch.

No schema changes, no feature removal, no UI redesign.
