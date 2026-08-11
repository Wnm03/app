# Changelog — Sesi 363 (Modul 5 — Product Repository: Attribute Mutation Gate)

## Konteks

Lanjutan langsung dari Modul 4 (Sesi 362, price-mutation-gate). Target
Modul 5 (dikonfirmasi user): tutup SEMUA sisa mutasi atribut Product yang
masih bypass `ProductRepository`, fokus field yang eksplisit disebut user:
`hargaReseller`, `diskon` (`diskonPersen`), `margin`, `supplier`
(`produsenId`), `kategori` (`kategoriId`), `barcode`, `satuan`, plus atribut
lain yang masih ditulis mentah.

`hargaReseller` sendiri sudah dicatat sebagai known issue eksplisit di
`CHANGELOG-MODUL4.md` §"Known issue baru" — sesi ini menutup issue itu
PERSIS sesuai rekomendasi yang ditulis di sana (perluas `mutateSetPrice()`,
bukan gate terpisah, dengan penanganan `null` eksplisit).

## Audit awal (bagian dari implementasi, bukan sesi terpisah)

Sebelum menulis kode, titik mutasi mentah untuk tiap field diverifikasi
langsung di source (bukan diasumsikan dari dokumen lama):

| Field diminta | Field fisik nyata | Status ditemukan |
|---|---|---|
| `hargaReseller` | `hargaReseller` | Ditulis mentah — 2 titik (`shop-data-io-api.js`, `cobek-io.js`) |
| `diskon` | `diskonPersen` | Ditulis mentah, TANPA guard apapun — 1 titik (`cobek-io.js`) |
| `supplier` | `produsenId` | Ditulis mentah — 2 titik (`cobek-io.js`, `cobek-etalase.js`) |
| `kategori` | `kategoriId` | Ditulis mentah — 2 titik (`shop-data-io-api.js`, `cobek-io.js`) |
| `satuan` | `satuan` | Ditulis mentah — 1 titik (`shop-data-io-api.js`) |
| `margin` | — | **Tidak ada** sbg field tersimpan di skema produk — dihitung on-the-fly dari `hargaBeli`/`hargaJual` (`cobek-io.js`, laporan export) tiap dibutuhkan, bukan ditulis ke `D.products[]`. 0 titik mutasi, 0 perubahan skema dibuat sesi ini (di luar scope "mutasi bypass Repository" — tidak ada mutasi karena tidak ada penyimpanan). |
| `barcode` | — | **Tidak ada** sbg field di skema produk saat ini. 0 titik mutasi. Tidak ditambahkan field baru sesi ini (additive ke gate yang ADA, bukan menambah skema produk — di luar scope instruksi "jangan refactor besar"/"jangan membuat duplikasi logic" kalau field belum pernah dipakai di mana pun). |

Titik-titik mutasi `kategoriId`/`produsenId` lain yang SUDAH lewat jalur
form (`Etalase.save()` via `updateProduct()`, PURE, Tahap 4) atau cart
transaksional (`cobek-tx-cart.js`, restock) TIDAK termasuk temuan di atas —
lihat §"Di luar scope sesi ini" di bawah.

## Perubahan

### 1. `ProductRepository` — Attribute Mutation Gate (3 method baru + 1 field baru di gate lama)

`modules/shop/generic/product-repository.js`:

- **`mutateSetPrice(product, field, value)` DIPERLUAS** — `field` sekarang
  boleh juga `'hargaReseller'` (sebelumnya cuma `'hargaBeli'`/`'hargaJual'`).
  Beda perlakuan eksplisit: `value === null` UNTUK `hargaReseller` dianggap
  VALID ("reseller belum diisi", state yang sudah lama ada di data —
  default `hargaReseller: null` di `createProduct()`/titik pembuatan produk
  baru) — sedangkan `hargaBeli`/`hargaJual` TETAP menolak `null` seperti
  Modul 4 (0 perubahan perilaku utk 2 field itu, diverifikasi lewat test
  regresi khusus di test suite Modul 5).
- **`validateDiscountValue(value)`** (baru) — validasi bersama
  `diskonPersen`: harus angka finite, diklem `0..100` (persen, klem atas
  BARU dibanding `validatePriceValue()`/`validateStockValue()` yang cuma
  klem bawah — masuk akal karena ini persentase, bukan nilai uang/stok).
- **`mutateSetDiskon(product, value)`** (baru) — GATE in-place utk
  `diskonPersen`, pola identik `mutateSetStock()`. Menggantikan
  `p.diskonPersen=r.diskonPersen` yang SEBELUMNYA 0 validasi sama sekali
  (bukan cuma "belum digate" seperti field lain — literalnya tanpa guard
  apapun, `undefined`/`NaN` dari kolom import kosong langsung ketimpa).
- **`validateTextValue(value)`** (baru) — validasi bersama utk field
  id/teks (`kategoriId`/`produsenId`/`satuan`): harus string, non-kosong
  setelah `.trim()`. Ditolak: `null`/`undefined`/`NaN`/angka/string kosong/
  whitespace-only.
- **`mutateSetField(product, field, value)`** (baru) — SATU gate dipakai
  ke-3 field teks di atas (bukan 3 gate terpisah — instruksi eksplisit
  "hapus duplikasi validasi"/"jangan membuat duplikasi logic"), pola sama
  `mutateSetPrice()` (field whitelist + fail-safe: field tidak disentuh
  kalau value tidak valid).

Semua method baru 100% ADDITIVE ke file yang sama (tidak ada method Modul
3/4 yang ditulis ulang) — `mutateStockDelta()`/`mutateSetStock()`/
`validatePriceValue()`/`mutateSetPrice()`/`validateStockDelta()`/
`validateStockValue()` TIDAK disentuh selain perluasan whitelist field di
`mutateSetPrice()` yang disebut di atas.

### 2. 7 titik mutasi mentah dialihkan ke gate (3 file)

| File | Fungsi | Field | Sebelum |
|---|---|---|---|
| `modules/business/shop-data-io-api.js` | `ShopDataIO.commitShopRows()` | `hargaReseller` | `product.hargaReseller=r.hargaReseller;` |
| `modules/business/shop-data-io-api.js` | `ShopDataIO.commitShopRows()` | `satuan` | `product.satuan=r.satuan;` |
| `modules/business/shop-data-io-api.js` | `ShopDataIO.commitShopRows()` | `kategoriId` | `product.kategoriId=kategoriId;` |
| `modules/shop/cobek-io.js` | `ImportShopExcel.commit()` | `hargaReseller` | `p.hargaReseller=r.hargaReseller;` |
| `modules/shop/cobek-io.js` | `ImportShopExcel.commit()` | `diskonPersen` | `p.diskonPersen=r.diskonPersen;` (TANPA guard apapun sebelumnya) |
| `modules/shop/cobek-io.js` | `ImportShopExcel.commit()` | `kategoriId` | `p.kategoriId=kategoriId;` |
| `modules/shop/cobek-io.js` | `ImportShopExcel.commit()` | `produsenId` | `p.produsenId=produsenMatch.id;` |
| `modules/shop/cobek-etalase.js` | `Etalase.save()` | `produsenId` | `product.produsenId=produsenId;` |

(8 titik, bukan 7 — satu lebih banyak dari perkiraan awal: `produsenId` di
`cobek-etalase.js` ditemukan sesi ini, TIDAK tercatat di known issue Modul
4 manapun karena letaknya bukan di 2 titik commit import yang sudah
diaudit sebelumnya, melainkan di jalur form `Etalase.save()` — field ini
SENGAJA dipisah dari `fieldsBaru`/`updateProduct()` di kode aslinya karena
perlu `hargaByProdusen[produsenId]` diisi bersamaan, jadi tetap raw write
terpisah walau field lain di fungsi yang sama sudah lewat gate PURE sejak
Tahap 4.)

Semua 8 titik memakai guard `typeof ProductRepository!=='undefined'` +
fallback ke assignment mentah lama — pola SAMA PERSIS Modul 3/4, 0
perubahan perilaku kalau modul tidak dimuat. Nilai valid ditulis SAMA
PERSIS seperti sebelumnya (business logic 0 berubah, diverifikasi test
integrasi per titik); nilai korup (NaN/Infinity/string kosong/tipe salah)
SEKARANG ditolak alih-alih ditulis mentah — termasuk `diskonPersen` yang
SEBELUMNYA tidak punya proteksi apapun (bukan cuma "belum digate", tapi
betul-betul 0 validasi di titik itu).

### 3. Di luar scope sesi ini (dicek eksplisit, SENGAJA tidak disentuh)

- **`cobek-tx-cart.js` — `kategoriId`/`produsenId` di `applyTxShopStockFromTx()`
  (restock dari transaksi kasir).** Konteksnya BEDA dari commit
  import/form: field ini diisi dari item transaksi yang sudah divalidasi
  jalur kasir sendiri (`kategoriInput`→`resolveShopKategori()`,
  `it.produsenId` langsung dari data transaksi yang sudah tervalidasi saat
  transaksi dibuat), bukan data mentah dari file/paste eksternal. Menyentuh
  titik ini butuh memverifikasi ulang seluruh alur kasir→restock (risiko
  regresi jauh lebih tinggi dibanding 8 titik commit import/form di atas)
  — di luar "additive, jangan refactor besar" utk sesi ini. Direkomendasikan
  Modul 6 sbg sesi terpisah, KHUSUS alur kasir (beda domain review dari
  Import/Export & form produk yang jadi fokus Modul 3-5).
- **`cobek-etalase.js` — `product.hargaByProdusen[produsenId]=hargaBeli`.**
  Bukan mutasi field top-level Product (melainkan nested map per-supplier
  di dalam satu produk) — struktur beda dari semua gate yang ada
  (`mutateSetField()`/`mutateSetPrice()`/`mutateSetDiskon()` semua asumsi
  1 field = 1 value skalar, bukan map). Menggeneralisasi gate utk nested
  map adalah refactor baru (di luar "reuse helper Modul 3&4" — tidak ada
  pola existing utk struktur ini), dicatat sbg known issue Modul 6.
- **`backup-restore.js`** (baca-saja, CSV export dari `p.hargaReseller`/
  `p.diskonPersen` dll.) — TIDAK termasuk scope ("mutasi Product"), ini
  jalur BACA (export), bukan tulis. 0 perubahan.
- **`margin`/`barcode`** — lihat tabel audit di atas, tidak ada sbg field
  tersimpan, 0 titik mutasi ditemukan, 0 perubahan skema dibuat.

## Test

- **Baru**: `tests/product-repository-attribute-gate-mod5.test.js` — 20
  test baru:
  - 15 unit: `mutateSetPrice()` perluasan hargaReseller (valid/null-valid/
    NaN/Infinity/string/undefined/negatif-diklem, PLUS regresi eksplisit
    hargaBeli/hargaJual TETAP menolak null), `validateDiscountValue()`/
    `mutateSetDiskon()` (valid/klem 0../100/NaN/Infinity/string/null/
    produk-invalid), `validateTextValue()`/`mutateSetField()` (valid/trim/
    kosong/null/undefined/NaN/angka/whitespace-only/field-di-luar-
    whitelist/produk-invalid), 1 test "update berturut-turut" (beberapa
    gate dipanggil beruntun ke produk yang sama, termasuk 1 panggilan
    gagal di tengah — pastikan TIDAK merusak state field lain).
  - 5 integrasi: `commitShopRows()` (SET valid via gate + partial-update
    tetap terjaga utk field yang tidak dikirim), `ImportShopExcel.commit()`
    (SET valid via gate utk ke-4 field + tolak `diskonPersen` korup tanpa
    merusak field lain yang valid di row yang sama), `Etalase.save()`
    (SET `produsenId` via gate, dgn `resolveShopKategori`/`document` stub
    minimal krn harness `loadSource` tidak jalankan DOM sungguhan).
- **Regresi 1 test lama diperbarui** (bukan dihapus): test Modul 4
  `"field di luar scope (hargaReseller/stock/dll.) ditolak"` di
  `tests/product-repository-price-gate-mod4.test.js` DIUBAH jadi
  `"field di luar scope (mis. stock) ditolak"` — assert penolakan
  `hargaReseller` DIPINDAH ke test suite Modul 5 (karena sekarang field itu
  memang valid utk `mutateSetPrice()`, bukan lagi "di luar scope"). Ini
  SATU-SATUNYA modifikasi ke file test Modul 4, tidak ada assert lain yang
  diubah/dihapus (semua assert `hargaBeli`/`hargaJual` di file itu tetap
  utuh & tetap pass).
- **Regresi penuh** (`npm test`): 2394 test total (2374 baseline Modul 4 +
  20 baru), 2392 pass, 2 gagal — dikonfirmasi PERSIS 2 kegagalan
  pre-existing yang SAMA dari baseline Modul 4
  (`dashHubNavigateToFeature`, navigasi dashboard, tidak terkait
  Shop/ProductRepository sama sekali). **0 regresi baru dari Modul 5.**

## Build

- `node scripts/build.js` sukses → versi naik ke **v1060**
  (`s387-generic-shop-engine-tahap12-final-audit-final-release`).
  `app-bundle-a.min.js`/`app-bundle-b.min.js` ditulis ulang, lolos cek
  sintaks (`node --check`).
- `node scripts/verify-bundle-freshness.js` → ✓ kedua bundle segar (hash
  source cocok), aman deploy.
- **Catatan lingkungan (sama seperti Modul 4)**: `esbuild`/`eslint` tidak
  terpasang di sandbox sesi ini (tidak ada akses jaringan) — bundle hasil
  build TIDAK diminifikasi (lebih besar dari build ter-minify, tapi 100%
  valid, dikonfirmasi `verify-bundle-freshness.js` + `node --check`).
  Jalankan `npm install --save-dev esbuild eslint` di lingkungan dgn akses
  internet kalau minifikasi/lint penuh dibutuhkan sebelum deploy produksi.

## File yang berubah

Lihat `FILES-CHANGED.md` (diperbarui) untuk daftar lengkap + unified diff
source di `MODUL5-ATTRIBUTE-MUTATION-GATE.diff` (bundle/HTML/sw.js/docs
hasil auto-generate `build.js` TIDAK disertakan di diff — cuma isi ulang
otomatis dari source, lihat `git diff`/isi file langsung kalau perlu detail
byte-level).

## Issue tersisa untuk Modul 6

1. `cobek-tx-cart.js` — `kategoriId`/`produsenId` di alur restock kasir
   (`applyTxShopStockFromTx()`) belum digate, beda domain review (kasir,
   bukan import/form) dari Modul 3-5.
2. `product.hargaByProdusen[produsenId]=hargaBeli` (nested map per-supplier,
   `cobek-etalase.js`) — struktur data beda dari semua gate yang ada,
   butuh desain gate baru (bukan field skalar).
3. Kalau field `margin`/`barcode` suatu saat BENAR-BENAR ditambahkan ke
   skema produk (bukan cuma dihitung on-the-fly / belum ada), gate baru
   perlu ditambahkan saat itu — dicatat di sini supaya tidak lupa, TAPI
   TIDAK dikerjakan sesi ini krn field-nya sendiri belum ada.
