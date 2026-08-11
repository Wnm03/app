# Session note s367 (Sesi 367) — Modul 9 Weight Bulk Widget Mutation Gate

Lanjutan langsung dari patch s366 (Modul 8, category-mutation-gate) yang
diupload user (`kw_release_sesi366_modul8-category-mutation-gate_v1063.zip`
+ `CHANGELOG-MODUL8.md`/`FILES-CHANGED.md`/`s366-SESSION-NOTE.md`/
`MODUL8-CATEGORY-MUTATION-GATE.diff`). Instruksi user sesi ini: JANGAN
tanya modul apa duluan — audit singkat FULL RELEASE v1063, cari SEMUA
mutation point yang masih bypass SSOT/direct write `D.*`/validasi
tersebar/nested mutation tanpa gate/Store read-only padahal ada operasi
tulis, pilih SATU dengan dampak terbesar terhadap integritas data,
implementasi langsung, additive, satu sesi = satu modul = satu FULL
RELEASE ZIP selesai, berhenti setelah Modul 9 (tidak boleh mulai/rencana
Modul 10).

## Audit & pemilihan target (dikerjakan sesi ini, bukan dikonfirmasi user)

Grep seluruh titik TULIS `D.products`/`D.produsen`/`D.cobekKategori` di
luar `modules/shop/generic/` menunjukkan domain Shop SEBAGIAN BESAR sudah
tertutup (stock/create/delete produk, seluruh mutasi supplier & kategori
Modul 3-8) KECUALI satu titik terisolasi: `D.products[idx].beratPerUnit`
di `WeightBulkWidget.applyOne()`/`applyBulk()` (`cobek-pricing.js`) masih
ditulis mentah, 0 validasi, padahal field yang SAMA PERSIS sudah
tervalidasi/di-generic-kan lewat `ProductRepository.updateProduct()` ->
`AttributeStore.setAttribute()` kalau diedit lewat `Etalase.save()`.
Dipilih sebagai Modul 9: dampak integritas data terbesar (field dipakai
kalkulasi ongkir bisa lolos tanpa rute SSOT yang sama) dengan risiko
PALING KECIL (0 gate baru — SSOT-nya SUDAH ADA & sudah battle-tested,
sesi ini murni WIRING).

Audit juga menemukan bypass lain (create produk/supplier inline & CSV
import di `shop-data-io-api.js`/`cobek-io.js`/`cobek-tx-cart.js`/
`cobek-etalase.js` bundle) — TAPI scope-nya 4+ file dengan pola beda-beda,
BUKAN satu titik terisolasi, sehingga TIDAK dipaksakan jadi Modul 9 (lihat
detail di `CHANGELOG-MODUL9.md` §"Issue tersisa"). Domain Shop BELUM
100% tertutup — sesi ini TIDAK menyatakan implementasi domain Shop
selesai.

## Yang dikerjakan

1. **0 method baru** — sesi ini murni WIRING 2 fungsi ke gate yang SUDAH
   ADA (`ProductRepository.updateProduct()`, Tahap 4; `AttributeStore.
   setAttribute()`, Tahap 1) ke 2 titik yang belum memakainya.
2. **2 titik mutasi dialihkan** di `cobek-pricing.js`:
   `WeightBulkWidget.applyOne()`/`applyBulk()`, keduanya guard
   `typeof ProductRepository!=='undefined'` + fallback raw PERSIS, SAMA
   pola `mutateStockDelta()` di fungsi lain file yang sama.
3. **Guard `val>0`/filter baris kosong lama TETAP di caller** — UX guard,
   bukan business logic gate, tidak berubah.
4. **6 test baru** (`tests/weight-bulk-mutation-gate-mod9.test.js`) —
   integrasi (gate benar-benar dipanggil, field lain/produk lain tidak
   ikut berubah, guard lama tetap menolak sebelum gate) + fallback tanpa
   `ProductRepository`.
5. **0 test lama diubah**.

## Hasil verifikasi

- `npm test` penuh: **2453 test, 2451 pass, 2 gagal** — dikonfirmasi
  PERSIS 2 kegagalan pre-existing yang sama dari baseline Modul 8
  (`dashHubNavigateToFeature`, tidak terkait Shop). **0 regresi baru.**
- `node scripts/build.js`: sukses, `APP_BUILD_VERSION` s390 -> s391,
  versi bundle numerik v1063 -> v1064.
- `node scripts/verify-bundle-freshness.js`: kedua bundle segar (hash
  source cocok).

## Yang SENGAJA tidak disentuh

1. Guard `val>0`/filter baris kosong — business logic UX lama, tetap di
   caller.
2. `restock()`/`receiveGoods()` (`D.products[idx].stock`) — sudah digate
   sesi-sesi sebelumnya.
3. Titik create inline/CSV import (`shop-data-io-api.js`/`cobek-io.js`/
   `cobek-tx-cart.js`/`cobek-etalase.js` bundle) — bypass SSOT juga, TAPI
   scope besar (4+ file), di luar "satu modul" sesi ini.

## Environment sandbox (sama seperti Modul 3-8)

`esbuild`/`eslint` tidak terpasang (tidak ada akses jaringan di sandbox
ini) — bundle hasil build TIDAK diminifikasi tapi 100% valid (`node
--check` + `verify-bundle-freshness.js` lolos).

## File yang berubah

Lihat `FILES-CHANGED.md` (root repo) untuk daftar lengkap + unified diff
di `MODUL9-WEIGHT-BULK-MUTATION-GATE.diff`.

## Issue tersisa

Domain Shop **BELUM 100% tertutup**. Titik create `D.products`/
`D.produsen` yang masih bypass SSOT di alur Import/Export CSV & inline
modal (4+ file, pola tidak seragam) adalah kandidat paling masuk akal
untuk sesi berikutnya kalau user meminta lanjut — TIDAK dikerjakan/
dirancang sesi ini.

**BERHENTI di sini. Tidak ada implementasi/roadmap Modul 10 yang
dibuat/dikerjakan sesi ini.**
