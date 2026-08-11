# Changelog — Sesi 366 (Modul 8 — Category Mutation Gate)

## Konteks

Lanjutan langsung dari Modul 7 (Sesi 365, supplier-mutation-gate).
Instruksi user: audit singkat FULL RELEASE ZIP terakhir
(`kw_release_sesi365_modul7-supplier-mutation-gate_v1062.zip`), pilih SATU
modul dengan dampak terbesar berdasarkan prioritas (mutation point bypass
SSOT / direct write ke `D.*` / validasi tersebar / nested mutation tanpa
gate / repository-store read-write tanpa gate), implementasikan penuh,
additive, reuse validator existing, backward compatible, berhenti setelah
SATU modul.

## Audit awal (bagian dari implementasi)

Grep seluruh titik TULIS ke `D.*` di `modules/` menunjukkan bahwa
infrastruktur mutation-gate (`ProductRepository`/`SupplierStore`, Modul
3-7) sejauh ini hanya menutup domain Shop generic
(`D.products`/`D.produsen`). Di dalam domain Shop generic yang sama,
`modules/shop/generic/category-store.js` masih PERSIS kondisi
`supplier-store.js` sebelum Modul 7: 100% pure read (`list()`/`find()`/
`label()`), **0 method tulis**, sedangkan `D.cobekKategori` ditulis mentah
tanpa validasi di 3 titik:

| File | Fungsi | Operasi |
|---|---|---|
| `cobek-tx-cart.js` | `resolveShopKategori(name)` | find-or-create by name (`D.cobekKategori.push(...)`), dipakai jalur Transaksi & import (`shop-data-io-api.js`/`cobek-io.js`) |
| `cobek-etalase.js` | `Etalase.addKategoriManual()` cabang edit | RENAME in-place (`kat.name=name`) |
| `cobek-etalase.js` | `Etalase.delKategori()` | DELETE (`D.cobekKategori=D.cobekKategori.filter(...)`) + sisi-efek clear `p.kategoriId` produk terkait |

Ini adalah mutation point paling langsung-comparable dengan pola Modul 7
(store generic yang sudah ADA tapi 0% ter-gate) — prioritas #5 ("Repository/
Store yang masih read-write tanpa mutation gate") sekaligus #2 ("Direct
write ke `D.*`"), dan risikonya kecil/terisolasi (1 field domain, 3 titik
panggil, sudah ada validator `ProductRepository.validateTextValue()` yang
tinggal di-reuse — SAMA PERSIS pola `SupplierStore._validateText()` Modul
7). Domain lain (`D.vehicles`, `D.transactions`, `D.accounts`, dll.) tidak
punya infrastruktur store/gate sama sekali — memulai gate di domain baru
berarti scope jauh lebih besar dari "satu modul", di luar prioritas sesi
ini.

## Perubahan

### 1. `CategoryStore` — Category Mutation Gate (3 method baru)

`modules/shop/generic/category-store.js`:

- **`mutateResolve(categories, name)`** (baru, PURE) — find-or-create by
  name, MENGGANTIKAN `resolveShopKategori()` mentah. Match nama
  case-insensitive PERSIS perilaku lama. `name` divalidasi via
  `_validateText()` (delegasi ke `ProductRepository.validateTextValue()`
  YANG SUDAH ADA — 0 duplikasi validasi baru, fallback lokal aturan
  identik kalau `ProductRepository` belum dimuat). id pakai generator
  PERSIS literal lama (`'ck_'+Date.now()+'_'+uid()`, fallback
  `Math.random()` suffix kalau `uid` global belum dimuat). Return
  `{ok:true, categories, id, created}` (array BARU kalau kategori dibuat,
  array ASLI dikembalikan apa adanya kalau reuse existing) atau
  `{ok:false, reason}`.
- **`mutateRename(category, name)`** (baru, in-place) — edit nama kategori
  existing. `name` wajib valid (fail-safe: kalau tidak valid, category
  TIDAK disentuh sama sekali). Cek bentrok nama (duplikat) TETAP di
  caller (`Etalase.addKategoriManual()`, business logic UX lama — bukan
  validasi gate ini, sama semangat guard `km<=0` di caller untuk
  `SupplierStore.mutateSetRoute()` Modul 7).
- **`mutateDelete(categories, id)`** (baru, PURE) — balikin ARRAY BARU
  hasil filter (input TIDAK dimutasi), idempotent. `id` divalidasi via
  `_validateText()` yang sama.

Sisi-efek `p.kategoriId=''` di `Etalase.delKategori()` SENGAJA TIDAK
dialihkan ke `ProductRepository.mutateSetField()` — alasan PERSIS
`SupplierStore.mutateDelete()` Modul 7 untuk `p.produsenId=''`:
`mutateSetField()` mewajibkan teks non-kosong (Modul 5), memaksanya lewat
gate itu berarti mengubah perilaku (field TIDAK akan ter-clear lagi),
di luar instruksi sesi ini. Dibiarkan raw dengan sengaja, didokumentasikan
inline di titik panggil.

### 2. 3 titik mutasi dialihkan ke gate

- `modules/shop/cobek-tx-cart.js` — `resolveShopKategori()` lewat
  `CategoryStore.mutateResolve()`.
- `modules/shop/cobek-etalase.js` — `Etalase.addKategoriManual()` cabang
  edit lewat `CategoryStore.mutateRename()`.
- `modules/shop/cobek-etalase.js` — `Etalase.delKategori()` lewat
  `CategoryStore.mutateDelete()`.

Semua pakai guard `typeof CategoryStore!=='undefined'` + fallback logic
lama PERSIS, SAMA pola 3 titik yang di-wire Modul 7.

### 3. 16 test baru (`tests/category-mutation-gate-mod8.test.js`)

- Unit (A): `mutateResolve()`/`mutateRename()`/`mutateDelete()` — create,
  reuse-existing (case-insensitive), purity (input tidak dimutasi),
  nama tidak valid ditolak, id tidak ketemu tetap idempotent, argumen
  tidak valid (`null`/array/primitif), plus 1 test read-path lama
  (`list()`/`find()`/`label()`) tetap utuh.
- Integrasi (B): 3 titik yang di-wire benar-benar memanggil method gate
  (di-spy), hasil akhir `D.cobekKategori`/sisi-efek `D.products` identik
  business logic lama.
- Fallback (C): caller lama tetap bekerja tanpa `CategoryStore` (guard
  `typeof`).

### 0 test lama diubah

Tidak ada perilaku lama yang berubah status di scope sesi ini.

## Yang SENGAJA tidak disentuh

1. `p.kategoriId=''` di `Etalase.delKategori()` — mutasi Product, dibiarkan
   raw (lihat §1 di atas), PERSIS pola `p.produsenId=''` Modul 7.
2. Cek bentrok nama duplikat di `addKategoriManual()` — business logic UX
   lama, tetap di caller.
3. `CategoryStore.list()`/`find()`/`label()` — method baca existing sejak
   Tahap 1, tidak disentuh.

## Hasil verifikasi

- `npm test` penuh: **2447 test (2431 lama + 16 baru), 2445 pass, 2 gagal**
  — PERSIS 2 kegagalan pre-existing yang sama dari baseline Modul 7
  (`dashHubNavigateToFeature`, tidak terkait Shop). **0 regresi baru.**
- `node scripts/build.js`: sukses. `APP_BUILD_VERSION` naik
  `s389-generic-shop-engine-tahap12-final-audit-final-release` →
  `s390-generic-shop-engine-tahap12-final-audit-final-release`; versi
  bundle numerik naik **v1062 → v1063**.
- `node scripts/verify-bundle-freshness.js`: kedua bundle segar (hash
  source cocok).

## Environment sandbox

Sama seperti Modul 4-7 — `esbuild`/`eslint` tidak terpasang (tidak ada
akses jaringan di sandbox ini), bundle hasil build TIDAK diminifikasi
tapi 100% valid (`node --check` + `verify-bundle-freshness.js` lolos).

## Issue tersisa

Domain Shop generic (`D.products`/`D.produsen`/`D.cobekKategori`) kini
punya mutation gate penuh (`ProductRepository`/`SupplierStore`/
`CategoryStore`). Domain lain di luar Shop (`D.vehicles`,
`D.transactions`, `D.accounts`, `D.bills`, `D.assets`, dll.) TIDAK punya
infrastruktur store/gate sama sekali — kalau mau dilanjutkan, itu scope
modul baru yang jauh lebih besar (bangun store dari nol, bukan menambah
gate ke store yang sudah ada), di luar prioritas "dampak terbesar,
additive kecil" sesi ini.

**Sesuai instruksi: BERHENTI di sini. Tidak ada rencana Modul 9 yang
dibuat/dikerjakan sesi ini.**
