// modules/cross/life-dashboard-summary-api.js — Personal Life Dashboard
// Summary API (Sesi 89, Batch 8). Lihat docs/BATCH_PLAN.md § Batch 8.
//
// PRINSIP (RULE #1 sesi ini): 100% REUSE UnifiedSummaryAPI.summary()
// (modules/cross/unified-summary-api.js, Sesi 88 — sendiri gabungan
// CrossAIHook.getAIHook() apa adanya) + UnifiedAIBriefing.generate()
// (modules/cross/unified-ai-briefing.js, Sesi 88) — TIDAK ada rumus baru,
// TIDAK duplikasi logic, TIDAK framework baru, TIDAK membaca D langsung
// sama sekali. LifeDashboardSummaryAPI HANYA menyiapkan SATU pintu masuk
// gabungan utk seluruh lapisan "Personal Life Dashboard" (presenter-nya
// file terpisah, sesi ini juga) — meneruskan finance/vehicle/insightCount
// APA ADANYA dari UnifiedSummaryAPI, ditambah `briefing` (teks siap-pakai
// dari UnifiedAIBriefing, APA ADANYA) & `priorityCount` (PENJUMLAHAN MURNI
// 2 counter yang SUDAH ADA — finance.budget.overCount +
// (vehicle.reminder.overdueCount + vehicle.reminder.dueSoonCount) — BUKAN
// ambang/skoring baru, pola SAMA PERSIS insightCount milik
// UnifiedSummaryAPI sendiri yang juga cuma menjumlah panjang 2 array yang
// sudah ada).
//
// TIDAK ada UI di file ini — presenter-presenter Personal Life Dashboard
// (Personal Overview/Cross Module Widgets/Priority Panel/Unified Dashboard
// Home) ada di file terpisah, sesi ini juga, 100% konsumsi objek ini.
const LifeDashboardSummaryAPI = {

// summary() — Life Dashboard Summary API. Reuse 100% UnifiedSummaryAPI.
// summary() (finance+vehicle+insightCount, TANPA parameter). {ok:false}
// kalau UnifiedSummaryAPI belum dimuat, ATAU diteruskan apa adanya kalau
// UnifiedSummaryAPI.summary() sendiri {ok:false} (pola sama persis
// UnifiedAIBriefing.generate() yang meneruskan {ok:false} dari layer di
// bawahnya tanpa membungkus ulang).
summary() {
  if (typeof UnifiedSummaryAPI === 'undefined') {
    return { ok: false, reason: 'UnifiedSummaryAPI belum dimuat' };
  }
  const s = UnifiedSummaryAPI.summary();
  if (!s.ok) return s;

  const briefing = (typeof UnifiedAIBriefing !== 'undefined')
    ? UnifiedAIBriefing.generate()
    : { ok: false, reason: 'UnifiedAIBriefing belum dimuat' };

  const budgetOver = (s.finance && s.finance.ok && s.finance.budget && s.finance.budget.ok)
    ? (s.finance.budget.overCount || 0) : 0;
  const vehicleOverdue = (s.vehicle && s.vehicle.ok && s.vehicle.reminder)
    ? (s.vehicle.reminder.overdueCount || 0) : 0;
  const vehicleDueSoon = (s.vehicle && s.vehicle.ok && s.vehicle.reminder)
    ? (s.vehicle.reminder.dueSoonCount || 0) : 0;

  return {
    ok: true,
    finance: s.finance,
    vehicle: s.vehicle,
    insightCount: s.insightCount,
    briefing,
    priorityCount: budgetOver + vehicleOverdue + vehicleDueSoon,
  };
},

};
