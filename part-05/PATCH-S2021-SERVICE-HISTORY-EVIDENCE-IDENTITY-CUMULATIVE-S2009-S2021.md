# S2021 — Service History Evidence Identity

## Tujuan
Menutup gap multi-checklist: satu sesi servis dapat memiliki banyak komponen, tetapi evidence/audit harus menunjuk komponen yang benar.

## Implementasi
- Projection read-only `service-history-evidence-s2021.js`.
- Evidence identity deterministik: `historyId + checklistItemId`, fallback ke `historyId + serviceComponentId`.
- Tidak mengubah/menghapus histori.
- Tidak membuat SOT baru; memakai `ServiceHistoryMultiChecklistS2019` dan canonical component identity yang sudah ada.
- Menyediakan identity, lookup, session evidence, duplicate-safe projection, audit status, dan UI evidence block.
- Cache/service-worker dinaikkan ke v2021.

## Invariant
`sessionId` = parent context; `serviceComponentId` = component identity; `evidenceId` = identity bukti per component dalam history.

## Validasi
Focused S2021 test + cumulative S2014–S2021 tests, JS syntax, HTML wiring, service-worker wiring, ZIP integrity.
