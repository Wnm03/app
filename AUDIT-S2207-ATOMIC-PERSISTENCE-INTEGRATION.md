# A-S2207 — Atomic persistence integration audit

## Temuan
Bill Payment dan Titipan Expense memiliki urutan `save()` sebelum `FinanceCrossEntityAtomic.commit()`. Karena commit hanya men-stage outbox dan persistence membaca staged outbox, event dapat tertinggal dari snapshot data pada siklus save tersebut.

## Perbaikan
Kedua jalur diubah menjadi:

1. mutation canonical;
2. `FinanceCrossEntityAtomic.commit()` untuk stage event;
3. `save()` untuk persist mirror + outbox dalam satu IndexedDB transaction.

Jika commit gagal (mis. outbox capacity), save tidak dijalankan dan atomic boundary melakukan rollback. Jika persistence gagal setelah commit, staged outbox tetap pending untuk retry.

## Scope
Tidak ada perubahan UI atau schema. Tidak mengubah semantics event menjadi exactly-once.
