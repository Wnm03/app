# PATCH S2026 — Service History Reminder Component Scope

Additive cumulative patch S2009–S2026.

Files added:
- `modules/vehicle/service-history-reminder-component-s2026.js`
- `tests/service-history-reminder-component-s2026.test.js`
- `AUDIT-S2026-REMINDER-COMPONENT-SCOPE.md`
- `PATCH-S2026-SERVICE-HISTORY-REMINDER-COMPONENT-SCOPE-CUMULATIVE-S2009-S2026.md`
- `S2026-IMPLEMENTATION-MANIFEST.md`
- `S2026-FILE-HASHES.txt`

Files updated:
- `modules/vehicle/service-history-multichecklist-s2019.js` — expose read-only `reminderProjection`.
- `index.html`, `app_production.html` — wire S2026.
- `sw.js` — cache `kw-cache-v2026` and precache S2026.

No schema, persistence, finance, reminder SOT, or import/export changes.
