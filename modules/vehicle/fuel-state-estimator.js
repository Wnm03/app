// fuel-state-estimator.js — FuelStateEstimator (Sesi 1 asli rencana "Fuel
// Estimation Auto-Update", FUEL-AUTOSYNC-04): estimateCurrentLiter(vehicleId)
// pure engine, fondasi Sesi 2-6 lanjutan rencana yang sama.
//
// TUJUAN: satu rumus terpusat "berapa liter BBM sekarang, TANPA nunggu user
// tap Koreksi manual" — dari titik acuan terakhir yang SUDAH ADA
// (veh.fuelState, ditulis FuelBarCorrection.save() ATAU
// syncFuelStateFromFullTankBbm(), MANA YANG LEBIH BARU — krn keduanya
// menulis field yang SAMA, veh.fuelState SELALU otomatis jadi titik acuan
// paling baru begitu salah satu dipanggil terakhir kali, 0 logic pembanding
// tanggal tambahan dibutuhkan di sini) + akumulasi liter dari log BBM
// PARSIAL sesudahnya (isi bensin yang bukan full tank, belum pernah
// tercatat ke fuelState) − liter yang dipakai sejak titik acuan (dihitung
// dari delta KM / kmPerLiter, 100% REUSE fuelEfficiency() global
// vehicle-core.js, 0 rumus konsumsi baru ditulis di sini).
//
// PURE: 0 nulis ke D, 0 panggil save(), 0 DOM. Read-only murni, pola sama
// persis FuelGaugeEngine/FuelStorage/FuelTankProfile.
//
// DEPENDENCY BARU (referenceKm): titik acuan fuelState SEBELUM sesi ini
// cuma simpan currentFuelLiter/currentFuelBar/correctedAt/estimatedSource/
// confidenceScore — TIDAK ada km kendaraan saat titik acuan itu ditulis,
// jadi TIDAK MUNGKIN menghitung "sudah berapa km ditempuh sejak titik
// acuan" tanpa itu. Sesi ini menambah field fuelState.referenceKm (ditulis
// FuelBarCorrection.save() di fuel-intelligence-ui.js & syncFuelState
// FromFullTankBbm() di tx-bbm.js, 100% REUSE getVehicleKm() global yang
// SUDAH ADA — additive & backward-compatible, fuelState LAMA yang ditulis
// SEBELUM sesi ini tidak punya field ini).
// GUARD WAJIB: kalau referenceKm tidak ada (data lama / belum pernah
// dikoreksi ulang sejak sesi ini ada), estimator TETAP balikin ok:true
// (SSOT tetap currentFuelLiter apa adanya, pola sama _currentEstimate()
// lama di fuel-intelligence-ui.js) tapi TIDAK mencoba menghitung delta
// km/akumulasi partial fill (estimationLimited:true) — lebih baik angka
// lama yang benar drpd angka baru yang salah krn extrapolasi dari baseline
// yang tidak diketahui km-nya.
//
// GUARD KM NON-MONOTON (versi dasar, bukan versi lengkap — versi lengkap
// dgn logging/nudge UI direncanakan sesi terpisah, lihat "saran tambahan"
// di rencana "Fuel Estimation Auto-Update"): delta km negatif (odometer
// di-reset/ganti kendaraan/salah input) DI-CLAMP ke 0, TIDAK PERNAH bikin
// liter malah nambah dari "berkendara mundur". `kmClamped:true` menandakan
// ini terjadi.
// SESI 5 (FUEL-AUTOSYNC-08, lanjutan rencana "Fuel Estimation
// Auto-Update"): confidence decay dinamis. Sebelum sesi ini,
// confidenceScore yang diteruskan estimateCurrentLiter() cuma nilai
// STATIS titik acuan (70/90/100 tergantung sumber tulis, lihat
// tx-bbm.js/fuel-intelligence-ui.js) — tidak pernah turun walau sudah
// berapa km pun ditempuh sejak titik acuan itu. Sesi ini menambah field
// BARU `decayedConfidenceScore` (additive, field `confidenceScore` lama
// TIDAK diubah/dihapus — konsumen existing yang baca field lama tetap
// dapat nilai apa adanya, 0 breaking change) — meluruh linear per
// `DECAY_KM_PER_POINT` km sejak titik acuan (`deltaKm`, field yang SUDAH
// dihitung di atas, 0 rumus km baru), dilantai di `MIN_CONFIDENCE_SCORE`
// (skor estimasi manapun, walau sudah sangat jauh dari titik acuan,
// tidak pernah dianggap SEPENUHNYA tidak bisa dipercaya — user tetap
// dapat angka, bukan blank). Kalau `deltaKm` tidak diketahui
// (estimationLimited:true — referenceKm/kmPerLiter belum ada, SAMA
// persis kondisi yang bikin decay mustahil dihitung) atau confidenceScore
// dasar tidak ada, `decayedConfidenceScore` diteruskan APA ADANYA dari
// confidenceScore dasar (null tetap null) — TIDAK pernah menebak decay
// dari data yang tidak ada.
// SESI 422 (lanjutan "saran tambahan" rencana "Fuel Estimation
// Auto-Update", item TERAKHIR yang tersisa dari s420/s421): guard
// akumulasi error fill-parsial berturut-turut. BEDA dari guard km
// non-monoton (di atas) -- ini bukan soal odometer mundur, tapi soal
// SETIAP log BBM parsial itu `liter` HASIL INPUT MANUAL user (bukan
// terukur presisi kayak full-tank fill yang "mengisi sampai penuh" jadi
// otomatis akurat) — makin banyak partial fill NUMPUK berturut-turut
// sejak titik acuan terakhir TANPA pernah di-reset lewat full-tank
// fill/koreksi manual baru, makin besar potensi error kumulatif
// (`addedLiter`) ikut numpuk juga. Field BARU `partialFillDriftRisk`
// (additive, 0 field lama diubah) -- true kalau jumlah partial fill
// sejak titik acuan (`partials.length`, SUDAH dihitung di atas sbg
// `partialFillsCounted`) sudah >= `PARTIAL_FILL_DRIFT_THRESHOLD`. 0
// rumus baru -- murni ambang hitung ulang dari angka yang sudah ada,
// pola sama persis DECAY_KM_PER_POINT/MIN_CONFIDENCE_SCORE di atas.
const FuelStateEstimator = {

// DECAY_KM_PER_POINT — tiap km ini ditempuh sejak titik acuan,
// decayedConfidenceScore turun 1 poin (dibulatkan ke bawah,
// Math.floor). MIN_CONFIDENCE_SCORE — lantai skor, decay tidak pernah
// menurunkan skor di bawah ini. Keduanya konstanta tampilan/ambang
// (pola sama persis LOW_CONFIDENCE_THRESHOLD di fuel-card.js), bukan
// rumus konsumsi/estimasi baru.
DECAY_KM_PER_POINT: 15,
MIN_CONFIDENCE_SCORE: 30,

// PARTIAL_FILL_DRIFT_THRESHOLD — SESI 422: jumlah partial fill
// berturut-turut sejak titik acuan yang memicu partialFillDriftRisk:true.
// Ambang tampilan/hint (bukan rumus konsumsi baru), pola sama persis
// 2 konstanta di atas.
PARTIAL_FILL_DRIFT_THRESHOLD: 3,

_vehicles() {
  return (typeof D !== 'undefined' && D.vehicles) ? D.vehicles : [];
},

_vehicle(vehicleId) {
  return this._vehicles().find((v) => v.id === vehicleId) || null;
},

_isValidNumber(n) {
  return typeof n === 'number' && isFinite(n);
},

// _partialFillsSince(vehicleId, referenceKm) — semua log BBM PARSIAL
// (fullTank falsy) dgn km > referenceKm (STRIK — kalau referenceKm
// berasal dari full-tank fill, log full-tank itu sendiri tidak ikut
// kehitung dobel sbg "partial"). 100% REUSE FuelStorage.logs() (SUDAH
// ADA). Guard typeof FuelStorage: kalau belum dimuat, balikin array
// kosong (bukan error) — estimasi tetap jalan, cuma tanpa akumulasi
// partial fill (sama seperti kalau memang tidak ada log parsial sama
// sekali).
_partialFillsSince(vehicleId, referenceKm) {
  if (typeof FuelStorage === 'undefined') return [];
  return FuelStorage.logs(vehicleId).filter((log) => (
    !log.fullTank && this._isValidNumber(log.km) && log.km > referenceKm
    && this._isValidNumber(log.liter) && log.liter > 0
  ));
},

// estimateCurrentLiter(vehicleId) — lihat catatan header file.
// Return sukses: {
//   ok:true, vehicleId, liter (estimasi terkini, 2 desimal, di-clamp ke
//     [0, tankCapacityLiter] kalau profil tangki tersedia),
//   baseLiter (titik acuan, fuelState.currentFuelLiter apa adanya),
//   referenceKm (null kalau fuelState lama tanpa field ini),
//   currentKm (getVehicleKm() saat ini, null kalau fungsi belum dimuat),
//   deltaKm (currentKm − referenceKm, di-clamp min 0; null kalau
//     referenceKm tidak ada),
//   kmClamped (true kalau delta km mentah negatif & di-clamp ke 0),
//   addedLiter (jumlah liter dari log BBM parsial sejak titik acuan),
//   partialFillsCounted (jumlah log parsial yang ikut dihitung),
//   partialFillDriftRisk (SESI 422: true kalau partialFillsCounted sudah
//     >= PARTIAL_FILL_DRIFT_THRESHOLD -- sinyal akumulasi error dari
//     input manual liter parsial berturut-turut, lihat catatan header
//     file),
//   consumedLiter (estimasi liter terpakai dari deltaKm/kmPerLiter),
//   kmPerLiter (dari fuelEfficiency(), null kalau data belum cukup),
//   estimationLimited (true kalau referenceKm ATAU kmPerLiter tidak
//     tersedia — artinya `liter` cuma baseLiter + addedLiter apa adanya,
//     TANPA pengurangan konsumsi km, krn salah satu input yang dibutuhkan
//     belum ada),
//   estimatedSource/confidenceScore (diteruskan APA ADANYA dari fuelState
//     titik acuan, TIDAK berubah dari sesi-sesi sebelumnya),
//   decayedConfidenceScore (SESI 5: confidenceScore di atas diluruhkan
//     berdasarkan deltaKm sejak titik acuan, lihat catatan header file —
//     sama dgn confidenceScore apa adanya kalau deltaKm tidak diketahui/
//     estimationLimited:true),
// }.
// Return gagal: {ok:false, reason} kalau: kendaraan tidak ditemukan, atau
//   belum ada titik acuan sama sekali (fuelState kosong/currentFuelLiter
//   bukan angka — user belum PERNAH koreksi manual maupun full-tank fill,
//   pesan SAMA PERSIS dgn FuelPredictionEngine/FuelInsightEngine existing
//   biar konsisten).
estimateCurrentLiter(vehicleId) {
  const veh = this._vehicle(vehicleId);
  if (!veh) return { ok: false, reason: 'Kendaraan tidak ditemukan' };
  const ref = veh.fuelState;
  if (!ref || !this._isValidNumber(ref.currentFuelLiter)) {
    return { ok: false, reason: 'Data BBM saat ini belum ada (lakukan Koreksi BBM dulu)' };
  }

  const baseLiter = ref.currentFuelLiter;
  const referenceKm = this._isValidNumber(ref.referenceKm) ? ref.referenceKm : null;
  const currentKmRaw = (typeof getVehicleKm === 'function') ? getVehicleKm(vehicleId) : null;
  const currentKm = this._isValidNumber(currentKmRaw) ? currentKmRaw : null;

  let deltaKm = null;
  let kmClamped = false;
  if (referenceKm !== null && currentKm !== null) {
    const rawDelta = currentKm - referenceKm;
    deltaKm = rawDelta < 0 ? 0 : rawDelta;
    kmClamped = rawDelta < 0;
  }

  const partials = referenceKm !== null ? this._partialFillsSince(vehicleId, referenceKm) : [];
  const addedLiter = partials.reduce((sum, log) => sum + log.liter, 0);

  let kmPerLiter = null;
  let consumedLiter = 0;
  if (typeof fuelEfficiency === 'function') {
    const eff = fuelEfficiency(vehicleId);
    if (eff && eff.ok && this._isValidNumber(eff.kmPerLiter) && eff.kmPerLiter > 0) {
      kmPerLiter = eff.kmPerLiter;
      if (deltaKm !== null) consumedLiter = deltaKm / kmPerLiter;
    }
  }

  const estimationLimited = referenceKm === null || kmPerLiter === null;
  const baseConfidence = this._isValidNumber(ref.confidenceScore) ? ref.confidenceScore : null;
  // decayedConfidenceScore -- lihat catatan header (SESI 5, confidence
  // decay). Decay HANYA bisa dihitung kalau deltaKm diketahui (bukan
  // estimationLimited) DAN ada confidenceScore dasar utk diluruhkan --
  // kalau tidak, diteruskan apa adanya (0 tebakan).
  let decayedConfidenceScore = baseConfidence;
  if (baseConfidence !== null && deltaKm !== null) {
    const decayed = baseConfidence - Math.floor(deltaKm / this.DECAY_KM_PER_POINT);
    decayedConfidenceScore = Math.max(this.MIN_CONFIDENCE_SCORE, Math.min(baseConfidence, decayed));
  }
  let liter = baseLiter + addedLiter - consumedLiter;

  let clamped = false;
  const profile = (typeof FuelTankProfile !== 'undefined') ? FuelTankProfile.get(vehicleId) : null;
  if (profile && this._isValidNumber(profile.tankCapacityLiter) && profile.tankCapacityLiter > 0) {
    const cl = Math.min(Math.max(liter, 0), profile.tankCapacityLiter);
    clamped = cl !== liter;
    liter = cl;
  } else if (liter < 0) {
    liter = 0;
    clamped = true;
  }

  return {
    ok: true,
    vehicleId,
    liter: Math.round(liter * 100) / 100,
    baseLiter,
    referenceKm,
    currentKm,
    deltaKm,
    kmClamped,
    addedLiter: Math.round(addedLiter * 100) / 100,
    partialFillsCounted: partials.length,
    partialFillDriftRisk: partials.length >= this.PARTIAL_FILL_DRIFT_THRESHOLD,
    consumedLiter: Math.round(consumedLiter * 100) / 100,
    kmPerLiter,
    estimationLimited,
    clamped,
    estimatedSource: ref.estimatedSource || null,
    confidenceScore: baseConfidence,
    decayedConfidenceScore,
  };
},

};
