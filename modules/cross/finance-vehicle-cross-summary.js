// modules/cross/finance-vehicle-cross-summary.js — Finance & Vehicle Cross
// Summary API (Sesi 87, Batch 8). Target sesi: Finance & Vehicle Cross
// Integration Foundation — lihat docs/BATCH_PLAN.md § Batch 8.
//
// PRINSIP (RULE #1 sesi ini): 100% REUSE, TIDAK ada rumus baru, TIDAK
// duplikasi logic, TIDAK ada framework baru, TIDAK mengubah struktur data
// D. CrossSummaryAPI HANYA menggabungkan hasil yang SUDAH ADA dari 2 domain
// terpisah, masing2 sudah punya AI Hook sendiri:
//   - FinanceDashboard.getAIHook()   (modules/finance/finance-dashboard.js,
//     Sesi 75 — sendiri wrapper tipis ke FinanceIntelligence.summary())
//   - VehicleAIHook.fleetSummary()   (modules/vehicle/vehicle-ai-hook.js,
//     Sesi 79 — sendiri gabungan VehicleIntelligence.summary() +
//     VehicleReminder.summary(), fleet-level)
// Pola SAMA PERSIS VehicleAIHook (Sesi 79) sendiri — objek gabungan yang
// tugasnya SATU: jadi satu pintu masuk read-only LINTAS-DOMAIN, 0
// transformasi angka, 0 sorting/filtering/agregasi tambahan atas hasil
// masing2 hook, cuma disatukan jadi satu objek.
//
// TIDAK ada UI/panel/dashboard di file ini — presenter-nya file terpisah
// (modules/cross/cross-dashboard-card.js/cross-insight-presenter.js, sesi
// ini juga tapi murni presenter, 100% reuse layer ini, lihat komentar di
// file itu).
const CrossSummaryAPI = {

// summary() — Cross Summary API. Gabungan FinanceDashboard.getAIHook()
// (net worth/cashflow/budget/health score finance) & VehicleAIHook.
// fleetSummary() (fleet intelligence + reminder vehicle), TANPA parameter
// di kedua sisi (kedua hook sudah akun/fleet-level, bukan per-entitas) —
// 0 recompute, murni pemanggilan ulang. {ok:false} kalau FinanceDashboard
// ATAU VehicleAIHook belum dimuat (guard urutan load / dipakai headless
// di test, pola sama persis fleetSummary() milik VehicleAIHook sendiri).
summary() {
  if (typeof FinanceDashboard === 'undefined') {
    return { ok: false, reason: 'FinanceDashboard belum dimuat' };
  }
  if (typeof VehicleAIHook === 'undefined') {
    return { ok: false, reason: 'VehicleAIHook belum dimuat' };
  }
  const finance = FinanceDashboard.getAIHook();
  const vehicle = VehicleAIHook.fleetSummary();
  return { ok: true, finance, vehicle };
},

};
