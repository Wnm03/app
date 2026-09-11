# Roadmap Konsolidasi — Database Servis Berkala & Arsitektur Engine (v2, update audit v1646)

> **Update audit (PATCH-v1646-akumulasi-checklist-servis-restored.zip):**
> patch ini merekonsiliasi 3 cabang paralel (checklist-servis, servis-grouping,
> database-api-vehicle) yang sempat bercabang dari baseline v1637 tanpa pernah
> digabung. Lihat §2b untuk status ter-update dan §7 untuk langkah sesi
> ringan berikutnya. ZIP ini delta-only (bukan checkout penuh) — klaim test
> di CHANGELOG/session-note (6110/6110 pass) TIDAK bisa diverifikasi ulang
> standalone di sini (`node --test` gagal: `Cannot find module
> './helpers/loadSource'`, karena `tests/helpers/` tidak ikut ter-bundle di
> delta zip). Status §2b di bawah berdasarkan audit isi kode + klaim
> tertulis, bukan re-run independen.

**Sumber:** hasil rekonsiliasi dari 5 dokumen sebelumnya —
`ROADMAP-DATABASE-SERVIS-BERKALA-v2.md`,
`PERBAIKAN-JENIS-TINDAKAN-CHECKLIST-SERVIS.md`,
`AUDIT-CAR-NOTES-SERVIS-DATABASE.md`,
`AUDIT-DATABASE-API-FINAL-V3-CAR-NOTES.md`,
`RANCANGAN-ENGINE-DATABASE-IMPORT-FINAL-v3.md`.

**Kenapa dokumen ini ada:** ROADMAP-v2 (9 modul domain servis) dan
RANCANGAN-v3 (6 lapisan Database API generik) dibuat terpisah dan
**belum pernah dipetakan satu sama lain** — risikonya dua taksonomi
paralel yang tumpang tindih saat dikerjakan. Dokumen ini memetakan
keduanya jadi satu peta kerja, digabung dengan status riil dari kedua
audit dan item yang sudah siap coding.

====================================================

## 1. Peta Konsolidasi — 9 Modul Domain ↔ 6 Lapisan Database API

| # | Modul (ROADMAP-v2) | Masuk lapisan mana (RANCANGAN-v3) | Catatan rekonsiliasi |
|---|---|---|---|
| 1 | Data Kendaraan | **Vehicle Database** | `manufacturerId/modelName/year/...` — ini persis gap #1–#2 di AUDIT-CAR-NOTES |
| 2 | Master Kategori & Komponen Servis | **Master Database** | 13 kategori terkunci + `service_items` lintas model — ini yang bikin `TORSI_DB` bisa lepas dari hardcode |
| 3 | Spesifikasi Teknis & Standar Servis | **Vehicle Database** (per-model) | Sebagian umum (satuan, tipe oli umum) bisa naik ke **Reference Database** kalau makin banyak model share nilai sama |
| 4 | Data Part & Consumable | **Asset Database** | Beda dari `VehicleCatalogStore` (itu stok/harga milik user) — ini katalog part resmi per item servis |
| 5 | Jadwal & Paket Servis | **Vehicle Database** (paket per model) + **Platform Database** (Fase 2, kalau paket ternyata sama lintas model 1 platform) | Baru relevan sebagai Platform DB begitu ada >2 model se-platform |
| 6 | Prosedur, Pemeriksaan & Checklist Servis | **Bukan lapisan DB** — app-layer, baca dari Master/Vehicle DB, tulis ke `D.servisLogs` (data user) | Ini yang dikerjakan di PERBAIKAN-JENIS-TINDAKAN (field `actionType`) |
| 7 | Riwayat & Dokumentasi Servis | **Bukan lapisan DB** — `D.servisLogs` (data user), FK ke Service Item master | Foto masih gap (dicatat kedua audit) |
| 8 | Reminder & Estimasi Biaya | **Bukan lapisan DB** — app-layer di atas Vehicle DB + data user | Sudah bagian terkuat sistem (AUDIT-CAR-NOTES #6) |
| 9 | Import & Sumber Data Servis | **Import Database** (modul Engine, bukan lapisan data) | Ini yang membuat modul 1–5 bisa diisi tanpa edit kode |

**Insight dari pemetaan ini:** modul 1–5 & 9 di ROADMAP-v2 = data referensi statis → harus lewat Database API (6 lapisan). Modul 6–8 = fitur aplikasi yang **mengonsumsi** Database API tapi tulis ke data user (`D`) — jangan dipaksa jadi "lapisan database" baru, cukup pastikan mereka baca lewat `DatabaseAPI`, bukan literal langsung (ini juga temuan Fase 1 di AUDIT-DATABASE-API: `GENERIC_GROUP_BY_NAME` dkk masih baca literal, belum lewat API).

====================================================

## 2. Status Saat Ini (gabungan dua audit)

| Lapisan / Modul | Status | Sumber audit | Catatan singkat |
|---|---|---|---|
| Engine (folder `engine/` vs `vehicle/`) | 🟡 25% | AUDIT-DATABASE-API | Struktur folder ada, data & logic masih 1 file |
| Database API (namespace `vehicle`) | 🟡 35% | AUDIT-DATABASE-API | 4 fungsi wired, fallback literal masih hidup |
| Vehicle Database | 🟡 40% | AUDIT-DATABASE-API | 2/2 model ada, read-only, duplikat data, belum IndexedDB nyata |
| Master Database | ❌ 0% | AUDIT-DATABASE-API | Belum ada sama sekali di kode |
| Import Database | ❌ 0% | AUDIT-DATABASE-API | `honda-pdf-import.js` cuma staging, belum tersambung |
| Event Bus (AIBus) | 🟡 (100% di app umum, 0% ke Database API) | AUDIT-DATABASE-API | Fondasi sudah ada, tinggal disambung sejak Fase 1 (poin 2, RANCANGAN-v3) |
| Manufacturer & Vehicle Model relasional | ❌ 0% | AUDIT-CAR-NOTES | Akar dari hampir semua keterbatasan lain |
| Service Categories (master, terkunci) | 🟡 sebagian | AUDIT-CAR-NOTES | 8 grup ad-hoc di patch, bukan 13 kategori resmi |
| Service Items master lintas model | ❌ 0% | AUDIT-CAR-NOTES | Masih tertanam di `TORSI_DB` per model |
| Maintenance Package | ❌ 0% | AUDIT-CAR-NOTES | Konsep "servis 8.000 km" sbg 1 paket belum ada |
| Foto di Service History | ❌ 0% | AUDIT-CAR-NOTES + PERBAIKAN | Konsisten disebut di kedua dokumen sbg gap |
| Checklist bisa bedakan ganti/bersih/periksa | 🟡 desain siap, 0% coding | PERBAIKAN-JENIS-TINDAKAN | Solusi sudah lengkap, tinggal Sesi 1 |

**Skor ringkas:** 34/100 (kesiapan fungsional database servis, AUDIT-CAR-NOTES) vs ≈10% (kesiapan arsitektur Final v3 murni, AUDIT-DATABASE-API) — dua angka ini **tidak kontradiktif**, mengukur hal beda: yang pertama menilai seberapa lengkap data & struktur servis untuk multi-brand; yang kedua menilai seberapa jauh implementasi Engine/DatabaseAPI dari cetak biru RANCANGAN-v3.

====================================================

## 2b. Update Status per v1646 (audit patch ini)

| Item | Status lama (§2) | Status v1646 | Catatan |
|---|---|---|---|
| Checklist bisa bedakan ganti/bersih/periksa | 🟡 desain siap, 0% coding | 🟢 selesai | `servis-checklist.js` (`SERVICE_CHECKLIST_GROUPS`) + param `actionType` di `Servis.markServiced()`/`getLastServiceKmForCat()`/`getLastServiceDateForCat()` (`_matchesActionTypeForReset()`) — sempat ter-drop di cabang B+C (v1642-v1645), digabung ulang manual di v1646, 0 saling menghapus dgn `AIBus.emit()` cabang C |
| Wiring 3 konsumen literal → `DatabaseAPI` (item Fase-1 #3, juga item "siap coding" §5.2) | 🟡 35%, fallback literal masih hidup | 🟢 4/4 konsumen dikonfirmasi wired | `findTorsiDb()`/`findVehicleSpec()` (wired sejak v1643) + `suggestServiceIntervalKm()` via `_allTorsiEntries()` (v1645) + `collectKnownGroups()` via `_allTorsiEntries()` dgn fallback (v1645). Pola guard konsisten di ke-4-nya |
| Service Categories (grouping torsi per kategori) | 🟡 8 grup ad-hoc di patch, bukan 13 kategori resmi | 🟡 tidak berubah | Grouping torsi (`resolveCatGroup()`) jalan, tapi ini masih grup tampilan reminder — bukan `service_categories` master 13-kategori terkunci di §3/§4 Fase 2. Belum ikut v1646 |
| `finance.updated` AIBus emit gap (Servis modal biasa + markServiced) | (belum tercatat di v1) | 🟢 selesai | Sesi v1644: 2 titik `Servis._saveInner()` (jalur buat baru & edit) ditambah emit; sejalan dgn Event Bus item Fase 1 #4 tapi baru sisi Servis, belum "disambung ke Database API sejak awal" secara umum |
| Manufacturer & Vehicle Model relasional | ❌ 0% | ❌ tidak berubah | Belum disentuh sesi manapun sampai v1646 |
| Master Database (`service_categories`/`service_items`) | ❌ 0% | ❌ tidak berubah | `modules/engine/database-api.js` masih cuma punya namespace `vehicle` (1/6 lapisan RANCANGAN-v3) |
| Import Database | ❌ 0% | ❌ tidak berubah | — |
| Foto di Service History | ❌ 0% | ❌ tidak berubah | — |
| `tests/database-api-vehicle-migration.test.js` (disebut hilang di §6 risiko) | disebut "tidak ditemukan di ZIP" | 🟢 ada | File ini SUDAH ADA di isi ZIP v1646 — kalau risiko §6 poin terakhir ditulis sebelum v1646, sudah tidak berlaku; belum bisa dijalankan standalone (lihat catatan di atas) tapi filenya eksis |

**Kesimpulan:** dari 2 item "siap coding sekarang" di §5, KEDUANYA sudah dikerjakan di v1646 (checklist `actionType` selesai penuh; wiring literal 4/4). Skor Fase 1 naik dari "3/5 poin belum" jadi "hanya #1 (manufacturers/vehicle_models) dan #2 (pindah TORSI_DB ke IndexedDB) yang masih 0%" — §4 Fase 1 poin 4 (Event Bus) sebagian jalan (Servis saja, bukan general).

====================================================

## 2c. Update Status per v1652 (audit akumulasi sesi A1→C1, v1647–v1652)

> Sumber: `SESSION-NOTE-sesi-a1-*-v1647.md`, `-a2-*-v1648.md`,
> `-followup-a2-*-v1649.md`, `-sesi-b-*-v1650.md`,
> `-followup-wiring-3-generic-literals-v1651.md`,
> `-sesi-c-audit-eventbus-v1651.md`, `-sesi-c1-*-v1652.md`, dan
> `AUDIT-SESI-C-EVENTBUS-D-WRITES-NO-EMIT.md`. Diaudit ulang lewat isi
> kode hasil merge 6 patch (bukan cuma baca klaim session note) — lihat
> `SESSION-NOTE-akumulasi-konsolidasi-v1647-v1652.md` untuk metode
> penggabungan & keterbatasan verifikasi (test suite tidak bisa
> di-re-run standalone di sandbox audit ini, sama seperti v1646).

### ✅ Sudah selesai sejak v1646

| Item | Sesi | Catatan |
|---|---|---|
| Fase 1 poin 1 — `manufacturers`+`vehicle_models` relasional | A1 (v1647), A2 (v1648), followup (v1649) | `DatabaseAPI.manufacturer`/`.vehicleModel` baru, `VEHICLE_MODELS` diturunkan otomatis dari `VEHICLE_DB_RECORDS`, `D.vehicles[].modelId` via migrasi `toVersion:11` (`SCHEMA_VERSION` 10→11). **Semua titik baca dikonfirmasi 0 sisa**: `findTorsiDb`/`findVehicleSpec` + 3 titik panggil (A2), `renderVehicleSpecCard()` (`modules-render-b.js`) + `_tirePressureRef()` (`fuel-maintenance-engine.js`) (followup v1649). 2 file orphan (`modules/modules-render.js` top-level, `modules/shop/modules-render.js`) dikonfirmasi TIDAK live di `scripts/build.js`, sengaja tidak disentuh + gate test anti-regresi ditambahkan |
| Fase 1 poin 3 — wiring 3 literal generik tersisa | followup-wiring (v1651) | `GENERIC_GROUP_BY_NAME`, `GENERIC_RECOMMEND_NAMES`, `FALLBACK_KEYWORDS` sekarang lewat `DatabaseAPI.master` (namespace baru) dgn fallback literal (pola sama 4 konsumen sebelumnya). Dibuktikan lewat test override data, bukan cuma cek ada/tidak |
| Sesi C — audit Event Bus (langkah wajib sebelum coding, §6) | Sesi-C-audit (v1651, 0 kode) | `AUDIT-SESI-C-EVENTBUS-D-WRITES-NO-EMIT.md` — peta lengkap titik `D` tanpa emit per domain, prioritas Tinggi/Sedang/Rendah, 3 keputusan terbuka dicatat (bukan ditebak) |
| Event Bus — CRUD kendaraan (item Prioritas Tinggi #1 dari audit) | C1 (v1652) | `vehicle-core.js`: `saveVehicle()` (create+edit), `delVehicle()`, `saveKm()` sekarang emit `AIBus.emit("vehicle.updated",...)` — replikasi pola servis yang sudah ada |

### 🟡 Sudah mulai, TAPI belum tuntas

| Item | Sesi | Yang masih kurang |
|---|---|---|
| Fase 1 poin 2 — Vehicle Database ke storage (IndexedDB) | Sesi B (v1650) + followup (v1653, v1661) | Layer storage (`_vehicleDbActiveRecords`, `ensureLoaded()`/`isLoaded()`/`invalidateCache()`) sudah ada & di-boot di `load()`. **v1653**: `VEHICLE_MODELS`/`DatabaseAPI.vehicleModel.*`/`dbVehicleModelFindByName()` sekarang ikut storage aktif lewat `_vehicleModelRecords()` (gap (b) lama sudah tertutup). **v1661**: gap (c) ditutup lewat dedup `ensureLoaded()` (`_vehicleDbLoadPromise`) — audit konfirmasi konsumen sync sudah aman krn `load()` mem-blok sampai `ensureLoaded()` selesai; refactor async ke rantai render ditolak (di luar cakupan). **Masih tersisa**: (a) `VEHICLE_DB_RECORDS` literal **belum dihapus** — butuh mekanisme registrasi baru (`TORSI_DB`/`VEHICLE_SPEC_DB` daftar diri ke `DatabaseAPI` saat load), scope sesi tersendiri, ditunda per keputusan eksplisit v1661 |
| Fase 1 poin 4 — Event Bus umum (bukan cuma Servis) | C1 (v1652) baru 1 dari 9 item audit | Selesai: CRUD kendaraan (#1 Tinggi). **Belum** (lihat detail §"Belum" di bawah): 8 item lain dari audit (Prioritas Tinggi #2-4, Prioritas Sedang #5-9) — **butuh source file finance/shop yang belum pernah diupload** (`tx-list-cashflow.js`, `transaksi-b.js`, dkk; lihat catatan di `SESSION-NOTE-followup-vehiclemodel-storage-sync-v1653.md`). Listener gap (`AIService.wireEvents()` tidak subscribe `investment.updated`, dari `AUDIT-AI-WIRING-GAP.md` sesi B1) juga belum disentuh — emit baru = "pemancar tanpa radio" kalau listener tidak ikut ditambah |

### ⚠️ Ditemukan baru di v1653: version marker basi (tidak terkait Fase manapun)

`?v=` di `index.html`/`app_production.html`, `CACHE_NAME` (`sw.js`), dan
`APP_BUILD_VERSION` dkk (`features-helpers-global-security.js`,
`modals.js`, `modules-calc.js`, `modules-render.js`) **berhenti dibump
sejak v1649** — 3 sesi (B v1650, wiring-followup v1651, C1 v1652)
mengedit source tanpa langkah "Build — bump manual" seperti sesi A1/A2.
**Sudah dibetulkan di v1653** (semua penanda → `1653`, konsisten). Ini
kemungkinan penyebab riil di balik 2 dari 11 kegagalan test
"`verify-release-ready`/bundle-freshness" yang selama ini dianggap murni
"keterbatasan sandbox" — perlu diverifikasi ulang di checkout lengkap
apakah kegagalan itu hilang setelah bump ini.

### ❌ Belum dikerjakan sama sekali (tidak berubah dari v1646)

- **Prioritas Tinggi audit Sesi C** (dari `AUDIT-SESI-C-EVENTBUS-D-WRITES-NO-EMIT.md`, belum diemit):
  - `delTx()` (`tx-list-cashflow.js`) — jalur HAPUS transaksi umum, gap paling signifikan (cascade besar jalan sunyi)
  - 4 jenis transaksi khusus: transfer (`tx-transfer.js`), renovasi (`tx-renov.js`), stok-sparepart (`tx-stok-sparepart.js`), target (`tx-target.js`)
  - Utang/Piutang (`piutang-utang.js`) & Tagihan (`tagihan-kalender.js`) — 0 emit sama sekali
  - Akun (`akun.js`) — domain baru, belum ada nama event (`account.updated`? — perlu keputusan W)
- **Prioritas Sedang audit Sesi C** — domain 0% Event Bus sama sekali: Dana Titipan (4 file, kandidat `titipan.updated`, belum ada presedennya), Shop/Cobek produk-stok (hanya order yg emit), Zakat/PBB (9 titik `save()`), `investasi.js` dasar (perlu ditelusuri lebih lanjut apakah ada method yg tidak lewat 3 file view yg sudah emit), Aset non-core (`aset-misc.js`, `aset-emas-impor.js`, `aset-reports.js`)
- **Master Database** (`service_categories`/`service_items`, 13 kategori terkunci, Sesi D) — masih 0%, `DatabaseAPI` masih cuma punya namespace `vehicle` + `master` (generik, BUKAN 13-kategori-terkunci — 2 hal berbeda, jangan disamakan)
- **Import Database** — masih 0%
- **Foto di Service History** (Sesi F) — masih 0%
- **Sesi E** (6 saran tambahan checklist actionType: reuse `markSparepartServiced()`, auto-potong stok, `batchId` UI, dst) — belum disentuh
- **Maintenance Package, Normalisasi Spec, CRUD dasar (`dbVehicleAdd`/`dbVehicleUpdate`), Service Action enum** — semua Fase 2/3, belum disentuh
- **`app-main-fixed.zip`** (diupload terpisah bareng 6 patch ini) — dikonfirmasi checkout lain yg TIDAK sejajar (0 folder `modules/engine/`, `CHANGELOG.md` mulai dari "v1515", jauh di bawah baseline v1646 roadmap ini). Belum direkonsiliasi — perlu keputusan W apakah ini checkout terpisah yang disengaja

### Keputusan yang masih menggantung (butuh W, belum ditebak sepihak di sesi manapun)

1. Cakupan lanjutan Sesi C: sekaligus semua 8 item sisa, atau dipecah per-domain (rekomendasi audit: lanjut `delTx()` dulu — sama-sama replikasi pola, risiko rendah)?
2. Nama event baru untuk domain yg 0%: `account.updated`? `titipan.updated`? Tagihan/piutang-utang gabung ke `finance.updated` atau event terpisah?
3. Apakah Sesi C juga mencakup wiring listener (`AIService.wireEvents()`), atau murni sisi emit dulu?
4. Status `app-main-fixed.zip` — checkout terpisah yg disengaja, atau upload keliru?

**Skor update:** Fase 1 sekarang **4/5 poin selesai atau sebagian jalan** (poin 1 ✅ tuntas, poin 2 🟡 storage ada, 1 dari 2-3 gap sinkronisasi sudah ditutup v1653 — sisa: hapus literal + `await ensureLoaded()` di konsumen, poin 3 ✅ tuntas, poin 4 🟡 baru 1/9 titik audit — **butuh W upload source file finance/shop untuk lanjut**, poin 5 ✅ dari v1646). **Belum aman lompat ke Fase 2** (Sesi D Master Database) sesuai larangan eksplisit §6 — Event Bus umum (poin 4) masih jauh dari tuntas.

> **Update v1653**: gap (b) VEHICLE_MODELS/`vehicleModel.*` tidak sinkron ke storage — **ditutup**. Ditemukan & dibetulkan juga: version marker (`?v=`, `CACHE_NAME`, `APP_BUILD_VERSION` dkk) basi sejak v1649, dibump ke v1653. Sesi C lanjutan (`delTx()` dkk) **tertahan** — 6 patch vehicle yang diupload tidak mencakup modul finance/shop; perlu upload terpisah dari checkout v1652/v1653 (bukan `app-main-fixed.zip`, dikonfirmasi versi riil v1638 — 14 versi di belakang, terlalu jauh untuk aman dipakai modul finance tanpa rekonsiliasi tersendiri).

====================================================

## 2d. Update Status per sesi ini (audit gabungan v1653 → Sesi F2)

> Sumber: `CHANGELOG.md` + `SESSION-NOTE-sesi-c-lanjutan-akun-account-updated.md`,
> `-sesi-c-lanjutan-zakat-pbb.md`, `-sesi-c-lanjutan-shop-cobek-product-updated.md`,
> `-sesi-f1-foto-riwayat-servis.md`, `-rekonsiliasi-vehicle-databaseapi-plus-sesi-c-finance.md`,
> dan `-sesi-f2-badge-foto-riwayat-servis.md` (sesi ini). Audit isi kode +
> klaim tertulis, sama metode §2b/§2c — test suite tidak bisa di-re-run
> standalone di delta zip (lihat catatan tiap sesi).

### ✅ Selesai sejak update §2c terakhir

| Item | Sesi | Catatan |
|---|---|---|
| Rekonsiliasi cabang vehicle (v1646-v1653) + cabang finance Sesi C ke baseline `app-main` nyata | Rekonsiliasi (internal `1638→1639`) | 0 file tumpang-tindih antar cabang, overlay bersih, 6266 test (2 fail pre-existing, 0 regresi baru) |
| Sesi B — gap (b) `VEHICLE_MODELS`/`vehicleModel.*` sync ke storage | followup (v1653) | `_vehicleModelRecords()` baru — **ditutup**. Gap (a) literal & (c) `ensureLoaded()` race MASIH belum |
| Sesi C-lanjutan — Akun (`account.updated`) | v1640 | 4 titik: create/edit/delete/edit-owners. Menutup TERAKHIR dari 5 item Prioritas Tinggi audit |
| Sesi C-lanjutan — Zakat/PBB (`finance.updated` kind `zakat` baru + kind `tagihan` source `pbb`) | v1641 | 3 dari 9 titik `save()` (aksi diskrit); 6 sisa sengaja dilewati (dipanggil tiap render, bukan aksi user) |
| Sesi C-lanjutan — Shop/Cobek CRUD inti (`product.updated` baru) | v1642 | 4 dari 9 titik audit (`cobek-etalase.js`: create/edit/delete produk+kategori); 5 titik sisa (harga produsen batch, price/stock reko, weight-bulk, inline-produsen-cart, bulk import) sengaja ditunda |
| Sesi F1 — Foto (data model + capture UI + persist) | (internal `1656`/`1659`) | `car-notes.js`+`modules/shared/modals.js`, field `foto` opsional di `D.servisLogs[]` |
| **Sesi F2 — Badge jumlah foto di Riwayat Servis** | sesi ini (`1660`) | `Servis.renderList()`, badge `📷 N`, pola sama `batchInfo` |

### 🟡 Masih sebagian

| Item | Yang masih kurang |
|---|---|
| Sesi B (storage IndexedDB) | (a) `VEHICLE_DB_RECORDS` literal belum dihapus — butuh sesi desain registrasi tersendiri (v1661). (c) **TUNTAS v1661** via dedup `ensureLoaded()`. |
| Sesi C (Event Bus umum) | Prioritas Tinggi **TUNTAS** (5/5). Prioritas Sedang: **Shop/Cobek TUNTAS 9/9** (v1662), Zakat/PBB sebagian (3/9 titik diskrit); Dana Titipan, `investasi.js` dasar, Aset non-core BELUM (0/5 domain penuh). Listener `AIService.wireEvents()` ke SEMUA event baru belum disambung sama sekali (0/n) |
| Sesi F (Foto) | F1+F2 selesai; thumbnail gambar sungguhan, lightbox, kompresi gambar — belum |

### ❌ Belum dikerjakan sama sekali (tidak berubah)

- Sesi D — `service_categories` master 13-kategori-terkunci (masih 0%, **belum aman mulai** sampai Sesi B tuntas, larangan §6)
- Master Database, Import Database (Fase 2+, belum relevan)
- Dana Titipan, `investasi.js` dasar, Aset non-core — Event Bus (Sesi C Prioritas Sedang)
- Wiring listener `AIService.wireEvents()` — 0% ke SEMUA event baru manapun (emit ada, listener belum)
- Maintenance Package, Normalisasi Spec, CRUD dasar (`dbVehicleAdd`/`dbVehicleUpdate`), Service Action enum (Fase 2/3)

### Keputusan yang digantung — sekarang diputuskan (default, W bisa koreksi)

Pola preseden sesi Akun (v1640): nama event yang 100% mengikuti pola yang
sudah terbukti diputuskan langsung, tidak ditunda ke user lagi. Keputusan
prioritas/urutan (bukan soal skema data) diputuskan berdasar prinsip §6
("jangan loncat Fase sebelum yang di bawah tuntas") + prinsip §7 ("1 sesi
1 fokus kecil, additive, risiko rendah dulu"). Urutan di bawah jadi
rencana default sesi-sesi berikutnya kecuali W koreksi.

1. **Cakupan lanjutan Sesi C Prioritas Sedang → selesaikan 5 titik sisa Shop/Cobek dulu, BUKAN Dana Titipan.**
   Alasan: pola `product.updated` sudah ada & terbukti di file yang sama
   (`cobek-etalase.js` cs `cobek-pricing.js`/`cobek-order.js`/
   `cobek-tx-cart.js`/`cobek-io.js`), scope kecil (menuntaskan 1 domain
   yang sudah 4/9 lebih murah drpd buka domain baru Dana Titipan yang
   scope-nya besar + event baru + 0 preseden). Menuntaskan 1 domain
   penuh juga lebih rapi drpd tersebar 3 domain paruh-jalan sekaligus.
2. **Nama event Dana Titipan: `titipan.updated`** — diputuskan sekarang
   (bukan ditunda), pola `{kind:...,action,...}` sama persis
   `finance.updated`/`product.updated`, sudah 100% mengikuti preseden 4
   domain sebelumnya, tidak ada ambiguitas yang perlu ditanyakan ke W.
3. **Wiring listener `AIService.wireEvents()` → sesi TERSENDIRI, dikerjakan SEBELUM lanjut Dana Titipan/investasi/aset non-core (tapi SETELAH menuntaskan 5 titik Shop/Cobek di poin 1).**
   Alasan: setiap event baru (`vehicle.updated`, `account.updated`,
   `finance.updated{kind:zakat}`, `product.updated`, dst) sekarang
   "pemancar tanpa radio" — 0 nilai nyata terealisasi sampai ada
   konsumen. Menambah lebih banyak domain emit sebelum wiring divalidasi
   berisiko mengulang pola yang sama N kali tanpa tahu apakah desainnya
   benar dari sisi konsumen. Validasi wiring dulu dengan event yang
   SUDAH ada (murah, tidak nunggu Dana Titipan) sebelum menambah lebih
   banyak emitter.
4. **Sesi F lanjutan (thumbnail gambar) → DITUNDA. Prioritas pindah ke menuntaskan Sesi B (Critical, item Fase 1 terakhir yang belum tuntas).**
   Alasan: §3 taruh "manufacturers/vehicle_models" & wiring sbg
   **Critical**, sedangkan Foto masuk **High** (lebih rendah). Sesi B
   sekarang tinggal 2 gap kecil (hapus literal `VEHICLE_DB_RECORDS`,
   tambah `await ensureLoaded()` di 2 konsumen) — menutup ini artinya
   Fase 1 TUNTAS 5/5 & Sesi D (Master Database, `service_categories`)
   baru boleh mulai (larangan eksplisit §6 baru lepas setelah ini).
   Thumbnail foto murni kosmetik/UX, aman ditunda tanpa risiko teknis.
5. **`app-main-fixed.zip` → diabaikan (tidak direkonsiliasi) sampai W angkat lagi.**
   Alasan: dikonfirmasi checkout terpisah 14 versi di belakang
   (`v1638` vs baseline v1652+ saat ini), tidak ada indikasi W sengaja
   mau pakai itu sbg baseline baru. Merekonsiliasi checkout usang tanpa
   permintaan eksplisit lebih berisiko (impor balik kode basi) drpd
   manfaatnya. Tidak diblokir apa pun — murni menunggu W kalau memang
   dibutuhkan.

**Urutan sesi ringan berikutnya (rekomendasi, prioritas menurun, status v1652):**
1. Sesi B — tutup 2 gap sisa (hapus `VEHICLE_DB_RECORDS` literal + `await ensureLoaded()`) → Fase 1 TUNTAS.
2. Sesi C — 5 titik sisa Shop/Cobek (`cobek-pricing.js`/`cobek-order.js`/`cobek-tx-cart.js`/`cobek-io.js`).
3. Sesi C — wiring listener `AIService.wireEvents()` untuk event yang sudah ada.
4. Sesi D — `service_categories` 13-kategori-terkunci (baru aman mulai setelah #1).
5. Sesi C — Dana Titipan (`titipan.updated`), lalu `investasi.js` dasar & Aset non-core.
6. Sesi F lanjutan — thumbnail gambar & lightbox (kosmetik, aman kapan saja).

**Skor update:** Fase 1 tetap **4/5 poin selesai/sebagian** (tidak berubah sesi ini — fokus sesi ini di Sesi F, bukan Fase 1). Di luar Fase 1: Sesi C Prioritas Tinggi TUNTAS, Prioritas Sedang naik dari 0/5 ke 3/5 domain (sebagian); Sesi E TUNTAS 6/6; Sesi F naik dari 0% ke sebagian (F1+F2).

> **Lihat §2e untuk update v1661/v1662** — urutan #1 (Sesi B) di atas
> TIDAK selesai penuh (gap (c) tertutup, gap (a) ditunda ke sesi
> tersendiri), sehingga urutan #2 (5 titik sisa Shop/Cobek) yang
> dikerjakan berikutnya, BUKAN #4 (Sesi D) — larangan §6 masih berlaku.

====================================================

## 2e. Update Status per sesi ini (v1661 Sesi B-followup → v1662 Sesi C Shop/Cobek 5 titik sisa)

> Sumber: `SESSION-NOTE-sesi-b-followup-ensureloaded-dedup.md` (v1661),
> `SESSION-NOTE-sesi-c-shop-cobek-5-titik-sisa.md` (v1662). Audit isi
> kode + klaim tertulis, metode sama §2b/§2c/§2d.

### ✅ Selesai sejak update §2d terakhir

| Item | Sesi | Catatan |
|---|---|---|
| Sesi B gap (c) — dedup `ensureLoaded()` | v1661 | `_vehicleDbDoLoad()`+promise dedup di `database-api.js`; race window dipersempit (bukan dihapus 100%, `load()` sudah `await` sebelum render). Gap (a) TETAP terbuka |
| Sesi C-lanjutan — Shop/Cobek, 5 titik sisa | v1662 | `cobek-order.js` (harga produsen batch), `cobek-pricing.js` (price-reko, stock-reko, weight-bulk — 3 widget), `cobek-tx-cart.js` (inline-produsen-di-cart), `cobek-io.js` (bulk import Excel, 2 cabang) — SEMUA `product.updated`, guard sama pola v1642. **Shop/Cobek domain TUNTAS 9/9.** |

### 🟡 Masih sebagian (tidak berubah dari §2d kecuali dicatat)

| Item | Yang masih kurang |
|---|---|
| Sesi B (storage IndexedDB) | (a) `VEHICLE_DB_RECORDS` literal belum dihapus — butuh sesi desain mekanisme registrasi `TORSI_DB`/`VEHICLE_SPEC_DB` → `DatabaseAPI` tersendiri (ditemukan v1661 lebih besar dari perkiraan "gap kecil"). (c) **TUNTAS** (v1661, lihat di atas) |
| Sesi C (Event Bus umum) | Prioritas Tinggi TUNTAS (5/5). Prioritas Sedang: **Shop/Cobek TUNTAS (9/9, v1662)**; Zakat/PBB masih 3/9 titik diskrit; Dana Titipan/`investasi.js` dasar/Aset non-core BELUM (0/3 domain). Listener `AIService.wireEvents()` masih 0% — makin mendesak sekarang `product.updated` sudah 9/9 titik ("pemancar tanpa radio" makin besar) |

### ❌ Belum dikerjakan sama sekali (tidak berubah)

- Sesi D — `service_categories` master 13-kategori-terkunci (masih 0%, **belum aman mulai** — Fase 1 masih tertahan gap (a) Sesi B, larangan §6)
- Master Database, Import Database (Fase 2+, belum relevan)
- Dana Titipan, `investasi.js` dasar, Aset non-core — Event Bus (Sesi C Prioritas Sedang)
- Wiring listener `AIService.wireEvents()` — 0% ke SEMUA event baru manapun (emit ada, listener belum)
- Maintenance Package, Normalisasi Spec, CRUD dasar (`dbVehicleAdd`/`dbVehicleUpdate`), Service Action enum (Fase 2/3)
- Sesi F lanjutan (thumbnail gambar & lightbox) — kosmetik, aman kapan saja, belum masuk giliran

**Urutan sesi ringan berikutnya (rekomendasi, prioritas menurun, status v1662):**
1. **Sesi C — wiring listener `AIService.wireEvents()`** untuk event yang sudah ada (`vehicle.updated`/`account.updated`/`finance.updated{kind:zakat}`/`product.updated`, sekarang 9/9 titik Shop/Cobek) — sesuai keputusan §2d poin 3, dikerjakan SEBELUM membuka domain Event Bus baru.
2. Sesi B — sesi desain tersendiri untuk gap (a) (`VEHICLE_DB_RECORDS` literal → mekanisme registrasi `TORSI_DB`/`VEHICLE_SPEC_DB` ke `DatabaseAPI`) → baru setelah ini Fase 1 TUNTAS & Sesi D boleh mulai.
3. Sesi D — `service_categories` 13-kategori-terkunci (baru aman mulai setelah #2).
4. Sesi C — Dana Titipan (`titipan.updated`), lalu `investasi.js` dasar & Aset non-core (Zakat/PBB 6 titik render sisa TETAP sengaja dilewati, bukan aksi diskrit).
5. Sesi F lanjutan — thumbnail gambar & lightbox (kosmetik, aman kapan saja).

**Skor update:** Fase 1 tetap **4/5 poin selesai/sebagian** (gap (c) Sesi B tertutup TAPI gap (a) masih terbuka, jadi belum naik ke 5/5). Di luar Fase 1: Sesi C Prioritas Sedang naik — Shop/Cobek domain penuh TUNTAS (dari sebagian 4/9 titik ke 9/9); domain lain (Dana Titipan/investasi/aset non-core) tidak berubah, masih 0%.

====================================================

## 3. Prioritas Gabungan

**Critical**
- Entitas `manufacturers` + `vehicle_models` relasional (akar dari 90% gap lain — disebut di AUDIT-CAR-NOTES **dan** jadi prasyarat Vehicle Database di RANCANGAN-v3)
- Selesaikan wiring Fase 1 yang tersisa: `GENERIC_GROUP_BY_NAME`, `GENERIC_RECOMMEND_NAMES`, `FALLBACK_KEYWORDS` → pola guard `DatabaseAPI` (0 risiko, pola sudah terbukti 4×)
- Hapus duplikasi `TORSI_DB`/`VEHICLE_SPEC_DB` vs `VEHICLE_DB_RECORDS` setelah wiring selesai

**High**
- Master Database: `service_categories` (13 kategori terkunci) + `service_items` lintas model
- Import Database (JSON granular manufacturer/model/category/item/interval/spec/part) — baru masuk akal setelah CRUD dasar ada
- Foto di Service History
- Field `actionType` di checklist servis (desain sudah lengkap di PERBAIKAN-JENIS-TINDAKAN, siap Sesi 1)

**Medium**
- Maintenance Package (bundel per km milestone)
- Normalisasi Specification/Service Limit (angka+unit terpisah)
- CRUD dasar (`dbVehicleAdd`/`dbVehicleUpdate`) + Schema Validation minimal
- 6 saran tambahan checklist (reuse `markSparepartServiced()`, auto-potong stok saat `ganti`, `batchId` UI, default cost per actionType, guard "ganti terlalu dini", filter riwayat by actionType)

**Low**
- Service Actions jadi enum terstruktur (bukan teks bebas)
- Platform Database, Search Engine, Database Builder/Validator (Fase 2 — baru relevan begitu >2 model)
- Plugin System (Wiring/OBD/ECU/Recall/AI Diagnosis) — Fase 4, realistis paling akhir

====================================================

## 4. Roadmap Fase Gabungan

**Fase 1 — Fondasi (Critical → High)**
1. `manufacturers` + `vehicle_models` relasional, `D.vehicles` dapat `modelId` FK (pertahankan `name` sbg display fallback)
2. Pindahkan `TORSI_DB`/`VEHICLE_SPEC_DB` dari konstanta kode ke data tersimpan (IndexedDB), key by `modelId`
3. Selesaikan wiring 3 konsumen literal yang tersisa ke `DatabaseAPI`
4. Event Bus versi ringan disambung ke Database API sejak awal (bukan ditunda ke Fase 3 — biar tidak perlu refactor ulang nanti)
5. **Sesi checklist actionType** (sudah siap dari PERBAIKAN-JENIS-TINDAKAN) bisa paralel di sini — tidak bergantung pada 1–4

**Fase 2 — Normalisasi & Skalabilitas (High → Medium)**
1. `service_categories` master (13 kategori terkunci), `service_items` master per kategori, direferensikan `service_intervals` (model × item → km/bulan)
2. Field foto di `servisLogs`
3. Importer JSON granular (manufacturer/model/category/item/interval/spec/part)
4. CRUD dasar + Schema Validation minimal
5. Platform Database + Search Engine — mulai relevan begitu model >2
6. 6 saran tambahan checklist (poin 3 di atas) — masuk sini kalau tidak digabung ke Fase 1

**Fase 3 — Pengayaan & Ekosistem (Medium → Low)**
1. Maintenance Package (bundel item per km milestone)
2. Normalisasi Specification & Service Limit (numerik + unit terpisah)
3. Service Action jadi enum terstruktur
4. UI hierarki penuh Manufacturer→Model→Category→Item→Interval→History→Reminder
5. Asset Database, Reference Database, Localization
6. Event Bus perluasan penuh (siklus Import → Vehicle Updated → Reminder Refresh → Search Index → UI Refresh)

**Fase 4 — Ekspansi (paling akhir)**
- Plugin Manager (cakupan disempitkan: Wiring/ECU/OBD/Recall/Workshop Manual/Labor Time/AI Diagnosis saja — 6 lapisan inti tetap bagian tetap Database API, bukan plugin)
- Database Marketplace

====================================================

## 5. Item Siap Coding Sekarang (tidak perlu tunggu Fase 1 selesai)

Dua hal ini independen dari urutan Fase 1–4 di atas dan bisa jalan duluan:

1. **Checklist `actionType`** (dari PERBAIKAN-JENIS-TINDAKAN) — field opsional + parameter `actionTypeFilter` di `getLastServiceKmForCat`/`getLastServiceDateForCat`, 5 pola tabel, 0 migrasi data. Keputusan tersisa buat W: default toggle `periksa` vs `ganti`, dan apakah item ganti-saja (Oli Mesin) perlu opsi "periksa saja" juga.
2. **Wiring 3 konsumen literal tersisa ke `DatabaseAPI`** — pola sudah terbukti 4× di kode yang ada, risiko rendah, tidak perlu Master Database atau Vehicle Model relasional selesai dulu.

====================================================

## 6. Risiko yang Perlu Diingat

- **Jangan loncat ke Fase 2–4 sebelum Fase 1 tuntas** — literal `TORSI_DB`/`VEHICLE_SPEC_DB` sudah pernah divergen dari `VEHICLE_DB_RECORDS` (dicatat di CHANGELOG v1643); makin banyak fitur dibangun di atas fondasi yang masih ganda, makin sulit dibongkar nanti.
- **API belum "satu pintu"** — selama fallback literal masih hidup, fitur baru (Search Engine, Plugin) bisa dapat data tidak konsisten tergantung urutan load module.
- **Modul 6–8 (Checklist/Riwayat/Reminder) jangan dijadikan lapisan Database API baru** — mereka app-layer yang konsumsi Master/Vehicle DB + tulis ke data user (`D`). Memperlakukan mereka sebagai "lapisan ke-7" akan mengaburkan batas yang sudah jelas di RANCANGAN-v3.
- **Tidak ada test untuk `database-api.js`** di kondisi audit terakhir — kalau lanjut membangun di atasnya, pastikan `tests/database-api-vehicle-migration.test.js` (disebut CHANGELOG tapi tidak ditemukan di ZIP) dibuat ulang dulu. *(Update v1646: file ini sudah ada di ZIP — lihat §2b.)*
- **Baru dari v1646**: pola percabangan-paralel-tanpa-merge yang menyebabkan drop fitur `actionType` bisa terulang kalau beberapa cabang kerja jalan bersamaan dari baseline yang sama tanpa saling tahu. Untuk sesi-sesi ringan di §7, disarankan **1 cabang aktif dalam satu waktu** dari checkout v1646 ini, atau minimal diberi tahu di awal sesi kalau ada cabang lain yang berjalan paralel.

====================================================

## 7. Langkah Implementasi — Sesi-Sesi Ringan (lanjutan dari v1646)

Prinsip: 1 sesi = 1 fokus kecil, additive, langsung dites. Urutan mengikuti
Fase 1 di §4 (yang tersisa) dulu, baru masuk item "High" Fase 2. Setiap
sesi diasumsikan mulai dari checkout v1646.

> **Update per v1652** — status tiap sesi di bawah sudah diperbarui
> (🟢 selesai / 🟡 sebagian / ⬜ belum mulai). Detail lengkap: §2c.
>
> **Update sesi ini (Sesi F2, badge foto)** — audit ulang menemukan Sesi
> B (sinkron storage `vehicleModel`, v1653), Sesi C-lanjutan (Akun,
> Zakat/PBB, Shop/Cobek CRUD inti), dan Sesi F1 (foto: data model+
> capture+persist) sudah selesai tapi belum tercatat di sini. Status
> di bawah sudah disamakan dengan kode nyata. Detail lengkap: §2d.
>
> **Update v1661 (Sesi B-followup)** — gap (c) Sesi B (`await
> ensureLoaded()` race) ditutup lewat dedup pemanggilan (bukan refactor
> `async` penuh, di luar cakupan "gap kecil"). Gap (a) (`VEHICLE_DB_RECORDS`
> literal) tetap terbuka, ditunda ke sesi desain tersendiri — Fase 1
> **masih belum tuntas**, Sesi D tetap menunggu (larangan §6).
>
> **Update v1662 (Sesi C-lanjutan, Shop/Cobek 5 titik sisa)** — 5 titik
> sisa Shop/Cobek yang ditunda di v1642 (harga produsen batch, price/stock
> reko apply, weight-bulk, inline-produsen-di-cart, bulk import Excel)
> sekarang **TUNTAS 9/9** untuk domain Shop/Cobek. Detail lengkap: §2e.

**Sesi A — `manufacturers` + `vehicle_models` relasional (fondasi, pecah 2)** 🟢 selesai (v1647–v1649)
- A1 (v1647): skema data murni — tambah `D.manufacturers[]`/`D.vehicleModels[]` (seed dari 2 model yang sudah ada di `VEHICLE_DB_RECORDS`), `D.vehicles` dapat field `modelId` (opsional, `name` tetap dipakai sbg fallback display) — 0 UI, 0 fungsi baca diubah, murni tambah data+migrasi ringan.
- A2 (v1648) + followup (v1649): `DatabaseAPI.vehicle.getById()`/`getAll()` dkk baca `modelId` kalau ada, fallback match by `name` kalau belum. Followup v1649 menutup 2 titik baca terakhir (`renderVehicleSpecCard()`, `_tirePressureRef()`) yang sempat terlewat di v1648 krn belum ada full checkout. **0 titik baca live tersisa.**

**Sesi B — Pindahkan `TORSI_DB`/`VEHICLE_SPEC_DB` ke data tersimpan** 🟡 sebagian (v1650, sinkron lanjut v1653, followup v1661)
- Key by `modelId` (hasil Sesi A), baca lewat `DatabaseAPI.vehicle.getAll()` yang sudah wired — konsumen (`findTorsiDb`/`findVehicleSpec`/`_allTorsiEntries`) sudah baca lewat API, jadi sesi ini cuma pindah SUMBER datanya, bukan ubah titik baca.
- **v1650**: layer storage IndexedDB (`ensureLoaded`/`isLoaded`/`invalidateCache`) sudah ada.
- **v1653**: gap `VEHICLE_MODELS`/`DatabaseAPI.vehicleModel.*`/`dbVehicleModelFindByName()` belum ikut storage aktif — **ditutup** (`_vehicleModelRecords()` baru).
- **v1661 (followup gap (c))**: audit titik pemanggil `findTorsiDb`/`findVehicleSpec` (`resolveCatGroup()` di sparepart-servis.js, `renderVehicleSpecCard()` di modules-render-b.js, `_tirePressureRef()` di fuel-maintenance-engine.js, `car-notes.js` Servis) — SEMUA dipanggil sync dari jalur render UI yang baru bisa jalan setelah `load()` selesai, dan `load()` SUDAH `await DatabaseAPI.vehicle.ensureLoaded()` sebelum lanjut. Mengubah titik-titik itu jadi `async` supaya bisa `await ensureLoaded()` langsung butuh refactor besar ke rantai render (di luar cakupan "1 gap kecil"), **ditolak**. Yang dikerjakan: `dbVehicleEnsureLoaded()` di-dedup lewat `_vehicleDbLoadPromise` (fungsi baru `_vehicleDbDoLoad()`) — kalau `ensureLoaded()` dipanggil dari >1 titik sebelum yang pertama selesai, cuma 1 round-trip IndexedDB yang jalan (sebelumnya bisa 2x baca+tulis). Getter sync (`_vehicleDbRecords()`) SENGAJA TIDAK diubah utk memicu load sendiri — kontrak test lama "IDBStore tidak disentuh sebelum ensureLoaded() dipanggil" tetap 100% berlaku, 0 regresi. Detail: `SESSION-NOTE-sesi-b-followup-ensureloaded-dedup.md`.
- **Masih tersisa**: (a) `VEHICLE_DB_RECORDS` literal belum dihapus (masih seed/fallback). **Temuan v1661**: menghapus literal ini TIDAK sesederhana "hapus 1 const" — `VEHICLE_DB_RECORDS` adalah satu-satunya sumber seed IndexedDB pertama kali (`_vehicleDbDoLoad()` menulis `VEHICLE_DB_RECORDS.slice()` ke storage kalau kosong). Menghapusnya butuh mekanisme BARU: `sparepart-servis-b.js` mendaftarkan `TORSI_DB`/`VEHICLE_SPEC_DB` ke `DatabaseAPI` saat filenya dimuat (jadi `TORSI_DB`/`VEHICLE_SPEC_DB` jadi satu-satunya sumber kebenaran, bukan disalin manual ke `VEHICLE_DB_RECORDS`) — ini scope sesi TERSENDIRI (butuh desain+review sendiri sebelum coding, bukan "gap kecil"), **belum dikerjakan**, ditunda per keputusan eksplisit. Setelah mekanisme ini ADA baru aman hapus duplikasi `TORSI_DB` vs `VEHICLE_DB_RECORDS` (item Critical §3 terakhir — **belum dikerjakan**).

**Sesi B-lanjutan — Wiring 3 literal generik tersisa** 🟢 selesai (v1651, di luar penomoran A-F asli tapi bagian Fase 1 poin 3)
- `GENERIC_GROUP_BY_NAME`/`GENERIC_RECOMMEND_NAMES`/`FALLBACK_KEYWORDS` → `DatabaseAPI.master` (namespace baru — **catatan**: ini BUKAN `service_categories` 13-kategori-terkunci yang dimaksud Sesi D di bawah, kebetulan nama namespace sama, jangan tertukar).

**Sesi C — Event Bus general (bukan cuma Servis)** 🟡 sebagian — audit selesai, Prioritas Tinggi TUNTAS, Prioritas Sedang 3.x/5 domain (Shop/Cobek TUNTAS)
- Perluas pola `finance.updated`/`vehicle.updated` (yang sudah ada di Servis sejak v1644) ke titik-titik lain yang masih menulis `D` langsung tanpa emit — audit dulu titik mana saja sebelum coding (daftar konsumen, bukan langsung ubah).
- **v1651 (audit)**: `AUDIT-SESI-C-EVENTBUS-D-WRITES-NO-EMIT.md` — peta 9 titik/domain, 0 kode diubah.
- **v1652 (C1)**: CRUD kendaraan (`vehicle.updated`) selesai diemit.
- **Sesi C-lanjutan (Prioritas Tinggi, TUNTAS 5/5)**: `delTx()` + 4 transaksi khusus, piutang-utang, tagihan-kalender sudah emit dari sesi-sesi sebelumnya; **Akun** (`account.updated` — 4 titik: create/edit/delete/edit-owners) menutup item Prioritas Tinggi terakhir.
- **Sesi C-lanjutan (Prioritas Sedang)**: Zakat/PBB (`finance.updated` kind `zakat` baru + kind `tagihan` source `pbb`, 3 titik diskrit dari 9 `save()` — 6 sisa sengaja dilewati krn dipanggil tiap render, bukan aksi diskrit); **Shop/Cobek TUNTAS 9/9** — CRUD inti produk&kategori (v1642, 4 titik: `product.updated` baru) + **v1662, 5 titik sisa**: harga produsen batch (`cobek-order.js`), price/stock reko apply (`cobek-pricing.js` — `PriceRekoWidget`/`StockRekoWidget`), weight-bulk (`cobek-pricing.js` — `WeightBulkWidget`), inline-produsen-di-cart (`cobek-tx-cart.js`), bulk import Excel (`cobek-io.js` — `ImportShopExcel`), semua kind baru (`harga-produsen`/`price-reko`/`stock-reko`/`weight-bulk`/`produsen`/`import-excel`), test baru `tests/cobek-shop-5-titik-sisa-sesi-c.test.js` (14/14 pass).
- **Belum**: Dana Titipan (4 file, kandidat `titipan.updated`), `investasi.js` dasar, Aset non-core (`aset-misc.js`/`aset-emas-impor.js`/`aset-reports.js`), wiring listener `AIService.wireEvents()` ke SEMUA event baru (`account.updated`/`finance.updated{kind:zakat}`/`product.updated`/dll — emit tanpa listener = "pemancar tanpa radio", sekarang lebih mendesak krn `product.updated` sudah 9/9 titik). Lihat §2e untuk detail v1662 & §2d untuk histori sebelumnya.

**Sesi D — `service_categories` master (13 kategori terkunci)** ⬜ belum mulai
- Baru masuk akal setelah Sesi A/B selesai — Sesi B masih 🟡 (lihat di atas), jadi **belum aman mulai** sesuai larangan §6 "jangan loncat ke Fase 2 sebelum Fase 1 tuntas". Definisikan 13 kategori sebagai data statis di `DatabaseAPI` (namespace baru — **hindari nama `master`, sudah dipakai wiring 3 literal generik v1651, pilih nama lain mis. `DatabaseAPI.masterCategory` biar tidak tabrakan**), migrasi 8 grup ad-hoc (`resolveCatGroup()`) jadi baca dari situ.

**Sesi E — Field `actionType` lanjutan (backlog §3 Medium, 6 saran tambahan)** 🟢 6/6 selesai (E1-E6, TUNTAS)
- Independen dari A-D, bisa disisipkan kapan saja. Dipecah jadi 6 sesi kecil sesuai arahan (redo dari percobaan sebelumnya yg kehabisan limit sebelum sempat simpan kode):
  - **E1 (selesai, lihat `SESSION-NOTE-sesi-e1-markservicedbatch.md`)**: `Servis.markServiced(catId,actionType,opts)` terima `opts` (`skipConfirm`/`presetCost`, + placeholder `skipEarlyGuard`/`batchId` utk E3/E5) + `Servis.markServicedBatch(items)` baru, reuse `markServiced()` apa adanya per item (0 logic simpan duplikat). Test baru `tests/servis-markservicedbatch-sesi-e1.test.js` (6 test). `tests/helpers/loadSource.js` ditambahkan ke delta zip ini (generic, dari `app-main__76_.zip`) supaya sesi berikutnya bisa `node --test` standalone.
  - **E2 (selesai, lihat `SESSION-NOTE-sesi-e2-autogantistock.md`)**: `Servis._findAutoGantiStock(cat,vehicleId)` baru — cari 1 kandidat Stok Sparepart (`D.partsStock`) yg cocok `catId`+kendaraan (reuse `Sparepart.isPartForVehicle()`, 0 skema baru); 0/>1 kandidat = dilewati (aman, tidak menebak). Dipanggil dari `markServiced()` HANYA saat `actionType==='ganti'` eksplisit (0 dampak ke tombol lama tanpa actionType); auto-potong 1 qty kalau stok cukup, kalau tidak cukup dilewati diam-diam (0 prompt minus tak terduga). `entry.autoGantiStockId` dicatat & di-revert simetris di `Servis.del()`. Test baru `tests/servis-autogantistock-sesi-e2.test.js` (11 test).
  - **E3 (selesai, lihat `SESSION-NOTE-sesi-e3-batchid.md`)**: field `batchId` di `D.servisLogs`, diisi dari `opts.batchId` (placeholder E1 diaktifkan). `markServicedBatch(items)` generate 1 `uid()` batchId yg dibagi ke seluruh item dari 1x pemanggilan. `Servis.renderList()` (riwayat) menandai entry berbatch dgn "🔗 batch" di `tx-meta`. Entry manual/lama (dipanggil tanpa opts.batchId) tetap `batchId:null`, 0 regresi. Test baru `tests/servis-batchid-sesi-e3.test.js` (5 test, termasuk test render riwayat pakai DOM stub minimal).
  - **E4 (selesai, lihat `SESSION-NOTE-sesi-e4-defaultcost.md`)**: default cost per `actionType` — `opts.presetCost` tidak diisi & `actionType==='periksa'`/`'bersih'` → `cost=0` otomatis, `showPromptModal()` dilewati; `'ganti'`/kosong tetap prompt spt biasa. Test baru `tests/servis-defaultcost-sesi-e4.test.js` (6 test).
  - **E5 (selesai, lihat `SESSION-NOTE-sesi-e5-tooearlyguard.md`)**: guard "ganti terlalu dini" — `Servis._checkTooEarlyGanti()` (finder baru, ambang 20% dari intervalKm) dipanggil di `markServiced()` HANYA saat `actionType==='ganti'` & `!opts.skipEarlyGuard`; `markServicedBatch()` kini kirim `skipEarlyGuard:true` per item (konsisten prinsip "1 konfirmasi total"). Test baru `tests/servis-tooearlyguard-sesi-e5.test.js` (9 test).
  - **E6 (selesai, lihat `SESSION-NOTE-sesi-e6-actiontypefilter.md`)**: filter riwayat by `actionType` — chip "Semua/Diperiksa/Dibersihkan/Diganti" disisipkan JS sebelum `#servisList` (`Servis.renderActionTypeChips()`), `Servis.setActionTypeFilter(type)` baru, filter di `Servis.renderList()` (fallback `'ganti'` utk `actionType` null, konsisten `_matchesActionTypeForReset()`). Test baru `tests/servis-actiontypefilter-sesi-e6.test.js` (7 test). **Sesi E TUNTAS (6/6).**

**Sesi F — Foto di Service History** 🟡 sebagian (F1+F2 selesai, thumbnail gambar & lightbox backlog)
- Independen, app-layer murni (field foto di `servisLogs`), tidak bergantung Sesi A-D.
- **F1 (selesai)**: `car-notes.js` (`Servis`) — state `_photoDraft`, method `pickPhoto()`/`addPhoto()`/`removePhoto()`/`_renderPhotoThumbs()`, field `foto` ditulis ke `D.servisLogs[]` (jalur buat baru & edit). UI input foto di `servisModal` (`modules/shared/modals.js`). Field opsional, backward-compatible.
- **F2 (selesai)**: badge teks `📷 N` di `Servis.renderList()` untuk entry yang punya foto — pola sama `batchInfo` (Sesi E3), 0 perubahan struktur `tx-item`.
- **Belum**: thumbnail gambar sungguhan (`<img>`) di daftar Riwayat Servis, lightbox/viewer foto ukuran penuh, kompresi gambar sebelum jadi dataURL.

**Belum masuk antrian sesi ringan** (butuh Fase 1 selesai dulu / scope lebih besar): Import Database granular, Maintenance Package, Platform Database/Search Engine, Plugin System — tetap di Fase 2-4 seperti semula.
