// modules/cross/priority-engine.js — Priority Engine (Sesi 90, Batch 8).
// Target sesi: Personal Decision Center Foundation.
//
// PRINSIP (RULE #1 sesi ini): 100% REUSE LifeDashboardSummaryAPI.summary()
// (modules/cross/life-dashboard-summary-api.js, Sesi 89) — TIDAK ada rumus/
// skoring baru, TIDAK menghitung ulang severity/status apa pun. Satu-
// satunya operasi di sini adalah FILTER + URUTKAN 2 array yang SUDAH ADA
// ke kondisi "butuh perhatian" yang SUDAH FINAL dari layer di bawahnya:
//   - s.finance.budget.items difilter `.over === true`
//     (FinanceIntelligence.budgetSummary(), field `over` sudah final)
//   - s.vehicle.reminder.all difilter severity 'overdue'/'due-soon'
//     (VehicleReminder.summary(), field `severity` sudah final)
// Urutan hasil (overdue kendaraan -> anggaran lewat limit -> due-soon
// kendaraan) murni pengelompokan berdasar severity yang SUDAH ADA, BUKAN
// scoring/rank numerik baru.
//
// CATATAN REFAKTOR: filter+urutan ini SEBELUMNYA hidup langsung di dalam
// LifePriorityPanel.render() (Sesi 89). Sesi ini (90) dipindah ke sini
// supaya jadi SATU sumber logic yang bisa dipakai lebih dari satu
// konsumen (LifePriorityPanel — presenter UI panel yang sudah ada — &
// DecisionCenterAPI — data layer baru sesi ini) TANPA duplikasi logic
// filter yang sama di 2 tempat (WAJIB sesi ini: "Tanpa duplicate
// logic"). LifePriorityPanel.render() diubah jadi konsumen murni
// PriorityEngine.getItems(), TIDAK lagi memfilter s.finance/s.vehicle
// sendiri — lihat life-priority-panel.js.
//
// Murni PURE (read-only, tidak menyentuh DOM/localStorage) — pola sama
// persis lapisan Intelligence/Reminder/UnifiedSummaryAPI, bukan presenter.
const PriorityEngine = {

// getItems() — daftar item "butuh perhatian" gabungan finance+vehicle,
// sudah terurut (overdue kendaraan -> anggaran lewat limit -> due-soon
// kendaraan). {ok:false, items:[], count:0} kalau LifeDashboardSummaryAPI
// belum dimuat ATAU summary() sendiri {ok:false} — bentuk items/count
// tetap disediakan (array kosong) supaya konsumen TIDAK perlu guard
// tambahan utk kasus gagal (pola sama VehicleReminder.summary() yang
// selalu menyediakan array meski kosong).
getItems() {
  if (typeof LifeDashboardSummaryAPI === 'undefined') {
    return { ok: false, reason: 'LifeDashboardSummaryAPI belum dimuat', items: [], count: 0 };
  }
  const s = LifeDashboardSummaryAPI.summary();
  if (!s.ok) return { ok: false, reason: s.reason, items: [], count: 0 };

  const financeOver = (s.finance && s.finance.ok && s.finance.budget && s.finance.budget.ok && Array.isArray(s.finance.budget.items))
    ? s.finance.budget.items.filter((b) => b.over) : [];
  const vehicleAll = (s.vehicle && s.vehicle.ok && s.vehicle.reminder && Array.isArray(s.vehicle.reminder.all))
    ? s.vehicle.reminder.all : [];
  const vehicleOverdue = vehicleAll.filter((r) => r.severity === 'overdue');
  const vehicleDueSoon = vehicleAll.filter((r) => r.severity === 'due-soon');

  const items = [
    ...vehicleOverdue.map((r) => ({ kind: 'vehicle', severity: 'overdue', vehicleType: r.type, message: r.message })),
    ...financeOver.map((b) => ({ kind: 'finance', severity: 'over', name: b.name })),
    ...vehicleDueSoon.map((r) => ({ kind: 'vehicle', severity: 'due-soon', vehicleType: r.type, message: r.message })),
  ];

  return { ok: true, items, count: items.length };
},

};
