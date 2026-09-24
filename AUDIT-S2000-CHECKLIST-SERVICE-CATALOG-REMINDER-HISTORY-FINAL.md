# AUDIT S2000 — Checklist Servis → Katalog Part → Reminder → Riwayat Per Komponen

## Status

**IMPLEMENTED + FINAL AUDIT PASS**

Build final: **1997**

Scope: akumulasi audit checklist servis sebelumnya + integrasi katalog part + reminder per komponen + riwayat per pengerjaan.

## 1. Hasil implementasi

### Canonical identity

Setiap checklist row sekarang membawa:

- `serviceComponentId`
- `checklistItemId`
- `masterCategoryId`
- `source: "CHECKLIST"`

`serviceComponentId` tetap berasal dari canonical checklist/master, bukan nama bebas.

### Interval reminder

Checklist row mengambil interval dari Service Master terlebih dahulu:

- `intervalKmAtService`
- `intervalBulanAtService`
- `reminderIntervalSource: "service-master"`

Fallback kategori lama tetap dipertahankan untuk backward compatibility.

### Katalog part

Setiap checklist component mempunyai state `catalogPartRefs[]` sendiri.

Bentuk:

```js
[{ catalogId, qty }]
```

Part dipilih melalui compatibility berbasis ID menggunakan `ServicePartCompatibilitySOT`.
Tidak ada fuzzy matching dan tidak ada pembuatan kategori/part otomatis.

Part katalog tetap opsional. Komponen tanpa part tetap valid.

### History

Satu checklist multi-komponen tetap menggunakan satu `sessionId` / `serviceJobId`, tetapi menghasilkan satu history row per component.

Setiap row menyimpan:

- `serviceComponentId`
- `checklistItemId`
- `catalogPartRefs`
- `serviceComponentNameSnapshot`
- interval snapshot
- `nextDue*`
- source checklist

Field katalog legacy `catalogPartId/catalogPartQty` tetap dipertahankan pada row pertama untuk backward compatibility.

### History filter

Tab Riwayat editor sekarang memiliki filter:

1. **Pengerjaan** — berdasarkan `sessionId/serviceJobId`.
2. **Komponen** — berdasarkan `serviceComponentId/checklistItemId`.

Dengan demikian satu pengerjaan multi-komponen dapat dilihat bersama atau dipersempit ke satu component.

## 2. Backward compatibility

Dipertahankan:

- `D.servisLogs` sebagai SoT history.
- `ServiceMaintenanceEngine` sebagai engine reminder.
- `ServiceReminderPackageSOT` sebagai package/planning layer.
- `ServiceSessionSOT` sebagai grouping layer.
- `VehicleCatalogServisLink` sebagai link katalog existing.
- field legacy `catalogPartId/catalogPartQty`.
- history lama tanpa `catalogPartRefs`.
- history lama tanpa canonical component.
- checklist lama.

Tidak dibuat store history baru.

## 3. Regression yang diperiksa

### Focused S2000

**5/5 PASS**

Mencakup:

- canonical component ID
- interval master
- catalog refs per component
- reload checklist
- component tanpa part
- sessionId
- history filter

### Existing service/catalog regression

Focused service/catalog suite:

**PASS** setelah kompatibilitas legacy diperbaiki.

### Full regression

Final aggregate:

**7.590 / 7.590 PASS**

- FAIL: 0
- CANCELLED: 0
- SKIPPED: 0
- TODO: 0

32 shard tervalidasi oleh `run-full-test.js`.

### Service SoT gate

**PASS**

Gate memverifikasi:

- category → master category canonical
- checklist 102/102 mapping
- action/condition/history contract
- interval SoT
- single-fact service event
- history/reminder memakai service-log fact yang sama
- vehicle isolation
- full regression

### Build/bundle

- `app-bundle-a.min.js`: fresh
- `app-bundle-b.min.js`: fresh
- kedua bundle lolos `node --check`
- `verify-window-expose`: PASS
- `verify-bundle`: PASS
- source-size strict: PASS terhadap guard cap 1.800 baris

`servis.js` saat ini sekitar 1.795 baris. Build memberi warning oversized terhadap target 1.600, tetapi masih di bawah guard cap 1.800 yang sudah berlaku.

## 4. Catatan build

Environment ini tidak memiliki `esbuild`, sehingga build menghasilkan bundle valid tetapi **belum diminify**.

Ini bukan kegagalan fungsional, tetapi ukuran bundle lebih besar daripada build production yang benar-benar diminify.

Jika pipeline deployment production mensyaratkan minify, install dependency `esbuild` dan rebuild sebelum release production.

## 5. File logic utama yang berubah

- `modules/vehicle/servis-checklist.js`
- `modules/vehicle/servis.js`
- `tests/service-checklist-component-catalog-session-s2000.test.js`

## 6. File build/deployment yang berubah

Build 1997 juga menyegarkan:

- `app-bundle-a.min.js`
- `app-bundle-b.min.js`
- `index.html`
- `app_production.html`
- `sw.js`
- version-synchronized shared source files
- `docs/FILE-MAP.md`
- `docs/COVERAGE-PER-MODULE.md`

Perubahan shared source/version tersebut adalah efek sinkronisasi build, bukan logic baru S2000.

## 7. Acceptance checklist

- [x] checklist multi-komponen
- [x] canonical serviceComponentId
- [x] checklistItemId stabil
- [x] interval dari Service Master
- [x] part katalog per component
- [x] compatibility ID-only
- [x] part opsional
- [x] history per component
- [x] satu session untuk satu pengerjaan
- [x] filter per pengerjaan
- [x] filter per component
- [x] reload preservation
- [x] legacy catalog fields tetap ada
- [x] legacy history tetap valid
- [x] tidak membuat history store baru
- [x] tidak membuat reminder store kedua
- [x] full regression 7.590/7.590
- [x] Service SoT gate PASS
- [x] bundle freshness PASS
- [x] window-expose PASS

## 8. Kesimpulan

Desain yang sebelumnya dikunci sekarang telah terimplementasi dalam satu paket perubahan.

Rantai canonical final:

```text
ServiceMaster
   ↓
serviceComponentId
   ↓
Checklist Row
   ↓
CatalogPartRefs
   ↓
History Row
   ↓
sessionId / serviceJobId
   ↓
ServiceMaintenanceEngine
   ↓
Reminder
```

Satu pengerjaan dapat memiliki banyak component tanpa kehilangan identitas component, part, interval, maupun riwayat.
