# PATCH CATEGORY-SOT-15 — SERVICE INPUT CATEGORY/COMPONENT DROPDOWNS

## Tujuan
Menambahkan satu UI SoT untuk **Kategori Servis** dan **Komponen Servis** pada:
1. Form Transaksi Keuangan saat kategori transaksi cocok dengan aturan kendaraan + subkategori servis (`Servis & Oli`/service).
2. Modal Car Notes `Catat Servis/Sparepart`.

## SoT
Sumber pilihan UI adalah `SERVICE_CHECKLIST_GROUPS` (13 grup / 30 komponen) melalui `ServiceInputCatalog`.
Tidak dibuat taxonomy/kategori interval baru.

## Perilaku Transaksi Keuangan
- Panel servis tetap otomatis aktif untuk transaksi yang memenuhi `_isFinanceServiceTransaction()`.
- Dropdown Kategori Servis menampilkan master category checklist.
- Dropdown Komponen Servis mengikuti kategori yang dipilih.
- Pemilihan komponen otomatis mengisi `Jenis Servis/Item`.
- Input teks item dapat menginfer kategori/komponen dari checklist/rule keyword.
- Data master/component disimpan ke `D.servisLogs` (`masterCategoryId`, `serviceComponentId`).
- `categoryId` tetap hanya diisi bila ada kategori sparepart konkret yang valid untuk kendaraan.
- Tidak membuat kategori sparepart palsu.

## Perilaku Car Notes
- Modal servis sekarang memiliki dropdown Kategori Servis + Komponen Servis.
- Edit memulihkan pilihan yang tersimpan.
- Pemilihan komponen mengisi `Jenis Servis/Item` dan menjalankan autofill interval/linkage yang sudah ada.
- Data tetap tersimpan pada service event/`D.servisLogs` sebagai satu SoT.

## File tambahan/perubahan
- `modules/vehicle/service-input-catalog.js`
- `modules/finance/tx-servis.js`
- `modules/finance/transaksi.js`
- `modules/shared/modals.js`
- `car-notes.js`
- `scripts/build.js`
- `tests/service-input-catalog-s15.test.js`

## Validasi
- Service Input Catalog: **5/5 PASS**
- Finance Service Auto SoT S12: **8/8 PASS**
- Service Event Lifecycle S13: **7/7 PASS**
- Checklist Category Linkage S14: **4/4 PASS**
- Syntax check seluruh file terkait: **PASS**

## Batasan
Full regression belum dinyatakan PASS karena baseline `app-main (81)` sebelumnya masih memiliki failure/timeout yang bukan berasal dari S15.
