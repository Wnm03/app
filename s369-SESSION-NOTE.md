# Session note s369 (Sesi 369) — Modul 11 Produk Inline-Create (Tx Cart) Mutation Gate

Lanjutan langsung dari patch s368 (Modul 10, produsen-inline-create-
mutation-gate) yang diupload user (`kw_release_sesi368_modul10-produsen-
inline-create-mutation-gate_v1065.zip` + `CHANGELOG-MODUL10.md`/
`FILES-CHANGED.md`/`s368-SESSION-NOTE.md`/`MODUL10-PRODUSEN-INLINE-CREATE-
MUTATION-GATE.diff`). Instruksi user sesi ini: gunakan FULL RELEASE ZIP
v1065 sebagai baseline, kerjakan langsung di source, jangan proyek baru,
jangan refactor besar/ubah business logic, semua perubahan additive, reuse
Store/Repository/Mutation Gate/validator/helper existing, audit domain Shop
utk mutation point yang masih bypass, pilih SATU modul prioritas tertinggi,
implementasi + test + build + release ZIP baru, kalau tidak ada kandidat
layak buat Laporan Final (bukan modul baru).

## Audit & pemilihan target (dikerjakan sesi ini)

Baseline v1065 (hasil Modul 10) sudah menutup: stock, create/update produk
lewat form Etalase, atribut fisik (termasuk `beratPerUnit`), supplier CRUD
lewat form Produsen, kategori, DAN inline-create produsen (Modul 10, 2
titik). Session note Modul 10 mencatat 2 sisa bypass yang sengaja tidak
dikerjakan: CSV import (`cobek-io.js`) & inline-create produk baru saat
form Transaksi (`cobek-tx-cart.js`, fungsi berbeda dari yang digate Modul
10).

Audit ulang sesi ini (grep `D.products.push`/`D.produsen.push`/
`D.products.splice`/`D.produsen.splice` di seluruh `modules/shop/*.js`)
mengonfirmasi 2 sisa itu MASIH bypass, plus 1 temuan baru: `Etalase.
delete(i)` (`D.products.splice()` mentah, 0 gate — TAPI `ProductRepository`
tidak punya method delete sama sekali, jadi menggate ini berarti bikin
method BARU, bukan wiring ke gate existing, di luar scope "reuse gate yang
sudah ada").

**Dipilih**: inline-create produk baru di `applyTxShopStockFromTx()`
(`cobek-tx-cart.js`) — SATU-SATUNYA mutasi mentah tersisa di fungsi yang
4 mutasi lainnya (stock/harga/kategoriId&produsenId/hargaByProdusen) SUDAH
digate sejak Modul 5/6. Gate yang dibutuhkan (`ProductRepository.
createProduct()`, Tahap 4) SUDAH ADA & battle-tested (`Etalase.save()`
Tahap 6) — 0 method baru.

**CSV import TETAP TIDAK dipilih** — audit lebih dalam sesi ini menemukan
alasan teknis BARU (bukan cuma "scope besar" seperti catatan Modul 10):
`ImportShopExcel.commit()` bisa men-create banyak baris pada milidetik yang
SAMA (satu `forEach()` sinkron), sedangkan `ProductRepository._genId()`/
`SupplierStore.mutateCreate()` generate id TANPA suffix unik
(`'prod_'+Date.now()`/`'prd_'+Date.now()` polos) — beda dari CSV import
yang SUDAH sengaja pakai suffix `uid()` untuk mencegah tabrakan itu.
Wiring naif AKAN memperkenalkan bug tabrakan id massal pada import banyak
baris baru — regresi nyata. Ditambah update-produsen CSV butuh
`jarakKm`/`biayaPerKm` yang `SupplierStore.mutateUpdate()` tidak tangani.
Detail lengkap di `CHANGELOG-MODUL11.md` §"Issue tersisa".

## Yang dikerjakan

1. **0 method baru** — sesi ini murni WIRING 1 fungsi ke gate yang SUDAH
   ADA (`ProductRepository.createProduct()`, Tahap 4) ke 1 titik yang
   belum memakainya.
2. **1 titik mutasi dialihkan**: create produk baru inline di
   `applyTxShopStockFromTx()` (`cobek-tx-cart.js`), guard `typeof
   ProductRepository!=='undefined'` + fallback raw PERSIS literal lama.
3. **Id generator TETAP lokal** (`'prod_'+Date.now()+'_'+uid()`, BUKAN
   `ProductRepository._genId()` yang tanpa suffix) — ditimpa SETELAH
   `createProduct()` supaya 0 perubahan perilaku id/0 risiko tabrakan baru
   kalau >1 produk baru dibuat di 1 keranjang pada tick yang sama. Alasan
   teknis lengkap ada di komentar kode & `CHANGELOG-MODUL11.md`.
4. **9 test baru** (`tests/product-inline-create-mutation-gate-mod11.
   test.js`) — integrasi (gate benar-benar dipanggil, field hasil identik
   + default field baru konsisten `Etalase.save()`), id-generator (format
   lokal + 2 produk baru 1 keranjang tidak tabrakan), fallback tanpa
   `ProductRepository`, 2 test produk-existing-tidak-lewat-gate.
5. **1 komentar test lama diperjelas** (bukan logic/assertion) di
   `tests/product-repository-nested-mutation-gate-mod6.test.js` — judul
   test yang menyebut perilaku "sebelum Modul 11" diupdate biar tetap
   akurat, assertion tidak disentuh & tetap PASS.

## Hasil verifikasi

- `npm test` penuh (`node --test tests/*.test.js`): **2467 test, 2465
  pass, 2 gagal** — dikonfirmasi PERSIS 2 kegagalan pre-existing yang sama
  dari baseline Modul 10 (`dashHubNavigateToFeature`, tidak terkait Shop).
  **0 regresi baru.**
- `node scripts/build.js`: sukses, versi bundle numerik v1065 -> v1066.
- `node scripts/verify-bundle-freshness.js`: kedua bundle segar (hash
  source cocok).
- Perubahan terkonfirmasi masuk `app-bundle-a.min.js` (grep penanda
  komentar "Modul 11", 1 kemunculan).

## Yang SENGAJA tidak disentuh

1. 4 mutasi lain di fungsi yang sama (stock/harga/kategoriId&produsenId/
   hargaByProdusen) — sudah digate sejak Modul 5/6.
2. CSV import (`cobek-io.js`) — bypass SSOT juga, TAPI ada masalah id-
   generator + scope campuran create/update yang butuh desain tambahan,
   bukan wiring lurus. Lihat §Issue tersisa di CHANGELOG.
3. `Etalase.delete(i)` — tidak ada gate delete produk existing untuk
   di-reuse; membuatnya = method baru, di luar scope sesi ini.

## Catatan integritas paket (ditemukan saat audit awal, bukan bug kode)

`backups/` di ZIP baseline berisi 4 file backup berlabel sesi `s388`-`s391`
("tahap12-final-audit-final-release") — lebih tinggi & tidak berurutan dari
`s368` (label ZIP ini), dan `APP_BUILD_VERSION` source SEBELUM sesi ini
terbaca `s392-...` bukan `s368-...`. Source code (logic) TERVERIFIKASI
MANUAL cocok 100% dengan deskripsi Modul 10 (komentar "Modul 10 — inline"
ada persis di 2 file sesuai `s368-SESSION-NOTE.md`), jadi audit & sesi ini
dikerjakan di atas source itu apa adanya — murni label/backup lama yang
tercampur, bukan mempengaruhi hasil. Detail di `FILES-CHANGED.md` §Catatan.

## Environment sandbox (sama seperti Modul 3-10)

`esbuild`/`eslint` tidak terpasang (tidak ada akses jaringan di sandbox
ini) — bundle hasil build TIDAK diminifikasi tapi 100% valid (`node
--check` + `verify-bundle-freshness.js` lolos).

## File yang berubah

Lihat `FILES-CHANGED.md` (root repo) untuk daftar lengkap + unified diff
di `MODUL11-PRODUK-INLINE-CREATE-TX-CART-MUTATION-GATE.diff`.

## Issue tersisa

Domain Shop **BELUM 100% tertutup**. CSV import (`cobek-io.js`, 2 sub-
kandidat terpisah: create-produk vs create+update-produsen) & gate-delete-
produk (`ProductRepository.mutateDelete()`, method baru) adalah kandidat
paling masuk akal untuk sesi berikutnya kalau user meminta lanjut — TIDAK
dikerjakan/dirancang sesi ini karena masing-masing butuh keputusan desain
tambahan di luar "wiring lurus ke gate existing" (lihat detail teknis di
`CHANGELOG-MODUL11.md` §Issue tersisa).

**BERHENTI di sini. Tidak ada implementasi/roadmap Modul 12 yang
dibuat/dikerjakan sesi ini.**
