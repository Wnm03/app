// modules/vehicle/vehicle-decision-api.js — Vehicle Decision API
// (Sesi 82, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7.
//
// PRINSIP (RULE #1 sesi ini): 100% REUSE VehicleAIHook.fleetSummary()/
// .vehicleInsight(vehicleId) (modules/vehicle/vehicle-ai-hook.js, Sesi 79
// — sendiri sudah gabungan VehicleIntelligence.summary() (Sesi 76) +
// VehicleReminder.summary() (Sesi 78)) — TIDAK ada rumus baru, TIDAK
// menghitung ulang health score/reminder/insight apa pun, TIDAK
// mengubah struktur data D. Satu-satunya "logic" di file ini adalah
// memilih apakah memanggil fleetSummary() (tanpa vehicleId) atau
// vehicleInsight(vehicleId) (dengan vehicleId) & membungkus hasilnya jadi
// bentuk seragam `{ok, vehicleId, intelligence, reminder}` — pola sama
// persis wrapper tipis VehicleAIHook sendiri terhadap Intelligence+
// Reminder.
//
// Tujuan: 1 pintu masuk TUNGGAL utk seluruh lapisan Decision Engine sesi
// ini (VehicleRecommendationEngine dst di bawahnya HANYA boleh baca lewat
// file ini, bukan panggil VehicleAIHook/VehicleIntelligence/
// VehicleReminder langsung — supaya kalau sumber data decision berubah di
// masa depan, cukup diubah di 1 tempat). TIDAK ada UI/panel di file ini.
const VehicleDecisionAPI = {

// context(vehicleId?) — titik masuk tunggal data mentah utk Decision
// Engine. Tanpa vehicleId: fleet-level (reuse VehicleAIHook.
// fleetSummary()). Dengan vehicleId: 1 kendaraan (reuse VehicleAIHook.
// vehicleInsight(vehicleId), termasuk {ok:false} kalau kendaraan tidak
// ditemukan — reuse apa adanya, TIDAK menduplikasi pengecekan). {ok:false}
// kalau VehicleAIHook belum dimuat (guard urutan load / dipakai headless
// di test, pola sama persis guard {ok:false} di VehicleAIHook sendiri).
context(vehicleId) {
  if (typeof VehicleAIHook === 'undefined') {
    return { ok: false, reason: 'VehicleAIHook belum dimuat' };
  }
  const hook = vehicleId ? VehicleAIHook.vehicleInsight(vehicleId) : VehicleAIHook.fleetSummary();
  if (!hook.ok) return hook;
  return {
    ok: true,
    vehicleId: vehicleId || null,
    intelligence: hook.intelligence,
    reminder: hook.reminder,
  };
},

};
