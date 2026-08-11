# CHANGELOG — Modul 16 (sesi s373, lanjutan)

## Konteks

Session note s373 (Modul 15) menyimpulkan **"SHOP FINAL"** — audit ulang saat
itu tidak menemukan bypass SSOT tersisa. Sesi ini user memberi target eksplisit
Modul 16 berdasarkan audit lanjutan yang menemukan **2 titik bypass VALID**
yang terlewat audit s373:

1. `ShopDataIO.importShopJSON()` (`modules/business/shop-data-io-api.js`) —
   update produk existing (`product[f]=src[f]` mentah), create produk baru
   (`D.products.push({...object literal...})` mentah), create produsen baru
   (`D.produsen.push({...object literal...})` mentah).
2. `ImportShopExcel.commit()` target `'produsen'` (`modules/shop/cobek-io.js`)
   — update contact/note/jarakKm/biayaPerKm (`pr.contact=...` dst. mentah)
   dan create produsen baru (`D.produsen.push({...object literal...})` mentah).
   **0 gate sebelumnya** di cabang ini — beda dari target `'etalase'` yang
   sudah digate Modul 14/15.

Diverifikasi langsung di source ZIP v1071 (bukan asumsi) sebelum implementasi
— kedua bypass di atas dikonfirmasi nyata & valid (mutasi `D.products`/
`D.produsen` asli, bukan staging row).

## Yang dikerjakan

### 1. `modules/business/shop-data-io-api.js` — `importShopJSON()`

- Update produk existing: `copyFields.forEach()` dialihkan per-field ke
  gate yang SUDAH ADA — `hargaBeli`/`hargaJual`/`hargaReseller` lewat
  `ProductRepository.mutateSetPrice()`, `diskonPersen` lewat
  `mutateSetDiskon()`, `kategoriId`/`produsenId`/`satuan` lewat
  `mutateSetField()`, `stock` lewat `mutateSetStock()`. Guard
  `typeof ProductRepository` + fallback raw assignment PERSIS lama kalau
  module belum dimuat (pola sama persis Modul 3-15).
- Create produk baru: dialihkan ke
  `ProductRepository.createProduct()`+`saveProduct()` (SSOT Tahap 4/6),
  pola & fallback PERSIS SAMA Modul 13/14 (id tetap generator lokal
  `'prod_'+Date.now()+'_'+uid()`, ditimpa setelah `createProduct()`;
  fallback ke object literal mentah kalau module belum dimuat atau gate
  menolak).
- Create produsen baru: dialihkan ke `SupplierStore.mutateCreate()` (SSOT
  Modul 7), pola & fallback identik (id tetap generator lokal
  `'prd_'+Date.now()+'_'+uid()`).
- 0 gate baru, 0 validasi baru — 100% reuse `ProductRepository`/
  `SupplierStore` yang sudah ada.

### 2. `modules/shop/cobek-io.js` — `ImportShopExcel.commit()`, `target==='produsen'`

- Update supplier existing: `name`/`contact`/`note` dialihkan lewat
  `SupplierStore.mutateUpdate()`. `jarakKm`/`biayaPerKm` dialihkan lewat
  `SupplierStore.mutateSetRoute()` **hanya saat kedua kolom terisi**
  (pasangan lengkap) — sesuai kontrak all-or-nothing gate tsb (didesain
  untuk `OngkirCalc.saveProdusenPref()` yang selalu kirim keduanya
  bersamaan). Saat file import cuma punya salah satu kolom terisi
  (independen — kasus yang sudah ada sebelum Modul 16), **tetap
  assignment mentah** persis seperti sebelumnya — supaya business logic
  partial-update yang sudah ada tidak berubah (lihat §Known issue).
- Create supplier baru: dialihkan ke `SupplierStore.mutateCreate()`, pola
  & fallback identik cabang `'etalase'` (id generator lokal, ditimpa
  setelah gate).
- Guard `typeof SupplierStore` + fallback raw PERSIS lama di semua titik.
  0 gate baru, 0 validasi baru.

## Known issue (dicatat, TIDAK ditutup sesi ini — di luar scope)

`SupplierStore.mutateSetRoute(supplier, jarakKm, biayaPerKm)` (Modul 7)
memvalidasi `jarakKm`+`biayaPerKm` **bersama** (all-or-nothing) — didesain
untuk `OngkirCalc.saveProdusenPref()` yang memang selalu mengirim
keduanya. `ImportShopExcel.commit()` target `'produsen'` punya kasus
independen (baris Excel bisa isi salah satu kolom rute saja) yang gate
ini tidak dukung tanpa mengubah kontraknya. Scope Modul 16 (instruksi
user: "jangan mengubah business logic selain yang diperlukan", "reuse gate
yang sudah ada") sehingga kasus partial ini **tetap** assignment mentah
(bukan bypass baru — mengikuti kontrak gate yang sudah ada, tidak
melebarkannya). Kalau suatu saat mau ditutup, opsinya: 2 method terpisah
`mutateSetJarakKm()`/`mutateSetBiayaPerKm()` di `SupplierStore` (gate baru
kecil), di luar scope sesi ini.

## Test

Test baru: `tests/shop-jsonimport-produsenexcel-mutation-gate-mod16.test.js`
(15 test — 9 unit/integrasi gate `importShopJSON()`, 6 unit/integrasi gate
`ImportShopExcel.commit()` target produsen; termasuk rollback/fallback &
backward-compat).

Test lama TIDAK diubah — `shop-data-io-json-import.test.js` dan
`import-shop-excel-create-mutation-gate-mod14.test.js` (test I, target
produsen) tetap PASS tanpa modifikasi karena sandbox test-nya memang tidak
me-load `ProductRepository`/`SupplierStore` (jalur fallback otomatis
teraktivasi, perilaku identik sebelum Modul 16).

## Regression & build

`npm test`: **2533/2535 pass**. 2 gagal (`dashboard-hub-goto-subtab.test.js`)
dikonfirmasi PRE-EXISTING (sama persis baseline v1071 sebelum perubahan apa
pun sesi ini — modul dashboard-hub tidak disentuh sesi ini, di luar cakupan
Shop).

`node scripts/build.js s373-modul16-shop-json-produsen-excel-mutation-gate`
— sukses, sintaks kedua bundle valid. `node scripts/verify-bundle-freshness.js`
— segar. Versi v1071 → v1072.

## Audit re-scan (setelah Modul 16)

Grep ulang pola assignment mentah field Product/Supplier (`.stock=`,
`.hargaBeli=`, `.hargaJual=`, `.hargaReseller=`, `.diskonPersen=`,
`.kategoriId=`, `.produsenId=`, `.satuan=`, `D.products.push`,
`D.produsen.push`) di seluruh `modules/shop/*.js` + `modules/business/*.js`,
ditelusuri satu per satu: **tidak ditemukan bypass lain**. Semua titik yang
tersisa sudah digate (Modul 3-16) atau memang staging row lokal (dipipa
lewat `ShopDataIO.commitShopRows()` yang sudah gated — Import Paste/PDF/
Scan) — bukan mutasi `D.products`/`D.produsen` langsung.

## Status akhir

**SHOP FINAL (revisi).** Tidak ada Modul 17 yang diperlukan sesi ini —
sesuai instruksi, implementasi berhenti di Modul 16 (tidak melanjutkan ke
Modul 17, tidak membuat roadmap).
