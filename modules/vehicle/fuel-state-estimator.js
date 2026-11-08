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
// Kalibrasi adaptif hanya mengubah parameter prediksi ke depan pada record
// kendaraan. Tidak pernah menulis ulang log BBM, KM, transaksi, atau baseline.
const FuelAdaptiveCalibration = {
  VERSION: 1,
  MIN_SEGMENTS: 3,
  MAX_SEGMENTS: 5,
  MAX_STEP_RATIO: 0.10,
  MAX_MEDIAN_DEVIATION: 0.20,
  BLEND_OLD_WEIGHT: 0.75,

  _vehicle(vehicleId) {
    return (typeof D !== 'undefined' && Array.isArray(D.vehicles))
      ? D.vehicles.find(v => String(v.id) === String(vehicleId)) || null : null;
  },

  get(vehicleId) {
    const v = this._vehicle(vehicleId);
    const c = v && v.fuelEfficiencyCalibration;
    if (!c || c.calibrationVersion !== this.VERSION
      || !Number.isFinite(Number(c.valueKmPerLiter))
      || Number(c.valueKmPerLiter) <= 0
      || !Number.isInteger(c.sampleCount) || c.sampleCount < this.MIN_SEGMENTS) return null;
    return c;
  },

  effectiveKmPerLiter(vehicleId, historicalKmPerLiter) {
    const c = this.get(vehicleId);
    return c ? Number(c.valueKmPerLiter) : historicalKmPerLiter;
  },

  invalidate(vehicleId, reason) {
    const v = this._vehicle(vehicleId);
    if (!v) return false;
    const hadCalibration = !!v.fuelEfficiencyCalibration;
    // Metadata sebelumnya disimpan agar rollback manual tetap memungkinkan.
    if (hadCalibration) {
      v.fuelEfficiencyCalibrationPrevious = {
        ...v.fuelEfficiencyCalibration,
        invalidatedAt: new Date().toISOString(),
        invalidationReason: String(reason || 'source-data-changed'),
      };
      delete v.fuelEfficiencyCalibration;
    }
    // Review yang dibuat dari sampel lama juga kedaluwarsa saat sumber berubah.
    delete v.fuelEfficiencyCalibrationReview;
    return hadCalibration;
  },

  _sampleSegments(vehicleId) {
    if (typeof getFuelFullTankSegments !== 'function') return [];
    const all = getFuelFullTankSegments(vehicleId);
    const suspect = (typeof getFuelSuspectSegmentIndexes === 'function') ? getFuelSuspectSegmentIndexes(all) : new Set();
    const usable = all.filter((seg, idx) => seg && !suspect.has(idx)
      && Number.isFinite(Number(seg.km)) && Number(seg.km) > 0
      && Number.isFinite(Number(seg.liter)) && Number(seg.liter) > 0
      && Number.isFinite(Number(seg.kmPerLiter))
      && Number(seg.kmPerLiter) >= 2 && Number(seg.kmPerLiter) <= 100);
    return usable.slice(-this.MAX_SEGMENTS).map(seg => {
      const pool = (typeof getFuelCanonicalLogs === 'function') ? getFuelCanonicalLogs(vehicleId).canonical : (D.bbmLogs || []);
      const logs = pool.filter(b => String(b.vehicleId) === String(vehicleId) && b.fullTank);
      const start = logs.find(b => Number(b.km) === Number(seg.startKm));
      const end = logs.find(b => Number(b.km) === Number(seg.endKm));
      return {
        kmPerLiter: Number(seg.kmPerLiter),
        id: [start && start.id || seg.startKm, end && end.id || seg.endKm].join('>'),
        endId: end && end.id || null,
      };
    });
  },

  _withoutOutliers(samples) {
    if (!Array.isArray(samples) || samples.length < 4) return Array.isArray(samples) ? samples.slice() : [];
    const values = samples.map(x => x.kmPerLiter).slice().sort((a,b) => a-b);
    const q = p => {
      const pos = (values.length - 1) * p, lo = Math.floor(pos), hi = Math.ceil(pos);
      return lo === hi ? values[lo] : values[lo] + (values[hi] - values[lo]) * (pos - lo);
    };
    const q1 = q(0.25), q3 = q(0.75), iqr = q3 - q1;
    const lower = q1 - 1.5 * iqr, upper = q3 + 1.5 * iqr;
    return samples.filter(x => x.kmPerLiter >= lower && x.kmPerLiter <= upper);
  },

  calibrate(vehicleId, triggeringLog) {
    const v = this._vehicle(vehicleId);
    if (!v || !triggeringLog || !triggeringLog.fullTank || !triggeringLog.id) return { ok: false, reason: 'trigger-invalid' };
    const previous = this.get(vehicleId);
    if (previous && previous.lastProcessedBbmId === triggeringLog.id) return { ok: true, skipped: 'already-processed' };
    const tankProfile = typeof FuelTankProfile !== 'undefined' && FuelTankProfile && typeof FuelTankProfile.get === 'function'
      ? FuelTankProfile.get(vehicleId) : null;
    if (!tankProfile || !Number.isFinite(Number(tankProfile.tankCapacityLiter)) || Number(tankProfile.tankCapacityLiter) <= 0) {
      return { ok: false, reason: 'tank-capacity-unavailable' };
    }
    const quality = typeof getFuelDataQuality === 'function' ? getFuelDataQuality(vehicleId) : null;
    if (quality && Array.isArray(quality.calibrationBlockers)) {
      if (quality.calibrationBlockers.length) return { ok: false, held: true, reason: 'data-quality-warning', flags: quality.calibrationBlockers.slice() };
    } else if (quality && (quality.invalidCount || quality.duplicateIdCount || quality.possibleDuplicateCount || quality.odometerBackstepCount || quality.overCapacityFillCount || quality.capacityConflict)) {
      return { ok: false, held: true, reason: 'data-quality-warning', flags: quality.flags || [] };
    }
    const rawSamples = this._sampleSegments(vehicleId);
    const samples = this._withoutOutliers(rawSamples);
    if (samples.length < this.MIN_SEGMENTS) return { ok: false, reason: 'insufficient-valid-samples', sampleCount: samples.length, excludedOutliers: rawSamples.length - samples.length };
    const values = samples.map(x => x.kmPerLiter).sort((a,b) => a-b);
    const mid = Math.floor(values.length / 2);
    const median = values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
    const historical = typeof fuelEfficiency === 'function' ? fuelEfficiency(vehicleId) : null;
    const current = previous ? Number(previous.valueKmPerLiter)
      : historical && historical.ok && Number.isFinite(Number(historical.kmPerLiter)) ? Number(historical.kmPerLiter) : null;
    if (!(current > 0) || !(median > 0)) return { ok: false, reason: 'historical-efficiency-unavailable' };
    const deviation = Math.abs(median - current) / current;
    if (deviation > this.MAX_MEDIAN_DEVIATION) {
      v.fuelEfficiencyCalibrationReview = {
        detectedAt: new Date().toISOString(), medianKmPerLiter: median,
        currentKmPerLiter: current, deviationRatio: deviation,
        sampleIds: samples.map(x => x.id), triggeringBbmId: triggeringLog.id,
        reason: 'recent-median-deviates-over-20-percent',
      };
      return { ok: false, held: true, reason: 'manual-review-required', deviationRatio: deviation };
    }
    const blended = current * this.BLEND_OLD_WEIGHT + median * (1 - this.BLEND_OLD_WEIGHT);
    const lower = current * (1 - this.MAX_STEP_RATIO);
    const upper = current * (1 + this.MAX_STEP_RATIO);
    const next = Math.min(upper, Math.max(lower, blended));
    const metadata = {
      calibrationVersion: this.VERSION,
      valueKmPerLiter: Math.round(next * 1000) / 1000,
      sampleCount: samples.length,
      sampleSegmentIds: samples.map(x => x.id),
      calibratedAt: new Date().toISOString(),
      previousValue: current,
      method: 'median-last-5-blend-75-25-step-cap-10pct',
      lastProcessedBbmId: triggeringLog.id,
    };
    v.fuelEfficiencyCalibration = metadata;
    delete v.fuelEfficiencyCalibrationReview;
    return { ok: true, calibration: { ...metadata }, medianKmPerLiter: median, deviationRatio: deviation };
  },

  rollback(vehicleId) {
    const v = this._vehicle(vehicleId);
    if (!v || !v.fuelEfficiencyCalibrationPrevious) return { ok: false, reason: 'rollback-unavailable' };
    const previous = { ...v.fuelEfficiencyCalibrationPrevious };
    const currentSampleIds = this._sampleSegments(vehicleId).map(x => x.id);
    const expectedSampleIds = Array.isArray(previous.sampleSegmentIds) ? previous.sampleSegmentIds : [];
    if (JSON.stringify(currentSampleIds) !== JSON.stringify(expectedSampleIds)) {
      return { ok: false, reason: 'source-segments-changed' };
    }
    delete previous.invalidatedAt;
    delete previous.invalidationReason;
    delete v.fuelEfficiencyCalibrationPrevious;
    v.fuelEfficiencyCalibration = previous;
    return { ok: true, calibration: { ...previous } };
  },
};

const FuelStateEstimator = {

// DECAY_KM_PER_POINT — tiap km ini ditempuh sejak titik acuan,
// decayedConfidenceScore turun 1 poin (dibulatkan ke bawah,
// Math.floor). MIN_CONFIDENCE_SCORE — lantai skor, decay tidak pernah
// menurunkan skor di bawah ini. Keduanya konstanta tampilan/ambang
// (pola sama persis LOW_CONFIDENCE_THRESHOLD di fuel-card.js), bukan
// rumus konsumsi/estimasi baru.
DECAY_KM_PER_POINT: 15,
MIN_CONFIDENCE_SCORE: 30,
// Odometer lebih tua dari ambang ini tidak cukup segar untuk mengklaim
// confidence. Estimasi liter tetap tersedia, tetapi UI harus meminta KM baru.
MAX_ODOMETER_AGE_DAYS: 7,

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
  const source = (typeof getFuelCanonicalLogs === 'function') ? getFuelCanonicalLogs(vehicleId).canonical : FuelStorage.logs(vehicleId);
  return source.filter((log) => (
    !log.fullTank && this._isValidNumber(log.km) && log.km > referenceKm
    && this._isValidNumber(log.liter) && log.liter > 0
  ));
},

// Catatan tanggal odometer tertinggi lintas sumber. Jika beberapa log
// mempunyai KM yang sama, ambil tanggal terbaru. Tanpa tanggal valid,
// umur tidak diketahui (null), tidak diasumsikan segar atau basi.
_latestOdometerEvidence(vehicleId, currentKm) {
  if (currentKm === null || typeof D === 'undefined') return null;
  const rows = [
    ...(Array.isArray(D.bbmLogs) ? D.bbmLogs : []),
    ...(Array.isArray(D.servisLogs) ? D.servisLogs : []),
    ...(Array.isArray(D.kmLogs) ? D.kmLogs : []),
  ].filter((row) => row.vehicleId === vehicleId && Number(row.km) === currentKm && row.date);
  let newest = null;
  rows.forEach((row) => {
    const timestamp = Date.parse(String(row.date).length === 10 ? row.date + 'T12:00:00' : row.date);
    if (Number.isFinite(timestamp) && (newest === null || timestamp > newest.timestamp)) newest = { timestamp };
  });
  return newest;
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

  // Umur odometer dihitung dari tanggal catatan yang menghasilkan KM
  // tertinggi (BBM/servis/manual), bukan dari tanggal fuelState ditulis.
  const kmEvidence = this._latestOdometerEvidence(vehicleId, currentKm);
  const odometerAgeDays = kmEvidence ? Math.max(0, Math.floor((Date.now() - kmEvidence.timestamp) / 86400000)) : null;
  const odometerStale = odometerAgeDays !== null && odometerAgeDays > this.MAX_ODOMETER_AGE_DAYS;

  const partials = referenceKm !== null ? this._partialFillsSince(vehicleId, referenceKm) : [];
  const addedLiter = partials.reduce((sum, log) => sum + log.liter, 0);

  let kmPerLiter = null;
  let consumedLiter = 0;
  if (typeof fuelEfficiency === 'function') {
    const eff = fuelEfficiency(vehicleId);
    if (eff && eff.ok && this._isValidNumber(eff.kmPerLiter) && eff.kmPerLiter > 0) {
      kmPerLiter = (typeof FuelAdaptiveCalibration !== 'undefined' && FuelAdaptiveCalibration)
        ? FuelAdaptiveCalibration.effectiveKmPerLiter(vehicleId, eff.kmPerLiter)
        : eff.kmPerLiter;
      if (deltaKm !== null) consumedLiter = deltaKm / kmPerLiter;
    }
  }

  const estimationLimited = referenceKm === null || kmPerLiter === null;
  const baseConfidence = this._isValidNumber(ref.confidenceScore) ? ref.confidenceScore : null;
  // decayedConfidenceScore -- lihat catatan header (SESI 5, confidence
  // decay). Decay HANYA bisa dihitung kalau deltaKm diketahui (bukan
  // estimationLimited) DAN ada confidenceScore dasar utk diluruhkan --
  // kalau tidak, diteruskan apa adanya (0 tebakan).
  let decayedConfidenceScore = (estimationLimited || odometerStale) ? null : baseConfidence;
  if (baseConfidence !== null && deltaKm !== null && !estimationLimited && !odometerStale) {
    const decayed = baseConfidence - Math.floor(deltaKm / this.DECAY_KM_PER_POINT);
    decayedConfidenceScore = Math.max(this.MIN_CONFIDENCE_SCORE, Math.min(baseConfidence, decayed));
  }
  let liter = baseLiter + addedLiter - consumedLiter;

  let clamped = false;
  const profile = (typeof FuelTankProfile !== 'undefined') ? FuelTankProfile.get(vehicleId) : null;
  const vehicle = this._vehicle(vehicleId);
  const tankCapacity = profile && this._isValidNumber(profile.tankCapacityLiter) && profile.tankCapacityLiter > 0
    ? profile.tankCapacityLiter
    : (vehicle && this._isValidNumber(vehicle.fuelTankCapacityLiter) && vehicle.fuelTankCapacityLiter > 0 ? vehicle.fuelTankCapacityLiter : null);
  if (tankCapacity !== null) {
    const cl = Math.min(Math.max(liter, 0), tankCapacity);
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
    odometerAgeDays,
    odometerStale,
    clamped,
    estimatedSource: ref.estimatedSource || null,
    confidenceScore: baseConfidence,
    decayedConfidenceScore,
  };
},

};
