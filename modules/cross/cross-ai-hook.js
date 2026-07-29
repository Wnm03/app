// modules/cross/cross-ai-hook.js — Finance & Vehicle Unified AI Hook
// (Sesi 87, Batch 8). Lihat docs/BATCH_PLAN.md § Batch 8.
//
// PRINSIP (RULE #1 sesi ini): 100% REUSE CrossSummaryAPI.summary()
// (modules/cross/finance-vehicle-cross-summary.js, sesi ini) — TIDAK ada
// rumus baru, TIDAK transformasi data, TIDAK membaca D langsung sama
// sekali. Pola SAMA PERSIS FinanceDashboard.getAIHook()/VehicleDashboard.
// getAIHook() — WRAPPER TIPIS, satu pintu masuk read-only utk konsumen
// AI/briefing LINTAS-DOMAIN masa depan (ai-chat.js dst, di luar scope
// sesi ini — TIDAK ada wiring AI baru sesi ini). Nama "hook" di sini
// murni istilah UI (titik akses data), BUKAN React hook/lifecycle hook
// apa pun.
//
// Beda dengan CrossSummaryAPI: CrossSummaryAPI ADALAH lapisan gabungan
// (menggabungkan FinanceDashboard.getAIHook()+VehicleAIHook.fleetSummary()
// jadi satu objek). CrossAIHook di sini adalah wrapper presentasional di
// atasnya — pola yang sama persis dipisahkan di domain finance
// (FinanceIntelligence = agregasi, FinanceDashboard.getAIHook() = pintu
// masuk AI) & domain vehicle (VehicleIntelligence+VehicleReminder =
// agregasi, VehicleAIHook = pintu masuk AI gabungan) — supaya lapisan
// "pintu masuk AI" konsisten namanya di ketiga domain (finance/vehicle/
// cross), bukan arsitektur baru.
const CrossAIHook = {

// getAIHook() — reuse 100% CrossSummaryAPI.summary(), 0 transformasi.
// Guard: kalau CrossSummaryAPI belum dimuat, balikin {ok:false} alih-alih
// throw (pola sama persis getAIHook() FinanceDashboard/VehicleDashboard &
// fleetSummary() VehicleAIHook).
getAIHook() {
  if (typeof CrossSummaryAPI === 'undefined') {
    return { ok: false, reason: 'CrossSummaryAPI belum dimuat' };
  }
  return CrossSummaryAPI.summary();
},

};
