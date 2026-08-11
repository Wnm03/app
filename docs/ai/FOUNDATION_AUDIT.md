# FOUNDATION_AUDIT.md

> TASK-001 — Repository Foundation Audit. Fase ANALISIS, READ-ONLY.
> Tidak ada source/build/test yang diubah. Baseline yang diaudit:
> `kw_release_sesi173b_ai-docs-bootstrap_v629.zip`.
> Tujuan: validasi Blueprint vs kondisi repository sebelum Milestone 0
> (Vehicle Catalog) dimulai. **Vehicle Catalog BELUM diimplementasikan
> di sesi ini.**

---

## 1. Repository Health

- Struktur: `modules/<domain>/*.js` (11 domain: shared, ai, self-reward,
  asset, business, finance, logistics, dashboard-hub, home, cross, shop,
  vehicle) + subsistem terisolasi `economic-intelligence/` (EIE) dan
  `lifeos/` + file root (`ai-chat.js`, `car-notes.js`, `budget.js`, dll).
  358 file total di dalam ZIP baseline.
- Verifikasi baseline dijalankan read-only: `node --test tests/*.test.js`
  → **447/447 PASS**, 0 fail, 36 file test — cocok dengan klaim
  `PROJECT_STATUS.md`. Tidak ada source/test yang disentuh untuk
  menjalankan ini.
- Build version aktif: `kw171-vehicle-daily-brief-redundansi-629`,
  konsisten antara `modules/shared/features-helpers-global-security.js`
  dan bundle `app-bundle-b.min.js`.
- **Status: SEHAT.**

## 2. Build Health (GROUP_A / GROUP_B)

- `scripts/build.js` mendefinisikan `GROUP_A` (25 entri) + `GROUP_B`
  (~330+ entri) → digabung `ALL_SOURCE`, bukan auto-discover — urutan
  eksplisit dan disertai komentar dependency di tiap titik yang bukan
  urutan alfabetis/folder biasa (pola forward-reference didokumentasikan
  di tempat kejadian, mis. `investment-planner-api.js` yang
  forward-reference `Investment`).
- **Domain `modules/vehicle/` diverifikasi 100% sinkron**: 46 file fisik
  di `modules/vehicle/*.js`, 46 referensi di `scripts/build.js` — tidak
  ada file vehicle yang tertinggal dari build order maupun referensi
  hantu ke file yang tidak ada.
- Export global: pola konsisten — file domain expose lewat
  `window.<Nama>` di akhir file (sama seperti `AIBus`/`AIContext` di
  `ai-core.js`), bukan `module.exports`. Registration pattern seragam di
  seluruh domain yang diperiksa (vehicle, ai, lifeos, EIE).
- Build punya lint guard bawaan (u-dnone vs style.display, escapeHtml
  hilang, OCR chicken-egg regression) — tidak dijalankan di sesi ini
  (scope read-only), hanya diverifikasi keberadaannya di source.
- **Risiko**: tidak ditemukan risiko baru pada build order untuk domain
  vehicle. Risiko pra-eksisting (lihat §8) bersifat dokumentasi, bukan
  build-breaking.
- **Status: SEHAT.**

## 3. Storage Health

- Satu database generik: `IDBStore` (`DB_NAME:'kw_idb_v1'`,
  `STORE:'kv'`), co-located di `modules/asset/aset.js` (technical debt
  yang sudah dicatat di komentar file itu sendiri — bukan temuan baru).
- Pola pemakaian konsisten: **satu object store key-value**, tiap
  subsistem punya **satu key top-level** sendiri, bukan object store
  terpisah per subsistem:
  - `D` → mirror `kw_v4_mirror`
  - LifeOS → `lifeos:store`
  - EIE → `eie:store`
  - AI Core (Smart Delivery Engine) → `ai:store`
- **Rekomendasi lokasi `Nexus_VCP_DB`**: JANGAN membuat IndexedDB
  database baru maupun object store baru. Ikuti pola yang sudah
  terbukti (LifeOS/EIE/AI) — satu key baru di object store `kv` yang
  sudah ada, mis. `vehicle-catalog:store`, diakses lewat modul tipis
  baru (pola sama `aiLoad()`/`aiSave()`/`aiGetStore()` di `ai-core.js`)
  agar tidak menambah kompleksitas koneksi DB dan tetap konsisten
  dengan siklus restore (`backup-restore.js` sudah py pola restore
  per-key untuk `lifeos:store`/`eie:store` — key baru wajib didaftarkan
  di sana saat implementasi nanti, TIDAK dilakukan di sesi ini).
- Backup/Restore: `modules/shared/backup-restore.js` membaca/menulis
  key IndexedDB secara eksplisit per subsistem (bukan iterasi otomatis
  semua key) — konsekuensinya, key baru manapun (termasuk
  `vehicle-catalog:store` nanti) **wajib** ditambahkan manual ke jalur
  backup/restore atau datanya tidak akan ikut ter-backup/restore.
  Dicatat sebagai catatan implementasi Milestone 0, bukan bug saat ini.
- **Status: SEHAT**, dengan satu catatan wajib-tindak-lanjut di atas.

## 4. Navigation Health

- Sumber taksonomi tunggal: `modules/dashboard-hub/dashboard-hub-registry.js`
  (`FEATURE_REGISTRY`) — murni data, tidak ada logic render. Setiap
  `target` di registry harus merujuk ke navigasi yang **sudah ada &
  terverifikasi** di codebase (showPage/goToList/setXxxTab/data-action),
  bukan tebakan — aturan ini didokumentasikan eksplisit di file itu
  sendiri.
- Data kendaraan dasar saat ini hidup sebagai `D.vehicles` (array
  `{id, name, emoji, serviceIntervalKm}`), dikelola CRUD-nya oleh
  `vehicle-core.js` (`saveVehicle`/`editVehicle`/`delVehicle`,
  `selectVehicle`/`curVehicleId`), dan dirender di halaman
  `page:'carnotes'` (4 tab: `insight|bbm|servis|pajak`, per
  `setCnTab()`).
- **Rekomendasi lokasi Vehicle Catalog**: tab/section baru di dalam
  `page:'carnotes'` (mengikuti pola tab bersarang yang sudah ada,
  mis. `setCnInsightTab`/`setCnBbmTab`) adalah lokasi paling konsisten
  — domain sudah benar, konvensi tab-di-dalam-tab sudah established,
  dan `curVehicleId`/`selectVehicle()` sudah jadi context selector yang
  bisa direuse. Alternatif "halaman top-level baru" mungkin, tapi
  menambah 1 entry top-level di `FEATURE_REGISTRY` + wiring
  `showPage()` baru — lebih besar dari yang dibutuhkan status
  "Milestone 0". Keputusan akhir tetap perlu persetujuan Blueprint,
  bukan diputuskan di audit ini.
- **Status: SEHAT**, lokasi kandidat teridentifikasi, keputusan final
  menunggu Blueprint/Milestone 0.

## 5. Event Architecture Health

- **Tidak ada EventBus generik lintas-aplikasi.** Yang ada adalah 3 bus
  pub/sub yang masing-masing **terisolasi per subsistem**: `AIBus`
  (`ai-core.js`), pola serupa di EIE, dan navigasi LifeOS
  (`lifeos-nav.js`). Tidak saling terhubung satu sama lain.
- Komunikasi lintas-domain utama dilakukan lewat **pemanggilan fungsi
  langsung** (function-call) via adapter tipis — pola paling konsisten
  di seluruh repo: `lifeos/adapters/*.js`, `economic-intelligence/adapters/*.js`,
  dan `_aiContextVehicle()`/`_aiContextFinance()`/dst di `ai-core.js`
  yang membaca `D`/fungsi domain lain secara read-only, dibungkus guard
  `typeof fn === 'function'` agar aman kalau modul dependency belum
  dimuat.
- **Rekomendasi komunikasi untuk Vehicle Catalog**: ikuti pola adapter
  function-call yang sudah terbukti (bukan membuat EventBus baru).
  Kalau perlu notifikasi reaktif (mis. AI Core perlu tahu saat katalog
  berubah), reuse `AIBus.emit()`/`AIBus.on()` yang sudah ada di
  `ai-core.js` — jangan buat bus baru terpisah.
- **Status: SEHAT**, pola jelas dan konsisten.

## 6. Vehicle Architecture Health

- 46 file di `modules/vehicle/`, 4 sub-rumpun besar:
  1. **vehicle-core** (`vehicle-core.js`) — CRUD kendaraan dasar
     (`D.vehicles`), tab management (`setCnTab` dkk), selector kendaraan
     aktif (`curVehicleId`).
  2. **fuel** — rantai penuh: storage → tank profile → engine
     (gauge/prediction/cost/maintenance) → insight engine → UI
     (card/dashboard/compare/trend).
  3. **maintenance** — `sparepart-servis.js`,
     `vehicle-maintenance-automation.js`, `vehicle-service-trend.js`.
  4. **recommendation** — `vehicle-decision-api.js`,
     `vehicle-recommendation-engine.js`, `vehicle-priority-scoring.js`,
     `vehicle-action-recommendation.js`, `vehicle-decision-presenter.js`.
- **Area yang HARUS diproteksi** (tidak boleh diubah semantiknya oleh
  Vehicle Catalog nanti):
  - Struktur `D.vehicles` (field `id`/`name`/`emoji`/`serviceIntervalKm`)
    — sudah dikonsumsi oleh banyak modul hilir (fuel engine, AI context
    `_aiContextVehicle()`, decision engine). Menambah field boleh
    (additive), mengubah/menghapus field existing berisiko regresi luas.
  - `curVehicleId`/`selectVehicle()` sebagai satu-satunya mekanisme
    "kendaraan aktif" — jangan buat mekanisme selector kedua yang
    paralel.
  - `IDBStore` generic helper (co-located di `aset.js`) — jangan
    duplikasi implementasi IndexedDB baru untuk Vehicle Catalog.
  - Urutan build `modules/vehicle/*.js` di `scripts/build.js` — sudah
    padat dengan komentar dependency; entri baru wajib ditaruh dengan
    analisis dependency yang sama telitinya (lihat pola yang sudah ada).
- **Status: SEHAT**, arsitektur vehicle existing solid dan well-documented,
  siap jadi fondasi Vehicle Catalog tanpa perlu refactor.

## 7. Documentation Health

- `docs/ai/` (CLAUDE_CONTEXT.md, PROJECT_STATUS.md, AI_HANDOFF.md) dan
  Legacy Documentation (`docs/*.md`, 15+ file) **tidak konflik** —
  hierarki source-of-truth sudah eksplisit di `CLAUDE_CONTEXT.md`:
  Source Code > `docs/ai/` > Legacy. Legacy dipertahankan sebagai arsip,
  tidak diubah di sesi ini (sesuai scope read-only).
- Dikonfirmasi ulang: `docs/NEXT_SESSION.md` & `docs/PROJECT_STATE.md`
  stale (berhenti ~Sesi 72–110), sudah tercatat di Known Issues
  `PROJECT_STATUS.md` — tidak ada tindakan tambahan di sesi ini.
- **Temuan baru**: `TODO.md` (root) mencatat angka test historis jauh
  lebih tinggi dari kondisi ZIP ini (mis. entri Sesi 52/53 menyebut
  "2390/2390 test pass"), sementara baseline saat ini terverifikasi
  447/447. Ini konsisten dengan sifat `TODO.md` sebagai log historis
  per-sesi (bukan snapshot status terkini) — tidak dianggap konflik,
  tapi dicatat sebagai potensi sumber kebingungan kalau dibaca sepintas
  tanpa konteks tanggal entrinya.
- **Status: SEHAT**, tidak ada konflik dokumentasi yang menghambat
  Milestone 0.

## 8. Blueprint Validation (BP-015 / Appendix A / AI Rules)

- **Temuan penting**: tidak ditemukan file Blueprint fisik apa pun di
  repository (dicari dengan pola nama `*blueprint*`, `*BP-*` di seluruh
  ZIP — nihil). Referensi "BP-015 Appendix A Rev 2" hanya muncul sebagai
  sitasi di dalam `docs/ai/CLAUDE_CONTEXT.md`, `PROJECT_STATUS.md`, dan
  `AI_HANDOFF.md` sendiri — bukan dokumen Blueprint yang bisa
  diverifikasi isinya langsung dari repository ini.
- Dokumen perencanaan yang **memang ada** dan bisa diverifikasi:
  `RENCANA-SESI-RINGKAS.md` (rencana 6-sesi Smart Delivery Engine) dan
  `TODO.md` (log prioritas per-sesi). Keduanya konsisten dengan kondisi
  source code yang diaudit (mis. `ai-core.js`/`ai-decision-engine.js`/
  `ai-service.js`/`logistics-engine.js`/`logistics-service.js` semua
  ada dan wired di build, sesuai yang dijelaskan `RENCANA-SESI-RINGKAS.md`).
- **Konsekuensi untuk Milestone 0**: aturan konkret BP-015 §Appendix A
  soal Vehicle Catalog (skema field, batas scope, DoD) **tidak bisa
  divalidasi terhadap repository** karena dokumennya sendiri tidak ada
  di sini — hanya rujukan/nama-nya yang ada. Ini bukan berarti
  Blueprint tidak sinkron dengan repo (belum bisa dibandingkan sama
  sekali), melainkan gap ketersediaan dokumen.
- **Rekomendasi**: sebelum Milestone 0 mulai, Master Specification
  lengkap (BP-015 utuh + ADR-022–026 + IS-001 + AR-001 + DoD-001, sesuai
  catatan "Langkah berikutnya" di `AI_HANDOFF.md`) perlu disediakan ke
  repository/sesi berikutnya — bukan hanya dirujuk namanya.
- **Status: TIDAK BISA DIVALIDASI PENUH** — bukan "gagal sinkron",
  tapi dokumen sumbernya belum tersedia untuk diperiksa.

---

## Risk Assessment

| Area | Risiko | Level |
|---|---|---|
| Build order (vehicle) | Tidak ada — 46/46 file sinkron | Rendah |
| Storage (Nexus_VCP_DB) | Key baru wajib didaftarkan manual di backup/restore, mudah terlewat | Sedang |
| Navigation | Keputusan lokasi final belum diputuskan Blueprint | Rendah |
| Event/komunikasi | Tidak ada, pola sudah jelas | Rendah |
| Vehicle core fields | Field `D.vehicles` dikonsumsi banyak modul hilir — breaking change field existing berisiko regresi luas | Sedang (kalau non-additive) |
| Dokumentasi | `TODO.md` bisa membingungkan tanpa konteks tanggal | Rendah |
| **Blueprint BP-015** | **Dokumen sumber tidak ada di repository — validasi Milestone 0 tertunda sampai dokumen tersedia** | **Tinggi (blocking Milestone 0, bukan blocking audit ini)** |

**Tidak ditemukan Circular Dependency baru** pada domain yang diaudit
(vehicle, storage, navigation, event). Seluruh forward-reference yang
ada sudah didokumentasikan dan bersifat lazy-call (runtime), bukan
circular di parse-time.

## Technical Debt (dikonfirmasi ulang, bukan temuan baru)

- `IDBStore` co-located di `modules/asset/aset.js`, seharusnya file
  storage generik tersendiri.
- Legacy Docs stale (`NEXT_SESSION.md`, `PROJECT_STATE.md`).
- Gap penomoran sesi (`CHANGELOG.md` top "Sesi 171" vs nama ZIP
  "sesi173b").

## Recommendation

1. Vehicle Catalog **jangan** membuat IndexedDB/object store baru —
   reuse `IDBStore`/`kw_idb_v1`/store `kv`, satu key baru
   (`vehicle-catalog:store`), plus wajib didaftarkan ke jalur
   backup/restore saat implementasi.
2. Lokasi navigasi kandidat: tab/section baru di dalam `page:'carnotes'`
   — tunggu konfirmasi Blueprint sebelum menulis entri
   `FEATURE_REGISTRY`.
3. Komunikasi lintas-modul: pola adapter function-call (ikuti
   `_aiContext*()`/`lifeos/adapters/*`), reuse `AIBus` kalau perlu
   event reaktif — jangan bikin bus baru.
4. Proteksi ketat terhadap struktur `D.vehicles` existing dan
   `curVehicleId`/`selectVehicle()` — perluasan harus additive.
5. **Sebelum Milestone 0 dimulai**: sediakan dokumen Blueprint BP-015
   lengkap (bukan hanya rujukan) ke repository/sesi berikutnya, supaya
   validasi §7 (Blueprint Validation) bisa benar-benar dilakukan, bukan
   ditunda.

## Readiness Score

**7.5 / 10** — Repository sendiri (build, storage, navigation, event,
vehicle architecture) **READY** secara teknis untuk Milestone 0. Skor
tidak penuh semata-mata karena Blueprint BP-015 belum tersedia secara
fisik untuk divalidasi (§8) — bukan karena masalah di repository.

---
*Dibuat oleh TASK-001 (Repository Foundation Audit), fase ANALISIS,
read-only. Tidak ada source/build/test yang diubah pada sesi ini.*
