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

## 2f. Update Status per sesi ini (v1663 — wiring listener `AIService.wireEvents()`)

> Sumber: `SESSION-NOTE-sesi-c-wireevents-account-product-investment.md`
> (v1663). Audit isi kode + full suite, metode sama §2b–§2e.

### ✅ Selesai sejak update §2e terakhir

| Item | Sesi | Catatan |
|---|---|---|
| Wiring listener `AIService.wireEvents()` | v1663 | Tambah `account.updated`/`product.updated`/`investment.updated` ke array listener (`modules/ai/ai-service.js`). `investment.updated` ditemukan saat audit menyeluruh `AIBus.emit(`, TIDAK disebut eksplisit di §2e tapi kriterianya sama (event sudah emit, 0 konsumen) — dimasukkan sekalian. `finance.updated{kind:'zakat'}` dikonfirmasi TIDAK butuh entri baru (sudah ter-cover listener `finance.updated` generik). 6 test baru, full suite 6362/6366 pass (4 gagal pre-existing tidak terkait, diverifikasi tidak menyentuh file yang diubah). |

### 🟡 Masih sebagian (tidak berubah dari §2e)

| Item | Yang masih kurang |
|---|---|
| Sesi B (storage IndexedDB) | (a) `VEHICLE_DB_RECORDS` literal belum dihapus — masih butuh sesi desain tersendiri, TIDAK disentuh sesi ini |
| Sesi C (Event Bus umum) | Listener `AIService.wireEvents()` sekarang **TUNTAS untuk semua event yang sudah ada** (7/7: finance/asset/vehicle/delivery/account/product/investment). Domain BARU yang belum ada eventnya sama sekali tetap belum: Dana Titipan (`titipan.updated`), `investasi.js` dasar (event tambahan di luar `investment.updated` yang sudah ada), Aset non-core. Zakat/PBB masih 3/9 titik diskrit (tidak berubah, di luar scope sesi ini) |

### ❌ Belum dikerjakan sama sekali (tidak berubah)

- Sesi D — `service_categories` master 13-kategori-terkunci (masih 0%, **belum aman mulai** — Fase 1 masih tertahan gap (a) Sesi B, larangan §6)
- Master Database, Import Database (Fase 2+, belum relevan)
- Dana Titipan, `investasi.js` dasar (event baru), Aset non-core — Event Bus (Sesi C Prioritas Sedang)
- Sesi F lanjutan (thumbnail gambar & lightbox) — kosmetik, aman kapan saja, belum masuk giliran

**Urutan sesi ringan berikutnya (rekomendasi, prioritas menurun, status v1663 — lihat §2g untuk update v1664):**
1. ~~Sesi B — sesi desain tersendiri untuk gap (a)~~ — **selesai v1664** (`DESAIN-SESI-B-GAP-A-VEHICLE-DB-REGISTRASI.md`), lihat §2g.
2. **Sesi B — sesi CODING gap (a)** (implementasi `DatabaseAPI.vehicle.registerSource()` sesuai desain v1664) → syarat mulai: 3 keputusan terbuka di dokumen desain §5 dijawab W. Baru setelah sesi ini TUNTAS & hijau, Fase 1 benar-benar selesai & Sesi D boleh mulai.
3. Sesi D — `service_categories` 13-kategori-terkunci (baru aman mulai setelah #2, larangan §6 masih berlaku).
4. Sesi C — Dana Titipan (`titipan.updated`), lalu `investasi.js` dasar (event baru di luar `investment.updated`) & Aset non-core (Zakat/PBB 6 titik render sisa TETAP sengaja dilewati, bukan aksi diskrit).
5. Sesi F lanjutan — thumbnail gambar & lightbox (kosmetik, aman kapan saja).

**Skor update:** Fase 1 tetap **4/5 poin selesai/sebagian** (wiring listener bukan bagian Fase 1, jadi skor Fase 1 tidak berubah sesi ini — tetap tertahan gap (a) Sesi B). Di luar Fase 1: Sesi C — listener `wireEvents()` naik dari 0/n ke 7/7 event yang sudah ada (TUNTAS untuk cakupan saat ini); domain event BARU (Dana Titipan dkk) tidak berubah, masih 0%.

====================================================

## 2g. Update Status per sesi ini (v1664 — desain gap (a) Sesi B, 0 kode)

> Sumber: `SESSION-NOTE-sesi-b-gap-a-desain-registrasi-v1664.md` +
> `DESAIN-SESI-B-GAP-A-VEHICLE-DB-REGISTRASI.md` (v1664). Sesi desain
> murni sesuai keputusan eksplisit v1661 (gap (a) butuh desain+review
> sendiri, bukan "gap kecil") — **0 kode produksi diubah**, sama
> filosofi sesi audit `AUDIT-SESI-C-EVENTBUS-D-WRITES-NO-EMIT.md` v1651.

| Item | Sesi | Catatan |
|---|---|---|
| Desain mekanisme registrasi `TORSI_DB`/`VEHICLE_SPEC_DB` → `DatabaseAPI` | v1664 | Diusulkan `DatabaseAPI.vehicle.registerSource(entries)`, dipanggil `sparepart-servis-b.js` top-level setelah kedua const didefinisikan (timing aman — dikonfirmasi lewat titik panggil `ensureLoaded()` di `load()`, yang baru jalan runtime setelah semua script selesai dieksekusi). `_vehicleDbRecords()` jadi 3-tier: IndexedDB aktif > sumber teregistrasi > `VEHICLE_DB_RECORDS` literal (TIDAK dihapus, jadi fallback mati di produksi + tetap menjaga 7 test yang me-load `database-api.js` standalone). Detail lengkap termasuk perubahan yang perlu di `_vehicleModelRecords()` & seed `_vehicleDbDoLoad()`: lihat dokumen desain. |
| Perlu field `id`/`displayName` baru di `TORSI_DB`/`VEHICLE_SPEC_DB` (additive) | v1664 (desain) | Dibutuhkan utk memasangkan 1 entri torsi + 1 entri spec jadi 1 record — TIDAK bisa pakai `matchNames` sbg kunci pasangan krn sengaja beda utk BeAT FI (torsi terima alias "vario 110", spec tidak). 0 dampak ke `findTorsiDb()`/`findVehicleSpec()` (tidak baca field ini). |
| 3 keputusan terbuka untuk W | v1664 (desain) | (1) additive vs full-cutover `VEHICLE_DB_RECORDS` — direkomendasikan additive dulu, full-cutover jadi sesi terpisah lagi setelahnya; (2) nama fungsi `registerSource` (gaya, bukan fungsional); (3) toleransi pairing torsi-only/spec-only utk kendaraan masa depan. **Sesi coding gap (a) menunggu jawaban ini**, belum boleh mulai coding menebak arahnya sendiri. |

**Kesimpulan:** Fase 1 masih **4/5** (desain bukan implementasi — gap
(a) baru tertutup setelah sesi CODING berikutnya selesai & hijau, bukan
sesi desain ini). Sesi D **tetap belum boleh mulai** (larangan §6) —
urutan §7 di bawah diperbarui supaya sesi berikutnya adalah **sesi
coding gap (a)** (dengan syarat: keputusan §5 dokumen desain sudah
dijawab W), bukan langsung Sesi D.

====================================================

## 2h. Update Status per sesi ini (v1665 — sesi CODING gap (a) Sesi B, Fase 1 TUNTAS 5/5)

> Sumber: `SESSION-NOTE-sesi-b-gap-a-coding-registersource-v1665.md`
> (v1665). Implementasi persis sesuai `DESAIN-SESI-B-GAP-A-VEHICLE-DB-
> REGISTRASI.md` (v1664) — 3 keputusan terbuka §5 dijawab W sebelum
> coding dimulai (lihat tabel di bawah), tidak ditebak sepihak.

**3 keputusan §5 dokumen desain — dijawab W:**

| # | Keputusan | Jawaban |
|---|---|---|
| 1 | Additive vs full-cutover `VEHICLE_DB_RECORDS` | **(A) Additive** — literal TIDAK dihapus sesi ini, tetap fallback mati-di-produksi. Full-cutover ditunda ke sesi terpisah (sesuai rekomendasi desain). |
| 2 | Nama fungsi | **`registerSource`** — dipakai apa adanya sesuai usulan desain. |
| 3 | Toleransi pairing torsi-only/spec-only | **Toleran** — record dgn cuma salah satu (`torsi` atau `spec`) tetap terdaftar, field yg tidak ada jadi `undefined`. |

### ✅ Selesai sejak update §2g terakhir

| Item | Sesi | Catatan |
|---|---|---|
| `database-api.js`: `DatabaseAPI.vehicle.registerSource(entries)` | v1665 | `_registeredVehicleSource` baru, `dbVehicleRegisterSource()`, expose di namespace publik. `_vehicleDbRecords()` jadi 3-tier (IndexedDB aktif > sumber teregistrasi > `VEHICLE_DB_RECORDS` literal) — persis desain §4. |
| `_vehicleModelRecords()` — cabang baru utk registered source | v1665 | Sesuai desain §4a: kalau storage belum dimuat TAPI sudah ada `registerSource()`, model list diturunkan dari situ (bukan `VEHICLE_MODELS` literal beku). |
| Seed IndexedDB (`_vehicleDbDoLoad()`) — sumber seed diganti | v1665 | `_vehicleDbActiveRecords = _vehicleDbRecords().slice()` (bukan `VEHICLE_DB_RECORDS.slice()` langsung) — instalasi baru sekarang di-seed dari `TORSI_DB`/`VEHICLE_SPEC_DB` teregistrasi kalau ada. Sesuai desain §4b. |
| `sparepart-servis-b.js`: `id`/`displayName` additive di `TORSI_DB`/`VEHICLE_SPEC_DB` | v1665 | 2 entri tiap const (`vario-125`, `beat-fi`) — 0 field/nilai lama diubah. Sesuai desain §3. |
| `sparepart-servis-b.js`: IIFE registrasi top-level | v1665 | Dipasang tepat setelah `VEHICLE_SPEC_DB` selesai didefinisikan (sebelum `findVehicleSpec`), pairing by `id`, guard `typeof DatabaseAPI==='undefined'` sama pola 4 konsumen lain. Sesuai desain §4. |
| Test baru | v1665 | `tests/database-api-vehicledb-registersource-sesi-gap-a.test.js` (13 test) — cakupan persis desain §6: override data, pairing toleran torsi-only/spec-only, seed IndexedDB pakai registered source, muat 2 file bersama (parity vs `VEHICLE_DB_RECORDS` dikonfirmasi identik + guard matchNames BeAT FI torsi≠spec tetap terjaga), 0 regresi baik `database-api.js` maupun `sparepart-servis-b.js` dimuat sendirian. |
| Full suite `node --test` | v1665 | 6373 test (naik dari 6360), 6367 pass, **6 fail — dikonfirmasi 100% sama dgn 6 kegagalan pre-existing di checkout asli tanpa perubahan** (bundle-freshness, `self-test.js`, `lifeos/adapters/s456-*`, `verify-release-ready`, 2 test tagihan `S468d`/`txHTML` — semua tidak tersentuh patch ini). **0 regresi baru.** |

### ❌ Belum dikerjakan (sengaja ditunda, sesuai keputusan 1 di atas)

- **Hapus `VEHICLE_DB_RECORDS` literal (full-cutover)** — item Critical §3 terakhir. Literal sekarang mati di produksi (selalu kalah dari registered source begitu `sparepart-servis-b.js` ikut termuat) tapi TETAP ada di kode sbg fallback test/kompatibilitas. Sesi terpisah lagi, tidak terburu-buru — 0 risiko selama dibiarkan.

**Kesimpulan: Fase 1 sekarang TUNTAS 5/5** (poin 1 `manufacturers`/`vehicle_models` ✅, poin 2 Vehicle Database ke storage ✅ — gap (a) & (c) sama-sama tertutup, poin 3 wiring 3 literal generik ✅, poin 4 Event Bus ringan ✅, poin 5 checklist `actionType` ✅). **Larangan §6 resmi lepas untuk Sesi D** (`service_categories` 13-kategori-terkunci) — sesi berikutnya boleh mulai Sesi D. Urutan §7 di bawah diperbarui.

====================================================

## 2i. Update Status per sesi ini (v1666–v1670 — Sesi D `masterCategory`, mulai s/d filter/chip)

> Sumber: `SESSION-NOTE-sesi-d-mastercategory-v1666.md`,
> `-sesi-d-lanjutan1-mastercategory-dashbadge-v1667.md`,
> `-sesi-d-lanjutan2a-mastercategory-modalbadge-v1668.md`,
> `-sesi-d-lanjutan2b-mastercategory-livebadge-v1669.md`,
> `-sesi-d-lanjutan3-mastercategoryfilter-v1670.md` (sesi ini). Roadmap
> ini sebelumnya belum diperbarui utk v1666-v1669 walau CHANGELOG sudah
> mencatatnya — §2i menutup gap dokumentasi itu sekaligus menambah v1670.

### ✅ Selesai sejak update §2h terakhir

| Item | Sesi | Catatan |
|---|---|---|
| Sesi D — `masterCategory` 13 kategori terkunci (data+classifier) | v1666 | `DatabaseAPI.masterCategory` namespace baru (`getAll`/`getById`/`classifyItemName`), 13 kategori dari breakdown Honda Vario 125 KZR 2012 (jawaban W). **Additive per-ITEM** (bukan migrasi 8 grup ad-hoc 1:1 — grup lama campur lintas kategori terkunci, classifier per-item lebih presisi). `resolveCatGroup()` jadi SoT tunggal, semua cabang dibungkus `_withMasterCategory()`. 0 field/titik baca lama diubah. |
| Sesi D-lanjutan1 — badge read-only di dashboard Pengingat Servis | v1667 | `Sparepart.dashReminderMasterCatBadgeHTML()`, pure function, reuse `resolveCatGroup()` apa adanya. |
| Sesi D-lanjutan2a — badge di modal Kategori Sparepart (baca 1x saat modal dibuka) | v1668 | `Sparepart.updateMasterCatBadge(name,vehicleId)`, dipanggil dari `openCatModal()`. |
| Sesi D-lanjutan2b — badge live-update saat mengetik nama | v1669 | `Sparepart.updateMasterCatBadgeLive()`, ditambahkan ke rangkaian `oninput` `#sparepartName` yang sudah ada (audit konfirmasi 1 atribut sinkron, bukan listener terpisah — 0 race baru). |
| **Sesi D-lanjutan3 — filter/chip kategori master di "Kelola Kategori Sparepart"** | v1670 (sesi ini) | `Sparepart.activeMasterCategoryFilter`/`setMasterCategoryFilter()`/`renderMasterCategoryChips()`, pola sama persis `Servis.renderActionTypeChips()` (Sesi E6). Target `renderCatList()` (daftar kategori), BUKAN `Servis.renderList()` (daftar log riwayat, scope lebih besar). 10 test baru, full suite 6420/6422 (2 gagal pre-existing tidak berubah). |

### 🟡 Masih sebagian

| Item | Yang masih kurang |
|---|---|
| Sesi D (Master Database `masterCategory`) | Filter/chip SEKARANG ada di "Kelola Kategori Sparepart" (v1670). **Belum**: filter/chip yang sama di `Servis.renderList()` (Riwayat Servis — beda scope, butuh join log→kategori); keputusan produk item classify `null` (tetap `null` atau kategori ke-14 "Lainnya"); persist filter aktif ke `D`/localStorage. |
| Sesi B (storage IndexedDB) | Gap (a) `VEHICLE_DB_RECORDS` literal — **TUNTAS v1665** (lihat §2h), tidak berubah sesi ini. |

### ⚠️ Ditemukan lagi di v1670: version marker basi (2x berulang, pola sama v1653)

`APP_BUILD_VERSION` dkk **berhenti dibump sejak v1665** — 4 sesi (Sesi D
v1666-v1669) mengedit source tanpa langkah "Build — bump manual" seperti
sesi-sesi sebelumnya. **Dibetulkan otomatis v1670** (`scripts/build.js`
bump `...-1664`→`...-1665`, `?v=1644`→`?v=1645`). Ini pola BERULANG (sudah
2x: v1653 dan v1665→v1670) — dicatat sbg kandidat sesi tersendiri utk
menambah gate wajib (bukan cuma warning) di `scripts/build.js`, belum
dikerjakan.

**Skor update:** Sesi D (di luar Fase 1, item High §3) sekarang: data+
classifier ✅ (v1666), 3 consumer UI read-only/interaktif ✅ (v1667-v1669),
filter/chip di 1 dari 2 daftar kandidat ✅ (v1670). Fase 1 tidak berubah
(tetap TUNTAS 5/5 sejak v1665, lihat §2h).

**Urutan sesi ringan berikutnya (rekomendasi, prioritas menurun, status v1670):**
1. Sesi C — Dana Titipan (`titipan.updated`), lalu `investasi.js` dasar & Aset non-core (item Prioritas Sedang audit Sesi C yang belum tersentuh sejak §2f).
2. Sesi D-lanjutan4 (opsional) — filter/chip `masterCategory` di `Servis.renderList()` (Riwayat Servis), pola sama v1670 tapi butuh join log→kategori dulu.
3. Sesi F lanjutan — thumbnail gambar & lightbox (kosmetik, aman kapan saja, tidak berubah dari §2e).
4. (Kandidat proses, bukan fitur) sesi kecil menambah gate wajib version-bump di `scripts/build.js` — mencegah pola "version marker basi" berulang lagi.

====================================================

## 2j. Update Status per sesi ini (v1671–v1672 — Sesi C Dana Titipan, `titipan.updated`)

> Sumber: `SESSION-NOTE-sesi-c-titipan-updated.md` (v1671-v1672).
> Menutup item pertama urutan §2i: Dana Titipan (`titipan.updated`) —
> domain terakhir dari 5 yang ditandai `AUDIT-SESI-C-EVENTBUS-D-WRITES-
> NO-EMIT.md` temuan #5 sebagai "SELURUH domain 0% Event Bus".

### ✅ Selesai sejak update §2i terakhir

| Item | Sesi | Catatan |
|---|---|---|
| Dana Titipan — 10 titik `save()` di 4 file, semua emit `titipan.updated` | v1671-1672 | `dana-titipan-pool-api.js` (2x: `_addEntry()`/`deleteEntry()`), `dana-titipan-commitment-return-api.js` (4x: `saveCommitment()` create/edit, `deleteCommitment()`, `recordReturn()`, `deleteReturn()`), `titipan-reconcile.js` (3x: `repairOwnerIdConsistency()`/`repairDebtNameStaleness()`/`repairTransactionOwnerRefs()`, masing² hanya emit kalau ada perubahan nyata — guard sama dgn `save()`-nya), `titipan-expense-flow.js` (1x: `submit()`). Payload `{kind,action,...id}` pola sama persis `account.updated`/`product.updated`. 0 field/logic bisnis lama diubah. |
| Listener `AIService.wireEvents()` → `titipan.updated` | v1671-1672 | Ditambahkan sekalian di sesi yang sama (7 event lama tidak berubah) — hindari "pemancar tanpa radio" baru, sama alasan §2e/§2f. |
| Test baru | v1671-1672 | `tests/dana-titipan-aibus-titipan-updated-sesi-c.test.js` — 21/21 pass, cakupan 10 titik emit (payload lengkap + kasus 0-emit saat guard false/id tidak ditemukan) + guard `AIBus` tidak ada + 2 test listener. |
| Full suite `node --test` | v1671-1672 | 6443 test, 6441 pass, **2 fail — dikonfirmasi 100% sama dgn 2 kegagalan pre-existing sejak v1670** (S468d, `txHTML()` item virtual `vbill_`). **0 regresi baru.** |

### ❌ Belum dikerjakan (tidak berubah dari §2i, urutan bergeser naik 1)

- Sesi D-lanjutan4 — filter/chip `masterCategory` di `Servis.renderList()` (Riwayat Servis).
- Sesi F lanjutan — thumbnail gambar & lightbox (kosmetik, aman kapan saja).
- (Kandidat proses) gate wajib version-bump di `scripts/build.js`.
- Domain Event Bus lain yang masih 0% dari audit yang sama: `investasi.js` dasar (event baru di luar `investment.updated`), Aset non-core (`aset-misc.js`/`aset-emas-impor.js`/`aset-reports.js`). Zakat/PBB masih 3/9 titik diskrit (tidak berubah).

**Skor update:** Sesi C Prioritas Sedang sekarang: Shop/Cobek TUNTAS (9/9, v1662) + **Dana Titipan TUNTAS (10/10 titik, v1671-1672)**; `investasi.js` dasar & Aset non-core masih 0% (2/3 domain besar Prioritas Sedang selesai, naik dari 1/3 di §2i). Fase 1 tidak berubah (tetap TUNTAS 5/5 sejak v1665).

**Urutan sesi ringan berikutnya (rekomendasi, prioritas menurun, status v1672):**
1. Sesi C — `investasi.js` dasar (event baru di luar `investment.updated` yang sudah ada) & Aset non-core (2 domain besar terakhir yang masih 0% Event Bus dari audit yang sama).
2. Sesi D-lanjutan4 (opsional) — filter/chip `masterCategory` di `Servis.renderList()` (Riwayat Servis).
3. Sesi F lanjutan — thumbnail gambar & lightbox (kosmetik, aman kapan saja, tidak berubah dari §2e).
4. (Kandidat proses, bukan fitur) sesi kecil menambah gate wajib version-bump di `scripts/build.js`.

====================================================

## 2k. Update Status per sesi ini (v1673, v1675 — Sesi D TUNTAS: filter/chip Riwayat Servis + keputusan classify `null` + persist localStorage)

> Sumber: `SESSION-NOTE-sesi-d-lanjutan4-mastercategoryfilter-servis-v1673.md`
> (v1673, belum sempat masuk roadmap — CHANGELOG sudah mencatatnya tapi §2j
> di atas cuma menutup Dana Titipan v1671-1672), `SESSION-NOTE-sesi-d-lanjutan5-
> mastercategoryfilter-uncategorized-persist-v1675.md` (v1675, sesi ini).
> §2k menutup gap dokumentasi v1673 sekaligus menambah v1675 — v1674
> (`investasi.js` dasar) di luar scope Sesi D, tidak disentuh di sini
> (lihat CHANGELOG v1674 utk detailnya).

### ✅ Selesai sejak update §2i terakhir (Sesi D sekarang TUNTAS)

| Item | Sesi | Catatan |
|---|---|---|
| Sesi D-lanjutan4 — filter/chip kategori master di Riwayat Servis | v1673 | `Servis.activeMasterCategoryFilter`/`setMasterCategoryFilter()`/`renderMasterCategoryChips()`/`resolveLogMasterCategoryId()` (join log→kategori baru, join langsung `categoryId` → fallback `resolveServisCatForVehicle()` by-nama → fallback match nama polos). Target `Servis.renderList()` (daftar LOG), melengkapi `Sparepart.renderCatList()` (daftar KATEGORI, v1670) — 2 dari 2 daftar kandidat filter/chip kategori master sekarang tuntas. |
| **Sesi D-lanjutan5 — keputusan produk item classify `null` + chip "❔ Belum Terklasifikasi"** | v1675 (sesi ini) | Tetap `null` (TIDAK menambah kategori ke-14 ke `DatabaseAPI.masterCategory`, kontrak "13 kategori terkunci" tidak disentuh). `UNCATEGORIZED_FILTER_ID` (sentinel murni UI, `sparepart-servis.js`) sebagai opsi tambahan di `renderMasterCategoryChips()` KEDUA modul (Sparepart & Servis) — cocokkan `masterCategoryId==null` / `resolveLogMasterCategoryId()==null`. |
| **Sesi D-lanjutan5 — persist filter aktif ke localStorage** | v1675 (sesi ini) | `_loadMasterCategoryFilterPrefsOnce()`/`_saveMasterCategoryFilterPrefs()` di kedua modul, key terpisah (`sparepartMasterCategoryFilterPrefs`/`servisMasterCategoryFilterPrefs`). SENGAJA bukan `FilterPrefsStore` (S716) apa adanya — kontrak `target`-nya (owner-array+settlement) beda bentuk dari kebutuhan (1 id string) — pola try/catch permisif & nama method tetap disamakan, implementasi berdiri sendiri. |
| Test baru/update | v1673, v1675 | v1673: 10 test baru (`servis-mastercategoryfilter-sesi-d-lanjutan4.test.js`). v1675: 2 file test lama diupdate (chip count 14→15) + 2 file test baru (17 test: 10 Sparepart + 7 Servis, cakupan chip/filter/persist/guard baca-sekali/id asing/JSON korup). |
| Full suite `node --test` | v1673, v1675 | v1673: tidak diaudit terpisah di roadmap (lihat CHANGELOG). v1675 (sesi ini): 6487 test, 6478 pass, **9 fail — 0 regresi baru**, semua pre-existing (7× gap harness `investasi-dasar-...` v1674 yang sudah dicatat "ditunda atas instruksi W", 2× S468d/txHTML pre-existing sejak v1673). |

### ✅ Sesi D (Master Database `masterCategory`) — status akhir: TUNTAS

Baris "🟡 Masih sebagian" di §2i (filter/chip Riwayat Servis, keputusan
classify `null`, persist localStorage) **SEMUA sudah tertutup** per v1675.
Sesi D (di luar Fase 1, item High §3) sekarang selesai penuh: data+
classifier (v1666) → 3 consumer UI (v1667-v1669) → filter/chip di KEDUA
daftar kandidat (v1670, v1673) → keputusan produk classify `null` + persist
(v1675).

### ❌ Belum dikerjakan (tidak berubah dari §2j, Sesi D dikeluarkan dari daftar)

- `investasi.js` dasar (v1674, sebagian — 7 gap harness ditunda atas
  instruksi W) & Aset non-core (`aset-emas-impor.js`/`aset-reports.js`) —
  2 domain besar terakhir Sesi C Prioritas Sedang yang masih 0%/sebagian
  Event Bus.
- Sesi F lanjutan — thumbnail gambar & lightbox (kosmetik, aman kapan saja).
- (Kandidat proses) gate wajib version-bump di `scripts/build.js`.
- Zakat/PBB masih 3/9 titik diskrit (tidak berubah).

**Skor update:** Sesi D **TUNTAS** (naik dari "1 dari 2 daftar kandidat +
2 keputusan produk tertunda" di §2i). Sesi C Prioritas Sedang: Shop/Cobek
TUNTAS (v1662) + Dana Titipan TUNTAS (v1671-1672) + `investasi.js` dasar
sebagian (v1674, 7 gap harness) — Aset non-core masih 0%. Fase 1 tidak
berubah (tetap TUNTAS 5/5 sejak v1665).

**Urutan sesi ringan berikutnya (rekomendasi, prioritas menurun, status v1675):**
1. Perbaikan 7 gap harness `investasi-dasar-aibus-investment-updated-sesi-c.test.js`
   (v1674, sempat ditunda atas instruksi W — cek apakah sudah boleh dikerjakan).
2. Aset non-core (`aset-emas-impor.js`/`aset-reports.js`) — domain besar
   TERAKHIR Sesi C Prioritas Sedang yang masih 0% Event Bus.
3. Sesi F lanjutan — thumbnail gambar & lightbox (kosmetik, aman kapan saja, tidak berubah dari §2e).
4. (Kandidat proses, bukan fitur) sesi kecil menambah gate wajib version-bump di `scripts/build.js`.

====================================================

## 2l. Update Status per sesi ini (v1676 — Sesi C: Aset non-core TUNTAS)

> Sumber: `SESSION-NOTE-sesi-c-aset-noncore-asset-updated-v1676.md`.
> Menutup item ke-2 urutan §2k: Aset non-core (`aset-emas-impor.js`/
> `aset-reports.js`) — domain besar TERAKHIR Sesi C Prioritas Sedang
> yang masih 0% Event Bus.

### ✅ Selesai sejak §2k

| Item | Sesi | Catatan |
|---|---|---|
| Aset non-core — 2 titik relevan diberi `asset.updated` | v1676 | `aset-emas-impor.js`: `GoldImport.commit()` emit `{imported:count}` (1x per batch). `aset-reports.js`: `Penyusutan.toggleAktif()`/`.updateParam()` emit `{penyusutanUpdated:true,editId}`. Payload pola field langsung (tanpa wrapper `kind`/`action`), konsisten `aset.js`/`aset-owners.js` — BEDA dari pola `kind`/`action` yang dipakai `finance.updated`/`product.updated`/`titipan.updated`/`investment.updated`. |
| Keputusan produk — 2 write point sengaja TIDAK diberi event | v1676 | `GoldZakat.onHargaInput()` (harga acuan emas/gram) & `PajakAset.updateSetting()` (NJOPTKP/tarif PBB) — keduanya pengaturan global, bukan data per-aset, kategori "RENDAH" di `AUDIT-SESI-C-EVENTBUS-D-WRITES-NO-EMIT.md` (pola sama `format-tema.js`). |
| Listener `AIService.wireEvents()` → `asset.updated` | (sudah ada) | Sudah subscribe sejak sesi wiring sebelumnya — 0 perubahan listener sesi ini. |
| Test baru | v1676 | `tests/aset-goldimport-aibus-emit-sesi-c.test.js` (4 test) + `tests/aset-reports-penyusutan-aibus-emit-sesi-c.test.js` (6 test) — **10/10 pass**. |
| Full suite `node --test` | v1676 | Setelah `build.js`: 6480 test, 6478 pass, **2 fail — 100% pre-existing sejak v1673** (S468d/txHTML virtual-bill), **0 regresi baru**. |

### ❌ Belum dikerjakan (tidak berubah dari §2k, Aset non-core dikeluarkan dari daftar)

- Perbaikan 7 gap harness `investasi-dasar-aibus-investment-updated-sesi-c.test.js` (v1674, tetap ditunda atas instruksi W).
- Sesi F lanjutan — thumbnail gambar & lightbox (kosmetik, aman kapan saja).
- (Kandidat proses) gate wajib version-bump di `scripts/build.js`.
- Zakat/PBB masih 3/9 titik diskrit (tidak berubah).

**Skor update:** Sesi C Prioritas Sedang — **Aset non-core TUNTAS**.
Semua 5 domain Sesi C Prioritas Sedang kini TUNTAS: Shop/Cobek (v1662),
Dana Titipan (v1671-1672), `investasi.js` dasar (v1674, minus 7 gap
harness), Aset non-core (v1676). Prioritas Sedang Sesi C **selesai**
kecuali 7 gap harness v1674 yang menunggu keputusan W. Fase 1 tidak
berubah (tetap TUNTAS 5/5 sejak v1665). Sesi D tidak berubah (tetap
TUNTAS sejak v1675).

**Urutan sesi ringan berikutnya (rekomendasi, prioritas menurun, status v1676):**
1. Perbaikan 7 gap harness `investasi-dasar-aibus-investment-updated-sesi-c.test.js`
   (v1674, sempat ditunda atas instruksi W — cek apakah sudah boleh dikerjakan).
2. Sesi F lanjutan — thumbnail gambar & lightbox (kosmetik, aman kapan saja, tidak berubah dari §2e).
3. (Kandidat proses, bukan fitur) sesi kecil menambah gate wajib version-bump di `scripts/build.js`.
4. Zakat/PBB — 6 titik `save()` sisa (dipanggil tiap render, bukan aksi diskrit — butuh keputusan desain terpisah sebelum coding, lihat §2e).

====================================================

## 2m. Update Status per sesi ini (v1677 — Sesi C-followup: 7 gap harness `investasi-dasar` TUNTAS + 1 temuan bug baru)

> Sumber: `SESSION-NOTE-sesi-c-followup-investasi-dasar-gap-harness-v1677.md`.
> Menutup item #1 urutan §2l: perbaikan 7 gap harness
> `investasi-dasar-aibus-investment-updated-sesi-c.test.js` (v1674,
> ditunda atas instruksi W).

### ✅ Selesai sejak §2l

| Item | Sesi | Catatan |
|---|---|---|
| 7 gap harness `investasi-dasar-aibus-investment-updated-sesi-c.test.js` | v1677 | **TUNTAS 7/7 (17/17 test file ini pass)**. Semua perubahan HANYA di file test — 0 baris kode produksi diubah. Bagian 2 (`aset-misc.js`, 4 test): stub kosong utk 7 nama yang cuma dirujuk di baris expose `window` terakhir file. Bagian 3 (`aset.js saveUnified()`, 3 test): 2 dependency dimuat dari SOURCE ASLI (`filter-prefs-store.js`, `aset-misc.js`, urutan muat aset.js dulu baru aset-misc.js), `OwnershipEngine.resolve()`/`fmtFull`/`fmt`/`AssetInsight.render()` di-stub, `Aset.renderDashboard/renderInvestasi/_safeRenderReports` di-override no-op post-load, `AIBus.emit` stub difilter cuma `investment.updated` (`asset.updated` preseden lama ikut emit di jalur sama, bukan subjek test ini). Detail lengkap: `SESSION-NOTE-sesi-c-followup-investasi-dasar-gap-harness-v1677.md`. |
| Full suite `node --test` | v1677 | 6497 test, **6495 pass, 2 fail — 100% pre-existing sejak v1673** (S468d/txHTML virtual-bill, tidak berubah), **0 regresi baru**. |

### 🆕 Temuan baru sesi ini (di luar scope 7 gap harness, DITUNDA atas instruksi W)

**Bug produksi — double-holding di `aset.js saveUnified()`.** Saat
menutup gap harness Bagian 3, 3 test masih gagal setelah semua stub
ditutup — bukan lagi `ReferenceError`, tapi assertion count event salah.
Ditrace manual: kalau aset BARU dibuat dgn jenis yang cocok mapping
migrasi (`ASSET_JENIS_TO_INVESTMENT_TYPE`, subset `TRADABLE_TYPE_MAP`:
Saham/Reksadana/Kripto/Deposito) + `hargaBeli`/`jumlahUnit` terisi (>0)
+ toggle "Buat Holding Investasi Otomatis" aktif, `_saveInner()` (dari
`Aset.save()`, dipanggil DI DALAM `saveUnified()` SEBELUM blok
holding-creation eksplisit) memicu `renderList()` →
`migrateAssetInvestmentsToHoldings()` yang mendeteksi aset baru ini
sbg kandidat migrasi SAH (belum py `_migratedToInvestmentId`/
`investmentId`) → bikin Holding #1. Lalu `saveUnified()` lanjut: guard
`if(savedAsset.investmentId)return` cek field `investmentId`, BUKAN
`_migratedToInvestmentId` yang justru ditulis migrasi barusan — guard
gagal menangkap, `saveUnified()` bikin Holding #2 lagi. **1 aset baru
→ 2 Holding terduplikasi.** Dikonfirmasi manual via reproduksi standalone
(`saved.investmentId` beda dgn `saved._migratedToInvestmentId`).

**Keputusan sesi ini**: TIDAK diperbaiki (di luar scope 7 gap harness).
2 dari 3 data test Bagian 3 diubah supaya tidak memicu kombinasi ini
(hargaBeli/jumlahUnit dikosongkan, tidak relevan dgn logic yang DITES
di test tsb), murni utk menutup gap harness tanpa memperluas scope
sesi. Bug produksinya sendiri dicatat di bawah utk sesi terpisah.

### ❌ Belum dikerjakan (tidak berubah dari §2l kecuali item #1 dikeluarkan + 1 item baru)

- **[BARU] Bug produksi double-holding `aset.js saveUnified()`** —
  guard `if(savedAsset.investmentId)` perlu juga cek
  `_migratedToInvestmentId` (atau `renderList()` di dalam `_saveInner()`
  dipindah supaya tidak race dgn blok holding-creation eksplisit) —
  butuh desain/review kecil sebelum coding (menyentuh urutan
  side-effect `_saveInner()`, bukan sekadar tambah 1 guard), TIDAK
  masuk kategori "gap kecil" murni. Repro lengkap: lihat
  `SESSION-NOTE-sesi-c-followup-investasi-dasar-gap-harness-v1677.md`.
- Sesi F lanjutan — thumbnail gambar & lightbox (kosmetik, aman kapan saja).
- (Kandidat proses) gate wajib version-bump di `scripts/build.js`.
- Zakat/PBB masih 3/9 titik diskrit (tidak berubah).

**Skor update:** 7 gap harness `investasi-dasar` **TUNTAS 7/7**. Sesi C
Prioritas Sedang (Shop/Cobek, Dana Titipan, `investasi.js` dasar, Aset
non-core) sekarang **selesai penuh TANPA pengecualian** (v1674's 7 gap
harness tidak lagi jadi catatan kaki). Fase 1 & Sesi D tidak berubah.
1 temuan bug baru (double-holding) menambah antrian sesi ringan
berikutnya.

**Urutan sesi ringan berikutnya (rekomendasi, prioritas menurun, status v1677):**
1. ~~Bug produksi double-holding `aset.js saveUnified()`~~ — **TUNTAS
   v1678, lihat §2n.**
2. Sesi F lanjutan — thumbnail gambar & lightbox (kosmetik, aman kapan saja, tidak berubah dari §2e).
3. (Kandidat proses, bukan fitur) sesi kecil menambah gate wajib version-bump di `scripts/build.js`.
4. Zakat/PBB — 6 titik `save()` sisa (dipanggil tiap render, bukan aksi diskrit — butuh keputusan desain terpisah sebelum coding, lihat §2e).

====================================================

## 2n. Update Status per sesi ini (v1678 — Fix bug produksi double-holding `aset.js saveUnified()`)

> Sumber: `SESSION-NOTE-fix-double-holding-asetjs-saveunified-v1678.md`.
> Menutup item #1 urutan §2m: bug produksi double-holding yang
> ditemukan v1677 (ditunda sesi itu, di luar scope 7 gap harness).

### ✅ Selesai sejak §2m

| Item | Sesi | Catatan |
|---|---|---|
| Fix bug produksi double-holding `aset.js saveUnified()` | v1678 | Guard sebelum blok holding-creation eksplisit sekarang cek JUGA `savedAsset._migratedToInvestmentId`, bukan cuma `savedAsset.investmentId` (1 baris). Akar masalah: `Aset.save()` di dalam `saveUnified()` memicu `renderList()`→`migrateAssetInvestmentsToHoldings()` yang bisa lebih dulu bikin Holding #1 + tandai `_migratedToInvestmentId` (field beda dari yang dicek guard lama) sebelum blok eksplisit sempat jalan. Urutan side-effect `_saveInner()`/`renderList()` TIDAK disentuh (opsi minim-risiko, bukan opsi "pindah `renderList()`" yang lebih invasif). |
| Regression test | v1678 | Ditambahkan ke `tests/investasi-dasar-aibus-investment-updated-sesi-c.test.js` Bagian 3 — reproduksi persis kombinasi race (jenis Reksadana + hargaBeli/jumlahUnit terisi), assert cuma 1x `Investment.addHolding()` terpanggil. PASS. |
| Full suite `node --test` | v1678 | 6501 test, 6487 pass, 14 fail — fail count & nama test IDENTIK sebelum/sesudah fix (dikonfirmasi diff manual), **0 regresi baru** dari fix ini. |

### ⚠️ Catatan lingkungan (bukan hasil sesi ini, perlu perhatian W)

Sesi ini dikerjakan di sandbox rekonstruksi (source direkonstruksi dari
overlay `app-main__78_.zip` + `PATCH-AKUMULASI-v1642-v1673/v1675/v1676/
v1677.zip`, TANPA akses git/jaringan) — bukan checkout git penuh milik
W. Full suite di sandbox ini menunjukkan **14 fail**, TAPI CHANGELOG
v1677 mencatat **2 fail** (S468d/txHTML virtual-bill) di repo asli.
Dikonfirmasi 12 fail tambahan ini SUDAH ADA sebelum fix v1678 disentuh
sama sekali (diuji di working copy bersih tanpa perubahan apa pun,
hasil identik) — kemungkinan besar artefak drift rekonstruksi sandbox
(mis. ada patch/sesi di antara v1673–v1677 yang tidak ikut ter-overlay
persis), BUKAN regresi nyata di repo W. **Rekomendasi: jalankan ulang
`node --test` di repo git W sendiri untuk verifikasi definitif** sebelum
mempercayai angka "14 fail" di atas. Bundle hasil build v1678 juga TANPA
minifikasi (esbuild tidak tersedia di sandbox ini) — sintaks valid
(`node --check` lolos, `verify-release-ready.js` lolos via override),
tapi kalau W butuh bundle terminifikasi, jalankan `npm install
--save-dev esbuild` lalu `node scripts/build.js` ulang di lingkungan W.

### ❌ Belum dikerjakan (tidak berubah dari §2m)

- Sesi F lanjutan — thumbnail gambar & lightbox (kosmetik, aman kapan saja).
- (Kandidat proses) gate wajib version-bump di `scripts/build.js`.
- Zakat/PBB masih 3/9 titik diskrit.

**Skor update:** Bug produksi double-holding (item baru §2m) **TUNTAS**.
Tidak ada perubahan lain di luar fix ini — Fase 1, Sesi D, Dana Titipan,
wiring `AIService.wireEvents()`, Sesi F semua tetap sama posisinya dgn
§2m.

**Urutan sesi ringan berikutnya (rekomendasi, prioritas menurun, status v1678):**
1. ~~Sesi F lanjutan — thumbnail gambar & lightbox~~ — **thumbnail
   TUNTAS v1679 (lihat §2o); lightbox TETAP terbuka, lihat §2o.**
2. (Kandidat proses, bukan fitur) sesi kecil menambah gate wajib version-bump di `scripts/build.js`.
3. Zakat/PBB — 6 titik `save()` sisa (butuh keputusan desain terpisah sebelum coding, lihat §2e).
4. Wiring listener `AIService.wireEvents()` untuk event yang sudah ada — masih 0% (lihat §2e poin 3, belum dikerjakan sejak direkomendasikan).
5. Sesi C — Dana Titipan lanjutan / `investasi.js` dasar & Aset non-core lanjutan, kalau ada titik baru ditemukan.

====================================================

## 2o. Update Status per sesi ini (v1679 — Sesi F-lanjutan: Thumbnail gambar di Riwayat Servis)

> Sumber: `SESSION-NOTE-sesi-f-lanjutan-thumbnail-foto-riwayat-servis-v1679.md`.
> Item #1 urutan §2n — thumbnail SAJA (lightbox sengaja dipisah, di luar
> scope sesi ini, sesuai disiplin 1 sesi = 1 fokus kecil).

### ✅ Selesai sejak §2n

| Item | Sesi | Catatan |
|---|---|---|
| Thumbnail gambar `<img>` di Riwayat Servis | v1679 | `car-notes.js` `Servis.renderList()`: `<img>` 38×38px (sama ukuran `.tx-icon`) dari `s.foto[0]` (foto pertama), disisipkan setelah `tx-icon` sebelum `tx-info`. Token CSS existing (`var(--r-lg)`/`var(--border2)`, sama persis `_renderPhotoThumbs()` modal). 0 perubahan utk entry tanpa foto. Badge teks "📷 N" (F2) tetap dipertahankan berdampingan. |
| Test baru | v1679 | `tests/servis-foto-thumbnail-sesi-f-lanjutan.test.js` (5 test): render dari foto pertama, 0 render kalau tanpa foto, isolasi per-entry, src dataURL utuh. 5/5 pass. `tests/servis-foto-badge-sesi-f2.test.js` (lama): 5/5 pass, 0 regresi. |
| Full suite `node --test` | v1679 | 6506 test, 6492 pass, 14 fail — fail count & nama IDENTIK dgn v1678 (0 regresi baru; 14 fail tetap drift rekonstruksi sandbox, lihat catatan §2n). |

### 🟡 Sesi F masih sebagian

- **Lightbox/viewer foto ukuran penuh** — MASIH belum. Klik
  thumbnail/baris tetap membuka `servisModal` (data-action
  `openServisModal` TIDAK disentuh sesi ini). Butuh keputusan UX kecil
  sebelum coding: klik thumbnail vs klik baris → beda aksi? navigasi
  next/prev antar-foto dalam 1 entry (bisa >1 foto)? cara tutup
  (Esc/tap-luar/tombol ✕)? — bukan "gap kecil" murni, desain tersendiri.
- Kompresi gambar dataURL sebelum simpan — backlog F1 lama, tetap
  terbuka (tidak memblokir thumbnail di sesi ini, `object-fit:cover`
  murni re-render visual).

### ❌ Belum dikerjakan (tidak berubah dari §2n)

- Sesi F lightbox (baru saja dijelaskan di atas).
- (Kandidat proses) gate wajib version-bump di `scripts/build.js`.
- Zakat/PBB masih 3/9 titik diskrit.
- Wiring listener `AIService.wireEvents()` — masih 0%.
- Sesi C — Dana Titipan lanjutan / `investasi.js` dasar & Aset non-core
  lanjutan (kalau ada titik baru).

**Skor update:** Sesi F naik dari "F1+F2 selesai, thumbnail & lightbox
backlog" → **thumbnail TUNTAS, lightbox TETAP backlog** (1/2 item
lanjutan selesai). Item lain (Fase 1, Sesi D, Dana Titipan, wiring
`AIService.wireEvents()`, gate version-bump, Zakat/PBB) semua tetap
sama posisinya dgn §2n.

**Urutan sesi ringan berikutnya (rekomendasi, prioritas menurun, status v1679):**
1. Sesi F lanjutan — **lightbox/viewer foto ukuran penuh** (perlu
   keputusan UX kecil dulu sebelum coding — lihat catatan di atas;
   kalau W belum siap putuskan, lewati ke item #2).
2. (Kandidat proses, bukan fitur) sesi kecil menambah gate wajib version-bump di `scripts/build.js`.
3. Zakat/PBB — 6 titik `save()` sisa (butuh keputusan desain terpisah sebelum coding, lihat §2e).
4. Wiring listener `AIService.wireEvents()` untuk event yang sudah ada — masih 0%.
5. Sesi C — Dana Titipan lanjutan / `investasi.js` dasar & Aset non-core lanjutan, kalau ada titik baru ditemukan.

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
>
> **Update v1663 (Sesi C, wiring listener `AIService.wireEvents()`)** —
> sesuai keputusan §2d poin 3 / urutan §2e poin 1: listener sekarang
> nyambung ke SEMUA event yang sudah emit (`account.updated`/
> `product.updated`/`investment.updated` ditambah ke array, 4 event lama
> tidak berubah). Giliran berikutnya: sesi desain gap (a) Sesi B
> (`VEHICLE_DB_RECORDS` literal), BUKAN domain Event Bus baru. Detail
> lengkap: §2f.
>
> **Update v1664 (Sesi B, desain gap (a), 0 kode)** — mekanisme
> registrasi `TORSI_DB`/`VEHICLE_SPEC_DB` → `DatabaseAPI` DIRANCANG
> (`DESAIN-SESI-B-GAP-A-VEHICLE-DB-REGISTRASI.md`), belum dikodekan.
> **Giliran berikutnya: sesi CODING gap (a)** — syarat mulai: 3
> keputusan terbuka di dokumen desain (§5) dijawab W dulu (additive vs
> full-cutover `VEHICLE_DB_RECORDS`, nama fungsi, toleransi pairing
> partial). Sesi D **masih menunggu** sampai sesi coding ini tuntas &
> hijau (larangan §6 belum lepas). Detail lengkap: §2g.
>
> **Update v1665 (Sesi B, CODING gap (a), Fase 1 TUNTAS 5/5)** — 3
> keputusan §5 dijawab W (additive/`registerSource`/toleran-partial),
> `DatabaseAPI.vehicle.registerSource()` diimplementasi persis sesuai
> desain v1664, 13 test baru (semua hijau), full suite 6373 test/6367
> pass/6 fail (6 kegagalan dikonfirmasi 100% pre-existing, 0 regresi
> baru). **Fase 1 sekarang TUNTAS 5/5 — larangan §6 lepas.** Giliran
> berikutnya: **Sesi D** (`service_categories` 13-kategori-terkunci)
> boleh mulai. Detail lengkap: §2h.
>
> **Update v1666 (Sesi D, `masterCategory` — data+wiring layer)** — 13
> kategori terkunci didefinisikan (`DatabaseAPI.masterCategory`), sumber:
> breakdown servis Honda Vario 125 KZR 2012 dari W. `resolveCatGroup()`
> expose field baru `masterCategoryId`/`-Name`/`-Icon` ADDITIVE (0 field
> lama berubah). **Beda dari rencana literal roadmap**: migrasi per-ITEM
> (keyword classifier), bukan per-KELOMPOK 8 grup ad-hoc (grup ad-hoc
> ternyata campur lintas kategori terkunci, migrasi per-grup akan
> kehilangan presisi) — lihat §2i. 11 test baru, full suite 6387/6383
> pass/4 fail (4 kegagalan 100% pre-existing dari v1665, 0 regresi baru).
> **Sesi D belum TUNTAS** — 0 UI/consumer baca field baru ini, giliran
> berikutnya bisa lanjut UI Sesi D ATAU sesi lain (Sesi C Dana Titipan
> dkk, Sesi F lanjutan thumbnail, dll — independen).

**Sesi A — `manufacturers` + `vehicle_models` relasional (fondasi, pecah 2)** 🟢 selesai (v1647–v1649)
- A1 (v1647): skema data murni — tambah `D.manufacturers[]`/`D.vehicleModels[]` (seed dari 2 model yang sudah ada di `VEHICLE_DB_RECORDS`), `D.vehicles` dapat field `modelId` (opsional, `name` tetap dipakai sbg fallback display) — 0 UI, 0 fungsi baca diubah, murni tambah data+migrasi ringan.
- A2 (v1648) + followup (v1649): `DatabaseAPI.vehicle.getById()`/`getAll()` dkk baca `modelId` kalau ada, fallback match by `name` kalau belum. Followup v1649 menutup 2 titik baca terakhir (`renderVehicleSpecCard()`, `_tirePressureRef()`) yang sempat terlewat di v1648 krn belum ada full checkout. **0 titik baca live tersisa.**

**Sesi B — Pindahkan `TORSI_DB`/`VEHICLE_SPEC_DB` ke data tersimpan** 🟢 selesai (v1650, sinkron lanjut v1653, followup v1661, desain gap (a) v1664, coding gap (a) v1665)
- Key by `modelId` (hasil Sesi A), baca lewat `DatabaseAPI.vehicle.getAll()` yang sudah wired — konsumen (`findTorsiDb`/`findVehicleSpec`/`_allTorsiEntries`) sudah baca lewat API, jadi sesi ini cuma pindah SUMBER datanya, bukan ubah titik baca.
- **v1650**: layer storage IndexedDB (`ensureLoaded`/`isLoaded`/`invalidateCache`) sudah ada.
- **v1653**: gap `VEHICLE_MODELS`/`DatabaseAPI.vehicleModel.*`/`dbVehicleModelFindByName()` belum ikut storage aktif — **ditutup** (`_vehicleModelRecords()` baru).
- **v1661 (followup gap (c))**: audit titik pemanggil `findTorsiDb`/`findVehicleSpec` (`resolveCatGroup()` di sparepart-servis.js, `renderVehicleSpecCard()` di modules-render-b.js, `_tirePressureRef()` di fuel-maintenance-engine.js, `car-notes.js` Servis) — SEMUA dipanggil sync dari jalur render UI yang baru bisa jalan setelah `load()` selesai, dan `load()` SUDAH `await DatabaseAPI.vehicle.ensureLoaded()` sebelum lanjut. Mengubah titik-titik itu jadi `async` supaya bisa `await ensureLoaded()` langsung butuh refactor besar ke rantai render (di luar cakupan "1 gap kecil"), **ditolak**. Yang dikerjakan: `dbVehicleEnsureLoaded()` di-dedup lewat `_vehicleDbLoadPromise` (fungsi baru `_vehicleDbDoLoad()`) — kalau `ensureLoaded()` dipanggil dari >1 titik sebelum yang pertama selesai, cuma 1 round-trip IndexedDB yang jalan (sebelumnya bisa 2x baca+tulis). Getter sync (`_vehicleDbRecords()`) SENGAJA TIDAK diubah utk memicu load sendiri — kontrak test lama "IDBStore tidak disentuh sebelum ensureLoaded() dipanggil" tetap 100% berlaku, 0 regresi. Detail: `SESSION-NOTE-sesi-b-followup-ensureloaded-dedup.md`.
- **Masih tersisa**: (a) `VEHICLE_DB_RECORDS` literal belum dihapus (masih seed/fallback). **Temuan v1661**: menghapus literal ini TIDAK sesederhana "hapus 1 const" — `VEHICLE_DB_RECORDS` adalah satu-satunya sumber seed IndexedDB pertama kali (`_vehicleDbDoLoad()` menulis `VEHICLE_DB_RECORDS.slice()` ke storage kalau kosong). Menghapusnya butuh mekanisme BARU: `sparepart-servis-b.js` mendaftarkan `TORSI_DB`/`VEHICLE_SPEC_DB` ke `DatabaseAPI` saat filenya dimuat (jadi `TORSI_DB`/`VEHICLE_SPEC_DB` jadi satu-satunya sumber kebenaran, bukan disalin manual ke `VEHICLE_DB_RECORDS`) — ini scope sesi TERSENDIRI (butuh desain+review sendiri sebelum coding, bukan "gap kecil"), ditunda per keputusan eksplisit. **v1664: DESAIN selesai** (`DESAIN-SESI-B-GAP-A-VEHICLE-DB-REGISTRASI.md`) — API `DatabaseAPI.vehicle.registerSource(entries)`, dipanggil `sparepart-servis-b.js` top-level, `_vehicleDbRecords()` jadi 3-tier (IndexedDB > registered > literal), literal TIDAK dihapus dulu (rekomendasi additive, opsi B full-cutover jadi sesi terpisah lagi). **v1665: DIKODEKAN & HIJAU** — `DatabaseAPI.vehicle.registerSource()` diimplementasi persis desain, `sparepart-servis-b.js` mendaftarkan diri top-level, seed IndexedDB & `_vehicleModelRecords()` ikut disambung (§4a/§4b desain). 13 test baru, full suite 0 regresi (6 kegagalan tersisa 100% pre-existing). **Gap (a) TUNTAS** — Sesi B TUNTAS penuh, Fase 1 TUNTAS 5/5, larangan §6 lepas. `VEHICLE_DB_RECORDS` literal sengaja TIDAK dihapus (keputusan additive) — item Critical §3 terakhir ("hapus duplikasi") masih **belum dikerjakan**, ditunda ke sesi full-cutover terpisah, 0 urgensi (literal sudah mati di produksi).

**Sesi B-lanjutan — Wiring 3 literal generik tersisa** 🟢 selesai (v1651, di luar penomoran A-F asli tapi bagian Fase 1 poin 3)
- `GENERIC_GROUP_BY_NAME`/`GENERIC_RECOMMEND_NAMES`/`FALLBACK_KEYWORDS` → `DatabaseAPI.master` (namespace baru — **catatan**: ini BUKAN `service_categories` 13-kategori-terkunci yang dimaksud Sesi D di bawah, kebetulan nama namespace sama, jangan tertukar).

**Sesi C — Event Bus general (bukan cuma Servis)** 🟡 sebagian — audit selesai, Prioritas Tinggi TUNTAS, Prioritas Sedang 4/5 domain (Shop/Cobek TUNTAS, Dana Titipan TUNTAS)
- Perluas pola `finance.updated`/`vehicle.updated` (yang sudah ada di Servis sejak v1644) ke titik-titik lain yang masih menulis `D` langsung tanpa emit — audit dulu titik mana saja sebelum coding (daftar konsumen, bukan langsung ubah).
- **v1651 (audit)**: `AUDIT-SESI-C-EVENTBUS-D-WRITES-NO-EMIT.md` — peta 9 titik/domain, 0 kode diubah.
- **v1652 (C1)**: CRUD kendaraan (`vehicle.updated`) selesai diemit.
- **Sesi C-lanjutan (Prioritas Tinggi, TUNTAS 5/5)**: `delTx()` + 4 transaksi khusus, piutang-utang, tagihan-kalender sudah emit dari sesi-sesi sebelumnya; **Akun** (`account.updated` — 4 titik: create/edit/delete/edit-owners) menutup item Prioritas Tinggi terakhir.
- **Sesi C-lanjutan (Prioritas Sedang)**: Zakat/PBB (`finance.updated` kind `zakat` baru + kind `tagihan` source `pbb`, 3 titik diskrit dari 9 `save()` — 6 sisa sengaja dilewati krn dipanggil tiap render, bukan aksi diskrit); **Shop/Cobek TUNTAS 9/9** — CRUD inti produk&kategori (v1642, 4 titik: `product.updated` baru) + **v1662, 5 titik sisa**: harga produsen batch (`cobek-order.js`), price/stock reko apply (`cobek-pricing.js` — `PriceRekoWidget`/`StockRekoWidget`), weight-bulk (`cobek-pricing.js` — `WeightBulkWidget`), inline-produsen-di-cart (`cobek-tx-cart.js`), bulk import Excel (`cobek-io.js` — `ImportShopExcel`), semua kind baru (`harga-produsen`/`price-reko`/`stock-reko`/`weight-bulk`/`produsen`/`import-excel`), test baru `tests/cobek-shop-5-titik-sisa-sesi-c.test.js` (14/14 pass).
- **Sesi C-lanjutan (wiring listener, TUNTAS)**: `AIService.wireEvents()` disambungkan ke SEMUA event yang sudah emit — `account.updated`/`product.updated`/`investment.updated` (v1663-1665, lihat §2f/§2h) + `titipan.updated` (v1671-1672, di bawah). `finance.updated{kind:zakat}` tidak butuh entri baru (kind di dalam payload, listener `finance.updated` yang sudah ada otomatis meng-cover).
- **Dana Titipan (TUNTAS, v1671-1672)**: 10 titik `save()` di 4 file (`dana-titipan-pool-api.js` 2x, `dana-titipan-commitment-return-api.js` 4x, `titipan-reconcile.js` 3x, `titipan-expense-flow.js` 1x) semua emit `titipan.updated` (payload `{kind,action,...id}`, guard `typeof AIBus!=="undefined"`). 21 test baru (`tests/dana-titipan-aibus-titipan-updated-sesi-c.test.js`). Detail: `SESSION-NOTE-sesi-c-titipan-updated.md`, §2j.
- **Belum**: `investasi.js` dasar (event baru di luar `investment.updated` yang sudah ada), Aset non-core (`aset-misc.js`/`aset-emas-impor.js`/`aset-reports.js`) — 2 domain besar terakhir dari Prioritas Sedang yang masih 0%. Lihat §2j untuk detail terkini.

**Sesi D — `service_categories` master (13 kategori terkunci)** 🟡 sebagian (v1666 data+wiring, v1667 consumer #1 dari 2)
- **v1666**: `DatabaseAPI.masterCategory` (`getAll`/`getById`/`classifyItemName`) — 13 kategori terkunci, sumber breakdown servis Honda Vario 125 KZR 2012 (PGM-FI gen. 1) dari W (keputusan produk, dipakai apa adanya). `resolveCatGroup()` (sparepart-servis.js) expose field BARU `masterCategoryId`/`-Name`/`-Icon` ADDITIVE ke semua cabang return (0 field `group`/`icon` lama berubah, 0 regresi). **Beda dari rencana literal di atas**: migrasi dilakukan per-ITEM (`classifyItemName`, keyword-based, estimasi) bukan per-KELOMPOK 8 grup ad-hoc — audit isi grup ad-hoc menemukan beberapa CAMPUR lintas kategori terkunci (mis. `'Perawatan Berkala'` isinya oli mesin+busi [Servis Mesin] campur v-belt [Servis CVT] campur minyak rem [Sistem Pengereman] campur coolant [Sistem Pendingin] dlsb dalam 1 grup) — migrasi 1:1 per-grup akan memaksa 1 grup campuran ke 1 kategori, kehilangan presisi. 8 grup ad-hoc lama (`cats[].cat`) TIDAK dihapus/diganti, tetap dipakai persis seperti sebelumnya di semua titik baca lama. Item yang 0 cocok keyword balikin `null` (tidak ditebak — pola sama E2 `_findAutoGantiStock`), termasuk beberapa item generik & item exhaust/knalpot (13 kategori W tidak punya bucket eksplisit utk exhaust). 11 test baru (`tests/database-api-mastercategory-sesi-d.test.js`), full suite 6387/6383 pass/4 fail (4 kegagalan 100% pre-existing dari v1665, 0 regresi baru). Detail: `SESSION-NOTE-sesi-d-mastercategory-v1666.md`.
- **Sesi D-lanjutan1 (v1667, selesai)**: consumer read-only pertama dari 2 yang direncanakan (redo dari percobaan sebelumnya yg kehabisan limit sblm packaging, sekarang resmi dipecah 2 sesi). `Sparepart.dashReminderMasterCatBadgeHTML(cat,vehicleId)` (pure function baru, sparepart-servis.js) — reuse `resolveCatGroup()` apa adanya, balikin span kecil (icon+nama kategori master) kalau match, `''` kalau 0 match (tidak menebak). Disisipkan di span nama kategori kartu "🔧 Pengingat Servis" Beranda (`renderDashboardServisReminder()`, modules-render.js), guard `typeof Sparepart`, 0 titik render lama lain diubah. 9 test baru (`tests/servis-mastercategory-dashbadge-sesi-d-lanjutan1.test.js`), full suite 6396/6392 pass/4 fail (4 kegagalan sama persis pre-existing, 0 regresi baru). Detail: `SESSION-NOTE-sesi-d-lanjutan1-mastercategory-dashbadge-v1667.md`.
- **Sesi D-lanjutan2a (v1668, selesai)**: consumer read-only DOM pertama dari 2 sub-sesi direncanakan (redo dari percobaan sebelumnya yg kehabisan limit tools sblm packaging, sekarang resmi dipecah 2 sesi). `Sparepart.updateMasterCatBadge(name,vehicleId)` (DOM-touching baru, sparepart-servis.js) — reuse `resolveCatGroup()` apa adanya, tulis ke elemen baru `#sparepartMasterCatBadgeWrap` (modals.js, antara field Nama Part/Servis & Kode Kategori) kalau match, sembunyikan kalau 0 match/nama kosong (tidak menebak). Dipanggil 1x dari `openCatModal()`, 0 event listener baru. 7 test baru (`tests/servis-mastercategory-modalbadge-sesi-d-lanjutan2a.test.js`), full suite 6403/6399 pass/4 fail (4 kegagalan sama persis pre-existing v1667, 0 regresi baru). Detail: `SESSION-NOTE-sesi-d-lanjutan2a-mastercategory-modalbadge-v1668.md`.
- **Belum**: **Sesi D-lanjutan2b** — live-update badge saat mengetik nama item di modal Kategori Sparepart, butuh koordinasi dgn listener `oninput` lain yang sudah ada di `#sparepartName` (lebih kompleks dari 2a yang murni dipanggil 1x saat modal dibuka) — ditunda, sesi terpisah. Filter/chip by master category di daftar Servis/Sparepart utama — belum dikerjakan. Keputusan produk lanjutan soal item yg classify `null` (biarkan `null` ATAU tambah kategori ke-14 utk exhaust/knalpot, dll — kandidat sesi berikutnya, butuh jawaban W kalau mau digarap); evaluasi/tuning keyword classifier lebih lanjut kalau ditemukan salah klasifikasi di kendaraan lain (baru ada 2 entri TORSI_DB saat ini: Vario 125 & BeAT FI).

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
