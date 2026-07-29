// modules/asset/asset-portfolio-presenter.js — Asset Portfolio Presenter
// (Sesi 132, Batch 10 lanjutan). Target sesi: audit menemukan
// `AssetPortfolioAPI` (S101) sudah lengkap + ada test, tapi TIDAK PERNAH
// dipanggil dari file render/presenter manapun — belum ada UI sama
// sekali. Pola SAMA PERSIS `PropertyManagementPresenter.render()`
// (sesi ini — 3 kartu, container `findash-grid` generik yang sama).
//
// PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE
// `AssetPortfolioAPI.summary()` (modules/asset/asset-portfolio-api.js,
// S101) — TIDAK ada rumus baru, TIDAK menghitung ulang komposisi/alokasi
// apa pun, TIDAK membaca D/Aset/Investment/Kekayaan langsung.
//
// Dipanggil dari DashboardHub.render() & dari live-wiring renderDashboard()
// (modules/shared/modules-render.js), TIDAK ada mekanisme render baru.
// CSS TIDAK baru — reuse penuh class findash-grid/findash-card.
//
// ASSET_PORTFOLIO_CARD_NAV_TARGETS (Sesi 252 — Batch Asset Navigation
// Consistency) — tujuan navigasi tiap kartu #assetPortfolioGrid. MURNI DATA
// (0 logic navigasi baru) — format {page,tab,goTo} SAMA PERSIS format
// target FEATURE_REGISTRY (dashboard-hub-registry.js) / CARD_NAV_TARGETS
// (business-flow-presenter.js, S250-251), dieksekusi lewat
// dashHubNavigateToFeature() yang SUDAH ADA (dashboard-hub.js). Nama
// disendirikan per-file (bukan CARD_NAV_TARGETS) supaya tidak bentrok
// dengan const global yang sama persis di business-flow-presenter.js.
// Ketiga target menunjuk container yang TERVERIFIKASI ADA di
// index.html/app_production.html (grep manual, 0 halaman/tab/container
// baru dibuat):
//   composition/allocation -> Aset > Ringkasan > Dashboard Aset
//     (assetDashboard, sudah menampilkan Total/Nilai Buku/Nilai Pasar +
//     Ringkasan per Kategori — kartu yang paling relevan utk komposisi &
//     alokasi kekayaan)
//   netWorth -> halaman Keuangan (ringkasan finansial lengkap, pola sama
//     CARD_NAV_TARGETS[8] "Finance" di business-flow-presenter.js)
const ASSET_PORTFOLIO_CARD_NAV_TARGETS = Object.freeze({
  composition: { page: 'aset', tab: 'ringkasan', goTo: 'assetDashboard' },
  allocation: { page: 'aset', tab: 'ringkasan', goTo: 'assetDashboard' },
  netWorth: { page: 'keuangan' },
});

const AssetPortfolioPresenter = {

  render() {
    const el = document.getElementById('assetPortfolioGrid');
    if (!el) return; // container belum ada di halaman ini, aman diam2.

    if (typeof AssetPortfolioAPI === 'undefined') {
      el.innerHTML = '<div class="empty"><div class="empty-text">Data portofolio belum tersedia</div></div>';
      return;
    }

    const s = AssetPortfolioAPI.summary();
    if (!s.ok) {
      el.innerHTML = '<div class="empty"><div class="empty-text">Data portofolio belum tersedia</div></div>';
      return;
    }

    const cards = [
      this._compositionCard(s.composition),
      this._allocationCard(s.allocation),
      this._netWorthCard(s.netWorth),
    ];

    // S252 (Batch Asset Navigation Consistency): SELURUH kartu clickable
    // lewat mekanisme SAMA PERSIS FinanceDashboard.render()/
    // BusinessFlowPresenter.render() (S251) — tiap kartu carry field
    // onClick:{action,args} sendiri (ditempel di masing2 _xxxCard() di
    // bawah), template di sini CUMA mengecek `c.onClick` (0 logic
    // navigasi baru, 0 percabangan per-index).
    el.innerHTML = cards.map((c) => `
      <div class="findash-card${c.onClick ? ' u-pointer' : ''}"${c.onClick ? ` data-action="${escapeHtml(c.onClick.action)}" data-args="${escapeHtml(JSON.stringify(c.onClick.args))}"` : ''} aria-label="Buka ${escapeHtml(c.label)}">
        <div class="findash-card-icon">${c.icon}</div>
        <div class="findash-card-body">
          <div class="findash-card-label">${escapeHtml(c.label)}</div>
          <div class="findash-card-val${c.cls ? ' ' + c.cls : ''}">${escapeHtml(c.value)}</div>
          ${c.sub ? `<div class="findash-card-sub">${escapeHtml(c.sub)}</div>` : ''}
        </div>
      </div>
    `).join('');
  },

  // _compositionCard(c) — c = AssetPortfolioAPI.summary().composition,
  // dipakai APA ADANYA (totalValue/cashValue/assetValue/investmentValue
  // — 0 recompute).
  _compositionCard(c) {
    const money = (n) => (typeof fmt === 'function') ? fmt(n) : ('Rp ' + Math.round(n || 0));
    const onClick = { action: 'dashHubNavigateToFeature', args: [ASSET_PORTFOLIO_CARD_NAV_TARGETS.composition] };
    if (!c || !c.ok) {
      return { icon: '💼', label: 'Total Portofolio', value: '—', cls: '', sub: c && c.reason, onClick };
    }
    if (c.totalValue === 0) {
      return { icon: '💼', label: 'Total Portofolio', value: 'Belum ada data', cls: '', sub: '', onClick };
    }
    return {
      icon: '💼',
      label: 'Total Portofolio',
      value: money(c.totalValue),
      cls: '',
      sub: `Kas ${money(c.cashValue)} · Aset ${money(c.assetValue)} · Investasi ${money(c.investmentValue)}`,
      onClick,
    };
  },

  // _allocationCard(a) — a = AssetPortfolioAPI.summary().allocation,
  // dipakai APA ADANYA (breakdown[].category/value/pct — 0 recompute,
  // sudah diurutkan terbesar dulu oleh API).
  _allocationCard(a) {
    const onClick = { action: 'dashHubNavigateToFeature', args: [ASSET_PORTFOLIO_CARD_NAV_TARGETS.allocation] };
    if (!a || !a.ok || !a.breakdown || !a.breakdown.length) {
      return { icon: '📊', label: 'Alokasi Portofolio', value: 'Belum cukup data', cls: '', sub: '', onClick };
    }
    const top = a.breakdown[0];
    const rest = a.breakdown.slice(1).map((r) => `${r.category} ${r.pct.toFixed(0)}%`).join(' · ');
    return {
      icon: '📊',
      label: 'Alokasi Portofolio',
      value: `${top.category} ${top.pct.toFixed(0)}%`,
      cls: '',
      sub: rest || '',
      onClick,
    };
  },

  // _netWorthCard(n) — n = AssetPortfolioAPI.summary().netWorth, dipakai
  // APA ADANYA (netWorth/portfolioValue — 0 recompute).
  _netWorthCard(n) {
    const money = (v) => (typeof fmt === 'function') ? fmt(v) : ('Rp ' + Math.round(v || 0));
    const onClick = { action: 'dashHubNavigateToFeature', args: [ASSET_PORTFOLIO_CARD_NAV_TARGETS.netWorth] };
    if (!n || !n.ok) {
      return { icon: '📈', label: 'Kekayaan Bersih', value: '—', cls: '', sub: n && n.reason, onClick };
    }
    return {
      icon: '📈',
      label: 'Kekayaan Bersih',
      value: money(n.netWorth),
      cls: n.netWorth >= 0 ? 'green' : 'red',
      sub: n.portfolioValue != null ? `Portofolio (kas+aset+investasi): ${money(n.portfolioValue)}` : '',
      onClick,
    };
  },

};
