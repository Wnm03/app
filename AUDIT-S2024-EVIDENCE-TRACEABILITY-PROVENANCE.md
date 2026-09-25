# S2024 — Evidence Traceability & Provenance Audit

## Tujuan

Menyediakan read-only provenance map untuk menjawab: evidence berasal dari history mana, session mana, checklist index mana, component mana, dan finance linkage mana.

## Keputusan arsitektur

- SOT tetap `D.servisLogs` dan persisted `checklist[]`.
- S2019 tetap menjadi sumber enumerasi/navigasi component.
- S2021 tetap menjadi sumber identity `evidenceId`.
- S2022 tetap menjadi lifecycle/scope audit.
- S2023 tetap menjadi completeness/consistency audit.
- S2024 hanya memproyeksikan provenance; tidak membuat SOT baru.
- Finance tetap history-linked; S2024 tidak melakukan relinking.
- Foto tetap pada field asal; S2024 tidak memindahkan atau menggandakan foto.
- Cost tetap pada scope asal; S2024 tidak mengalokasikan cost history-level ke component.

## Provenance yang ditampilkan

Untuk component yang sedang difokuskan:

`D.servisLogs[id]`
→ `checklist[index]`
→ `serviceComponentId / checklistItemId`
→ `condition / photos / costBreakdown / parts / serviceEvidence`

serta relasi history-level:

`sessionId / vehicleId / note / foto / cost / accountId / txLinkId`

## Status

- `OK`: provenance component dapat ditelusuri tanpa ambiguity tambahan.
- `WARNING`: provenance component tersedia tetapi terdapat evidence history-level pada multi-component session yang tidak boleh otomatis dianggap milik component.
- `ERROR`: component/history identity atau persisted checklist snapshot yang diperlukan tidak ditemukan.

## Scope

Tidak termasuk:

- migrasi data
- perubahan schema
- backfill
- relinking finance
- pemindahan foto
- perubahan reminder
- perubahan biaya
- perubahan stock/part
- penghapusan history

## Validasi

Regression subset seluruh test `tests/service-history-*.test.js` yang tersedia pada package ini: **8 test files, seluruhnya PASS**.

Full repository suite tidak diklaim karena limitation lama pada test S2012 yang membutuhkan `tests/helpers/loadSource` yang tidak tersedia di patch archive.
