# AUDIT S2201 — Atomic Data + Event Outbox Persistence

## Tujuan
Menutup gap S2200: snapshot `kw_v4_mirror` dan durable event outbox sebelumnya dipersist melalui operasi terpisah, sehingga crash window masih memungkinkan state dan journal event tidak konsisten.

## Perubahan
1. `IDBStore.setMany(entries)` ditambahkan untuk menulis beberapa key dalam satu IndexedDB `readwrite transaction`.
2. `FinanceEventOutbox` membedakan event atomic yang masih `staged` dari event legacy/standalone.
3. Atomic event tidak lagi langsung ditulis ke localStorage saat `FinanceCrossEntityAtomic.commit()`.
4. `save()`/`saveFlush()` menyiapkan snapshot data dan queue outbox lalu memakai `IDBStore.setMany()` untuk commit bersama:
   - `kw_v4_mirror`
   - `kw_finance_event_outbox_v1`
5. Staged event baru dianggap committed setelah `setMany()` sukses.
6. Bila batch IDB gagal dan masih ada staged event, fallback localStorage untuk mirror saja sengaja dilewati agar tidak menciptakan state durable tanpa event journal.
7. Queue legacy localStorage digabung ke durable IDB queue saat migrasi agar event lama tidak hilang.
8. Replay tetap kompatibel dengan harness/lingkungan tanpa IndexedDB.

## Validasi
- S2201 targeted: **4/4 PASS**.
- S2196: **4/4 PASS**.
- S2197: **23/23 PASS** (`tests/s521-titipan-expense-flow.test.js`).
- S2198: PASS.
- S2199: PASS.
- S2200: **4/4 PASS**.
- Checkpoint test files S2186–S2201: **15/15 test files PASS**.
- Syntax source S2201: PASS.
- Build: PASS, version **2196**.
- Bundle A/B: `node --check` PASS.
- esbuild tidak tersedia; bundle lokal tidak diminify dan generated artifacts tidak dimasukkan patch.

## Warning yang tersisa
Build hanya melaporkan satu empty catch pre-existing:
`modules/asset/aset-misc.js:476`.
Tidak disentuh karena berada di luar scope S2201.

## Batasan
S2201 membuktikan atomicity pada persistence utama IndexedDB melalui satu transaction. Browser-level crash injection terhadap mesin browser/IndexedDB nyata belum dapat dibuktikan sepenuhnya oleh unit test Node; validasi produksi tetap diperlukan.

## Exit assessment
Gap S2200 **data snapshot vs durable outbox** ditutup pada jalur persistence IndexedDB utama. Audit berikutnya sebaiknya fokus pada ordering/recovery setelah commit, duplicate delivery, dan cross-feature consumer reconciliation.
