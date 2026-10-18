# S2148 — Interval Conflict Guard

## Scope
Read-only audit guard for the canonical service component database. It scans all 102 components and compares declared `intervalKm` with intervals mentioned in `intervalLabel`, `catatan`, and `catatanTambahan`.

## Why this is not a runtime interval rewrite
The current V-Belt CVT record declares `intervalKm: 32000` while its notes mention a 24,000 km replacement interval for KZR 2012 and an 8,000 km inspection cadence. The model scope is not sufficiently structured to safely turn those prose notes into runtime rules. Replacing 32,000 with 24,000 globally would be unsafe; silently preferring one phrase would also be unsafe.

## Included
- `scripts/audit-service-interval-conflicts-s2148.js`: read-only audit, optional `--strict` exit code 2 when findings exist.
- `tests/service-interval-conflicts-s2148.test.js`: protects the known V-Belt conflict and ensures it remains visible.

## Run
`node --test tests/service-interval-conflicts-s2148.test.js`
`node scripts/audit-service-interval-conflicts-s2148.js`
`node scripts/audit-service-interval-conflicts-s2148.js --strict` (expected non-zero until conflicts are resolved).

## Remaining work
Resolve each finding against model/year-specific authoritative service documentation, then encode explicit model/variant scope in structured data. Do not change active vehicle SOT intervals automatically; existing manual values must remain authoritative unless the user explicitly edits them.
