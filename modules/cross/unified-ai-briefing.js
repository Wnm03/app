// modules/cross/unified-ai-briefing.js — Finance & Vehicle Unified AI
// Briefing (Sesi 88, Batch 8). Lihat docs/BATCH_PLAN.md § Batch 8.
//
// PRINSIP (RULE #1 sesi ini): 100% REUSE UnifiedSummaryAPI.summary()
// (modules/cross/unified-summary-api.js, sesi ini) — TIDAK ada rumus
// baru, TIDAK menghitung ulang health score/fleet/reminder/budget, TIDAK
// membaca D langsung sama sekali. Murni PURE (read-only, tidak menyentuh
// DOM/localStorage) — pola sama persis lapisan Intelligence/Reminder
// (FinanceIntelligence/VehicleIntelligence/VehicleReminder), bukan
// presenter (presenter-nya file terpisah, unified-briefing-presenter.js,
// sesi ini juga).
//
// generate() menyusun ringkasan 1-3 kalimat dari angka yang SUDAH TERSEDIA
// lewat UnifiedSummaryAPI.summary() — pola SAMA PERSIS VehicleDailyBrief
// (Sesi 80, teks 1-2 kalimat dari VehicleAIHook.fleetSummary() apa
// adanya), cuma dipindah ke lapisan LINTAS-DOMAIN (finance+vehicle) &
// dipisah jadi lapisan data murni (generate() mengembalikan {ok,text,
// parts}, bukan langsung menulis ke DOM — beda dari VehicleDailyBrief yang
// menggabung logic teks+render jadi satu file, di sini dipisah sesuai 2
// deliverable terpisah sesi ini: "Unified AI Briefing" (murni data/teks)
// & "Dashboard Briefing Presenter" (UI, file terpisah)).
//
// Kartu "Total Perhatian Gabungan" (CrossDashboardCard, Sesi 87) SUDAH
// menjumlah budget.overCount+vehicle.reminder.overdueCount utk tampilan
// kartu — di sini angka yang SAMA dibaca ulang dari counter mentah yang
// SAMA (budget.overCount/reminder.overdueCount, keduanya sudah ada di
// hasil UnifiedSummaryAPI.summary() apa adanya) utk keperluan TEKS
// (kalimat naratif, bukan kartu angka) — pola konsisten dgn threshold
// skor->warna yang juga dibaca/direplikasi independen di tiap presenter
// (FinanceDashboard/VehicleDashboard/CrossDashboardCard), BUKAN rumus
// baru, murni penjumlahan trivial atas 2 counter yang sudah final dari
// layer di bawahnya.
//
// ARSITEKTUR (S116 — Circular Dependency Hotfix): UnifiedAIBriefing ADA
// DI LAPISAN BAWAH root chain (CrossSummaryAPI -> CrossAIHook ->
// UnifiedSummaryAPI -> UnifiedAIBriefing) yang lalu DIKONSUMSI ke ATAS
// oleh LifeDashboardSummaryAPI -> DecisionCenterAPI -> ActionQueue/
// RecommendationPanel. File ini SENGAJA TIDAK BOLEH membaca ActionQueue,
// DecisionCenterAPI, atau LifeDashboardSummaryAPI (dependency ke ARAH
// SEBALIKNYA akan membentuk siklus balik ke generate() ini sendiri —
// pernah terjadi sesaat di S115 lewat ActionQueue.getQueue(), sudah
// di-revert sesi ini krn menyebabkan "Maximum call stack size exceeded"
// saat rantai modul asli dimuat bersamaan; lihat
// tests/decision-center-dependency-graph.test.js utk regression test yg
// memuat rantai modul ASLI, bukan mock, supaya siklus ini tidak bisa
// balik lagi tanpa ketahuan).
const UnifiedAIBriefing = {

// generate() — Unified AI Briefing. {ok:false} kalau UnifiedSummaryAPI
// belum dimuat ATAU summary() sendiri {ok:false} (diteruskan apa adanya).
// {ok:false, reason:'Tidak ada data untuk briefing'} kalau finance/vehicle
// keduanya tidak tersedia (0 hal buat diceritakan — pola guard "silent
// kalau kosong" sama persis VehicleDailyBrief).
generate() {
  if (typeof UnifiedSummaryAPI === 'undefined') {
    return { ok: false, reason: 'UnifiedSummaryAPI belum dimuat' };
  }
  const s = UnifiedSummaryAPI.summary();
  if (!s.ok) return s;

  const parts = [];

  const fh = (s.finance && s.finance.ok) ? s.finance.healthScore : null;
  if (fh) {
    parts.push(`Skor kesehatan finansial ${fh.score}/100 (${fh.label}).`);
  }

  const fleet = (s.vehicle && s.vehicle.ok && s.vehicle.intelligence) ? s.vehicle.intelligence.fleet : null;
  if (fleet && fleet.totalVehicles) {
    parts.push(`Skor kesehatan armada ${fleet.avgHealth}/100 dari ${fleet.totalVehicles} kendaraan.`);
  }

  const budgetOver = (s.finance && s.finance.ok && s.finance.budget && s.finance.budget.ok) ? (s.finance.budget.overCount || 0) : 0;
  const vehicleOverdue = (s.vehicle && s.vehicle.ok && s.vehicle.reminder) ? (s.vehicle.reminder.overdueCount || 0) : 0;
  const totalAttention = budgetOver + vehicleOverdue;
  if (totalAttention > 0) {
    parts.push(`${totalAttention} hal butuh perhatian (${budgetOver} anggaran lewat batas, ${vehicleOverdue} servis/pajak/BBM lewat jatuh tempo).`);
  } else if (fh || (fleet && fleet.totalVehicles)) {
    parts.push('Tidak ada hal mendesak yang butuh perhatian saat ini.');
  }

  if (s.insightCount > 0) {
    parts.push(`${s.insightCount} insight tersedia hari ini.`);
  }

  if (!parts.length) {
    return { ok: false, reason: 'Tidak ada data untuk briefing' };
  }
  return { ok: true, text: parts.join(' '), parts };
},

};
