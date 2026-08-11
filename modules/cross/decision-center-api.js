// modules/cross/decision-center-api.js — Personal Decision Center API
// (Sesi 90, Batch 8). Target sesi: Personal Decision Center Foundation.
//
// PRINSIP (RULE #1 sesi ini): 100% REUSE LifeDashboardSummaryAPI.summary()
// (modules/cross/life-dashboard-summary-api.js, Sesi 89) +
// PriorityEngine.getItems() (modules/cross/priority-engine.js, Sesi 90) +
// FinanceIntelligence.insights()/VehicleIntelligence.insights() (Sesi
// 74/76 — sumber yang SAMA PERSIS dipakai CrossInsightPresenter, Sesi 87)
// — TIDAK ada rumus/threshold baru, TIDAK duplikasi logic, TIDAK
// framework baru, TIDAK membaca D langsung sama sekali.
//
// DecisionCenterAPI adalah SATU pintu masuk data gabungan utk lapisan
// "Personal Decision Center" (Recommendation Panel & Action Queue, file
// terpisah, sesi ini juga, 100% konsumsi objek ini) — meneruskan
// briefing/priorityItems/priorityCount APA ADANYA dari layer di
// bawahnya, ditambah `recommendations` (satu-satunya operasi baru:
// FILTER insight gabungan finance+vehicle ke `type === 'warning'` —
// field `type` itu sendiri SUDAH ADA & final dari FinanceIntelligence/
// VehicleIntelligence, pola filter-dari-field-final yang SAMA PERSIS
// dgn PriorityEngine memfilter `.over`/`.severity`; BUKAN kategori/rule
// baru). Membaca ulang FinanceIntelligence.insights()/VehicleIntelligence.
// insights() dari sini (bukan lewat CrossInsightPresenter) BUKAN
// duplikasi logic — CrossInsightPresenter cuma MENGGABUNGKAN (concat)
// keduanya utk 1 feed UI (semua type tampil), tidak pernah memfilter
// `type==='warning'` & tidak mengekspos hasilnya sbg data yang bisa
// dipakai modul lain; pola sama persis catatan unified-ai-briefing.js
// (§ "threshold skor->warna yang juga dibaca/direplikasi independen di
// tiap presenter... BUKAN rumus baru").
//
// TIDAK ada UI di file ini — presenter-presenternya (RecommendationPanel/
// ActionQueue) ada di file terpisah, sesi ini juga, 100% konsumsi objek
// ini.
const DecisionCenterAPI = {

// recommendations() — subset insight gabungan finance+vehicle yang
// type==='warning' (field final dari FinanceIntelligence.insights()/
// VehicleIntelligence.insights(), TIDAK dihitung ulang). [] kalau salah
// satu/keduanya belum dimuat (pola guard sama persis CrossInsightPresenter).
recommendations() {
  const financeInsights = (typeof FinanceIntelligence !== 'undefined' && typeof FinanceIntelligence.insights === 'function')
    ? FinanceIntelligence.insights() : [];
  const vehicleInsights = (typeof VehicleIntelligence !== 'undefined' && typeof VehicleIntelligence.insights === 'function')
    ? VehicleIntelligence.insights() : [];
  return [...financeInsights, ...vehicleInsights].filter((ins) => ins.type === 'warning');
},

// summary() — Personal Decision Center Summary. Reuse 100%
// LifeDashboardSummaryAPI.summary() (briefing) + PriorityEngine.getItems()
// (priorityItems/priorityCount, sumber lebih rinci dari `s.priorityCount`
// milik LifeDashboardSummaryAPI yang cuma angka — di sini dipakai versi
// item-per-item dari PriorityEngine yang SAMA sumbernya, TIDAK dihitung
// ulang) + recommendations() di atas. {ok:false} kalau
// LifeDashboardSummaryAPI belum dimuat, ATAU diteruskan apa adanya kalau
// summary() sendiri {ok:false}.
summary() {
  if (typeof LifeDashboardSummaryAPI === 'undefined') {
    return { ok: false, reason: 'LifeDashboardSummaryAPI belum dimuat' };
  }
  const s = LifeDashboardSummaryAPI.summary();
  if (!s.ok) return s;

  const priority = (typeof PriorityEngine !== 'undefined')
    ? PriorityEngine.getItems()
    : { ok: false, items: [], count: 0 };
  const recommendations = this.recommendations();

  return {
    ok: true,
    briefing: s.briefing,
    priorityItems: priority.items || [],
    priorityCount: priority.ok ? priority.count : (s.priorityCount || 0),
    recommendations,
    recommendationCount: recommendations.length,
  };
},

};
