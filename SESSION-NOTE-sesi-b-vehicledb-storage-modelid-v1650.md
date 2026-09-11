# Session Note — Sesi B: Vehicle Database ke IndexedDB (v1649 → v1650)

Lanjutan `ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md` §4 Fase 1 poin 2:
"Pindahkan `TORSI_DB`/`VEHICLE_SPEC_DB` dari konstanta kode ke data
tersimpan (IndexedDB), key by `modelId`".

## Status check sebelum coding

Pesan pembuka sesi ini mengklaim Fase 1 "selesai kecuali Event Bus (Sesi
C)", mengutip sebuah session note yang **tidak ditemukan** di 4 ZIP yang
diupload (`app-main__77_.zip` baseline, PATCH-v1647/1648/1649). Diverifikasi
langsung lewat kode: `TORSI_DB`/`VEHICLE_SPEC_DB` (`modules/vehicle/sparepart-servis-b.js`,
baris 113 & 392) masih literal array hardcoded di baseline v1649 —
mengonfirmasi Sesi B (langkah ini) sebelumnya masih 0%. Diputuskan
lanjut kerjakan Sesi B sebagai langkah berikutnya yang benar, sesuai
urutan roadmap §3 Critical.

## Baseline

`app-main__77_.zip` (checkout penuh) + overlay PATCH-v1647 → v1648 →
v1649 berurutan, direkonstruksi jadi satu tree v1649 penuh sebelum
diedit — pola sama seperti sesi v1649 sebelumnya.

## Yang dikerjakan

1. **`modules/engine/database-api.js`**
   - `VEHICLE_DB_RECORDS` (literal, 2 model) **dipertahankan apa adanya** —
     sekarang berperan sebagai seed/fallback, bukan lagi satu-satunya
     sumber baca.
   - Tambah cache in-memory `_vehicleDbActiveRecords` + helper
     `_vehicleDbRecords()` (balikin cache aktif kalau sudah dimuat,
     fallback ke `VEHICLE_DB_RECORDS` kalau belum) — dipakai di
     `dbVehicleGetAll()`, `dbVehicleGetById()`,
     `dbVehicleFindTorsiByName()`, `dbVehicleFindSpecByName()`. Keempatnya
     **tetap 100% sync**, 0 perubahan signature — konsumen yang sudah ada
     (`findTorsiDb()`/`findVehicleSpec()` di `sparepart-servis-b.js`, dan
     3 titik panggil lain) **tidak disentuh sesi ini**, sesuai cakupan
     eksplisit roadmap §4 poin 2 (beda dari poin 3, wiring konsumen, yang
     sudah selesai di Sesi A2).
   - `DatabaseAPI.vehicle` dapat 3 method baru:
     - `ensureLoaded()` (async) — load sekali per sesi app dari
       `IDBStore.get('vehicledb:active')`. Storage kosong → seed dari
       `VEHICLE_DB_RECORDS.slice()`, tulis-balik 1x (write-through).
       Storage sudah ada isi → pakai langsung, 0 penulisan ulang. Kalau
       `IDBStore` tidak ada sama sekali ATAU `get()`/`set()` gagal →
       fallback permanen ke literal seed, **tidak pernah throw** ke
       pemanggil (guard try/catch + guard `typeof IDBStore==='undefined'`).
     - `isLoaded()` — status sudah/belum selesai `ensureLoaded()`.
     - `invalidateCache()` — reset cache in-memory (bukan hapus data
       storage), dipakai kalau ada penulis lain ke key yang sama (CRUD
       Fase 2 nanti) dan perlu baca ulang.
   - Pola `IDBStore.get`/`set` diambil **sama persis**
     `aiLoad()`/`aiEnsureLoaded()` di `modules/ai/ai-core.js` (reuse
     instance `IDBStore` global yang sama dengan app, key namespace
     terpisah `'vehicledb:active'`, flag `_loaded` boolean).

2. **`modules/shared/features-helpers-global-security.js`** — boot
   `load()`: `await DatabaseAPI.vehicle.ensureLoaded()` dipanggil sebelum
   `runDataMigrations()`, dengan guard `typeof DatabaseAPI!=='undefined'`
   (0 efek kalau modul database-api.js belum ikut ter-bundle, sama pola
   guard migrasi lain di file ini). Ditaruh di titik ini supaya ada SATU
   tempat startup yang menjamin Vehicle Database siap sebelum fitur lain
   mulai baca — bukan karena migrasi toVersion:11 butuh ini (migrasi itu
   baca `VEHICLE_MODELS` statis, tidak terpengaruh langkah ini, lihat gap
   di bawah).

3. **Test baru**: `tests/database-api-vehicledb-storage-sesi-b.test.js`
   (8 test) — seed dari storage kosong + tulis-balik 1x, baca dari storage
   terisi tanpa menimpa, cache in-memory (1x round-trip meski
   `ensureLoaded()` dipanggil berkali-kali), `invalidateCache()` memicu
   baca ulang, fallback tanpa `IDBStore` sama sekali, fallback saat
   `IDBStore.get()` reject, 0 regresi ke pemanggil sync sebelum
   `ensureLoaded()` pernah dipanggil, dan `getAll()` balikin salinan
   dangkal (bukan referensi ke cache aktif).

## Verifikasi

- `node --check` pada kedua file yang diedit — lolos.
- **Full suite dijalankan, bukan cuma smoke test manual.** Temuan:
  `tests/helpers/loadSource.js` (harness `vm`-based yang dipakai semua
  test `database-api-*`) **ternyata ADA** di `app-main__77_.zip` (checkout
  penuh) — keterbatasan "`node --test` gagal, `loadSource` tidak
  ditemukan" yang dicatat di beberapa session note sebelumnya (termasuk
  update audit v1646 di roadmap) cuma berlaku untuk ZIP **delta-only**,
  bukan checkout penuh. Dijalankan: `node --test` atas semua file
  `tests/*.test.js` (6146 test).
  - Hasil: **6135 pass, 11 fail.**
  - Ke-11 kegagalan dibandingkan langsung terhadap baseline v1649 SEBELUM
    perubahan sesi ini (`database-api.js`/`features-helpers-global-security.js`
    dikembalikan ke versi sebelum diedit, test baru sesi ini dihapus
    sementara, suite dijalankan ulang) — **gagal di titik & pesan yang
    sama persis**, semuanya pre-existing:
    - 1 soal `MANUFACTURERS`/`VEHICLE_MODELS` derivation (tidak disentuh
      sesi manapun yang relevan di sini)
    - 8 soal migrasi `toVersion:11` (Sesi A1, sebelum sesi ini)
    - 2 soal `verify-release-ready`/bundle freshness (butuh eslint/esbuild
      & bundle teregenerasi — tidak tersedia di sandbox ini, keterbatasan
      lingkungan, bukan kode)
  - **0 kegagalan baru dari perubahan sesi ini.**

## Sengaja tidak dikerjakan (di luar cakupan Sesi B)

- `MANUFACTURERS`/`VEHICLE_MODELS` (di bawah `VEHICLE_DB_RECORDS` di file
  yang sama) **masih diturunkan dari `VEHICLE_DB_RECORDS` literal**, BUKAN
  dari `_vehicleDbActiveRecords`. Artinya kalau nanti storage aktif
  berubah (mis. lewat CRUD Fase 2), `VEHICLE_MODELS`/`dbVehicleModelFindByName()`
  (dipakai migrasi toVersion:11) tidak ikut sinkron — gap yang sudah ada
  sebelum sesi ini (dynamic-ification `MANUFACTURERS`/`VEHICLE_MODELS`
  memang didaftarkan roadmap sebagai Fase 2 CRUD, bukan Sesi B), dicatat
  ulang di sini supaya tidak terlewat.
- `TORSI_DB`/`VEHICLE_SPEC_DB` (literal di `sparepart-servis-b.js`)
  **tidak dihapus** — tetap hidup sebagai fallback konsumen lama yang
  belum di-wire ke `DatabaseAPI.vehicle`. Roadmap §3 Critical mencatat
  penghapusan ini eksplisit sebagai langkah TERPISAH setelah wiring
  selesai — belum bagian sesi ini.
- Konsumen (`findTorsiDb()`/`findVehicleSpec()` & 3 titik panggilnya) TIDAK
  disentuh — sudah wired ke `DatabaseAPI.vehicle` sejak Sesi A2, tapi
  jalur baca mereka tetap 100% sync tanpa `await ensureLoaded()`. Artinya
  di app nyata, kalau boot `load()` belum sempat selesai
  `ensureLoaded()` saat konsumen ini dipanggil (race kecil, mis. servis
  modal dibuka sangat cepat setelah boot), mereka baca `_vehicleDbRecords()`
  yang saat itu masih fallback ke literal seed — BUKAN bug baru (perilaku
  identik dgn sebelum sesi ini, cuma sekarang ada jalur storage yang
  belum tentu selesai dimuat), tapi dicatat sebagai hal yang perlu
  diperhatikan sebelum CRUD Fase 2 mulai menulis ke storage aktif.

## Next (sesi berikutnya, tidak dikerjakan di sini)

Per roadmap §4 Fase 1 poin 3–4 & §3 Critical:
1. Hapus `TORSI_DB`/`VEHICLE_SPEC_DB` literal setelah wiring penuh
   (menunggu poin 2 di bawah).
2. Wiring 3 konsumen literal tersisa (`GENERIC_GROUP_BY_NAME`,
   `GENERIC_RECOMMEND_NAMES`, `FALLBACK_KEYWORDS`) ke pola guard
   `DatabaseAPI` — independen dari Sesi B, bisa duluan.
3. Event Bus versi ringan (Sesi C) — belum dikerjakan sesi manapun sampai
   titik ini, catatan "selesai" di pesan pembuka sesi ini tidak
   terverifikasi.
