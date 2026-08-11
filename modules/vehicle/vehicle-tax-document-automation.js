// modules/vehicle/vehicle-tax-document-automation.js — Tax & Document
// Automation (Sesi 83, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7.
//
// PRINSIP (RULE #1 sesi ini): 100% REUSE VehicleReminderScheduler.
// schedule() (modules/vehicle/vehicle-reminder-scheduler.js, sesi ini —
// sendiri 100% reuse VehicleAutomationAPI -> Decision Engine) — TIDAK
// menyentuh D, TIDAK membaca service lain sama sekali, TIDAK menghitung
// apa pun. Satu-satunya "logic" sesi ini adalah MEMILIH (filter, bukan
// recompute) item dengan `type === 'tax'` — pola SAMA PERSIS
// VehicleMaintenanceAutomation (sesi ini juga), bedanya cuma nilai type
// yang difilter.
//
// TIDAK ada UI/panel di file ini — presenter-nya file terpisah
// (modules/vehicle/vehicle-automation-presenter.js, sesi ini juga).
const VehicleTaxDocumentAutomation = {

// tasks(vehicleId?) — daftar task pajak/dokumen (type 'tax' saja) dari
// VehicleReminderScheduler.schedule(), field message/severity/schedule/
// action/priorityScore dibaca APA ADANYA (0 teks baru dikarang di sini).
// Array kosong (bukan throw) kalau VehicleReminderScheduler belum
// dimuat — pola sama persis VehicleMaintenanceAutomation.tasks().
tasks(vehicleId) {
  if (typeof VehicleReminderScheduler === 'undefined') return [];
  return VehicleReminderScheduler.schedule(vehicleId).filter((item) => item.type === 'tax');
},

// plan(vehicleId?) — satu pintu masuk ringkas: total task + daftar task
// itu sendiri (pola sama persis summary() di modul-modul lain), 0
// transformasi tambahan atas tasks() di atas.
plan(vehicleId) {
  const tasks = this.tasks(vehicleId);
  return { total: tasks.length, tasks };
},

};
