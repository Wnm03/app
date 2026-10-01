# A-S2200 — Durable Event Outbox / Crash-Recovery Boundary

## Scope
Audit event lintas domain setelah A-S2199. Target: event yang sudah mencapai commit boundary tidak hilang hanya karena reload/crash atau listener gagal.

## Finding
S2199 hanya memiliki queue in-memory. Event yang belum selesai delivery hilang ketika context browser mati.

## Repair
- Added `modules/finance/finance-event-outbox.js`.
- Event deferred dari `FinanceCrossEntityAtomic` dipersist ke `localStorage` sebelum delivery.
- Outbox dibatasi 100 event kecil untuk mencegah pertumbuhan tak terkendali.
- Replay berjalan setelah startup ketika `AIBus` tersedia.
- Event yang berhasil dikirim dihapus dari outbox; event yang gagal tetap dipertahankan untuk retry.
- `FinanceCrossEntityAtomic` menggunakan outbox untuk deferred event.
- Tidak ada perubahan schema `D` dan tidak ada perubahan UI.

## Important boundary
Outbox ini membuat delivery event durable, tetapi belum merupakan satu IndexedDB transaction atomik yang menggabungkan `kw_v4_mirror` dengan outbox. Karena itu S2200 tidak mengklaim atomicity penuh antara persistence data dan event journal pada setiap crash window. Event delivery recovery sudah durable; data+event single-transaction durability tetap kandidat lanjutan bila diperlukan.

## Validation
- S2200 targeted: 4/4 PASS.
- Tested reload persistence of queued event.
- Tested successful replay removes event.
- Tested failed delivery remains durable.
- Tested atomic commit persists deferred event before delivery.
- `node --check` source: PASS.
- `node scripts/build.js`: PASS; generated version 2193; bundle A/B syntax PASS.
- `esbuild` unavailable, so generated bundle is unminified and excluded from patch.
