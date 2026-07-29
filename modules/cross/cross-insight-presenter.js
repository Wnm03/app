// modules/cross/cross-insight-presenter.js — Finance & Vehicle Shared
// Insight Presenter (Sesi 87, Batch 8). Lihat docs/BATCH_PLAN.md § Batch 8.
//
// PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE
// FinanceIntelligence.insights() (modules/finance/finance-intelligence.js,
// Sesi 74) + VehicleIntelligence.insights() (modules/vehicle/
// vehicle-intelligence.js, Sesi 76, dipanggil TANPA vehicleId = fleet-
// level) — TIDAK ada rule/threshold baru, TIDAK menghitung ulang apa pun,
// murni MENGGABUNGKAN (concat) 2 daftar insight yang SUDAH ADA jadi satu
// feed. Pola SAMA PERSIS VehicleInsightFeed (Sesi 80) — feed list dgn
// ikon per type, SILENT (body dikosongkan) kalau tidak ada insight apa
// pun, TANPA link navigasi.
//
// Beda dgn VehicleInsightFeed: VehicleInsightFeed mencakup insight+
// reminder due-soon SATU domain (vehicle) — CrossInsightPresenter di sini
// LINTAS-DOMAIN (finance+vehicle digabung dlm satu feed), TIDAK menyertakan
// reminder due-soon vehicle (sudah domain VehicleInsightFeed sendiri,
// supaya tidak dobel tampil di 2 tempat) — HANYA insights() dasar dari
// kedua lapisan Intelligence.
//
// Dipanggil dari DashboardHub.render() & live-wiring renderDashboard()
// (modules/shared/modules-render.js), TIDAK ada mekanisme render baru.
const CrossInsightPresenter = {

  // _icon(type) — pemetaan type insight ('warning'/'positive'/'info') ke
  // emoji, pola sama persis _insightIcon() di VehicleInsightFeed, MURNI
  // presentasional.
  _icon(type) {
    return { warning: '🟡', positive: '🟢', info: 'ℹ️' }[type] || 'ℹ️';
  },

  render() {
    const el = document.getElementById('crossInsightBody');
    if (!el) return; // container belum ada di halaman ini, aman diam2.

    const financeInsights = (typeof FinanceIntelligence !== 'undefined' && typeof FinanceIntelligence.insights === 'function')
      ? FinanceIntelligence.insights()
      : [];
    const vehicleInsights = (typeof VehicleIntelligence !== 'undefined' && typeof VehicleIntelligence.insights === 'function')
      ? VehicleIntelligence.insights()
      : [];

    const list = [...financeInsights, ...vehicleInsights]
      .map((ins) => ({ icon: this._icon(ins.type), message: ins.message }));

    if (!list.length) {
      el.innerHTML = '';
      return;
    }

    el.innerHTML = list.map((item) => `
      <div style="padding:8px 0;border-bottom:1px solid var(--border,rgba(255,255,255,.08));font-size:13px;">
        ${item.icon} ${escapeHtml(item.message)}
      </div>
    `).join('');
  },

};
