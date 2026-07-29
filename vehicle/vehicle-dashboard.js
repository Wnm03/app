// modules/vehicle/vehicle-dashboard.js — Vehicle Dashboard Foundation
// (Sesi 77, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7.
//
// PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE
// VehicleIntelligence.summary() (modules/vehicle/vehicle-intelligence.js,
// Sesi 76) — TIDAK ada rumus baru, TIDAK menghitung ulang KM/servis/BBM/
// health score/fleet summary, TIDAK membaca D langsung sama sekali (beda
// dari FinanceDashboard._netWorthCard() yang masih baca totalSaldoAkun()/
// totalDebtValue() langsung — di sini SEMUA angka yang ditampilkan sudah
// tersedia lewat field fleet dari summary(), jadi tidak perlu pembacaan D
// tambahan apa pun).
//
// Dipanggil dari renderCnTab() (DIPINDAH dari DashboardHub.render() di Sesi 133; pola
// "tambahan murni" sama persis FinanceDashboard.render()/EIEDashboard.render() — lihat
// komentar di dashboard-hub.js). Live-wiring renderDashboard() DIHAPUS di Sesi 134 (gap
// fix, sudah dobel dgn renderCnTab(), lihat CHANGELOG.md Sesi 134), TIDAK ada mekanisme
// render baru.
//
// AI Hook (getAIHook()): satu pintu masuk read-only utk konsumen AI/briefing
// masa depan (ai-chat.js dst) — WRAPPER TIPIS ke VehicleIntelligence.summary()
// (fleet-level, TANPA vehicleId — pola sama persis getAIHook() FinanceDashboard
// yg juga tidak menerima parameter), 0 logic tambahan, 0 transformasi data.
//
// CSS: TIDAK ada class baru — reuse penuh .findash-grid/.findash-card*
// (styles.css, Sesi 75) apa adanya, krn strukturnya generik (grid kartu
// icon+label+value+sub) & sudah cocok tanpa modifikasi.
//
// VEHICLE_DASHBOARD_NAV_TARGETS (Sesi 253 — Batch Vehicle Navigation
// Consistency) — tujuan navigasi tiap kartu #vehdashGrid. MURNI DATA (0
// logic navigasi baru), format {page,tab,subtab,goTo} SAMA PERSIS format
// target FEATURE_REGISTRY/CARD_NAV_TARGETS, dieksekusi lewat
// dashHubNavigateToFeature() yang SUDAH ADA (dashboard-hub.js). Nama
// disendirikan per-file (bukan CARD_NAV_TARGETS) supaya tidak bentrok
// dengan const global lain (lihat kasus S251). Ketiga target menunjuk
// container yang TERVERIFIKASI ADA di index.html/app_production.html (grep
// manual, 0 halaman/tab/container baru dibuat):
//   fleet -> halaman Kendaraan (Car Notes) apa adanya, belum ada container
//     daftar kendaraan spesifik yang lebih relevan dari halaman itu sendiri
//   service -> Kendaraan > tab Servis > servisList (SAMA PERSIS target
//     'cn-servis' di dashboard-hub-registry.js)
//   health -> Kendaraan > tab Insight AI > sub-tab Ringkasan > vehdashWrap
//     (container kartu ini sendiri — skor kesehatan armada = ringkasan,
//     tidak ada daftar/halaman lain yang lebih spesifik)
const VEHICLE_DASHBOARD_NAV_TARGETS = Object.freeze({
  fleet: { page: 'carnotes' },
  service: { page: 'carnotes', tab: 'servis', goTo: 'servisList' },
  health: { page: 'carnotes', tab: 'insight', subtab: 'ringkasan', goTo: 'vehdashWrap' },
});

const VehicleDashboard = {

  // getAIHook() — reuse 100% VehicleIntelligence.summary() (fleet-level,
  // tanpa vehicleId). Guard: kalau VehicleIntelligence belum dimuat (urutan
  // load / dipakai headless di test), balikin {ok:false} alih-alih throw
  // (pola sama persis getAIHook() FinanceDashboard).
  getAIHook() {
    if (typeof VehicleIntelligence === 'undefined') {
      return { ok: false, reason: 'VehicleIntelligence belum dimuat' };
    }
    return { ok: true, ...VehicleIntelligence.summary() };
  },

  render() {
    const el = document.getElementById('vehdashGrid');
    if (!el) return; // container belum ada di halaman ini, aman diam2.

    const hook = this.getAIHook();
    if (!hook.ok) {
      el.innerHTML = '<div class="empty"><div class="empty-text">Data vehicle intelligence belum tersedia</div></div>';
      return;
    }
    if (!hook.fleet || !hook.fleet.totalVehicles) {
      el.innerHTML = '<div class="empty"><div class="empty-text">Belum ada data kendaraan</div></div>';
      return;
    }

    const cards = [
      this._fleetCard(hook.fleet),
      this._serviceCard(hook.fleet),
      this._healthCard(hook.fleet),
    ];

    // S253 (Batch Vehicle Navigation Consistency): SELURUH kartu clickable
    // lewat mekanisme SAMA PERSIS FinanceDashboard.render()/
    // AssetPortfolioPresenter.render() (S251-252) — tiap kartu carry field
    // onClick:{action,args} sendiri (ditempel di masing2 _xxxCard() di
    // bawah), template di sini CUMA mengecek `c.onClick` (0 logic navigasi
    // baru, 0 percabangan per-index, JANGAN openCard(index)).
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

  // _fleetCard(fleet) — fleet = VehicleIntelligence.summary().fleet (hasil
  // fleetSummary() apa adanya), totalVehicles murni jumlah D.vehicles.
  _fleetCard(fleet) {
    return {
      icon: '🚗',
      label: 'Total Kendaraan',
      value: String(fleet.totalVehicles),
      cls: '',
      onClick: { action: 'dashHubNavigateToFeature', args: [VEHICLE_DASHBOARD_NAV_TARGETS.fleet] },
    };
  },

  // _serviceCard(fleet) — totalOverdue dari fleetSummary() apa adanya
  // (jumlah item servis status 'lewat' lintas seluruh kendaraan, reuse
  // predictService() yang sudah dipanggil VehicleIntelligence sendiri — 0
  // recompute di sini).
  _serviceCard(fleet) {
    return {
      icon: '🔧',
      label: 'Servis Lewat Jatuh Tempo',
      value: String(fleet.totalOverdue),
      cls: fleet.totalOverdue > 0 ? 'red' : 'green',
      onClick: { action: 'dashHubNavigateToFeature', args: [VEHICLE_DASHBOARD_NAV_TARGETS.service] },
    };
  },

  // _healthCard(fleet) — avgHealth dari fleetSummary() apa adanya (rata-rata
  // healthScore() seluruh kendaraan — 0 recompute di sini).
  _healthCard(fleet) {
    const score = fleet.avgHealth;
    const cls = score >= 80 ? 'green' : score >= 60 ? '' : score >= 40 ? 'orange' : 'red';
    return {
      icon: '❤️',
      label: 'Skor Kesehatan Armada',
      value: `${score}/100`,
      cls,
      onClick: { action: 'dashHubNavigateToFeature', args: [VEHICLE_DASHBOARD_NAV_TARGETS.health] },
    };
  },

};
