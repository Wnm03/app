// modules/vehicle/vehicle-automation-presenter.js — Automation Presenter
// (Sesi 83, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7.
//
// PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE
// VehicleReminderScheduler.summary() + VehicleMaintenanceAutomation.
// plan() + VehicleTaxDocumentAutomation.plan() (ketiganya sesi ini,
// sendiri 100% reuse VehicleAutomationAPI -> Decision Engine) — TIDAK
// ada rumus baru, TIDAK menghitung ulang total/counts/task apa pun di
// file ini, TIDAK membaca D langsung sama sekali (pola sama persis
// VehicleAnalyticsPresenter/VehicleInsightPresenter yang juga 0
// pembacaan D). Satu-satunya operasi presentasional di sini: menyusun
// 4 kartu ringkasan dari angka yang SUDAH ADA (pola sama persis
// VehicleAnalyticsPresenter — cards selalu tampil selama ada kendaraan,
// BUKAN pola silent-kalau-kosong VehicleAlertPanel/VehicleDecision
// Presenter, karena ini kartu ringkasan angka, bukan daftar item).
//
// Dipanggil dari renderCnTab() (modules/shared/modules-render.js) — DIPINDAH dari
// DashboardHub.render() di Sesi 133, live-wiring renderDashboard() DIHAPUS di Sesi 134
// (gap fix, sudah dobel dgn renderCnTab(), lihat CHANGELOG.md Sesi 134)
// (modules/shared/modules-render.js), TIDAK ada mekanisme render baru.
//
// CSS: TIDAK ada class baru — reuse penuh .findash-grid/.findash-card*
// (styles.css, Sesi 75) & class "empty"/"empty-text" (SUDAH dipakai
// VehicleAnalyticsPresenter) apa adanya.
//
// VEHICLE_AUTOMATION_NAV_TARGETS (Sesi 253 — Batch Vehicle Navigation
// Consistency) — tujuan navigasi tiap kartu #vehAutomationGrid. MURNI DATA
// (0 logic navigasi baru), format {page,tab,subtab,goTo} SAMA PERSIS
// format target dashHubNavigateToFeature() yang SUDAH ADA (dashboard-
// hub.js). Nama disendirikan per-file supaya tidak bentrok dgn const
// global lain (lihat kasus S251). Target TERVERIFIKASI ADA di index.html/
// app_production.html (grep manual, 0 halaman/tab/container baru dibuat):
//   total/today -> gabungan servis+pajak, tidak ada 1 daftar spesifik ->
//     container kartu ini sendiri (vehAutomationWrap)
//   maintenance -> Kendaraan > tab Servis > servisList (SAMA PERSIS target
//     'cn-servis' di dashboard-hub-registry.js)
//   tax -> Kendaraan > vehTaxList (SAMA PERSIS target 'cn-pajak-sim' di
//     dashboard-hub-registry.js)
const VEHICLE_AUTOMATION_NAV_TARGETS = Object.freeze({
  total: { page: 'carnotes', tab: 'insight', subtab: 'rekomendasi', goTo: 'vehAutomationWrap' },
  today: { page: 'carnotes', tab: 'insight', subtab: 'rekomendasi', goTo: 'vehAutomationWrap' },
  maintenance: { page: 'carnotes', tab: 'servis', goTo: 'servisList' },
  // BUGFIX (Sesi 264, audit navigasi Dashboard/Car Notes): SEBELUMNYA
  // target 'tax' tidak py `tab` sama sekali, padahal #vehTaxList hidup di
  // dalam #cnTab-pajak (grep manual index.html). Tanpa `tab`,
  // dashHubNavigateToFeature() cuma pindah ke halaman Car Notes tanpa
  // ganti sub-tab -- kalau user sedang di sub-tab lain (mis. Insight/
  // BBM/Servis), scrollIntoView ke #vehTaxList (di dalam sub-tab yang
  // disembunyikan 'u-dnone') tidak melakukan apa-apa, terlihat seperti
  // "kartu Pajak/SIM tidak mengarah ke mana-mana".
  tax: { page: 'carnotes', tab: 'pajak', goTo: 'vehTaxList' },
});

const VehicleAutomationPresenter = {

  render() {
    const el = document.getElementById('vehAutomationGrid');
    if (!el) return; // container belum ada di halaman ini, aman diam2.

    if (typeof VehicleReminderScheduler === 'undefined'
      || typeof VehicleMaintenanceAutomation === 'undefined'
      || typeof VehicleTaxDocumentAutomation === 'undefined') {
      el.innerHTML = '<div class="empty"><div class="empty-text">Data vehicle automation belum tersedia</div></div>';
      return;
    }

    const hasVehicles = (typeof VehicleIntelligence !== 'undefined')
      && VehicleIntelligence.fleetSummary().totalVehicles > 0;
    if (!hasVehicles) {
      el.innerHTML = '<div class="empty"><div class="empty-text">Belum ada data kendaraan</div></div>';
      return;
    }

    const scheduleSummary = VehicleReminderScheduler.summary();
    const maintenancePlan = VehicleMaintenanceAutomation.plan();
    const taxPlan = VehicleTaxDocumentAutomation.plan();

    const cards = [
      this._totalCard(scheduleSummary),
      this._todayCard(scheduleSummary),
      this._maintenanceCard(maintenancePlan),
      this._taxCard(taxPlan),
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
        </div>
      </div>
    `).join('');
  },

  // _totalCard(s) — s.total dari VehicleReminderScheduler.summary() apa
  // adanya (jumlah semua item terjadwal fleet-level — 0 recompute di
  // sini).
  _totalCard(s) {
    return {
      icon: '🤖', label: 'Total Item Terjadwal', value: String(s.total), cls: '',
      onClick: { action: 'dashHubNavigateToFeature', args: [VEHICLE_AUTOMATION_NAV_TARGETS.total] },
    };
  },

  // _todayCard(s) — s.counts.today dari VehicleReminderScheduler.
  // summary() apa adanya (bucket 'today' — severity 'overdue' — 0
  // recompute di sini).
  _todayCard(s) {
    return {
      icon: '⏰', label: 'Segera (Hari Ini)', value: String(s.counts.today), cls: s.counts.today > 0 ? 'red' : '',
      onClick: { action: 'dashHubNavigateToFeature', args: [VEHICLE_AUTOMATION_NAV_TARGETS.today] },
    };
  },

  // _maintenanceCard(p) — p.total dari VehicleMaintenanceAutomation.
  // plan() apa adanya (filter type 'service' — 0 recompute di sini).
  _maintenanceCard(p) {
    return {
      icon: '🔧', label: 'Servis Terjadwal', value: String(p.total), cls: '',
      onClick: { action: 'dashHubNavigateToFeature', args: [VEHICLE_AUTOMATION_NAV_TARGETS.maintenance] },
    };
  },

  // _taxCard(p) — p.total dari VehicleTaxDocumentAutomation.plan() apa
  // adanya (filter type 'tax' — 0 recompute di sini).
  _taxCard(p) {
    return {
      icon: '📋', label: 'Pajak/Dokumen Terjadwal', value: String(p.total), cls: '',
      onClick: { action: 'dashHubNavigateToFeature', args: [VEHICLE_AUTOMATION_NAV_TARGETS.tax] },
    };
  },

};
