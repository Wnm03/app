// modules/finance/retirement-planner-presenter.js — Retirement Planner
// Presenter (Sesi 97, Batch 10). Target sesi: Retirement Planner
// Foundation — lihat catatan lengkap di modules/finance/
// retirement-planner-api.js.
//
// PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE
// `RetirementPlannerAPI.summary()` (modules/finance/
// retirement-planner-api.js, sesi ini — sendiri 100% reuse `Pensiun`,
// modules/shared/modules-calc.js) — TIDAK ada rumus baru, TIDAK
// menghitung ulang proyeksi/gap/rekomendasi apa pun, TIDAK membaca D/
// Pensiun langsung. Pola SAMA PERSIS `DebtOptimizerPresenter.render()`
// (Sesi 96 — 3 kartu, container `findash-grid` generik yang sama).
//
// Dipanggil dari renderKeuangan() (DIPINDAH dari DashboardHub.render() di Sesi 133; pola "tambahan murni" sama
// persis DebtOptimizerPresenter.render() — lihat komentar di
// dashboard-hub.js). Live-wiring renderDashboard() DIHAPUS di Sesi 134 (gap fix,
// sudah dobel dgn renderKeuangan(), lihat CHANGELOG.md Sesi 134), TIDAK ada mekanisme render baru.
// CSS TIDAK baru — reuse penuh class findash-grid/findash-card (grid
// generik, sudah dipakai FinanceDashboard/.../DebtOptimizerPresenter/dst).
//
// RETIRE_NAV_TARGETS (S254A — Batch Finance Navigation Consistency) —
// tujuan navigasi tiap kartu #retirementPlannerGrid. MURNI DATA (0 logic
// navigasi baru), format {page,goTo} SAMA PERSIS format target
// dashHubNavigateToFeature() yang SUDAH ADA (dashboard-hub.js). Nama
// disendirikan per-file supaya tidak bentrok dgn const global lain (lihat
// kasus S251/S253). Ketiga kartu murni komposit 1 proyeksi dana pensiun
// yang sama — TIDAK ada 1 daftar spesifik per komponen, jadi target =
// container section-nya sendiri (retirementPlannerWrap, dashboard-hub,
// TERVERIFIKASI ADA di index.html/app_production.html), pola sama persis
// VEHICLE_ANALYTICS_NAV_TARGETS.total/trend (self-scroll utk kartu
// komposit).
const RETIRE_NAV_TARGETS = Object.freeze({
  self: { page: 'keuangan', tab: 'laporan', goTo: 'retirementPlannerWrap' },
});
const RetirementPlannerPresenter = {

  render() {
    const el = document.getElementById('retirementPlannerGrid');
    if (!el) return; // container belum ada di halaman ini, aman diam2.

    if (typeof RetirementPlannerAPI === 'undefined') {
      el.innerHTML = '<div class="empty"><div class="empty-text">Data dana pensiun belum tersedia</div></div>';
      return;
    }

    const s = RetirementPlannerAPI.summary();
    if (!s.ok) {
      el.innerHTML = '<div class="empty"><div class="empty-text">Data dana pensiun belum tersedia</div></div>';
      return;
    }

    const cards = [
      this._overviewCard(s.retirementOverview),
      this._gapCard(s.gapAnalysis),
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

  // _overviewCard(o) — o = RetirementPlannerAPI.summary().retirementOverview,
  // dipakai APA ADANYA (configured/terkumpul/proyeksi/sisaBulan — 0
  // recompute).
  _overviewCard(o) {
    const money = (n) => (typeof fmt === 'function') ? fmt(n) : ('Rp ' + Math.round(n || 0));
    const onClick = { action: 'dashHubNavigateToFeature', args: [RETIRE_NAV_TARGETS.self] };
    if (!o || !o.ok) {
      return { icon: '🏖️', label: 'Dana Pensiun', value: '—', cls: '', sub: o && o.reason, onClick };
    }
    if (!o.configured) {
      return { icon: '🏖️', label: 'Dana Pensiun', value: 'Belum diatur', cls: '', sub: 'Isi usia, target & akun tabungan di menu 🏖️ Dana Pensiun.', onClick };
    }
    const years = Math.floor((o.sisaBulan || 0) / 12), months = (o.sisaBulan || 0) % 12;
    return {
      icon: '🏖️',
      label: 'Proyeksi Dana Pensiun',
      value: money(o.proyeksi),
      cls: 'purple',
      sub: `Terkumpul ${money(o.terkumpul)} · ${years > 0 ? years + ' th ' : ''}${months} bln lagi`,
      onClick,
    };
  },

  // _gapCard(g) — g = RetirementPlannerAPI.summary().gapAnalysis,
  // dipakai APA ADANYA (hasTarget/gap/onTrack — 0 recompute).
  _gapCard(g) {
    const money = (n) => (typeof fmt === 'function') ? fmt(n) : ('Rp ' + Math.round(n || 0));
    const onClick = { action: 'dashHubNavigateToFeature', args: [RETIRE_NAV_TARGETS.self] };
    if (!g || !g.ok) {
      return { icon: '🎯', label: 'Gap vs Target', value: '—', cls: '', sub: g && g.reason, onClick };
    }
    if (!g.hasTarget) {
      return { icon: '🎯', label: 'Gap vs Target', value: 'Belum ada target', cls: '', sub: 'Isi Target Dana Pensiun utk lihat gap-nya.', onClick };
    }
    return {
      icon: '🎯',
      label: g.onTrack ? 'Surplus vs Target' : 'Gap vs Target',
      value: money(Math.abs(g.gap)),
      cls: g.onTrack ? 'green' : 'red',
      sub: g.onTrack ? 'Proyeksi sudah melampaui target' : 'Proyeksi masih kurang dari target',
      onClick,
    };
  },

  // _recommendationCard(r) — r = RetirementPlannerAPI.summary().recommendation
  // (array, dipakai APA ADANYA — 0 recompute). Menampilkan rekomendasi
  // pertama sbg highlight (pola sama DebtOptimizerPresenter/
  // InvestmentPlannerPresenter), sisanya dihitung sbg `sub`.
  _recommendationCard(r) {
    const onClick = { action: 'dashHubNavigateToFeature', args: [RETIRE_NAV_TARGETS.self] };
    if (!Array.isArray(r) || !r.length) {
      return { icon: '💡', label: 'Rekomendasi Pensiun', value: 'Belum ada rekomendasi', cls: '', sub: '', onClick };
    }
    const main = r[0];
    const clsMap = { warning: 'red', positive: 'green', info: '' };
    return {
      icon: '💡',
      label: 'Rekomendasi Pensiun',
      value: main.message,
      cls: clsMap[main.type] || '',
      sub: r.length > 1 ? `+${r.length - 1} rekomendasi lain` : '',
      onClick,
    };
  },

};
