# Patch S2036 — Service Checklist Edit → History + Reminder Reconciliation (Cumulative S2035)

Base: `app-main (26)`

## Root cause

Saat sebuah riwayat servis yang sudah memiliki `sessionId` diedit, `Servis._saveInner()` sebelumnya hanya memperbarui parent row `D.servisLogs` dan mengganti `checklist` pada row tersebut. History utama mengelompokkan sesi dari **row-row `D.servisLogs`**, sedangkan reminder membaca projection kategori/komponen. Komponen baru yang dicentang karena itu dapat tersimpan di snapshot parent tetapi tidak menjadi row session/reminder projection baru.

## S2036 fix

- Menambahkan `modules/vehicle/service-history-checklist-edit-s2036.js` sebagai adapter khusus untuk reconciliation edit checklist.
- Setiap komponen checklist terpilih dipastikan memiliki row dalam session yang sama.
- Komponen baru mendapatkan row `D.servisLogs` baru dengan `sessionId/serviceJobId` yang sama, tanpa transaksi Finance Rp0 baru.
- Parent row tetap menyimpan **snapshot checklist lengkap** untuk backward compatibility.
- Komponen baru diproyeksikan ke `D.sparepartCats` sebagai compatibility index dengan `serviceComponentId` canonical dan interval dari `ServiceInputCatalog`.
- `intervalKmAtService`, `intervalBulanAtService`, `nextDueKm`, `nextDueDate`, dan `nextDueAxis` dihitung ulang per komponen memakai reminder SOT yang sama.
- Vehicle KM override tetap dihormati; override komponen dari checklist tetap menjadi sumber override tertinggi.
- Row secondary lama yang sudah dihapus dari checklist dibersihkan hanya bila zero-cost dan tidak memiliki transaction link; row ber-finance tidak dihapus otomatis.
- Lifecycle `ServiceEventLifecycle.create()` dipanggil untuk row komponen baru setelah commit.
- `scripts/build.js` memuat adapter S2036 tepat setelah `servis.js`, sehingga production bundle akan memasukkan fix setelah rebuild.

## S2035 carried forward

Patch ini juga mempertahankan seluruh file dari `patch-s2035-service-sot-backup-audit-cumulative.zip`:

- `modules/vehicle/sparepart-servis.js`
- `modules/vehicle/sparepart-servis-ui.js`
- `scripts/s2034-category-component-history-audit.js`
- `tests/collect-known-groups-database-api-wiring-v1645.test.js`
- `tests/database-api-master-generic-wiring-followup.test.js`
- `tests/sparepart-group-manual-override-ui.test.js`

## S2036 changed files

- `modules/vehicle/servis.js`
- `modules/vehicle/service-history-checklist-edit-s2036.js`
- `scripts/build.js`
- `tests/servis-checklist-edit-session-reminder-s2036.test.js`

## Verification

Targeted regression/SOT/build-order suite: **31/31 PASS**.

Covered:
- checklist edit/save contract
- session multi-component projection
- component-scoped reminder
- reminder/history roundtrip
- history/reminder/audit roundtrip
- legacy multi-component reload
- final service-history E2E contract
- category/component/interval SOT S2031
- backup/category/history audit S2034
- build group integrity and dependency order
- new S2036 regression tests

Source-size guard: `modules/vehicle/servis.js` remains below its configured guard cap (warning-only due the existing 1600-line threshold). `scripts/build.js` remains under its configured guard cap. The carried S2035 `sparepart-servis.js` source is the reduced split version from S2035.

A complete full application suite was **not** claimed in this patch; the verified result above is the targeted regression suite.

## Packaging

PATCH-ONLY overlay. No production bundle is included. After applying the cumulative patch to `app-main (26)`, run the normal build so `app-bundle-a.min.js` / `app-bundle-b.min.js` are regenerated with S2036.
