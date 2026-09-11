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

