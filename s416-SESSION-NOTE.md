# Sesi 416 (FUEL-AUTOSYNC-05, lanjutan rencana "Fuel Estimation Auto-Update")

## Konteks

Lanjutan langsung s415 (`FuelStateEstimator.estimateCurrentLiter()`,
Sesi 1 asli rencana). Sekarang giliran **Sesi 2 asli rencana**: SSOT write
hook di `recordBbmLog()` — tulis `fuelState` di SETIAP log BBM baru,
bukan cuma full tank.

## Perubahan

- `modules/finance/tx-bbm.js`:
  - `recordBbmLog()` — cabang `else` (bukan full tank) di kedua jalur
    (edit `existingBbmId` & push baru) sekarang panggil
    `syncFuelStateFromEstimator(vehicleId)` (BARU).
  - `syncFuelStateFromEstimator(vehicleId)` (BARU) — 100% reuse
    `FuelStateEstimator.estimateCurrentLiter()` (s415, 0 rumus baru di
    sini): panggil estimator, kalau `ok:true` DAN `currentKm` valid, tulis
    `veh.fuelState = {currentFuelBar (via FuelGaugeEngine.calculateFuelBar,
    opsional), currentFuelLiter:est.liter, correctedAt:now,
    estimatedSource:'auto-bbm-log', confidenceScore:70,
    referenceKm:est.currentKm}`.
    - **Kenapa `referenceKm` diperbarui ke `est.currentKm`**: hasil tulis
      ini otomatis JADI titik acuan berikutnya buat `estimateCurrentLiter()`
      — kalau tidak di-update, log parsial yang barusan ditulis (dan semua
      log parsial SEBELUM titik acuan lama) akan ikut terhitung LAGI di
      panggilan berikutnya (double-counting akumulasi). Dgn selalu
      "membekukan" hasil estimasi jadi baseline baru tiap kali BBM log
      tersimpan, tiap panggilan berikutnya cuma menghitung akumulasi SEJAK
      titik ini — bukan sejak koreksi manual/full-tank terakhir yang makin
      lama makin jauh.
    - `confidenceScore:70` — di bawah full-tank sync (90) & koreksi manual
      (100): angka ini estimasi TIDAK LANGSUNG (akumulasi partial fill +
      formula konsumsi km/L rata-rata historis), bukan ground truth
      langsung dari pengisian tangki atau pembacaan speedometer fisik.
      (Penentuan confidence yang lebih dinamis/decay berbasis waktu itu
      Sesi 5 lanjutan, belum dikerjakan — 70 di sini masih angka statis.)
    - Guard: `typeof FuelStateEstimator === 'undefined'` (modul belum
      dimuat), `D`/`D.vehicles` belum ada, kendaraan tidak ditemukan,
      `estimateCurrentLiter()` balikin `ok:false` (mis. belum ada titik
      acuan sama sekali), atau `est.currentKm` bukan angka valid (mis.
      `getVehicleKm()` belum dimuat) — SEMUA diam (no-op), TIDAK PERNAH
      menggagalkan `recordBbmLog()` gara-gara sync opsional ini (pola sama
      persis `syncFuelStateFromFullTankBbm()`, s412).
    - `FuelStateHistory.record()` (s414) ikut dipanggil setelah tulis,
      pola sama persis writer `fuelState` lain.

## Yang BELUM ditangani (sisa rencana)

- Sesi 3: `FuelCard`/`FuelIntelligenceEngine` masih baca `fuelState`
  langsung, belum "auto-refresh" berbasis KM tanpa BBM log baru.
- Sesi 4: `FuelPredictionEngine`/`FuelInsightEngine` masih baca
  `fuelState.currentFuelLiter` mentah, belum lewat estimator.
- Sesi 5: confidence decay dinamis — `confidenceScore:70` di sesi ini
  masih statis, tidak menurun seiring waktu/km sejak titik acuan.
- Sesi 6: regression test suite komprehensif lintas Sesi 1-5.
- Race/timing: kalau ada 2 log BBM parsial nyaris bersamaan dari 2 sumber
  (mis. modal BBM langsung + toggle sinkron txModal) sebelum salah satu
  selesai commit — di luar cakupan sesi ini (arsitektur `D` project ini
  single-threaded/synchronous per operasi, jadi risiko ini rendah dalam
  praktik, tapi belum ada test eksplisit utk skenario itu).

## Verifikasi

- `node --test tests/*.test.js` → **2776/2776 pass** (2770 lama + 6
  baru), 0 fail.
- `node scripts/build.js s416-fuel-state-autosync-partial` → build
  sukses, sintaks kedua bundle valid, versi `v1122` -> `v1123`.
