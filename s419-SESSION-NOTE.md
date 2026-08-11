# Sesi 419 (FUEL-AUTOSYNC-08, "Sesi 5" rencana "Fuel Estimation Auto-Update")

## Konteks

Lanjutan s417 (Sesi 3: `FuelCard._liveEstimate()`) & s418 (Sesi 4:
`FuelPredictionEngine`/`FuelInsightEngine` ikut estimator). Giliran
**Sesi 5 asli rencana**: confidence decay dinamis — sebelum sesi ini
`confidenceScore` selalu angka STATIS (70/90/100 tergantung sumber
tulis: koreksi manual/auto full-tank/auto BBM log), tidak pernah turun
walau kendaraan sudah jalan puluhan/ratusan km sejak titik acuan
terakhir. Estimator (s415) sudah menghitung `deltaKm` (km sejak titik
acuan) setiap dipanggil — sesi ini memakainya utk meluruhkan skor
confidence, bukan cuma liter.

## Perubahan

- `modules/vehicle/fuel-state-estimator.js`:
  - `DECAY_KM_PER_POINT` (15) & `MIN_CONFIDENCE_SCORE` (30) (BARU) —
    konstanta ambang decay (pola sama persis `LOW_CONFIDENCE_THRESHOLD`
    di `fuel-card.js`), bukan rumus estimasi baru.
  - `estimateCurrentLiter()` — tambah field BARU `decayedConfidenceScore`
    di return (ADDITIVE, field `confidenceScore` lama TIDAK diubah/
    dihapus — 0 breaking change utk konsumen existing yang masih baca
    field lama). Formula: `confidenceScore dasar − floor(deltaKm /
    DECAY_KM_PER_POINT)`, di-clamp ke `[MIN_CONFIDENCE_SCORE,
    confidenceScore dasar]`. Kalau `deltaKm` tidak diketahui
    (`estimationLimited:true`) ATAU tidak ada confidenceScore dasar,
    `decayedConfidenceScore` diteruskan APA ADANYA dari confidenceScore
    dasar (0 tebakan dari data yang tidak ada).
- `modules/vehicle/fuel-prediction-engine.js`:
  - `_confidence(vehicleId, fuelState)` — signature tambah `vehicleId`,
    sekarang 100% REUSE
    `FuelStateEstimator.estimateCurrentLiter().decayedConfidenceScore`
    kalau tersedia & ok:true. Fallback ke `fuelState.confidenceScore`
    apa adanya (pola lama) kalau estimator belum dimuat/ok:false.
  - `predictRemainingDistance()` — satu-satunya caller `_confidence()`,
    diupdate ikut signature baru.
- `modules/vehicle/fuel-cost-analytics.js`:
  - `_confidenceScore(vehicleId)` — pola SAMA PERSIS
    `FuelPredictionEngine._confidence()` di atas (modul ini sendiri
    sudah mendokumentasikan dirinya "pola sama persis" sejak awal) —
    diupdate identik, supaya `projectedMonthlyCost()`/
    `projectedYearlyCost()` (dan lewat itu `FuelInsightEngine.
    getSummary().confidenceScore`, yang prioritas bacanya dari sini
    dulu sebelum `FuelPredictionEngine`) ikut decay-aware. Tanpa ini,
    decay Sesi 5 tidak akan pernah terlihat di summary card selama ada
    proyeksi bulanan.
- `modules/vehicle/fuel-card.js`:
  - `_currentConfidence(vehicleId)` (BARU) — 100% REUSE
    `FuelStateEstimator.estimateCurrentLiter().decayedConfidenceScore`,
    fallback ke `veh.fuelState.confidenceScore` apa adanya.
  - `_lowConfidenceHint(vehicleId)` — sekarang panggil
    `_currentConfidence()` (bukan baca `D.vehicles` langsung) — badge/
    rekomendasi pasif "sinkronkan dengan speedometer" (sudah ada sejak
    TASK-145) otomatis decay-aware, sesuai catatan s417
    ("estimationLimited... dicadangkan utk Sesi 5/6 biar tidak tumpang
    tindih dgn desain decay") — TIDAK ada badge/markup BARU ditambah,
    murni sumber skor yang dibaca hint yang sudah ada.
- `tests/fuel-state-estimator.test.js` (+6), `tests/fuel-prediction-
  engine.test.js` (+3), `tests/fuel-cost-analytics.test.js` (+3, `makeCtx()`
  terima parameter `FuelStateEstimator`), `tests/fuel-card.test.js` (+2).
- 0 field baru ditulis ke `D`, 0 rumus liter/km/L/reserve/proyeksi baru
  — decay HANYA pada satu field skor tampilan (`decayedConfidenceScore`),
  murni turunan `deltaKm` yang sudah dihitung `FuelStateEstimator`
  (s415).

## Yang BELUM ditangani (sisa rencana)

- Sesi 6: regression test suite komprehensif lintas Sesi 1-5 (audit
  ulang menyeluruh, bukan cuma test per-perubahan yang sudah ditambah
  tiap sesi).
- Badge UI baru yang secara eksplisit menampilkan `decayedConfidenceScore`
  (mis. angka skor di `_sourceBadgeHtml()`) TIDAK ditambah sesi ini —
  scope sesi ini murni membuat decay-nya ADA & dipakai hint yang sudah
  ada, bukan menambah presenter baru. Bisa jadi sesi terpisah kalau
  user mau lihat angka skornya langsung.

## Verifikasi

- `node --test tests/*.test.js` → **2804/2804 pass** (2791 lama + 13
  baru: 6 `fuel-state-estimator.test.js` + 3
  `fuel-prediction-engine.test.js` + 3 `fuel-cost-analytics.test.js` +
  2 `fuel-card.test.js`), 0 fail.
- `node scripts/build.js s419-fuel-confidence-decay` → build sukses,
  sintaks kedua bundle valid, versi `v1125` -> `v1126`.
