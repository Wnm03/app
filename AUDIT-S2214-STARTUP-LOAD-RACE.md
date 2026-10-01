# A-S2214 — Startup / Restore Multi-Context Race Audit

## Scope
Audit startup/load pada local-first persistence ketika context/tab sedang membaca `kw_v4_mirror` sementara context lain dapat memenangkan CAS persistence.

## Finding
Tanpa guard tambahan, startup dapat membaca snapshot yang konsisten tetapi sudah stale terhadap writer yang baru saja commit. CAS memang mencegah stale context menulis balik, tetapi startup masih dapat menampilkan state lama dan membawa token yang tidak selaras.

## Repair
1. `IDBStore.getMany()` membaca `kw_v4_mirror` dan `kw_v4_writer_guard_v1` dalam satu readonly IndexedDB transaction.
2. `load()` mengambil writer token bersama snapshot pada pembacaan awal.
3. Tepat sebelum `D={...D,...p}`, `load()` melakukan re-read pasangan snapshot + writer token.
4. Token context diselaraskan dengan token terbaru sehingga persistence berikutnya tetap tunduk pada CAS.
5. Existing stale-state/CAS guard tetap menjadi boundary terakhir: context yang kalah tidak boleh fallback atau overwrite state pemenang.

## Invariant
- Snapshot dan writer token yang dibaca startup berasal dari transaction readonly yang sama.
- Context stale tidak boleh memenangkan persistence setelah context lain commit.
- Startup re-read tidak menghapus existing localStorage-vs-IDB recovery selection; existing recovery guard tetap berjalan sesudahnya.
- Outbox CAS/replay protection S2213 tetap aktif.

## Validation
- S2214: 4/4 PASS
- S2213: 5/5 PASS
- S2211: 4/4 PASS
- S2210: 3/3 PASS
- S2209: 3/3 PASS
- S2208: 4/4 PASS
- S2200–S2207: PASS
- Combined S2200–S2214 targeted test files: 22/22 PASS
- Syntax: PASS

## Build note
`npm run build` berhenti pada pre-build version preflight sebelum bundle write:
`modules/shared/modules-calc.js` masih `s2041-1-part-sot-hardening-2202`, sedangkan canonical old version adalah `s2041-1-part-sot-hardening-2204`.
Generated artifacts are excluded from this checkpoint patch.
