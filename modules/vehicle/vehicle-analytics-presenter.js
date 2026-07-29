// modules/vehicle/vehicle-analytics-presenter.js — Vehicle Analytics
// Presenter (Sesi 81, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7.
//
// PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE
// VehicleCostSummary.summary() (modules/vehicle/vehicle-cost-summary.js,
// sesi ini — sendiri 100% reuse VehicleTrendAPI) + VehicleIntelligence.
// fleetSummary() (Sesi 76, HANYA utk guard "belum ada data kendaraan",
// pola sama persis VehicleInsightPresenter yang cek hook.intelligence.
// fleet.totalVehicles) — TIDAK ada rumus baru, TIDAK menghitung ulang
// total/rata-rata/arah tren biaya, TIDAK membaca D langsung sama sekali
// (pola sama persis VehicleInsightPresenter/VehicleDashboard).
//
// Dipanggil dari renderCnTab() (modules/shared/modules-render.js) — DIPINDAH dari
// DashboardHub.render() di Sesi 133, live-wiring renderDashboard() DIHAPUS di Sesi 134
// (gap fix, sudah dobel dgn renderCnTab(), lihat CHANGELOG.md Sesi 134)
// (modules/shared/modules-render.js), TIDAK ada mekanisme render baru —
// pola SAMA PERSIS VehicleInsightPresenter.render()/VehicleDashboard.
// render().
//
// CSS: TIDAK ada class baru — reuse penuh .findash-grid/.findash-card*
// (styles.css, Sesi 75) apa adanya.
//
// VEHICLE_ANALYTICS_NAV_TARGETS (Sesi 253 — Batch Vehicle Navigation
// Consistency) — tujuan navigasi tiap kartu #vehanalyticsGrid. MURNI DATA
// (0 logic navigasi baru), format {page,tab,subtab,goTo} SAMA PERSIS
// format target dashHubNavigateToFeature() yang SUDAH ADA (dashboard-
// hub.js). Nama disendirikan per-file supaya tidak bentrok dgn const
// global lain (lihat kasus S251). Target TERVERIFIKASI ADA di index.html/
// app_production.html (grep manual, 0 halaman/tab/container baru dibuat):
//   total/trend -> gabungan BBM+servis, tidak ada 1 daftar spesifik ->
//     container kartu ini sendiri (vehAnalyticsWrap)
//   fuel -> Kendaraan > tab BBM > bbmList (SAMA PERSIS target 'cn-bbm' di
//     dashboard-hub-registry.js)
//   service -> Kendaraan > tab Servis > servisList (SAMA PERSIS target
//     'cn-servis' di dashboard-hub-registry.js)
const VEHICLE_ANALYTICS_NAV_TARGETS = Object.freeze({
  total: { page: 'carnotes', tab: 'insight', subtab: 'rekomendasi', goTo: 'vehAnalyticsWrap' },
  fuel: { page: 'carnotes', tab: 'bbm', subtab: 'ringkasan', goTo: 'bbmList' },
  service: { page: 'carnotes', tab: 'servis', goTo: 'servisList' },
  trend: { page: 'carnotes', tab: 'insight', subtab: 'rekomendasi', goTo: 'vehAnalyticsWrap' },
});

const VehicleAnalyticsPresenter = {

  render() {
    const el = document.getElementById('vehanalyticsGrid');
    if (!el) return; // container belum ada di halaman ini, aman diam2.

    if (typeof VehicleCostSummary === 'undefined') {
      el.innerHTML = '<div class="empty"><div class="empty-text">Data vehicle cost summary belum tersedia</div></div>';
      return;
    }
    const summary = VehicleCostSummary.summary();
    if (!summary.ok) {
      el.innerHTML = '<div class="empty"><div class="empty-text">Data vehicle cost summary belum tersedia</div></div>';
      return;
    }
    const hasVehicles = (typeof VehicleIntelligence !== 'undefined')
      && VehicleIntelligence.fleetSummary().totalVehicles > 0;
    if (!hasVehicles) {
      el.innerHTML = '<div class="empty"><div class="empty-text">Belum ada data kendaraan</div></div>';
      return;
    }

    const cards = [
      this._totalCard(summary),
      this._fuelCard(summary),
      this._serviceCard(summary),
      this._trendCard(summary),
    ];

    // S253 (Batch Vehicle Navigation Consistency): SELURUH kartu clickable
    // lewat mekanisme SAMA PERSIS FinanceDashboard.render()/
    // VehicleDashboard.render() — tiap kartu carry field onClick:{action,
    // args} sendiri (ditempel di masing2 _xxxCard() di bawah), template di
    // sini CUMA mengecek `c.onClick` (0 logic navigasi baru, 0 percabangan
    // per-index, JANGAN openCard(index)).
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

  // _money(n) — reuse fmt() (format-tema.js, SUDAH ADA & dipakai
  // FinanceDashboard/VehicleDashboard) apa adanya, dgn fallback yang sama
  // persis polanya kalau fmt belum dimuat (guard typeof, pola sama persis
  // FinanceDashboard._netWorthCard()).
  _money(n) {
    return (typeof fmt === 'function') ? fmt(n) : ('Rp ' + Math.round(n || 0));
  },

  // _totalCard(s) — s = VehicleCostSummary.summary() apa adanya (total
  // biaya BBM+servis gabungan N bulan terakhir — 0 recompute di sini).
  _totalCard(s) {
    return {
      icon: '💰',
      label: `Total Biaya Kendaraan (${s.months} Bulan)`,
      value: this._money(s.total),
      cls: '',
      sub: `Rata-rata ${this._money(s.avgPerMonth)}/bulan`,
      onClick: { action: 'dashHubNavigateToFeature', args: [VEHICLE_ANALYTICS_NAV_TARGETS.total] },
    };
  },

  // _fuelCard(s) — s.totalFuel dari VehicleCostSummary.summary() apa
  // adanya (breakdown SUM D.bbmLogs[].cost via VehicleTrendAPI — 0
  // recompute di sini).
  _fuelCard(s) {
    return {
      icon: '⛽',
      label: 'Total Biaya BBM',
      value: this._money(s.totalFuel),
      cls: '',
      onClick: { action: 'dashHubNavigateToFeature', args: [VEHICLE_ANALYTICS_NAV_TARGETS.fuel] },
    };
  },

  // _serviceCard(s) — s.totalService dari VehicleCostSummary.summary()
  // apa adanya (breakdown SUM D.servisLogs[].cost via VehicleTrendAPI —
  // 0 recompute di sini).
  _serviceCard(s) {
    return {
      icon: '🔧',
      label: 'Total Biaya Servis',
      value: this._money(s.totalService),
      cls: '',
      onClick: { action: 'dashHubNavigateToFeature', args: [VEHICLE_ANALYTICS_NAV_TARGETS.service] },
    };
  },

  // _trendCard(s) — s.direction/lastMonth/prevMonth dari VehicleCostSummary
  // .summary() apa adanya (perbandingan 2 bulan terakhir yang sudah
  // dihitung di sana — 0 recompute di sini).
  _trendCard(s) {
    const label = s.direction === 'up' ? 'Naik' : s.direction === 'down' ? 'Turun' : 'Tetap';
    const icon = s.direction === 'up' ? '📈' : s.direction === 'down' ? '📉' : '➖';
    const cls = s.direction === 'up' ? 'red' : s.direction === 'down' ? 'green' : '';
    const sub = (s.lastMonth && s.prevMonth)
      ? `${s.lastMonth.label}: ${this._money(s.lastMonth.total)} vs ${s.prevMonth.label}: ${this._money(s.prevMonth.total)}`
      : undefined;
    return {
      icon,
      label: 'Tren Biaya Bulan Terakhir',
      value: label,
      cls,
      sub,
      onClick: { action: 'dashHubNavigateToFeature', args: [VEHICLE_ANALYTICS_NAV_TARGETS.trend] },
    };
  },

};
