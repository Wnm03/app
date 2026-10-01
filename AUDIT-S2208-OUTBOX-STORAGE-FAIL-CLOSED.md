# AUDIT S2208 — Outbox Storage Failure / Crash Window

## Scope
Audit durable Finance Event Outbox terhadap kegagalan pembacaan IndexedDB pada boundary persistence/replay.

## Finding
`FinanceEventOutbox.loadDurable()` sebelumnya memperlakukan exception `IDBStore.get()` sebagai queue kosong. Kondisi tersebut berisiko membuat persistence berikutnya menulis queue yang tidak lengkap dan menyamarkan journal durable yang sebenarnya masih ada.

## Repair
- durable journal read failure sekarang fail-closed dan menghasilkan rejection.
- `prepareAtomicPersistence()` tidak dapat menganggap journal kosong ketika read gagal.
- staged atomic event tetap pending ketika journal tidak dapat dibaca.
- tidak ada write pengganti journal yang dilakukan oleh jalur S2208 saat read gagal.

## Validation
- S2208 targeted: 4/4 PASS
- S2200: 4/4 PASS
- S2201: 4/4 PASS
- S2202: 5/5 PASS
- S2203: 3/3 PASS
- S2204: 4/4 PASS
- S2205 lifecycle: 5/5 PASS
- S2205 atomic capacity: PASS
- Build: PASS, version 2204
- Bundle A/B syntax: PASS

## Limitations
Build environment tidak memiliki esbuild; bundle lokal tidak diminify dan tidak dimasukkan patch. Warning pre-existing: empty catch `modules/asset/aset-misc.js:476`, coverage matrix stale, dan file besar `servis.js`/`build.js`.
