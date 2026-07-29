// fuel-intelligence-engine.js — Fuel Engine (TASK-141, Fuel Intelligence
// Card).
//
// PRINSIP: 100% REUSE service yang SUDAH ADA — TIDAK ada rumus
// kmPerLiter/rpPerKm/estMonthlyCost baru (fuelEfficiency(), vehicle-core.js),
// TIDAK menghitung ulang tren biaya bulanan (VehicleFuelTrendSummary,
// sendiri 100% reuse VehicleTrendAPI), TIDAK menghitung ulang ambang
// pengingat isi BBM (VehicleReminder.fuelReminders()). Satu-satunya hal
// baru di sini adalah MENGGABUNGKAN ketiganya + FuelStorage jadi satu
// objek insight per kendaraan/armada, dipakai FuelCard/FuelModal/
// FuelAnalytics — pola sama persis VehicleFuelTrendSummary yang juga
// cuma menggabungkan tanpa recompute. PURE (read-only) — tidak pernah
// memanggil save() atau menyentuh DOM.
//
// TASK-142 (Fuel Tank Profile): tambah field `tankProfile` (opsional,
// guard typeof) ke vehicleInsight() — 100% REUSE FuelTankProfile.get(),
// 0 rumus baru di sini, 0 field lama diubah/dihapus.
const FuelIntelligenceEngine = {

// _vehicles() — baca D.vehicles apa adanya (array kosong kalau belum
// ada), pola sama persis _vehicles() di VehicleIntelligence/VehicleReminder.
_vehicles() {
  return (typeof D !== 'undefined' && D.vehicles) ? D.vehicles : [];
},

// vehicleInsight(vehicleId) — gabungan tren biaya BBM (VehicleFuelTrendSummary,
// termasuk efisiensi saat ini via fuelEfficiency() apa adanya) + pengingat
// isi BBM (VehicleReminder.fuelReminders()) + jumlah log (FuelStorage) +
// profil tangki (FuelTankProfile.get(), TASK-142) utk 1 kendaraan.
// {ok:false} kalau kendaraan tidak ditemukan (pola sama persis
// vehicleOverview()/vehicleInsight() lain di project ini).
vehicleInsight(vehicleId) {
  const veh = this._vehicles().find((v) => v.id === vehicleId);
  if (!veh) return { ok: false, reason: 'Kendaraan tidak ditemukan' };
  const trend = (typeof VehicleFuelTrendSummary !== 'undefined')
    ? VehicleFuelTrendSummary.summary(vehicleId)
    : { ok: false, reason: 'VehicleFuelTrendSummary belum dimuat' };
  const reminders = (typeof VehicleReminder !== 'undefined')
    ? VehicleReminder.fuelReminders(vehicleId)
    : [];
  const logCount = (typeof FuelStorage !== 'undefined') ? FuelStorage.count(vehicleId) : 0;
  // tankProfile: opsional (TASK-142) — null kalau FuelTankProfile belum
  // dimuat, 0 dampak ke konsumen lama (field baru, murni additive).
  const tankProfile = (typeof FuelTankProfile !== 'undefined') ? FuelTankProfile.get(vehicleId) : null;
  return {
    ok: true,
    vehicleId,
    name: veh.name,
    emoji: veh.emoji,
    current: trend.ok ? trend.current : null,
    trend: trend.ok ? { months: trend.months, rows: trend.rows, total: trend.total } : null,
    reminders,
    logCount,
    tankProfile,
  };
},

// fleetInsight() — agregasi ringan lintas SEMUA D.vehicles: total biaya
// BBM (SUM trend.total tiap kendaraan, sendiri dari VehicleTrendAPI apa
// adanya), rata-rata km/L kendaraan yang datanya cukup, jumlah pengingat
// overdue/due-soon. 0 rumus baru — murni SUM/rata-rata dari vehicleInsight()
// di atas, pola sama persis fleetSummary() di VehicleIntelligence.
fleetInsight() {
  const rows = this._vehicles().map((v) => this.vehicleInsight(v.id)).filter((r) => r.ok);
  const allReminders = rows.reduce((acc, r) => acc.concat(r.reminders), []);
  const withEfficiency = rows.filter((r) => r.current && r.current.ok);
  const avgKmPerLiter = withEfficiency.length
    ? withEfficiency.reduce((s, r) => s + r.current.kmPerLiter, 0) / withEfficiency.length
    : null;
  const totalFuelCost = rows.reduce((s, r) => s + (r.trend ? r.trend.total : 0), 0);
  return {
    totalVehicles: rows.length,
    overdueCount: allReminders.filter((r) => r.severity === 'overdue').length,
    dueSoonCount: allReminders.filter((r) => r.severity === 'due-soon').length,
    avgKmPerLiter,
    totalFuelCost,
    rows,
  };
},

};
