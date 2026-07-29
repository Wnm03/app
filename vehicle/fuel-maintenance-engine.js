// fuel-maintenance-engine.js — Fuel Maintenance Intelligence Engine (TASK-148).
//
// PRINSIP: engine-only, 0 UI, PURE (read-only, tidak pernah panggil save()
// atau menulis ke D). 100% REUSE modul & fungsi yang SUDAH ADA — 0 rumus
// km/L, Rp/km, servis-jatuh-tempo, atau proyeksi baru dihitung ulang:
//   - FuelCostAnalytics (TASK-147)    -> costPerKm() (yang sendiri REUSE
//                                        fuelEfficiency()) dipakai APA
//                                        ADANYA utk baca kmPerLiter/rpPerKm
//                                        saat ini.
//   - fuelEfficiency() (vehicle-core.js, global SUDAH ADA)
//                                     -> dipakai lewat FuelCostAnalytics.costPerKm(),
//                                        TIDAK dipanggil dobel di sini.
//   - predictService({vehicleId}) (sparepart-servis.js, global SUDAH ADA)
//                                     -> "Vehicle Service History" — status
//                                        jatuh tempo tiap kategori sparepart
//                                        (lewat/segera/aman), dari
//                                        getEffectiveIntervalKm()/
//                                        getLastServiceKmForCat() yang
//                                        SUDAH ADA — dipakai APA ADANYA,
//                                        0 rumus interval baru.
//   - _vehicleFuelEfficiencyDropCheck() (sparepart-servis.js, global SUDAH
//     ADA, dipakai rule AI 'vehicle-fuel-efficiency-drop')
//                                     -> deteksi "Fuel efficiency
//                                        degradation" (drop km/L segmen
//                                        terakhir vs rata-rata segmen
//                                        sebelumnya) — SATU-SATUNYA logic
//                                        degradasi yang sudah ada di
//                                        project ini, dipakai APA ADANYA
//                                        (difilter ke 1 kendaraan), 0
//                                        rumus deteksi drop baru ditulis
//                                        ulang.
//   - findVehicleSpec() (sparepart-servis.js, global SUDAH ADA)
//                                     -> referensi statis tekanan ban
//                                        pabrikan (VEHICLE_SPEC_DB.ban) —
//                                        "Tire pressure (if available)":
//                                        TIDAK ADA histori tekanan ban
//                                        aktual tersimpan di app manapun
//                                        (0 storage baru dibuat sesuai
//                                        larangan task), jadi field ini
//                                        SELALU berupa referensi statis
//                                        (bukan bacaan real-time), null
//                                        kalau kendaraan tidak dikenali
//                                        katalognya.
//   - D.vehicles[i].name (Vehicle Profile, dibaca apa adanya)
//                                     -> dipakai findVehicleSpec() utk
//                                        cocokkan katalog.
//
// TIDAK disentuh sama sekali (sesuai batasan task): FuelGaugeEngine,
// FuelPredictionEngine, FuelCostAnalytics, FuelTankProfile (logic),
// D.bbmLogs/D.servisLogs/D.vehicles/D.sparepartCats (data), business
// logic modul fuel-*/sparepart-servis.js mana pun. 0 storage baru dibuat
// (larangan task eksplisit) — TIDAK ADA field tekanan-ban-aktual/histori
// baru ditambahkan ke D dgn alasan apa pun.
//
// LOGIC BARU sesi ini (sesuai requirement task, bukan duplikasi formula
// existing): KORELASI antara status jatuh tempo servis (predictService())
// dgn penurunan efisiensi BBM (_vehicleFuelEfficiencyDropCheck()) —
// mapping kategori sparepart yang relevan ke konsumsi BBM (oli mesin,
// saringan udara, busi, CVT/v-belt) via keyword match nama kategori (bukan
// rumus baru, murni pencocokan string), lalu menyusun rekomendasi & level
// risiko dari kombinasi kedua sinyal yang SUDAH ADA tsb.
//
// KONTRAK ERROR: semua method publik balikin {ok:false, reason} kalau
// gagal (kendaraan tidak ditemukan, dependency wajib belum dimuat, data
// BBM/servis belum cukup) — TIDAK PERNAH throw.
const FuelMaintenanceEngine = {

// KEYWORD_GROUPS — pemetaan kategori sparepart (D.sparepartCats[].name,
// dibaca apa adanya via predictService()) ke jenis part yang relevan
// dengan efisiensi BBM (§ ANALYSIS task: "Oil change overdue"/"Air
// filter"/"Spark plug"/"CVT"). Murni daftar kata kunci pencocokan nama
// (case-insensitive substring), BUKAN kategori/storage baru — kategori
// aslinya tetap 100% D.sparepartCats milik user, tidak diubah/ditambah.
KEYWORD_GROUPS: {
  oil: ['oli mesin', 'oli', 'oil'],
  airFilter: ['saringan udara', 'filter udara', 'air filter'],
  sparkPlug: ['busi', 'spark plug'],
  cvt: ['cvt', 'v-belt', 'vbelt', 'drive belt', 'van belt', 'fanbelt'],
},

// _vehicles()/_vehicle(vehicleId) — pola SAMA PERSIS FuelCostAnalytics/
// FuelPredictionEngine dkk: baca D.vehicles apa adanya lewat guard
// typeof, cari 1 kendaraan by id.
_vehicles() {
  return (typeof D !== 'undefined' && D.vehicles) ? D.vehicles : [];
},
_vehicle(vehicleId) {
  return this._vehicles().find((v) => v.id === vehicleId) || null;
},

// _serviceStatus(vehicleId) — 100% REUSE predictService() global
// (sparepart-servis.js, "Vehicle Service History") — null kalau fungsi
// belum dimuat (dependency wajib hilang, caller publik menerjemahkan
// jadi {ok:false, reason}).
_serviceStatus(vehicleId) {
  if (typeof predictService !== 'function') return null;
  return predictService({ vehicleId });
},

// _dropInfo(vehicleId) — 100% REUSE _vehicleFuelEfficiencyDropCheck()
// global (sparepart-servis.js, SATU-SATUNYA logic "Fuel efficiency
// degradation" yang sudah ada di project ini — dipakai rule AI
// 'vehicle-fuel-efficiency-drop'), difilter ke 1 kendaraan. null kalau
// fungsi belum dimuat ATAU kendaraan ini tidak masuk daftar drops (belum
// cukup data histori/tidak ada penurunan terdeteksi) — caller
// membedakan "tidak terdeteksi" (degradationDetected:false) dari
// "dependency hilang" lewat guard terpisah di method publik.
_dropInfo(vehicleId) {
  if (typeof _vehicleFuelEfficiencyDropCheck !== 'function') return null;
  const res = _vehicleFuelEfficiencyDropCheck();
  if (!res || !Array.isArray(res.drops)) return null;
  const found = res.drops.find((d) => d.vehicleId === vehicleId);
  return found ? Object.assign({ thresholdPct: res.thresholdPct }, found) : null;
},

// _tirePressureRef(veh) — "Tire pressure (if available)": TIDAK ADA
// histori tekanan ban aktual tersimpan di aplikasi mana pun (0 storage
// baru dibuat, sesuai larangan task) — satu-satunya data yang bisa
// dipakai adalah referensi STATIS pabrikan (VEHICLE_SPEC_DB.ban, via
// findVehicleSpec() global SUDAH ADA), bukan bacaan real-time. null
// kalau findVehicleSpec() belum dimuat ATAU kendaraan tidak match
// katalog (motor tidak dikenali).
_tirePressureRef(veh) {
  if (!veh || typeof findVehicleSpec !== 'function') return null;
  const spec = findVehicleSpec(veh.name);
  return (spec && spec.ban) ? spec.ban : null;
},

// _partsForItem(items) — mapping keyword (di atas) ke item predictService()
// yang statusnya BUKAN 'aman' (butuh perhatian: 'lewat' atau 'segera') —
// murni filter+cocokkan string nama kategori yang SUDAH ADA, 0 rumus
// interval/jatuh-tempo baru (status itu sendiri dari predictService()).
_relevantOverdueItems(items) {
  if (!Array.isArray(items)) return [];
  const out = [];
  Object.keys(this.KEYWORD_GROUPS).forEach((part) => {
    const keywords = this.KEYWORD_GROUPS[part];
    items.forEach((it) => {
      const name = (it.categoryName || '').toLowerCase();
      if (it.status !== 'aman' && keywords.some((k) => name.includes(k))) {
        out.push(Object.assign({ part }, it));
      }
    });
  });
  return out;
},

// maintenanceImpact(vehicleId) — korelasi status efisiensi BBM saat ini
// (reuse FuelCostAnalytics.costPerKm(), yang sendiri reuse
// fuelEfficiency()) dgn item perawatan yang jatuh tempo/mendekati jatuh
// tempo DAN relevan dgn konsumsi BBM (oli/saringan udara/busi/CVT, via
// keyword match predictService().items) + referensi tekanan ban statis
// (kalau kendaraan dikenali katalog) + jumlah TOTAL kategori servis
// lewat jatuh tempo (bukan cuma yang relevan BBM — sinyal "Service
// interval" umum).
// Return: {ok:true, vehicleId, kmPerLiter, costPerKm, overdueItems[],
//   hasMaintenanceImpact, serviceIntervalOverdueCount, tirePressureRef}
//   kalau sukses. {ok:false, reason} kalau: kendaraan tidak ditemukan,
//   FuelCostAnalytics belum dimuat, data efisiensi BBM belum cukup, atau
//   predictService()/D.sparepartCats belum ada.
maintenanceImpact(vehicleId) {
  const veh = this._vehicle(vehicleId);
  if (!veh) return { ok: false, reason: 'Kendaraan tidak ditemukan' };
  if (typeof FuelCostAnalytics === 'undefined') return { ok: false, reason: 'FuelCostAnalytics belum dimuat' };
  const costPerKm = FuelCostAnalytics.costPerKm(vehicleId);
  if (!costPerKm.ok) return { ok: false, reason: costPerKm.reason || 'Data efisiensi BBM belum cukup' };
  const svc = this._serviceStatus(vehicleId);
  if (!svc) return { ok: false, reason: 'predictService belum dimuat' };
  if (!svc.ok) return { ok: false, reason: svc.reason || 'Belum ada kategori sparepart terdaftar' };
  const overdueItems = this._relevantOverdueItems(svc.items);
  const serviceIntervalOverdueCount = svc.items.filter((it) => it.status === 'lewat').length;
  return {
    ok: true,
    vehicleId,
    kmPerLiter: costPerKm.kmPerLiter,
    costPerKm: costPerKm.costPerKm,
    overdueItems,
    hasMaintenanceImpact: overdueItems.length > 0,
    serviceIntervalOverdueCount,
    tirePressureRef: this._tirePressureRef(veh),
  };
},

// fuelEfficiencyHealth(vehicleId) — status kesehatan efisiensi BBM saat
// ini: kmPerLiter/rpPerKm (100% reuse fuelEfficiency() global) + apakah
// terdeteksi PENURUNAN (100% reuse _vehicleFuelEfficiencyDropCheck()
// global, difilter ke kendaraan ini) — 0 rumus baru.
// Return: {ok:true, vehicleId, kmPerLiter, rpPerKm, degradationDetected,
//   dropPct, thresholdPct, status:'menurun'|'baik'} kalau
//   fuelEfficiency() sukses (degradationDetected tetap bisa false/null
//   kalau _vehicleFuelEfficiencyDropCheck() belum dimuat/histori segmen
//   kurang — TIDAK dianggap gagal total, cuma sinyal tambahan yang
//   belum tersedia). {ok:false, reason} kalau: kendaraan tidak
//   ditemukan, fuelEfficiency belum dimuat, atau data BBM/histori km
//   kurang (reason fuelEfficiency() diteruskan apa adanya).
fuelEfficiencyHealth(vehicleId) {
  const veh = this._vehicle(vehicleId);
  if (!veh) return { ok: false, reason: 'Kendaraan tidak ditemukan' };
  if (typeof fuelEfficiency !== 'function') return { ok: false, reason: 'fuelEfficiency belum dimuat' };
  const eff = fuelEfficiency(vehicleId);
  if (!eff.ok) return { ok: false, reason: eff.reason || 'Data BBM belum cukup' };
  const drop = this._dropInfo(vehicleId);
  const degradationDetected = !!drop;
  return {
    ok: true,
    vehicleId,
    kmPerLiter: eff.kmPerLiter,
    rpPerKm: eff.rpPerKm,
    degradationDetected,
    dropPct: drop ? drop.dropPct : null,
    thresholdPct: drop ? drop.thresholdPct : null,
    status: degradationDetected ? 'menurun' : 'baik',
  };
},

// maintenanceRecommendation(vehicleId) — gabungkan maintenanceImpact() +
// fuelEfficiencyHealth() (keduanya 100% reuse, lihat di atas) jadi
// daftar rekomendasi teks siap tampil — LOGIC BARU (penyusunan kalimat
// dari data yang sudah dihitung kedua method di atas), 0 rumus
// efisiensi/servis baru.
// Return: {ok:true, vehicleId, recommendations[](string),
//   hasMaintenanceImpact, degradationDetected} kalau kedua dependency
//   di atas sukses. {ok:false, reason} — diteruskan dari
//   maintenanceImpact() (kendaraan tidak ditemukan, dependency wajib
//   hilang, atau data belum cukup); fuelEfficiencyHealth() TIDAK
//   memblokir hasil kalau gagal (recommendation tetap dikirim dari sisi
//   maintenance-nya saja, dengan degradationDetected:null).
maintenanceRecommendation(vehicleId) {
  const impact = this.maintenanceImpact(vehicleId);
  if (!impact.ok) return impact;
  const health = this.fuelEfficiencyHealth(vehicleId);
  const recommendations = [];
  impact.overdueItems.forEach((it) => {
    const detail = (it.status === 'lewat')
      ? `sudah lewat ${Math.abs(Math.round(it.sisaKm))} km dari jadwal`
      : `tersisa ${Math.round(it.sisaKm)} km lagi`;
    recommendations.push(`Cek/servis "${it.categoryName}" — ${detail}, berpotensi memengaruhi konsumsi BBM.`);
  });
  const degradationDetected = health.ok ? health.degradationDetected : null;
  if (degradationDetected && !impact.hasMaintenanceImpact) {
    recommendations.push('Konsumsi BBM turun tapi tidak ada jadwal servis (oli/saringan udara/busi/CVT) yang lewat — cek tekanan ban & kebiasaan berkendara (histori tekanan ban belum tersedia di aplikasi).');
  }
  if (!recommendations.length) {
    recommendations.push('Tidak ada indikasi masalah perawatan yang memengaruhi efisiensi BBM saat ini.');
  }
  return {
    ok: true,
    vehicleId,
    recommendations,
    hasMaintenanceImpact: impact.hasMaintenanceImpact,
    degradationDetected,
  };
},

// maintenanceRisk(vehicleId) — level risiko gabungan dari jumlah item
// servis lewat jatuh tempo yang relevan BBM (maintenanceImpact()) +
// status degradasi efisiensi (fuelEfficiencyHealth()) — LOGIC BARU
// (aturan gabungan 2 sinyal yang sudah ada), 0 rumus efisiensi/servis
// baru.
// Return: {ok:true, vehicleId, riskLevel:'tinggi'|'sedang'|'rendah',
//   overdueCount, overdueLewatCount, degradationDetected}. {ok:false,
//   reason} — diteruskan dari maintenanceImpact().
maintenanceRisk(vehicleId) {
  const impact = this.maintenanceImpact(vehicleId);
  if (!impact.ok) return impact;
  const health = this.fuelEfficiencyHealth(vehicleId);
  const degradationDetected = health.ok ? health.degradationDetected : false;
  const overdueLewatCount = impact.overdueItems.filter((it) => it.status === 'lewat').length;
  let riskLevel = 'rendah';
  if (overdueLewatCount > 0 && degradationDetected) riskLevel = 'tinggi';
  else if (overdueLewatCount > 0 || degradationDetected) riskLevel = 'sedang';
  return {
    ok: true,
    vehicleId,
    riskLevel,
    overdueCount: impact.overdueItems.length,
    overdueLewatCount,
    degradationDetected,
  };
},

};
