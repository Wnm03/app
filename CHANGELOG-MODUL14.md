# CHANGELOG — Modul 14 (Sesi 372): Import Excel Product Mutation Gate

Baseline: `kw_release_sesi371_modul13-csv-import-product-mutation-gate_v1068.zip` (v1068)
Hasil: **v1069**

## Target sesi ini

Instruksi user eksplisit menentukan target: **`ImportShopExcel.commit()`**
(`modules/shop/cobek-io.js`) — jalur Import Excel (`.xlsx`) yang masih
bypass SSOT `ProductRepository`. Ini adalah titik yang sudah tercatat
sejak `CHANGELOG-MODUL13.md` sebagai "MASIH bypass, TAPI BUKAN CSV — di
luar scope sesi itu" (Modul 13 menyasar `ShopCsvImport`/`.csv` literal di
`shop-data-io-api.js`). Modul 14 menutup titik yang sengaja ditunda itu.

## Audit singkat (titik mutasi)

Grep `D.products.push` di `modules/shop/cobek-io.js`:

| Jalur | Format file | Titik mutasi create | Status sebelum sesi ini |
|---|---|---|---|
| `ImportShopExcel.commit()` target `'etalase'` | `.xlsx` | `D.products.push({...object literal...})` (baris 552) | **MASIH bypass — target sesi ini** |
| `ImportShopExcel.commit()` target `'produsen'` | `.xlsx` | `D.produsen.push({...})` | Object literal, TIDAK disentuh (skema `Produsen` bukan cakupan `ProductRepository`) |
| `ImportShopExcel.commit()` cabang UPDATE produk existing | — | `ProductRepository.mutateSetStock/mutateSetPrice/mutateSetDiskon/mutateSetField` | Sudah lewat gate sejak Modul 3-5, TIDAK diubah |

Catatan: komentar di `shop-data-io-api.js` (ditulis sesi Modul 13) sempat
menyebut *"ImportShopExcel.commit() cabang .xlsx"* sebagai salah satu
pemakai `createProduct()`/`saveProduct()` — itu KELIRU/mendahului kondisi
sebenarnya (referensi ke rencana, bukan status aktual saat itu). Kode
`cobek-io.js` baris 552 memang masih `D.products.push()` mentah sampai
sesi ini. Sesi ini membuat komentar itu akurat.

**1 titik mutasi dipindahkan ke gate** (create produk baru, target
`'etalase'`, cabang `else` di `ImportShopExcel.commit()`).

## Yang dikerjakan

1. **0 method/validator baru** di `ProductRepository` — murni WIRING ke
   `createProduct()`+`saveProduct()` (Tahap 4, dipakai bareng
   `Etalase.save()`/Modul 11/Modul 13) — 100% reuse.
2. **1 titik mutasi dialihkan**: create produk baru (target `'etalase'`)
   di `ImportShopExcel.commit()` (`modules/shop/cobek-io.js`) — guard
   `typeof ProductRepository!=='undefined'` + fallback fail-safe 2 lapis
   (createProduct gagal → raw push; saveProduct gagal → push
   `newProduct` langsung), pola & fallback PERSIS SAMA dengan Modul 13.
3. **0 perubahan format id** — id TETAP `'prod_'+Date.now()+'_'+uid()`
   (generator lokal, counter `uid()` monotonic — sama analisa
   anti-tabrakan id yang sudah dikonfirmasi aman di Modul 13), BUKAN
   `ProductRepository._genId()`.
4. **0 perubahan business logic** — field yang ditulis (name/stock/
   hargaBeli/hargaJual/hargaReseller/diskonPersen/kategoriId/produsenId/
   hargaByProdusen) SAMA PERSIS nilainya dengan object literal lama;
   hanya default field baru (beratPerUnit/panjang/lebar/tinggi/ownership)
   ikut terisi otomatis via `createProduct()`, konsisten dgn Modul 11/13.
5. **Target `'produsen'`** (create `D.produsen.push()`) & **cabang
   UPDATE produk existing** — TIDAK disentuh, di luar scope
   `ProductRepository`/instruksi sesi ini.
6. **Test baru**: `tests/import-shop-excel-create-mutation-gate-mod14.test.js`
   — **14 test baru** (create+wiring, update tidak berubah, id/duplicate,
   batch 60 baris, rollback 2 skenario, fallback tanpa `ProductRepository`,
   backward compat field+toast, target `'produsen'` tetap object literal).

## Hasil regresi

- Full suite: **2508 test, 2506 pass, 2 fail** — 2 kegagalan ada di
  `tests/dashboard-hub-goto-subtab.test.js` (timing/`setTimeout`,
  `dashboard-hub.js`), **tidak terkait** `cobek-io.js`/`ProductRepository`
  (dikonfirmasi: file test itu tidak mereferensikan kedua file tsb, dan
  gagal identik saat dijalankan sendiri berulang — pre-existing flaky,
  bukan regresi dari sesi ini). Sesuai instruksi ("jangan menyentuh modul
  di luar scope Import Excel"), tidak diperbaiki sesi ini.
- Test baru Modul 14: **14/14 PASS**.
- Test existing terkait `ImportShopExcel`
  (`tests/import-shop-excel-header-alias.test.js`, 8 test) — tetap PASS,
  0 regresi.

## Build & bundle

- `node scripts/build.js s372-import-shop-excel-product-mutation-gate-modul14`
  — sukses, sintaks bundle valid.
- Versi: `s371-produk-inline-create-tx-cart-mutation-gate-modul11` →
  `s372-import-shop-excel-product-mutation-gate-modul14`; angka versi
  numerik **1068 → 1069**.
- `node scripts/verify-bundle-freshness.js` — kedua bundle (`app-bundle-a.min.js`,
  `app-bundle-b.min.js`) **segar**, hash source cocok.

## Issue tersisa (di luar scope, TIDAK dikerjakan sesi ini)

- `ImportShopExcel.commit()` target `'produsen'` (`D.produsen.push()`
  mentah) — skema `Produsen` belum punya Repository/Mutation Gate
  tersendiri; di luar cakupan `ProductRepository`.
- Berhenti setelah Modul 14 sesuai instruksi user — Modul 15 (kalau ada
  titik bypass lain) TIDAK diaudit/dikerjakan sesi ini.
