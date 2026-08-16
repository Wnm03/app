# CHANGELOG — S629

**Versi:** s628-titipan-explicit-owner-only → s629-titipan-explicit-owner-only
**App build:** v1361 → v1362
**Test:** `node --test tests/*.test.js` → 4475/4475 pass
**Build:** `node scripts/build.js` sukses (0 error, 2 peringatan lint non-blocking yang sudah ada sebelumnya: AUDIT_MATRIX.md usang & 8 file source lewat ambang 1600 baris — tidak terkait patch ini)

## Ringkasan

Temuan sesi ini: infrastruktur per-tab-kendaraan (`curVehicleId`) sudah berjalan sejak S622 — Katalog Suku Cadang, Servis, BBM, dan Pengingat semua sudah otomatis mengikuti tab kendaraan yang sedang aktif. Satu-satunya bagian yang masih manual adalah field **"Berlaku untuk Kendaraan"** di modal Kategori Sparepart & Stok Sparepart — dropdown ini masih bisa dipilih bebas oleh pengguna, tidak otomatis ikut tab aktif.

Patch ini mengunci dropdown tersebut supaya SELALU otomatis mengikuti kendaraan tab aktif (`curVehicleId`), sesuai permintaan "tiap kendaraan punya sendiri-sendiri".

## Perubahan

### `modules/vehicle/sparepart-servis.js`

- **`Sparepart.populateVehicleSelect(elId, currentValue, isEdit)`**
  - Dropdown `#sparepartVehicleId` (modal Kategori Sparepart) dan `#stockVehicleId` (modal Stok Sparepart) sekarang **dikunci (`disabled = true`)** dan nilainya otomatis di-set ke `curVehicleId` — berlaku baik untuk mode tambah baru maupun edit (parameter `currentValue`/`isEdit` tidak lagi dipakai untuk menentukan nilai awal select, karena select selalu mengikuti tab aktif).
  - Kalau tidak ada kendaraan aktif (`curVehicleId` kosong/tidak valid), fallback ke `""` (🌐 Semua kendaraan) — select tetap dikunci.
  - Teks hint di bawah dropdown (`#sparepartVehicleHint` / `#stockVehicleHint`, id baru) otomatis berubah jadi `🔒 Otomatis khusus kendaraan tab aktif: <emoji> <nama kendaraan>`, atau `🔒 Otomatis "🌐 Semua kendaraan" (tidak ada kendaraan aktif dipilih di tab atas)` kalau tidak ada tab aktif.

- **`Sparepart.saveCat()`**
  - `vehicleId` yang disimpan ke `D.sparepartCats` sekarang diambil **langsung dari `curVehicleId`** (bukan dari `.value` elemen select yang sudah di-disable — beberapa browser/WebView tidak reliable membaca `.value` select yang disabled).
  - Efek: kategori baru maupun hasil edit kategori lama (termasuk yang sebelumnya berstatus "🌐 Semua kendaraan") otomatis pindah scope ke kendaraan tab aktif begitu disimpan.

- **`Sparepart.saveStock()`**
  - Pola identik dengan `saveCat()`: `vehicleId` item stok diambil langsung dari `curVehicleId`.

### `modules/shared/modals.js`

- Menambahkan `id="sparepartVehicleHint"` pada div hint di bawah `#sparepartVehicleId` (modal `sparepartModal`).
- Menambahkan `id="stockVehicleHint"` pada div hint di bawah `#stockVehicleId` (modal `stockModal`).
- Tidak ada perubahan teks/struktur lain — perubahan murni penambahan id supaya bisa diupdate dinamis oleh `populateVehicleSelect()`.

## Dampak & Kompatibilitas

- **Data lama tidak berubah** sampai kategori/stok tersebut dibuka & disimpan ulang lewat modal — begitu disimpan, `vehicleId`-nya otomatis mengikuti tab aktif saat itu.
- Tidak ada perubahan pada `catVisibleForVehicle()`, `isPartForVehicle()`, atau logika filter tab lain — hanya sumber nilai `vehicleId` saat disimpan yang berubah.
- Tidak ada test yang secara langsung memeriksa DOM `#sparepartVehicleId`/`#stockVehicleId` (dicek: `grep` di `tests/` tidak menemukan referensi), sehingga risiko breakage test rendah — dikonfirmasi 4475/4475 tetap pass setelah perubahan.

## File yang Berubah (source)

- `modules/vehicle/sparepart-servis.js`
- `modules/shared/modals.js`

## Isi ZIP Patch Ini

- Source: `modules/vehicle/sparepart-servis.js`, `modules/shared/modals.js`
- Bundle: `app-bundle-a.min.js`, `app-bundle-b.min.js`
- `index.html`, `app_production.html`, `sw.js`
- `CHANGELOG-S629.md` (file ini)
- `FILE-MAP.md`, `COVERAGE-PER-MODULE.md` (regenerasi otomatis dari `node scripts/build.js`)

**Catatan upload:** upload SEMUA file di atas (bukan cuma HTML), karena logic berada di source + bundle, bukan di HTML.
