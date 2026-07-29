// modules/cross/unified-summary-api.js — Finance & Vehicle Unified Summary
// API (Sesi 88, Batch 8). Target sesi: Unified AI Briefing Foundation —
// lihat docs/BATCH_PLAN.md § Batch 8.
//
// PRINSIP (RULE #1 sesi ini): 100% REUSE CrossAIHook.getAIHook() (modules/
// cross/cross-ai-hook.js, Sesi 87 — sendiri wrapper tipis ke CrossSummaryAPI.
// summary(), gabungan FinanceDashboard.getAIHook()+VehicleAIHook.
// fleetSummary()) — TIDAK ada rumus baru, TIDAK duplikasi logic, TIDAK
// framework baru, TIDAK mengubah struktur data D. UnifiedSummaryAPI HANYA
// menyiapkan bentuk data yang siap-pakai utk lapisan briefing (sesi ini
// juga, lihat unified-ai-briefing.js) — meneruskan finance/vehicle APA
// ADANYA dari CrossAIHook, ditambah `insightCount` (PENJUMLAHAN MURNI
// panjang 2 array insight yang SUDAH ADA — finance.insights.length +
// vehicle.intelligence.insights.length — BUKAN membangun daftar gabungan
// baru, supaya TIDAK duplikasi logic penggabungan feed yang sudah jadi
// tanggung jawab CrossInsightPresenter (Sesi 87); satu-satunya aritmatika
// di sini murni MENGHITUNG panjang, pola sama persis VehicleReminder.
// summary() yang menjumlah overdueCount+dueSoonCount+infoCount jadi total).
//
// TIDAK ada UI di file ini — presenter briefing-nya file terpisah
// (modules/cross/unified-briefing-presenter.js, sesi ini juga tapi murni
// presenter, 100% reuse unified-ai-briefing.js -> layer ini).
const UnifiedSummaryAPI = {

// summary() — Unified Summary API. Reuse 100% CrossAIHook.getAIHook()
// (finance+vehicle apa adanya, TANPA parameter — sudah akun/fleet-level).
// {ok:false} kalau CrossAIHook belum dimuat, ATAU diteruskan apa adanya
// kalau CrossAIHook.getAIHook() sendiri {ok:false} (pola sama persis
// vehicleInsight() milik VehicleAIHook yang meneruskan {ok:false} dari
// layer di bawahnya tanpa membungkus ulang).
summary() {
  if (typeof CrossAIHook === 'undefined') {
    return { ok: false, reason: 'CrossAIHook belum dimuat' };
  }
  const hook = CrossAIHook.getAIHook();
  if (!hook.ok) return hook;

  const financeInsightCount = (hook.finance && hook.finance.ok && Array.isArray(hook.finance.insights))
    ? hook.finance.insights.length : 0;
  const vehicleInsightCount = (hook.vehicle && hook.vehicle.ok && hook.vehicle.intelligence && Array.isArray(hook.vehicle.intelligence.insights))
    ? hook.vehicle.intelligence.insights.length : 0;

  return {
    ok: true,
    finance: hook.finance,
    vehicle: hook.vehicle,
    insightCount: financeInsightCount + vehicleInsightCount,
  };
},

};
