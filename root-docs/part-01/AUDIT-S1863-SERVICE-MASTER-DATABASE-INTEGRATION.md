# S1863 — Integrasi Master Database Kategori/Komponen Servis

Tanggal: 2026-09-20

## Source of truth

- Canonical master input: `data/database-kategori-komponen-servis.json`
- Source provenance di JSON: `modules/vehicle/servis-checklist.js`
- Master: **13 kategori / 50 komponen**.
- Stable identity: `masterCategoryId` + `componentId`.
- SHA-256 master JSON: `86c8aad0afd273acf6611bf22fe64877ace163c0e53a3f338df163e3da20a486`.

## Existing architecture found

Aplikasi sudah memiliki `IDBStore` dengan database `kw_idb_v1` dan satu object store `kv`. Beberapa domain existing (`VehicleCatalog`, `DatabaseAPI.vehicle`, AI store, dll.) menyimpan aggregate data melalui key-value store ini.

Karena itu S1863 **tidak membuat database/wrapper IndexedDB kedua** dan **tidak membuat object store baru**. Master service disimpan sebagai aggregate value pada key:

```text
service-master:store
```

Maintenance history tetap menggunakan SoT existing `D.servisLogs`; tidak dibuat history store paralel.

## Implementasi

### 1. Canonical JSON

`data/database-kategori-komponen-servis.json` menjadi sumber master yang dapat diregenerasi tanpa mengedit source checklist secara manual.

### 2. Generated runtime artifact

`scripts/generate-service-master-data.js` memvalidasi count + duplicate `componentId`, menghitung SHA-256, lalu menghasilkan:

`modules/vehicle/service-master-data.generated.js`

File generated ini menyediakan runtime projection `SERVICE_CHECKLIST_GROUPS` sehingga consumer lama tetap sinkron tanpa mempertahankan daftar master kedua yang diedit manual.

### 3. IndexedDB master database

`modules/vehicle/service-master-database.js` menyediakan:

- `ensureLoaded()`
- `getAllComponents()`
- `getComponent()`
- `getComponentsByCategory()`
- `getAllCategories()`
- `getMasterVersion()`
- `importMasterData()`

Import bersifat idempotent dan melakukan `INSERT / UPDATE / UNCHANGED`. Master yang hilang dari versi baru tidak dihapus; record lama diberi `deprecated:true` + `deprecatedAt`.

Metadata menyimpan:

- `schemaVersion`
- `dataVersion`
- `importedAt`
- `checksum`
- `componentCount`
- `categoryCount`
- `source`

### 4. Checklist

`modules/vehicle/servis-checklist.js` tidak lagi menyimpan literal 13 kategori/50 komponen secara manual. Ia mengambil projection dari generated canonical master.

Kontrak lama tetap dipertahankan: 13 grup, 50 item, 44 `linkCat:true`, stable IDs, action/reset metadata.

### 5. Maintenance engine

`modules/vehicle/service-maintenance-engine.js` adalah engine read-only baru untuk komponen canonical:

- `km`
- `time`
- `both` = OR semantics
- `DUE`
- `OVERDUE`
- `NOT_DUE`
- `NO_HISTORY`
- `INSUFFICIENT_DATA`

Perhitungan bulan menggunakan calendar-month semantics dengan clamp akhir bulan; bukan `N * 30 hari`.

Odometer regression menghasilkan `INSUFFICIENT_DATA`.

### 6. Maintenance repository

`modules/vehicle/service-maintenance-repository.js` menjadi adapter CRUD terhadap `D.servisLogs`, sehingga tidak menciptakan storage history kedua.

## Migration

Tidak ada `deleteDatabase()` dan tidak ada perubahan IndexedDB database version pada S1863. Ini sengaja dipilih karena arsitektur existing memakai `kw_idb_v1/kv` sebagai persistence layer aggregate.

First install / upgrade master hanya menulis key `service-master:store` melalui `IDBStore.set()`.

Histori `D.servisLogs` tidak disentuh saat master berubah.

## Test evidence

Targeted S1863 + regression checklist:

- Service master/database/health: **8/8 PASS**
- Checklist/golden/state regression: **40/40 PASS**

Full `npm test` dimulai tetapi belum memperoleh terminal summary dalam batas waktu environment ini; proses melewati test **3499** tanpa failure yang terlihat sampai timeout. Karena itu S1863 **tidak mengklaim full suite green** dari environment ini.

## Build

Build target:

```text
s1863-service-master-db-1863
```

Build checks yang selesai:

- source lint: PASS
- source line-size gate: PASS
- bundle syntax: PASS
- index/app_production HTML version sync: PASS
- SW cache version: `kw-cache-v1863`

Catatan environment: `esbuild` tidak tersedia, sehingga bundle yang dihasilkan valid tetapi **belum diminify**. Jangan menganggap ukuran bundle ini sebagai ukuran production final; jalankan build ulang pada environment release yang memiliki `esbuild`.
