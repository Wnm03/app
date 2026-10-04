# S2397 — Bundle-B service master lazy-data optimization

Cumulative patch for pristine `app-main (53)` through S2397.

Changes:
- S2392/S2393/S2394 accumulated Car Notes renderer/history optimizations.
- S2397 keeps `SERVICE_CHECKLIST_GROUPS` as the eager runtime representation.
- Legacy `SERVICE_MASTER_DATA` is reconstructed lazily on first access, preserving its exact legacy shape.
- Bundle-B residency pin refreshed from 4,914,176 to 4,858,586 source bytes.
- Added regression coverage for lazy materialization and legacy deep equality.

No schema, SOT identity, service interval, or persisted-data migration changes.
Production minified build is not claimed here because `esbuild`/`node_modules` are unavailable in the baseline environment.
