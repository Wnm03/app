# S2174 — Service category recovery audit

## Scope
Read-only forensic continuation of S2173. This session distinguishes an already valid vehicle-specific reminder-category link from a canonical `masterCategoryId` + `serviceComponentId` mapping. It does not change runtime source, backup data, category records, or reminder state.

## Results

| Measure | Original backup | S2171 migrated copy |
|---|---:|---:|
| Vehicles | 5 | 5 |
| Service-history rows | 110 | 110 |
| Rows missing canonical identity | 20 | 15 |
| Rows with exact same-vehicle category and aligned interval snapshot | 7 | 6 |
| Rows without deterministic category evidence | 13 | 9 |
| Automatic changes | 0 | 0 |

Six migrated-copy rows have a unique `categoryId` that resolves to a same-vehicle category with an exact normalized name, active reminder interval, matching `intervalKmAtService`, and `nextDueKm = km + intervalKm`:

- `1782820344573` — Servis Cvt; category interval 8,000 km; due 18,469 km
- `1782820344606` — Tutup Pully; category interval 24,000 km; due 38,867 km
- `1782820344607` — Servis Cvt; category interval 8,000 km; due 22,867 km
- `1783591790533` — Pully; category interval 3,300 km; due 9,000 km
- `1783591790538` — Servis Cvt; category interval 8,000 km; due 15,060 km
- `1783591790594` — Tutup Pully; category interval 24,000 km; due 38,867 km

These six rows have evidence for **category-level reminder identity and historical due snapshots only**. The category records lack canonical `serviceComponentId` and `masterCategoryId`; therefore this audit does not equate them with a canonical service component or prove that a replacement action should reset that component's interval.

The remaining nine migrated-copy rows without deterministic category evidence are `1782820344535` (Gasket Stator Base), `1782820344536` (Seal Magnet), `1782820344537` (Seal Kruk As), `1782820344538` (Korter Piston), `1782820344540` (Jasa Pasang Stang Laher), `1782820344612` (Ban Dalam), `1783591790515` (Jasa Overhoul), `1783591790532` (Seal Head), and `1783591790610` (Pembersihan Rem). `Pembersihan Rem` contains six checklist components with mixed actions; it must not be mapped to a single component.

## Safety decision
- No backup or app data was changed.
- Do not populate canonical component IDs from category labels alone.
- Do not reset component intervals from a root-level service action when checklist action evidence is absent or mixed.
- The six category-level matches should be tested against the live reminder computation path, especially whether `categoryId`-only history rows participate in last-service selection. Their stored interval snapshots are internally consistent, but that does not prove runtime reminder consumption.

## Tests
S2174 + S2173/S2172/S2171/S2170/S2169/S2164 focused regression set: **18/18 passed**. S2174 script and test syntax checks passed. A full `node --test` run was attempted but the execution environment timed out while output had reached subtest 866; no final TAP summary was emitted, so full-suite success is not claimed. No app build was run because this session changed only diagnostic script/tests/docs and no runtime/bundle source.

## Run

```bash
node scripts/s2174-service-category-recovery-audit.js backup.json report.json
node --test tests/s2174-service-category-recovery-audit.test.js tests/s2173-service-history-identity-evidence.test.js tests/s2172-service-conflict-evidence-audit.test.js tests/s2171-controlled-service-backup-migration.test.js tests/service-backup-reconciliation-preview-s2170.test.js tests/service-action-authority-s2169.test.js tests/s2164-reviewed-mapping-migration-gate.test.js
```
