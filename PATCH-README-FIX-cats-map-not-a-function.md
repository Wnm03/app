# FIX — "Uncaught TypeError: cats.map is not a function"

## Gejala (dari screenshot)
```
Uncaught TypeError: cats.map is not a function
(https://wnm03.github.io/app/app-bundle-b.min.js?v=1659:7282)
```
Muncul saat buka Beranda (Insight Cepat) — banner error merah bilang
"Scan & Notifikasi mungkin tidak berfungsi", diikuti banner kuning
"Ada error kecil, coba ulangi aksi terakhir".

## Root cause
`modules/vehicle/service-input-catalog.js` meng-ekspos `groups` sebagai
**FUNGSI**, bukan array:
```js
window.ServiceInputCatalog = { groups, groupById, ... };
// groups adalah function(){ return SERVICE_CHECKLIST_GROUPS || []; }
```
Tapi 5 tempat pemanggilnya memakainya sebagai **nilai langsung** (tanpa
tanda kurung panggil):
```js
const cats = ServiceInputCatalog.groups || [];   // ❌ SALAH
```
Karena referensi fungsi selalu truthy, fallback `|| []` tidak pernah aktif
— `cats` jadi berisi fungsi itu sendiri, bukan array. Begitu dipanggil
`cats.map(...)` → crash `cats.map is not a function`.

Baris error di screenshot (`app-bundle-b.min.js:7282`) persis cocok dengan
`modules/finance/filter-laporan.js` baris 81 (fungsi
`populateServiceFilterSelects`, dipanggil oleh `onKfServiceCategoryChange`
setiap filter Kategori Servis di Keuangan/Beranda di-render).

## Fix
Tambahkan tanda kurung panggil `()` di **semua** 5 titik yang salah:

| File | Baris | Sebelum | Sesudah |
|---|---|---|---|
| `modules/finance/filter-laporan.js` | 81 | `ServiceInputCatalog.groups` | `ServiceInputCatalog.groups()` |
| `modules/vehicle/sparepart-servis.js` | 1415 | `ServiceInputCatalog.groups` | `ServiceInputCatalog.groups()` |
| `modules/vehicle/vehicle-catalog-ui.js` | 54 | `ServiceInputCatalog.groups` | `ServiceInputCatalog.groups()` |
| `modules/vehicle/vehicle-analytics-presenter.js` | 97 | `ServiceInputCatalog.groups` | `ServiceInputCatalog.groups()` |
| `car-notes.js` | 1442 | `ServiceInputCatalog.groups` | `ServiceInputCatalog.groups()` |

Fix yang sama juga ditempelkan langsung ke **bundle produksi**
(`app-bundle-a.min.js`, `app-bundle-b.min.js`) di titik teks yang identik,
karena situs live men-serve bundle ini langsung — perbaikan source saja
tidak cukup sampai bundle di-rebuild ulang di lingkungan build kamu
(`node scripts/build.js`).

`ServiceInputCatalog.groupById(...)` di file yang sama TIDAK disentuh —
pemanggilannya sudah benar (sudah pakai `()` sejak awal).

## Test baru
`tests/service-input-catalog-groups-function-call-fix.test.js`:
- Mengunci bahwa ke-5 file caller di atas memanggil `ServiceInputCatalog.groups()`
  (bukan referensi telanjang) — regresi tidak bisa masuk lagi tanpa test gagal.
- Memuat source `service-input-catalog.js` asli via `vm`, memverifikasi
  `groups()` benar-benar mengembalikan array yang bisa di-`.map()`.

Hasil run: **2/2 PASS**.

`tests/helpers/loadSource.js` & `fakeIndexedDB.js` disertakan karena
sebelumnya belum ada di paket manapun dan sekarang dibutuhkan test lain
di repo untuk `require('./helpers/loadSource')`.

## Cara pakai
Timpakan (overwrite) file-file di atas ke posisi yang sama persis di
project `app-main-81` kamu. Setelah itu, tetap disarankan jalankan
`node scripts/build.js` supaya bundle production ter-generate ulang dari
source yang sudah bersih (bundle di patch ini sudah ditambal manual sebagai
hotfix cepat, tapi build ulang tetap SoT paling aman jangka panjang).
