# A-S2215 — Restore/Import Multi-Context CAS Atomicity

## Temuan
Restore sebelumnya mempersist `kw_v4_mirror` melalui persistence path yang sudah CAS-aware, tetapi auxiliary IndexedDB stores (`lifeos:store`, `eie:store`, `vehicle-catalog:store`, `honda-pdf-import:store`) ditulis sesudahnya melalui `IDBStore.set()` terpisah.

Jika context lain memenangkan writer-token CAS di antara dua tahap, state utama dan auxiliary store dapat berasal dari restore yang berbeda.

## Perbaikan
- Restore sekarang membentuk satu persistence boundary untuk `kw_v4_mirror` + auxiliary stores + durable FinanceEventOutbox.
- Boundary memakai `IDBStore.setManyIfCurrent()` dengan writer token yang sama.
- Persistence lock outbox tetap dipakai agar staged outbox ikut konsisten.
- Jika CAS kalah, restore dibatalkan sebagai `CROSS_TAB_RESTORE_CONFLICT` dan context memuat state durable terbaru; snapshot restore lama tidak ditulis balik.
- Rollback biasa tetap mempertahankan invalidasi snapshot persistence.
- Fallback test harness tanpa helper production tetap tersedia; production build memakai helper atomic.

## Validasi
- Restore regression: 23/23 subtests PASS.
- SA-L restore snapshot invalidation: 2/2 PASS.
- S2215 CAS/auxiliary invariants: 4/4 PASS.
- S2200–S2214 persistence/outbox regression: 22/22 test files PASS.
- Syntax production files: PASS.
- Build preflight: BLOCKED by pre-existing version mismatch: `modules/shared/modules-calc.js` is `s2041-1-part-sot-hardening-2202` while canonical old version is `s2041-1-part-sot-hardening-2204`. Build aborts before bundle write.

## Scope
No UI/schema change. No generated bundle/service-worker/version artifacts are included in the S2215 patch.
