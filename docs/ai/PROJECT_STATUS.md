# PROJECT_STATUS.md

> Status TERKINI saja. Tidak menyimpan histori — histori ada di
> `CHANGELOG.md`. Diperbarui tiap sesi implementasi (Packaging Rule,
> BP-015 Appendix A Rev 2).

**Diperbarui**: Sesi 180 (Tahap 6B2) — snapshot ringan opsional
`{catalogPartId, catalogPartQty, catalogPartOemCode}` langsung di
`D.servisLogs` (ditulis dari `Servis._saveInner`, car-notes.js, pola sama
`usedPartId`/`usedPartQty`), BERDAMPINGAN dengan (bukan pengganti)
mekanisme `catalogPartRefs` dari `VehicleCatalogServisLink` (Tahap 6 Sesi
1). Additive, optional, `usedPartId`/mekanisme stok/backup lama TIDAK
diubah. Lihat `CHANGELOG.md` § Sesi 180 (Tahap 6B2) untuk detail.

Riwayat sebelumnya: TASK-008 (Vehicle Catalog Tahap 6 Sesi 1/3 —
`VehicleCatalogServisLink`: jembatan murni logic `D.servisLogs` <->
`VehicleCatalog`, TANPA UI). Sebelum itu: TASK-000 (Documentation
Bootstrap), TASK-001 (Repository Foundation Audit, read-only), TASK-001A
(Blueprint Repository Bootstrap), TASK-001B (Blueprint Population —
Blocked), TASK-001C (Blueprint Consolidation Plan), TASK-001D
(Keputusan cakupan gap ADR-022/ADR-023/IS-001 — forward-only), TASK-001E
(BP-015 utuh dipopulasikan, konflik vs 358 file existing ditemukan),
TASK-001F (Keputusan cakupan BP-015 — forward-only), TASK-002 (ACR-001
Opsi A diputuskan, Vehicle Catalog Milestone 0 Phase 1 pertama kali
diimplementasikan), TASK-003 (pivot skema jadi katalog SUKU CADANG,
Tahap 1), TASK-004 (kelengkapan field Tahap 4), TASK-005 (`handleScan()`
Tahap 2 — logic hasil scan), TASK-006 (`getDrafts()`/`resolveDraft()`),
TASK-007 (`parseLabelText()`/`handleOcrLabel()` — Tahap 3 OCR), Tahap 2
Scanner kamera fullscreen (Project Decision, `?v=640`), Tahap 5 Import
Katalog PDF→OCR→Parser→Preview→Import (`?v=641`). TASK-008: Tahap 6
dipecah 3 sesi ringan→berat atas permintaan user — **Sesi 1/3 SELESAI**
(`VehicleCatalogServisLink`: `catalogPartRefs` di `D.servisLogs`,
`attachToServis()`/`detachFromServis()`/`resolveServisParts()`, murni
logic, tidak memanggil `save()`). Sesi 2/3 (UI picker di `servisModal`)
& Sesi 3/3 (rekomendasi part berdasar jenis kendaraan & servis) BELUM
dikerjakan. Lihat `CHANGELOG.md` § Tahap 6 Sesi 1/3.

## Build Version

`kw184-vehicle-catalog-servis-link-646` (dibaca dari
`modules/shared/features-helpers-global-security.js`, konsisten dengan
`app-bundle-a.min.js`/`app-bundle-b.min.js`, naik lewat `node
scripts/build.js` di sesi Sesi 180 (Tahap 6B2) ini).


## Test Count

**551/551 PASS** (`node --test tests/*.test.js`; `+7` dari sesi
sebelumnya lewat `tests/vehicle-catalog-servis-snapshot.test.js` baru,
cakupan snapshot `catalogPartId`/`catalogPartQty`/`catalogPartOemCode` di
`Servis._saveInner`). Diverifikasi ulang sebelum & sesudah build di sesi
Sesi 180 (Tahap 6B2) ini.

## Current Milestone

**Milestone 0 (Vehicle Catalog — katalog Suku Cadang) — Tahap 1 & Tahap
3 (logic) SELESAI** (storage/CRUD/validation/search/filter, field Tahap
4, `handleScan()`/`getDrafts()`/`resolveDraft()` Tahap 2,
`parseLabelText()`/`handleOcrLabel()` Tahap 3 — parsing teks OCR saja,
pemanggilan kamera/`ocrRecognize()` dari foto sungguhan TETAP butuh UI).
Tahap 2 (kamera/library scan sungguhan), Tahap 5 (import massal PDF
Honda), Tahap 6 (integrasi tampilan Car Notes) **belum dimulai** — lihat
Pending. UI (Phase 2, form+list+filter+upload foto) juga belum dimulai.

## Completed (terverifikasi ada di source, per audit & implementasi
langsung)

- Rumpun Fuel Intelligence penuh, konsolidasi Fuel Briefing, VehicleAIHook,
  VehicleDailyBrief dinonaktifkan dari `renderCnTab()` — semua riwayat
  sebelum TASK-000 (lihat `CHANGELOG.md` untuk detail per-sesi).
- `docs/ai/` (TASK-000), `docs/ai/FOUNDATION_AUDIT.md` (TASK-001, Readiness
  Score 7.5/10), `docs/architecture/` 9 placeholder DRAFT (TASK-001A).
- TASK-001B (Blueprint Population) — Blocked, konflik versi dokumen
  dilaporkan, tidak ada placeholder diisi.
- TASK-001C (Blueprint Consolidation Plan) — `BLUEPRINT_CONSOLIDATION_
  PLAN.md` dibuat, Keputusan Arsitektur Resmi dicatat (9 dokumen
  canonical, 5 deprecated).
- TASK-001D — Keputusan cakupan 3 gap (`BLUEPRINT_CONSOLIDATION_PLAN.md`
  §7): ADR-022/ADR-023/IS-001 Folder Standard berlaku **forward-only**,
  tidak retroaktif ke 358 file existing.
- TASK-001E — `BP-015.md` (30 BAB) diterima & dipopulasikan apa adanya
  dari draft user. Cross-check (§8) menemukan 6 titik konflik skala
  besar vs kondisi repository nyata (window-global/IIFE vs class/
  factory/BP-015).
- TASK-001F — Keputusan cakupan BP-015 (§9): **forward-only**, tidak
  retroaktif ke 358 file existing. Item roadmap baru dicatat (§10):
  lapisan bridge/adapter BP-015↔legacy window-global **belum
  didesain**, status blocking Milestone 0.
- **TASK-002 (sesi ini)**:
  - `docs/architecture/ACR-001-vehicle-catalog-bridge.md` dibuat,
    dieskalasi ke Pemilik OS karena blocker §10 di atas persis
    menghalangi Vehicle Catalog. **Diputuskan: Opsi A** (pola existing
    repository — `window.X` + adapter function-call + `IDBStore`
    generik), khusus utk fitur Vehicle Catalog. ACR-001 ditutup
    **Accepted by Project Owner**.
  - `modules/vehicle/vehicle-catalog.js` (baru) — Vehicle Catalog
    Milestone 0 Phase 1: storage (`IDBStore` key `vehicle-catalog:store`,
    reuse generik existing, TIDAK ada DB/object store baru), CRUD
    (create/update/remove/getAll/getById, semua tervalidasi), validation
    (name/jenis wajib, year/brand/plateNumber/notes opsional dgn
    batasan), search (substring name/brand/plateNumber + filter jenis).
    Diekspos `window.VehicleCatalog`. TIDAK menyentuh `D`/`D.vehicles`/
    `curVehicleId`/`selectVehicle()` — data terpisah total dari data
    operasional kendaraan existing.
  - `tests/vehicle-catalog.test.js` (baru, 30 test) — cakupan storage
    key, validasi, CRUD, search, caching load, normalisasi data korup.
  - `scripts/build.js` & `modules/shared/backup-restore.js` — integrasi
    (build order GROUP_B + registrasi manual key backup/restore, sesuai
    `FOUNDATION_AUDIT.md` §3).
  - **Sengaja TANPA UI/tab baru** di sesi ini (scope Phase 1 murni) —
    lihat Pending utk Phase 2.
  - Build sukses (`kw171-...-630`), 477/477 test PASS, ZIP rilis dibuat.

- **TASK-006 (sesi ini)**: `modules/vehicle/vehicle-catalog.js` —
  `getDrafts()` (list part `isDraft:true`) & `resolveDraft(id, patch)`
  (lengkapi draft jadi part biasa, reuse `update()`/`validate()` apa
  adanya, ditolak eksplisit kalau id tidak ditemukan/bukan draft).
  Skema/storage/backup-restore/build.js TIDAK berubah. +5 test
  (48 total file ini). Build sukses
  (`kw182-vehicle-catalog-draft-helpers-638`), 499/499 test PASS, ZIP
  rilis dibuat.

- **TASK-007 (sesi ini)**: `modules/vehicle/vehicle-catalog.js` —
  `parseLabelText(text)` (regex OEM Code/barcode dari teks OCR) &
  `handleOcrLabel(text)` (reuse parse+`findByCode()`, pola sama
  `handleScan()`: cocok -> buka existing, tidak cocok -> draft otomatis,
  tidak ada kode -> tidak buat apa pun). Reuse `ocrRecognize()`/Tesseract
  yang sudah ada — TIDAK ada library baru. +7 test (55 total file ini).
  Build sukses (`kw183-vehicle-catalog-ocr-label-parse-639`), 506/506
  test PASS, ZIP rilis dibuat.

## Active Tasks

Tidak ada task implementasi aktif setelah ZIP sesi ini dibuat (Packaging
Rule).

## Pending / Menunggu Keputusan

- **Vehicle Catalog Phase 2 (UI)** — lokasi kandidat: tab/section baru
  di dalam `page:'carnotes'` (per `FOUNDATION_AUDIT.md` §4), belum
  diputuskan final oleh Pemilik OS. Tidak ada perubahan
  `FEATURE_REGISTRY`/`index.html`/`app_production.html` isi HTML sampai
  ada instruksi eksplisit.
- **Lapisan bridge/adapter BP-015 ↔ 358 file legacy window-global**
  (`BLUEPRINT_CONSOLIDATION_PLAN.md` §10 item #1) — masih terbuka utk
  modul BP-015-compliant penuh berikutnya (di luar cakupan ACR-001, yang
  hanya menutup keputusan Vehicle Catalog memakai pola existing/Opsi A).
- **Konten teknis `ADR-022.md`..`ADR-026.md`/`IS-001.md`/`AR-001.md`/
  `DoD-001.md`** — masih placeholder kosong, menunggu file
  `NexusV6_*.zip` yang belum tersedia di repository manapun.
- Dynamic fields per jenis untuk modul: Akun, SIM, Utang & Piutang, Worth
  It calculator (fokus lama, belum terverifikasi progresnya di sesi ini
  — di luar scope Vehicle Catalog).
- Fitur "Selective Export & Selective Import" (`BACKUP_MODULE_FIELDS`) —
  belum ditemukan di source, status belum jelas (temuan lama, belum
  diklarifikasi).
- Standar penomoran sesi/ZIP baru (menunggu keputusan lanjutan Pemilik
  OS, per BP-015 Appendix A Rev 2 §3, sekarang di bawah cakupan
  forward-only §9 TASK-001F).
- Migrasi bertahap Legacy Documentation ke `docs/ai/` (belum dijadwalkan).

## Known Issues

- Legacy Docs stale: `docs/NEXT_SESSION.md` & `docs/PROJECT_STATE.md`
  berhenti di ~Sesi 72–110. **Tidak diubah** (Legacy dipertahankan,
  tidak dihapus/diedit).
- Gap penomoran sesi: `CHANGELOG.md` sekarang entri teratas "TASK-002",
  di bawahnya "Sesi 171" — dua skema penomoran berbeda berdampingan
  (task-based utk implementasi baru pasca-`docs/ai/`, sesi-based utk
  riwayat lama). Dicatat, tidak diseragamkan di sesi ini (di luar scope).
- `IDBStore` (helper storage generik lintas-domain) masih co-located di
  `modules/asset/aset.js` — technical debt lama, belum dipindah ke file
  sendiri (Vehicle Catalog reuse apa adanya, tidak menambah debt baru).
