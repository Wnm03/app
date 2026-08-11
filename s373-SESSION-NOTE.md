# Session note s373 (Sesi 373) — Modul 15 Clear Field Mutation Gate

Lanjutan langsung dari patch s372 (Modul 14, import-shop-excel-product-
mutation-gate) yang diupload user
(`kw_release_sesi372_modul14-import-shop-excel-product-mutation-gate_v1069.zip`).
Instruksi user sesi ini: TIDAK ada target spesifik — audit dulu seluruh
`modules/shop/`+`modules/business/`+`modules/shared/` (yang dipakai Shop)
untuk mutasi yang masih bypass SSOT; kalau tidak ada bypass, buat FINAL
AUDIT REPORT dan berhenti (jangan buat Modul 15); kalau masih ada, pilih
SATU scope terkecil, reuse gate yang sudah ada, gate baru hanya kalau
benar-benar perlu, jangan refactor besar/ubah business logic.

## Audit

Grep pola assignment mentah field Product di seluruh `modules/shop/*.js`
+ `modules/business/*.js` (stock/hargaBeli/hargaJual/hargaReseller/
diskonPersen/kategoriId/produsenId/satuan/hargaByProdusen), ditelusuri
satu per satu untuk membedakan mutasi `D.products` sungguhan vs staging
row lokal (yang memang belum masuk `D.products`, dipipa lewat
`ShopDataIO.commitShopRows()` yang sudah gated).

Hasil: **3 titik bypass**, semuanya menulis `kategoriId`/`produsenId`
ke string kosong `''` — pola yang sama sekali ditolak
`ProductRepository.mutateSetField()` (Modul 5), sehingga sejak Modul
5/6/7/8 memang sengaja dibiarkan raw & didokumentasikan sebagai known
issue di CHANGELOG masing-masing sesi itu (lihat detail lengkap di
`CHANGELOG-MODUL15.md` §Audit).

Tidak ditemukan bypass lain — semua jalur Create/Update/Delete/Import/
Inline Create/Bulk Update/Nested Mutation lain di Shop sudah lewat
ProductRepository/SupplierStore/CategoryStore/AttributeStore sejak
Modul 3-14.

## Keputusan: Modul 15 diperlukan (opsi B, bukan opsi A)

3 titik itu adalah bypass VALID (mutasi Product asli di `D.products`,
bukan staging row), jadi opsi A ("SHOP FINAL tanpa Modul baru") TIDAK
berlaku sesuai instruksi. Scope terkecil yang dipilih: PERLUAS
`mutateSetField()` yang sudah ada (bukan gate baru) supaya menerima
`''` khusus untuk `kategoriId`/`produsenId` — pola SAMA PERSIS
`mutateSetPrice()` Modul 5 yang mengecualikan `null` untuk
`hargaReseller`. `satuan` sengaja TIDAK ikut pengecualian (tidak ada
jalur existing yang butuh clear `satuan`).

## Yang dikerjakan

1. `ProductRepository.mutateSetField()` — 1 pengecualian ditambahkan
   (`value===''` valid utk kategoriId/produsenId), 0 gate baru.
2. 3 titik mutasi mentah dialihkan (guard typeof + fallback raw, pola
   PERSIS Modul 3-14): `Etalase.delKategori()`, `Produsen.delete()`,
   `applyTxShopStockFromTx()`.
3. Komentar dokumentasi `CategoryStore.mutateDelete()`/
   `SupplierStore.mutateDelete()` diperbarui (0 perubahan logic gate
   Category/Supplier itu sendiri).
4. 1 test lama disesuaikan (`product-repository-attribute-gate-mod5.
   test.js`) — kontrak `kategoriId=''` memang sengaja berubah, assersi
   dipindah ke field yang tidak berubah (`satuan`).
5. Test baru: `tests/product-repository-clear-field-gate-mod15.test.js`
   (12 test: 7 unit, 3 integrasi, 2 fallback).

## Regression & build

`npm test`: 2518/2520 pass. 2 gagal (`dashboard-hub-goto-subtab.test.js`)
dikonfirmasi PRE-EXISTING (direproduksi identik dari ZIP baseline v1069
sebelum perubahan apa pun sesi ini — modul dashboard-hub tidak disentuh
sesi ini, di luar cakupan Shop).

`node scripts/build.js s373-clear-field-mutation-gate-modul15` — sukses,
sintaks valid. `node scripts/verify-bundle-freshness.js` — segar. Versi
v1069 → v1071.

## Status akhir

**SHOP FINAL.** Audit ulang setelah Modul 15 tidak menemukan bypass
SSOT tersisa di Shop. Tidak ada Modul 16 yang diperlukan sesi ini.
