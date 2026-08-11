// modules/finance/cashflow-projection-presenter.js — Cash Flow Projection
// Presenter (Sesi 93, Batch 10). Target sesi: Cash Flow Projection
// Foundation — lihat docs/BATCH_PLAN.md § Batch 10.
//
// PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE
// CashFlowProjectionAPI.summary() (modules/finance/
// cashflow-projection-api.js, sesi ini — sendiri 100% reuse
// FinancialForecastAPI.summary(), Sesi 91) — TIDAK ada rumus baru, TIDAK
// menghitung ulang rata-rata income/expense atau proyeksi saldo, TIDAK
// membaca D/FinancialForecastAPI langsung. Pola SAMA PERSIS
// FinancialForecastPresenter.render() (Sesi 91 — 3 kartu, container
// `findash-grid` generik yang sama).
//
// Dipanggil dari DashboardHub.render() (pola "tambahan murni" sama persis
// FinancialForecastPresenter.render()/BudgetRecommendationPresenter.render()
// — lihat komentar di dashboard-hub.js) & dari live-wiring
// renderDashboard() (modules/shared/modules-render.js), TIDAK ada
// mekanisme render baru. CSS TIDAK baru — reuse penuh class
// findash-grid/findash-card (grid generik, sudah dipakai
// FinanceDashboard/FinancialForecastPresenter/BudgetRecommendationPresenter/
// VehicleDashboard/dst).
//
// CASHFLOWPROJ_NAV_TARGETS (S254B — Batch Finance Navigation
// Consistency) — tujuan navigasi tiap kartu #cashflowProjGrid. MURNI
// DATA (0 logic navigasi baru), format {page,goTo} SAMA PERSIS format
// target dashHubNavigateToFeature() yang SUDAH ADA (dashboard-hub.js).
// Nama disendirikan per-file supaya tidak bentrok dgn const global lain
// (lihat kasus S251/S253/S254A). Ketiga kartu murni komposit 1 proyeksi
// arus kas yang sama — TIDAK ada 1 daftar spesifik per pos, jadi target
// = container section-nya sendiri (cashflowProjWrap, dashboard-hub,
// TERVERIFIKASI ADA di index.html/app_production.html), pola sama
// persis FINHEALTH_NAV_TARGETS.self (S254A, self-scroll utk kartu
// komposit).
const CASHFLOWPROJ_NAV_TARGETS = Object.freeze({
  self: { page: 'keuangan', tab: 'laporan', goTo: 'cashflowProjWrap' },
});
const CashFlowProjectionPresenter = {

  render() {
    const el = document.getElementById('cashflowProjGrid');
    if (!el) return; // container belum ada di halaman ini, aman diam2.

    if (typeof CashFlowProjectionAPI === 'undefined') {
      el.innerHTML = '<div class="empty"><div class="empty-text">Data proyeksi arus kas belum tersedia</div></div>';
      return;
    }

    const s = CashFlowProjectionAPI.summary();
    if (!s.ok) {
      el.innerHTML = '<div class="empty"><div class="empty-text">Data proyeksi arus kas belum tersedia</div></div>';
      return;
    }

    const cards = [
      this._incomeCard(s.income),
      this._expenseCard(s.expense),
      this._cashBalanceCard(s.cashBalance),
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

  // _incomeCard(f) — f = CashFlowProjectionAPI.summary().income, dipakai
  // APA ADANYA (avgMonthly/months/currentMonthIncome — 0 recompute).
  _incomeCard(f) {
    const money = (n) => (typeof fmt === 'function') ? fmt(n) : ('Rp ' + Math.round(n || 0));
    const onClick = { action: 'dashHubNavigateToFeature', args: [CASHFLOWPROJ_NAV_TARGETS.self] };
    if (!f || !f.ok) {
      return { icon: '💰', label: 'Proyeksi Pemasukan', value: '—', cls: '', sub: f && f.reason, onClick };
    }
    return {
      icon: '💰',
      label: 'Proyeksi Pemasukan',
      value: money(f.avgMonthly) + '/bln',
      cls: 'green',
      sub: `Rata-rata ${f.months} bulan terakhir · bulan ini ${money(f.currentMonthIncome)}`,
      onClick,
    };
  },

  // _expenseCard(f) — f = CashFlowProjectionAPI.summary().expense, dipakai
  // APA ADANYA (avgMonthly/months/currentMonthExpense — 0 recompute).
  _expenseCard(f) {
    const money = (n) => (typeof fmt === 'function') ? fmt(n) : ('Rp ' + Math.round(n || 0));
    const onClick = { action: 'dashHubNavigateToFeature', args: [CASHFLOWPROJ_NAV_TARGETS.self] };
    if (!f || !f.ok) {
      return { icon: '💸', label: 'Proyeksi Pengeluaran', value: '—', cls: '', sub: f && f.reason, onClick };
    }
    return {
      icon: '💸',
      label: 'Proyeksi Pengeluaran',
      value: money(f.avgMonthly) + '/bln',
      cls: 'red',
      sub: `Rata-rata ${f.months} bulan terakhir · bulan ini ${money(f.currentMonthExpense)}`,
      onClick,
    };
  },

  // _cashBalanceCard(f) — f = CashFlowProjectionAPI.summary().cashBalance,
  // dipakai APA ADANYA (saldoNow/projected/billsDue/upcomingCount — 0
  // recompute, `projected` sudah final dari computeCashflowForecast()).
  _cashBalanceCard(f) {
    const money = (n) => (typeof fmt === 'function') ? fmt(n) : ('Rp ' + Math.round(n || 0));
    const onClick = { action: 'dashHubNavigateToFeature', args: [CASHFLOWPROJ_NAV_TARGETS.self] };
    if (!f || !f.ok) {
      return { icon: '🏦', label: 'Proyeksi Saldo Kas', value: '—', cls: '', sub: f && f.reason, onClick };
    }
    const projected = f.projected;
    return {
      icon: '🏦',
      label: 'Proyeksi Saldo Kas',
      value: (projected < 0 ? '-' : '') + money(Math.abs(projected)),
      cls: projected < 0 ? 'red' : 'green',
      sub: `Saldo sekarang ${money(f.saldoNow)} · ${f.upcomingCount} tagihan jatuh tempo (${money(f.billsDue)})`,
      onClick,
    };
  },

};
