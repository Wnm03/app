# AUDIT-S2464 — Finance Import Atomicity

## Scope
Audit boundary import transaksi Finance yang diimplementasikan di `modules/shared/backup-restore.js`.

## Findings repaired
1. Transaction import sebelumnya menulis langsung ke `D.transactions`, melewati FinanceTxSOT.
2. Import tidak melakukan stale-state preflight di entrypoint sebelum mutasi.
3. Kegagalan `save()` tidak memiliki rollback eksplisit atas batch transaksi yang baru ditambahkan.
4. Deduplikasi hanya mengandalkan `importIdempotencyKey`, sehingga legacy transaction tanpa key dapat mengalami collision pada `id`.

## Repair
- Deduplikasi kini mencakup transaction ID existing dan intra-batch.
- Append transaksi melalui `FinanceTxSOT.createMany()`.
- Stale cross-tab state diblok sebelum mutasi.
- Snapshot transaksi dipulihkan bila `save()` menolak atau throw.

## Verdict
Pada scope import transaksi Finance, boundary mutasi dan persistence diperketat; tidak ada gap substantif tambahan yang teridentifikasi setelah gate S2464.
