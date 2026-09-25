# Audit S2021 — Checklist Evidence Identity

## Temuan
Satu service session dapat memuat beberapa checklist component. Navigation S2019/S2020 sudah menggunakan component context, tetapi belum ada identity eksplisit untuk evidence per checklist item. Tanpa identity ini, data lanjutan seperti foto/kondisi/teknisi/part/biaya berisiko salah diasosiasikan jika nanti ditambahkan per component.

## Keputusan aman
Tidak mengubah schema histori existing dan tidak memindahkan data. S2021 hanya membuat read-only projection `Evidence Identity`.

### Identity
`evidenceId = evidence:<historyId>:<checklistItemId>` bila `checklistItemId` tersedia.
Fallback aman: `evidence:<historyId>:<serviceComponentId>`.

`sessionId` tetap parent context, `serviceComponentId` tetap canonical component identity, dan `historyId` tetap record evidence parent.

## UI
Audit untuk component fokus menampilkan Evidence ID, History ID, Checklist Item ID, component ID, dan status integrity.

## Invariant
- Component A tidak dapat membuka evidence B hanya karena berada pada session yang sama.
- Audit/Reminder/History tetap menggunakan component context yang sama.
- S2021 tidak mengubah atau menghapus histori.

## Validation
- S2014, S2015, S2016, S2017, S2018, S2019, S2020 regression: PASS.
- S2021 evidence identity: PASS.
- HTML/SW wiring: PASS.
- JS syntax: PASS.
- ZIP integrity: PASS.
- Historical S2012 helper suite tidak dapat direrun karena `tests/helpers/loadSource` tidak dibawa dalam patch kumulatif; tidak diklaim sebagai PASS.
