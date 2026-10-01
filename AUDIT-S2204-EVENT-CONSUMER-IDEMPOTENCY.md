# AUDIT S2204 — Event Consumer Async Completion & Idempotency

## Scope
Audit seluruh consumer AIBus yang menerima event durable/outbox dan dapat melakukan pekerjaan async.

## Temuan
1. `AIService.wireEvents()` memanggil `AIDecision.decide()` yang async tetapi sebelumnya tidak mengembalikan Promise ke dispatcher. Durable replay dapat menganggap event sukses sebelum consumer selesai.
2. `VehicleSOTFleetIntegrity` juga memiliki consumer async `vehicle.updated` yang sebelumnya menelan rejection melalui `.catch(()=>{})`, sehingga dispatcher tidak dapat mengetahui kegagalan.
3. `AIDecision.decide()` belum menggunakan `eventId` durable sebagai idempotency key; replay dapat menggandakan decision log.

## Perbaikan
- Tambah `AIBus.emitAsync()` yang menunggu semua handler dan propagate rejection.
- `FinanceEventOutbox.replay()` memakai `emitAsync()` bila tersedia; fallback legacy `emit()` tetap dipertahankan.
- `AIService.wireEvents()` mengembalikan Promise `AIDecision.decide()` dan meneruskan `eventMeta`.
- `AIDecision` menyimpan `eventId` pada decision dan `processedEventIds` di AIStore; duplicate eventId tidak membuat decision baru.
- `VehicleSOTFleetIntegrity` mengembalikan Promise consumer tanpa menelan error.
- `AIBus.emit()` tetap backward-compatible dan sekarang mengobservasi rejection async agar tidak menjadi unhandled rejection.

## Semantics
Durable delivery tetap **at-least-once**. Idempotency dicapai pada consumer AI dengan `eventId`; tidak diklaim sebagai exactly-once global.

## Validation
- S2204 targeted: 4/4 PASS
- AIService historical wiring: 6/6 PASS
- Dana Titipan + AIService: 21/21 PASS
- Vehicle SOT fleet integrity: PASS
- S2200 outbox: 4/4 PASS
- S2202 ordering/recovery: 5/5 PASS
- S2203 eventId: 3/3 PASS
- Build: PASS, version 2199
- Bundle A/B syntax: PASS

## Known pre-existing warnings
- `modules/asset/aset-misc.js:476` empty catch warning.
- `docs/AUDIT_MATRIX.md` coverage counts stale.
- `modules/vehicle/servis.js` and `build.js` oversized warnings.
- `esbuild` unavailable; generated bundles are unminified and excluded from patch.
