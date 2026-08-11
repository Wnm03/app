// modules/asset/property-management-presenter.js — Property Management
// Presenter (Sesi 132, Batch 10 lanjutan). Target sesi: audit menemukan
// `PropertyManagementAPI` (S102) sudah lengkap + ada test, tapi TIDAK
// PERNAH dipanggil dari file render/presenter manapun — belum ada UI sama
// sekali (beda dari "kurang tombol edit/hapus"). File ini menutup gap
// itu, pola SAMA PERSIS `DebtOptimizerPresenter.render()` (Sesi 96 — 3
// kartu, container `findash-grid` generik yang sama).
//
// PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE
// `PropertyManagementAPI.summary()` (modules/asset/
// property-management-api.js, S102) — TIDAK ada rumus baru, TIDAK
// menghitung ulang nilai/PBB/penyusutan apa pun, TIDAK membaca
// D/Aset/PajakAset/Penyusutan langsung.
//
// Dipanggil dari DashboardHub.render() (pola "tambahan murni" sama
// persis DebtOptimizerPresenter.render() — lihat komentar di
// dashboard-hub.js) & dari live-wiring renderDashboard()
// (modules/shared/modules-render.js), TIDAK ada mekanisme render baru.
// CSS TIDAK baru — reuse penuh class findash-grid/findash-card (grid
// generik, sudah dipakai FinanceDashboard/DebtOptimizerPresenter/dst).
//
// PROPERTY_MGMT_CARD_NAV_TARGETS (Sesi 252 — Batch Asset Navigation
// Consistency) — tujuan navigasi tiap kartu #propertyManagementGrid.
// MURNI DATA (0 logic navigasi baru) — format {page,tab,goTo} SAMA PERSIS
// format target FEATURE_REGISTRY (dashboard-hub-registry.js) /
// CARD_NAV_TARGETS (business-flow-presenter.js, S250-251), dieksekusi
// lewat dashHubNavigateToFeature() yang SUDAH ADA (dashboard-hub.js). Nama
// disendirikan per-file (bukan CARD_NAV_TARGETS) supaya tidak bentrok
// dengan const global yang sama persis di business-flow-presenter.js.
// Ketiga target menunjuk container yang TERVERIFIKASI ADA di
// index.html/app_production.html (grep manual, 0 halaman/tab/container
// baru dibuat) — persis lokasi yang sudah disebut di sub-text tiap kartu:
//   portfolio     -> Aset > Buku Aset (assetList, "Tambahkan lewat menu
//                     📦 Aset")
//   tax           -> Aset > Analisis & Pajak > Pajak Aset
//                     (assetPajakDashboard, "lihat rincian di menu
//                     🧾 Pajak Aset")
//   depreciation  -> Aset > Analisis & Pajak > Penyusutan Aset
//                     (assetPenyusutanDashboard, "Aktifkan penyusutan
//                     lewat menu 📦 Aset")
const PROPERTY_MGMT_CARD_NAV_TARGETS = Object.freeze({
  portfolio: { page: 'aset', tab: 'buku', goTo: 'assetList' },
  tax: { page: 'aset', tab: 'analisis', goTo: 'assetPajakDashboard' },
  depreciation: { page: 'aset', tab: 'analisis', goTo: 'assetPenyusutanDashboard' },
});

const PropertyManagementPresenter = {

  render() {
    const el = document.getElementById('propertyManagementGrid');
    if (!el) return; // container belum ada di halaman ini, aman diam2.

    if (typeof PropertyManagementAPI === 'undefined') {
      el.innerHTML = '<div class="empty"><div class="empty-text">Data properti belum tersedia</div></div>';
      return;
    }

    const s = PropertyManagementAPI.summary();
    if (!s.ok) {
      el.innerHTML = '<div class="empty"><div class="empty-text">Data properti belum tersedia</div></div>';
      return;
    }

    const cards = [
      this._portfolioCard(s.portfolio),
      this._taxCard(s.tax),
      this._depreciationCard(s.depreciation),
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

  // _portfolioCard(p) — p = PropertyManagementAPI.summary().portfolio,
  // dipakai APA ADANYA (count/totalValue/breakdown — 0 recompute).
  _portfolioCard(p) {
    const money = (n) => (typeof fmt === 'function') ? fmt(n) : ('Rp ' + Math.round(n || 0));
    const onClick = { action: 'dashHubNavigateToFeature', args: [PROPERTY_MGMT_CARD_NAV_TARGETS.portfolio] };
    if (!p || !p.ok) {
      return { icon: '🏠', label: 'Portofolio Properti', value: '—', cls: '', sub: p && p.reason, onClick };
    }
    if (p.count === 0) {
      return { icon: '🏠', label: 'Portofolio Properti', value: 'Belum ada properti tercatat', cls: '', sub: 'Tambahkan lewat menu 📦 Aset (jenis Tanah/Rumah).', onClick };
    }
    const top = (p.breakdown || [])[0];
    return {
      icon: '🏠',
      label: 'Portofolio Properti',
      value: money(p.totalValue),
      cls: '',
      sub: `${p.count} properti${top ? ' · Terbesar ' + top.jenis + ' (' + top.pct.toFixed(0) + '%)' : ''}`,
      onClick,
    };
  },

  // _taxCard(t) — t = PropertyManagementAPI.summary().tax, dipakai APA
  // ADANYA (count/totalPBB — 0 recompute, PBB per item dari
  // `PajakAset.hitungPBB()`).
  _taxCard(t) {
    const money = (n) => (typeof fmt === 'function') ? fmt(n) : ('Rp ' + Math.round(n || 0));
    const onClick = { action: 'dashHubNavigateToFeature', args: [PROPERTY_MGMT_CARD_NAV_TARGETS.tax] };
    if (!t || !t.ok) {
      return { icon: '🧾', label: 'Estimasi PBB', value: '—', cls: '', sub: t && t.reason, onClick };
    }
    if (t.count === 0) {
      return { icon: '🧾', label: 'Estimasi PBB', value: 'Belum ada properti', cls: '', sub: '', onClick };
    }
    return {
      icon: '🧾',
      label: 'Estimasi PBB',
      value: money(t.totalPBB),
      cls: t.totalPBB > 0 ? 'red' : '',
      sub: `Dari ${t.count} properti · lihat rincian di menu 🧾 Pajak Aset`,
      onClick,
    };
  },

  // _depreciationCard(d) — d = PropertyManagementAPI.summary()
  // .depreciation, dipakai APA ADANYA (jumlahAktif/totalAkumulasi/
  // totalNilaiBuku/belumLengkap — 0 recompute, dari `Penyusutan.hitung()`).
  _depreciationCard(d) {
    const money = (n) => (typeof fmt === 'function') ? fmt(n) : ('Rp ' + Math.round(n || 0));
    const onClick = { action: 'dashHubNavigateToFeature', args: [PROPERTY_MGMT_CARD_NAV_TARGETS.depreciation] };
    if (!d || !d.ok) {
      return { icon: '📉', label: 'Penyusutan Properti', value: '—', cls: '', sub: d && d.reason, onClick };
    }
    if (d.jumlahAktif === 0) {
      return { icon: '📉', label: 'Penyusutan Properti', value: 'Belum ada yang dilacak', cls: '', sub: 'Aktifkan penyusutan lewat menu 📦 Aset.', onClick };
    }
    return {
      icon: '📉',
      label: 'Penyusutan Properti',
      value: money(d.totalNilaiBuku),
      cls: '',
      sub: `${d.jumlahAktif} properti dilacak · Akumulasi ${money(d.totalAkumulasi)}${d.belumLengkap ? ' · ' + d.belumLengkap + ' data belum lengkap' : ''}`,
      onClick,
    };
  },

};
