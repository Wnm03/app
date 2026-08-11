// modules/vehicle/vehicle-reminder-scheduler.js — Smart Reminder
// Scheduler (Sesi 83, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7.
//
// PRINSIP (RULE #1 sesi ini): 100% REUSE VehicleAutomationAPI.context()
// (modules/vehicle/vehicle-automation-api.js, sesi ini) — TIDAK
// menghitung ulang severity/priorityScore/action apa pun (field-field
// itu dibaca APA ADANYA dari tiap item). Satu-satunya logic genuinely
// baru sesi ini: tabel lookup severity -> {bucket,label} "kapan"
// (`SCHEDULE_MAP`), MURNI klasifikasi/presentasional (pola sama persis
// ACTION_MAP di VehicleActionRecommendation / SEVERITY_WEIGHT di
// VehiclePriorityScoring — bukan ambang numerik baru atas data mentah,
// severity itu sendiri SUDAH final dari VehicleReminder/
// VehicleIntelligence, jauh sebelum sampai di sini).
//
// TIDAK ada UI/panel di file ini — presenter-nya file terpisah
// (modules/vehicle/vehicle-automation-presenter.js, sesi ini juga).
const VehicleReminderScheduler = {

// SCHEDULE_MAP — lookup severity -> {bucket, label}, SATU-SATUNYA
// "rumus" baru sesi ini. 'overdue' => hari ini (risiko langsung, sama
// urutan bisnis dgn SEVERITY_WEIGHT VehiclePriorityScoring), 'warning'
// (insight VehicleIntelligence) => perlu ditinjau (belum ada tenggat
// konkret), 'due-soon' => minggu ini (masih ada waktu bersiap).
SCHEDULE_MAP: {
  overdue: { bucket: 'today', label: 'Segera (Hari Ini)' },
  warning: { bucket: 'soon', label: 'Perlu Ditinjau' },
  'due-soon': { bucket: 'upcoming', label: 'Minggu Ini' },
},

// DEFAULT_SCHEDULE — fallback kalau severity belum terdaftar di
// SCHEDULE_MAP (fail-safe, bukan throw — pola sama persis DEFAULT_LABEL
// di VehicleActionRecommendation).
DEFAULT_SCHEDULE: { bucket: 'upcoming', label: 'Minggu Ini' },

// _scheduleFor(item) — {bucket,label} murni lookup SCHEDULE_MAP
// berdasarkan field `severity` yang sudah ada di item (reuse
// VehicleAutomationAPI, TIDAK ada input lain yang dibaca).
_scheduleFor(item) {
  const severity = item && item.severity;
  return this.SCHEDULE_MAP[severity] || this.DEFAULT_SCHEDULE;
},

// schedule(vehicleId?) — array item VehicleAutomationAPI.context().items
// yang sama, ditambah field `schedule` ({bucket,label}) dari
// _scheduleFor() di atas. Array kosong (bukan throw) kalau
// VehicleAutomationAPI belum dimuat atau context() {ok:false} — pola
// sama persis VehicleRecommendationEngine.recommendations().
schedule(vehicleId) {
  if (typeof VehicleAutomationAPI === 'undefined') return [];
  const ctx = VehicleAutomationAPI.context(vehicleId);
  if (!ctx.ok) return [];
  return ctx.items.map((item) => ({ ...item, schedule: this._scheduleFor(item) }));
},

// summary(vehicleId?) — Reminder Scheduler Summary API, hitungan per
// bucket (today/soon/upcoming) dari schedule() di atas, 0 recompute
// field lain — satu pintu masuk ringkas utk presenter/consumer lain
// (pola sama persis summary() di VehicleReminder/VehicleIntelligence).
summary(vehicleId) {
  const items = this.schedule(vehicleId);
  const counts = { today: 0, soon: 0, upcoming: 0 };
  items.forEach((item) => {
    const bucket = item.schedule.bucket;
    if (Object.prototype.hasOwnProperty.call(counts, bucket)) counts[bucket] += 1;
  });
  return { total: items.length, counts, items };
},

};
