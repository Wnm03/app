// modules/vehicle/vehicle-automation-api.js — Vehicle Automation API
// (Sesi 83, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7.
//
// PRINSIP (RULE #1 sesi ini): 100% REUSE VehicleRecommendationEngine.
// recommendations() + VehiclePriorityScoring.rank() + VehicleAction
// Recommendation.withAction() (modules/vehicle/vehicle-recommendation-
// engine.js, vehicle-priority-scoring.js, vehicle-action-recommendation.js
// — Sesi 82, Vehicle Decision Engine Foundation, sendiri sudah gabungan
// VehicleDecisionAPI -> VehicleAIHook -> VehicleIntelligence+
// VehicleReminder) — TIDAK ada rumus baru, TIDAK menghitung ulang
// severity/priorityScore/action apa pun, TIDAK membaca D langsung sama
// sekali, TIDAK mengubah struktur data D. Satu-satunya "logic" di file
// ini adalah menjalankan PIPELINE Decision Engine yang SUDAH ADA
// (recommendations() -> rank() -> withAction(), pola sama persis
// pipeline VehicleDecisionPresenter.render()) & membungkus hasilnya jadi
// bentuk seragam `{ok, vehicleId, items}` — pola sama persis wrapper
// tipis VehicleDecisionAPI.context() terhadap VehicleAIHook.
//
// Tujuan: 1 pintu masuk TUNGGAL utk seluruh lapisan Automation Foundation
// sesi ini (VehicleReminderScheduler dst di bawahnya HANYA boleh baca
// lewat file ini, bukan panggil VehicleRecommendationEngine/
// VehiclePriorityScoring/VehicleActionRecommendation langsung — supaya
// kalau sumber data automation berubah di masa depan, cukup diubah di 1
// tempat, pola sama persis VehicleDecisionAPI terhadap VehicleAIHook).
// TIDAK ada UI/panel di file ini.
const VehicleAutomationAPI = {

// context(vehicleId?) — titik masuk tunggal data mentah utk lapisan
// Automation. {ok:false} kalau salah satu dari ketiga modul Decision
// Engine belum dimuat (guard urutan load / dipakai headless di test,
// pola sama persis guard {ok:false} di VehicleDecisionAPI). items = hasil
// pipeline recommendations() -> rank() -> withAction() APA ADANYA, 0
// transformasi tambahan.
context(vehicleId) {
  if (typeof VehicleRecommendationEngine === 'undefined'
    || typeof VehiclePriorityScoring === 'undefined'
    || typeof VehicleActionRecommendation === 'undefined') {
    return { ok: false, reason: 'Vehicle Decision Engine belum dimuat' };
  }
  const recommendations = VehicleRecommendationEngine.recommendations(vehicleId);
  const ranked = VehiclePriorityScoring.rank(recommendations);
  const items = VehicleActionRecommendation.withAction(ranked);
  return {
    ok: true,
    vehicleId: vehicleId || null,
    items,
  };
},

};
