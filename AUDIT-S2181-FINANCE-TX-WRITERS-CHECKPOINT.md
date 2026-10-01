# S2181 — Finance Transaction SOT Writer Consolidation Checkpoint

## Tujuan

Melanjutkan A-SOT Consolidation dengan memindahkan writer transaksi berisiko rendah ke `FinanceTxSOT`, tanpa mengubah schema, UI, persistence contract, atau cara kerja fitur.

## Koreksi baseline

Audit menemukan patch S2180 sebelumnya tersimpan di level `modules/` luar, sedangkan source runtime lengkap berada di `app-main/`. S2181 mengoreksi wiring ke `app-main/modules` dan `app-main/scripts/build.js` agar SOT benar-benar masuk bundle runtime.

## Perubahan runtime

1. `modules/finance/finance-tx-sot.js` menjadi gateway mutation `D.transactions`.
2. `tx-transfer.js` menggunakan `FinanceTxSOT.create()` untuk kedua kaki transfer.
3. `piutang-utang.js` menggunakan `FinanceTxSOT.create()` untuk auto-transaksi.
4. `gaji-bulanan.js` menggunakan `FinanceTxSOT.create()`.
5. `reset-gaji-mingguan.js` menggunakan `FinanceTxSOT.create()`.
6. `kasir.js` menggunakan `FinanceTxSOT.create()`.
7. `scripts/build.js` memuat SOT sebelum writer yang memerlukannya.
8. Test harness memuat SOT otomatis untuk test yang memakai writer Finance yang sudah dikonsolidasikan.

## Kontrak yang dipertahankan

- `D.transactions` tetap array yang sama.
- Bentuk dan field transaksi tidak diubah.
- Tidak ada migration data.
- Tidak ada perubahan UI.
- Tidak ada Finance Engine kedua.
- Tidak ada writer legacy lain yang dihapus pada checkpoint ini.
- Legacy transfer tetap backward-compatible.

## Validasi

### Targeted regression

`tests/s2181-finance-tx-writers.test.js`

**4/4 PASS**.

Gabungan:

- S2180 FinanceTxSOT
- S2181 Finance writer consolidation
- Transfer S432

**13/13 PASS**.

### Architecture / SOT / persistence / feature

- S2153 SOT architecture map — PASS 6/6
- S2154-S2159 SOT consolidation — PASS 6/6
- S2160 SOT drift/orphan — PASS 6/6
- Persistence integrity — PASS
- Architecture integrity — PASS
- Feature regression — PASS
- Patch contamination — PASS

### Full suite

`TEST_SHARDS=64 TEST_CONCURRENCY=8 TEST_SHARD_TIMEOUT_MS=90000 node scripts/run-full-test.js` dijalankan, tetapi environment audit timeout sebelum hasil final. Karena itu checkpoint **tidak** dinyatakan full-suite-green.

### Build

`node scripts/build.js` berhasil, bundle syntax lolos. Environment tidak memiliki `esbuild`, sehingga bundle yang dihasilkan unminified. Generated bundle/version artifacts hasil build tidak dimasukkan ke patch.

## Sisa direct runtime transaction writers

Masih ada writer pada domain lain seperti Shop, Tagihan, Titipan, Vehicle Service, Renovasi, Investment, BBM, Chat Action, dan backup/restore. Mereka sengaja belum dipindahkan pada checkpoint ini karena masing-masing memiliki rollback/linkage/reconciliation khusus.

## Next checkpoint

Prioritas berikutnya adalah writer Finance inti (`transaksi-b.js`, `tx-list-cashflow.js`) dengan perhatian khusus pada update/delete/rollback agar mutation authority tidak memutus atomicity yang sudah ada.
