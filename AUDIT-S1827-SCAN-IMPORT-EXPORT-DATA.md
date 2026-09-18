# AUDIT S1827 — Scan / Import / Export Data Integrity

## Scope
Audit static + regression pada jalur:
- Universal Scan OCR -> akun
- Scan OCR tagihan -> bills
- Sparepart OCR -> Vehicle Catalog
- PDF/Web catalog import -> VehicleCatalog
- CSV/JSON finance import
- Car Notes CSV import
- Shop CSV/JSON import/export
- Full backup/custom backup/restore

## Result
### PASS — jalur yang sudah punya guard
1. UniversalScan memakai preview + validation sebelum item dicentang/import; target akun eksplisit sehingga hasil OCR nama pemilik tidak otomatis membuat akun baru.
2. Sparepart OCR tidak menulis langsung ke katalog; alur tambah dari OCR meminta konfirmasi dan reuse `VehicleCatalogUI.save()`.
3. PDF/Web catalog import melewati `VehicleCatalogWriteSOT.ensurePart()`; tidak ada second identity writer di jalur commit.
4. Full restore sudah punya snapshot/rollback, auxiliary IndexedDB snapshot, service-link reconciliation, dan odometer validation.
5. Shop CSV/JSON tests dan catalog import tests existing tetap lulus.

### FIX S1827
`exportCSV()` laporan transaksi sebelumnya memakai `r.join(',')` langsung. Kategori/nama akun/catatan yang mengandung koma, kutip, atau newline dapat menghasilkan CSV yang bergeser saat dibuka di Excel/Sheets.

Fix: setiap cell sekarang melalui `_reportCsvCell()` dengan escaping CSV dasar RFC4180.

### FINDING — perlu Design Lock berikutnya
**1. CSV finance import belum idempotent.**
`handleImport()` selalu append `imported` ke `D.transactions` dan `parseCSVImport()` membuat ID baru. File yang sama diimpor dua kali akan membuat transaksi duplikat.

Rekomendasi audit berikutnya: tentukan identity/fingerprint import (source + row hash) dan aturan duplicate preview. Jangan implementasi heuristik sebelum lock.

**2. Parser CSV finance masih line-based.**
`parseCSVImport()` memakai `content.split(/\\n/)`; walau `splitCSVLine()` menangani koma/kutip dalam satu baris, field quoted yang berisi newline belum round-trip penuh.

**3. Restore shape validation masih minimal.**
`applyRestoredData()` memeriksa known key, lalu merge `{...D,...imp}`. Bila field yang seharusnya array datang sebagai object/string dari file rusak, guard khusus per-domain belum lengkap. Ini berpotensi menghidupkan kembali kelas bug `.length/.map()`.

**4. Shop JSON export adalah subset.**
`exportShopJSON()` hanya membawa `products` dan `produsen`. Data transaksi Shop (`cobek`) dan `cobekKategori` tidak ikut. Nama fitur perlu tetap dianggap "Shop subset backup", atau dibuat explicit full-shop backup di Design Lock berikutnya.

**5. Scan OCR quality vs data integrity.**
OCR tetap bersifat probabilistik. Preview/edit/validation sudah ada; jangan menaikkan hasil OCR menjadi data resmi tanpa confirmation gate.

## Regression
S1827 focused suite: `tests/s1827-scan-import-export-data-integrity.test.js`

Existing related tests also re-run:
- shop-data-io-csv-import
- shop-data-io-json-import
- vehicle-catalog-import
- vehicle-catalog-import-stock-push
- sparepart-ocr / parser / catalog-add
- Honda PDF import parse/commit
- service import odometer
- backup restore regression / service restore integrity
- scan OCR wallet / Bibit detail

## Next recommended audit
**S1828 — Import Identity & Restore Schema Gate**
1. define per-source idempotency identity;
2. duplicate preview before commit;
3. strict array/object shape validation for restore;
4. explicit full-Shop vs subset-Shop backup contract;
5. quoted-newline CSV parser decision;
6. round-trip tests: Scan -> Save -> Export -> Import/Restore -> no duplicate/no orphan.
