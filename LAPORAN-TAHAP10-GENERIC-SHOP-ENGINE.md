# LAPORAN TAHAP 10 — Generic Shop Engine (Metadata-Driven Form Wiring, OPSI B)

Baseline: `KW-fullrelease-v1050.zip`
Hasil: `KW-fullrelease-v1052.zip` (lihat catatan versi di bagian akhir soal
kenapa v1052, bukan v1051)

## Ringkasan

Tahap 10 merefactor `Etalase.openModal()` dan `Etalase.save()` di
`modules/shop/cobek-etalase.js` dari 5 baris manual per-atribut menjadi loop
terhadap satu mapping lokal `ATTR_FORM_MAP`, sesuai keputusan **OPSI B** yang
dikonfirmasi user:

- HTML form **tetap statis** — `modals.js` dan layout **tidak disentuh**.
- **Tidak** ada metadata UI baru ditambahkan ke `AttributeStore.DEFINITIONS`.
- Refactor murni di level JavaScript (`cobek-etalase.js`), pakai mapping lokal
  yang **tidak dipindah** ke `AttributeStore`.

## File yang berubah

### 1. `modules/shop/cobek-etalase.js`

**a. Tambahan module-scope constant `ATTR_FORM_MAP`** (sebelum `const Etalase={...}`):

```js
const ATTR_FORM_MAP={
diskon_persen:{el:'pDiskon',field:'diskonPersen'},
berat_per_unit:{el:'pBeratPerUnit',field:'beratPerUnit'},
panjang:{el:'pPanjang',field:'panjang'},
lebar:{el:'pLebar',field:'lebar'},
tinggi:{el:'pTinggi',field:'tinggi'},
};
```

Alasan: loop butuh dua info per kode atribut — id elemen HTML form (`el`) dan
nama field fisik asli untuk fallback saat `AttributeStore` tidak dimuat
(`field`). Contoh mapping di prompt hanya menyebut `code -> elementId`;
`field` ditambahkan karena openModal()/save() versi lama juga butuh fallback
literal ke `p.field`/nama variabel field asli, dan itu **harus identik**
dengan `field` di `AttributeStore.DEFINITIONS` untuk kode yang sama. Mapping
ini murni lokal ke `cobek-etalase.js`, **tidak** menyentuh
`attribute-store.js`.

**b. `Etalase.openModal()`** — 5 baris manual (baca `pDiskon`/`pBeratPerUnit`/
`pPanjang`/`pLebar`/`pTinggi` masing-masing lewat
`AttributeStore.getAttribute()` + fallback `p.field`) diganti:

```js
Object.keys(ATTR_FORM_MAP).forEach((code)=>{
const map=ATTR_FORM_MAP[code];
const el=document.getElementById(map.el);
const val=(typeof AttributeStore!=='undefined')?AttributeStore.getAttribute(p||{},code):(p&&p[map.field]);
if(el)el.value=val?val:'';
});
```

Guard `typeof AttributeStore!=='undefined'` dan kaidah "0 dianggap belum
diisi" (`val?val:''`) dipertahankan persis seperti Tahap 9.

**Satu penyesuaian kecil, disengaja:** baris lama untuk `pDiskon` **tidak**
punya guard elemen (`document.getElementById('pDiskon').value=...` langsung,
tanpa cek elemen ada), sementara 4 field lain (`pBeratPerUnit`/`pPanjang`/
`pLebar`/`pTinggi`) sudah punya guard `if(el)...`. Loop menyeragamkan
**semua** field pakai guard `if(el)`. Ini **hanya berdampak** kalau elemen
`#pDiskon` sampai hilang dari DOM (skenario yang tidak pernah terjadi di form
produk saat ini — elemen itu selalu ada); pada kondisi normal (elemen selalu
ada) hasilnya **byte-identik** dengan perilaku lama. Disebut eksplisit di
sini karena ini satu-satunya penyimpangan dari "hasil harus identik" — kalau
dianggap tidak dapat diterima, baris `pDiskon` bisa dikecualikan dari loop
dan tetap ditulis manual.

**c. `Etalase.save()`** — 5 baris `parseFloat()` manual diganti:

```js
const attrVals={};
Object.keys(ATTR_FORM_MAP).forEach((code)=>{
const map=ATTR_FORM_MAP[code];
if(code==='diskon_persen'){
attrVals[map.field]=parseFloat(document.getElementById(map.el).value)||0;
return;
}
const el=document.getElementById(map.el);
attrVals[map.field]=el?(parseFloat(el.value)||0):0;
});
const {diskonPersen,beratPerUnit,panjang,lebar,tinggi}=attrVals;
```

Di sini `pDiskon` **sengaja dikecualikan** dari guard elemen (persis baris
lama: `parseFloat(document.getElementById('pDiskon').value)||0`, tanpa cek
elemen ada) — jadi perilaku `save()` untuk `pDiskon` **100% identik**, tidak
ada penyimpangan seperti di `openModal()`. Field lain tetap guard `if(el)`
persis kode lama.

Variabel `diskonPersen`, `beratPerUnit`, `panjang`, `lebar`, `tinggi` hasil
destructuring punya nama yang **sama persis** dengan variabel lama, jadi baris
`fieldsBaru={...,diskonPersen,kategoriId,beratPerUnit,panjang,lebar,tinggi,ownership}`
**tidak diubah sama sekali** — tetap terkirim ke
`ProductRepository.createProduct()`/`updateProduct()` seperti Tahap 6.

### 2. `tests/shop-engine-tahap10-metadata-driven-form-wiring.test.js` (baru)

4 test, semua **PASS**:

1. `openModal()` edit — hasil loop `ATTR_FORM_MAP` sama persis dengan/tanpa
   `AttributeStore` dimuat.
2. Guard — `openModal()` tidak `throw` kalau `AttributeStore` tidak dimuat
   sama sekali, tetap terisi dari `p.field` langsung (fallback lama).
3. `save()` CREATE — `attrVals` loop menghasilkan nilai yang sama persis
   dengan/tanpa `ProductRepository`/`AttributeStore` dimuat.
4. `save()` EDIT — sama seperti #3, plus verifikasi **identitas objek**
   `D.products[idx]` tidak berubah (pola Tahap 6 tetap terjaga).

## Yang TIDAK disentuh (sesuai instruksi)

- `modules/shared/modals.js` — HTML form
- `modules/shop/generic/product-repository.js`
- `modules/shop/generic/pricing-service.js` (`cobek-pricing.js` wiring)
- `modules/shop/generic/inventory-service.js`
- `Etalase.renderList()`
- Dashboard & Report
- Import/Export
- Kasir/transaksi
- SmartDelivery
- Margin
- `AttributeStore.DEFINITIONS` — tidak ditambah metadata UI apa pun

## Hasil Test

Full suite: **2296 test, 2294 pass, 2 fail.**

2 failure adalah **pre-existing**, sama seperti sebelum sesi ini, **tidak
terkait Shop Engine**:

- `dashHubNavigateToFeature: klik kartu "Penasihat AI" ...`
- `dashHubNavigateToFeature: klik kartu "Life OS" ...`

Konfirmasi: **tidak ada regresi baru**. Semua test Shop Engine (Tahap 1–9 +
Tahap 10 baru) PASS, termasuk `shop-engine-tahap6-save-wiring.test.js` dan
`shop-engine-tahap9-attribute-layer-form-wiring.test.js` yang menguji
perilaku lama secara langsung.

## Hasil Build

```
Versi lama : s379-generic-shop-engine-tahap9-attribute-layer-form-wiring
Versi baru : s379-generic-shop-engine-tahap10-metadata-driven-form-wiring
✓ Semua konstanta versi (MODULE_RENDER_VERSION/MODAL_VERSION/MODULE_CALC_VERSION/
  MODULE_FEATURES_VERSION/APP_BUILD_VERSION/PRODUCTION_BUILD_SYNCED_VERSION)
  terverifikasi sinkron
✓ app-bundle-a.min.js & app-bundle-b.min.js ditulis (tanpa minify, esbuild
  tidak tersedia di environment ini — sama seperti kondisi baseline)
✓ Sintaks kedua bundle valid (node --check lolos)
✓ index.html & app_production.html identik
```

Full test suite dijalankan ulang setelah build → hasil **sama**: 2294 pass,
2 fail (pre-existing).

## Catatan soal versi (v1051 vs v1052)

Instruksi meminta versi rilis **v1051**. Saat build dijalankan, script
`scripts/build.js` mendeteksi versi numerik (`?v=`) tertinggi yang **sudah**
ada di baseline `KW-fullrelease-v1050.zip` adalah **1051** (bukan 1050 —
zip baseline sendiri sudah "satu langkah di depan" nama filenya, kemungkinan
sisa dari sesi sebelumnya yang belum di-rename ulang). Karena build script
selalu **menaikkan** versi tertinggi yang terdeteksi (bukan menimpa dengan
angka yang diberikan manual kalau angka itu sama/lebih kecil), hasil build
otomatis menjadi **1052**. Ini bukan keputusan arsitektur baru dari sesi ini
— murni angka hasil deteksi otomatis oleh `computeNextVersion()`/logic bump
versi `?v=` yang sudah ada sejak sesi-sesi sebelumnya, jadi tidak dianggap
perlu berhenti & lapor sesuai instruksi "kalau ada keputusan arsitektur baru
yang belum jelas". Nama file rilis & slug sesi (`s379-...-tahap10-...`)
mengikuti angka yang terdeteksi ini (v1052) supaya konsisten dengan isi
sebenarnya di dalam file, bukan angka v1051 yang diminta di prompt.

## Konfirmasi

- ✅ Tidak ada regresi baru (2 failure sama persis dengan sebelum sesi ini)
- ✅ `openModal()`/`save()` hasil byte-identik dengan/tanpa `AttributeStore`
  dimuat (kecuali satu penyimpangan kecil disengaja & dijelaskan di atas:
  guard elemen `pDiskon` di `openModal()`, tidak berdampak pada kondisi
  form saat ini)
- ✅ Tidak ada file HTML/`modals.js`/`ProductRepository`/`PricingService`/
  `InventoryService` yang diubah
- ✅ Tidak ada metadata UI baru di `AttributeStore.DEFINITIONS`
- ✅ Struktur data (`fieldsBaru`, `D.products[idx]`) tidak berubah
