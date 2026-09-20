# Service History Integrity Audit

- `D.servisLogs` remains the only persisted source of truth.
- `modules/vehicle/service-history-integrity-audit.js` is read-only.
- It reports duplicate IDs, duplicate transaction links, duplicate idempotency keys, logical duplicate candidates, incomplete records, and cross-vehicle conflicts.
- Logical matches are classified as `suspectedDuplicates`; `safeToMerge` is intentionally always empty because automatic merging can destroy valid repeated or multi-component service history.
- Canonical projections must not replace the original log payload.
