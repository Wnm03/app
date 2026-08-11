# Sesi 415 (FUEL-AUTOSYNC-04, lanjutan rencana "Fuel Estimation Auto-Update")

## Konteks

Lanjutan dari s412 (full-tank auto-sync), s413 (badge sumber estimasi),
s414 (histori estimasi). Ketiganya dipilih lebih dulu krn ditandai lebih
ringan di rencana asli. Sisa yang belum dikerjakan sekarang cuma **Sesi 1
asli rencana** (`estimateCurrentLiter()`) & item-item yang MEMBLOK ke situ
(Sesi 2-6, guard KM non-monoton, guard akumulasi error fill-parsial) — jadi
sesi ini mengerjakan fondasinya duluan, sesuai catatan s414 sendiri.

## Perubahan

- `modules/vehicle/fuel-state-estimator.js` (BARU) — modul
  `FuelStateEstimator`, pure engine, pola sama persis `FuelGaugeEngine`
  (0 nulis ke D, 0 panggil `save()`, 0 DOM):
  - `estimateCurrentLiter(vehicleId)` — rumus terpusat:
    - Titik acuan = `veh.fuelState` (SUDAH otomatis "mana yang lebih baru"
      krn `FuelBarCorrection.save()` & `syncFuelStateFromFullTankBbm()`
      menulis field yang SAMA — begitu salah satu dipanggil terakhir,
      itulah titik acuan, 0 logic pembanding tanggal tambahan dibutuhkan).
    - `{ok:false, reason:'Data BBM saat ini belum ada (lakukan Koreksi
      BBM dulu)'}` kalau belum ada titik acuan sama sekali — pesan SAMA
      PERSIS dgn `FuelPredictionEngine`/`FuelInsightEngine` existing biar
      konsisten (belum diselaraskan ke sana, itu Sesi 4 — lihat "Belum
      ditangani").
    - Akumulasi log BBM PARSIAL sesudah titik acuan: `FuelStorage.logs()`
      difilter `!fullTank && km > referenceKm`, dijumlah literannya.
    - Konsumsi km: `deltaKm = currentKm(getVehicleKm()) - referenceKm`
      (di-clamp min 0 — lihat guard km non-monoton di bawah), dibagi
      `kmPerLiter` dari `fuelEfficiency()` (100% reuse, 0 rumus km/L baru).
    - `liter = baseLiter + addedLiter - consumedLiter`, di-clamp ke
      `[0, tankCapacityLiter]` lewat `FuelTankProfile.get()` (fallback
      clamp min 0 kalau profil tangki belum diatur — tanpa cap kapasitas).
  - Guard km non-monoton (versi DASAR — bukan versi lengkap dgn logging/
    nudge UI, itu tetap "saran tambahan" terpisah): delta km mentah
    negatif di-clamp ke 0, `kmClamped:true` menandakan ini terjadi. Tanpa
    guard ini, odometer yang di-reset/kendaraan diganti/salah input km
    bisa bikin `consumedLiter` negatif -> liter malah NAMBAH dari
    "berkendara mundur", yang jelas salah secara fisik — jadi guard dasar
    ini bagian dari korektnes engine itu sendiri, bukan fitur UX
    tambahan, makanya dimasukkan sesi ini (bukan ditunda spt guard
    akumulasi error fill-parsial).
  - `estimationLimited:true` kalau `referenceKm` (fuelState lama sblm
    sesi ini) ATAU `kmPerLiter` (data BBM belum cukup) tidak tersedia —
    engine TETAP `ok:true` & balikin `baseLiter (+ addedLiter kalau ada)`
    apa adanya, TIDAK mencoba extrapolasi dari baseline km yang tidak
    diketahui (lebih baik angka lama yang benar drpd angka baru yang
    salah).
  - `estimatedSource`/`confidenceScore` diteruskan APA ADANYA dari titik
    acuan — engine ini TIDAK menentukan source/confidence baru (itu ranah
    Sesi 5 "confidence decay" lanjutan, belum dikerjakan).

- **Dependency baru: `fuelState.referenceKm`.** Titik acuan lama (sebelum
  sesi ini) cuma simpan `currentFuelBar/currentFuelLiter/correctedAt/
  estimatedSource/confidenceScore` — TIDAK ada km kendaraan saat titik
  acuan itu ditulis, jadi TIDAK MUNGKIN menghitung "sudah berapa km
  ditempuh sejak titik acuan" tanpa itu. Ditambahkan di 2 tempat (1 baris
  masing-masing, 100% reuse `getVehicleKm()` global yang SUDAH ADA,
  additive & backward-compatible):
  - `modules/vehicle/fuel-intelligence-ui.js`
    (`FuelBarCorrection.save()`): `referenceKm:
    getVehicleKm(this.curVehicleId)`.
  - `modules/finance/tx-bbm.js` (`syncFuelStateFromFullTankBbm()`):
    `referenceKm: getVehicleKm(vehicleId)` — dipanggil SETELAH
    `recordBbmLog()` push log BBM baru ke `D.bbmLogs`, jadi
    `getVehicleKm()` ikut membaca km log yang baru saja disimpan itu
    (konsisten, referenceKm = km SAAT full-tank fill itu terjadi).
  - Kedua tempat guard `typeof getVehicleKm === 'function'` -> `null`
    kalau belum dimuat (mis. test yang cuma load 1 file), TIDAK PERNAH
    menggagalkan save/sync itu sendiri gara-gara field tambahan ini.

- `scripts/build.js`: daftarkan `fuel-state-estimator.js` di GROUP_A,
  ditaruh setelah `fuel-gauge-engine.js` (dependency: `FuelTankProfile`,
  `fuelEfficiency()`, `getVehicleKm()` — semua sudah dimuat sebelum titik
  ini) & sebelum `fuel-history.js`.

- Test baru:
  - `tests/fuel-state-estimator.test.js` (10 test) — kendaraan tidak
    ditemukan, belum ada titik acuan, `referenceKm` tidak ada (data lama,
    `estimationLimited`), konsumsi km normal, akumulasi partial fill
    (termasuk log SEBELUM titik acuan & log kendaraan lain — keduanya
    HARUS tidak ikut kehitung), guard km non-monoton (`kmClamped`), guard
    `fuelEfficiency()` data belum cukup, clamp kapasitas tangki, guard
    modul dependency belum dimuat (`typeof`), fallback tanpa profil
    tangki.

## Yang BELUM ditangani (sisa rencana)

- **Belum ada KONSUMEN** yang memanggil `estimateCurrentLiter()` — sesi
  ini murni fondasi (pure engine), sama seperti `FuelGaugeEngine` dulu
  sebelum di-wire ke `FuelCard`. Sesi 2-6 asli rencana masih menunggu:
  - Sesi 2: SSOT write hook di `recordBbmLog()` (tulis `fuelState` di
    SETIAP log BBM baru, bukan cuma full tank, tandai
    `estimatedSource:'auto-bbm-log'`).
  - Sesi 3: `FuelCard.render()`/`FuelIntelligenceEngine.vehicleInsight()`
    re-estimate pakai `estimateCurrentLiter()` tanpa nunggu transaksi BBM
    baru (riset sumber KM real-time paling reliable — kandidat kuat:
    `getVehicleKm()` yang sudah dipakai engine ini).
  - Sesi 4: `FuelPredictionEngine`/`FuelInsightEngine` baca lewat
    estimator ini, bukan `fuelState.currentFuelLiter` mentah.
  - Sesi 5: confidence decay otomatis (`_confidence()` stub sudah ada di
    `FuelGaugeEngine` sejak TASK-143, masih sengaja tidak dipanggil).
  - Sesi 6: regression test suite (update test lama yang implisit
    mengasumsikan "partial fill tidak update bar").
- Guard KM non-monoton versi LENGKAP (logging/nudge UI "⚠️ Estimasi mulai
  kurang akurat" proaktif) & guard akumulasi error fill-parsial berturut-
  turut ("saran tambahan" di rencana asli) — versi DASAR (clamp diam-diam,
  lihat di atas) sudah cukup utk korektnes engine, tapi belum ada
  signal/UI apa pun ke user saat itu terjadi.
- Badge sumber estimasi granular ala "📉 Estimasi (belum dikoreksi X
  hari)" — badge existing di `fuel-card.js` (s413) masih baca
  `fuelState.estimatedSource` mentah, BELUM baca hasil
  `estimateCurrentLiter()` (butuh Sesi 3 dulu).

## Verifikasi

- `node --test tests/*.test.js` → **2770/2770 pass** (2760 lama + 10
  baru), 0 fail.
- `node scripts/build.js s415-fuel-state-estimator` → build sukses,
  sintaks kedua bundle valid, versi `v1121` -> `v1122`.
