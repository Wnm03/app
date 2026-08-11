// modules/asset/asset-maintenance-presenter.js — Asset Maintenance
// Presenter (Sesi 132, Batch 10 lanjutan). Target sesi: audit menemukan
// `AssetMaintenanceAPI` (S104) sudah lengkap + ada test, tapi TIDAK
// PERNAH dipanggil dari file render/presenter manapun — belum ada UI
// sama sekali. Pola SAMA PERSIS `PropertyManagementPresenter.render()`
// (sesi ini — 3 kartu, container `findash-grid` generik yang sama).
//
// PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE
// `AssetMaintenanceAPI.summary()` (modules/asset/
// asset-maintenance-api.js, S104) — TIDAK ada rumus baru, TIDAK
// menghitung ulang umur/penyusutan apa pun, TIDAK membaca
// D/Aset/Penyusutan langsung.
//
// Dipanggil dari DashboardHub.render() & dari live-wiring renderDashboard()
// (modules/shared/modules-render.js), TIDAK ada mekanisme render baru.
// CSS TIDAK baru — reuse penuh class findash-grid/findash-card.
//
// ASSET_MAINTENANCE_CARD_NAV_TARGETS (Sesi 252 — Batch Asset Navigation
// Consistency) — tujuan navigasi tiap kartu #assetMaintenanceGrid. MURNI
// DATA (0 logic navigasi baru) — format {page,tab,goTo} SAMA PERSIS format
// target FEATURE_REGISTRY (dashboard-hub-registry.js) / CARD_NAV_TARGETS
// (business-flow-presenter.js, S250-251), dieksekusi lewat
// dashHubNavigateToFeature() yang SUDAH ADA (dashboard-hub.js). Nama
// disendirikan per-file (bukan CARD_NAV_TARGETS) supaya tidak bentrok
// dengan const global yang sama persis di business-flow-presenter.js.
// Kedua target menunjuk container yang TERVERIFIKASI ADA di
// index.html/app_production.html (grep manual, 0 halaman/tab/container
// baru dibuat) — persis lokasi yang sudah disebut di sub-text tiap kartu:
//   overview       -> Aset > Buku Aset (assetList, "Tambahkan lewat menu
//                      📦 Aset")
//   needsAttention -> Aset > Analisis & Pajak > Penyusutan Aset
//                      (assetPenyusutanDashboard, sinyal habisManfaat
//                      berasal dari Penyusutan.hitung() yang tampil di
//                      kartu ini)
const ASSET_MAINTENANCE_CARD_NAV_TARGETS = Object.freeze({
  overview: { page: 'aset', tab: 'buku', goTo: 'assetList' },
  needsAttention: { page: 'aset', tab: 'analisis', goTo: 'assetPenyusutanDashboard' },
});

const AssetMaintenancePresenter = {

  render() {
    const el = document.getElementById('assetMaintenanceGrid');
    if (!el) return; // container belum ada di halaman ini, aman diam2.

    if (typeof AssetMaintenanceAPI === 'undefined') {
      el.innerHTML = '<div class="empty"><div class="empty-text">Data perawatan aset belum tersedia</div></div>';
      return;
    }

    const s = AssetMaintenanceAPI.summary();
    if (!s.ok) {
      el.innerHTML = '<div class="empty"><div class="empty-text">Data perawatan aset belum tersedia</div></div>';
      return;
    }

    const cards = [
      this._overviewCard(s.stats),
      this._attentionCard(s.needsAttention),
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

  // _overviewCard(s) — s = AssetMaintenanceAPI.summary().stats, dipakai
  // APA ADANYA (totalAssets/trackedCount/untrackedCount/
  // needsAttentionCount — 0 recompute).
  _overviewCard(s) {
    const onClick = { action: 'dashHubNavigateToFeature', args: [ASSET_MAINTENANCE_CARD_NAV_TARGETS.overview] };
    if (!s || !s.ok) {
      return { icon: '🔧', label: 'Ringkasan Perawatan Aset', value: '—', cls: '', sub: s && s.reason, onClick };
    }
    if (s.totalAssets === 0) {
      return { icon: '🔧', label: 'Ringkasan Perawatan Aset', value: 'Belum ada aset tercatat', cls: '', sub: 'Tambahkan lewat menu 📦 Aset.', onClick };
    }
    return {
      icon: '🔧',
      label: 'Ringkasan Perawatan Aset',
      value: `${s.trackedCount} dari ${s.totalAssets} dilacak`,
      cls: '',
      sub: `${s.untrackedCount} belum aktifkan penyusutan · lihat menu 📦 Aset`,
      onClick,
    };
  },

  // _attentionCard(a) — a = AssetMaintenanceAPI.summary().needsAttention,
  // dipakai APA ADANYA (count/items[].name — 0 recompute, sinyal
  // `habisManfaat` dari `Penyusutan.hitung()` yang SUDAH ADA).
  _attentionCard(a) {
    const onClick = { action: 'dashHubNavigateToFeature', args: [ASSET_MAINTENANCE_CARD_NAV_TARGETS.needsAttention] };
    if (!a || !a.ok) {
      return { icon: '⚠️', label: 'Perlu Ditinjau', value: '—', cls: '', sub: a && a.reason, onClick };
    }
    if (a.count === 0) {
      return { icon: '✅', label: 'Perlu Ditinjau', value: 'Tidak ada', cls: 'green', sub: 'Semua aset yang dilacak masih dalam umur manfaat.', onClick };
    }
    const names = a.items.slice(0, 2).map((x) => x.name).join(', ');
    return {
      icon: '⚠️',
      label: 'Perlu Ditinjau',
      value: `${a.count} aset`,
      cls: 'red',
      sub: `${names}${a.count > 2 ? ', +' + (a.count - 2) + ' lainnya' : ''} · umur manfaat sudah habis`,
      onClick,
    };
  },

};
