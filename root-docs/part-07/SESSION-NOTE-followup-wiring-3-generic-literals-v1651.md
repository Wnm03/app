# Session Note — Wiring 3 Konsumen Literal Tersisa ke DatabaseAPI (v1650 → v1651)

Lanjutan `ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md` §7 baris 91 / §5.2
("item siap coding sekarang", poin 2): "Wiring 3 konsumen literal tersisa
ke `DatabaseAPI`" — `GENERIC_GROUP_BY_NAME`, `GENERIC_RECOMMEND_NAMES`,
`FALLBACK_KEYWORDS`.

## Kenapa sesi ini (bukan Event Bus/Sesi C)

Pesan pembuka sesi ini memberi 2 pilihan: lanjut wiring 3 literal tersisa,
atau mulai Sesi C (Event Bus general). Roadmap §6 (Risiko) mencatat Sesi C
eksplisit butuh "audit dulu titik mana saja sebelum coding" (daftar
konsumen dulu, belum siap langsung coding), sedangkan wiring 3 literal ini
terdaftar di §5.2 sebagai "item siap coding sekarang... pola sudah
terbukti 4×, risiko rendah". Dipilih wiring 3 literal sesuai prinsip
low-risk-first yang sama dipakai sesi-sesi sebelumnya.

## Status check sebelum coding

Diverifikasi langsung lewat kode (bukan cuma percaya klaim session note
sebelumnya, pola sama seperti pengecekan di awal v1650): `grep` atas
`GENERIC_GROUP_BY_NAME`/`GENERIC_RECOMMEND_NAMES`/`FALLBACK_KEYWORDS` di
`modules/vehicle/sparepart-servis.js` & `sparepart-servis-b.js`
mengonfirmasi ketiganya **masih literal murni**, dipakai langsung tanpa
guard `DatabaseAPI` apa pun — konsisten dengan catatan "Next" di
`SESSION-NOTE-sesi-b-vehicledb-storage-modelid-v1650.md` dan roadmap baris
91. Tidak ada diskrepansi kali ini (beda dari kasus v1650 yang menemukan
klaim "selesai" yang tidak terverifikasi).

## Baseline

`app-main__77_.zip` + overlay PATCH-v1647 → v1648 → v1649 → v1650
berurutan, direkonstruksi jadi satu tree v1650 penuh sebelum diedit — pola
sama sesi-sesi sebelumnya.

## Yang dikerjakan

Cakupan sengaja dibatasi murni "wiring" (pola guard sync, SAMA seperti pola
4 konsumen yang sudah wired sebelum Sesi B menambah IndexedDB) — **bukan**
memindahkan 3 data ini ke storage/IndexedDB. Ketiganya data GENERIK
lintas-model (bukan per-`modelId`, dilabeli eksplisit "estimasi"/"bukan
data pabrikan" di komentar aslinya) — beda domain dari `TORSI_DB`/
`VEHICLE_SPEC_DB` (Vehicle Database, per-model) yang sudah dapat storage di
Sesi B. Masuk kategori "Master Kategori & Komponen Servis" (roadmap §1
tabel baris 2), tapi **bukan** Master Database penuh (`service_categories`/
`service_items` 13-kategori-terkunci, roadmap §4 Fase 2 poin 1, masih 0%
tidak disentuh sesi ini).

1. **`modules/engine/database-api.js`** — namespace baru `DatabaseAPI.master`:
   - `GENERIC_GROUP_BY_NAME_RECORDS`, `GENERIC_RECOMMEND_NAMES_RECORDS`,
     `FALLBACK_KEYWORDS_RECORDS` — **salinan byte-for-byte** dari literal
     asli di `sparepart-servis.js`/`sparepart-servis-b.js` (diverifikasi via
     script `vm`-based yang eval kedua sisi & bandingkan `JSON.stringify`,
     bukan cuma dibaca-mata — pola sama verifikasi `VEHICLE_DB_RECORDS` di
     Sesi 1 database-api.js). Disalin (bukan di-import langsung) krn file
     sumber dimuat setelah/sebelum file ini tergantung file (lihat poin
     urutan muat di bawah) — alasan sama VEHICLE_DB_RECORDS.
   - 3 getter sync: `dbMasterGetGenericGroupByName()`,
     `dbMasterGetGenericRecommendNames()`, `dbMasterGetFallbackKeywords()`
     — semua balikin **salinan dangkal** (`Object.assign`/`.slice()`), pola
     sama `dbVehicleGetAll()`, supaya pemanggil tidak bisa mutasi sumber
     data lewat hasilnya.
   - Ditambahkan ke `DatabaseAPI.master` di object namespace publik.

2. **`modules/vehicle/sparepart-servis.js`**
   - Tambah `_genericGroupByName()`/`_genericRecommendNames()` — pola guard
     SAMA PERSIS `_allTorsiEntries()` (`sparepart-servis-b.js`): baca
     `DatabaseAPI.master.getXxx()` kalau termuat, fallback ke literal
     `GENERIC_GROUP_BY_NAME`/`GENERIC_RECOMMEND_NAMES` (TETAP ADA, tidak
     dihapus — pola sama `VEHICLE_DB_RECORDS`) kalau belum.
   - **Catatan urutan muat** (beda dari `_allTorsiEntries()`): di
     `scripts/build.js`, `database-api.js` dimuat **SETELAH**
     `sparepart-servis.js` (baris 557 vs 569), kebalikan urutan
     `sparepart-servis-b.js` yang dimuat setelah `database-api.js`. Ini
     AMAN krn `_genericGroupByName()`/`_genericRecommendNames()` (dan
     `resolveCatGroup()`/`collectKnownGroups()`/
     `Sparepart.recommendCategories()` yang memanggilnya) cuma DIPANGGIL
     saat runtime (render kartu/buka modal), bukan dieksekusi top-level
     saat file pertama dimuat — jadi `DatabaseAPI` (global) sudah pasti
     terdaftar begitu app selesai boot, terlepas urutan deklarasi file.
     Dicatat eksplisit di komentar kode supaya tidak jadi jebakan di sesi
     berikutnya.
   - 3 titik pakai diganti dari akses `GENERIC_GROUP_BY_NAME`/
     `GENERIC_RECOMMEND_NAMES` langsung ke lewat helper baru:
     `resolveCatGroup()`, `collectKnownGroups()`,
     `Sparepart.recommendCategories()`.

3. **`modules/vehicle/sparepart-servis-b.js`**
   - `FALLBACK_KEYWORDS` (sebelumnya `const` LOKAL di dalam
     `suggestServiceIntervalKm()`, dibuat ulang tiap panggilan) dipindah
     jadi `FALLBACK_KEYWORDS_LITERAL` module-scope, ditaruh tepat setelah
     `_allTorsiEntries()` (sebelum `suggestServiceIntervalKm()`) — isi &
     urutan 100% sama, cuma lokasi deklarasi.
   - Tambah `_fallbackKeywords()` — pola guard sama, baca
     `DatabaseAPI.master.getFallbackKeywords()` kalau termuat, fallback ke
     `FALLBACK_KEYWORDS_LITERAL`.
   - Loop `for(const fb of FALLBACK_KEYWORDS)` di dalam
     `suggestServiceIntervalKm()` diganti `for(const fb of
     _fallbackKeywords())`.

4. **Test baru**: `tests/database-api-master-generic-wiring-followup.test.js`
   (12 test) —
   - 3 data `DatabaseAPI.master` isinya cocok literal asli + 1 test isolasi
     salinan dangkal (mutasi hasil tidak bocor).
   - `_genericGroupByName()`/`_genericRecommendNames()`/`resolveCatGroup()`/
     `collectKnownGroups()`: tanpa `DatabaseAPI` → fallback literal (0
     regresi); dengan `DatabaseAPI.master` **di-override** nilainya (bukan
     cuma dicek ada) → hasil ikut berubah, membuktikan benar-benar baca
     lewat `DatabaseAPI`, bukan kebetulan fallback yang nilainya sama.
   - `_fallbackKeywords()`/`suggestServiceIntervalKm()`: sama, dengan
     kehati-hatian khusus (lihat "Jebakan test" di bawah).

## Jebakan yang ketemu selama coding (dicatat supaya tidak terulang)

- **Draft pertama `_fallbackKeywords()` salah taruh** — sempat dideklarasikan
  ULANG di dalam `suggestServiceIntervalKm()` (nested), bertentangan dengan
  komentar sendiri yang bilang "dipindah top-level". Ketauan pas review
  ulang kode sebelum test, diperbaiki dengan memindah beneran ke module
  scope (dekat `_allTorsiEntries()`).
- **False-positive test overwrite oleh TORSI_DB asli**: test awal pakai
  query `'Busi'`/`'aki'` untuk membuktikan jalur `FALLBACK_KEYWORDS`/
  `DatabaseAPI.master` — ternyata nama-nama itu JUGA muncul sebagai item
  asli di `TORSI_DB`/`VEHICLE_DB_RECORDS` (mis. "Busi" dgn interval
  "Ganti tiap 8.000 km", angka KEBETULAN SAMA dgn `FALLBACK_KEYWORDS`),
  jadi test "lolos" tanpa benar-benar melewati jalur yang mau dibuktikan.
  Diperbaiki dgn: (a) query `'battery'` (istilah Inggris, tidak ada di
  nama item `TORSI_DB` yg semua bahasa Indonesia) utk test fallback murni,
  (b) `DatabaseAPI.vehicle.getAll` di-override balikin `[]` utk test
  wiring `DatabaseAPI.master`, supaya `_allTorsiEntries()` tidak diam-diam
  menutupi jalur yang mau dites.
- **`assert.deepEqual` gagal krn cross-realm `Array`**: array yang dibuat
  MURNI di dalam sandbox `vm` (`fromApi.motor` dari
  `getGenericRecommendNames()` yang dipanggil langsung tanpa lewat closure
  Node) py `Array` constructor beda realm dari `Array` di file test Node
  — `assert.deepEqual` sempat menganggapnya "same structure but not
  reference-equal". Fix: `Array.from(fromApi.motor)` sebelum dibandingkan.
  (Array yang dibuat lewat closure arrow-function Node yang di-assign ke
  `ctx.DatabaseAPI.master.getXxx` TIDAK kena masalah ini, krn closure-nya
  tetap jalan di realm Node walau dipanggil dari kode sandbox.)

## Verifikasi

- `node --check` pada ketiga file yang diedit — lolos.
- Test baru: 12/12 pass (`node --test
  tests/database-api-master-generic-wiring-followup.test.js`).
- **Full suite**: `node --test tests/*.test.js` → **6158 test total (6146
  + 12 baru), 6147 pass, 11 fail**.
- **Regresi dibandingkan LANGSUNG** thd baseline v1650 (3 file yang diedit
  dikembalikan ke versi sebelum sesi ini via overlay PATCH-v1648 [file
  `sparepart-servis.js`/`-b.js` terakhir diubah di situ] +
  PATCH-v1650 utk `database-api.js`, test baru dihapus sementara, suite
  dijalankan ulang dari nol): **6146 test, 6135 pass, 11 fail** — daftar
  nama 11 test yang gagal **identik persis** (dibandingkan via `diff`
  otomatis, bukan baca manual) di kedua run. **0 kegagalan baru, 0
  kegagalan lama yang kebetulan ketutup dari perubahan sesi ini.**
  - Ke-11 kegagalan pre-existing (sama seperti dicatat di v1650): 1 soal
    `MANUFACTURERS`/`VEHICLE_MODELS` derivation, 8 soal migrasi
    `toVersion:11` (Sesi A1), 2 soal `verify-release-ready`/bundle
    freshness (butuh eslint/esbuild, keterbatasan sandbox).

## Sengaja tidak dikerjakan (di luar cakupan sesi ini)

- **Tidak ada storage/IndexedDB ditambah** utk 3 data ini — sesuai
  penjelasan di atas, ini scope "wiring" murni (pola sebelum Sesi B),
  bukan "pindahkan ke storage" (itu scope Master Database penuh, Fase 2,
  masih 0%).
- Literal `GENERIC_GROUP_BY_NAME`/`GENERIC_RECOMMEND_NAMES`/
  `FALLBACK_KEYWORDS_LITERAL` **tidak dihapus** — tetap hidup sbg fallback,
  pola sama `VEHICLE_DB_RECORDS`/`TORSI_DB`. Penghapusan (kalau memang mau
  dilakukan suatu saat) perlu keputusan terpisah — beda dgn `TORSI_DB` yg
  penghapusannya sudah eksplisit didaftarkan roadmap §3 Critical, 3 literal
  generik ini TIDAK ada butir serupa di roadmap.
- `Master Database` penuh (`service_categories`/`service_items` 13
  kategori terkunci) — masih 0%, tidak disentuh, sesuai roadmap §4 Fase 2
  poin 1 (Sesi D di §7).

## Next (sesi berikutnya, tidak dikerjakan di sini)

Per roadmap §4 Fase 1 & §7:
1. **Event Bus versi ringan (Sesi C)** — satu-satunya item Fase 1 yang
   tersisa sekarang (poin 1 manufacturers/vehicle_models = Sesi A1/A2 =
   selesai; poin 2 storage TORSI_DB/VEHICLE_SPEC_DB = Sesi B = selesai;
   poin 3 wiring 3 literal = sesi ini = selesai). Roadmap §6 mencatat
   eksplisit: **audit dulu titik-titik yang masih menulis `D` langsung
   tanpa emit (daftar konsumen dulu, BUKAN langsung ubah)** sebelum mulai
   coding — beda dari sesi-sesi wiring sebelumnya yang polanya sudah
   terbukti berulang.
2. Setelah Fase 1 benar-benar tuntas (termasuk Sesi C), baru aman masuk
   Fase 2 (Sesi D — `service_categories` master 13 kategori terkunci,
   roadmap §6 eksplisit: "jangan loncat ke Fase 2-4 sebelum Fase 1
   tuntas").
