# AUDIT S1828 — Import Identity & Restore Schema Gate

## Scope

Audit lanjutan S1827 untuk jalur data:
- Finance CSV/JSON transaction import
- Cashew/CSV parser
- Car Notes CSV import
- Backup JSON restore
- round-trip import/export robustness

## Findings before patch

1. `handleImport()` selalu append transaksi hasil parser. Tidak ada identity key yang dipertahankan untuk transaksi hasil import, sehingga file yang sama dapat menghasilkan transaksi baru lagi.
2. Parser CSV berbasis `content.split(/\r?\n/)` pada jalur Car Notes dan `split('\n')` pada parser transaksi tidak dapat menjaga quoted field yang mengandung newline.
3. `splitCSVLine()` sudah menangani koma di dalam quote, tetapi belum menjadi record parser CSV penuh.
4. `applyRestoredData()` sudah memiliki rollback dan migration yang kuat, tetapi sebelum merge belum ada schema-shape gate generik untuk menolak koleksi domain utama yang bertipe salah.

## Implemented

### 1. Import identity gate

- CSV transaction rows sekarang membawa `importIdempotencyKey` deterministik berbasis tipe import + nomor baris + isi row.
- JSON transaction import menggunakan `json:<original-id>` bila ID tersedia; bila tidak, menggunakan row index + fingerprint.
- Sebelum append, key yang sudah ada di `D.transactions` dilewati.
- Tidak menghapus atau menggabungkan transaksi lama secara heuristik.
- Tidak memakai fingerprint isi sebagai dedupe terhadap transaksi legacy yang belum memiliki key, sehingga transaksi lama yang kebetulan identik tidak terhapus/dianggap sama.

### 2. CSV record parser

- Ditambahkan `splitCSVRecords()` yang mempertahankan newline di dalam quoted field.
- `splitCSVLine()` diperkuat untuk escaped quote (`""`).
- Dipakai oleh transaction import dan Car Notes CSV import.

### 3. Restore schema gate

Sebelum `D={...D,...imp}`, restore sekarang menolak:
- root JSON array/non-object
- collection domain utama yang bukan array
- `categories` yang bukan object
- `profile` yang bukan object

Backup lama yang tidak mempunyai field-field tersebut tetap kompatibel karena migration/default lama tetap berjalan.

## Non-goals

- Tidak mengubah taxonomy/SOT.
- Tidak melakukan auto-merge data legacy berdasarkan kemiripan.
- Tidak mengubah physical-part identity.
- Tidak mengubah mekanisme rollback IndexedDB yang sudah ada.

## Regression

Focused suite:

**34/34 PASS**

Mencakup S1827 + S1828 + `backup-restore-regression-s266`.

Satu log `Restore gagal... simulasi gagal init` yang muncul di output adalah skenario rollback yang memang sengaja diuji oleh test existing; test tetap PASS.

## Next audit

S1829 — **Round-trip Identity & Orphan Audit**:

`Scan/OCR → Preview → Commit → Export → Re-import → Restore → Reference Check`

Fokus berikutnya:
- orphan `vehicleId`, `catalogId`, `serviceComponentId`, `servisLinkId`/`txLinkId`
- duplicate identity setelah round-trip
- apakah export membawa semua field identity yang diperlukan
- apakah import mempertahankan relasi lintas domain tanpa membuat referensi palsu
- Car Notes + Vehicle Catalog + Stock + Service sebagai satu graph data
