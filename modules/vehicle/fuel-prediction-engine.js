// fuel-prediction-engine.js — Fuel Consumption Prediction Engine (TASK-146).
//
// PRINSIP: engine-only, 0 UI, PURE (read-only, tidak pernah panggil save()
// atau menulis ke D). 100% REUSE modul fuel yang SUDAH ADA — 0 rumus
// bar/liter/persen/km/L/Rp per km baru dihitung di sini:
//   - FuelGaugeEngine (TASK-143)      -> estimateRemainingDistance()/
//                                        getReserveStatus() utk konversi
//                                        sisa BBM (liter) -> jarak (km).
//   - FuelTankProfile (TASK-142)      -> dipakai TIDAK LANGSUNG lewat
//                                        FuelGaugeEngine (yang sudah
//                                        REUSE FuelTankProfile.get()
//                                        sendiri) — modul ini TIDAK
//                                        pernah panggil FuelTankProfile
//                                        langsung.
//   - fuelEfficiency() (vehicle-core.js, global SUDAH ADA) -> km/L,
//     Rp/km, kmPerDay, DAN proyeksi estMonthlyKm/estMonthlyLiter/
//     estMonthlyCost yang SUDAH dihitung di sana (dipakai APA ADANYA
//     utk predictMonthlyFuelUsage(), bukan dihitung ulang).
//   - D.vehicles[i].fuelState (currentFuelLiter/currentFuelBar/
//     confidenceScore, field additive TASK-144, ditulis
//     FuelBarCorrection.save()) -> dibaca APA ADANYA, TIDAK PERNAH
//     ditulis/diubah oleh modul ini.
//
// TIDAK disentuh sama sekali (sesuai batasan task): FuelGaugeEngine
// (kalkulasi), D.bbmLogs (riwayat transaksi BBM), FuelTankProfile,
// business logic modul fuel-* lain mana pun.
//
// ALGORITMA (deterministik, rule-based, BUKAN machine learning):
//   Fuel Efficiency (fuelEfficiency()/FuelGaugeEngine)
//     -> Current Fuel (D.vehicles[i].fuelState.currentFuelLiter)
//     -> Recent Driving Pattern (kmPerDay dari fuelEfficiency(), yang
//        sendiri REUSE estimateKmPerDay() dari histori D.kmLogs/
//        D.bbmLogs)
//     -> Average Daily Distance (kmPerDay di atas)
//     -> Prediction (4 method publik di bawah)
//
// FUTURE READY: setiap method publik memanggil _applyAdjustments()
// (extension point) SEBELUM balikin angka akhir — stub ini SENGAJA
// selalu mengembalikan nilai apa adanya (factor 1x) sekarang. Sesi
// masa depan yang mau menambah weather/traffic/riding-style/seasonal
// adjustment tinggal isi logic di _applyAdjustments() TANPA mengubah
// signature/shape return API publik mana pun di file ini.
//
// KONTRAK ERROR: semua method publik balikin {ok:false, reason} kalau
// gagal (kendaraan tidak ditemukan, fuel state/profil tangki/histori
// belum cukup, dependency belum dimuat) — TIDAK PERNAH throw.
//
// SESI 4 (FUEL-AUTOSYNC-07, lanjutan rencana "Fuel Estimation
// Auto-Update"): predictRemainingDistance()/predictNextRefuel() sekarang
// ambil liter via _currentLiter() (BARU, di bawah) — 100% REUSE
// FuelStateEstimator.estimateCurrentLiter() (s415) kalau tersedia, jadi
// prediksi ikut "hidup" mengikuti km tanpa nunggu BBM log baru (selaras
// FuelCard s417). Fallback ke fuelState.currentFuelLiter snapshot lama
// tetap ada, 0 behavior lama hilang.
//
// SESI 5 (FUEL-AUTOSYNC-08): _confidence() sekarang REUSE
// FuelStateEstimator.estimateCurrentLiter().decayedConfidenceScore (BARU)
// — confidenceScore yang dibalikin predictRemainingDistance() sudah
// meluruh sesuai km sejak titik acuan, bukan angka statis 70/90/100 lagi.
// Fallback ke fuelState.confidenceScore apa adanya tetap ada, pola sama.
const FuelPredictionEngine = {

// RP_ROUND_PER_LITER — presisi pembulatan liter di hasil publik (2
// desimal, konsisten dgn FuelGaugeEngine.calculateFuelLiter()).
_roundLiter(n) {
  return Math.round(n * 100) / 100;
},

// _vehicles()/_vehicle(vehicleId) — pola SAMA PERSIS FuelTankProfile/
// FuelStorage/VehicleIntelligence dkk: baca D.vehicles apa adanya lewat
// guard typeof, cari 1 kendaraan by id.
_vehicles() {
  return (typeof D !== 'undefined' && D.vehicles) ? D.vehicles : [];
},
_vehicle(vehicleId) {
  return this._vehicles().find((v) => v.id === vehicleId) || null;
},

// _fuelState(vehicleId) — baca D.vehicles[i].fuelState APA ADANYA
// (field additive TASK-144, ditulis FuelBarCorrection.save()). Balikin
// null kalau kendaraan tidak ada ATAU fuelState belum ada/currentFuelLiter
// belum berupa angka valid (mis. kendaraan baru yang belum pernah
// dikoreksi lewat FuelBarCorrection) — caller publik menerjemahkan ini
// jadi {ok:false, reason} yang jelas, BUKAN menebak angka.
_fuelState(vehicleId) {
  const veh = this._vehicle(vehicleId);
  if (!veh || !veh.fuelState) return null;
  const fs = veh.fuelState;
  if (typeof fs.currentFuelLiter !== 'number' || !isFinite(fs.currentFuelLiter)) return null;
  return fs;
},

// _confidence(vehicleId, fuelState) — SESI 5 (FUEL-AUTOSYNC-08, lanjutan
// rencana "Fuel Estimation Auto-Update", confidence decay dinamis): 100%
// REUSE FuelStateEstimator.estimateCurrentLiter().decayedConfidenceScore
// (BARU, s419 estimator) kalau tersedia & ok:true — confidenceScore yang
// dibalikin sekarang sudah meluruh sesuai km sejak titik acuan, bukan
// angka statis lagi. Fallback ke fuelState.confidenceScore APA ADANYA
// (pola lama) kalau FuelStateEstimator belum dimuat ATAU estimator
// ok:false — 0 behavior lama hilang, pola guard sama persis
// _currentLiter() di bawah.
_confidence(vehicleId, fuelState) {
  if (typeof FuelStateEstimator !== 'undefined' && typeof FuelStateEstimator.estimateCurrentLiter === 'function') {
    const est = FuelStateEstimator.estimateCurrentLiter(vehicleId);
    if (est && est.ok && typeof est.decayedConfidenceScore === 'number') return est.decayedConfidenceScore;
  }
  return (fuelState && typeof fuelState.confidenceScore === 'number') ? fuelState.confidenceScore : null;
},

// _currentLiter(vehicleId, fuelState) — SESI 4 (FUEL-AUTOSYNC-07, lanjutan
// rencana "Fuel Estimation Auto-Update", selaras FuelCard._liveEstimate()
// s417): 100% REUSE FuelStateEstimator.estimateCurrentLiter() (s415) kalau
// tersedia & ok:true — balikin liter TERKINI (dihitung ulang berdasarkan
// akumulasi km sejak titik acuan SETIAP dipanggil), bukan snapshot beku
// fuelState.currentFuelLiter. Fallback ke fuelState.currentFuelLiter apa
// adanya kalau FuelStateEstimator belum dimuat ATAU estimator ok:false
// (mis. belum ada titik acuan sama sekali) — prediksi TIDAK PERNAH gagal
// gara-gara sumber baru ini, pola guard sama persis FuelCard s417.
_currentLiter(vehicleId, fuelState) {
  if (typeof FuelStateEstimator !== 'undefined' && typeof FuelStateEstimator.estimateCurrentLiter === 'function') {
    const est = FuelStateEstimator.estimateCurrentLiter(vehicleId);
    if (est && est.ok && typeof est.liter === 'number') return est.liter;
  }
  return fuelState.currentFuelLiter;
},

// _applyAdjustments(value, vehicleId, kind) — EXTENSION POINT (requirement
// "Future Ready": weather/traffic/riding style/seasonal prediction).
// SENGAJA belum diimplementasikan sesi ini — selalu balikin `value` apa
// adanya (factor 1x, deterministik). `vehicleId`/`kind` ('distance'|
// 'nextRefuel'|'monthly'|'yearly') disediakan sbg parameter supaya sesi
// masa depan yang mengisi logic ini punya konteks tanpa perlu mengubah
// signature method publik mana pun di file ini.
_applyAdjustments(value, vehicleId, kind) {
  return value;
},

// predictRemainingDistance(vehicleId) — estimasi jarak tempuh tersisa
// (km) dari sisa BBM saat ini. 100% REUSE
// FuelGaugeEngine.estimateRemainingDistance() (yang sendiri REUSE
// FuelTankProfile.get() + fuelEfficiency() global) — 0 rumus km/L baru.
// Return: {ok:true, remainingKm, currentFuelLiter, kmPerLiter,
//   confidenceScore} kalau sukses. {ok:false, reason} kalau: kendaraan
//   tidak ditemukan, fuelState/currentFuelLiter belum ada (belum pernah
//   dikoreksi lewat FuelBarCorrection), FuelGaugeEngine belum dimuat,
//   profil tangki belum diatur, atau data efisiensi BBM belum cukup
//   (reason FuelGaugeEngine diteruskan apa adanya).
predictRemainingDistance(vehicleId) {
  const veh = this._vehicle(vehicleId);
  if (!veh) return { ok: false, reason: 'Kendaraan tidak ditemukan' };
  const fuelState = this._fuelState(vehicleId);
  if (!fuelState) return { ok: false, reason: 'Data BBM saat ini belum ada (lakukan Koreksi BBM dulu)' };
  if (typeof FuelGaugeEngine === 'undefined') return { ok: false, reason: 'FuelGaugeEngine belum dimuat' };
  const liter = this._currentLiter(vehicleId, fuelState);
  const dist = FuelGaugeEngine.estimateRemainingDistance(vehicleId, liter);
  if (!dist.ok) return dist;
  return {
    ok: true,
    remainingKm: this._applyAdjustments(dist.km, vehicleId, 'distance'),
    currentFuelLiter: liter,
    kmPerLiter: dist.kmPerLiter,
    confidenceScore: this._confidence(vehicleId, fuelState),
  };
},

// predictNextRefuel(vehicleId) — estimasi kapan (tanggal) & berapa hari
// lagi kendaraan perlu isi BBM lagi, dari sisa BBM DI ATAS ambang
// reserve (100% REUSE FuelGaugeEngine.getReserveStatus() utk
// literAboveReserve + FuelGaugeEngine.estimateRemainingDistance() utk
// konversi ke km) dibagi rata-rata jarak harian (100% REUSE
// fuelEfficiency().kmPerDay, yang sendiri REUSE estimateKmPerDay() dari
// histori D.kmLogs/D.bbmLogs) — 0 rumus baru.
// Return: {ok:true, estimatedDate, estimatedRemainingDays,
//   estimatedRemainingKm} kalau sukses — estimatedDate format ISO
//   (YYYY-MM-DD, via dateToISO() global SUDAH ADA), estimatedRemainingDays
//   dibulatkan ke atas (Math.ceil, minimal 0). {ok:false, reason} kalau:
//   kendaraan tidak ditemukan, fuel state belum ada, FuelGaugeEngine/
//   fuelEfficiency belum dimuat, profil tangki belum diatur, atau pola
//   berkendara harian belum cukup data (kmPerDay null/<=0).
predictNextRefuel(vehicleId) {
  const veh = this._vehicle(vehicleId);
  if (!veh) return { ok: false, reason: 'Kendaraan tidak ditemukan' };
  const fuelState = this._fuelState(vehicleId);
  if (!fuelState) return { ok: false, reason: 'Data BBM saat ini belum ada (lakukan Koreksi BBM dulu)' };
  if (typeof FuelGaugeEngine === 'undefined') return { ok: false, reason: 'FuelGaugeEngine belum dimuat' };
  const reserve = FuelGaugeEngine.getReserveStatus(vehicleId, this._currentLiter(vehicleId, fuelState));
  if (!reserve.ok) return reserve;
  const dist = FuelGaugeEngine.estimateRemainingDistance(vehicleId, reserve.literAboveReserve);
  if (!dist.ok) return dist;
  if (typeof fuelEfficiency !== 'function') return { ok: false, reason: 'fuelEfficiency belum dimuat' };
  const eff = fuelEfficiency(vehicleId);
  if (!eff.ok) return { ok: false, reason: eff.reason || 'Data pola berkendara belum cukup' };
  if (!eff.kmPerDay || eff.kmPerDay <= 0) {
    return { ok: false, reason: 'Pola berkendara harian belum cukup utk estimasi tanggal isi ulang' };
  }
  const remainingKm = this._applyAdjustments(dist.km, vehicleId, 'nextRefuel');
  const estimatedRemainingDays = Math.max(0, Math.ceil(remainingKm / eff.kmPerDay));
  let estimatedDate = null;
  if (typeof dateToISO === 'function') {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + estimatedRemainingDays);
    estimatedDate = dateToISO(d);
  }
  return { ok: true, estimatedDate, estimatedRemainingDays, estimatedRemainingKm: remainingKm };
},

// predictMonthlyFuelUsage(vehicleId) — proyeksi pemakaian BBM (liter) &
// biaya (Rp) SEBULAN ke depan. 100% REUSE fuelEfficiency() global —
// field estMonthlyLiter/estMonthlyCost SUDAH dihitung di sana (asumsi
// 30 hari, pemakaian flat sesuai rata-rata histori), dipakai APA ADANYA
// di sini (requirement "Do NOT create duplicate calculations" — 0 rumus
// proyeksi bulanan baru ditulis ulang).
// Return: {ok:true, estimatedLiter, estimatedCost} kalau sukses —
//   estimatedLiter dibulatkan 2 desimal, estimatedCost dibulatkan
//   (Math.round). {ok:false, reason} kalau: kendaraan tidak ditemukan,
//   fuelEfficiency belum dimuat, data BBM (min. 2 log Isi Full Tank)
//   kurang, atau histori km/pola harian belum cukup (estMonthlyLiter/
//   estMonthlyCost masih null di fuelEfficiency()).
predictMonthlyFuelUsage(vehicleId) {
  const veh = this._vehicle(vehicleId);
  if (!veh) return { ok: false, reason: 'Kendaraan tidak ditemukan' };
  if (typeof fuelEfficiency !== 'function') return { ok: false, reason: 'fuelEfficiency belum dimuat' };
  const eff = fuelEfficiency(vehicleId);
  if (!eff.ok) return { ok: false, reason: eff.reason || 'Data BBM belum cukup' };
  if (eff.estMonthlyLiter == null || eff.estMonthlyCost == null) {
    return { ok: false, reason: 'Pola berkendara harian belum cukup utk proyeksi bulanan' };
  }
  return {
    ok: true,
    estimatedLiter: this._roundLiter(this._applyAdjustments(eff.estMonthlyLiter, vehicleId, 'monthly')),
    estimatedCost: Math.round(this._applyAdjustments(eff.estMonthlyCost, vehicleId, 'monthly')),
  };
},

// predictYearlyFuelUsage(vehicleId) — proyeksi pemakaian BBM (liter) &
// biaya (Rp) SETAHUN ke depan. 100% REUSE predictMonthlyFuelUsage() di
// atas (yang sendiri REUSE fuelEfficiency()) dikali 12 — TIDAK ada
// rumus tahunan independen (mis. dari kmPerDay*365 langsung), sengaja
// diturunkan dari proyeksi bulanan yang sama supaya angka bulanan x12
// SELALU konsisten dgn angka tahunan (0 kemungkinan 2 formula
// menyimpang), sesuai requirement "Do NOT create duplicate calculations".
// Return: {ok:true, estimatedLiter, estimatedCost} kalau sukses (liter
//   2 desimal, cost dibulatkan). {ok:false, reason} — sama persis
//   predictMonthlyFuelUsage() (diteruskan apa adanya).
predictYearlyFuelUsage(vehicleId) {
  const monthly = this.predictMonthlyFuelUsage(vehicleId);
  if (!monthly.ok) return monthly;
  return {
    ok: true,
    estimatedLiter: this._roundLiter(monthly.estimatedLiter * 12),
    estimatedCost: Math.round(monthly.estimatedCost * 12),
  };
},

};
