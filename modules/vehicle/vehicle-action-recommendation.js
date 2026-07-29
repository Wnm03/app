// modules/vehicle/vehicle-action-recommendation.js — Vehicle Action
// Recommendation (Sesi 82, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7.
//
// PRINSIP (RULE #1 sesi ini): 100% REUSE field `type`/`severity` yang
// SUDAH ADA di tiap recommendation (VehicleRecommendationEngine.
// recommendations(), sesi ini) — TIDAK menyentuh D, TIDAK membaca service
// lain sama sekali, TIDAK menghitung apa pun. Satu-satunya "logic" sesi
// ini adalah tabel lookup teks aksi konkret (`ACTION_MAP`) murni
// presentasional — pola sama persis _icon(type) di VehicleAlertPanel/
// _insightIcon(type) di VehicleInsightFeed (pemetaan type→teks/ikon,
// BUKAN rumus baru, tipe & severity itu sendiri sudah final dari lapisan
// di bawahnya).
//
// TIDAK ada UI/panel di file ini — presenter-nya file terpisah
// (modules/vehicle/vehicle-decision-presenter.js, sesi ini juga).
const VehicleActionRecommendation = {

// ACTION_MAP — lookup [type][severity] → label aksi konkret Bahasa
// Indonesia. type 'service'/'tax'/'fuel' dari VehicleReminder (reuse apa
// adanya), type 'insight' dari VehicleIntelligence.insights() (SELALU
// severity 'warning' di recommendation — lihat VehicleRecommendationEngine
// ._fromInsights()). Murni teks tetap, TIDAK ada logic kondisional di
// balik tabel ini.
ACTION_MAP: {
  service: {
    overdue: 'Jadwalkan servis sekarang',
    'due-soon': 'Rencanakan servis dalam waktu dekat',
  },
  tax: {
    overdue: 'Segera perpanjang pajak/dokumen kendaraan',
    'due-soon': 'Siapkan perpanjangan pajak/dokumen kendaraan',
  },
  fuel: {
    overdue: 'Isi BBM sekarang',
    'due-soon': 'Rencanakan isi BBM dalam waktu dekat',
  },
  insight: {
    warning: 'Tinjau kondisi kendaraan',
  },
},

// DEFAULT_LABEL — fallback kalau kombinasi type/severity belum terdaftar
// di ACTION_MAP (fail-safe, bukan throw — pola sama persis fallback '⛔'
// di VehicleAlertPanel._icon()/'ℹ️' di VehicleInsightFeed._insightIcon()).
DEFAULT_LABEL: 'Tinjau kendaraan',

// actionFor(recommendation) — {label} aksi konkret utk 1 recommendation,
// murni lookup ACTION_MAP[type][severity] apa adanya, fallback
// DEFAULT_LABEL kalau kombinasi belum terdaftar.
actionFor(recommendation) {
  const type = recommendation && recommendation.type;
  const severity = recommendation && recommendation.severity;
  const byType = this.ACTION_MAP[type] || {};
  return { label: byType[severity] || this.DEFAULT_LABEL };
},

// withAction(recommendations) — array recommendation yang sama, ditambah
// field `action` (dari actionFor() di atas). 0 transformasi field lain.
withAction(recommendations) {
  return (Array.isArray(recommendations) ? recommendations : [])
    .map((r) => ({ ...r, action: this.actionFor(r) }));
},

};
