# S2473 — AI Event Recovery / Durable Async Consumer Boundary

## Scope

Audit lintas-domain event `AIBus` untuk producer `finance.updated`, `vehicle.updated`, `service.updated`, `asset.updated`, `account.updated`, `product.updated`, `investment.updated`, `titipan.updated`, dan `delivery.created`.

Fokus: async consumer rejection, crash/retry window, stable event identity, replay ordering, dan race antara replay dengan enqueue baru.

## Finding

Sebelum S2473, `AIBus.emit()` sengaja fire-and-forget dan hanya mencatat rejection async ke console. Bila satu consumer AI gagal setelah producer sudah commit, event dapat hilang tanpa durable recovery. Existing Finance/Service outbox tidak mencakup seluruh producer yang memakai raw `AIBus.emit()`.

## Repair

- Tambah durable AI event recovery journal pada IndexedDB key `ai:event-outbox:v1`.
- Async/sync consumer failure pada `AIBus.emit()` masuk journal.
- Stable `eventId` dibuat untuk recovery event tanpa identity dari producer.
- Replay menunggu `AIBus.emitAsync()` dan hanya menghapus event setelah consumer berhasil.
- Failed head event dipertahankan untuk retry.
- Enqueue dan replay diserialisasi pada satu persistence chain agar replay tidak menimpa event baru yang masuk bersamaan.
- Replay dipanggil setelah seluruh `AIService` subscriptions terpasang; event tidak boleh di-clear saat belum ada consumer.

## Validation

- S2473 targeted: **4/4 PASS**.
- Existing cross-domain suites: **67/67 PASS** (S2287, S2288, S2289, S2290, S2294, S2295, S2296).
- Combined audited event boundary: **71/71 PASS**.
- System Integrity: **7/7 PASS**.
- App-wide: **9/9 PASS**.
- SOT Production Wiring: **PASS**.
- SOT Drift: **6/6 PASS**.
- Patch contamination: **PASS**.

## Scope verdict

**0 gap substantif teridentifikasi pada AI/cross-domain event recovery boundary setelah S2473.**

Global release closure tetap merupakan scope terpisah dan tidak dinyatakan PASS dari audit ini.
