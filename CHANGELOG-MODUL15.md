# CHANGELOG — Modul 15 (Sesi 373): Clear Field Mutation Gate

Baseline: `kw_release_sesi372_modul14-import-shop-excel-product-mutation-gate_v1069.zip` (v1069)
Hasil: **v1071**

## Audit sesi ini (WAJIB sebelum implementasi, sesuai instruksi)

Audit menyeluruh `modules/shop/`, `modules/business/`, dan `modules/shared/`
(yang dipakai Shop) untuk seluruh mutasi langsung yang bypass SSOT
(`ProductRepository`/`SupplierStore`/`CategoryStore`/`AttributeStore`),
mencakup Create/Update/Delete/Import/Inline Create/Bulk Update/Nested
Mutation/semua jalur yang menulis `D.products`/`D.produsen`/
`D.cobekKategori`.

Metode: grep pola assignment mentah ke field Product
(`.stock`/`.hargaBeli`/`.hargaJual`/`.hargaReseller`/`.diskonPersen`/
`.kategoriId`/`.produsenId`/`.satuan`/`.hargaByProdusen`) di semua file
`modules/shop/*.js` + `modules/business/*.js`, lalu telusuri tiap match
satu-persatu (bedakan objek Product asli di `D.products` vs staging
row/local object yang memang belum masuk `D.products`).

### Hasil: 3 titik bypass ditemukan, SEMUA 1 akar masalah yang sama

| # | File | Fungsi | Mutasi mentah | Root cause |
|---|---|---|---|---|
| 1 | `cobek-etalase.js` | `Etalase.delKategori()` | `D.products.forEach(p=>{if(p.kategoriId===id)p.kategoriId='';})` | `mutateSetField()` menolak `''` |
| 2 | `cobek-order.js` | `Produsen.delete()` | `D.products.forEach(p=>{if(p.produsenId===id)p.produsenId='';})` | `mutateSetField()` menolak `''` |
| 3 | `cobek-tx-cart.js` | `applyTxShopStockFromTx()` | `product.kategoriId=kat;` (cabang `kat===''`, edge-case `kategoriInput` whitespace-only) | `mutateSetField()` menolak `''` |

Ketiganya SUDAH didokumentasikan eksplisit sebagai known issue sejak
`CHANGELOG-MODUL5.md`/`CHANGELOG-MODUL6.md`/`CHANGELOG-MODUL7.md`/
`CHANGELOG-MODUL8.md` — dibiarkan raw dengan sengaja saat itu karena
`ProductRepository.mutateSetField()` (Modul 5) mewajibkan teks
non-kosong, dan menutupnya lewat gate lama berarti mengubah perilaku
(field tidak akan ter-clear lagi). Modul 15 menutup gap itu.

**Titik lain yang DICEK dan TERBUKTI SUDAH lewat gate** (bukan bypass,
tidak diubah): `shop-data-io-api.js` `ShopDataIO.commitShopRows()`
(create+update, dipakai Scan/PDF/CSV/Paste — semua field lewat
`mutateSetPrice()`/`mutateSetStock()`/`mutateSetField()`/
`createProduct()`+`saveProduct()`), `cobek-io.js`
`ImportKatalog.commit()`/`ImportShopExcel.commit()` (reroute ke
`commitShopRows()` sejak Modul 13/14), `cobek-etalase.js` `Etalase.save()`
(Tahap 6), `cobek-order.js` `Produsen.saveHarga()` (Modul 6),
`cobek-tx-cart.js` cabang lain di `applyTxShopStockFromTx()` (Modul 6/11),
`shop-pdf-import-ui.js`/`shop-scan-ui.js` (menulis ke staging row lokal,
bukan `D.products`, lalu dipipa ke `commitShopRows()`).

**Titik yang DICEK dan DIPUTUSKAN di luar cakupan** (bukan mutasi Shop):
`modules/shared/backup-restore.js` & `modules/shared/features-helpers-
global-security.js` — `D.products.forEach(p=>{...if(p.kategoriId===
undefined)p.kategoriId='';...})`. Ini pola *boot-time schema default-fill*
(migrasi data lama yang belum punya field, dijalankan sekali saat
load/restore), pola yang SAMA dipakai puluhan field lain non-Shop di file
yang sama (`if(!D.workDays)D.workDays=[]` dst.) — bukan mutasi
transaksional yang perlu digate, dan mengubahnya di luar instruksi sesi
ini ("jangan refactor besar", "fokus satu sesi").

**3 titik mutasi dipindahkan ke gate** sesi ini.

## Yang dikerjakan

1. **0 gate baru** — 1 gate yang sudah ada (`ProductRepository.
   mutateSetField()`, Modul 5) DIPERLUAS, pola SAMA PERSIS
   `mutateSetPrice()` Modul 5 yang mengecualikan `null` untuk
   `hargaReseller`: `value===''` sekarang VALID **khusus** untuk field
   `kategoriId`/`produsenId` (bukan `satuan` — tidak ada jalur existing
   yang butuh clear `satuan`). Nilai lain (`null`/`undefined`/`NaN`/angka/
   whitespace-only) TETAP ditolak sama seperti sebelumnya.
2. **3 titik mutasi dialihkan** ke `ProductRepository.mutateSetField()`,
   guard `typeof ProductRepository!=='undefined'` + fallback raw PERSIS
   pola Modul 3-14 di ketiganya:
   - `cobek-etalase.js` `Etalase.delKategori()`
   - `cobek-order.js` `Produsen.delete()`
   - `cobek-tx-cart.js` `applyTxShopStockFromTx()`
3. **0 perubahan business logic** — nilai akhir yang ditulis (`''`,
   "dikosongkan") 100% identik dengan sebelum Modul 15 di ketiga titik;
   produk lain yang tidak terkait TIDAK ikut tersentuh (diverifikasi test
   integrasi).
4. **Komentar dokumentasi diperbarui** di `category-store.js` (
   `CategoryStore.mutateDelete()`) & `supplier-store.js` (
   `SupplierStore.mutateDelete()`) — catatan lama yang menyebut
   "SENGAJA TIDAK dialihkan" diganti jadi merujuk ke perluasan gate Modul
   15 (isi gate-nya sendiri di kedua file itu TIDAK berubah — mereka gate
   Category/Supplier, bukan Product; hanya komentarnya yang diperbarui
   supaya akurat).
5. **1 test lama disesuaikan** (bukan dihapus/dilemahkan):
   `tests/product-repository-attribute-gate-mod5.test.js`, test
   "mutateSetField() — value tidak valid: field TIDAK disentuh sama
   sekali (fail-safe)" sebelumnya mengetes `kategoriId=''` DITOLAK — itu
   memang kontrak LAMA yang sengaja diubah Modul 15. Assersi `''` di test
   itu dipindah ke field `satuan` (field yang TIDAK ikut pengecualian,
   masih menolak `''` persis seperti sebelumnya), supaya test itu tetap
   murni menguji fail-safe umum tanpa bentrok dengan kontrak baru yang
   memang sengaja berubah. Kasus `kategoriId=''`/`produsenId=''` sekarang
   punya cakupan test sendiri yang lebih lengkap (lihat §Test baru).

## Test baru

`tests/product-repository-clear-field-gate-mod15.test.js` — **12 test
baru**:
- A. Unit (7 test): `''` valid untuk kategoriId/produsenId; `''` TETAP
  ditolak untuk `satuan`; whitespace-only (`'   '`) TETAP ditolak (bukan
  auto-trim jadi clear); `null`/`undefined`/angka TETAP ditolak (hanya
  string kosong literal); teks non-kosong valid tidak berubah perilakunya
  (regression Modul 5); field di luar whitelist tetap ditolak.
- B. Integrasi (3 test): `Etalase.delKategori()` benar-benar lewat gate
  (produk lain tidak ikut tersentuh, kategori sendiri tetap terhapus);
  `Produsen.delete()` benar-benar lewat gate (produk lain tidak ikut
  tersentuh); `applyTxShopStockFromTx()` edge-case kategoriInput
  whitespace-only sekarang ikut lewat gate juga.
- C. Fallback (2 test): tanpa `ProductRepository`, kedua titik delete
  cascade fallback ke raw assignment PERSIS perilaku sebelum Modul 15.

## Hasil regression

`npm test` (2520 test total): **2518 pass, 2 fail**. 2 kegagalan
(`tests/dashboard-hub-goto-subtab.test.js`, 2 test terkait navigasi
Dashboard Hub, error `Cannot set properties of undefined (setting
'display')` di `dashboard-hub.js:802`) **TERKONFIRMASI pre-existing** —
direproduksi identik dari ZIP baseline `v1069` SEBELUM perubahan apa pun
sesi ini dilakukan (dashboard-hub.js tidak disentuh sesi ini, modul di
luar cakupan Shop/ProductRepository). Tidak diperbaiki sesi ini (di luar
scope instruksi — fokus satu sesi, modul lain).

## Build & versi

- `node scripts/build.js s373-clear-field-mutation-gate-modul15` — sukses,
  sintaks kedua bundle valid.
- `node scripts/verify-bundle-freshness.js` — kedua bundle segar (hash
  source cocok).
- Versi build: **v1069 → v1071** (v1070 sempat dihasilkan otomatis oleh
  build.js dari label lama sebelum label sesi ini eksplisit diset; build
  final yang dipakai untuk paket rilis adalah v1071 dengan label
  `s373-clear-field-mutation-gate-modul15`).
- `package.json` `"version"` TIDAK diubah (`0.85.7`, konsisten dengan
  Modul 13/14 — field ini memang tidak di-bump oleh `build.js`).

## Status akhir

Setelah Modul 15, audit ulang (lihat §Audit sesi ini) TIDAK menemukan
titik mutasi Product/Supplier/Category/Attribute lain yang masih bypass
SSOT di `modules/shop/` atau `modules/business/`. **SHOP FINAL.**
