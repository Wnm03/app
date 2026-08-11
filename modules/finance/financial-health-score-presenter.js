// modules/finance/financial-health-score-presenter.js — Financial Health
// Score Presenter (Sesi 98, Batch 10). Target sesi: Financial Health
// Score Foundation — lihat catatan lengkap di modules/finance/
// financial-health-score-api.js.
//
// PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE
// `FinancialHealthScoreAPI.summary()` (modules/finance/
// financial-health-score-api.js, sesi ini — sendiri 100% reuse
// `FinanceIntelligence.healthScore()`, modules/finance/
// finance-intelligence.js) — TIDAK ada rumus baru, TIDAK menghitung
// ulang skor/komponen/rekomendasi apa pun, TIDAK membaca D/
// FinanceIntelligence langsung. Pola SAMA PERSIS
// `RetirementPlannerPresenter.render()` (Sesi 97 — 3 kartu, container
// `findash-grid` generik yang sama).
//
// Dipanggil dari renderKeuangan() (DIPINDAH dari DashboardHub.render() di Sesi 133; pola "tambahan murni" sama
// persis RetirementPlannerPresenter.render() — lihat komentar di
// dashboard-hub.js). Live-wiring renderDashboard() DIHAPUS di Sesi 134 (gap fix,
// sudah dobel dgn renderKeuangan(), lihat CHANGELOG.md Sesi 134), TIDAK ada mekanisme render baru.
// CSS TIDAK baru — reuse penuh class findash-grid/findash-card (grid
// generik, sudah dipakai FinanceDashboard/.../RetirementPlannerPresenter/dst).
//
// FINHEALTH_NAV_TARGETS (S254A — Batch Finance Navigation Consistency) —
// tujuan navigasi tiap kartu #financialHealthScoreGrid. MURNI DATA (0
// logic navigasi baru), format {page,goTo} SAMA PERSIS format target
// dashHubNavigateToFeature() yang SUDAH ADA (dashboard-hub.js). Nama
// disendirikan per-file supaya tidak bentrok dgn const global lain (lihat
// kasus S251/S253). Ketiga kartu murni komposit 1 skor kesehatan finansial
// yang sama — TIDAK ada 1 daftar spesifik per komponen, jadi target =
// container section-nya sendiri (financialHealthScoreWrap, dashboard-hub,
// TERVERIFIKASI ADA di index.html/app_production.html), pola sama persis
// VEHICLE_ANALYTICS_NAV_TARGETS.total/trend (self-scroll utk kartu
// komposit).
const FINHEALTH_NAV_TARGETS = Object.freeze({
  self: { page: 'keuangan', tab: 'laporan', goTo: 'financialHealthScoreWrap' },
});
const FinancialHealthScorePresenter = {

  render() {
    const el = document.getElementById('financialHealthScoreGrid');
    if (!el) return; // container belum ada di halaman ini, aman diam2.

    if (typeof FinancialHealthScoreAPI === 'undefined') {
      el.innerHTML = '<div class="empty"><div class="empty-text">Data skor kesehatan finansial belum tersedia</div></div>';
      return;
    }

    const s = FinancialHealthScoreAPI.summary();
    if (!s.ok) {
      el.innerHTML = '<div class="empty"><div class="empty-text">Data skor kesehatan finansial belum tersedia</div></div>';
      return;
    }

    const cards = [
      this._scoreCard(s.scoreOverview),
      this._breakdownCard(s.componentBreakdown),
      this._recommendationCard(s.recommendation),
    ];

    // S254A (Batch Finance Navigation Consistency): SELURUH kartu
    // clickable lewat mekanisme SAMA PERSIS FinanceDashboard.render()/
    // VehicleAnalyticsPresenter.render() — tiap kartu carry field
    // onClick:{action,args} sendiri (ditempel di masing2 _xxxCard() di
    // bawah), template di sini CUMA mengecek `c.onClick` (0 logic
    // navigasi baru, 0 percabangan per-index, JANGAN openCard(index)).
    el.innerHTML = cards.map((c) => `
      <div class="findash-card${c.onClick ? ' u-pointer' : ''}"${c.onClick ? ` data-action="${escapeHtml(c.onClick.action)}" data-args="${escapeHtml(JSON.stringify(c.onClick.args))}"` : ''}>
        <div class="findash-card-icon">${c.icon}</div>
        <div class="findash-card-body">
          <div class="findash-card-label">${escapeHtml(c.label)}</div>
          <div class="findash-card-val${c.cls ? ' ' + c.cls : ''}">${escapeHtml(c.value)}</div>
          ${c.sub ? `<div class="findash-card-sub">${escapeHtml(c.sub)}</div>` : ''}
        </div>
      </div>
    `).join('');
  },

  // _scoreCard(o) — o = FinancialHealthScoreAPI.summary().scoreOverview,
  // dipakai APA ADANYA (score/label — 0 recompute).
  _scoreCard(o) {
    const onClick = { action: 'dashHubNavigateToFeature', args: [FINHEALTH_NAV_TARGETS.self] };
    if (!o || !o.ok) {
      return { icon: '❤️', label: 'Skor Kesehatan Finansial', value: '—', cls: '', sub: o && o.reason, onClick };
    }
    const cls = o.score >= 80 ? 'green' : o.score >= 60 ? '' : o.score >= 40 ? 'orange' : 'red';
    return {
      icon: '❤️',
      label: 'Skor Kesehatan Finansial',
      value: `${o.score}/100`,
      cls,
      sub: o.label,
      onClick,
    };
  },

  // _breakdownCard(b) — b = FinancialHealthScoreAPI.summary().componentBreakdown,
  // dipakai APA ADANYA (items[].label/pct — 0 recompute). Menampilkan
  // komponen dgn kontribusi terendah sbg highlight (pola sama
  // RetirementPlannerPresenter._recommendationCard menampilkan item
  // pertama), sisanya dihitung sbg `sub`.
  _breakdownCard(b) {
    const onClick = { action: 'dashHubNavigateToFeature', args: [FINHEALTH_NAV_TARGETS.self] };
    if (!b || !b.ok || !Array.isArray(b.items) || !b.items.length) {
      return { icon: '🧩', label: 'Rincian Komponen', value: 'Belum ada data', cls: '', sub: b && b.reason, onClick };
    }
    const sorted = [...b.items].sort((x, y) => x.pct - y.pct);
    const lowest = sorted[0];
    return {
      icon: '🧩',
      label: 'Komponen Terlemah',
      value: `${lowest.label} (${Math.round(lowest.pct * 100)}%)`,
      cls: lowest.pct < 0.5 ? 'red' : lowest.pct < 0.8 ? 'orange' : 'green',
      sub: b.items.length > 1 ? `${b.items.length} komponen dinilai` : '',
      onClick,
    };
  },

  // _recommendationCard(r) — r = FinancialHealthScoreAPI.summary().recommendation
  // (array, dipakai APA ADANYA — 0 recompute). Menampilkan rekomendasi
  // pertama sbg highlight (pola sama DebtOptimizerPresenter/
  // RetirementPlannerPresenter), sisanya dihitung sbg `sub`.
  _recommendationCard(r) {
    const onClick = { action: 'dashHubNavigateToFeature', args: [FINHEALTH_NAV_TARGETS.self] };
    if (!Array.isArray(r) || !r.length) {
      return { icon: '💡', label: 'Rekomendasi Kesehatan Finansial', value: 'Belum ada rekomendasi', cls: '', sub: '', onClick };
    }
    const main = r[0];
    const clsMap = { warning: 'red', positive: 'green', info: '' };
    return {
      icon: '💡',
      label: 'Rekomendasi Kesehatan Finansial',
      value: main.message,
      cls: clsMap[main.type] || '',
      sub: r.length > 1 ? `+${r.length - 1} rekomendasi lain` : '',
      onClick,
    };
  },

};
