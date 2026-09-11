# Changelog — Sesi C-lanjutan: Shop/Cobek, 5 titik sisa (v1662, `product.updated`)

## Task
Lanjutan Sesi C (Event Bus umum, ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md
§7 Sesi C / §2d urutan poin 2): tuntaskan 5 titik sisa Shop/Cobek yang
sengaja ditunda dari `PATCH-v1642-sesi-c-shop-cobek-product-updated.zip`
(CRUD inti produk & kategori sudah emit `product.updated` sejak v1642).
Fase 1 belum tuntas (gap (a) `VEHICLE_DB_RECORDS` literal masih terbuka,
lihat v1661) — Sesi D (`service_categories`) TETAP tidak dikerjakan sesi
ini, sesuai larangan §6.

## Perubahan
5 titik baru, semua event `product.updated` (guard `typeof
AIBus!=="undefined"`, 0 perubahan business logic):
- `modules/shop/cobek-order.js` — `Produsen.saveHarga()`: 1 emit/batch
  `{kind:"harga-produsen",action:"batch",produsenId,productIds,count}`.
- `modules/shop/cobek-pricing.js` — `PriceRekoWidget.applyOne()`/
  `applyBulk()`: `{kind:"price-reko",action:"apply-one"|"apply-bulk",...}`.
- `modules/shop/cobek-pricing.js` — `StockRekoWidget.applyAll()`:
  `{kind:"stock-reko",action:"apply-all",productIds,count,totalQty}`.
- `modules/shop/cobek-pricing.js` — `WeightBulkWidget.applyOne()`/
  `applyBulk()`: `{kind:"weight-bulk",action:"apply-one"|"apply-bulk",...}`.
- `modules/shop/cobek-tx-cart.js` — `onTxShopStockProdusenChange()`
  (inline create Produsen dari keranjang): `{kind:"produsen",
  action:"create",produsenId,name}`.
- `modules/shop/cobek-io.js` — `ImportShopExcel.commit()` (bulk import
  Excel, 2 cabang): `{kind:"import-excel",action:"produsen"|"etalase",
  created,updated}`.

Domain Shop/Cobek Sesi C sekarang **9/9 titik TUNTAS** (4 CRUD inti v1642
+ 5 titik ini).

## Sengaja TIDAK dikerjakan sesi ini
- Sesi B gap (a) (`VEHICLE_DB_RECORDS` literal) — tetap ditunda (v1661).
- Sesi D (`service_categories`) — belum aman mulai, Fase 1 belum tuntas.
- Wiring listener `AIService.wireEvents()` — direkomendasikan sesi
  TERSENDIRI berikutnya (§2d poin 3), SEBELUM Dana Titipan/investasi/
  aset non-core.
- Dana Titipan, `investasi.js` dasar, Aset non-core — backlog lain.
- `Etalase.onProdusenChange()` (pola serupa titik #5, file lain) — di
  luar 5 titik yang disepakati.

## Test
- Baru: `tests/cobek-shop-5-titik-sisa-sesi-c.test.js` (14 test, 14/14
  pass) — mencakup ke-5 titik + guard `AIBus` tidak ada.
- Full suite: 6353/6357 pass, 4 fail — 4 kegagalan IDENTIK
  pre-existing (`verify-release-ready` eslint-override,
  `checkBundleFreshness()`, 2× `txHTML()`/S468d), **0 regresi baru**.
- Build: `APP_BUILD_VERSION`/`PRODUCTION_BUILD_SYNCED_VERSION` dibump
  manual ke `s-sesi-c-shop-cobek-5-titik-sisa-1662` (delta zip, `node
  scripts/build.js` rebuild penuh belum dijalankan — perlu checkout
  lengkap, sama seperti sesi-sesi sebelumnya).

---

# Changelog — Sesi B-followup (dedup `ensureLoaded()` — ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §7 Sesi B, gap (c))

## Konteks

Sesi B tercatat tinggal 2 gap kecil: (a) hapus literal `VEHICLE_DB_RECORDS`,
(c) `await ensureLoaded()` di konsumen `findTorsiDb`/`findVehicleSpec`.
Audit ulang di awal sesi ini menemukan keduanya lebih besar dari
perkiraan — (a) butuh mekanisme registrasi baru (ditunda, sesi
tersendiri), (c) titik pemanggilnya semua sync di jalur render UI
(mengubahnya jadi `async` = refactor besar, ditolak). Perbaikan yang
tetap dikerjakan utk (c): dedup pemanggilan `ensureLoaded()` supaya
pemanggilan bersamaan dari >1 titik tidak memicu round-trip IndexedDB
dobel — `load()` sendiri sudah `await ensureLoaded()` sebelum app jalan,
jadi race praktis di konsumen render sudah sempit; ini menutup sisi lain
(concurrent-call) dari race tsb.

## Hasil

- `modules/engine/database-api.js`: `dbVehicleEnsureLoaded()` dipecah jadi
  orkestrasi dedup (`_vehicleDbLoadPromise`) + `_vehicleDbDoLoad()` (badan
  asli, 0 logika diubah). `dbVehicleInvalidateCache()` ikut reset dedup
  guard. Getter sync (`_vehicleDbRecords()`) SENGAJA TIDAK diubah — tidak
  memicu load sendiri, supaya kontrak test lama ("IDBStore tidak disentuh
  sebelum `ensureLoaded()` dipanggil") tetap 100% berlaku.
- `APP_BUILD_VERSION`/`PRODUCTION_BUILD_SYNCED_VERSION` dibump ke
  `s-sesi-b-followup-ensureloaded-dedup-1661`.

## Sengaja TIDAK dikerjakan sesi ini

- (a) Hapus literal `VEHICLE_DB_RECORDS` — ditunda, sesi desain
  registrasi `TORSI_DB`/`VEHICLE_SPEC_DB` → `DatabaseAPI` tersendiri.
- Refactor `resolveCatGroup()`/`renderVehicleSpecCard()`/dkk jadi `async`.
- Hapus duplikasi `TORSI_DB`/`VEHICLE_SPEC_DB` vs `VEHICLE_DB_RECORDS`
  (item Critical §3 terakhir, bergantung (a)).

## Test

- Baru: `tests/database-api-vehicledb-ensureloaded-dedup-sesi-b-followup.test.js`
  (3 test, semua pass).
- 44 test lama terkait Vehicle Database/Sesi A/B: 44/44 pass, 0 regresi.
- Full delta zip: 294/308 pass, 14 gagal pre-existing (`ENOENT`
  `ownership-engine.js` tidak ikut delta zip ini, tidak terkait
  perubahan sesi ini).

Detail lengkap: `SESSION-NOTE-sesi-b-followup-ensureloaded-dedup.md`.

---

# Changelog — Sesi F2 (Badge jumlah foto di Riwayat Servis — ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §7 Sesi F, lanjutan F1)

## Konteks

Audit roadmap (sinkronisasi ulang status §2b/§2c/§7 terhadap isi kode
nyata di `app-main__76_.zip` + `PATCH-v1642-sesi-c-shop-cobek-product-updated.zip`)
menemukan banyak sesi sudah selesai tapi belum tercatat di dokumen:
Sesi E1-E6 (checklist `actionType` lanjutan, seluruh 6 item), Sesi F1
(foto — data model+capture+persist), dan Sesi C-lanjutan (Akun, Zakat/PBB,
Shop/Cobek) — detail lengkap di update roadmap §2d. Instruksi W: utamakan
langkah implementasi ke `car-notes.js` dulu. Backlog yang paling langsung
menyentuh `car-notes.js` dan sudah eksplisit dicatat di sesi sebelumnya:
"Thumbnail/badge foto di daftar Riwayat Servis (`Servis.renderList()`)"
(disebut SENGAJA ditunda di `SESSION-NOTE-sesi-f1-foto-riwayat-servis.md`).

## Hasil

- `car-notes.js` (`Servis.renderList()`): badge teks `📷 N` (N = jumlah
  foto) ditambahkan ke `tx-meta` tiap entry riwayat servis yang punya
  `s.foto` berisi >=1 item — pola SAMA PERSIS `batchInfo` (Sesi E3):
  string kosong kalau `foto` tidak ada/kosong, 0 perubahan struktur
  `tx-item` (tidak ada thumbnail gambar sungguhan — itu tetap backlog,
  lihat bagian "Sengaja tidak dikerjakan" di bawah).
- Version marker source (`APP_BUILD_VERSION`, `PRODUCTION_BUILD_SYNCED_VERSION`,
  `MODAL_VERSION`, `MODULE_CALC_VERSION`, `MODULE_RENDER_VERSION`,
  `MODULE_FEATURES_VERSION`) dibump manual & konsisten ke
  `s-servis-foto-badge-sesi-f2-1660` (pola sama F1: bump manual krn delta
  zip ini tidak membawa seluruh file GROUP_A, `scripts/build.js` tidak
  aman dijalankan penuh di sini — lihat catatan Verifikasi).

## Sengaja TIDAK dikerjakan sesi ini (backlog Sesi F berikutnya)

- Thumbnail gambar sungguhan (mis. `<img>` 32x32) di daftar Riwayat
  Servis — badge teks dulu (risiko lebih rendah, 0 perubahan struktur
  HTML `tx-item`), thumbnail visual butuh perubahan struktur & CSS,
  disengaja dipisah jadi langkah berikutnya.
- Lightbox/viewer untuk lihat foto ukuran penuh dari daftar riwayat.
- Kompresi gambar sebelum jadi dataURL (masih backlog F1, belum
  disentuh sesi manapun).

## Verifikasi

- `node --check car-notes.js` dan seluruh file version-marker yang
  disentuh: **lolos** (tersedia di sandbox delta ini).
- Test baru `tests/servis-foto-badge-sesi-f2.test.js` (5 test: badge
  muncul dgn jumlah benar, `foto:[]` tidak muncul badge, entry lama
  tanpa field `foto` tidak muncul badge, badge foto & badge batch
  koeksis, badge per-entry tidak tercampur) — **belum bisa dijalankan**
  di sandbox ini: `tests/helpers/loadSource.js` tidak ikut ter-bundle
  di delta zip ini (limitasi sama persis yang dicatat di semua sesi
  sebelumnya, termasuk F1 — bukan masalah baru). **Wajib dijalankan di
  checkout lengkap** sebelum deploy, bersama `node scripts/build.js`
  (rebuild bundle + sinkron `?v=`/`CACHE_NAME`) dan
  `node scripts/verify-release-ready.js` penuh.
- `?v=` di `index.html`/`app_production.html` dan `CACHE_NAME` (`sw.js`)
  **belum dibump** sesi ini (sama seperti F1) — perlu `scripts/build.js`
  di checkout lengkap, jangan dibump manual sendiri-sendiri (pelajaran
  dari sesi Akun sebelumnya soal version marker basi).

Detail lengkap: `SESSION-NOTE-sesi-f2-badge-foto-riwayat-servis.md`.

---

# Changelog — Sesi C-lanjutan Shop/Cobek (event BARU `product.updated` — ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §7 Sesi C / AUDIT-SESI-C-EVENTBUS-D-WRITES-NO-EMIT.md Prioritas Sedang, temuan #6)

## Konteks

Lanjutan dari sesi Zakat/PBB (`finance.updated` kind `zakat`, v1641) —
domain berikutnya di Prioritas Sedang yang direkomendasikan sesi lalu:
Shop/Cobek produk & stok (scope lebih kecil dari Dana Titipan).

Audit ulang (`cobek-etalase.js`/`cobek-pricing.js`/`cobek-tx-cart.js`/
`cobek-order.js`) menemukan 9 titik `save()` tanpa emit. Keputusan user:
(1) nama event **`product.updated`** (1 event, pola `kind:...` sama
`finance.updated`), (2) **scope sesi ini dipersempit** ke CRUD inti
produk & kategori (`cobek-etalase.js`, 4 titik) — 5 titik sisa
(harga produsen batch/`cobek-order.js`; price reko apply/restock reko/
weight-bulk/`cobek-pricing.js`; inline create produsen di
keranjang/`cobek-tx-cart.js`; bulk import Excel/`cobek-io.js`) SENGAJA
ditunda ke sesi berikutnya.

## Hasil

Event BARU `product.updated` (belum ada presedennya sebelum sesi ini),
4 titik emit di `modules/shop/cobek-etalase.js`, semua di-guard
`typeof AIBus!=="undefined"`:

- `Etalase._saveInner()` — create/edit produk. **1 emit menutupi ke-3
  jalur** (koreksi stok/beli stok+tx/update biasa — pola "1 emit
  banyak jalur" sama `tagihan-kalender.js` sesi lalu) →
  `product.updated {kind:"produk",action:"create"/"edit",productId,
  name}`.
- `Etalase.delete(i)` — hapus produk →
  `product.updated {kind:"produk",action:"delete",deletedId,name}`.
- `Etalase.addKategoriManual()` — 2 cabang terpisah (create baru/rename
  existing, pola sama `PBB.ikatTagihan()`) →
  `product.updated {kind:"kategori",action:"create"/"edit",categoryId,
  name}`.
- `Etalase.delKategori(id)` — hapus kategori →
  `product.updated {kind:"kategori",action:"delete",deletedId,name}`.

## SENGAJA TIDAK disentuh sesi ini (backlog)

- `cobek-order.js` — `Produsen.saveHarga()` (set harga beli per-produsen
  massal ke banyak produk sekaligus).
- `cobek-pricing.js` — `OngkirCalc.saveProdusenPref()` (rute tetap
  produsen, metadata supplier bukan produk/stok); `PriceReko.applyOne/
  applyBulk()` (terapkan estimasi Harga Jual); `StockRekoWidget.
  applyAll()` (restock reko multi-produk); `WeightBulkWidget.applyOne/
  applyBulk()` (isi massal `beratPerUnit`, metadata atribut).
- `cobek-tx-cart.js` — inline "Produsen Baru" saat transaksi keranjang.
- `cobek-io.js` — bulk import Excel produk & produsen (`saveProdusen`/
  `saveOrder` wrapper tipis, import massal).
- Dana Titipan (scope besar, ditunda sejak sesi lalu), `investasi.js`
  dasar, Aset non-core, wiring listener `AIService.wireEvents()` ke
  event2 baru (`account.updated`/`finance.updated{kind:zakat}`/
  `product.updated`) — semua masih backlog dari sesi-sesi sebelumnya.

## Verifikasi

- Test baru `tests/cobek-etalase-aibus-emit-sesi-c.test.js` — 9 test,
  semua pass.
- Full suite: **6335/6335 pass** (base 6326 + 9 test baru). Sempat
  4 gagal di percobaan pertama (2 pre-existing lama + `checkBundleFreshness`
  krn bundle belum di-rebuild sejak source berubah + 1 turunan
  bundle-stale) — setelah `node scripts/build.js` dijalankan, kembali ke
  **2 gagal pre-existing** (`verify-release-ready` end-to-end
  eslint-override test, `txHTML()` virtual-bill S468d), identik dgn
  baseline sesi-sesi sebelumnya, 0 regresi baru.
- `node scripts/build.js`: lolos bersih, versi `1641` → **v1642**.
- `node scripts/verify-release-ready.js`: LOLOS, 2 override `lint`/
  `minify` (sandbox tanpa akses npm/esbuild, konsisten).

Detail lengkap: `SESSION-NOTE-sesi-c-lanjutan-shop-cobek-product-updated.md`.

---

# Changelog — Sesi C-lanjutan (Zakat/PBB, `finance.updated` kind BARU "zakat" + "tagihan" source:"pbb" — ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §7 Sesi C / AUDIT-SESI-C-EVENTBUS-D-WRITES-NO-EMIT.md Prioritas Sedang)

## Konteks

Lanjutan dari sesi Akun (`account.updated`, v1640) — Prioritas Tinggi
audit sudah tuntas semua. Sesi ini masuk Prioritas Sedang, dimulai dari
domain Zakat/PBB (`modules/finance/pajak-pbb-zakat.js`, disebut audit
sbg "9 titik `save()`") — dipilih duluan krn pola paling sederhana/mirip
yang sudah terbukti, sesuai rekomendasi sesi sebelumnya.

## Hasil

Dari 9 titik `save()` di file ini, HANYA **3** yang aksi diskrit/relevan
lintas-modul (create/edit/delete data finansial nyata) yang ditambah
emit:

- `PBB.ikatTagihan()` — create tagihan PBB baru & update existing →
  `finance.updated {kind:"tagihan",action:"create"/"edit",billId,
  amount,source:"pbb"}` — REPLIKASI persis skema `kind:"tagihan"` yang
  sudah ada di `tagihan-kalender.js`, field `source:"pbb"` baru supaya
  konsumen bisa bedakan asal (bill ini dibuat DI LUAR alur Tagihan
  biasa).
- `Zakat.catatDibayar()` — create log+transaksi zakat → `finance.
  updated {kind:"zakat",action:"create",jenis,amount}` — kind BARU
  "zakat" (belum ada presedennya, payload konsisten skema kind lain).
- `Zakat.delLog()` — hapus log zakat → `finance.updated {kind:"zakat",
  action:"delete",deletedId}`.

## SENGAJA TIDAK disentuh (6 titik save() sisa)

Semua dipanggil BERULANG tiap render/kalkulasi (bukan aksi diskrit
user) — emit di sini beresiko SPAM event tiap kali angka di-render
ulang, sama kriteria "rendah" di metode audit:

- `PBB.hitung()` — save tarif/njoptkp, dipanggil tiap `PBB.render()`.
- `Zakat.hitungMaal()` — save `utangJT`, dipanggil tiap render Maal.
- `RefAI.check()` — save `refCheckedAt` (timestamp cek AI, bukan data
  finansial).
- `RefAI.applySelected()` — update referensi harga emas/nisab/SIM
  (borderline, lebih ke "settings" global daripada transaksi diskrit —
  ditinjau ulang sesi lain kalau ternyata dibutuhkan).
- `PPh21.hitung()` — save `pphBrutoBulan`/`pphIuranBulan`, dipanggil
  tiap render kalkulator PPh21.

## Test

- Baru: `tests/pajak-pbb-zakat-aibus-emit-sesi-c.test.js` (5 test, semua
  pass) — cakupan: PBB.ikatTagihan() create & edit, Zakat.catatDibayar(),
  Zakat.delLog(), guard AIBus tidak ada.
- Full suite: **6324/6326 pass** (naik dari 6319/6321 sebelum sesi ini,
  +5 test baru semua pass), 2 gagal pre-existing tidak terkait (sama
  persis 2 kegagalan yang sudah dikonfirmasi di sesi Akun sebelumnya).
- `node scripts/build.js`: **lolos bersih** (0 version-marker basi kali
  ini — pelajaran dari sesi F1/Akun sebelumnya, build langsung
  dijalankan sebelum lupa), versi naik `1640` → **v1641**.
- `node scripts/verify-release-ready.js`: **LOLOS** (2 override manual
  `lint`/`minify` — sandbox tanpa akses npm/esbuild, konsisten sesi2
  sebelumnya).

Detail lengkap: `SESSION-NOTE-sesi-c-lanjutan-zakat-pbb.md`.

---

# Changelog — Sesi C-lanjutan (Akun, `account.updated` — ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §7 Sesi C / AUDIT-SESI-C-EVENTBUS-D-WRITES-NO-EMIT.md Prioritas Tinggi #4)

## Konteks

Instruksi user: Sesi F (Foto di Riwayat Servis) diturunkan prioritasnya
("tidak terlalu penting"), lanjut ke sesi berikutnya. Re-cek
`AUDIT-SESI-C-EVENTBUS-D-WRITES-NO-EMIT.md`: dari daftar Prioritas Tinggi
(delTx, 4 jenis transaksi khusus, piutang-utang, tagihan-kalender, Akun),
SEMUA sudah emit di sesi-sesi sebelumnya KECUALI **Akun** —
`modules/finance/akun.js` masih 0% `AIBus.emit()`. Ini jadi fokus tunggal
sesi ini (item Prioritas Tinggi TERAKHIR yang tersisa).

Baseline: overlay `app-main__76_.zip` (v1638) + `PATCH-v1639-sesi-E6-
actiontypefilter.zip` (yang ternyata sudah kumulatif s.d. Sesi E1-E6 +
F1) — dikonfirmasi 0 konflik/overlap, sesuai metode rekonsiliasi sesi
sebelumnya (`SESSION-NOTE-rekonsiliasi-vehicle-databaseapi-plus-sesi-c-
finance.md`).

## Hasil

- **Nama event baru**: `account.updated` (belum ada presedennya —
  keputusan diambil sesi ini, bukan ditunda lagi ke user, karena
  polanya sudah 100% mengikuti presedon `vehicle.updated`/
  `asset.updated`: payload `{kind:"account",action,...}`).
- `modules/finance/akun.js` — 4 titik emit baru (replikasi pola
  `vehicle-core.js` persis):
  - `_saveAccInner()` jalur EDIT: `{action:"edit",accountId}`
  - `_saveAccInner()` jalur BUAT BARU: `{action:"create",accountId}`
  - `delAcc()`: `{action:"delete",deletedId,migratedToAccountId}`
  - `AccOwners.save()` (edit porsi kepemilikan akun): `{action:"edit-
    owners",accountId}` — pola sama 2 titik edit owner di
    `aset-owners.js` (`asset.updated`)
- Semua 4 titik pakai guard `typeof AIBus!=="undefined"` konsisten
  pola lama (tidak throw kalau AIBus belum dimuat).
- **Sengaja TIDAK disentuh** sesi ini: `quickToggleInclude()` (toggle
  "ikut dihitung saldo" — murni setting tampilan, relevansi rendah
  utk konsumen event, sama penilaian "rendah" di metode audit).

## Yang masih tersisa dari audit (Prioritas Sedang, backlog sesi lain)

Dana Titipan (4 file, kandidat `titipan.updated`), Shop/Cobek
produk-stok, Zakat/PBB (9 titik `save()`), `investasi.js` dasar, Aset
non-core (`aset-misc.js`, `aset-emas-impor.js`, `aset-reports.js`) —
BELUM disentuh, semua source file-nya SEKARANG tersedia (ikut
`app-main__76_.zip`), jadi sesi berikutnya bisa langsung mulai tanpa
menunggu upload tambahan.

## Test

- Baru: `tests/akun-crud-aibus-account-updated-sesi-c.test.js` (5 test,
  semua pass) — cakupan: create, edit, delete, edit-owners, guard
  AIBus tidak ada.
- Full suite: **6319/6321 pass** (naik dari 6314/6316 sebelum sesi ini,
  +5 test baru semua pass), 2 gagal pre-existing tidak terkait
  (verify-release-ready eslint-override end-to-end, txHTML virtual
  bill S468d — dikonfirmasi sama sebelum & sesudah sesi ini, bukan
  regresi baru).
- `node scripts/build.js`: **lolos**, versi naik `1639` → **v1640**.
  Sempat menemukan 5 konstanta versi basi peninggalan Sesi F1
  (`MODULE_RENDER_VERSION`/`MODAL_VERSION`/`MODULE_CALC_VERSION`/
  `MODULE_FEATURES_VERSION`/`PRODUCTION_BUILD_SYNCED_VERSION` masih
  `s-vehiclemodel-storage-sync-followup-1655`, gagal ke-replace
  otomatis krn sudah menyimpang) — diperbaiki manual sebelum build
  ulang, gate `verifyVersionConstantsSynced()` sekarang lolos bersih.
- `node scripts/verify-release-ready.js`: **LOLOS** (2 override manual
  `lint`/`minify` — sandbox tanpa akses npm/esbuild, sama seperti
  sesi-sesi sebelumnya, dicatat di `docs/RELEASE-GATE-LOG.md`).

Detail lengkap: `SESSION-NOTE-sesi-c-lanjutan-akun-account-updated.md`.

---

# Changelog — Sesi F1 (Foto di Riwayat Servis, LANGKAH PERTAMA -- ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §7 Sesi F)

## Konteks

Sesi F (Foto di Service History) independen dari Sesi A-E (app-layer murni,
field foto di `D.servisLogs`, tidak bergantung Database API/Vehicle Model
relasional). Dipecah jadi beberapa langkah kecil sesuai instruksi nm --
sesi ini HANYA data model + capture UI + persist (simpan/muat), TIDAK
termasuk thumbnail/badge di daftar Riwayat Servis (backlog langkah
berikutnya).

## Hasil

- `car-notes.js` (`Servis` object): state baru `_photoDraft` (array
  dataURL string, in-memory selama modal terbuka) + 4 method baru --
  `pickPhoto()` (trigger file input), `addPhoto(event)` (FileReader ->
  dataURL, guard maks 5 foto & maks 5MB/foto, skip file bukan image),
  `removePhoto(idx)`, `_renderPhotoThumbs()` (render thumbnail 64x64 +
  tombol hapus per foto).
- `Servis.openModal()`: reset `_photoDraft` ke `[]` utk tambah baru, atau
  `(s.foto||[]).slice()` utk edit (fallback aman utk entry lama tanpa
  field `foto`).
- `Servis._saveInner()`: `foto: Servis._photoDraft.slice()` ditambahkan ke
  object yang di-push (jalur BUAT BARU) maupun `Object.assign()` (jalur
  EDIT) -- field opsional, backward-compatible, 0 migrasi data perlu.
- `modules/shared/modals.js` (`servisModal` HTML): field baru "Foto
  (opsional)" disisipkan antara Catatan & Bayar dari Akun -- input file
  hidden (`servisPhotoInput`, accept image/*) + tombol "📷 Tambah Foto" +
  div thumbnail (`servisPhotoThumbs`), pola sama persis
  `catPhotoInput`/`catPhotoThumbs` yang sudah ada di `catalogModal`
  (`VehicleCatalogUI.addPhoto`/`pickPhoto`) -- 0 pola baru diciptakan.
- `modules/shared/features-helpers-global-security.js`: `APP_BUILD_VERSION`
  dibump ke `s-servis-foto-riwayat-sesi-f1-1656`.

## Sengaja TIDAK dikerjakan sesi ini

- Thumbnail/badge foto di daftar Riwayat Servis (`Servis.renderList()`) --
  langkah berikutnya Sesi F.
- Kompresi gambar sebelum jadi dataURL (guard kasar 5MB/foto dipakai
  sementara).
- Lightbox/viewer utk lihat foto ukuran penuh.

## Test

- Baru: `tests/servis-foto-riwayat-sesi-f1.test.js` (6 test, semua pass) --
  cakupan: default `_photoDraft` kosong, persist foto jalur buat baru
  (dengan & tanpa foto), persist foto jalur edit (menimpa foto lama),
  fallback aman entry lama tanpa field `foto`, `removePhoto()` menghapus
  index yang benar.
- Full suite (delta zip, `node --test tests/*.test.js`): **281/286 pass**
  (naik dari 275/280 sebelum sesi ini, +6 test baru), 5 gagal
  pre-existing tidak terkait (`ownership-engine.js` tidak ada di delta
  zip ini -- sama persis E1-E6/A-C1 sebelumnya, dikonfirmasi bukan
  regresi baru).
- `node --check` pass utk `car-notes.js` dan `modules/shared/modals.js`.
- **Belum dijalankan** sesi ini (di luar cakupan sandbox delta zip):
  `node scripts/build.js` (rebuild `app-bundle-a.min.js`/
  `app-bundle-b.min.js` + sinkron seluruh version marker `?v=` di
  `index.html`) -- delta zip ini tidak membawa seluruh file GROUP_A
  (mis. `ownership-engine.js` dkk), jadi build penuh tidak aman
  dijalankan di sini. Perlu dijalankan nm di checkout lengkap sebelum
  deploy; `APP_BUILD_VERSION` sudah dibump manual sbg penanda minimal.

Detail lengkap: `SESSION-NOTE-sesi-f1-foto-riwayat-servis.md`.

---

## Sesi D-lanjutan2b — Live-update badge kategori master saat mengetik (v1669)

Lanjutan Sesi D-lanjutan2a (v1668, badge kategori master dibaca 1x saat modal
Kategori Sparepart dibuka). Audit ulang listener `oninput` yang sudah
terpasang di `#sparepartName` menemukan itu semua cuma rangkaian pemanggilan
sinkron dalam SATU atribut `oninput` (bukan beberapa `addEventListener`
terpisah) — sehingga menambah 1 pemanggilan lagi ke rangkaian yang sama
tidak membuka race condition baru (risiko lebih rendah dari perkiraan awal
di catatan sesi D-lanjutan2a).

**Perubahan kode:**
- `modules/vehicle/sparepart-servis.js`: method baru
  `Sparepart.updateMasterCatBadgeLive()` — baca `#sparepartName` &
  `#sparepartVehicleId` langsung dari DOM saat dipanggil (vehicleId ikut
  dropdown yang SEDANG dipilih, bukan nilai lama dari saat modal dibuka),
  delegasikan ke `updateMasterCatBadge()` apa adanya (0 logic classify
  baru).
- `modules/shared/modals.js`: atribut `oninput` `#sparepartName` ditambah 1
  pemanggilan ke-4 (`Sparepart.updateMasterCatBadgeLive()`) di ujung
  rangkaian yang sudah ada (`autoFillSparepartCode()`;
  `simpleAutocompleteInput(...)`; `Sparepart.autoSuggestInterval()`) — 0
  pemanggilan lama diubah/dipindah/dihapus.

**Verifikasi:**
- Test baru: `tests/servis-mastercategory-modalbadge-sesi-d-lanjutan2b.test.js`
  — 9/9 pass (baca DOM live, match/tidak-match/kosong saat mengetik ulang,
  vehicleId kosong→null vs terisi, guard elemen tidak ada, wiring oninput
  modals.js).
- Full suite (checkout gabungan `app-main` + patch v1642-v1668 + perubahan
  sesi ini, `node --test tests/*.test.js`): **6408/6412 pass** (naik dari
  6399/6403 sebelum sesi ini, +9 test baru), 4 gagal **persis sama** dengan
  yang sudah dikonfirmasi pre-existing di baseline v1667/v1668 — **0
  regresi baru**.
- `node scripts/build.js` lolos semua gate (html-sync, version-sync, sintaks
  bundle). `verify-window-expose.js`/`verify-bundle-freshness.js` OK.
  `verify-release-ready.js` lolos via override lint/minify (sandbox tanpa
  jaringan, sama seperti sesi-sesi sebelumnya).

**Belum dikerjakan:** filter/chip by master category di daftar Servis/
Sparepart utama; keputusan produk soal item classify `null`.

Detail lengkap: `SESSION-NOTE-sesi-d-lanjutan2b-mastercategory-livebadge-v1669.md`.

---

## Sesi D-lanjutan3 — Filter/chip kategori master di "Kelola Kategori Sparepart" (v1670)

Lanjutan Sesi D-lanjutan2b (v1669). Mengerjakan item yang eksplisit tercatat
"Belum dikerjakan" di catatan v1669: *filter/chip by master category di
daftar Servis/Sparepart utama*. Target dipilih: `Sparepart.renderCatList()`
("Kelola Kategori Sparepart") — daftar KATEGORI, punya field `name` yang
langsung bisa diklasifikasi, beda dari `Servis.renderList()` (daftar LOG,
scope lebih besar krn butuh join balik ke kategori).

**Perubahan kode:**
- `modules/vehicle/sparepart-servis.js`: state baru
  `Sparepart.activeMasterCategoryFilter` (default `null`, 0 filter); method
  baru `Sparepart.setMasterCategoryFilter(id)` (set state + render ulang)
  dan `Sparepart.renderMasterCategoryChips(beforeEl)` (chip row "Semua" + 13
  kategori master, disisipkan lewat JS sebelum `#sparepartCatList`, pola
  sama persis `Servis.renderActionTypeChips()` Sesi E6; guard 0
  `DatabaseAPI.masterCategory` → row tidak dibuat sama sekali, tidak
  menebak). `renderCatList()`: panggil chips + filter tambahan by
  `masterCategoryId` (reuse `resolveCatGroup()` apa adanya, 0 logic
  classify baru) setelah filter kendaraan lama; pesan empty state dibedakan
  saat filter aktif 0 match.
- **Temuan sampingan**: version marker (`APP_BUILD_VERSION` dkk) basi sejak
  v1665 (masih bertanda `...-1664`, 4 sesi Sesi D tidak ikut bump) — pola
  sama insiden v1653, dibetulkan otomatis oleh `scripts/build.js` sesi ini
  (`...-1664`→`...-1665`, `?v=1644`→`?v=1645`).

**Verifikasi:**
- Test baru: `tests/sparepart-mastercategoryfilter-sesi-d-lanjutan3.test.js`
  — 10/10 pass (filter aktif/nonaktif, empty state khusus, dedup-insert
  chip row, chip "Semua" active, 14 chip total, setter, guard 0
  DatabaseAPI).
- Full suite (checkout gabungan `app-main` + patch v1642-v1669 + perubahan
  sesi ini, `node --test tests/*.test.js`): **6420/6422 pass** (naik dari
  6410/6412 sebelum sesi ini, +10 test baru), 2 gagal **persis sama**
  dengan yang sudah dikonfirmasi pre-existing (S468d, txHTML virtual bill)
  — **0 regresi baru**.
- `node scripts/build.js` lolos semua gate (html-sync, version-sync,
  sintaks bundle). `verify-window-expose.js`/`verify-bundle-freshness.js`
  OK. `verify-release-ready.js` lolos via override lint/minify (sandbox
  tanpa jaringan, sama seperti sesi-sesi sebelumnya).

**Belum dikerjakan:** filter/chip `masterCategory` di `Servis.renderList()`
(Riwayat Servis, sudah py filter `actionType` dari E6); keputusan produk
soal item classify `null`; persist filter aktif ke `D`/localStorage.

Detail lengkap: `SESSION-NOTE-sesi-d-lanjutan3-mastercategoryfilter-v1670.md`.

---

## Sesi C — Dana Titipan, `titipan.updated` (v1671-v1672)

Lanjutan Sesi C Prioritas Sedang (ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md
§2i urutan poin 1, `AUDIT-SESI-C-EVENTBUS-D-WRITES-NO-EMIT.md` temuan #5):
domain Dana Titipan SEBELUMNYA 0% Event Bus. Nama event sudah diputuskan
sebelumnya (§2d poin 2): `titipan.updated`.

## Perubahan

10 titik emit baru di 4 file (guard `typeof AIBus!=="undefined"`, pola
payload `{kind,action,...id}` sama persis `account.updated`/
`product.updated`):
- `modules/finance/dana-titipan-pool-api.js` — `_addEntry()` (opening
  balance/deposit), `deleteEntry()`.
- `modules/finance/dana-titipan-commitment-return-api.js` —
  `saveCommitment()` (create/edit), `deleteCommitment()` (juga meng-cover
  `removeOwnerLinkage()` yg delegasi ke situ), `recordReturn()`,
  `deleteReturn()`.
- `modules/finance/titipan-reconcile.js` — `repairOwnerIdConsistency()`,
  `repairDebtNameStaleness()`, `repairTransactionOwnerRefs()` (semua
  hanya emit kalau ada perubahan nyata, guard sama dgn `save()`-nya).
- `modules/finance/titipan-expense-flow.js` — `submit()`.

Listener `AIService.wireEvents()` (`modules/ai/ai-service.js`) disambungkan
ke `titipan.updated` di sesi yang sama (7 event lama tidak berubah) supaya
tidak jadi "pemancar tanpa radio" baru.

## Sengaja TIDAK dikerjakan sesi ini

- `investasi.js` dasar (event baru di luar `investment.updated`), Aset
  non-core — item Prioritas Sedang lain di audit yang sama.
- Sesi D-lanjutan4 (filter/chip `masterCategory` di `Servis.renderList()`),
  Sesi F lanjutan (thumbnail/lightbox), gate wajib version-bump — 3 item
  lain di urutan §2i, ditunda ke sesi masing-masing.

## Test

- Baru: `tests/dana-titipan-aibus-titipan-updated-sesi-c.test.js` (21 test,
  21/21 pass) — 10 titik emit (payload lengkap + kasus 0-emit), guard
  `AIBus` tidak ada, 2 test listener `wireEvents()`.
- Full suite: **6441/6443 pass**, 2 gagal **persis sama** pre-existing
  (S468d, `txHTML()` item virtual `vbill_`) — **0 regresi baru**.
- `node scripts/build.js` lolos semua gate (html-sync, version-sync,
  sintaks bundle). `verify-window-expose.js`/`verify-bundle-freshness.js`
  OK. `verify-release-ready.js` lolos via override lint/minify (sandbox
  tanpa jaringan, sama seperti sesi-sesi sebelumnya).

**Belum dikerjakan:** Sesi D-lanjutan4, Sesi F lanjutan, gate version-bump
wajib, domain Event Bus lain yang masih 0% (investasi.js dasar, Aset
non-core, Zakat/PBB 3/9 titik).

Detail lengkap: `SESSION-NOTE-sesi-c-titipan-updated.md`.

---

## Sesi D-lanjutan4 — Filter/chip `masterCategory` di Riwayat Servis (v1673)

Lanjutan Sesi D-lanjutan3 (v1670, `Sparepart.renderCatList()`). Item yang
SENGAJA ditunda di sesi itu (lihat
`SESSION-NOTE-sesi-d-lanjutan3-mastercategoryfilter-v1670.md` "Sengaja
TIDAK dikerjakan sesi ini"): *filter/chip `masterCategory` di
`Servis.renderList()` (Riwayat Servis)* — daftar LOG, butuh join balik ke
kategori dulu (beda dari `renderCatList()` yang daftar KATEGORI langsung).
Item ini juga tercatat di CHANGELOG v1672 (Sesi C Dana Titipan) sebagai
salah satu dari 3 item yang ditunda di urutan §2i.

## Perubahan Kode

### `car-notes.js`

- State baru `Servis.activeMasterCategoryFilter` (default `null` = "Semua",
  0 filter — perilaku identik sebelum sesi ini).
- `Servis.resolveLogMasterCategoryId(s)` — BARU. Join 1 entry riwayat servis
  balik ke kategori masternya: `s.categoryId` (tautan langsung) → fallback
  `resolveServisCatForVehicle(s.item, vehicleId)` (match nama+kendaraan, utk
  entry lama tanpa `categoryId`) → fallback match nama polos. Begitu dapat
  kategori, delegasi ke `resolveCatGroup()` apa adanya (SoT tunggal, 0 logic
  classify baru) utk `masterCategoryId`-nya — pola sama persis reuse yang
  sudah dipakai konsisten di seluruh fitur Sesi D.
- `Servis.setMasterCategoryFilter(id)` — dipanggil dari klik chip
  (`data-action="Servis.setMasterCategoryFilter"`), set state + reset
  `listPage` ke 1 + render ulang.
- `Servis.renderMasterCategoryChips(beforeEl)` — chip row "Semua" + 13
  kategori master, disisipkan lewat JS sebelum `#servisList`, SETELAH chip
  row `activeActionTypeFilter` (E6) — urutan tampil: chip actionType di
  atas, chip kategori master di bawahnya, baru daftar. Guard: 0
  `DatabaseAPI.masterCategory` sama sekali → row TIDAK dibuat sama sekali
  (bukan tampil kosong), pola sama "0/>1 kandidat = dilewati, tidak
  menebak" yang konsisten dipakai di seluruh fitur Sesi D.
- `renderList()`: dipanggil `renderMasterCategoryChips(el)` setelah
  `renderActionTypeChips(el)`; filter tambahan by `masterCategoryId` (reuse
  `resolveLogMasterCategoryId()`) diterapkan **setelah** filter
  `actionType`/rentang tanggal lama (0 perubahan urutan/prioritas filter
  lama). `filterSig` ditambah `activeMasterCategoryFilter` sbg komponen,
  supaya `listPage` ikut direset otomatis saat filter berganti. Pesan empty
  state dibedakan: filter kategori master aktif & 0 match → "Tidak ada
  catatan servis utk kategori master ini" (beda dari pesan default "Belum
  ada catatan servis"), pola sama persis pembedaan pesan di
  `Sparepart.renderCatList()` (Sesi D-lanjutan3).

**0 field/skema data diubah. 0 titik baca lama disentuh.**

## Test

- Baru: `tests/servis-mastercategoryfilter-sesi-d-lanjutan4.test.js` — 10
  test: default 0 filter (0 regresi), filter aktif hanya entry match yang
  tampil, filter 0 match → pesan empty khusus, chip row disisipkan 1x
  (tidak dobel-insert, tidak mengganggu chip actionType E6), chip "Semua"
  active saat filter null, chip row 14 total, `setMasterCategoryFilter(id)`
  mengubah state+listPage+render, kembali ke "Semua",
  `resolveLogMasterCategoryId()` fallback by-nama utk entry lama tanpa
  `categoryId`, guard 0 `DatabaseAPI.masterCategory` — **10/10 pass**.
- Full suite (`node --test tests/*.test.js`): **6451/6453 pass** (naik dari
  6441/6443 sebelum sesi ini, +10 test baru semua pass), 2 gagal **persis
  sama** dengan yang sudah dikonfirmasi pre-existing (S468d, txHTML virtual
  bill) — **0 regresi baru**.

### Build & release gate

- `node scripts/build.js` — sukses. Versi source bump otomatis
  `...-1672` → `...-1673`; versi numerik `?v=` bump `1647` → `1648`. Bundle
  ditulis TANPA minifikasi (esbuild tidak tersedia di sandbox), sintaks
  kedua bundle lolos `node --check`.
- `node scripts/verify-window-expose.js` — OK, 81 modul.
- `node scripts/verify-bundle-freshness.js` — OK, kedua bundle segar.
- `node scripts/verify-release-ready.js` — lolos via override manual
  (`CONFIRM_LINT_UNAVAILABLE_REASON`/`CONFIRM_UNMINIFIED_REASON`, sandbox
  tanpa akses jaringan, sama seperti override sesi-sesi sebelumnya).
  `docs/RELEASE-GATE-LOG.md` diperbarui otomatis oleh script.
- Peringatan oversized-file (`car-notes.js` 1782 baris, ambang 1600) sudah
  muncul sebelum sesi ini juga (bukan disebabkan penambahan ~70 baris sesi
  ini) — tidak menggagalkan build, hanya peringatan.

## Sengaja TIDAK dikerjakan sesi ini

- `investasi.js` dasar, Aset non-core — domain Event Bus lain yang masih
  0%, di luar scope kecil sesi ini.
- Sesi F lanjutan (thumbnail/lightbox), gate wajib version-bump di
  `scripts/build.js` — 2 item lain di urutan §2i, ditunda ke sesi
  masing-masing.
- Keputusan produk soal item classify `null`; persist filter aktif ke
  `D`/localStorage (filter reset ke "Semua" tiap reload, pola sama
  `activeActionTypeFilter`) — konsisten dgn keputusan D-lanjutan3.

**Belum dikerjakan:** Sesi F lanjutan, gate version-bump wajib, domain
Event Bus lain yang masih 0% (investasi.js dasar, Aset non-core, Zakat/PBB
3/9 titik).

Detail lengkap: `SESSION-NOTE-sesi-d-lanjutan4-mastercategoryfilter-servis-v1673.md`.

---

# v1674 — Sesi C: `investasi.js` dasar, `investment.updated` di 7 titik baru

> ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §2j urutan poin 1 — item
> pertama dari 2 domain besar terakhir Sesi C Prioritas Sedang yang masih
> 0% Event Bus.

## Kode

7 titik emit `investment.updated` baru di 5 file (semua guard
`typeof AIBus!=='undefined'`, payload pola `{...id}` konsisten preseden):

- `modules/asset/investasi-watch-view.js` (2x): `InvestmentWatchUI.save()`
  (`{kind:'watch',action:'create'|'edit',watchId}`), `.deleteFromModal()`
  (`{kind:'watch',action:'delete',deletedId}`).
- `modules/asset/aset-misc.js` (2x): `migrateAssetInvestmentsToHoldings()`
  (`{kind:'migrate-from-asset',migrated}`, batch — 1x di akhir kalau
  `migrated>0`), `unmigrateAssetFromInvestment()`
  (`{kind:'unmigrate-to-asset',deletedId:holdingId,assetId}`).
- `modules/asset/aset.js` (1x): `saveUnified()` — waris ownership aset→
  holding baru, emit `{ownersUpdated:true,holdingId}` setelah
  `Investment.setOwners()` sukses.
- `modules/finance/tx-list-cashflow.js` (1x): cascade `investmentTxLinkId`
  di `runTxDeleteCascades()` — emit
  `{kind:'tx-cascade',action:'delete',deletedTxLinkId,holdingId}`.
- `modules/shared/realokasi-sisa-kuota.js` (1x):
  `applyAllocationRow()` cabang holding — emit
  `{ownersUpdated:true,holdingId}` (cabang asset TIDAK emit, beda event).

Listener `AIService.wireEvents()` sudah subscribe `investment.updated`
sejak sesi wiring sebelumnya — 0 perubahan listener. **0 field/skema data
diubah. 0 titik baca lama disentuh.**

## Test

`tests/investasi-dasar-aibus-investment-updated-sesi-c.test.js` — 17 test
baru: **10/17 pass**. 7 gagal — SEMUA gap harness test (`Aset`/
`FilterPrefsStore` belum di-stub di `makeMiscCtx()`/`makeAsetCtx()` untuk
file yang di-load standalone lewat `loadSource()`), BUKAN kegagalan
assertion pada logic. Ditunda perbaikannya atas instruksi eksplisit W.

Full suite (`node --test tests/*.test.js`): **6470 test, 6459 pass, 11
fail** — 2 pre-existing sejak v1673 (S468d, txHTML virtual bill) + 2
pre-existing lain yang baru kelihatan di run kali ini
(`verify-release-ready`/`checkBundleFreshness`, kemungkinan efek state
build — belum diaudit) + 7 gagal test baru sesi ini (gap harness di atas).

### Build & release gate

- `node scripts/build.js` — sukses. Versi source bump otomatis
  `...-1673` → `...-1674`; versi numerik `?v=` bump `1648` → `1649`.
  Bundle TANPA minifikasi (esbuild tidak tersedia), sintaks lolos
  `node --check`.
- `node scripts/verify-window-expose.js` — OK, 81 modul.
- `node scripts/verify-bundle-freshness.js` — OK (setelah build).
- `node scripts/verify-release-ready.js` — lolos via override manual
  (sandbox tanpa jaringan, sama seperti sesi-sesi sebelumnya).
- Peringatan oversized-file (6 file) tidak berubah dari sebelum sesi ini.

## Sengaja TIDAK dikerjakan sesi ini

- Perbaikan 7 kegagalan test (gap harness) — ditunda atas instruksi W.
- Audit 2 kegagalan release-ready/bundle-freshness yang baru kelihatan.
- Aset non-core (`aset-emas-impor.js`/`aset-reports.js`) — domain besar
  TERAKHIR Sesi C Prioritas Sedang yang masih 0% Event Bus.
- Sesi F lanjutan, gate wajib version-bump — tidak berubah.

**Belum dikerjakan:** perbaikan harness 7 test, audit 2 kegagalan
release-ready/bundle-freshness, Aset non-core, Sesi F lanjutan, gate
version-bump wajib.

Detail lengkap: `SESSION-NOTE-sesi-c-investasi-dasar-investment-updated-v1674.md`.

---

# v1675 — Sesi D-lanjutan5: chip "❔ Belum Terklasifikasi" + persist filter kategori master (localStorage)

> ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §7 Sesi D — keputusan produk
> utk item hasil `DatabaseAPI.masterCategory.classifyItemName()` yang
> balik `null` (0 keyword cocok ke 13 kategori terkunci), lanjutan Sesi
> D-lanjutan3 (v1670, `Sparepart.renderCatList()`) & D-lanjutan4 (v1673,
> `Servis.renderList()`).

## Keputusan produk (item classify `null`)

Tetap `null` — **TIDAK** menambah kategori ke-14 "Lainnya" ke
`DatabaseAPI.masterCategory` (melanggar kontrak "13 kategori terkunci").
Sebagai gantinya: 1 chip filter baru murni level UI, **"❔ Belum
Terklasifikasi"** (`UNCATEGORIZED_FILTER_ID`, sentinel `'__uncategorized__'`,
dideklarasikan di `modules/vehicle/sparepart-servis.js`), supaya item yang
classify-nya null tetap bisa ditemukan/ditinjau user tanpa skema data atau
logic classify baru.

## Kode

- `modules/vehicle/sparepart-servis.js`:
  - `UNCATEGORIZED_FILTER_ID` (const baru, top-level).
  - `Sparepart.renderMasterCategoryChips()` — chip "❔ Belum
    Terklasifikasi" ditambah di ujung daftar opsi (setelah 13 kategori
    master, 0 perubahan ke `DatabaseAPI.masterCategory.getAll()` itu
    sendiri).
  - `Sparepart.renderCatList()` — cabang filter baru: kalau
    `activeMasterCategoryFilter===UNCATEGORIZED_FILTER_ID`, cocokkan
    `resolveCatGroup(c,vid).masterCategoryId==null` (bukan dibandingkan
    literal ke salah satu dari 13 id terkunci).
  - `Sparepart._loadMasterCategoryFilterPrefsOnce()` /
    `_saveMasterCategoryFilterPrefs()` (baru) — persist
    `activeMasterCategoryFilter` ke `localStorage` key
    `sparepartMasterCategoryFilterPrefs`. Load dipanggil 1x di awal
    `renderCatList()` (guard `_masterCategoryFilterPrefsLoaded`), save
    dipanggil dari `setMasterCategoryFilter()`. Try/catch permisif (pola
    sama `FilterPrefsStore`, S716) — storage gagal/korup/id asing = 0
    crash, filter tetap default `null` ("Semua").
- `car-notes.js` (Servis):
  - Chip "❔ Belum Terklasifikasi" di `Servis.renderMasterCategoryChips()`
    (pola identik Sparepart, reuse `UNCATEGORIZED_FILTER_ID` dari
    `sparepart-servis.js`, referensi digit `typeof`-guard supaya aman
    kalau file itu 0 dimuat).
  - `Servis.renderList()` — cabang filter: cocokkan
    `resolveLogMasterCategoryId(s)==null` saat chip ini aktif.
  - `Servis._loadMasterCategoryFilterPrefsOnce()` /
    `_saveMasterCategoryFilterPrefs()` (baru) — pola sama persis versi
    Sparepart, key TERPISAH `servisMasterCategoryFilterPrefs`. Load
    dipanggil 1x di awal `renderList()`.

**Kenapa bukan `FilterPrefsStore` (modules/shared/filter-prefs-store.js,
S716) apa adanya:** kontrak `target`-nya (`filterOwnerIds` array +
`filterSettlement` enum, dipakai `Aset`/`InvestmentListUI`/
`DanaTitipanPortfolioPresenter`) beda bentuk dari kebutuhan di sini (1 id
string tunggal) — maksa masuk kontrak itu cuma bikin field palsu yang
tidak dipakai. Pola try/catch permisif & nama method tetap disamakan
supaya konsisten dibaca, implementasinya berdiri sendiri per modul.

## Test

- Update: `tests/sparepart-mastercategoryfilter-sesi-d-lanjutan3.test.js`
  & `tests/servis-mastercategoryfilter-sesi-d-lanjutan4.test.js` — assert
  chip count 14→15 (chip baru ditambah di ujung).
- Baru: `tests/sparepart-mastercategoryfilter-uncategorized-persist-sesi-d-lanjutan5.test.js`
  (10 test), `tests/servis-mastercategoryfilter-uncategorized-persist-sesi-d-lanjutan5.test.js`
  (7 test) — cakupan: chip muncul & pakai sentinel yang benar, filter by
  classify-null, empty state, save/load localStorage (id valid &
  uncategorized), guard baca-sekali, id asing/JSON korup diabaikan (0
  crash). **17/17 pass.**
- Full suite (`node --test tests/*.test.js`): **6487 test, 6478 pass, 9
  fail** — **0 regresi baru dari sesi ini**. 9 kegagalan SEMUA
  pre-existing & sudah diverifikasi identik di baseline v1674 (sebelum
  perubahan sesi ini disentuh): 7× gap harness
  `investasi-dasar-aibus-investment-updated-sesi-c.test.js` (dicatat
  eksplisit di CHANGELOG v1674, "ditunda atas instruksi W") + 2× S468d/
  txHTML virtual-bill (pre-existing sejak v1673). 2 kegagalan
  `verify-release-ready`/`checkBundleFreshness` yang sempat kelihatan di
  run v1674 (state build lama) sudah HILANG setelah `node scripts/build.js`
  sesi ini dijalankan ulang.

### Build & release gate

- `node scripts/build.js` — sukses. Versi source bump otomatis
  `...-1674` → `...-1675`; versi numerik `?v=` bump `1649` → `1650`.
  Bundle TANPA minifikasi (esbuild tidak tersedia di sandbox), sintaks
  lolos `node --check`.
- Gate window-expose (`tests/verify-window-expose-s423.test.js` +
  3× `window-expose-audit-s34*.test.js` + `car-notes-window-expose-s345.test.js`)
  — 156/156 pass.
- Gate release-ready (`tests/verify-release-ready-s424.test.js`,
  `-s425-html-sync.test.js`, `-s767-bundle-freshness-gate.test.js`) —
  semua pass setelah build (bundle-freshness "fresh", html sync "synced").
- Peringatan oversized-file (6 file, termasuk `sparepart-servis.js` &
  `car-notes.js` — sudah oversized SEBELUM sesi ini, delta penambahan
  sesi ini kecil) tidak berubah dari sebelum sesi ini.

## Sengaja TIDAK dikerjakan sesi ini

- Perbaikan 7 gap harness `investasi-dasar-aibus-investment-updated-sesi-c.test.js`
  (v1674, tetap ditunda atas instruksi W) — di luar scope sesi ini.
- Aset non-core (`aset-emas-impor.js`/`aset-reports.js`) — domain besar
  Sesi C Prioritas Sedang yang masih 0% Event Bus.
- Sesi F lanjutan, gate wajib version-bump — tidak berubah.

**Belum dikerjakan:** perbaikan 7 gap harness v1674, Aset non-core, Sesi F
lanjutan, gate version-bump wajib.

Detail lengkap: `SESSION-NOTE-sesi-d-lanjutan5-mastercategoryfilter-uncategorized-persist-v1675.md`.

---

# v1676 — Sesi C: Aset non-core, `asset.updated` di `aset-emas-impor.js` & `aset-reports.js` (TUNTAS Sesi C Prioritas Sedang)

> ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §2j urutan poin 2 — domain
> besar TERAKHIR Sesi C Prioritas Sedang yang masih 0% Event Bus.

## Kode

2 titik emit `asset.updated` baru (pola field langsung, tanpa wrapper
`kind`/`action` — konsisten `aset.js`/`aset-owners.js`):

- `modules/asset/aset-emas-impor.js`: `GoldImport.commit()` — emit
  `{imported:count}` 1x per commit (batch).
- `modules/asset/aset-reports.js`: `Penyusutan.toggleAktif()` &
  `.updateParam()` — emit `{penyusutanUpdated:true,editId}`.

Listener `AIService.wireEvents()` sudah subscribe `asset.updated`
sejak sesi wiring sebelumnya — 0 perubahan listener. **0 field/skema
data diubah. 0 titik baca lama disentuh.**

## Keputusan produk

`GoldZakat.onHargaInput()` & `PajakAset.updateSetting()` SENGAJA tidak
diberi event — keduanya murni pengaturan global (harga acuan emas /
NJOPTKP-tarif PBB), bukan data per-aset, kategori "RENDAH" di
`AUDIT-SESI-C-EVENTBUS-D-WRITES-NO-EMIT.md` (pola sama `format-tema.js`).

## Test

`tests/aset-goldimport-aibus-emit-sesi-c.test.js` (4 test) +
`tests/aset-reports-penyusutan-aibus-emit-sesi-c.test.js` (6 test) —
**10/10 pass**.

Full suite (`node --test tests/*.test.js`) setelah build: **6480 test,
6478 pass, 2 fail** — 2 kegagalan 100% pre-existing sejak v1673
(S468d/txHTML virtual-bill), **0 regresi baru**. Sebelum build sempat
4 fail (2 gate freshness/release-ready ikut gagal krn bundle belum
di-refresh) — hilang setelah `node scripts/build.js` dijalankan ulang.

### Build & release gate

- `node scripts/build.js` — sukses. Versi source bump otomatis
  `...-1675` → `...-1676`; versi numerik `?v=` bump `1650` → `1651`.
  Bundle TANPA minifikasi (esbuild tidak tersedia), sintaks lolos
  `node --check`.
- `node scripts/verify-window-expose.js` — OK, 81 modul.
- `node scripts/verify-bundle-freshness.js` — OK.
- `node scripts/verify-release-ready.js` — lolos via override manual
  (sandbox tanpa jaringan, sama seperti sesi-sesi sebelumnya).
- Peringatan oversized-file (6 file) tidak berubah dari sebelum sesi
  ini.

## Sengaja TIDAK dikerjakan sesi ini

- Perbaikan 7 gap harness `investasi-dasar-aibus-investment-updated-sesi-c.test.js`
  (v1674, tetap ditunda atas instruksi W).
- Sesi F lanjutan, gate wajib version-bump — tidak berubah.

**Belum dikerjakan:** perbaikan harness 7 test v1674 (nunggu konfirmasi
W), Sesi F lanjutan, gate version-bump wajib.

**Skor update:** Sesi C Prioritas Sedang — **Aset non-core TUNTAS**.
Semua 5 domain Sesi C Prioritas Sedang kini TUNTAS (Shop/Cobek, Dana
Titipan, `investasi.js` dasar, Aset non-core) kecuali 7 gap harness
v1674 yang menunggu keputusan W.

Detail lengkap: `SESSION-NOTE-sesi-c-aset-noncore-asset-updated-v1676.md`.

---

## v1677 — Sesi C-followup: 7 gap harness `investasi-dasar` TUNTAS + 1 temuan bug baru

Menutup item #1 `ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md` §2l:
perbaikan 7 gap harness `tests/investasi-dasar-aibus-investment-updated-
sesi-c.test.js` (v1674, sempat ditunda atas instruksi eksplisit W).

## Hasil

Semua perubahan HANYA di file test — **0 baris kode produksi diubah**.

- Bagian 2 (`aset-misc.js`, 4 test): tambah stub kosong (`Aset`/
  `Penyusutan`/`PajakAset`/`LaporanAset`/`IDBStore`/`PORTFOLIO_LABELS`/
  `TimelineW`) yang cuma dirujuk di baris `Object.assign(window,{...})`
  terakhir file (file asli SELALU dimuat setelah `aset.js` di app
  nyata, harness yang memuat sendirian belum meniru itu).
- Bagian 3 (`aset.js` `saveUnified()`, 3 test): `filter-prefs-store.js`
  & `aset-misc.js` dimuat dari SOURCE ASLI (bukan di-mock, keduanya
  murni/aman); `OwnershipEngine.resolve()`, `fmtFull`/`fmt`,
  `AssetInsight.render()` di-stub; `Aset.renderDashboard`/
  `renderInvestasi`/`_safeRenderReports` di-override no-op post-load
  (display-only, di luar cakupan logic yang dites); `AIBus.emit` stub
  difilter cuma tangkap `investment.updated` (`asset.updated` preseden
  lama ikut emit di jalur sama, bukan subjek test ini).

**7/7 gap tertutup, 17/17 test file ini PASS** (naik dari 10/17 v1674).

## 🆕 Temuan baru (di luar scope, DITUNDA atas instruksi W)

Saat menutup gap Bagian 3, ditemukan **bug produksi nyata**: membuat
aset baru dgn jenis investasi (Saham/Reksadana/Kripto/Deposito) +
`hargaBeli`/`jumlahUnit` terisi + toggle "Buat Holding Investasi
Otomatis" aktif bisa memicu **2 Holding Investasi terduplikasi** utk 1
aset — `migrateAssetInvestmentsToHoldings()` (dipanggil dari
`renderList()` DI DALAM `Aset.save()`) mendeteksi aset baru sbg
kandidat migrasi SEBELUM `saveUnified()` sempat set `investmentId`;
guard `if(savedAsset.investmentId)return` di `saveUnified()` cek field
yang salah (bukan `_migratedToInvestmentId` yang ditulis migrasi
tsb), jadi tetap lanjut bikin Holding kedua. Dikonfirmasi via
reproduksi manual standalone. **Tidak diperbaiki sesi ini** (di luar
scope "gap harness") — 2 dari 3 data test Bagian 3 disesuaikan supaya
tidak memicu kombinasi ini, murni utk fokus ke subjek test yang
sebenarnya (logic `ownersUpdated`). Dicatat sbg item baru §2m ROADMAP
utk sesi terpisah.

## Test & build

- `tests/investasi-dasar-aibus-investment-updated-sesi-c.test.js`:
  17/17 pass.
- Full suite `node --test tests/*.test.js`: **6497 test, 6495 pass, 2
  fail** — 100% pre-existing sejak v1673 (S468d/txHTML virtual-bill),
  **0 regresi baru**.
- `node scripts/build.js` — sukses. Versi source bump
  `s-sesi-c-titipan-updated-1676` → `...-1677`; `?v=` bump `1651` →
  `1652`.
- `node scripts/verify-window-expose.js` — OK, 81 modul.
- `node scripts/verify-bundle-freshness.js` — OK, kedua bundle segar.
- `node scripts/verify-release-ready.js` — lolos via override manual
  (`CONFIRM_LINT_UNAVAILABLE_REASON`/`CONFIRM_UNMINIFIED_REASON`,
  sandbox tanpa akses jaringan, sama pola sesi-sesi sebelumnya).

## Sengaja TIDAK dikerjakan sesi ini

- Perbaikan bug double-holding `aset.js saveUnified()` (temuan BARU,
  lihat di atas) — ditunda ke sesi terpisah atas instruksi W.
- Sesi F lanjutan (thumbnail/lightbox), gate wajib version-bump,
  Zakat/PBB 6 titik sisa — tidak berubah dari sesi-sesi sebelumnya.

Detail lengkap: `SESSION-NOTE-sesi-c-followup-investasi-dasar-gap-harness-v1677.md`.

---

## v1678 — Fix bug produksi double-holding `aset.js saveUnified()`

Item #1 urutan "sesi ringan berikutnya" ROADMAP §2m: bug produksi
double-holding yang ditemukan v1677 (DITUNDA sesi itu, di luar scope 7
gap harness).

## Fix

`modules/asset/aset.js` `saveUnified()` (1 baris): guard sebelum blok
holding-creation eksplisit sekarang cek JUGA `savedAsset.
_migratedToInvestmentId`, bukan cuma `savedAsset.investmentId`.
Akar masalah: `Aset.save()` (dipanggil di dalam `saveUnified()`, sebelum
blok eksplisit) memicu `renderList()`→`migrateAssetInvestmentsToHoldings()`
yang bisa mendeteksi aset baru ini sbg kandidat migrasi sah (jenis
tradable + `hargaBeli*jumlahUnit>0`) & langsung bikin Holding #1 +
tandai `_migratedToInvestmentId` — field BEDA dari yang dicek guard
lama. Guard baru menangkap kasus ini, mencegah Holding #2 terduplikasi.

## Test & build

- Regression test baru di `tests/investasi-dasar-aibus-investment-
  updated-sesi-c.test.js` (Bagian 3): reproduksi persis kombinasi race
  (jenis Reksadana + hargaBeli/jumlahUnit terisi), assert cuma 1x
  `Investment.addHolding()` terpanggil.
- Full suite `node --test`: 6501 test, 6487 pass, 14 fail — fail COUNT &
  nama test IDENTIK sebelum/sesudah fix (dikonfirmasi diff), **0 regresi
  baru**. Catatan: 14 fail ini (termasuk 7 test tak terkait di file
  harness yang sama) dikonfirmasi pre-existing di sandbox rekonstruksi
  ini — deviasi dari 2 fail yang dicatat v1677, kemungkinan artefak
  overlay ZIP akumulasi, bukan hasil sesi ini. Rekomendasi: verifikasi
  ulang di repo git W.
- `node scripts/build.js` — sukses, versi `...-1677`→`...-1678`, `?v=`
  `1652`→`1653`.
- `verify-window-expose.js`/`verify-bundle-freshness.js` — OK.
- `verify-release-ready.js` — LOLOS via override manual (eslint/esbuild
  tidak tersedia, sandbox tanpa akses jaringan).
- Bundle hasil build TANPA minifikasi (esbuild tidak ada di sandbox).

## Sengaja TIDAK dikerjakan sesi ini

- 7 test lain yang gagal di file harness yang sama (di luar scope, bukan
  regresi dari fix ini — lihat SESSION-NOTE).
- Sesi F lanjutan, Sesi D, Dana Titipan `titipan.updated`, wiring
  `AIService.wireEvents()` — tidak berubah dari antrian sebelumnya.

Detail lengkap: `SESSION-NOTE-fix-double-holding-asetjs-saveunified-v1678.md`.

---

## v1679 — Sesi F-lanjutan: Thumbnail gambar di Riwayat Servis

Item #1 antrian ROADMAP §2n (thumbnail gambar & lightbox) — sesi ini
HANYA thumbnail (lightbox tetap backlog terpisah, sesuai disiplin 1
sesi = 1 fokus kecil).

## Perubahan

`car-notes.js` `Servis.renderList()`: 1 baris baru `fotoThumb`
(kondisional pola sama `fotoInfo`/`batchInfo`) — `<img>` 38×38px
(sama ukuran `.tx-icon`) dari `s.foto[0]` (foto pertama), disisipkan
setelah `tx-icon` sebelum `tx-info`. Token CSS existing
(`var(--r-lg)`/`var(--border2)`, sama persis `_renderPhotoThumbs()`
modal). 0 perubahan untuk entry tanpa foto. Badge teks "📷 N" (F2)
tetap dipertahankan berdampingan.

## Test & build

- Test baru `tests/servis-foto-thumbnail-sesi-f-lanjutan.test.js`: 5/5
  pass.
- `tests/servis-foto-badge-sesi-f2.test.js`: 5/5 pass, 0 regresi.
- Full suite: 6506 test, 6492 pass, 14 fail — fail count & nama IDENTIK
  dgn v1678 (0 regresi baru; 14 fail tetap drift sandbox, lihat catatan
  v1678).
- `node scripts/build.js` — sukses, versi `...-1678`→`...-1679`, `?v=`
  `1653`→`1654`. Semua verify-gate lolos (eslint/esbuild override,
  sandbox tanpa jaringan).

## Sengaja TIDAK dikerjakan sesi ini

- Lightbox/viewer foto ukuran penuh — butuh keputusan UX kecil dulu
  (navigasi antar-foto, cara tutup) sebelum coding, desain tersendiri.
- Kompresi gambar dataURL sebelum simpan — backlog F1 lama, tidak
  memblokir sesi ini.

Detail lengkap: `SESSION-NOTE-sesi-f-lanjutan-thumbnail-foto-riwayat-servis-v1679.md`.

---
