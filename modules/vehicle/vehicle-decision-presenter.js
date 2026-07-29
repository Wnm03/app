// modules/vehicle/vehicle-decision-presenter.js — Vehicle Decision
// Presenter (Sesi 82, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7.
//
// PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE
// VehicleRecommendationEngine.recommendations() + VehiclePriorityScoring.
// rank() + VehicleActionRecommendation.withAction() (ketiganya sesi ini)
// — TIDAK ada rumus baru, TIDAK menghitung ulang severity/priorityScore/
// action apa pun di file ini, TIDAK membaca D langsung sama sekali (pola
// sama persis VehicleAnalyticsPresenter/VehicleInsightPresenter yang juga
// 0 pembacaan D). Satu-satunya operasi presentasional di sini: pemetaan
// type→ikon & severity→warna border (MURNI tampilan, pola sama persis
// _icon(type) di VehicleAlertPanel/_insightIcon(type) di
// VehicleInsightFeed) & pembatasan maks 5 item ditampilkan (pola sama
// persis .slice(0, 8) di VehicleInsightFeed).
//
// Pola SILENT-kalau-kosong sama persis VehicleAlertPanel/VehicleInsightFeed
// — TIDAK menambah ruang kosong permanen kalau tidak ada recommendation
// (armada aman).
//
// Dipanggil dari renderCnTab() (modules/shared/modules-render.js) — DIPINDAH dari
// DashboardHub.render() di Sesi 133, live-wiring renderDashboard() DIHAPUS di Sesi 134
// (gap fix, sudah dobel dgn renderCnTab(), lihat CHANGELOG.md Sesi 134)
// (modules/shared/modules-render.js), TIDAK ada mekanisme render baru.
//
// CSS: TIDAK ada class baru — reuse penuh var(--accent)/var(--accent2)/
// var(--accent4) (styles.css, SUDAH ADA per-tema) & class utilitas
// u-fs11/u-fs12/u-lh15/u-t2/u-mb6/u-fw700 (SUDAH dipakai VehicleAlertPanel/
// VehicleInsightFeed) apa adanya.
const VehicleDecisionPresenter = {

// _icon(type) — pemetaan type recommendation ('service'/'tax'/'fuel'/
// 'insight') ke emoji, MURNI presentasional, pola sama persis
// VehicleAlertPanel._icon()/VehicleInsightFeed._insightIcon() (tipe itu
// sendiri sudah ada di tiap recommendation dari VehicleRecommendationEngine).
_icon(type) {
  return { service: '🔧', tax: '📋', fuel: '⛽', insight: '💡' }[type] || '⛔';
},

// _borderColor(severity) — pemetaan severity ('overdue'/'due-soon'/
// 'warning') ke token warna tema yang SUDAH ADA (styles.css), MURNI
// presentasional — TIDAK ada token CSS baru.
_borderColor(severity) {
  return { overdue: 'var(--accent4)', 'due-soon': 'var(--accent)', warning: 'var(--accent2)' }[severity] || 'var(--accent4)';
},

_row(r) {
  return `
    <div class="u-fs12 u-lh15 u-t2 u-mb6" style="border-left:3px solid ${this._borderColor(r.severity)};padding-left:8px;">
      <div>${this._icon(r.type)} ${escapeHtml(r.message)}</div>
      <div class="u-fs11 u-fw700 u-t2" style="opacity:.8;">→ ${escapeHtml(r.action.label)}</div>
    </div>
  `;
},

render() {
  const el = document.getElementById('vehDecisionBody');
  if (!el) return; // container belum ada di halaman ini, aman diam2.

  if (typeof VehicleRecommendationEngine === 'undefined'
    || typeof VehiclePriorityScoring === 'undefined'
    || typeof VehicleActionRecommendation === 'undefined') {
    el.innerHTML = '';
    return;
  }

  const recommendations = VehicleRecommendationEngine.recommendations();
  if (!recommendations.length) { el.innerHTML = ''; return; }

  const ranked = VehiclePriorityScoring.rank(recommendations);
  const withAction = VehicleActionRecommendation.withAction(ranked);
  const top = withAction.slice(0, 5);

  const rows = top.map((r) => this._row(r)).join('');
  el.innerHTML = `<div class="u-fs11 u-fw700 u-t2 u-mb6 u-mt10">🧭 Rekomendasi Kendaraan</div>${rows}`;
},

};
