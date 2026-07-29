// modules/vehicle/vehicle-priority-scoring.js — Vehicle Priority Scoring
// (Sesi 82, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7.
//
// PRINSIP (RULE #1 sesi ini): 100% REUSE field `severity` yang SUDAH ADA
// di tiap recommendation (VehicleRecommendationEngine.recommendations(),
// sesi ini — severity itu sendiri reuse apa adanya dari VehicleReminder/
// VehicleIntelligence, TIDAK dihitung ulang) — TIDAK menyentuh D, TIDAK
// membaca service lain sama sekali. Satu-satunya logic genuinely baru
// sesi ini: tabel bobot skor per severity (`SEVERITY_WEIGHT`) & fungsi
// pengurutan berdasarkan skor itu — pola KOMPOSIT sama persis
// VehicleIntelligence.healthScore() (skor 0-100 dari bobot per komponen),
// bedanya di sini input-nya 1 field severity (bukan beberapa komponen
// digabung) jadi tabel lookup datar, bukan rata-rata tertimbang.
//
// Urutan prioritas (tertinggi→terendah), rasional bisnis: 'overdue'
// (servis/pajak/BBM sudah lewat jatuh tempo — risiko langsung) >
// 'warning' (insight VehicleIntelligence, mis. health score rendah —
// kondisi umum perlu perhatian tapi belum ada tenggat konkret) >
// 'due-soon' (akan jatuh tempo, masih ada waktu bersiap). TIDAK ada
// ambang baru diciptakan — urutan ini murni PEMOSISIAN 3 nilai severity
// yang SUDAH ADA, bukan threshold numerik baru atas data mentah.
//
// TIDAK ada UI/panel di file ini — presenter-nya file terpisah
// (modules/vehicle/vehicle-decision-presenter.js, sesi ini juga).
const VehiclePriorityScoring = {

// SEVERITY_WEIGHT — tabel skor 0-100 per severity, SATU-SATUNYA "rumus"
// baru sesi ini. Nilai lain (default 0) dijaga eksplisit di score() kalau
// suatu saat ada severity baru yang belum terdaftar di sini (fail-safe,
// bukan throw).
SEVERITY_WEIGHT: {
  overdue: 100,
  warning: 60,
  'due-soon': 40,
},

// score(recommendation) — skor prioritas 0-100 dari 1 recommendation,
// murni lookup SEVERITY_WEIGHT berdasarkan field `severity` yang sudah
// ada di recommendation (reuse VehicleRecommendationEngine, TIDAK ada
// input lain yang dibaca).
score(recommendation) {
  const severity = recommendation && recommendation.severity;
  return this.SEVERITY_WEIGHT[severity] || 0;
},

// rank(recommendations) — array recommendation yang sama, ditambah field
// `priorityScore` (dari score() di atas) & diurutkan menurun (skor
// tertinggi dulu). Urutan asli (sesama skor sama) dipertahankan (stable
// sort — Array.prototype.sort di Node.js modern sudah stable) — TIDAK ada
// tie-breaker tambahan yang dikarang di sini.
rank(recommendations) {
  return (Array.isArray(recommendations) ? recommendations : [])
    .map((r) => ({ ...r, priorityScore: this.score(r) }))
    .sort((a, b) => b.priorityScore - a.priorityScore);
},

};
