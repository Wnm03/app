# Changelog — Sesi 364 (Modul 6 — Product Repository: Nested Attribute
# Mutation Gate)

## Konteks

Lanjutan langsung dari Modul 5 (Sesi 363, attribute-mutation-gate). Target
Modul 6 (dikonfirmasi user): tutup SEMUA sisa mutasi nested Product
(`hargaByProdusen` — object/map di dalam satu produk) yang masih bypass
`ProductRepository`, PLUS 1 issue tersisa yang sudah eksplisit dicatat di
`CHANGELOG-MODUL5.md` §"Issue tersisa untuk Modul 6": `kategoriId`/
`produsenId` di alur restock kasir (`cobek-tx-cart.js`
`applyTxShopStockFromTx()`) yang belum digate karena beda domain review dari
fokus Modul 3-5 (import/form).

## Audit awal (bagian dari implementasi, bukan sesi terpisah)

Grep ulang `hargaByProdusen` ke seluruh `modules/` (bukan diasumsikan dari
`CHANGELOG-MODUL5.md`), dikonfirmasi manual titik TULIS (bukan baca) ke
struktur nested ini:

| File | Fungsi | Operasi |
|---|---|---|
| `cobek-order.js` | `Produsen.saveHarga()` | SET (`val>0`) **ATAU** DELETE (`else`) — satu-satunya titik yang punya cabang delete |
| `cobek-tx-cart.js` | `applyTxShopStockFromTx()` | SET-only (caller sudah guard `it.hargaBeli>0` sebelum menulis) |
| `cobek-etalase.js` | `Etalase.save()` | SET-only (caller sudah guard `hargaBeli>0` sebelum menulis) |

Titik BACA (`p.hargaByProdusen[...]` tanpa assignment — `purchase-engine.js`,
`cobek-order.js` render list, `cobek-tx-cart.js` autofill harga saat pilih
produsen, `business-intelligence-presenter.js`) TIDAK termasuk scope (bukan
mutasi) — 0 perubahan.

`kategoriId`/`produsenId` di `cobek-tx-cart.js` `applyTxShopStockFromTx()`:
dikonfirmasi 3 titik assignment mentah tersisa (2x `kategoriId`, 1x
`produsenId`) di luar object-literal pembuatan produk baru (yang TIDAK
disentuh — identitas produk baru, bukan mutasi produk existing).

## Perubahan

### 1. `ProductRepository` — Nested Attribute Mutation Gate (2 method baru)

`modules/shop/generic/product-repository.js`:

- **`mutateSetHargaProdusen(product, produsenId, value)`** (baru) — GATE SET
  utk nested map `hargaByProdusen`. Key (`produsenId`) divalidasi lewat
  `validateTextValue()` YANG SUDAH ADA (reuse persis, Modul 5 — 0 duplikasi
  validasi teks baru); value (harga) divalidasi lewat `validatePriceValue()`
  YANG SUDAH ADA (reuse persis, Modul 4 — 0 duplikasi validasi harga baru,
  aturan sama: finite, diklem `>=0`). Map `hargaByProdusen` DIBUAT kalau
  belum ada (dipindah dari pola `if(!product.hargaByProdusen)
  product.hargaByProdusen={}` yang sebelumnya diulang di ke-3 call site).
  Fail-safe: key/value tidak valid -> map TIDAK disentuh sama sekali (bukan
  partial write, bukan bikin map kosong kalau mutasi gagal).
- **`mutateDeleteHargaProdusen(product, produsenId)`** (baru) — GATE DELETE
  utk nested map yang sama. Idempotent (hapus key yang memang tidak ada
  tetap `ok:true`, sama perilaku `delete` JS native).
- 2 method dipisah (bukan 1 method dgn flag set/delete) supaya tiap call
  site tetap eksplisit soal niatnya — pola sama `mutateStockDelta()` vs
  `mutateSetStock()` (2 gate beda niat utk struktur data yang sama).

Semua method baru 100% ADDITIVE ke file yang sama — 0 method Modul 3/4/5
yang ditulis ulang.

### 2. 6 titik mutasi dialihkan ke gate (3 file)

| File | Fungsi | Field | Sebelum |
|---|---|---|---|
| `cobek-order.js` | `Produsen.saveHarga()` | `hargaByProdusen[key]` (SET) | `p.hargaByProdusen[this.hargaEditId]=val;` |
| `cobek-order.js` | `Produsen.saveHarga()` | `hargaByProdusen[key]` (DELETE) | `delete p.hargaByProdusen[this.hargaEditId];` |
| `cobek-tx-cart.js` | `applyTxShopStockFromTx()` | `kategoriId` (produk existing, cabang isNew) | `product.kategoriId=kategoriId;` |
| `cobek-tx-cart.js` | `applyTxShopStockFromTx()` | `kategoriId` (produk existing, cabang non-new) | `product.kategoriId=resolveShopKategori(it.kategoriInput);` |
| `cobek-tx-cart.js` | `applyTxShopStockFromTx()` | `produsenId` | `product.produsenId=it.produsenId;` |
| `cobek-tx-cart.js` | `applyTxShopStockFromTx()` | `hargaByProdusen[key]` (SET) | `product.hargaByProdusen[it.produsenId]=it.hargaBeli;` |
| `cobek-etalase.js` | `Etalase.save()` | `hargaByProdusen[key]` (SET) | `product.hargaByProdusen[produsenId]=hargaBeli;` |

(7 titik disebut — 6 field distinct di 3 file sesuai tabel §"Pekerjaan"
instruksi, `kategoriId` dihitung 2x karena 2 cabang kode terpisah dgn
sumber value beda.)

Semua titik memakai guard `typeof ProductRepository!=='undefined'` +
fallback ke assignment mentah lama — pola SAMA PERSIS Modul 3/4/5, 0
perubahan perilaku kalau modul tidak dimuat. `kategoriId`/`produsenId` di
`cobek-tx-cart.js` memakai `mutateSetField()` YANG SUDAH ADA (Modul 5) —
BUKAN gate baru, cuma wiring (sesuai instruksi "reuse seluruh helper Modul
3, 4, dan 5").

**Satu edge-case dipertahankan RAW dgn sengaja** (0 perubahan perilaku):
`cobek-tx-cart.js` cabang `else if(product&&it.kategoriInput)` — kalau
`resolveShopKategori(it.kategoriInput)` balikin `''` (terjadi kalau
`kategoriInput` whitespace-only setelah `.trim()` — lihat definisi
`resolveShopKategori()`), kode LAMA tetap menimpa `kategoriId` jadi `''`
(assignment mentah, bukan biarkan value lama). `mutateSetField()` menolak
string kosong (fail-safe by design, Modul 5) — kalau dipaksa lewat gate di
kasus ini, `kategoriId` LAMA akan tetap bertahan, BEDA dari perilaku lama.
Supaya 0 perubahan perilaku di edge-case ini (instruksi eksplisit
"pertahankan seluruh perilaku lama"), assignment mentah dipertahankan
KHUSUS utk cabang `kat===''` ini — didokumentasikan inline di source.

### 3. Di luar scope sesi ini (dicek eksplisit, SENGAJA tidak disentuh)

- **`purchase-engine.js`/`cobek-order.js` (render)/`cobek-tx-cart.js`
  (autofill)/`business-intelligence-presenter.js` — baca
  `hargaByProdusen[...]`.** Jalur BACA, bukan mutasi. 0 perubahan.
- **`backup-restore.js`/`features-helpers-global-security.js` —
  `if(!p.hargaByProdusen)p.hargaByProdusen={}` (migrasi schema/init default
  saat load data lama).** Bukan tulis NILAI ke dalam map (cuma pastikan map
  itu sendiri ada sebagai object kosong) — beda kategori dari "mutasi
  nested value" yang jadi target gate ini. 0 perubahan.
- **`cobek-tx-cart.js` — `kategoriId`/`produsenId` di object literal
  pembuatan produk BARU** (`product={id:...,kategoriId,produsenId:
  it.produsenId,hargaByProdusen:{}}`). Ini identitas produk baru (SAMA
  kategori dgn `createProduct()`/`Etalase.save()` cabang produk baru yang
  TIDAK digate sejak Modul 3/4/5 — bukan "mutasi field existing", field
  belum pernah ada sebelumnya di objek ini). 0 perubahan.

## Test

- **Baru**: `tests/product-repository-nested-mutation-gate-mod6.test.js` —
  17 test baru:
  - 10 unit: `mutateSetHargaProdusen()`/`mutateDeleteHargaProdusen()` —
    create (map belum ada), update (key sudah ada), overwrite (key lain di
    map yang sama tidak terganggu), delete (key ada), delete idempotent
    (key tidak ada), invalid key (kosong/whitespace/null/undefined/angka),
    invalid value (NaN/Infinity/string/undefined), value `null` ditolak
    (BEDA dari `hargaReseller` — di sini `null` BUKAN "belum diisi"),
    negatif diklem ke 0, produk tidak valid (null/array/primitif), 1 test
    "rollback bila gagal" (beberapa gate dipanggil beruntun termasuk 1
    panggilan gagal di tengah — pastikan TIDAK merusak state nested MAUPUN
    skalar field lain di produk yang sama).
  - 7 integrasi: `cobek-order.js` `Produsen.saveHarga()` (SET & DELETE,
    2 test terpisah), `cobek-tx-cart.js` `applyTxShopStockFromTx()` (restock
    produk existing: kategoriId+produsenId+hargaByProdusen semua lewat
    gate; produk baru: tidak error, hargaByProdusen ke-set dari object
    literal awal), `cobek-etalase.js` `Etalase.save()` (SET hargaByProdusen
    lewat gate), 1 test "seluruh caller lama tetap bekerja" (ProductRepository
    SENGAJA tidak dimuat sama sekali — fallback mentah tetap jalan, guard
    `typeof` terverifikasi).
- **0 test lama diubah** (beda dari Modul 5 yang mengubah 1 assert Modul 4)
  — tidak ada perilaku lama yang berubah status "di luar scope" jadi
  "di dalam scope" sesi ini.
- **Regresi penuh** (`npm test`): 2411 test total (2394 baseline Modul 5 +
  17 baru), 2409 pass, 2 gagal — dikonfirmasi PERSIS 2 kegagalan
  pre-existing yang SAMA dari baseline Modul 5
  (`dashHubNavigateToFeature`, navigasi dashboard, tidak terkait
  Shop/ProductRepository sama sekali). **0 regresi baru dari Modul 6.**

## Build

- `node scripts/build.js` sukses → versi naik ke **v1061**
  (`s388-generic-shop-engine-tahap12-final-audit-final-release`).
  `app-bundle-a.min.js`/`app-bundle-b.min.js` ditulis ulang, lolos cek
  sintaks (`node --check`).
- `node scripts/verify-bundle-freshness.js` → ✓ kedua bundle segar (hash
  source cocok), aman deploy.
- **Catatan lingkungan (sama seperti Modul 4/5)**: `esbuild`/`eslint` tidak
  terpasang di sandbox sesi ini (tidak ada akses jaringan) — bundle hasil
  build TIDAK diminifikasi (lebih besar dari build ter-minify, tapi 100%
  valid, dikonfirmasi `verify-bundle-freshness.js` + `node --check`).
  Jalankan `npm install --save-dev esbuild eslint` di lingkungan dgn akses
  internet kalau minifikasi/lint penuh dibutuhkan sebelum deploy produksi.

## File yang berubah

Lihat `FILES-CHANGED.md` (diperbarui) untuk daftar lengkap + unified diff
source di `MODUL6-NESTED-MUTATION-GATE.diff` (bundle/HTML/sw.js/docs hasil
auto-generate `build.js` TIDAK disertakan di diff — cuma isi ulang otomatis
dari source).

## Issue tersisa untuk Modul 7

1. Tidak ada nested mutation Product lain yang teridentifikasi sesi ini —
   `hargaByProdusen` adalah satu-satunya struktur object/map di skema
   Product saat ini (dikonfirmasi lewat audit `createProduct()` default
   fields, Modul 4). Kalau skema Product menambah nested structure baru di
   masa depan, gate baru perlu didesain saat itu (pola
   `mutateSetHargaProdusen()`/`mutateDeleteHargaProdusen()` di sesi ini bisa
   jadi referensi/template).
2. Field `margin`/`barcode` (dicatat sejak Modul 5) masih belum ada sbg
   field tersimpan di skema produk — tetap tidak relevan sampai
   benar-benar ditambahkan.
