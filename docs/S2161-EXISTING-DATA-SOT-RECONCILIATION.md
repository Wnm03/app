# S2161 — Existing Data SOT Reconciliation

## Tujuan

Memeriksa data service lama terhadap canonical Service Taxonomy tanpa membuat database/fact store baru.

Prinsip:

- `D.servisLogs` tetap satu-satunya owner service fact.
- `SERVICE_CHECKLIST_GROUPS` / `ServiceTaxonomySOT` tetap canonical identity.
- `vehicleId` wajib menunjuk kendaraan yang dikenal.
- Legacy `categoryId` hanya dipakai sebagai jembatan jika mapping-nya tunggal dan sudah membawa canonical `serviceComponentId`.
- Nama hanya boleh dipetakan jika menghasilkan satu canonical component yang deterministik.
- Jika component canonical sudah ada tetapi category salah, category diperbaiki mengikuti component canonical.
- Mapping ambigu tidak diubah.
- Field legacy tidak dihapus.

## Hasil audit snapshot 2026-09-25

Snapshot `backup-keluarga-W-2026-09-25(1).json` berisi 87 `servisLogs` dan 3 kendaraan.

- 56 clean.
- 10 safe-to-normalize.
- 21 unresolved karena tidak ada mapping canonical yang cukup kuat.
- 0 conflict setelah canonical-component mismatch diperlakukan sebagai deterministic repair.
- 0 unknown vehicle.
- 0 duplicate service-log ID.
- 58 embedded checklist rows: 58 clean, 0 unresolved, 0 conflict.

### Safe normalization

Safe rows hanya menambahkan/memperbaiki identity canonical tanpa menghapus data lama. Contoh: `Oli Mesin` dapat dipetakan deterministik ke `servis-mesin / oli-mesin`.

Satu record `Coolant` memiliki `serviceComponentId=coolant` tetapi `masterCategoryId=servis-mesin`. Karena canonical component menentukan `sistem-pendingin`, record tersebut masuk guarded repair.

### Unresolved

21 record tidak boleh ditebak. Contohnya nama legacy seperti `Servis Cvt`, `Tutup Pully`, `Pully`, beberapa item overhaul, dan item yang tidak punya identity canonical yang cukup kuat. Data tersebut tetap dipertahankan apa adanya sampai mapping bisnis dikonfirmasi.

## Runtime contract

`ServiceDataReconciliationS2161.audit(data)` hanya membaca.

`ServiceDataReconciliationS2161.applySafe(data, auditResult)` hanya menerapkan proposal berstatus `safe`. Ia tidak menghapus `categoryId`, tidak mengganti `serviceComponentId` yang sudah ada secara sembarang, dan mencatat perubahan sebagai `editHistory` dengan source `s2161-sot-reconciliation`.

## Release safety

S2161 tidak melakukan destructive migration otomatis dan tidak mengubah ownership SOT. Full regression tetap wajib dijalankan setelah patch diakumulasikan.
