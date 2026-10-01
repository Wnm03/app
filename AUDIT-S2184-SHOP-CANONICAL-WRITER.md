# A-S2184 — Shop canonical writer

## Scope
- Canonical mutation boundary for `D.products`.
- No UI change and no schema change.
- No legacy deletion.
- `ProductRepository` remains the lower-level mutation/validation engine.

## Migrated writers
- Etalase product create/delete.
- Shop transaction-cart product creation.
- Shop Excel import product creation.

## Gates
- S2184 focused test: PASS.
- Source syntax checks: PASS.
- Full `npm test`: environment timeout; not claimed PASS.
- Build must be evaluated on the cumulative S2180→S2184 workspace.
