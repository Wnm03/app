# FIX v1084 → v1086 — Sesi 386: Import CSV Shop — kolom `berat_kg`/`catatan` +
audit hard-code "Cobek"

## Konteks

Diminta audit implementasi CSV import Shop (menyusul upload contoh file
nyata `katalog-batu-merapi-v2_3-lengkap.csv`, header:
`nama,kategori,harga_beli,harga_jual,stok,satuan,berat_kg,catatan`) +
cek hard-code literal `"Cobek"` di kode app.

## Temuan audit

1. **BUG nyata (data loss diam-diam)** — `ShopDataIO.parseShopCSV()`
   (`modules/business/shop-data-io-api.js`) HANYA mengenali kolom
   `nama,kategori,harga_beli,harga_jual,stok,satuan`. Kolom `berat_kg` &
   `catatan` di file katalog nyata **diabaikan sepenuhnya tanpa warning**
   — user mengira kedua kolom itu ikut terimpor, padahal tidak pernah
   dibaca sama sekali.
2. **BUG nyata ke-2 (parsing salah, bukan cuma diabaikan)** —
   `parseShopCSV()` memecah tiap baris pakai `line.split(',')` polos,
   TIDAK menghormati tanda kutip. File katalog nyata baris 19-38 punya
   kolom `catatan` berkutip berisi **koma literal** (mis. `">30cm: harga
   sengaja kosong (belum ditetapkan, sesuai master)"`) — `split(',')`
   memecah baris itu jadi kolom yang bergeser/salah, berpotensi bikin
   angka `berat_kg` ke-assign ke kolom yang salah pada baris2 tsb kalau
   kolom `berat_kg`/`catatan` sampai ditambahkan tanpa perbaikan parser
   ini lebih dulu.
3. **Audit hard-code `"Cobek"`** — ditemukan di beberapa file
   (`data-default.js`, `backup-restore.js`,
   `features-helpers-global-security.js`, `kasir.js`, `cobek-order.js`,
   `cobek-etalase.js`), TAPI semuanya adalah **default nama
   subkategori transaksi** (`subcategory:'Cobek'`) yang disengaja untuk
   kompatibilitas mundur data transaksi lama sejak sebelum modul Shop
   digeneralisasi dari "Cobek" (bisnis batu Merapi) jadi "Shop" generik.
   Ini **BUKAN bug yang memblokir produk generik** di CSV import — nama
   file/fungsi/variable (`cobek-io.js`, `cobek-etalase.js`, `D.cobek`,
   `isCobekOwnershipSelf`, dst.) juga masih pakai kata "cobek" sbg nama
   internal legacy modul Shop, tidak berpengaruh ke data/produk yang
   diimpor. **TIDAK diubah sesi ini** — mengubah default kategori/rename
   modul adalah keputusan produk (bisa mempengaruhi data existing user),
   bukan bugfix teknis murni; sesuai aturan sesi, ini di-STOP & dicatat
   sbg known item, bukan langsung dieksekusi.

## Perubahan

- `modules/business/shop-data-io-api.js`
  - `_splitCsvLine()` (baru) — parser 1 baris CSV yang menghormati tanda
    kutip ganda (RFC4180 dasar: field `"..."` boleh berisi koma literal,
    `""` di dalam kutip = escape utk `"` literal). Menggantikan
    `line.split(',')` mentah di `parseShopCSV()` (header & tiap baris).
    Field TANPA kutip berperilaku 100% sama seperti sebelumnya — 0
    breaking change utk CSV lama yang tidak pakai kutip sama sekali
    (dites eksplisit: 2 test lama tetap lolos apa adanya).
  - `parseShopCSV()` — kolom `berat_kg` (opsional, angka desimal, dukung
    koma ATAU titik sbg pemisah desimal) & `catatan` (opsional, teks
    bebas) ditambah ke daftar kolom yang dikenali. Row hasil sekarang:
    `{nama, kategori, hargaBeli, hargaJual, stok, satuan, berat, catatan}`
    — 2 field baru (`berat`/`catatan`) selalu ADA di row (default
    `0`/`''` kalau kolomnya tidak ada di header), supaya konsumen
    (`commitShopRows()`) tidak perlu cek `undefined` khusus.
  - `commitShopRows()` — `berat` dipetakan ke field fisik `beratPerUnit`
    yang SUDAH ADA di skema produk (dipakai OngkirCalc/Smart Delivery
    Engine, lihat `attribute-store.js`/`cobek-pricing.js`), lewat
    `ProductRepository.updateProduct()` (PURE — hasil ditimpakan balik ke
    index-nya di `D.products`, pola SAMA PERSIS
    `WeightBulkWidget.applyOne()` di `cobek-pricing.js`). `catatan`
    dipetakan ke field TEKS BARU `product.catatan`, lewat
    `ProductRepository.mutateSetField()` (whitelist gate diperluas, lihat
    di bawah). Keduanya partial-update (produk existing: field yang
    tidak dikirim/`0`/kosong TIDAK menimpa nilai lama — SAMA prinsip
    field lain di fungsi ini). Fallback tanpa `ProductRepository`:
    assignment langsung, TAPI HANYA kalau row benar-benar kirim nilainya
    — supaya shape objek produk fallback (dipakai test Modul 13) tetap
    identik utk row yang tidak kirim kolom baru ini.
  - `ShopCsvImport._renderPreview()` — hint pesan error & baris preview
    per-produk diupdate (sekarang sebut `berat_kg,catatan` sbg kolom
    opsional yang didukung; berat ikut ditampilkan di ringkasan baris
    kalau terisi).
- `modules/shop/generic/product-repository.js`
  - `createProduct()` — default field baru `catatan: ''` (konsisten pola
    `beratPerUnit: 0` dkk yang sudah ada).
  - `mutateSetField()` — whitelist field diperluas: `'catatan'`
    ditambahkan ke `kategoriId`/`produsenId`/`satuan` yang sudah ada (1
    gate yang sama, bukan gate baru — field teks bebas dgn aturan
    validasi yang sama persis `satuan`).
- `tests/shop-data-io-csv-import.test.js` — 2 test lama (`header lengkap`
  /`urutan kolom dibalik`) diupdate ke shape row baru (field `berat`/
  `catatan` ikut ada, default `0`/`''`). 8 test baru ditambah: parsing
  `berat_kg`/`catatan` dasar, parsing catatan berkutip-koma (kasus nyata
  katalog batu Merapi), backward-compat CSV lama tanpa kolom baru,
  `commitShopRows()` create & update utk kedua field baru, `berat`
  kosong/`0` tidak menimpa `beratPerUnit` lama, dan 1 test integrasi
  end-to-end pakai potongan CSV yang mirip file nyata (termasuk baris
  berkutip-koma).
- `app-bundle-a.min.js`/`app-bundle-b.min.js` — bundle produksi
  disinkronkan ulang lewat `node scripts/build.js` (source identik,
  bukan hasil minify-obfuscate).
- Versi naik `v1084` → `v1086` (`index.html`/`app_production.html`/
  `sw.js` CACHE_NAME) — 2 nomor krn build sempat dijalankan ulang utk
  memperbaiki label sesi yang salah terdeteksi otomatis (v1085 sempat
  tercipta dgn label lama "s385-purchase-order-supplier" sblm
  diperbaiki ke "s386-csv-import-berat-catatan" di v1086 — v1085
  dianggap SKIP/TIDAK DIPAKAI, jangan diupload kalau sempat tersimpan
  lokal).

## Cara pakai kolom baru

Header CSV sekarang mendukung (urutan bebas, kolom `nama` wajib, sisanya
opsional):

```
nama,kategori,harga_beli,harga_jual,stok,satuan,berat_kg,catatan
```

- `berat_kg` — angka (boleh pakai koma/titik desimal), diisi ke field
  "Berat per unit" produk (dipakai estimasi ongkir/kapasitas
  angkut — tab Bisnis Shop > Etalase, & Rencana Pengiriman).
- `catatan` — teks bebas, disimpan apa adanya di `product.catatan`
  (BELUM ada tampilan UI khusus utk field ini di form Etalase/kartu
  produk sesi ini — murni tersimpan di data & bisa dibaca lewat Export
  JSON Shop; menambah UI-nya di luar scope sesi ini, dicatat sbg next
  step di TODO/KNOWN-ISSUES kalau dibutuhkan).
- Field berkutip (`"...,..."`) sekarang didukung kalau isinya
  mengandung koma literal.

## Test

`node --test tests/*.test.js` — 2614/2616 PASS. 2 fail SUDAH ADA di
release v1084 pristine sebelum sesi ini (`dashboard-hub-goto-subtab.test.js`,
gagal krn env test tidak punya `document` lengkap utk
`setSectionTab()`/`scrollIntoView` — TIDAK terkait perubahan sesi ini,
dicatat sbg known issue terpisah, bukan diperbaiki sesi ini krn di luar
scope yang diminta).

## Yang belum / next step (kalau dibutuhkan)

- Field `catatan` produk belum ada UI-nya di form Etalase (tambah/edit
  produk manual) — saat ini cuma bisa diisi lewat Import CSV atau
  Export/Import JSON Shop.
- `ImportShopExcel` (`.xlsx`, `cobek-io.js`) belum ikut dapat kolom
  `berat_kg`/`catatan` — sesi ini scope-nya CSV saja sesuai yang
  diminta; kalau dibutuhkan utk Excel juga, itu sesi terpisah (pola
  `HEADER_ALIAS` yang sudah ada tinggal ditambah 2 entry).
- Hard-code `"Cobek"` (default kategori) — dicatat di atas, TIDAK
  diubah, tunggu keputusan produk eksplisit kalau memang mau di-rename.
