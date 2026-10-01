# S2164 — Controlled Reviewed-Mapping Migration

S2164 applies only S2163 legacy mappings explicitly marked `reviewed:true`.

## Rules
- No guessing and no automatic use of `candidate`/`blocked` mappings.
- Vehicle ID is mandatory and must resolve to an existing vehicle.
- Existing canonical component/category values are never overwritten when they conflict.
- Migration is idempotent: a second pass produces zero changes.
- No records are deleted and no new fact store is introduced.
- Every changed service log receives an `editHistory` audit entry.

## Reviewed mappings
1. `Slidepiece` → `servis-cvt / slide-piece-cvt`
2. `Grease Cvt` → `servis-cvt / pelumasan-cvt-grease`
3. `Grmuk cvt` → `servis-cvt / pelumasan-cvt-grease`

## Gate
`S2164 reviewed-mapping migration gate: PASS 10/10`

The gate covers reviewed-only consumption, deterministic application, conflict preservation, vehicle boundary, audit trail, and second-pass idempotency.
