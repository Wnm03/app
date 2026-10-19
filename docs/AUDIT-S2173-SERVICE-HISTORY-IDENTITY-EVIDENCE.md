# S2173 — Forensic evidence for unresolved service-history identity

## Scope
Read-only follow-up to S2172. This audit enriches the remaining service-history rows with canonical-label, checklist-pair, category-reference, and linked-transaction evidence. It does not edit application runtime behavior or any backup data. A transaction link is not treated as direct vehicleId proof when the transaction lacks that field; reverse-link, date, and vehicle-category context are reported separately and remain diagnostic-only.

## Measured results

| Measure | Original backup | S2171 migrated copy |
|---|---:|---:|
| Vehicles | 5 | 5 |
| Service-history rows | 110 | 110 |
| Unresolved canonical identity | 20 | 15 |
| Exact unique canonical-label candidates | 0 | 0 |
| Unresolved rows with transaction links | 3 | 3 |
| Links verified by direct vehicleId + date | 0 | 0 |
| Links corroborated by reverse service link + matching vehicle category + date | 3 | 3 |
| Multi-component session summaries | 2 | 1 |
| Automatic changes | 0 | 0 |

The original backup SHA-256 was rechecked and remains `4d73853b57b0df1d22e218dce839440cef210e3877b7d751d6dd4a0ecedcfb31`.

## Important row-level evidence

The remaining migrated-copy unresolved rows are:

- `1782820344535` — Gasket Stator Base
- `1782820344536` — Seal Magnet
- `1782820344537` — Seal Kruk As
- `1782820344538` — Korter Piston
- `1782820344540` — Jasa Pasang Stang Laher
- `1782820344573` — Servis Cvt
- `1782820344606` — Tutup Pully
- `1782820344607` — Servis Cvt
- `1782820344612` — Ban Dalam
- `1783591790515` — Jasa Overhoul
- `1783591790532` — Seal Head
- `1783591790533` — Pully
- `1783591790538` — Servis Cvt
- `1783591790594` — Tutup Pully
- `1783591790610` — Pembersihan Rem

Three linked transactions are discoverable by ID. Each also points back to the exact service-history row (`servisLinkId`), has the same date, and uses transaction category `Vario 125`, matching vehicle `veh_1` named `Vario 125`. The transaction records still lack an explicit `vehicleId`, so the report marks this as strong contextual corroboration (`REVERSE_LINK_AND_VEHICLE_CATEGORY_MATCH`) rather than direct vehicleId proof. This supports the transaction-to-history link, but it does not identify the missing service component and does not authorize an automatic component mapping. Exact-label matching yields no unique canonical match. `Pembersihan Rem` has six component pairs in its checklist and cannot be assigned as a single component. The five previously reviewed Slidepiece mappings remain only in the separate S2171 migrated copy; the original backup is unchanged.

## Decision
No additional data migration is authorized by this evidence. Do not force component IDs or reset service intervals from the root action for these unresolved rows. To close them safely, review original transaction/source records for vehicle context and explicitly map legacy labels; multi-component summaries must stay summaries or be expanded only when the underlying per-component actions are evidenced.

## Tests
Targeted S2164/S2169/S2170/S2171/S2172/S2173 regression set: **14/14 passed**. `node --check scripts/s2173-service-history-identity-evidence.js` passed. App runtime/bundles were not changed, so this diagnostic phase does not claim a full application build or full-suite pass.

## Run

```bash
node scripts/s2173-service-history-identity-evidence.js backup.json report.json
node --test tests/s2173-service-history-identity-evidence.test.js tests/s2172-service-conflict-evidence-audit.test.js tests/s2171-controlled-service-backup-migration.test.js tests/service-backup-reconciliation-preview-s2170.test.js tests/service-action-authority-s2169.test.js tests/s2164-reviewed-mapping-migration-gate.test.js
```
