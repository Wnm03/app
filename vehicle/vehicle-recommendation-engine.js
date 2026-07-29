// modules/vehicle/vehicle-recommendation-engine.js — Vehicle
// Recommendation Engine (Sesi 82, Batch 7). Lihat docs/BATCH_PLAN.md §
// Batch 7.
//
// PRINSIP (RULE #1 sesi ini): 100% REUSE VehicleDecisionAPI.context()
// (modules/vehicle/vehicle-decision-api.js, sesi ini — sendiri 100% reuse
// VehicleAIHook) — TIDAK menghitung ulang severity/status apa pun
// (severity 'overdue'/'due-soon' dari VehicleReminder & type
// 'warning' dari VehicleIntelligence.insights() dibaca APA ADANYA).
// Satu-satunya logic genuinely baru sesi ini: MEMILIH item mana dari
// reminder.all + insights yang layak jadi "recommendation" (filter, bukan
// recompute — pola sama persis VehicleAlertPanel/VehicleInsightFeed yang
// juga cuma filter array yang sudah ada) & MENYERAGAMKAN bentuknya jadi 1
// shape recommendation (`{id, source, type, vehicleId, vehicleName,
// severity, message}`) yang dipakai lapisan Priority Scoring & Action
// Recommendation di bawahnya.
//
// reminder.all severity 'info' (mis. data BBM belum cukup) SENGAJA
// dilewati — bukan hal yang perlu "direkomendasikan" tindakan, pola sama
// persis VehicleAlertPanel (HANYA overdue) & VehicleInsightFeed (overdue+
// due-soon, TANPA info). insights type 'info'/'positive' juga dilewati —
// HANYA 'warning' yang genuinely butuh tindakan (pola sama persis
// VehicleInsightFeed yang membedakan icon per type, tapi di sini
// benar-benar difilter krn recommendation ≠ feed tampilan).
//
// TIDAK ada UI/panel di file ini — presenter-nya file terpisah
// (modules/vehicle/vehicle-decision-presenter.js, sesi ini juga).
const VehicleRecommendationEngine = {

// _fromReminders(reminderAll) — helper internal: ubah item
// VehicleReminder.summary().all (severity 'overdue'/'due-soon' saja,
// 'info' dilewati) jadi bentuk recommendation seragam. message/severity/
// vehicleId/vehicleName dibaca APA ADANYA dari item reminder, TIDAK ada
// teks baru yang dikarang di sini (teks aksi konkret ada di
// VehicleActionRecommendation, terpisah dari message reminder ini).
_fromReminders(reminderAll) {
  return (Array.isArray(reminderAll) ? reminderAll : [])
    .filter((r) => r.severity === 'overdue' || r.severity === 'due-soon')
    .map((r) => ({
      id: `reminder-${r.type}-${r.vehicleId}-${r.categoryName || r.taxKey || 'fuel'}`,
      source: 'reminder',
      type: r.type,
      vehicleId: r.vehicleId,
      vehicleName: r.vehicleName,
      severity: r.severity,
      message: r.message,
    }));
},

// _fromInsights(insightsList, vehicleId) — helper internal: ubah insight
// VehicleIntelligence.insights() (type 'warning' saja, 'info'/'positive'
// dilewati) jadi bentuk recommendation seragam. vehicleId dilampirkan apa
// adanya dari parameter (fleet-level kalau null/undefined) krn insight
// fleet-level sendiri tidak menyimpan vehicleId per item.
_fromInsights(insightsList, vehicleId) {
  return (Array.isArray(insightsList) ? insightsList : [])
    .filter((i) => i.type === 'warning')
    .map((i) => ({
      id: `insight-${i.code}-${vehicleId || 'fleet'}`,
      source: 'insight',
      type: 'insight',
      vehicleId: vehicleId || null,
      vehicleName: null,
      severity: 'warning',
      message: i.message,
    }));
},

// recommendations(vehicleId?) — daftar recommendation gabungan reminder
// (overdue/due-soon) + insight (warning), 100% reuse VehicleDecisionAPI.
// context(). Tanpa vehicleId: insight fleet-level dari
// `intelligence.insights` (VehicleIntelligence.summary() base, SELALU
// fleet-level apa pun vehicleId-nya — lihat komentar VehicleIntelligence.
// summary()). Dengan vehicleId: insight KENDARAAN itu dari
// `intelligence.vehicleInsights` (bukan `intelligence.insights` yg tetap
// fleet-level). Array kosong (bukan throw) kalau VehicleDecisionAPI belum
// dimuat atau context() {ok:false} — pola sama persis VehicleAlertPanel/
// VehicleInsightFeed yang silent-kosong kalau data belum tersedia.
recommendations(vehicleId) {
  if (typeof VehicleDecisionAPI === 'undefined') return [];
  const ctx = VehicleDecisionAPI.context(vehicleId);
  if (!ctx.ok) return [];
  const reminderItems = this._fromReminders(ctx.reminder && ctx.reminder.all);
  const insightsList = vehicleId
    ? (ctx.intelligence && ctx.intelligence.vehicleInsights)
    : (ctx.intelligence && ctx.intelligence.insights);
  const insightItems = this._fromInsights(insightsList, vehicleId);
  return [...reminderItems, ...insightItems];
},

};
