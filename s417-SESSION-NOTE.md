# Sesi 417 (FUEL-AUTOSYNC-06, "Sesi 3" rencana "Fuel Estimation Auto-Update")

## Konteks

Lanjutan s416 (Sesi 2 rencana: SSOT write hook `recordBbmLog()`). Giliran
**Sesi 3 asli rencana**: FuelCard auto-refresh berbasis KM, tanpa nunggu
BBM log baru.

## Masalah

`FuelCard._gaugeHtml()` sebelumnya baca liter via
`FuelBarCorrection._currentEstimate(vehicleId)`, yang cuma balikin
`veh.fuelState.currentFuelLiter` APA ADANYA — angka BEKU sejak BBM log/
koreksi manual terakhir. Gauge tidak pernah "turun" walau kendaraan sudah
jalan puluhan km, sampai user tap Koreksi manual atau isi BBM baru lagi.

## Perubahan

- `modules/vehicle/fuel-card.js`:
  - `_liveEstimate(vehicleId)` (BARU) — 100% reuse
    `FuelStateEstimator.estimateCurrentLiter()` (s415) kalau tersedia &
    `ok:true`: balikin `{liter:est.liter, source:'estimator',
    estimationLimited:est.estimationLimited}`. Estimator ini menghitung
    ULANG akumulasi km sejak titik acuan (`fuelState.referenceKm`) SETIAP
    dipanggil — jadi tiap kali `FuelCard.render()` jalan (tab switch/
    dashboard refresh), gauge otomatis dapat angka terbaru berdasarkan km
    kendaraan saat ini, 0 rumus baru ditulis di sini.
  - Fallback ke `FuelBarCorrection._currentEstimate()` (snapshot lama)
    kalau `FuelStateEstimator` belum dimuat ATAU `estimateCurrentLiter()`
    balikin `ok:false` (mis. kendaraan belum pernah dikoreksi sama sekali
    — belum ada titik acuan) — gauge TIDAK PERNAH gagal render gara-gara
    sumber baru ini, pola guard sama persis field lain di file ini.
  - `_gaugeHtml(vehicleId)` — sekarang panggil `this._liveEstimate()`
    (bukan `FuelBarCorrection._currentEstimate()` langsung). Guard
    `typeof FuelBarCorrection === 'undefined'` DIHAPUS dari syarat wajib
    (sekarang opsional, cuma dipakai kalau `_liveEstimate()`
    membutuhkannya sbg fallback) — `FuelTankProfile`/`FuelGaugeEngine`
    tetap wajib (dipakai konversi liter -> posisi bar, tidak berubah).
  - 0 field baru ditulis ke `D`, 0 rumus konversi liter->bar baru
    (`FuelGaugeEngine.calculateFuelBar()` tetap dipakai apa adanya).
  - `FuelIntelligenceEngine.vehicleInsight()` TIDAK disentuh — sesi audit
    memastikan modul ini tidak baca `fuelState.currentFuelLiter` mentah
    sama sekali (efisiensi km/L-nya dari sumber lain), jadi 0 perubahan
    dibutuhkan di sana untuk sesi ini.

## Yang BELUM ditangani (sisa rencana)

- Sesi 4: `FuelPredictionEngine`/`FuelInsightEngine` masih baca
  `fuelState.currentFuelLiter` mentah langsung (bukan lewat estimator) —
  dikonfirmasi lewat audit sesi ini (grep `currentFuelLiter` di kedua
  file), belum diselaraskan.
- Sesi 5: confidence decay dinamis — `confidenceScore` masih statis
  (70/90/100 tergantung sumber tulis), tidak menurun seiring waktu/km
  sejak titik acuan. `_liveEstimate()` sesi ini meneruskan
  `estimationLimited` dari estimator tapi belum dipakai UI (badge/hint)
  — dicadangkan utk Sesi 5/6 biar tidak tumpang tindih dgn desain decay.
- Sesi 6: regression test suite komprehensif lintas Sesi 1-5.

## Verifikasi

- `node --test tests/*.test.js` → **2783/2783 pass** (2776 lama + 7
  baru: 4 `_liveEstimate()` + 3 `_gaugeHtml()` di `fuel-card.test.js`), 0
  fail.
- `node scripts/build.js s417-fuel-card-live-estimate` → build sukses,
  sintaks kedua bundle valid, versi `v1123` -> `v1124`.
