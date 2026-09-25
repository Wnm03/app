# S2029 — Legacy + Multi-Component + Reload Integrity Audit

## Tujuan

Memastikan context Service History tetap dapat direkonstruksi setelah reload dan pada kombinasi:

- history legacy;
- single-checklist;
- multi-component;
- session dengan beberapa row;
- vehicle scope berbeda;
- component focus yang hilang setelah reload.

## Kontrak

Context minimum yang dapat direkonstruksi:

`vehicleId + historyId + serviceComponentId`

`sessionId` dipertahankan sebagai parent context, tetapi bukan pengganti component identity.

## Keputusan aman

S2029 **tidak mem-persist component focus runtime** dan tidak mengubah schema. Focus S2019 memang runtime state. Setelah reload, context dapat direkonstruksi dari persisted history + component identity ketika data tersebut tersedia.

Jika legacy row tidak memiliki component identity, statusnya `WARNING`, bukan migrasi otomatis.

Jika history memiliki component identity tetapi target component tidak ditemukan, status `ERROR`.

## Read-only

Tidak:

- membuat history baru;
- menduplikasi history;
- mengubah `D.servisLogs`;
- mengubah reminder;
- mengubah finance;
- mengubah evidence;
- melakukan backfill legacy.

## Validasi

S2029 test memeriksa multi-component, session aggregation, legacy projection, wrong vehicle/history/component, missing focus setelah reload, unscoped legacy, wiring HTML, dan service-worker cache.
