# AUDIT S2197 — Titipan Expense Cross-Entity Atomicity

## Scope
Audit mutation lintas canonical collection pada `TitipanExpenseFlow.submit()`.
Tidak ada perubahan UI atau schema.

## Finding
Sebelum S2197, `submit()` melakukan:
1. push seluruh transaksi ke `D.transactions`;
2. menjalankan `applyTxTitipanLinkageOnSave()` yang dapat membuat/menghapus canonical `D.piutang` / `D.debts`;
3. `save()`.

Jika langkah 2 atau 3 melempar exception, transaksi dapat tertinggal sementara linkage belum selesai atau persistence gagal. Ini adalah partial-commit lintas entity.

## Repair
`TitipanExpenseFlow.submit()` sekarang membuka `FinanceCrossEntityAtomic` untuk:
- `transactions`
- `debts`
- `piutang`

Rollback terjadi bila linkage atau `save()` gagal. Commit dilakukan setelah `save()` sukses. Event `titipan.updated` berada setelah commit sehingga kegagalan event tidak membatalkan state yang sudah dipersist.

## Invariants
- Tidak ada transaksi yatim akibat kegagalan linkage.
- Tidak ada Piutang/Utang otomatis parsial akibat kegagalan persistence.
- Retry setelah rollback dapat berhasil tepat satu kali.
- UI/schema/legacy path tidak dihapus.

## Tests
Targeted + cumulative checkpoint suite: **68/68 PASS**.

Mencakup S2181, S2183–S2197 serta regression `s521-titipan-expense-flow`.

Additional S2197 cases:
- linkage failure -> full rollback
- save failure after linkage -> full rollback
- retry after rollback -> exactly one successful transaction/linkage

## Build
- `node --check modules/finance/titipan-expense-flow.js`: PASS
- `node scripts/build.js`: PASS
- bundle A/B syntax: PASS
- esbuild tidak tersedia; bundle lokal tidak diminify
- generated build artifacts tidak dimasukkan ke patch

## Patch contents
- `modules/finance/titipan-expense-flow.js`
- `tests/s521-titipan-expense-flow.test.js`
- `AUDIT-S2197-TITIPAN-EXPENSE-ATOMICITY.md`
