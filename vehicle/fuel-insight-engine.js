// fuel-insight-engine.js — Fuel Insight Engine (TASK-149; diperluas
// TASK-150A "Expand FuelInsightEngine Summary API").
//
// PRINSIP: engine-only, 0 UI, PURE (read-only, tidak pernah panggil save()
// atau menulis ke D). 100% REUSE SELURUH engine fuel yang SUDAH ADA — 0
// rumus bar/liter/persen/km-L/Rp-per-km/interval servis/degradasi/proyeksi
// baru dihitung ulang di sini:
//   - FuelGaugeEngine (TASK-143)      -> getReserveStatus() utk status
//                                        cadangan (reserve) BBM saat ini,
//                                        + (TASK-150A) calculateFuelBar()/
//                                        calculateFuelPercent() utk field
//                                        `fuel` di getSummary() — dari
//                                        D.vehicles[i].fuelState.
//                                        currentFuelLiter (dibaca APA
//                                        ADANYA, pola sama persis
//                                        FuelPredictionEngine._fuelState()).
//   - FuelPredictionEngine (TASK-146) -> predictRemainingDistance()/
//                                        predictNextRefuel()/
//                                        predictMonthlyFuelUsage()/
//                                        predictYearlyFuelUsage() dipakai
//                                        APA ADANYA.
//   - FuelCostAnalytics (TASK-147)    -> costPerKm()/monthlyCost()/
//                                        projectedMonthlyCost() dipakai
//                                        APA ADANYA.
//   - FuelMaintenanceEngine (TASK-148) -> fuelEfficiencyHealth()/
//                                        maintenanceRisk()/
//                                        maintenanceRecommendation()
//                                        dipakai APA ADANYA.
//   - FuelTankProfile (TASK-150A)     -> get().fuelBarCount DIBACA APA
//                                        ADANYA (bukan dihitung) utk field
//                                        `fuel.maxBar` — satu-satunya
//                                        tempat fuelBarCount tersimpan,
//                                        tidak diekspos engine lain.
//   - fuelEfficiency() -> TIDAK dipanggil LANGSUNG di sini (sudah 100%
//     dibungkus lewat engine di atas) — disebut di daftar Reuse task krn
//     merupakan dependency transitif engine-engine di atas.
//
// TIDAK disentuh sama sekali (sesuai batasan task): FuelGaugeEngine,
// FuelPredictionEngine, FuelCostAnalytics, FuelMaintenanceEngine,
// FuelTankProfile, fuelEfficiency() (logic-nya masing-masing), D.bbmLogs/
// D.servisLogs/D.vehicles/D.sparepartCats (data). 0 storage baru dibuat,
// 0 UI diubah.
//
// LOGIC BARU sesi ini (sesuai requirement task, bukan duplikasi formula
// existing): (1) MENYUSUN daftar "insight" siap tampil dari hasil engine-
// engine di atas (judul/deskripsi/rekomendasi/prioritas per insight,
// murni penyusunan teks & mapping level prioritas dari nilai yang SUDAH
// dihitung, 0 rumus baru); (2) MENGURUTKAN insight berdasarkan prioritas
// (CRITICAL -> HIGH -> MEDIUM -> LOW -> INFO); (3) SKOR RINGKASAN
// (healthScore/efficiencyScore) — komposisi rule-based sederhana dari
// sinyal yang SUDAH ADA (fuelEfficiencyHealth().dropPct,
// maintenanceRisk().riskLevel), pola sama persis FuelMaintenanceEngine.
// maintenanceRisk() yang juga menggabungkan 2 sinyal existing jadi 1
// level baru — BUKAN rumus km/L/Rp-per-km/servis/degradasi baru.
//
// KONTRAK ERROR: getInsights()/getSummary() balikin {ok:false, reason}
// HANYA kalau kendaraan tidak ditemukan — TIDAK PERNAH throw. Kalau
// kendaraan valid tapi sebagian/semua engine dependency belum dimuat atau
// datanya belum cukup (profil tangki belum diatur, histori BBM kosong,
// dst), insight/field terkait itu saja yang dilewati (insight tidak
// dimasukkan ke array / field summary bernilai null) — TIDAK memblokir
// insight/field lain yang datanya tersedia.
const FuelInsightEngine = {

// _vehicles()/_vehicle(vehicleId) — pola SAMA PERSIS FuelCostAnalytics/
// FuelPredictionEngine/FuelMaintenanceEngine dkk: baca D.vehicles apa
// adanya lewat guard typeof, cari 1 kendaraan by id.
_vehicles() {
  return (typeof D !== 'undefined' && D.vehicles) ? D.vehicles : [];
},
_vehicle(vehicleId) {
  return this._vehicles().find((v) => v.id === vehicleId) || null;
},

// _currentFuelLiter(vehicleId) — baca D.vehicles[i].fuelState.
// currentFuelLiter APA ADANYA (field additive TASK-144, ditulis
// FuelBarCorrection.save()), pola SAMA PERSIS FuelPredictionEngine.
// _fuelState() — null kalau belum pernah dikoreksi/bukan angka valid.
// Dipakai HANYA sbg input parameter FuelGaugeEngine.getReserveStatus()
// (yang wajib terima liter) — bukan hasil hitungan baru.
_currentFuelLiter(vehicleId) {
  const veh = this._vehicle(vehicleId);
  const fs = veh && veh.fuelState;
  if (!fs || typeof fs.currentFuelLiter !== 'number' || !isFinite(fs.currentFuelLiter)) return null;
  return fs.currentFuelLiter;
},

// PRIORITY_ORDER — urutan tampil insight (index lebih kecil = lebih
// prioritas). Dipakai _sortByPriority().
PRIORITY_ORDER: { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 },

// _sortByPriority(insights) — urutkan array insight menaik berdasarkan
// PRIORITY_ORDER (CRITICAL dulu, INFO terakhir). Tidak mengubah array
// asli (slice() dulu).
_sortByPriority(insights) {
  const order = this.PRIORITY_ORDER;
  return insights.slice().sort((a, b) => order[a.priority] - order[b.priority]);
},

// --- Insight builders (satu method per Supported Insight Type) ----------
// Tiap builder balikin 1 objek insight {id,type,priority,title,
// description,recommendation,confidence,source} kalau data sumbernya
// tersedia (engine sudah dimuat & method-nya sukses), atau `null` kalau
// tidak (dependency belum dimuat / data belum cukup) — getInsights()
// melewati builder yang balikin null, TIDAK menganggapnya gagal total.

// Fuel Consumption — 100% REUSE FuelCostAnalytics.costPerKm() (yang
// sendiri REUSE fuelEfficiency()).
_fuelConsumptionInsight(vehicleId) {
  if (typeof FuelCostAnalytics === 'undefined' || typeof FuelCostAnalytics.costPerKm !== 'function') return null;
  const res = FuelCostAnalytics.costPerKm(vehicleId);
  if (!res.ok) return null;
  return {
    id: 'fuel-consumption',
    type: 'Fuel Consumption',
    priority: 'INFO',
    title: 'Konsumsi BBM saat ini',
    description: 'Rata-rata ' + res.kmPerLiter.toFixed(1) + ' km/liter, biaya sekitar Rp'
      + Math.round(res.costPerKm).toLocaleString('id-ID') + '/km (harga BBM rata-rata Rp'
      + Math.round(res.averageFuelPrice).toLocaleString('id-ID') + '/liter).',
    recommendation: 'Pantau tren konsumsi BBM secara berkala untuk mendeteksi perubahan pola berkendara.',
    confidence: null,
    source: 'FuelCostAnalytics.costPerKm',
  };
},

// Monthly Cost — 100% REUSE FuelCostAnalytics.monthlyCost() (histori
// transaksi aktual bulan berjalan); kalau belum ada transaksi bulan ini,
// fallback ke FuelCostAnalytics.projectedMonthlyCost() (100% REUSE
// FuelPredictionEngine, sudah dipakai APA ADANYA di engine itu sendiri).
_monthlyCostInsight(vehicleId) {
  if (typeof FuelCostAnalytics === 'undefined') return null;
  const actual = (typeof FuelCostAnalytics.monthlyCost === 'function')
    ? FuelCostAnalytics.monthlyCost(vehicleId)
    : { ok: false, reason: 'FuelCostAnalytics.monthlyCost belum dimuat' };
  if (actual.ok) {
    return {
      id: 'monthly-cost',
      type: 'Monthly Cost',
      priority: 'INFO',
      title: 'Biaya BBM bulan ini',
      description: 'Total pengeluaran BBM bulan ' + actual.month + ': Rp'
        + actual.totalCost.toLocaleString('id-ID') + ' untuk ' + actual.totalLiter
        + ' liter (rata-rata Rp' + actual.averagePrice.toLocaleString('id-ID') + '/liter).',
      recommendation: 'Bandingkan dengan bulan-bulan sebelumnya untuk melihat tren pengeluaran BBM.',
      confidence: null,
      source: 'FuelCostAnalytics.monthlyCost',
    };
  }
  if (typeof FuelCostAnalytics.projectedMonthlyCost !== 'function') return null;
  const proj = FuelCostAnalytics.projectedMonthlyCost(vehicleId);
  if (!proj.ok) return null;
  return {
    id: 'monthly-cost',
    type: 'Monthly Cost',
    priority: 'INFO',
    title: 'Estimasi biaya BBM bulan ini',
    description: 'Belum ada transaksi BBM tercatat bulan ini. Estimasi biaya: Rp'
      + Math.round(proj.estimatedCost).toLocaleString('id-ID') + ' (' + proj.estimatedLiter
      + ' liter), berdasarkan pola berkendara historis.',
    recommendation: 'Catat transaksi BBM berikutnya agar biaya aktual bulan ini bisa dipantau.',
    confidence: proj.confidenceScore,
    source: 'FuelCostAnalytics.projectedMonthlyCost',
  };
},

// Fuel Efficiency — 100% REUSE FuelMaintenanceEngine.fuelEfficiencyHealth()
// (yang sendiri REUSE fuelEfficiency() + _vehicleFuelEfficiencyDropCheck()
// global) — mapping dropPct -> priority CRITICAL/HIGH murni ambang batas
// tampilan, 0 rumus drop baru.
_fuelEfficiencyInsight(vehicleId) {
  if (typeof FuelMaintenanceEngine === 'undefined' || typeof FuelMaintenanceEngine.fuelEfficiencyHealth !== 'function') return null;
  const health = FuelMaintenanceEngine.fuelEfficiencyHealth(vehicleId);
  if (!health.ok) return null;
  if (health.degradationDetected) {
    return {
      id: 'fuel-efficiency',
      type: 'Fuel Efficiency',
      priority: health.dropPct >= 30 ? 'CRITICAL' : 'HIGH',
      title: 'Penurunan efisiensi BBM terdeteksi',
      description: 'Efisiensi BBM turun ' + Math.round(health.dropPct) + '% dari rata-rata sebelumnya'
        + ' (ambang batas ' + health.thresholdPct + '%). Saat ini ' + health.kmPerLiter.toFixed(1) + ' km/liter.',
      recommendation: 'Cek kondisi mesin, saringan udara, busi, dan tekanan ban — penurunan efisiensi biasanya terkait perawatan yang jatuh tempo.',
      confidence: null,
      source: 'FuelMaintenanceEngine.fuelEfficiencyHealth',
    };
  }
  return {
    id: 'fuel-efficiency',
    type: 'Fuel Efficiency',
    priority: 'INFO',
    title: 'Efisiensi BBM stabil',
    description: 'Efisiensi BBM saat ini ' + health.kmPerLiter.toFixed(1) + ' km/liter, tidak ada indikasi penurunan.',
    recommendation: 'Pertahankan kebiasaan berkendara & jadwal servis saat ini.',
    confidence: null,
    source: 'FuelMaintenanceEngine.fuelEfficiencyHealth',
  };
},

// Maintenance — 100% REUSE FuelMaintenanceEngine.maintenanceRisk() +
// maintenanceRecommendation() (keduanya sendiri REUSE FuelCostAnalytics/
// predictService()/_vehicleFuelEfficiencyDropCheck()) — mapping riskLevel
// -> priority murni tabel tampilan, 0 rumus risiko baru.
_maintenanceInsight(vehicleId) {
  if (typeof FuelMaintenanceEngine === 'undefined' || typeof FuelMaintenanceEngine.maintenanceRisk !== 'function') return null;
  const risk = FuelMaintenanceEngine.maintenanceRisk(vehicleId);
  if (!risk.ok) return null;
  const rec = (typeof FuelMaintenanceEngine.maintenanceRecommendation === 'function')
    ? FuelMaintenanceEngine.maintenanceRecommendation(vehicleId)
    : { ok: false };
  const recommendation = (rec.ok && rec.recommendations.length)
    ? rec.recommendations.join(' ')
    : 'Tidak ada rekomendasi tambahan saat ini.';
  const priorityMap = { tinggi: 'CRITICAL', sedang: 'MEDIUM', rendah: 'LOW' };
  return {
    id: 'maintenance',
    type: 'Maintenance',
    priority: priorityMap[risk.riskLevel] || 'INFO',
    title: 'Risiko perawatan terkait BBM: ' + risk.riskLevel,
    description: risk.overdueCount + ' item servis relevan BBM terdeteksi (' + risk.overdueLewatCount
      + ' sudah lewat jadwal), status efisiensi: ' + (risk.degradationDetected ? 'menurun' : 'normal') + '.',
    recommendation,
    confidence: null,
    source: 'FuelMaintenanceEngine.maintenanceRisk',
  };
},

// Reserve Fuel — 100% REUSE FuelGaugeEngine.getReserveStatus(), input
// liter dibaca apa adanya dari D.vehicles[i].fuelState (lihat
// _currentFuelLiter() di atas) — 0 rumus reserve baru.
_reserveFuelInsight(vehicleId) {
  if (typeof FuelGaugeEngine === 'undefined' || typeof FuelGaugeEngine.getReserveStatus !== 'function') return null;
  const liter = this._currentFuelLiter(vehicleId);
  if (liter === null) return null;
  const reserve = FuelGaugeEngine.getReserveStatus(vehicleId, liter);
  if (!reserve.ok) return null;
  if (reserve.inReserve) {
    return {
      id: 'reserve-fuel',
      type: 'Reserve Fuel',
      priority: 'CRITICAL',
      title: 'BBM sudah masuk cadangan (reserve)',
      description: 'Sisa BBM saat ini sudah di bawah/pada ambang cadangan (' + reserve.reserveLiter + ' liter).',
      recommendation: 'Segera isi BBM untuk menghindari kehabisan di jalan.',
      confidence: null,
      source: 'FuelGaugeEngine.getReserveStatus',
    };
  }
  return {
    id: 'reserve-fuel',
    type: 'Reserve Fuel',
    priority: 'INFO',
    title: 'BBM masih di atas cadangan',
    description: 'Sisa BBM ' + reserve.literAboveReserve + ' liter di atas ambang cadangan (' + reserve.reserveLiter + ' liter).',
    recommendation: 'Tidak ada tindakan mendesak diperlukan.',
    confidence: null,
    source: 'FuelGaugeEngine.getReserveStatus',
  };
},

// Next Refuel — 100% REUSE FuelPredictionEngine.predictNextRefuel()
// (yang sendiri REUSE FuelGaugeEngine + fuelEfficiency()) — mapping
// estimatedRemainingDays -> priority murni ambang batas tampilan, 0
// rumus proyeksi tanggal baru.
_nextRefuelInsight(vehicleId) {
  if (typeof FuelPredictionEngine === 'undefined' || typeof FuelPredictionEngine.predictNextRefuel !== 'function') return null;
  const pred = FuelPredictionEngine.predictNextRefuel(vehicleId);
  if (!pred.ok) return null;
  let priority = 'LOW';
  if (pred.estimatedRemainingDays <= 1) priority = 'CRITICAL';
  else if (pred.estimatedRemainingDays <= 3) priority = 'HIGH';
  else if (pred.estimatedRemainingDays <= 7) priority = 'MEDIUM';
  return {
    id: 'next-refuel',
    type: 'Next Refuel',
    priority,
    title: 'Perkiraan waktu isi BBM berikutnya',
    description: 'Estimasi ' + pred.estimatedRemainingDays + ' hari lagi (~' + pred.estimatedRemainingKm + ' km tersisa)'
      + (pred.estimatedDate ? ', sekitar ' + pred.estimatedDate : '') + '.',
    recommendation: (priority === 'CRITICAL' || priority === 'HIGH')
      ? 'Rencanakan pengisian BBM dalam waktu dekat.'
      : 'Belum perlu tindakan, pantau kembali secara berkala.',
    confidence: null,
    source: 'FuelPredictionEngine.predictNextRefuel',
  };
},

// Prediction — 100% REUSE FuelPredictionEngine.predictMonthlyFuelUsage()
// + predictYearlyFuelUsage() (yang kedua sendiri REUSE yang pertama x12)
// — 0 rumus proyeksi baru.
_predictionInsight(vehicleId) {
  if (typeof FuelPredictionEngine === 'undefined' || typeof FuelPredictionEngine.predictMonthlyFuelUsage !== 'function') return null;
  const monthly = FuelPredictionEngine.predictMonthlyFuelUsage(vehicleId);
  if (!monthly.ok) return null;
  const yearly = (typeof FuelPredictionEngine.predictYearlyFuelUsage === 'function')
    ? FuelPredictionEngine.predictYearlyFuelUsage(vehicleId)
    : { ok: false };
  let description = 'Perkiraan bulan depan: ' + monthly.estimatedLiter + ' liter (Rp'
    + Math.round(monthly.estimatedCost).toLocaleString('id-ID') + ')';
  if (yearly.ok) {
    description += ', setahun: ' + yearly.estimatedLiter + ' liter (Rp'
      + Math.round(yearly.estimatedCost).toLocaleString('id-ID') + ')';
  }
  description += '.';
  return {
    id: 'prediction',
    type: 'Prediction',
    priority: 'INFO',
    title: 'Proyeksi pemakaian BBM',
    description,
    recommendation: 'Gunakan proyeksi ini untuk perencanaan anggaran BBM bulanan/tahunan.',
    confidence: null,
    source: 'FuelPredictionEngine.predictMonthlyFuelUsage',
  };
},

// getInsights(vehicleId) — kumpulkan SELURUH Supported Insight Type dari
// engine-engine di atas (7 builder), lewati yang balikin null (dependency
// belum dimuat/data belum cukup), lalu urutkan berdasarkan prioritas.
// Return: {ok:true, insights:[]} — insights BISA kosong (kendaraan valid
// tapi belum ada histori BBM/servis/profil tangki sama sekali, "empty
// history"/"missing profile" case) — BUKAN dianggap gagal. {ok:false,
// reason:'Kendaraan tidak ditemukan'} HANYA kalau vehicleId tidak valid.
getInsights(vehicleId) {
  const veh = this._vehicle(vehicleId);
  if (!veh) return { ok: false, reason: 'Kendaraan tidak ditemukan' };
  const builders = [
    this._fuelConsumptionInsight,
    this._monthlyCostInsight,
    this._fuelEfficiencyInsight,
    this._maintenanceInsight,
    this._reserveFuelInsight,
    this._nextRefuelInsight,
    this._predictionInsight,
  ];
  const insights = [];
  builders.forEach((fn) => {
    const insight = fn.call(this, vehicleId);
    if (insight) insights.push(insight);
  });
  return { ok: true, insights: this._sortByPriority(insights) };
},

// _fuelGaugeData(vehicleId) — TASK-150A: struktur data gauge BBM siap
// tampil, 100% REUSE FuelGaugeEngine.calculateFuelBar()/calculateFuelPercent()/
// getReserveStatus() (liter input APA ADANYA dari _currentFuelLiter(), pola
// sama persis _reserveFuelInsight()) + FuelTankProfile.get().fuelBarCount
// (dibaca APA ADANYA, bukan dihitung — satu-satunya tempat fuelBarCount
// tersimpan). 0 rumus bar/liter/persen/reserve baru — murni membungkus nilai
// yang SUDAH dihitung engine di atas jadi 1 objek terstruktur.
// Balikin `null` kalau belum ada fuelState.currentFuelLiter tersimpan sama
// sekali (kendaraan belum pernah dikoreksi — TIDAK ADA data dasar utk
// ditampilkan). Kalau liter tersedia tapi salah satu engine belum
// dimuat/gagal, field terkait itu saja `null` (tidak memblokir field lain),
// pola sama persis getSummary() utk field lain.
_fuelGaugeData(vehicleId) {
  const liter = this._currentFuelLiter(vehicleId);
  if (liter === null) return null;

  let currentBar = null;
  let fuelPercent = null;
  let reserve = null;
  let reserveLiter = null;

  if (typeof FuelGaugeEngine !== 'undefined') {
    if (typeof FuelGaugeEngine.calculateFuelBar === 'function') {
      const barRes = FuelGaugeEngine.calculateFuelBar(vehicleId, liter);
      if (barRes.ok) currentBar = barRes.bar;
    }
    if (typeof FuelGaugeEngine.calculateFuelPercent === 'function') {
      const pctRes = FuelGaugeEngine.calculateFuelPercent(vehicleId, liter);
      if (pctRes.ok) fuelPercent = pctRes.percent;
    }
    if (typeof FuelGaugeEngine.getReserveStatus === 'function') {
      const reserveRes = FuelGaugeEngine.getReserveStatus(vehicleId, liter);
      if (reserveRes.ok) {
        reserve = reserveRes.inReserve;
        reserveLiter = reserveRes.reserveLiter;
      }
    }
  }

  let maxBar = null;
  if (typeof FuelTankProfile !== 'undefined' && typeof FuelTankProfile.get === 'function') {
    const profile = FuelTankProfile.get(vehicleId);
    if (profile && typeof profile.fuelBarCount === 'number') maxBar = profile.fuelBarCount;
  }

  return {
    currentBar,
    maxBar,
    remainingLiter: liter,
    fuelPercent,
    reserve,
    reserveLiter,
  };
},

// getSummary(vehicleId) — ringkasan angka siap tampil utk Dashboard/AI
// masa depan, SELURUHNYA diturunkan dari engine yang SUDAH ADA (0 rumus
// km/L/Rp-per-km/servis/degradasi/proyeksi baru):
//   - efficiencyScore: 100 kalau tidak ada degradasi terdeteksi
//     (FuelMaintenanceEngine.fuelEfficiencyHealth()), atau
//     (100 - dropPct) di-clamp ke [0,100] kalau ada degradasi — LOGIC
//     BARU (skor tampilan), murni turunan dropPct yang SUDAH dihitung.
//   - maintenanceRisk: riskLevel APA ADANYA dari
//     FuelMaintenanceEngine.maintenanceRisk() ('tinggi'/'sedang'/'rendah').
//   - healthScore: rata-rata efficiencyScore & skor turunan
//     maintenanceRisk (tinggi=40/sedang=70/rendah=100, tabel tampilan
//     sama pola dgn priorityMap di _maintenanceInsight()) — LOGIC BARU
//     (komposisi 2 sinyal existing, pola sama persis
//     FuelMaintenanceEngine.maintenanceRisk() yg juga menggabungkan 2
//     sinyal existing jadi 1 level baru), null kalau kedua sumber tidak
//     tersedia.
//   - monthlyCost: FuelCostAnalytics.monthlyCost().totalCost (histori
//     aktual bulan ini) kalau ada, fallback ke
//     projectedMonthlyCost().estimatedCost (100% REUSE
//     FuelPredictionEngine) kalau belum ada transaksi bulan ini.
//   - remainingDistance: FuelPredictionEngine.predictRemainingDistance().
//     remainingKm (yang sendiri REUSE FuelGaugeEngine + fuelState).
//   - confidenceScore: D.vehicles[i].fuelState.confidenceScore APA ADANYA
//     (diteruskan lewat projectedMonthlyCost()/predictRemainingDistance(),
//     keduanya sudah membaca field ini di engine masing-masing) — 0 rumus
//     confidence baru dihitung di sini.
// TASK-150A (Expand Summary API): 2 field TAMBAHAN di-append di akhir
// (field lama TIDAK diubah/rename sama sekali, tetap 100% backward
// compatible dgn caller existing yg cuma baca field lama):
//   - fuel: {currentBar,maxBar,remainingLiter,fuelPercent,reserve,
//     reserveLiter} — lihat _fuelGaugeData() di atas, `null` kalau belum
//     ada fuelState.currentFuelLiter tersimpan sama sekali.
//   - highestInsight: insight prioritas tertinggi, 100% REUSE
//     this.getInsights(vehicleId) (array yang SAMA PERSIS sudah diurutkan
//     _sortByPriority()) — `insights[0]` apa adanya, atau `null` kalau
//     array kosong/kendaraan tidak valid. 0 logic sortir/prioritas baru
//     ditulis di sini, murni ambil elemen pertama dari hasil yang sudah ada.
//
// Return: {ok:true, healthScore, efficiencyScore, monthlyCost,
//   remainingDistance, maintenanceRisk, confidenceScore, fuel,
//   highestInsight} — field individu BISA null kalau dependency terkait
//   belum dimuat/data belum cukup (TIDAK memblokir field lain). {ok:false,
//   reason:'Kendaraan tidak ditemukan'} HANYA kalau vehicleId tidak valid.
getSummary(vehicleId) {
  const veh = this._vehicle(vehicleId);
  if (!veh) return { ok: false, reason: 'Kendaraan tidak ditemukan' };

  let efficiencyScore = null;
  let maintenanceRisk = null;
  let maintenanceScore = null;

  if (typeof FuelMaintenanceEngine !== 'undefined') {
    if (typeof FuelMaintenanceEngine.fuelEfficiencyHealth === 'function') {
      const health = FuelMaintenanceEngine.fuelEfficiencyHealth(vehicleId);
      if (health.ok) {
        efficiencyScore = health.degradationDetected
          ? Math.max(0, Math.min(100, Math.round(100 - health.dropPct)))
          : 100;
      }
    }
    if (typeof FuelMaintenanceEngine.maintenanceRisk === 'function') {
      const risk = FuelMaintenanceEngine.maintenanceRisk(vehicleId);
      if (risk.ok) {
        maintenanceRisk = risk.riskLevel;
        const scoreMap = { tinggi: 40, sedang: 70, rendah: 100 };
        maintenanceScore = (risk.riskLevel in scoreMap) ? scoreMap[risk.riskLevel] : null;
      }
    }
  }

  let healthScore = null;
  if (efficiencyScore !== null && maintenanceScore !== null) {
    healthScore = Math.round((efficiencyScore + maintenanceScore) / 2);
  } else if (efficiencyScore !== null) {
    healthScore = efficiencyScore;
  } else if (maintenanceScore !== null) {
    healthScore = maintenanceScore;
  }

  let monthlyCost = null;
  let confidenceScore = null;
  if (typeof FuelCostAnalytics !== 'undefined') {
    const actual = (typeof FuelCostAnalytics.monthlyCost === 'function')
      ? FuelCostAnalytics.monthlyCost(vehicleId)
      : { ok: false };
    if (actual.ok) {
      monthlyCost = actual.totalCost;
    } else if (typeof FuelCostAnalytics.projectedMonthlyCost === 'function') {
      const proj = FuelCostAnalytics.projectedMonthlyCost(vehicleId);
      if (proj.ok) {
        monthlyCost = proj.estimatedCost;
        confidenceScore = proj.confidenceScore;
      }
    }
  }

  let remainingDistance = null;
  if (typeof FuelPredictionEngine !== 'undefined' && typeof FuelPredictionEngine.predictRemainingDistance === 'function') {
    const dist = FuelPredictionEngine.predictRemainingDistance(vehicleId);
    if (dist.ok) {
      remainingDistance = dist.remainingKm;
      if (confidenceScore === null) confidenceScore = dist.confidenceScore;
    }
  }

  const fuel = this._fuelGaugeData(vehicleId);

  const insightsRes = this.getInsights(vehicleId);
  const highestInsight = (insightsRes.ok && insightsRes.insights.length) ? insightsRes.insights[0] : null;

  return {
    ok: true,
    healthScore,
    efficiencyScore,
    monthlyCost,
    remainingDistance,
    maintenanceRisk,
    confidenceScore,
    fuel,
    highestInsight,
  };
},

};
