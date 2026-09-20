# AUDIT S1867 — Generic Honda PDF Catalog Auto-Import

## Tujuan

Satu alur generik agar katalog kendaraan baru dapat dimasukkan dari PDF tanpa menambah JSON/source-code khusus per kendaraan.

## Audit PDF yang dilampirkan

- File: `Katalog-Suku-Cadang-Honda-BeAT-POP-eSP-K61(1).pdf`
- 88 halaman, PDF tidak terenkripsi.
- Cover terbaca melalui OCR: `BEAT & BEAT STREET ESP (ACH110CBF)`.
- Petunjuk katalog menyatakan tanggal penerbitan 10 November 2018.
- Nama file memberi identitas `K61`; kode ini dipakai sebagai kandidat identitas katalog, bukan diinferensikan dari nomor part.
- Text layer native pada file menghasilkan karakter yang terkorup/garbled pada banyak halaman; karena itu jalur native text saja tidak aman. Importer sekarang memakai quality gate dan fallback OCR.

## Arsitektur setelah S1867

```text
PDF
 ↓
pdf.js native text
 ↓ quality gate
 ├─ readable → gunakan text layer
 └─ unreadable → render page → OCR existing engine
 ↓
page-break aware text
 ↓
parse katalog
 ↓
identifikasi model/kode/tanggal/section
 ↓
normalisasi nomor part
 ↓
match ke Service Master 102 komponen
 ↓
HIGH / MEDIUM / AMBIGUOUS / UNMAPPED
 ↓
DRY RUN
 ↓ user confirm
 ├─ kendaraan aktif
 ├─ kendaraan existing
 └─ kendaraan baru → form kendaraan existing diprefill
 ↓
IDB dynamic catalog + VehicleCatalog
```

## Aturan keamanan data

1. PDF catalog adalah evidence part inventory, bukan sumber interval maintenance.
2. Tidak ada komponen maintenance baru yang otomatis menjadi FINAL.
3. Mapping ambigu/tidak dikenal tetap ditandai review.
4. KZRJ dan K46 tetap berada pada dataset statis masing-masing.
5. Katalog baru disimpan sebagai dynamic catalog di IndexedDB sehingga kendaraan berikutnya tidak memerlukan coding baru.

## Dry-run terhadap PDF

Dry-run penuh di browser membutuhkan OCR 88 halaman. Audit environment melakukan OCR spot-check pada cover, petunjuk, indeks kelompok mesin/rangka, dan halaman katalog part. Hasil spot-check menunjukkan format katalog berbasis gambar/tabel dan mengonfirmasi kebutuhan page-aware OCR.

Contoh halaman katalog yang terbaca OCR menunjukkan tabel dengan kolom nomor referensi, nomor part, deskripsi, dan jumlah; contoh nomor part yang terbaca antara lain `19610-K44-VO0`, `19621-KB1-NOO`, `19625-K44-VOO`, `19639-GBC-000`, dan `33715-GB0-900`. Nilai ini diperlakukan sebagai kandidat OCR, bukan bukti final tanpa preview.

### Status write

**NO WRITE** pada dry-run.

Proposed changes:

- 1 dynamic catalog record
- part records ter-scope ke catalogId + vehicleId
- optional VehicleCatalog records setelah konfirmasi
- Service Master: 0 perubahan otomatis

## Verification

- S1867 targeted suite: 63/63 PASS.
- Build: PASS.
- Bundle syntax: PASS.
- `AUDIT_MATRIX.md` baseline disinkronkan dengan hasil build.
- esbuild tidak tersedia pada environment, sehingga bundle output valid tetapi belum diminify.
