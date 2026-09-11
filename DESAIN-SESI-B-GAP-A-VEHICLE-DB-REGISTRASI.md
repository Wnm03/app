# Desain — Sesi B Gap (a): Mekanisme Registrasi `TORSI_DB`/`VEHICLE_SPEC_DB` ke `DatabaseAPI` (v1664)

> Status: **DESAIN, 0 KODE.** Sesuai keputusan eksplisit v1661 (lihat
> ROADMAP §2e/§7 baris Sesi B) — gap ini butuh desain+review tersendiri
> sebelum coding, bukan "gap kecil". Dokumen ini adalah output sesi
> tersebut. Sesi *coding* baru boleh mulai setelah keputusan terbuka di
> §5 dijawab (oleh W).

## 1. Masalah yang mau diselesaikan

`modules/engine/database-api.js` punya `VEHICLE_DB_RECORDS` — array 2
record (Vario 125, BeAT FI) yang isinya **disalin manual, byte-for-byte**
dari `TORSI_DB`/`VEHICLE_SPEC_DB` di `modules/vehicle/sparepart-servis-b.js`.
Alasan disalin (bukan diimpor langsung): urutan muat file di
`scripts/build.js` (GROUP_B) menaruh `database-api.js` **sebelum**
`sparepart-servis-b.js` — referensi langsung ke `TORSI_DB` dari
`database-api.js` akan `ReferenceError` karena variabelnya belum ada saat
`database-api.js` dieksekusi.

Risiko yang sudah tercatat di komentar kode & CHANGELOG v1643: literal
ganda ini **sudah pernah divergen** satu kali — kalau `TORSI_DB`/
`VEHICLE_SPEC_DB` diedit (nambah part/kendaraan baru) tapi
`VEHICLE_DB_RECORDS` lupa disinkronkan manual, `DatabaseAPI.vehicle.*`
akan mengembalikan data basi tanpa ada yang sadar (tidak ada error, cuma
data salah).

## 2. Ide inti: registrasi, bukan salin

`sparepart-servis-b.js` dimuat **setelah** `database-api.js` — artinya
di titik itu, `database-api.js` sudah selesai dieksekusi dan
`DatabaseAPI` sudah ada di scope global. `sparepart-servis-b.js` bisa
memanggil sebuah fungsi yang disediakan `DatabaseAPI.vehicle` untuk
"mendaftarkan diri" sebagai sumber data — kebalikan arah dependensi dari
skema salin-manual sekarang.

```
database-api.js   (didefinisikan lebih dulu)
  └── DatabaseAPI.vehicle.registerSource(records)   ← disediakan, dipanggil belakangan

sparepart-servis-b.js   (dimuat belakangan)
  └── TORSI_DB, VEHICLE_SPEC_DB didefinisikan
  └── DatabaseAPI.vehicle.registerSource(...)   ← dipanggil di sini, top-level
```

Ini aman dari sisi timing: `DatabaseAPI.vehicle.ensureLoaded()` (yang
membaca data untuk pertama kali secara nyata, dari IndexedDB) baru
dipanggil **runtime**, dari `load()` (`features-helpers-global-security.js`)
— jauh setelah SEMUA file script (GROUP_A+GROUP_B, jadi termasuk
`sparepart-servis-b.js`) selesai dieksekusi berurutan saat halaman
dimuat. Jadi `registerSource()` sudah pasti sudah dipanggil sebelum
`ensureLoaded()` pertama kali jalan — 0 race.

## 3. Perubahan data yang dibutuhkan: `id`/`displayName`

`VEHICLE_DB_RECORDS` punya field `id` (`"vario-125"`) dan `displayName`
(`"Honda Vario 125 (KZR)"`) per record — dipakai `dbVehicleGetById()`,
diturunkan jadi `VEHICLE_MODELS`, dan jadi target migrasi `modelId`
(Sesi A). **`TORSI_DB` dan `VEHICLE_SPEC_DB` saat ini TIDAK punya field
ini** — cuma `matchNames`/`sourceNote`/isi data. Registrasi butuh cara
memasangkan 1 entri `TORSI_DB` dengan 1 entri `VEHICLE_SPEC_DB` yang
"kendaraan sama" secara eksplisit (bukan tebak dari `matchNames`, karena
`matchNames` torsi vs spec **sengaja beda** untuk BeAT FI — spec BeAT FI
tidak menerima alias `"vario 110"`, tapi torsi-nya menerima; sudah
dikonfirmasi test `database-api-vehicle-migration.test.js`).

**Perubahan additive** (tidak mengubah field/nilai yang sudah ada):
tambah `id` + `displayName` di setiap entri `TORSI_DB` dan
`VEHICLE_SPEC_DB`:

```js
const TORSI_DB=[
{id:'vario-125', displayName:'Honda Vario 125 (KZR)',
 matchNames:['vario 125'], sourceNote:'...', cats:[...]},
{id:'beat-fi', displayName:'Honda BeAT FI Gen 1',
 matchNames:['beat fi','beat-fi','beat esp','beat pgm-fi','vario 110'], sourceNote:'...', cats:[...]},
];
const VEHICLE_SPEC_DB=[
{id:'vario-125', displayName:'Honda Vario 125 (KZR)',
 matchNames:['vario 125'], sourceNote:'...', umum:{...}, ...},
{id:'beat-fi', displayName:'Honda BeAT FI Gen 1',
 matchNames:['beat fi','beat-fi','beat esp','beat pgm-fi'], sourceNote:'...', umum:{...}, ...},
];
```

`findTorsiDb()`/`findVehicleSpec()`/`_allTorsiEntries()` tidak perlu
diubah — mereka tidak pernah membaca `id`/`displayName`, cuma
`matchNames`/isi data. 0 dampak ke jalur baca yang sudah ada.

## 4. Bentuk API yang diusulkan

```js
// database-api.js
let _registeredVehicleSource = null; // null = belum ada yg registrasi

function dbVehicleRegisterSource(entries) {
  if (!Array.isArray(entries)) return;
  // Pairing by id: gabung entri TORSI_DB + VEHICLE_SPEC_DB yg id-nya sama
  // jadi 1 record {id, displayName, torsi?, spec?} — bentuk PERSIS sama
  // dgn shape VEHICLE_DB_RECORDS yg sudah ada. Toleran kalau cuma salah
  // satu (torsi-only atau spec-only) ada utk id tsb.
  _registeredVehicleSource = entries;
}

function _vehicleDbRecords() {
  return _vehicleDbActiveRecords || _registeredVehicleSource || VEHICLE_DB_RECORDS;
}
```

```js
// sparepart-servis-b.js, setelah VEHICLE_SPEC_DB didefinisikan
(function _registerVehicleDbSource(){
  if (typeof DatabaseAPI === 'undefined' || !DatabaseAPI.vehicle ||
      typeof DatabaseAPI.vehicle.registerSource !== 'function') return;
  const byId = {};
  TORSI_DB.forEach(t => { byId[t.id] = byId[t.id] || {}; byId[t.id].id = t.id; byId[t.id].displayName = t.displayName; byId[t.id].torsi = t; });
  VEHICLE_SPEC_DB.forEach(s => { byId[s.id] = byId[s.id] || {}; byId[s.id].id = s.id; byId[s.id].displayName = s.displayName; byId[s.id].spec = s; });
  DatabaseAPI.vehicle.registerSource(Object.values(byId));
})();
```

Guard `typeof DatabaseAPI==='undefined'` — pola SAMA PERSIS 4 konsumen
lain (`findTorsiDb` dkk) — supaya test terisolasi yang cuma load
`sparepart-servis-b.js` sendirian (tanpa `database-api.js`) tetap jalan,
cuma tidak melakukan apa-apa (no-op).

**Titik pakai `_vehicleDbRecords()` lain yang otomatis ikut kebagian
data teregistrasi** (tanpa diubah sendiri, karena semua sudah baca lewat
fungsi ini): `dbVehicleGetAll()`, `dbVehicleGetById()`,
`dbVehicleFindTorsiByName()`, `dbVehicleFindSpecByName()`, dan
`_vehicleDbDoLoad()` (baris seed IndexedDB — lihat §4b).

### 4a. `_vehicleModelRecords()` (Sesi B-lanjutan) perlu 1 baris tambahan

Fungsi ini saat ini: `if (!_vehicleDbActiveRecords) return VEHICLE_MODELS;`
— `VEHICLE_MODELS` sendiri adalah **const, dihitung sekali** dari
`VEHICLE_DB_RECORDS` **saat `database-api.js` dieksekusi** — jadi tidak
bisa otomatis "melihat" `_registeredVehicleSource` yang baru ada
belakangan (saat `sparepart-servis-b.js` jalan). Perlu ditambah 1 cabang:

```js
function _vehicleModelRecords() {
  if (_vehicleDbActiveRecords) return _vehicleDbActiveRecords.map(...);
  if (_registeredVehicleSource) return _registeredVehicleSource.map(...); // BARU
  return VEHICLE_MODELS;
}
```

Tanpa ini, `DatabaseAPI.vehicleModel.*`/`dbVehicleModelFindByName()`
(dipakai migrasi `modelId` toVersion:11) tetap baca `VEHICLE_MODELS`
literal beku sampai `ensureLoaded()` pernah dipanggil — bukan bug baru,
tapi bikin sumber kebenaran belum benar-benar 1 pintu untuk fungsi ini.

### 4b. Seed IndexedDB (`_vehicleDbDoLoad`) — ganti sumber seed

```js
// SEBELUM:
_vehicleDbActiveRecords = VEHICLE_DB_RECORDS.slice();
// SESUDAH:
_vehicleDbActiveRecords = _vehicleDbRecords().slice(); // literal -> 3-tier (registered > literal)
```

Ini baris **satu-satunya** yang membuat `TORSI_DB`/`VEHICLE_SPEC_DB`
betul-betul jadi "satu-satunya sumber kebenaran" untuk instalasi BARU
(IndexedDB masih kosong): begitu seed pertama kali ditulis, isinya
diambil dari data yang diregistrasi `sparepart-servis-b.js`, bukan dari
`VEHICLE_DB_RECORDS` literal — literal cuma jadi jaring pengaman kalau
registrasi tidak pernah terjadi (test terisolasi, lihat §5).

**Untuk instalasi LAMA** (IndexedDB `'vehicledb:active'` sudah pernah
ditulis dari sesi v1650 dst.): tidak ada migrasi yang perlu dijalankan —
isinya sudah identik dengan `TORSI_DB`/`VEHICLE_SPEC_DB` asli (parity
byte-for-byte per komentar header `database-api.js` baris 24-27), jadi
`_vehicleDbActiveRecords` yang sudah tersimpan tetap valid apa adanya.

## 5. Keputusan terbuka untuk W (tidak ditebak)

**Keputusan 1 — cakupan sesi ini vs literal `VEHICLE_DB_RECORDS`.**
Ada 2 opsi:

- **(A) Additive, direkomendasikan.** `VEHICLE_DB_RECORDS` **TIDAK
  dihapus** sesi ini — tetap ada sebagai fallback paling akhir (dipakai
  kalau `registerSource()` tidak pernah dipanggil, mis. 7 test yang
  me-`loadSource(['modules/engine/database-api.js'])` **sendirian**:
  `database-api-vehicle-migration.test.js`,
  `database-api-manufacturer-vehiclemodel-s-a1.test.js`,
  `database-api-vehicledb-storage-sesi-b.test.js`,
  `database-api-vehicledb-ensureloaded-dedup-sesi-b-followup.test.js`,
  `database-api-vehiclemodel-storage-sync-followup.test.js`,
  `database-api-master-generic-wiring-followup.test.js`,
  `database-api-vehicle-modelid-resolve-s-a2.test.js`). Di **app nyata**
  (kedua file SELALU dimuat bersama lewat `app-bundle-b.min.js`),
  `registerSource()` selalu terpanggil, jadi data yang dipakai user
  SELALU dari `TORSI_DB`/`VEHICLE_SPEC_DB` — literal jadi mati (tidak
  pernah kepakai) di produksi, tapi tetap eksis untuk kompatibilitas
  test. 0 risiko regresi ke 7 test itu, 0 file test perlu diubah.
- **(B) Full cutover.** `VEHICLE_DB_RECORDS` dihapus total dari
  `database-api.js`; ke-7 test di atas diubah supaya me-load
  `sparepart-servis-b.js` juga (pola sudah ada, dipakai
  `suggest-service-interval-database-api-wiring-v1645.test.js`) atau
  test menyuntik data sendiri lewat `registerSource()` sebagai fixture.
  Ini yang dimaksud roadmap Critical §3 ("hapus duplikasi ... setelah
  mekanisme ini ada") — tapi menyentuh 7 file test sekaligus adalah
  risiko regresi yang lebih besar dari "1 gap kecil", jadi diusulkan jadi
  **sesi terpisah lagi setelah (A) terbukti jalan di full checkout**
  (bukan bagian sesi coding gap (a) ini).

Rekomendasi: **(A) sesi ini, (B) sesi lain setelahnya** — konsisten
dengan urutan yang sudah ditulis roadmap sendiri (§3 Critical, baris
terakhir: "Hapus duplikasi ... setelah wiring selesai" — 2 langkah
terpisah, bukan 1).

**Keputusan 2 — nama fungsi.** `registerSource` vs alternatif seperti
`registerRecords`/`provideSource`/`seedFrom`. Tidak krusial secara
fungsional, tapi menyangkut konsistensi penamaan dengan API `DatabaseAPI`
yang sudah ada (`getAll`/`getById`/`findTorsiByName` — semua verb
"baca"; ini yang pertama verb "tulis/daftar"). Diusulkan `registerSource`
karena paling jelas menyatakan "aku sumber data eksternal yang mendaftar
diri", tapi ini keputusan gaya, bisa diganti W tanpa dampak desain.

**Keputusan 3 — pairing torsi/spec tanpa `id` untuk kendaraan baru di
masa depan.** Kalau nanti ditambah kendaraan ke-3 yang cuma punya salah
satu (`torsi` doang, belum ada buku manual lengkap utk `spec`), pairing
`byId` di §4 sudah menangani ini (toleran, `record.spec` akan
`undefined`) — tinggal dikonfirmasi W bahwa ini perilaku yang diinginkan
(bukan "harus keduanya ada baru didaftarkan").

## 6. Dampak ke test yang ADA (bukan yang perlu ditulis baru)

Dengan opsi (A):
- 7 test §5 yang me-load `database-api.js` sendirian: **0 perubahan
  perilaku** — `registerSource()` tidak pernah dipanggil di sandbox itu
  (karena `sparepart-servis-b.js` tidak ikut di-load), jadi
  `_registeredVehicleSource` tetap `null`, `_vehicleDbRecords()` jatuh ke
  `VEHICLE_DB_RECORDS` seperti sebelumnya — parity test tetap valid.
- Test yang me-load KEDUA file bersama (mis.
  `suggest-service-interval-database-api-wiring-v1645.test.js`,
  `collect-known-groups-database-api-wiring-v1645.test.js`): perlu
  **diverifikasi ulang saat coding** bahwa `registerSource()` tidak
  mengubah hasil `getAll()`/`findTorsiByName()` dibanding sebelumnya
  (harus identik, karena `TORSI_DB`+`VEHICLE_SPEC_DB` == isi
  `VEHICLE_DB_RECORDS` by construction) — risiko rendah tapi WAJIB
  dijalankan sebagai bagian sesi coding, bukan diasumsikan.
- Test baru yang perlu ditulis sesi coding: (1) `registerSource()`
  dipanggil & meng-override `VEHICLE_DB_RECORDS` kalau datanya
  sengaja dibuat beda (pola "test override data" — sama filosofi
  `database-api-master-generic-wiring-followup.test.js`); (2) pairing
  toleran torsi-only/spec-only; (3) seed IndexedDB (`_vehicleDbDoLoad`)
  memakai `_vehicleDbRecords()` (jadi ikut registered source) saat
  storage kosong.

## 7. Rencana sesi coding berikutnya (ringkasan langkah, bukan dikerjakan sesi ini)

1. Tambah `id`/`displayName` ke tiap entri `TORSI_DB`/`VEHICLE_SPEC_DB`
   (§3) — additive, 0 titik baca lama terpengaruh.
2. `database-api.js`: tambah `_registeredVehicleSource` +
   `dbVehicleRegisterSource()`, expose sebagai
   `DatabaseAPI.vehicle.registerSource`, update `_vehicleDbRecords()`
   (§4), `_vehicleModelRecords()` (§4a), seed `_vehicleDbDoLoad()` (§4b).
3. `sparepart-servis-b.js`: tambah IIFE registrasi (§4) tepat setelah
   `VEHICLE_SPEC_DB` didefinisikan (baris ~483, sebelum `findVehicleSpec`
   atau sesudahnya — tidak krusial, asal setelah kedua const ada).
4. Test baru (§6) + jalankan full suite (`node --test`) — pastikan 7
   test §5-A tetap hijau tanpa diubah, test gabungan (existing) tetap
   hijau, `node scripts/build.js` gate lolos.
5. **TIDAK** menghapus `VEHICLE_DB_RECORDS` di sesi ini (keputusan (A)).
   Item itu tetap di roadmap §3 Critical sebagai langkah terpisah
   berikutnya, baru dikerjakan setelah sesi ini terbukti stabil.
6. Setelah sesi ini selesai & hijau: **Sesi D** (`service_categories`
   13 kategori terkunci) boleh mulai — larangan §6 roadmap
   ("jangan loncat Fase 2 sebelum Fase 1 tuntas") baru lepas di titik
   ini, karena ini item terakhir yang menahan Fase 1.

====================================================

**Ringkasan untuk ROADMAP §2g:** desain gap (a) Sesi B selesai
(dokumen ini). 0 kode produksi diubah sesi ini. 3 keputusan terbuka
(§5) perlu jawaban W sebelum sesi coding dimulai — rekomendasi eksplisit
diberikan untuk ketiganya (opsi A/`registerSource`/toleran-partial) tapi
tidak diasumsikan otomatis disetujui.
