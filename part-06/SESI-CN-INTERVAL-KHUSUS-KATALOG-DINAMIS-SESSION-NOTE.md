# Sesi — Audit fitur interval Car Notes (per-kendaraan) + fix 1 gap di Katalog Sparepart Dinamis

## Permintaan
Audit apakah fitur "interval servis per kendaraan" (agar tiap kendaraan bisa punya
interval edit sendiri di 🔧 Pengingat Servis) sudah ada. Kalau belum ada, implementasikan.

## Hasil Audit

**Fitur INTI-nya SUDAH ADA dan sudah lengkap**, tidak perlu dibuat ulang:

- `D.vehicles[].intervalOverrides` (object `{catId: km}`) — sudah ada.
- `getEffectiveIntervalKm(vehicleId, cat)` & `hasIntervalOverride(vehicleId, cat)`
  (`modules/vehicle/sparepart-servis.js`) — sudah ada.
- `editVehicleIntervalOverride(catId)` — modal prompt "Interval Khusus [nama
  kendaraan]", kosongkan/0 untuk kembali ke default global — sudah ada.
- UI: di 🔧 Pengingat Servis (`car-notes.js`), tiap baris kategori sparepart
  menampilkan `Interval X km 🔧` (+ badge "(khusus)" kalau di-override) yang bisa
  ditap untuk membuka `editVehicleIntervalOverride()` — sudah ada & sudah wired.

Jadi permintaan "agar tiap kendaraan punya edit interval sendiri di Pengingat
Servis" **sudah terpenuhi oleh kode yang ada**, sebelum sesi ini.

## Gap yang ditemukan & diperbaiki (1 fix)

Saat audit menelusuri SEMUA konsumen `intervalKm` (bukan cuma Pengingat Servis),
ditemukan 1 fitur lain yang **lupa** memakai interval khusus per-kendaraan:

**`ShopKatalogDinamisAPI.katalogUntuk()`** (`modules/vehicle/shop-katalog-dinamis-api.js`,
dipakai fitur "🛒 Katalog Sparepart per Kendaraan" di Shop) — sebelumnya SELALU
memakai `kategori.intervalKm` (interval GLOBAL), walau kendaraan yang dipilih di
situ sudah punya interval KHUSUS yang diset lewat Pengingat Servis. Akibatnya
status 🔴 Perlu Diganti / 🟢 Aman di kartu itu bisa SALAH untuk kendaraan yang
sudah di-override intervalnya.

Bukan bug baru dibuat sesi ini — komentar di file itu ("TIDAK ada rumus interval
baru — intervalKm tetap dari D.sparepartCats") memang berniat begitu saat file itu
ditulis (batch "ringan dulu"), sebelum lupa disinkronkan dgn fitur override yang
ternyata sudah ada duluan di `sparepart-servis.js` (dan dimuat lebih dulu sesuai
`scripts/build.js`).

### Fix
- **`shop-katalog-dinamis-api.js`**: tambah `_effectiveIntervalKm(vehicleId, kategori)`
  — reuse `getEffectiveIntervalKm()` APA ADANYA (0 rumus baru) kalau tersedia,
  guard `typeof` fallback ke `kategori.intervalKm` global kalau file
  `sparepart-servis.js` belum dimuat (konsisten dgn pola guard berlapis file ini).
  `katalogUntuk()` sekarang pakai fungsi ini, + field baru `intervalOverridden`
  (dari `hasIntervalOverride()`, guard sama).
- **`shop-katalog-dinamis-presenter.js`**: tampilkan badge "(khusus)" di baris
  interval kalau `intervalOverridden` true — style sama persis badge yang sudah
  ada di Pengingat Servis (`car-notes.js`), murni tampilan, 0 logic baru.

### TIDAK diubah
- `sparepart-servis.js`, `car-notes.js`, `editVehicleIntervalOverride()`,
  `getEffectiveIntervalKm()`, `hasIntervalOverride()` — sudah benar, 0 perubahan.
- Tidak ada field baru di `D.vehicles`/`D.sparepartCats` (tetap reuse
  `intervalOverrides` yang sudah ada).

## Test
**`tests/shop-katalog-dinamis-interval-override-sk.test.js`** (baru, 3 test):
1. Kendaraan TANPA override → `intervalKm` = global (perilaku lama tetap benar).
2. Kendaraan DENGAN override → `intervalKm` ikut interval khusus (BUKAN global),
   `intervalOverridden:true`, dan status aman/perlu-ganti ikut berubah sesuai
   ambang khusus itu (bukti nyata dampak fix, bukan cuma cek field mentah).
3. File dimuat BERDIRI SENDIRI tanpa `sparepart-servis.js` (`getEffectiveIntervalKm`
   tidak ada) → fallback ke `intervalKm` global, TIDAK error (guard `typeof`).

## Verifikasi
- `node --check` lolos utk kedua file yang diubah.
- File baru sendiri: **3 test, 3 pass, 0 fail**.
- `node --test tests/*.test.js` (suite penuh): **4248 test, 4248 pass, 0 fail**
  (naik dari 4245 sebelum sesi ini → +3 test baru, 0 regresi).

## Next
- `scripts/build.js` belum dijalankan (bundle `app-bundle-a.min.js`/
  `app-bundle-b.min.js` belum memuat fix ini sampai build berikutnya).
- `npm run lint` belum bisa dijalankan di sandbox (jaringan diblokir).

## Cara pakai patch ini
Extract & timpa 2 file yang diubah + tambahkan 1 file test baru di atas kode
project yang sudah ada. Tidak bergantung pada patch AF1 (autofill sisa porsi) —
sesi ini fitur & file yang berbeda sama sekali (Car Notes/interval kendaraan,
bukan Buku Aset/porsi kepemilikan).

## File dalam ZIP
- `modules/vehicle/shop-katalog-dinamis-api.js` (diubah)
- `modules/vehicle/shop-katalog-dinamis-presenter.js` (diubah)
- `tests/shop-katalog-dinamis-interval-override-sk.test.js` (baru)
- `SESI-CN-INTERVAL-KHUSUS-KATALOG-DINAMIS-SESSION-NOTE.md` (file ini)
