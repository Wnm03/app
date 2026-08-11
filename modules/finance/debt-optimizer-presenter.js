// modules/finance/debt-optimizer-presenter.js — Debt Optimizer Presenter
// (Sesi 96, Batch 10). Target sesi: Debt Optimizer Foundation — lihat
// catatan lengkap di modules/finance/debt-optimizer-api.js.
//
// PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE
// `DebtOptimizerAPI.summary()` (modules/finance/debt-optimizer-api.js,
// sesi ini — sendiri 100% reuse `Debt`/`DebtStrategy`) — TIDAK ada
// rumus baru, TIDAK menghitung ulang DSR/simulasi pelunasan apa pun,
// TIDAK membaca D/Debt/DebtStrategy langsung. Pola SAMA PERSIS
// `InvestmentPlannerPresenter.render()` (Sesi 95 — 3 kartu, container
// `findash-grid` generik yang sama).
//
// Dipanggil dari renderKeuangan() (DIPINDAH dari DashboardHub.render() di Sesi 133; pola "tambahan murni" sama
// persis InvestmentPlannerPresenter.render() — lihat komentar di
// dashboard-hub.js). Live-wiring renderDashboard() DIHAPUS di Sesi 134 (gap fix,
// sudah dobel dgn renderKeuangan(), lihat CHANGELOG.md Sesi 134), TIDAK ada mekanisme render baru.
// CSS TIDAK baru — reuse penuh class findash-grid/findash-card (grid
// generik, sudah dipakai FinanceDashboard/.../InvestmentPlannerPresenter/dst).
//
// DEBTOPTIMIZER_NAV_TARGETS (S254B — Batch Finance Navigation
// Consistency) — tujuan navigasi tiap kartu #debtOptimizerGrid. MURNI
// DATA (0 logic navigasi baru), format {page,goTo} SAMA PERSIS format
// target dashHubNavigateToFeature() yang SUDAH ADA (dashboard-hub.js).
// Nama disendirikan per-file supaya tidak bentrok dgn const global lain
// (lihat kasus S251/S253/S254A). Ketiga kartu murni komposit 1 ringkasan
// utang yang sama — TIDAK ada 1 daftar spesifik per utang, jadi target =
// container section-nya sendiri (debtOptimizerWrap, dashboard-hub,
// TERVERIFIKASI ADA di index.html/app_production.html), pola sama
// persis FINHEALTH_NAV_TARGETS.self (S254A, self-scroll utk kartu
// komposit).
const DEBTOPTIMIZER_NAV_TARGETS = Object.freeze({
  self: { page: 'keuangan', tab: 'laporan', goTo: 'debtOptimizerWrap' },
});
const DebtOptimizerPresenter = {

  render() {
    const el = document.getElementById('debtOptimizerGrid');
    if (!el) return; // container belum ada di halaman ini, aman diam2.

    if (typeof DebtOptimizerAPI === 'undefined') {
      el.innerHTML = '<div class="empty"><div class="empty-text">Data utang belum tersedia</div></div>';
      return;
    }

    const s = DebtOptimizerAPI.summary();
    if (!s.ok) {
      el.innerHTML = '<div class="empty"><div class="empty-text">Data utang belum tersedia</div></div>';
      return;
    }

    const cards = [
      this._overviewCard(s.debtOverview),
      this._dsrCard(s.dsr),
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

  // _overviewCard(o) — o = DebtOptimizerAPI.summary().debtOverview,
  // dipakai APA ADANYA (activeCount/totalValue/totalCicilanBulanan — 0
  // recompute).
  _overviewCard(o) {
    const money = (n) => (typeof fmt === 'function') ? fmt(n) : ('Rp ' + Math.round(n || 0));
    const onClick = { action: 'dashHubNavigateToFeature', args: [DEBTOPTIMIZER_NAV_TARGETS.self] };
    if (!o || !o.ok) {
      return { icon: '📕', label: 'Ringkasan Utang', value: '—', cls: '', sub: o && o.reason, onClick };
    }
    if (o.activeCount === 0) {
      return { icon: '📕', label: 'Ringkasan Utang', value: 'Belum ada utang aktif', cls: '', sub: 'Tambahkan catatan pertama di menu 📕 Buku Utang.', onClick };
    }
    return {
      icon: '📕',
      label: 'Ringkasan Utang',
      value: money(o.totalValue),
      cls: 'red',
      sub: `${o.activeCount} utang aktif · Cicilan ${money(o.totalCicilanBulanan)}/bln`,
      onClick,
    };
  },

  // _dsrCard(d) — d = DebtOptimizerAPI.summary().dsr, dipakai APA
  // ADANYA (pct/incAvg/totalCicilan — 0 recompute).
  _dsrCard(d) {
    const money = (n) => (typeof fmt === 'function') ? fmt(n) : ('Rp ' + Math.round(n || 0));
    const onClick = { action: 'dashHubNavigateToFeature', args: [DEBTOPTIMIZER_NAV_TARGETS.self] };
    if (!d || !d.ok) {
      return { icon: '💳', label: 'DSR (Rasio Cicilan)', value: '—', cls: '', sub: d && d.reason, onClick };
    }
    if (!(d.incAvg > 0) || typeof d.pct !== 'number') {
      return { icon: '💳', label: 'DSR (Rasio Cicilan)', value: 'Belum cukup data', cls: '', sub: 'Butuh rata-rata pemasukan bulanan utk hitung DSR.', onClick };
    }
    const cls = d.pct > 35 ? 'red' : (d.pct > 30 ? '' : 'green');
    return {
      icon: '💳',
      label: 'DSR (Rasio Cicilan)',
      value: `${d.pct.toFixed(0)}%`,
      cls,
      sub: `Cicilan/tagihan ${money(d.totalCicilan)} dari income ${money(d.incAvg)}/bln`,
      onClick,
    };
  },

  // _recommendationCard(r) — r = DebtOptimizerAPI.summary().recommendation
  // (array, dipakai APA ADANYA — 0 recompute). Menampilkan rekomendasi
  // pertama sbg highlight (pola sama InvestmentPlannerPresenter/
  // FinancialGoalPresenter), sisanya dihitung sbg `sub`.
  _recommendationCard(r) {
    const onClick = { action: 'dashHubNavigateToFeature', args: [DEBTOPTIMIZER_NAV_TARGETS.self] };
    if (!Array.isArray(r) || !r.length) {
      return { icon: '💡', label: 'Rekomendasi Utang', value: 'Belum ada rekomendasi', cls: '', sub: '', onClick };
    }
    const main = r[0];
    const clsMap = { warning: 'red', positive: 'green', info: '' };
    return {
      icon: '💡',
      label: 'Rekomendasi Utang',
      value: main.message,
      cls: clsMap[main.type] || '',
      sub: r.length > 1 ? `+${r.length - 1} rekomendasi lain` : '',
      onClick,
    };
  },

};
