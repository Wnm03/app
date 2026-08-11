# Changelog — Sesi 367 (Modul 9 — Weight Bulk Widget Mutation Gate)

## Konteks

Lanjutan langsung dari Modul 8 (Sesi 366, category-mutation-gate).
Instruksi user: audit singkat FULL RELEASE ZIP terakhir
(`kw_release_sesi366_modul8-category-mutation-gate_v1063.zip`), cari
seluruh mutation point yang masih bypass SSOT/direct write ke `D.*`/
validasi tersebar/nested mutation tanpa gate/Store read-only padahal ada
operasi tulis, pilih SATU dengan dampak terbesar terhadap integritas data,
implementasikan penuh, additive, reuse validator/Store/Repository/Gate
existing, backward compatible, berhenti setelah SATU modul.

## Audit awal (bagian dari implementasi)

Grep seluruh titik TULIS `D.products`/`D.produsen`/`D.cobekKategori` di
`modules/` (di luar `modules/shop/generic/`, yaitu SSOT layer-nya sendiri):

| Field | Titik tulis | Status SEBELUM sesi ini |
|---|---|---|
| `D.products[idx].stock` | `cobek-pricing.js` restock() | ✅ sudah lewat `ProductRepository.mutateStockDelta()` (Modul lama) |
| `D.products[idx].stock` | `business-flow-presenter.js` receiveGoods() | ✅ sudah lewat `ProductRepository.mutateStockDelta()` (Modul lama) |
| `D.products` create/delete | `cobek-etalase.js` `Etalase.save()`/`delete()` | ✅ sudah lewat `ProductRepository.createProduct()`/`updateProduct()` (Modul lama) |
| **`D.products[idx].beratPerUnit`** | **`cobek-pricing.js` `WeightBulkWidget.applyOne()`/`applyBulk()`** | ❌ **DITULIS MENTAH, 0 validasi, bypass total `ProductRepository`/`AttributeStore`** |
| `D.produsen` create/update/delete/route | `cobek-order.js`/`cobek-pricing.js` | ✅ sudah lewat `SupplierStore.*` (Modul 7) |
| `D.cobekKategori` resolve/rename/delete | `cobek-tx-cart.js`/`cobek-etalase.js` | ✅ sudah lewat `CategoryStore.*` (Modul 8) |
| `D.products`/`D.produsen` create (inline modal & CSV import) | `shop-data-io-api.js`, `cobek-io.js`, `cobek-tx-cart.js` (produk/produsen baru inline saat transaksi), `cobek-etalase.js` (produsen baru inline saat bundle) | ❌ bypass SSOT, TAPI scope besar (4+ file, alur Import/Export + inline-create) — DI LUAR satu modul, lihat §"Issue tersisa" |

Satu-satunya bypass yang TERISOLASI (1 field, 1 file, 2 fungsi) dan
langsung menutup gap terhadap SSOT yang **sudah ada dan sudah dipakai
call-site lain** (`ProductRepository.updateProduct()` sudah wired di
`Etalase.save()`, `AttributeStore.setAttribute()` sudah rute internal
`updateProduct()` utk `beratPerUnit`/`panjang`/`lebar`/`tinggi`/
`diskonPersen`) adalah `WeightBulkWidget.applyOne()`/`applyBulk()` —
menulis `D.products[idx].beratPerUnit=val` mentah tanpa lewat gate manapun,
padahal field yang SAMA PERSIS sudah tervalidasi/ter-generic-kan kalau
diedit lewat form Etalase biasa. Dipilih sebagai Modul 9: dampak terbesar
terhadap integritas data (field fisik yang dipakai `OngkirCalc`/
kalkulasi ongkir bisa lolos tanpa lewat rute SSOT yang sama dgn jalur
edit lainnya) dengan risiko implementasi PALING KECIL (0 gate baru, cuma
wiring 2 titik ke gate yang sudah ada & sudah battle-tested).

## Perubahan

### 1. `WeightBulkWidget.applyOne()`/`applyBulk()` dialihkan ke SSOT existing

`modules/shop/cobek-pricing.js` — **0 method baru** (murni wiring, gate
`ProductRepository.updateProduct()`/`AttributeStore.setAttribute()` SUDAH
ADA sejak Tahap 4/Tahap 1, cuma belum dipakai di 2 titik ini):

- **`applyOne(productId)`** — `D.products[idx].beratPerUnit=val` mentah
  DIGANTI `ProductRepository.updateProduct(D.products[idx],{beratPerUnit:
  val})` (immutable merge, hasil di-assign balik ke `D.products[idx]`),
  guard `typeof ProductRepository!=='undefined'` + fallback raw PERSIS
  SAMA pola `mutateStockDelta()` di `restock()` (fungsi lain file yang
  sama). Guard `val>0` (wajib isi angka valid) TETAP di caller SEBELUM
  masuk gate (UX guard lama, bukan business logic gate) — perilaku "0/
  kosong ditolak" TIDAK berubah.
- **`applyBulk()`** — sama pola persis di dalam `filled.forEach(...)`,
  tiap baris terisi lewat `ProductRepository.updateProduct()`. Baris yang
  kosong TETAP dilewati (perilaku lama, filter `val>0` sudah terjadi
  sebelum loop ini).

Field lain produk (`stock`, `hargaJual`, dll.) TIDAK tersentuh — immutable
merge `ProductRepository.updateProduct()` cuma mengganti key yang dikirim
(`beratPerUnit`), sisanya di-spread apa adanya dari objek lama.

### 2. 6 test baru (`tests/weight-bulk-mutation-gate-mod9.test.js`)

- Integrasi: `applyOne()`/`applyBulk()` benar-benar memanggil
  `ProductRepository.updateProduct()`/`AttributeStore.setAttribute()`
  (di-spy); field lain produk & produk lain di `D.products` tidak ikut
  berubah; guard `val>0`/baris kosong lama tetap menolak SEBELUM gate
  dipanggil (gate 0 kali dipanggil kalau tidak ada input valid).
- Fallback: kedua fungsi tetap bekerja tanpa `ProductRepository` (guard
  `typeof`).

### 0 test lama diubah

## Yang SENGAJA tidak disentuh

1. Guard `val>0` (angka valid) di `applyOne()`/`applyBulk()` — UX guard
   lama, tetap di caller, BUKAN business logic gate ini (sama semangat
   guard `km<=0` `SupplierStore.mutateSetRoute()` Modul 7).
2. `restock()`/`receiveGoods()` (`D.products[idx].stock`) — SUDAH digate
   sesi-sesi sebelumnya, di luar scope Modul 9.
3. Titik create inline/CSV import (`shop-data-io-api.js`/`cobek-io.js`/
   `cobek-tx-cart.js`/`cobek-etalase.js` bundle) — bypass SSOT juga TAPI
   scope-nya jauh lebih besar dari satu modul, lihat §"Issue tersisa".

## Hasil verifikasi

- `npm test` penuh: **2453 test (2447 lama + 6 baru), 2451 pass, 2 gagal**
  — PERSIS 2 kegagalan pre-existing yang sama dari baseline Modul 8
  (`dashHubNavigateToFeature`, tidak terkait Shop). **0 regresi baru.**
- `node scripts/build.js`: sukses. `APP_BUILD_VERSION` s390 -> s391,
  versi bundle numerik **v1063 -> v1064**.
- `node scripts/verify-bundle-freshness.js`: kedua bundle segar (hash
  source cocok).

## Mutation point — SEBELUM vs SESUDAH Modul 9

**Sebelum:** `D.products[idx].beratPerUnit` ditulis mentah di 2 fungsi
(`applyOne()`/`applyBulk()`), 0 validasi, bypass total SSOT yang sudah ada
untuk field yang sama.

**Sesudah:** kedua fungsi 100% lewat `ProductRepository.updateProduct()`
-> `AttributeStore.setAttribute()` (SSOT yang sama dgn jalur edit
`Etalase.save()`), fallback raw hanya aktif kalau `ProductRepository`
belum dimuat (jaga urutan load script, bukan celah baru — SAMA prinsip
seluruh gate Modul 3-8).

## Environment sandbox

Sama seperti Modul 3-8 — `esbuild`/`eslint` tidak terpasang (tidak ada
akses jaringan di sandbox ini), bundle hasil build TIDAK diminifikasi
tapi 100% valid (`node --check` + `verify-bundle-freshness.js` lolos).

## Issue tersisa

Domain Shop **BELUM 100% tertutup** — audit sesi ini menemukan titik
create `D.products`/`D.produsen` yang MASIH bypass SSOT (`ProductRepository.
createProduct()`/`SupplierStore.mutateCreate()`) di alur Import/Export CSV
(`shop-data-io-api.js`, `cobek-io.js`) dan inline-create di dalam form lain
(`cobek-tx-cart.js` — "produk baru"/"produsen baru" saat isi form
Transaksi; `cobek-etalase.js` — "produsen baru" saat isi form Bundle).
Scope-nya minimal 4 file berbeda dengan pola panggilan yang tidak seragam
(CSV row-mapping vs modal prompt inline) — BUKAN satu titik terisolasi
seperti `WeightBulkWidget`, sehingga TIDAK dipaksakan jadi Modul 9 (sesuai
instruksi "additive kecil, satu modul"). Kandidat paling masuk akal untuk
sesi berikutnya kalau user meminta lanjut.

**Sesuai instruksi: BERHENTI di sini. Tidak ada implementasi/roadmap
Modul 10 yang dibuat sesi ini.**
