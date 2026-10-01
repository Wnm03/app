# AUDIT S2191 — Restore Boundary Bill/Debt/Piutang

## Tujuan
Memastikan backup/restore tidak melakukan persistence terhadap state Bill/Debt/Piutang yang sudah diketahui tidak konsisten setelah seluruh migration/normalization selesai.

## Temuan
Restore sebelumnya sudah memiliki snapshot + rollback untuk `D` dan auxiliary IndexedDB, tetapi belum memiliki final integrity gate khusus Bill/Debt/Piutang sebelum `saveFlush(); init();`.

## Perbaikan
1. `BillDebtPiutangReconciler` sekarang menerima optional explicit state (`reconcile(state)`), sehingga dapat dipakai sebagai read-only validator terhadap candidate restore tanpa mengganti global `D`.
2. `applyRestoredData()` menjalankan reconciliation setelah `applyRestoredDataMigrations()`, service integrity, odometer validation, dan ownership validation.
3. Bila ditemukan orphan/duplicate/reciprocal mismatch, restore dilempar sebagai error dan outer rollback mengembalikan `D` serta auxiliary IndexedDB.
4. Restore yang valid tetap melewati jalur persistence normal.

## Invariants yang digate
- Bill ↔ Debt reciprocal link
- Debt autoTx ↔ transaction
- Piutang autoBill/autoTx/linkedTx
- Debt ↔ Asset/Investment
- duplicate IDs
- active Bill vs archived Bill collision

## Verification
- S2191 focused: 4/4 PASS
- S2188/S2189 + BUG-006/BUG-007: 18/18 PASS
- Backup/restore/migration regression: 44/44 PASS
- Build: PASS
- Bundle A/B syntax: PASS
- esbuild unavailable; generated bundles are valid but unminified.

## Scope guard
- UI: tidak berubah
- schema: tidak berubah
- legacy deletion: tidak dilakukan
- reconciler tetap read-only
- tidak ada auto-repair pada restore; state invalid ditolak lalu di-rollback

## Acceptance
S2191 diterima sebagai persistence/restore integrity checkpoint berdasarkan targeted regression. Full-suite tetap bukan acceptance gate bila environment timeout.
