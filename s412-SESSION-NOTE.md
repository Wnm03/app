# Sesi 412 (FUEL-AUTOSYNC-01, sesi 1/N dari rencana "Fuel Estimation Auto-Update")

## Konteks

Audit user (screenshot Fuel Intelligence card) menemukan gap: card & bar
gauge di Fuel Card SUDAH auto-refresh tiap transaksi BBM tersimpan (lewat
`renderCnTab()` -> `FuelCard.render()`), TAPI fitur turunan
`FuelPredictionEngine` (estimasi jarak tersisa) & `FuelInsightEngine.
getReserveStatus()` (status cadangan) baca `D.vehicles[i].fuelState.
currentFuelLiter` LANGSUNG tanpa fallback ke log BBM — field itu SEBELUM
sesi ini CUMA ditulis oleh `FuelBarCorrection.save()` (tombol manual
"⚙️ Koreksi"). Akibatnya kedua fitur itu selalu `{ok:false, reason:'Data
BBM saat ini belum ada (lakukan Koreksi BBM dulu)'}` walau user rajin catat
isi BBM full tank.

Rencana lengkap ("Fuel Estimation Auto-Update", 6 sesi + saran tambahan)
sudah didiskusikan dgn user sebelum sesi ini. Sesi ini SENGAJA scope
paling ringan: nulis `fuelState` otomatis utk kasus FULL TANK saja (ground
truth objektif, 0 rumus baru). Depletion/akumulasi dari isi BBM PARSIAL +
peluruhan berbasis km (Sesi 1 asli di rencana, lebih berat/butuh riset
sumber odometer) DITUNDA ke sesi lain (1 task = 1 sesi).

## Perubahan

- `modules/finance/tx-bbm.js`:
  - `recordBbmLog()` — tambah pemanggilan `syncFuelStateFromFullTankBbm(vehicleId)`
    di KEDUA jalur (log baru & edit log existing), HANYA kalau
    `opts.fullTank===true`. Isi BBM parsial (fullTank:false) TIDAK
    disentuh sama sekali — fuelState lama (baik kosong maupun hasil
    koreksi manual sebelumnya) tetap utuh.
  - `syncFuelStateFromFullTankBbm(vehicleId)` (BARU) — 100% REUSE
    `FuelTankProfile.get()` (TASK-142) + `FuelGaugeEngine.
    calculateFuelBar()` (TASK-143, SUDAH ADA) utk konversi liter->bar. 0
    rumus konversi baru. Tulis `veh.fuelState = {currentFuelBar,
    currentFuelLiter:tankCapacityLiter, correctedAt, estimatedSource:
    'auto-bbm-log-full', confidenceScore:90}` — confidence 90 (di bawah
    manual/100, krn full tank = ground truth objektif tapi tetap bukan
    pembacaan speedometer fisik langsung). Guard `typeof
    FuelTankProfile`/`FuelGaugeEngine`/`D.vehicles`/kendaraan
    ditemukan/`tankCapacityLiter` terisi — diam (return) kalau salah satu
    gagal, TIDAK PERNAH bikin `recordBbmLog()` gagal gara-gara sync
    opsional ini.
- `tests/fuel-state-autosync.test.js` (BARU) — 7 test: full-tank baru
  nulis fuelState, parsial tidak nulis, parsial tidak menimpa koreksi
  manual lama, edit log existing jadi full-tank ikut ter-update, profil
  tangki belum diatur -> tidak throw, kendaraan tidak ditemukan -> tidak
  throw, nilai `currentFuelBar` dari `FuelGaugeEngine.calculateFuelBar()`
  dipakai apa adanya (bukan hardcode `fuelBarCount`). Load bareng file ASLI
  `fuel-tank-profile.js`+`fuel-gauge-engine.js` (bukan mock) lewat
  `loadSource()`.

## Yang BELUM ditangani sesi ini (lanjutan direncanakan)

- Isi BBM parsial tidak mengurangi/menambah estimasi (butuh formula
  akumulasi + km driven sejak titik acuan — Sesi berikutnya).
- Tidak ada peluruhan otomatis berbasis km/waktu setelah full-tank fill
  (bar tetap 100% statis sampai full-tank fill berikutnya atau koreksi
  manual).
- `confidenceScore` masih statis (tidak meluruh seiring waktu) — direncana
  di sesi "confidence decay".
- Badge sumber estimasi di UI (manual/auto/stale) — belum ada, direncana
  sesi terpisah (murni presenter, ringan, bisa dikerjakan kapan saja
  setelah sesi ini).

## Verifikasi

- `node --test tests/*.test.js` → **2739/2739 pass** (2732 lama + 7 baru),
  0 fail.
- `node scripts/build.js s412-fuel-autosync-01` → build sukses, sintaks
  kedua bundle valid, versi `v1118` → `v1119`.
