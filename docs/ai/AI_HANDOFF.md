# AI_HANDOFF.md

> Hanya perubahan SEJAK SESI SEBELUMNYA. Bukan riwayat penuh proyek
> (riwayat penuh ada di `CHANGELOG.md`). Diperbarui tiap sesi
> implementasi.

## Sesi Ini: Sesi 180 (Tahap 6B2) — snapshot catalogPartId/catalogPartQty/catalogPartOemCode di D.servisLogs

**Konteks**: Target sempit dari `kw_release_sesi179_tahap6B1.zip`: simpan
referensi katalog ke `D.servisLogs` sebagai 3 field opsional
`catalogPartId`, `catalogPartQty`, `catalogPartOemCode`. TIDAK
audit ulang repo, TIDAK bikin blueprint/ACR, TIDAK ubah BP-015/ADR/
Governance/business logic existing (`usedPartId`, mekanisme stok, backup
lama). Ini TERPISAH & ADDITIF dari mekanisme `catalogPartRefs` (array,
Tahap 6 Sesi 1, `VehicleCatalogServisLink` — tidak disentuh sesi ini):
keduanya sekarang ditulis berdampingan dari alur simpan yang sama.

**Ringkasan pekerjaan**: `car-notes.js` (`Servis._saveInner`) sekarang juga
menulis 3 field flat opsional ke tiap entri `D.servisLogs` (pola sama
persis `usedPartId`/`usedPartQty` yang sudah ada) — `catalogPartId` (dari
elemen `servisCatalogPartId`, sudah ada sejak Sesi 2/3-nya Tahap 6),
`catalogPartQty` (dari `servisCatalogPartQty`), dan `catalogPartOemCode`
(BARU — dibaca sinkron dari atribut `data-oem` opsi terpilih di dropdown,
diisi `Servis.populateCatalogPartSelect()` yang juga ditambah 1 atribut
`data-oem` per opsi). Tidak ada panggilan `VehicleCatalog` tambahan (tidak
ada risiko IDB/async baru) — OEM code snapshot murni dari DOM yang sudah
dimuat. Kalau tidak ada part katalog dipilih: `catalogPartId:null`,
`catalogPartQty:0`, `catalogPartOemCode:''` (optional, konsisten pola
`usedPartId`). `VehicleCatalogServisLink.attachToServis()` (mekanisme
`catalogPartRefs`) tetap dipanggil apa adanya, tidak diubah/dihapus.
`usedPartId`/`usedPartQty`/`applyStockUsage()`/`revertStockUsage()`
(mekanisme stok `D.partsStock`) tidak disentuh sama sekali.

**File diubah/ditambah**:
- `car-notes.js` (diubah: `Servis._saveInner` +3 field snapshot,
  `Servis.populateCatalogPartSelect` +atribut `data-oem` per opsi)
- `tests/vehicle-catalog-servis-snapshot.test.js` (baru, 7 test — load
  `car-notes.js` asli via `loadSource()` + mock DOM/dependency ringan,
  pola sama `tests/tx-bbm-finance-integration.test.js`)
- `CHANGELOG.md`, `docs/ai/AI_HANDOFF.md`, `docs/ai/PROJECT_STATUS.md`
- Hasil `node scripts/build.js` (otomatis): bundle, `index.html`,
  `app_production.html`, `sw.js`, `docs/FILE-MAP.md` — versi
  `kw184-vehicle-catalog-servis-link-646`.

**File dihapus**: tidak ada. Tidak ada file backup lama yang diubah/
dihapus (backup baru otomatis dari `node scripts/build.js` ditambahkan
apa adanya ke `backups/`, sesuai mekanisme build yang sudah ada).

**Build**: `node scripts/build.js` — SUKSES, lolos semua lint guard,
sintaks kedua bundle valid, `index.html`/`app_production.html` identik &
`?v=646` sinkron.

**Test**: **551/551 PASS** (2x — sebelum & sesudah build, naik dari 544;
+7 test baru, 0 test lama berubah/dihapus).

**Cakupan sesi ini**: HANYA target di atas. Tidak mengerjakan fitur lain
(tidak ada perubahan `VehicleCatalogServisLink`, `VehicleCatalog`, UI
picker/tampilan tambahan, rekomendasi part, dst di luar 3 field yang
diminta).

Task ini berhenti setelah ZIP dibuat, sesuai Packaging Rule.

---

## Sesi Sebelumnya: TASK-008 — Vehicle Catalog Tahap 6 (Sesi 1/3): jembatan D.servisLogs <-> VehicleCatalog

**Konteks**: User: "kerjakan tahap 6 menjadi 3 sesi per sesi harus membuat
zip kerjakan yg ringan dulu". Tahap 6 ("integrasi Vehicle Catalog ke Car
Notes riwayat servis" — lihat catatan Tahap 6 di `CHANGELOG.md` §
`kw183-vehicle-catalog-ocr-label-parse-641`) dipecah jadi 3 sesi ringan→
berat: **Sesi 1 (ini)** — simpan referensi part/jumlah/kode OEM ke catatan
servis (murni logic, TANPA UI); **Sesi 2** — UI picker "Pilih dari Katalog"
di `servisModal` (butuh keputusan desain UI); **Sesi 3** — rekomendasi part
berdasar jenis kendaraan & jenis servis (engine baru, paling berat).

**Ringkasan pekerjaan**: File baru `modules/vehicle/vehicle-catalog-servis-link.js`
— jembatan murni logic `D.servisLogs` (field baru opsional additive
`catalogPartRefs: {catalogId, qty}[]`) <-> `VehicleCatalog` (dibaca via
`getById()` saja, guard typeof, tidak pernah ditulis dari sini). 5 fungsi:
`normalizeRefs()`, `getServisRefs()`, `attachToServis()`,
`detachFromServis()`, `resolveServisParts()` (async, live-resolve ke data
part lengkap; part yg sudah dihapus dari katalog -> `item:null`, jujur
dilaporkan, ref TIDAK dibuang otomatis). Modul ini SENGAJA tidak memanggil
`save()` global — caller (Sesi 2, `Servis.save()` di car-notes.js) yang
akan menyimpan, supaya 1 titik `save()` per alur. `car-notes.js`/
`sparepart-servis.js`/UI TIDAK diubah sesi ini — modul baru ini belum
dipanggil dari mana pun (dipakai mulai Sesi 2). Lihat `CHANGELOG.md` §
Tahap 6 Sesi 1/3 untuk detail lengkap termasuk catatan teknis harness test.

**File diubah/ditambah**:
- `modules/vehicle/vehicle-catalog-servis-link.js` (baru)
- `tests/vehicle-catalog-servis-link.test.js` (baru, 18 test)
- `scripts/build.js` (registrasi GROUP_B)
- `CHANGELOG.md`, `docs/ai/AI_HANDOFF.md`, `docs/ai/PROJECT_STATUS.md`
- Hasil `node scripts/build.js` (otomatis): bundle, `index.html`,
  `app_production.html`, `sw.js`, `docs/FILE-MAP.md` — versi
  `kw184-vehicle-catalog-servis-link-642`.

**File dihapus**: tidak ada.

**Build**: `node scripts/build.js kw184-vehicle-catalog-servis-link-642`
— SUKSES, lolos semua lint guard, sintaks kedua bundle valid,
`index.html`/`app_production.html` identik & `?v=642` sinkron.

**Test**: **539/539 PASS** (2x — sebelum & sesudah build, naik dari 521).

**Cakupan sesi ini vs Tahap 6 (3 sesi)**: Sesi 1/3 (ini) SELESAI. Sesi 2/3
(UI picker "Pilih dari Katalog" di `servisModal` + tampilan part terlampir
di daftar/detail servis) & Sesi 3/3 (rekomendasi part berdasar jenis
kendaraan & jenis servis) **BELUM dikerjakan** — menunggu giliran sesi
berikutnya sesuai permintaan user (ringan dulu, lalu makin berat).

**Langkah berikutnya** (Sesi 2/3, sesuai urutan yang diminta user):
1. Tambah tombol "🔧 Pilih dari Katalog" di `servisModal` (car-notes.js),
   buka picker (list `VehicleCatalog.search()` difilter
   `compatibleVehicleIds` = kendaraan aktif) — reuse pola modal existing
   (`vehCatalogImportModal` dkk).
2. Simpan pilihan lewat `VehicleCatalogServisLink.attachToServis()` (SUDAH
   ADA dari Sesi 1) di dalam `Servis.save()`, satu `save()` global seperti
   biasa.
3. Tampilkan part terlampir (nama/OEM/qty, via `resolveServisParts()`) di
   list riwayat servis & modal edit.
4. Sesi 3 (setelah Sesi 2 selesai): engine rekomendasi part berdasar
   `jenisKendaraan` (Sesi 165) & jenis servis (`item`/`categoryId`).

Task ini berhenti setelah ZIP dibuat, sesuai Packaging Rule.

---

## Sesi Sebelumnya: TASK-007 — Vehicle Catalog: Tahap 3 OCR label kemasan (logic saja, ringkas)

**Konteks**: User: "kerjakan salah satu dengan ringkas" (lanjutan dari
sisa roadmap Tahap 2/3/5/6 yang sebelumnya ditandai butuh keputusan
UI/library). Ditemukan Tahap 3 (OCR label kemasan) bisa dikerjakan lebih
ringan dari perkiraan — engine OCR (Tesseract via `ocrRecognize()`)
SUDAH ADA & dipakai fitur lain (`modules/shared/scan-ocr.js`), jadi
TIDAK perlu keputusan library baru seperti Tahap 2 (scanner kamera
barcode/QR yang belum punya library terpasang).

**Ringkasan pekerjaan**: `modules/vehicle/vehicle-catalog.js` — tambah
`parseLabelText(text)` (regex murni: OEM Code alfanumerik + barcode 8-14
digit) & `handleOcrLabel(text)` (reuse parse+`findByCode()`, pola sama
persis `handleScan()` Tahap 2 — kode cocok -> buka part existing, tidak
cocok -> draft otomatis, tidak ada kode -> tidak buat apa pun). `tests/
vehicle-catalog.test.js` +7 test (55, naik dari 48). Lihat
`CHANGELOG.md` § TASK-007 untuk detail.

**File diubah**:
- `modules/vehicle/vehicle-catalog.js`
- `tests/vehicle-catalog.test.js`
- `CHANGELOG.md`, `docs/ai/AI_HANDOFF.md`, `docs/ai/PROJECT_STATUS.md`
- Hasil `node scripts/build.js` (otomatis): bundle, `index.html`,
  `app_production.html`, `sw.js`, `docs/FILE-MAP.md` — versi
  `kw183-vehicle-catalog-ocr-label-parse-639`.

**File dihapus**: tidak ada.

**Build**: `node scripts/build.js kw183-vehicle-catalog-ocr-label-parse-639`
— SUKSES, lolos semua lint guard, sintaks kedua bundle valid,
`index.html`/`app_production.html` identik & `?v=639` sinkron.

**Test**: **506/506 PASS** (2x — sebelum & sesudah build).

**Cakupan sesi ini vs roadmap 6 tahap**: Tahap 1 (selesai, diperluas
TASK-006), Tahap 3 (logic parsing selesai — pemanggilan `ocrRecognize()`
dari foto sungguhan TETAP butuh UI). Tahap 2 (kamera/library scan
sungguhan), Tahap 4 (selesai sebelumnya), Tahap 5 (import massal PDF),
Tahap 6 (integrasi Car Notes) **BELUM dikerjakan** — semua butuh UI/
wiring page baru & keputusan produk, di luar cakupan "ringkas".

**Langkah berikutnya** (menunggu keputusan user, jangan ditebak):
1. Lokasi & desain UI Phase 2 (form CRUD part + list + search bar +
   filter chip + upload foto + tombol scan barcode/foto label yang
   memanggil `handleScan()`/`handleOcrLabel()`).
2. Tahap 2 Scanner sungguhan — pilihan library barcode/QR/DataMatrix
   utk browser (perlu keputusan produk: library apa, izin kamera).
3. Tahap 5 import massal PDF, Tahap 6 integrasi Car Notes.

Task ini berhenti setelah ZIP dibuat, sesuai Packaging Rule.

---

## Sesi Sebelumnya: TASK-006 — Vehicle Catalog: getDrafts()/resolveDraft() (lanjutan ringan)

**Konteks**: User: "kerjakan dari yg ringan untuk vehicle katalog, kerjakan
dengan ringkas". `handleScan()` (TASK-005) sudah bisa buat draft part
otomatis, tapi belum ada cara mensurvei/menyelesaikan draft itu — gap
kecil, murni logic, tanpa UI/library/keputusan produk baru.

**Ringkasan pekerjaan**: `modules/vehicle/vehicle-catalog.js` — tambah
`getDrafts()` (filter `isDraft:true`) & `resolveDraft(id, patch)` (merge
patch + paksa `isDraft:false`, reuse `update()`/`validate()` apa adanya).
Skema/storage/backup-restore/build.js TIDAK berubah. `tests/vehicle-
catalog.test.js` +5 test (48, naik dari 43). Lihat `CHANGELOG.md` §
TASK-006 untuk detail.

**File diubah**:
- `modules/vehicle/vehicle-catalog.js`
- `tests/vehicle-catalog.test.js`
- `CHANGELOG.md`, `docs/ai/AI_HANDOFF.md`, `docs/ai/PROJECT_STATUS.md`
- Hasil `node scripts/build.js` (otomatis): bundle, `index.html`,
  `app_production.html`, `sw.js`, `docs/FILE-MAP.md` — versi
  `kw182-vehicle-catalog-draft-helpers-638`.

**File dihapus**: tidak ada.

**Build**: `node scripts/build.js kw182-vehicle-catalog-draft-helpers-638`
— SUKSES, lolos semua lint guard, sintaks kedua bundle valid,
`index.html`/`app_production.html` identik & `?v=638` sinkron.

**Test**: **499/499 PASS** (2x — sebelum & sesudah build).

**Cakupan sesi ini vs roadmap 6 tahap**: TETAP hanya Tahap 1 (Fondasi,
diperluas) yang tersentuh. Tahap 2 kamera/library scan sungguhan, Tahap
3 (OCR), Tahap 4 sudah selesai sebelumnya, Tahap 5 (import massal PDF),
Tahap 6 (integrasi Car Notes) **BELUM dikerjakan** — semua butuh UI/
wiring page baru & keputusan produk (library scanner, lokasi tab UI,
dsb), di luar cakupan "ringkas".

**Langkah berikutnya** (menunggu keputusan user, jangan ditebak):
1. Lokasi & desain UI Phase 2 (form CRUD part + list + search bar +
   filter chip kendaraan/kategori + upload multi foto + tampilan draft
   dari `getDrafts()`).
2. Tahap 2 Scanner sungguhan — pilihan library barcode/QR/DataMatrix
   utk browser (perlu keputusan produk: library apa, izin kamera, dsb).
3. Tahap 3 OCR, Tahap 5 import massal PDF, Tahap 6 integrasi Car Notes.

Task ini berhenti setelah ZIP dibuat, sesuai Packaging Rule.

---

## Sesi Sebelumnya: TASK-003 — Vehicle Catalog: pivot skema jadi katalog SUKU CADANG (Tahap 1)

**Konteks**: User meminta roadmap 6 tahap fitur suku cadang (katalog
part dgn OEM Code/barcode/scan/OCR/database Honda/import massal/
integrasi Car Notes). Verifikasi terhadap zip yang diupload menemukan
`modules/vehicle/vehicle-catalog.js` (TASK-002, Milestone 0 Phase 1
sebelumnya) menyimpan skema **katalog referensi kendaraan**
(name/jenis/brand/year/plateNumber) — tidak cocok dgn Tahap 1 yang
diminta (search nama part/OEM Code/barcode, filter kendaraan+kategori,
multi foto). Dikonfirmasi eksplisit ke user (1 pertanyaan pilihan):
**perluas/ubah modul existing** (bukan modul terpisah baru).

**Ringkasan pekerjaan**: `modules/vehicle/vehicle-catalog.js` — skema
item diganti total ke `partName`/`category`/`oemCode`/`barcode`/
`compatibleVehicleIds[]`/`photos[]`/`notes`. Field lama & konstanta
`VEHICLE_CATALOG_JENIS` dihapus. `findByCode()` baru (exact match,
bekal Tahap 2 Scanner). Storage key/backup-restore/build.js entry
TIDAK berubah (bekerja di level store generik). `tests/vehicle-
catalog.test.js` ditulis ulang penuh (35 test, naik dari 30). Lihat
`CHANGELOG.md` § TASK-003 untuk rincian teknis lengkap.

**File diubah**:
- `modules/vehicle/vehicle-catalog.js`
- `tests/vehicle-catalog.test.js`
- `CHANGELOG.md`, `docs/ai/AI_HANDOFF.md`, `docs/ai/PROJECT_STATUS.md`
- Hasil `node scripts/build.js` (otomatis): bundle, `index.html`,
  `app_production.html`, `sw.js`, `docs/FILE-MAP.md`, versi source —
  `kw171-vehicle-daily-brief-redundansi-632`.

**File dihapus**: tidak ada.

**Build**: `node scripts/build.js` — SUKSES, lolos semua lint guard,
sintaks kedua bundle valid, `index.html`/`app_production.html`
identik & `?v=` sinkron di 632.

**Test**: **482/482 PASS** (477 − 30 lama + 35 baru, 0 regresi lain),
dijalankan sebelum & sesudah build.

**Cakupan sesi ini vs roadmap 6 tahap user**: HANYA Tahap 1 (Fondasi)
yang dikerjakan (CRUD/search/filter/field foto/backup-restore
otomatis). Tahap 2 (Scanner), 3 (OCR), 4 (kelengkapan field harga/
supplier/lokasi/aftermarket code/catatan servis), 5 (import massal
PDF), 6 (integrasi Car Notes) **BELUM dikerjakan** — semua butuh UI/
wiring page baru (Phase 2+), di luar cakupan "ringan dulu" & masih
butuh keputusan lokasi UI (kandidat: tab baru `page:'carnotes'`, per
`docs/ai/FOUNDATION_AUDIT.md` §4).

**Langkah berikutnya** (menunggu keputusan user, jangan ditebak):
1. Lokasi & desain UI Phase 2 (form CRUD part + list + search bar +
   filter chip kendaraan/kategori + upload multi foto).
2. Field tambahan Tahap 4 (harga, supplier, lokasi penyimpanan,
   aftermarket code, catatan servis) — nambah ke skema yg sudah ada.
3. Tahap 2 Scanner — pilihan library barcode/QR/DataMatrix utk browser
   (perlu keputusan produk: library apa, izin kamera, dsb).

Task ini berhenti setelah ZIP dibuat, sesuai Packaging Rule.
