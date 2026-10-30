# PATCH CATEGORY-SOT-16 — Checklist Komponen Berdasarkan Kategori Servis

## Tujuan
Memperjelas semantics UI: **Kategori Servis bukan berarti semua komponen dalam kategori otomatis diservis.**
Kategori hanya menjadi filter/pengarah daftar checklist. User wajib mencentang komponen yang benar-benar dikerjakan.

## Perubahan
- `modules/vehicle/servis-checklist.js`
  - Tambah `findGroupByMasterCategoryId(masterCategoryId)`.
  - Tambah `itemsForMasterCategory(masterCategoryId)`.
  - Tetap menggunakan `SERVICE_CHECKLIST_GROUPS` sebagai SoT 13 kategori / 30 komponen.
- `car-notes.js`
  - Setelah kategori servis dipilih, checklist otomatis berpindah ke kategori tersebut.
  - UI tidak lagi menampilkan pilihan kategori sebagai seolah-olah kategori adalah unit servis.
  - Yang ditampilkan adalah **komponen dalam kategori**, dan hanya komponen yang dicentang yang disimpan.
  - Item input menjadi fallback hanya untuk data lama / kategori belum dipilih.
- `modules/finance/tx-servis.js`
  - Panel checklist komponen ditampilkan setelah kategori servis dipilih.
  - User mencentang komponen yang benar-benar dikerjakan.
  - Checklist disimpan ke `D.servisLogs` bersama Service Event yang dibuat dari transaksi Finance.

## Contoh perilaku
Pilih `Servis CVT` -> tampil:
- V-Belt CVT
- Roller CVT
- Kampas Kopling Ganda
- Per CVT
- Pembersihan Rumah CVT

Jika hanya V-Belt dan Roller yang dikerjakan, hanya dua item tersebut yang dicentang dan masuk ke checklist Service Event. Memilih `Servis CVT` **tidak** otomatis mencentang lima komponen.

## SoT
`SERVICE_CHECKLIST_GROUPS -> masterCategoryId -> komponen checklist -> D.servisLogs[].checklist`

AI/Insight/Reminder tidak menjadi sumber kebenaran baru.

## Validasi
- S16 tests: PASS
- S12/S13/S14/S15 relevant tests: PASS
- Syntax `car-notes.js`: PASS
- Syntax `modules/vehicle/servis-checklist.js`: PASS
- Syntax `modules/finance/tx-servis.js`: PASS
- Full regression belum dijalankan pada patch tree parsial; jangan klaim full regression PASS dari patch ini.
