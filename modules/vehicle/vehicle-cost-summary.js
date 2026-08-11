// vehicle-cost-summary.js — Vehicle Cost Summary (Sesi 81, Batch 7). Lihat
// docs/BATCH_PLAN.md § Batch 7.
//
// PRINSIP (RULE #1 sesi ini): 100% REUSE VehicleTrendAPI.monthlyCostTrend()
// (modules/vehicle/vehicle-trend-api.js, sesi ini) — TIDAK menghitung
// ulang SUM biaya per bulan (sudah dilakukan VehicleTrendAPI), TIDAK
// duplikasi logic, TIDAK framework baru. Satu-satunya "logic" tambahan di
// sini adalah derivasi RINGAN dari rows yang sudah dikembalikan
// VehicleTrendAPI (rata-rata per bulan yang tersedia, arah naik/turun
// bulan terakhir vs sebelumnya) — pola sama persis insights()/healthScore()
// di VehicleIntelligence yang juga derivasi ambang ringan dari data yang
// sudah dihitung, BUKAN rumus baru yang berdiri sendiri.
//
// TIDAK ada UI/panel di file ini — presenter-nya file terpisah
// (modules/vehicle/vehicle-analytics-presenter.js, sesi ini juga).
const VehicleCostSummary = {

// summary(vehicleId?, months?) — ringkasan biaya kendaraan (BBM + servis
// gabungan): total biaya periode, rata-rata per bulan, arah tren
// (naik/turun/tetap, dari 2 bulan terakhir yang tersedia di rows), serta
// breakdown total BBM vs total servis. Tanpa vehicleId: seluruh armada.
// months default 6 (sama default VehicleTrendAPI.monthlyCostTrend()).
// {ok:false} kalau VehicleTrendAPI belum dimuat (guard urutan load /
// dipakai headless di test, pola sama persis getAIHook() FinanceDashboard/
// VehicleDashboard/VehicleAIHook).
summary(vehicleId, months = 6) {
  if (typeof VehicleTrendAPI === 'undefined') {
    return { ok: false, reason: 'VehicleTrendAPI belum dimuat' };
  }
  const trend = VehicleTrendAPI.monthlyCostTrend({ vehicleId, type: 'all', months });
  const rows = trend.rows;
  const avgPerMonth = rows.length ? trend.total / rows.length : 0;
  const lastMonth = rows.length ? rows[rows.length - 1] : null;
  const prevMonth = rows.length > 1 ? rows[rows.length - 2] : null;
  let direction = 'flat';
  if (lastMonth && prevMonth) {
    if (lastMonth.total > prevMonth.total) direction = 'up';
    else if (lastMonth.total < prevMonth.total) direction = 'down';
  }
  const totalFuel = rows.reduce((s, r) => s + r.fuel, 0);
  const totalService = rows.reduce((s, r) => s + r.service, 0);
  return {
    ok: true,
    vehicleId: vehicleId || null,
    months: trend.months,
    rows,
    total: trend.total,
    avgPerMonth,
    direction,
    totalFuel,
    totalService,
    lastMonth,
    prevMonth,
  };
},

};
