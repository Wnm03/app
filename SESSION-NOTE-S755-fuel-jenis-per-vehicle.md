# SESI 755 — Fuel Jenis Default Per-Kendaraan (fix gap dari S753/S754)

## Konteks
Waktu ditanya "default dropdown Jenis BBM itu logic-nya apa", jawabannya:
murni `D.fuelPriceRef.lastType` — field TUNGGAL, ditimpa tiap kali dropdown
Jenis BBM diganti (`FuelPriceRef.onSelectChange()`), TANPA hitung frekuensi
pemakaian sama sekali.

**Gap yang diidentifikasi:** `lastType` itu GLOBAL, bukan per-kendaraan.
Kalau user punya 2+ kendaraan dengan jenis BBM beda (mis. motor Pertalite,
mobil Pertamax):
1. Isi BBM motor → `lastType` jadi `'pertalite'`
2. Buka modal isi BBM mobil setelahnya → dropdown ikut default `'pertalite'`
   juga (bukan `'pertamax'` yang biasa dipakai mobil itu) — user harus ganti
   manual tiap gantian kendaraan.

Bukan bug (tetap bisa diganti manual), tapi bukan default paling tepat utk
kasus multi-kendaraan.

## Fix: opsi 1 dari 2 yang ditawarkan — per-kendaraan
`D.fuelPriceRef.lastTypeByVehicle[vehicleId]`, terpisah dari
`D.fuelPriceRef.lastType` (global, DIPERTAHANKAN sbg fallback utk pemanggil
yang belum kirim vehicleId — backward-compat, 0 breaking change ke caller
lama).

### Perubahan
- **modules/vehicle/fuel-price-ref.js**
  - `populateSelect(selectId, vehicleId)` — param baru `vehicleId` (opsional).
    Fallback berjenjang: `lastTypeByVehicle[vehicleId]` → `lastType` global →
    `'pertalite'`.
  - `onSelectChange(selectId, hargaId, vehicleId)` — param baru `vehicleId`
    (opsional). Kalau dikirim, tulis KE DUA tempat: `lastTypeByVehicle[vehicleId]`
    DAN `lastType` global (global tetap ke-update, dipakai pemanggil lama).
- **4 salinan default `D.fuelPriceRef`** (`modules/{shared,asset,finance,shop}/
  features-helpers-global-security.js`, pola sama `D.pajakZakat`) — tambah
  `lastTypeByVehicle:{}`.
- **car-notes.js** (`BBM.openModal`) — kirim `curVehicleId` ke
  `populateSelect()`/`onSelectChange()`.
- **modules/finance/tx-bbm.js** (`onTxBbmVehicleChange`) — SEKARANG juga
  bertanggung jawab isi ulang dropdown `txBbmJenis` tiap kali kendaraan di
  `txBbmVehicle` diganti (sebelumnya cuma urus field KM), kirim
  `sel.value` (vehicleId terpilih) ke `populateSelect()`/`onSelectChange()`.
  `toggleTxBbmFields()` disederhanakan — cukup panggil `onTxBbmVehicleChange()`
  (dedup, sebelumnya ada 2 pemanggilan `FuelPriceRef.*` terpisah di
  `toggleTxBbmFields()` yang sekarang jadi 1 sumber di `onTxBbmVehicleChange()`).
- **modules/shared/modals.js** — 2 inline `onchange` diupdate:
  - `bbmJenis` (bbmModal): `FuelPriceRef.onSelectChange('bbmJenis','bbmHarga',curVehicleId)`
  - `txBbmJenis` (txBbmFields): `FuelPriceRef.onSelectChange('txBbmJenis','txBbmHargaL',document.getElementById('txBbmVehicle').value)`

### Data lama (upgrade path)
User yang sudah punya `D.fuelPriceRef` tersimpan (dari sebelum sesi ini)
TIDAK punya field `lastTypeByVehicle` — ditangani dgn optional-chaining di
`populateSelect()`/`onSelectChange()` (`fp.lastTypeByVehicle?.[vehicleId]`,
`D.fuelPriceRef.lastTypeByVehicle||{}`), jadi 0 migrasi data manual
diperlukan, langsung fallback ke `lastType` global sampai user pilih jenis
BBM lagi utk kendaraan itu (baru sejak itu `lastTypeByVehicle` terisi).

## Test
- `tests/fuel-jenis-per-vehicle-s755.test.js` (baru) — cakupan
  `populateSelect`/`onSelectChange` param vehicleId (fallback berjenjang, 2
  kendaraan tidak saling menimpa, kompatibilitas pemanggil lama tanpa
  vehicleId, data lama tanpa `lastTypeByVehicle`), + wiring
  `tx-bbm.js onTxBbmVehicleChange()`.
- `tests/fuel-jenis-wiring-s753.test.js` — 2 assertion exact-match onchange
  string diupdate mengikuti signature baru (`,curVehicleId` /
  `,document.getElementById('txBbmVehicle').value` ditambahkan).
- `tests/fuel-price-ref.test.js` (S749) — TIDAK diubah, semua tes lama
  masih valid krn param `vehicleId` opsional (backward-compat).

## TIDAK disentuh sesi ini
- Opsi 2 (frekuensi pemakaian dari `D.bbmLogs`) — sengaja tidak dipakai,
  opsi 1 (per-kendaraan) sudah cukup akurat & jauh lebih murah utk kasus
  nyata (kendaraan beda jenis BBM tetap konsisten tiap dibuka).
- `selectUnknown()` (S754, dropdown "❓ Belum Diketahui" saat edit catatan
  lama tanpa field `jenis`) — tidak berubah, tetap murni UI, tidak terkait
  `lastType`/`lastTypeByVehicle`.
