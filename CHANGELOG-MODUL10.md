# Changelog — Sesi 368 (Modul 10 — Produsen Inline-Create Mutation Gate)

## Konteks

Lanjutan langsung dari Modul 9 (Sesi 367, weight-bulk-mutation-gate).
Instruksi user: gunakan FULL RELEASE ZIP terakhir
(`kw_release_sesi367_modul9-weight-bulk-mutation-gate_v1064.zip`) sebagai
baseline, audit singkat domain Shop, cari mutation point yang masih
bypass SSOT (direct write `D.*`/bypass Repository/Store/Mutation
Gate/validasi tersebar/nested mutation tanpa gate), kerjakan HANYA kalau
ada SATU kandidat yang benar-benar layak, additive, reuse
Repository/Store/Gate/validator existing, backward compatible, berhenti
setelah SATU modul.

## Audit (bagian dari implementasi)

Baseline v1064 (hasil Modul 9) sudah menutup: stock (`ProductRepository.
mutateStockDelta()`), create/update produk lewat form Etalase
(`ProductRepository.createProduct()`/`updateProduct()`), atribut fisik
termasuk `beratPerUnit` (Modul 9), supplier CRUD lewat form Produsen
(`SupplierStore.*`, Modul 7), kategori (`CategoryStore.*`, Modul 8).

Titik yang MASIH bypass SSOT (dicatat sebagai "Issue tersisa" di sesi
Modul 9, sekarang diaudit ulang satu per satu):

| Titik | File | Pola | Terisolasi? |
|---|---|---|---|
| **Produsen baru inline (prompt saat pilih dropdown produsen)** | `cobek-etalase.js` `Etalase.onProdusenChange()` **dan** `cobek-tx-cart.js` `onTxShopStockProdusenChange()` | `D.produsen.push({id:'prd_'+Date.now(),name,contact:'',note:''})` — **kode identik byte-for-byte di 2 file** | ✅ YA — 1 pola, 1 gate (`SupplierStore.mutateCreate()`, SUDAH ADA sejak Modul 7), 2 call site |
| Produk/produsen baru dari CSV import | `shop-data-io-api.js`, `cobek-io.js` | Object literal beda bentuk per file (field CSV row-mapping berbeda dari field form), branch update JUGA bypass (`copyFields.forEach(f=>{product[f]=src[f]})` di `shop-data-io-api.js`, `pr.contact=r.kontak` mentah di `cobek-io.js`) | ❌ TIDAK — 2 file, pola tidak seragam, campur create+update, scope besar |
| Produk baru inline saat isi form Transaksi | `cobek-tx-cart.js` (fungsi lain, bukan yang di atas) | Object literal beda (field `it.isNew`/`it.kategoriInput` dari cart, bukan dari form modal) | ❌ TIDAK — pola beda dari 2 kandidat lain, digabung jadi modul terpisah |

Satu-satunya bypass yang benar-benar **1 pola terisolasi** (bukan
sekadar "1 file") adalah inline-create produsen: kode-nya SAMA PERSIS di
`cobek-etalase.js` dan `cobek-tx-cart.js` (jelas hasil copy-paste saat
pemecahan `cobek.js` lama), dan gate-nya (`SupplierStore.mutateCreate()`)
sudah ada, sudah dipakai `Produsen.save()`, dan `id` generator-nya SAMA
PERSIS literal lama (`'prd_'+Date.now()`) — jadi 0 risiko perubahan
perilaku. Dipilih sebagai Modul 10.

## Perubahan

### 1. `Etalase.onProdusenChange()` & `onTxShopStockProdusenChange()` dialihkan ke SSOT existing

`modules/shop/cobek-etalase.js` dan `modules/shop/cobek-tx-cart.js` —
**0 method baru** (murni wiring, gate `SupplierStore.mutateCreate()`
SUDAH ADA sejak Modul 7, cuma belum dipakai di 2 titik ini):

- Literal `{id:'prd_'+Date.now(),name:name.trim(),contact:'',note:''}`
  DIGANTI `SupplierStore.mutateCreate({name:name.trim(),contact:'',
  note:''})`, guard `typeof SupplierStore!=='undefined'` + fallback raw
  PERSIS SAMA literal lama (pola SAMA PERSIS seluruh gate Modul 3-9).
- `D.produsen.push(np)` TETAP di caller (mekanisme insert TIDAK berubah,
  sama keputusan Tahap 6 utk `ProductRepository.createProduct()` —
  Repository/Store PURE, caller yang push+save()).
- Validasi nama (wajib isi) TETAP di caller SEBELUM masuk gate (`if(name
  &&name.trim())`) — UX guard lama, bukan business logic gate ini,
  perilaku "kosong/batal ditolak" TIDAK berubah.

### 2. 7 test baru (`tests/produsen-inline-create-mutation-gate-mod10.test.js`)

- Integrasi (3): kedua call site benar-benar memanggil `SupplierStore.
  mutateCreate()` (di-spy); hasil `id`/`name`/`contact`/`note` identik
  perilaku lama; produsen lain di `D.produsen` tidak ikut berubah.
- Fallback (2): kedua fungsi tetap bekerja tanpa `SupplierStore` (guard
  `typeof`), literal PERSIS sama seperti sebelum Modul 10.
- Guard lama (2): prompt kosong/batal — 0 push ke `D.produsen`, gate 0
  kali dipanggil.

### 0 test lama diubah

## Yang SENGAJA tidak disentuh

1. Validasi nama wajib isi (`name&&name.trim()`) — UX guard lama, tetap
   di caller, BUKAN business logic gate ini.
2. Mekanisme `D.produsen.push(np)` — TETAP di caller (Repository/Store
   PURE, tidak push sendiri), sama keputusan Tahap 6.
3. Create produk/produsen dari CSV import (`shop-data-io-api.js`,
   `cobek-io.js`) — bypass SSOT juga, TAPI scope-nya 2 file dengan pola
   BERBEDA (row-mapping CSV vs form field) dicampur create+update, bukan
   1 pola terisolasi seperti kandidat Modul 10. Lihat §"Issue tersisa".
4. Create produk baru inline saat isi form Transaksi (`cobek-tx-cart.js`,
   fungsi berbeda dari yang di-gate sesi ini) — pola beda (field dari
   cart, bukan dari modal), di luar scope Modul 10.

## Hasil verifikasi

- `npm test` penuh: **2460 test (2453 lama + 7 baru), 2458 pass, 2
  gagal** — PERSIS 2 kegagalan pre-existing yang sama dari baseline
  Modul 9 (`dashHubNavigateToFeature`, tidak terkait Shop). **0 regresi
  baru.**
- `node scripts/build.js`: sukses. `APP_BUILD_VERSION` s391 -> s392,
  versi bundle numerik **v1064 -> v1065**.
- `node scripts/verify-bundle-freshness.js`: kedua bundle segar (hash
  source cocok).
- Perubahan terkonfirmasi masuk `app-bundle-a.min.js` (2 kemunculan
  komentar penanda `Modul 10 — inline`).

## Mutation point — SEBELUM vs SESUDAH Modul 10

**Sebelum:** `D.produsen.push({id:'prd_'+Date.now(),...})` ditulis
mentah di 2 fungsi (`Etalase.onProdusenChange()`/
`onTxShopStockProdusenChange()`), 0 validasi lewat gate, bypass total
`SupplierStore` yang sudah ada untuk create produsen di jalur lain
(`Produsen.save()`).

**Sesudah:** kedua fungsi 100% lewat `SupplierStore.mutateCreate()`
(SSOT yang sama dgn jalur create `Produsen.save()`), fallback raw hanya
aktif kalau `SupplierStore` belum dimuat (jaga urutan load script, bukan
celah baru — SAMA prinsip seluruh gate Modul 3-9).

## Environment sandbox

Sama seperti Modul 3-9 — `esbuild`/`eslint` tidak terpasang (tidak ada
akses jaringan di sandbox ini), bundle hasil build TIDAK diminifikasi
tapi 100% valid (`node --check` + `verify-bundle-freshness.js` lolos).

## Issue tersisa

Domain Shop **BELUM 100% tertutup** — 2 kandidat lain masih bypass SSOT:

1. Create produk/produsen dari CSV import (`shop-data-io-api.js`,
   `cobek-io.js`) — 2 file, pola row-mapping berbeda dari form, branch
   UPDATE juga masih bypass (assignment field mentah, bukan lewat
   `ProductRepository.updateProduct()`/`SupplierStore.mutateUpdate()`).
   Kandidat paling masuk akal berikutnya, tapi perlu dipecah lagi jadi
   sub-langkah (produk vs produsen, create vs update) supaya tetap
   "additive kecil, satu modul".
2. Create produk baru inline saat isi form Transaksi (`cobek-tx-cart.js`,
   fungsi `applyBundleLinkedStock`/sekitarnya) — pola field dari cart
   (`it.isNew`, `it.kategoriInput`), berbeda dari form modal Etalase.

**Sesuai instruksi: BERHENTI di sini. Tidak ada implementasi/roadmap
Modul 11 yang dibuat/dikerjakan sesi ini.**
