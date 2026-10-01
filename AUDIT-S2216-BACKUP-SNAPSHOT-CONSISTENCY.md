# A-S2216 — Backup Snapshot Consistency

## Temuan
`buildBackupPayload()` sebelumnya mengambil `D` di memory lalu membaca `lifeos:store`, `eie:store`, `vehicle-catalog:store`, dan `honda-pdf-import:store` secara berurutan dengan `IDBStore.get()`. Karena setiap read adalah asynchronous dan terpisah, mutation/persistence yang terjadi di antaranya dapat membuat backup berisi campuran generasi state.

## Perbaikan
- Snapshot `D` dibuat sinkron sebelum asynchronous read.
- Seluruh auxiliary IndexedDB stores dibaca melalui satu `IDBStore.getMany()` readonly transaction.
- Writer guard dibaca sebagai bagian dari transaction snapshot dan diverifikasi ulang setelah read.
- `_saveStateVersion` diperiksa; bila state berubah selama snapshot, backup diulang maksimal 3 kali.
- Kegagalan pembacaan auxiliary store tidak lagi dilewati diam-diam; backup fail-closed setelah retry habis.

## Invariant
Backup hanya diterima bila:
1. snapshot state tidak berubah selama pembacaan;
2. seluruh auxiliary stores terbaca dalam satu readonly transaction;
3. writer guard tidak berubah selama verifikasi;
4. tidak ada auxiliary store yang silently omitted karena read error.

## Validasi
- S2216: 4/4 PASS
- Backup/restore regression: 25/25 PASS
- S2210–S2216 focused chain: 12/12 test files PASS
- Syntax `backup-restore.js`: PASS

## Catatan
Tidak ada generated bundle/build artifact di patch. Build release penuh tetap mengikuti preflight/version gate yang sudah ada pada baseline.
