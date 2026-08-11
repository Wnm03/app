// vehicle-service-trend.js — Service Trend Summary (Sesi 81, Batch 7).
// Lihat docs/BATCH_PLAN.md § Batch 7.
//
// PRINSIP (RULE #1 sesi ini): 100% REUSE VehicleTrendAPI.monthlyCostTrend()
// (type:'service', modules/vehicle/vehicle-trend-api.js, sesi ini) utk
// histori biaya servis per bulan, DIGABUNG dgn
// VehicleReminder.serviceReminders(vehicleId) (Sesi 78 — status 'lewat'/
// 'segera' dari predictService() apa adanya) utk daftar item servis yang
// masih perlu perhatian SAAT INI. 0 recompute — TIDAK menghitung ulang
// ambang overdue/due-soon (SUDAH ADA di VehicleReminder), TIDAK
// menghitung ulang SUM biaya per bulan (SUDAH ADA di VehicleTrendAPI).
const VehicleServiceTrendSummary = {

// summary(vehicleId?, months?) — trend biaya servis bulanan + daftar
// reminder servis aktif (overdue/due-soon) apa adanya dari
// VehicleReminder. Tanpa vehicleId: seluruh armada (VehicleReminder.
// serviceReminders() sendiri sudah mendukung tanpa vehicleId, pola sama
// persis VehicleTrendAPI). {ok:false} kalau VehicleTrendAPI ATAU
// VehicleReminder belum dimuat (guard urutan load / dipakai headless di
// test, pola sama persis VehicleAIHook.fleetSummary()).
summary(vehicleId, months = 6) {
  if (typeof VehicleTrendAPI === 'undefined') {
    return { ok: false, reason: 'VehicleTrendAPI belum dimuat' };
  }
  if (typeof VehicleReminder === 'undefined') {
    return { ok: false, reason: 'VehicleReminder belum dimuat' };
  }
  const trend = VehicleTrendAPI.monthlyCostTrend({ vehicleId, type: 'service', months });
  const reminders = VehicleReminder.serviceReminders(vehicleId);
  return {
    ok: true,
    vehicleId: vehicleId || null,
    months: trend.months,
    rows: trend.rows,
    total: trend.total,
    reminders,
    overdueCount: reminders.filter((r) => r.severity === 'overdue').length,
    dueSoonCount: reminders.filter((r) => r.severity === 'due-soon').length,
  };
},

};
