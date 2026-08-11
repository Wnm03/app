// vehicle-fuel-trend.js — Fuel Trend Summary (Sesi 81, Batch 7). Lihat
// docs/BATCH_PLAN.md § Batch 7.
//
// PRINSIP (RULE #1 sesi ini): 100% REUSE VehicleTrendAPI.monthlyCostTrend()
// (type:'fuel', modules/vehicle/vehicle-trend-api.js, sesi ini) utk histori
// biaya BBM per bulan, DIGABUNG dgn VehicleIntelligence.vehicleOverview(id)
// .fuel (Sesi 76 — hasil fuelEfficiency() apa adanya: kmPerLiter/rpPerKm/
// estMonthlyCost) utk konteks efisiensi SAAT INI per kendaraan. 0
// recompute — TIDAK menghitung ulang kmPerLiter/rpPerKm/estMonthlyCost
// (SUDAH ADA di fuelEfficiency() via VehicleIntelligence), TIDAK
// menghitung ulang SUM biaya per bulan (SUDAH ADA di VehicleTrendAPI).
// current (efisiensi saat ini) HANYA disertakan kalau vehicleId diberikan
// — fuelEfficiency() per-desain memang per-kendaraan (VehicleIntelligence.
// vehicleOverview() sendiri butuh vehicleId, TIDAK ada versi fleet-level-
// nya), jadi tanpa vehicleId current tetap null (bukan {ok:false} palsu).
const VehicleFuelTrendSummary = {

// summary(vehicleId?, months?) — trend biaya BBM bulanan + (kalau
// vehicleId diberikan) efisiensi BBM saat ini apa adanya dari
// VehicleIntelligence. {ok:false} kalau VehicleTrendAPI belum dimuat.
// Kalau vehicleId diberikan tapi VehicleIntelligence belum dimuat,
// current diisi {ok:false, reason:'VehicleIntelligence belum dimuat'}
// (trend BBM tetap dikembalikan — tidak ikut gagal, pola sama persis
// guard per-komponen di VehicleIntelligence.vehicleOverview() sendiri).
summary(vehicleId, months = 6) {
  if (typeof VehicleTrendAPI === 'undefined') {
    return { ok: false, reason: 'VehicleTrendAPI belum dimuat' };
  }
  const trend = VehicleTrendAPI.monthlyCostTrend({ vehicleId, type: 'fuel', months });
  let current = null;
  if (vehicleId) {
    if (typeof VehicleIntelligence === 'undefined') {
      current = { ok: false, reason: 'VehicleIntelligence belum dimuat' };
    } else {
      const overview = VehicleIntelligence.vehicleOverview(vehicleId);
      current = overview.ok ? overview.fuel : { ok: false, reason: overview.reason };
    }
  }
  return {
    ok: true,
    vehicleId: vehicleId || null,
    months: trend.months,
    rows: trend.rows,
    total: trend.total,
    current,
  };
},

};
