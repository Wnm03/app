# A-S2211 — Crash-window integrity audit

## Scope

Audit end-to-end terhadap durable Finance Event Outbox pada batas:

1. `stageBatch()` → `prepareAtomicPersistence()` → `IDBStore.setMany()`.
2. crash setelah `setMany()` commit tetapi sebelum `markAtomicPersisted()`.
3. crash setelah `markAtomicPersisted()` tetapi sebelum replay.
4. consumer berhasil tetapi process crash sebelum journal clear.
5. event baru masuk saat persistence boundary sedang berlangsung.

## Result

**Tidak ditemukan gap runtime baru pada S2211.**

Semua window mempertahankan event durable atau staged sehingga event tidak hilang. Crash setelah `setMany()` aman karena journal sudah berada di IndexedDB; crash sebelum mark hanya meninggalkan state in-memory yang hilang, tetapi salinan durable tetap tersedia. Crash setelah mark sebelum replay juga aman karena event masih ada di durable journal. Crash setelah consumer sukses sebelum clear mempertahankan semantics **at-least-once**; `eventId`/consumer idempotency menjadi proteksi terhadap delivery ulang.

Event baru yang masuk selama persistence tidak tertimpa karena `markAtomicPersisted()` hanya menghapus sejumlah staged item yang termasuk batch persistence tersebut, sementara S2210 sudah melindungi replay dengan ownership berdasarkan stable event ID.

## Validation

- `tests/s2211-crash-window-integrity.test.js`: **4/4 PASS**
- S2208: **4/4 PASS**
- S2209: **3/3 PASS**
- S2210: **3/3 PASS**
- S2205 lifecycle: **5/5 PASS**
- S2205 capacity rollback: **PASS**

## Decision

No production source change is justified for S2211. This checkpoint adds regression coverage only.
