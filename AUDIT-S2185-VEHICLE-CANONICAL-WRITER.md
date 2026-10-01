# A-S2185 — Vehicle Master Canonical Writer

## Scope
Centralize the primary CRUD array mutations of `D.vehicles` behind `VehicleCanonicalWriter`.

## Changes
- Added `modules/vehicle/vehicle-canonical-writer.js`.
- `vehicle-core.js` now uses the writer for vehicle create/delete array mutation.
- Build order loads the writer immediately before `vehicle-core.js`.
- No schema changes, UI changes, or legacy deletion.

## Guardrails
- Duplicate vehicle IDs are rejected by the canonical create boundary.
- Existing vehicle objects remain schema-compatible.
- Backup/migration initialization paths are intentionally untouched.

## Validation
Focused writer tests: 7/7 PASS.
Full repository test/ESLint status remains subject to environment timeout and is not claimed PASS.
