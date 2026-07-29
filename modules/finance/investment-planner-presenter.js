// modules/finance/investment-planner-presenter.js — Investment Planner
// Presenter (Sesi 95, Batch 10). Target sesi: Investment Planner
// Foundation — lihat catatan lengkap di
// modules/finance/investment-planner-api.js.
//
// PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE
// `InvestmentPlannerAPI.summary()` (modules/finance/
// investment-planner-api.js, sesi ini — sendiri 100% reuse
// `Investment`/`FinancialGoalAPI._surplus()`) — TIDAK ada rumus baru,
// TIDAK menghitung ulang ROI/alokasi/proyeksi apa pun, TIDAK membaca D/
// Investment/FinancialGoalAPI langsung. Pola SAMA PERSIS
// `FinancialGoalPresenter.render()` (Sesi 94 — 3 kartu, container
// `findash-grid` generik yang sama).
//
// Dipanggil dari renderKeuangan() (DIPINDAH dari DashboardHub.render() di Sesi 133; pola "tambahan murni" sama
// persis FinancialGoalPresenter.render() — lihat komentar di
// dashboard-hub.js). Live-wiring renderDashboard() DIHAPUS di Sesi 134 (gap fix,
// sudah dobel dgn renderKeuangan(), lihat CHANGELOG.md Sesi 134), TIDAK ada mekanisme render baru.
// CSS TIDAK baru — reuse penuh class findash-grid/findash-card (grid
// generik, sudah dipakai FinanceDashboard/.../FinancialGoalPresenter/dst).
//
// INVESTPLANNER_NAV_TARGETS (S254B — Batch Finance Navigation
// Consistency) — tujuan navigasi tiap kartu #investPlannerGrid. MURNI
// DATA (0 logic navigasi baru), format {page,goTo} SAMA PERSIS format
// target dashHubNavigateToFeature() yang SUDAH ADA (dashboard-hub.js).
// Nama disendirikan per-file supaya tidak bentrok dgn const global lain
// (lihat kasus S251/S253/S254A). Ketiga kartu murni komposit 1
// ringkasan investasi yang sama — TIDAK ada 1 daftar spesifik per
// instrumen, jadi target = container section-nya sendiri
// (investPlannerWrap, dashboard-hub, TERVERIFIKASI ADA di index.html/
// app_production.html), pola sama persis FINHEALTH_NAV_TARGETS.self
// (S254A, self-scroll utk kartu komposit).
const INVESTPLANNER_NAV_TARGETS = Object.freeze({
  self: { page: 'keuangan', tab: 'laporan', goTo: 'investPlannerWrap' },
});
const InvestmentPlannerPresenter = {

  render() {
    const el = document.getElementById('investPlannerGrid');
    if (!el) return; // container belum ada di halaman ini, aman diam2.

    if (typeof InvestmentPlannerAPI === 'undefined') {
      el.innerHTML = '<div class="empty"><div class="empty-text">Data investasi belum tersedia</div></div>';
      return;
    }

    const s = InvestmentPlannerAPI.summary();
    if (!s.ok) {
      el.innerHTML = '<div class="empty"><div class="empty-text">Data investasi belum tersedia</div></div>';
      return;
    }

    const cards = [
      this._overviewCard(s.portfolioOverview),
      this._allocationCard(s.assetAllocation),
      this._recommendationCard(s.recommendation),
    ];

    // S254B (Batch Finance Navigation Consistency): SELURUH kartu
    // clickable lewat mekanisme SAMA PERSIS FinanceDashboard.render()/
    // FinancialHealthScorePresenter.render() (S254A) — tiap kartu carry
    // field onClick:{action,args} sendiri (ditempel di masing2 _xxxCard()
    // di bawah), template di sini CUMA mengecek `c.onClick` (0 logic
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

  // _overviewCard(p) — p = InvestmentPlannerAPI.summary().portfolioOverview,
  // dipakai APA ADANYA (holdingsCount/totalValue/roiPct/totalGainLoss —
  // 0 recompute).
  _overviewCard(p) {
    const money = (n) => (typeof fmt === 'function') ? fmt(n) : ('Rp ' + Math.round(n || 0));
    const onClick = { action: 'dashHubNavigateToFeature', args: [INVESTPLANNER_NAV_TARGETS.self] };
    if (!p || !p.ok) {
      return { icon: '📈', label: 'Portofolio Investasi', value: '—', cls: '', sub: p && p.reason, onClick };
    }
    if (p.holdingsCount === 0) {
      return { icon: '📈', label: 'Portofolio Investasi', value: 'Belum ada data modal', cls: '', sub: 'Isi Modal Investasi (atau Harga Beli × Jumlah Unit) di 📋 Buku Aset.', onClick };
    }
    return {
      icon: '📈',
      label: 'Portofolio Investasi',
      value: money(p.totalValue),
      cls: p.totalGainLoss > 0 ? 'green' : (p.totalGainLoss < 0 ? 'red' : ''),
      sub: `${p.holdingsCount} instrumen · ROI ${p.roiPct.toFixed(1)}% · Gain/Loss ${money(p.totalGainLoss)}`,
      onClick,
    };
  },

  // _allocationCard(a) — a = InvestmentPlannerAPI.summary().assetAllocation,
  // dipakai APA ADANYA (allocation/topAllocation — 0 recompute).
  _allocationCard(a) {
    const money = (n) => (typeof fmt === 'function') ? fmt(n) : ('Rp ' + Math.round(n || 0));
    const onClick = { action: 'dashHubNavigateToFeature', args: [INVESTPLANNER_NAV_TARGETS.self] };
    if (!a || !a.ok) {
      return { icon: '🥧', label: 'Alokasi Aset', value: '—', cls: '', sub: a && a.reason, onClick };
    }
    if (!a.allocation.length || !a.topAllocation) {
      return { icon: '🥧', label: 'Alokasi Aset', value: 'Belum ada data', cls: '', sub: '', onClick };
    }
    const t = a.topAllocation;
    return {
      icon: '🥧',
      label: 'Alokasi Aset Terbesar',
      value: `${t.type} · ${Math.round(t.pct)}%`,
      cls: '',
      sub: `${money(t.value)} dari ${a.allocation.length} jenis instrumen`,
      onClick,
    };
  },

  // _recommendationCard(r) — r = InvestmentPlannerAPI.summary().recommendation
  // (array, dipakai APA ADANYA — 0 recompute). Menampilkan rekomendasi
  // pertama sbg highlight (pola sama FinancialGoalPresenter/
  // BudgetRecommendationPresenter), sisanya dihitung sbg `sub`.
  _recommendationCard(r) {
    const onClick = { action: 'dashHubNavigateToFeature', args: [INVESTPLANNER_NAV_TARGETS.self] };
    if (!Array.isArray(r) || !r.length) {
      return { icon: '💡', label: 'Rekomendasi Investasi', value: 'Belum ada rekomendasi', cls: '', sub: '', onClick };
    }
    const main = r[0];
    const clsMap = { warning: 'red', positive: 'green', info: '' };
    return {
      icon: '💡',
      label: 'Rekomendasi Investasi',
      value: main.message,
      cls: clsMap[main.type] || '',
      sub: r.length > 1 ? `+${r.length - 1} rekomendasi lain` : '',
      onClick,
    };
  },

};
