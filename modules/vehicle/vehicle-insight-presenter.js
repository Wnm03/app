// modules/vehicle/vehicle-insight-presenter.js — Vehicle Insight Presenter
// (Sesi 79, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7.
//
// PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE
// VehicleAIHook.fleetSummary() (modules/vehicle/vehicle-ai-hook.js, sesi
// ini) — TIDAK ada rumus baru, TIDAK menghitung ulang reminder/insight/
// health score, TIDAK membaca D langsung sama sekali (pola sama persis
// VehicleDashboard yang juga 0 pembacaan D tambahan, beda dari
// FinanceDashboard._netWorthCard()).
//
// Dipanggil dari renderCnTab() (modules/shared/modules-render.js) — DIPINDAH dari
// DashboardHub.render() di Sesi 133, live-wiring renderDashboard() DIHAPUS di Sesi 134
// (gap fix, sudah dobel dgn renderCnTab(), lihat CHANGELOG.md Sesi 134)
// (modules/shared/modules-render.js), TIDAK ada mekanisme render baru —
// pola SAMA PERSIS VehicleDashboard.render()/FinanceDashboard.render().
//
// CSS: TIDAK ada class baru — reuse penuh .findash-grid/.findash-card*
// (styles.css, Sesi 75) apa adanya.
//
// VEHICLE_INSIGHT_NAV_TARGETS (Sesi 253 — Batch Vehicle Navigation
// Consistency) — tujuan navigasi tiap kartu #vehinsightGrid. MURNI DATA (0
// logic navigasi baru), format {page,tab,subtab,goTo} SAMA PERSIS format
// target dashHubNavigateToFeature() yang SUDAH ADA (dashboard-hub.js). Nama
// disendirikan per-file supaya tidak bentrok dgn const global lain (lihat
// kasus S251). Ketiga kartu di sini adalah gabungan reminder servis+pajak+
// BBM (VehicleReminder.summary(), lintas 3 sumber sekaligus) — TIDAK ada
// satu daftar/halaman spesifik yang mewakili gabungan itu, jadi ketiganya
// menunjuk container kartu ini sendiri (vehinsightWrap, TERVERIFIKASI ADA
// di index.html/app_production.html), pola sama persis rentalManagement
// (3 kartu, 1 target sama) di S252.
const VEHICLE_INSIGHT_NAV_TARGETS = Object.freeze({
  reminder: { page: 'carnotes', tab: 'insight', subtab: 'ringkasan', goTo: 'vehinsightWrap' },
  overdue: { page: 'carnotes', tab: 'insight', subtab: 'ringkasan', goTo: 'vehinsightWrap' },
  dueSoon: { page: 'carnotes', tab: 'insight', subtab: 'ringkasan', goTo: 'vehinsightWrap' },
});

const VehicleInsightPresenter = {

  render() {
    const el = document.getElementById('vehinsightGrid');
    if (!el) return; // container belum ada di halaman ini, aman diam2.

    if (typeof VehicleAIHook === 'undefined') {
      el.innerHTML = '<div class="empty"><div class="empty-text">Data vehicle AI hook belum tersedia</div></div>';
      return;
    }
    const hook = VehicleAIHook.fleetSummary();
    if (!hook.ok) {
      el.innerHTML = '<div class="empty"><div class="empty-text">Data vehicle AI hook belum tersedia</div></div>';
      return;
    }
    if (!hook.intelligence || !hook.intelligence.fleet || !hook.intelligence.fleet.totalVehicles) {
      el.innerHTML = '<div class="empty"><div class="empty-text">Belum ada data kendaraan</div></div>';
      return;
    }

    const cards = [
      this._reminderCard(hook.reminder),
      this._overdueCard(hook.reminder),
      this._dueSoonCard(hook.reminder),
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

  // _reminderCard(reminder) — reminder = VehicleAIHook.fleetSummary().reminder
  // (hasil VehicleReminder.summary() apa adanya), total dipakai APA ADANYA
  // (gabungan service+tax+fuel — 0 recompute di sini).
  _reminderCard(reminder) {
    const total = (reminder && reminder.total) || 0;
    return {
      icon: '🔔',
      label: 'Reminder Aktif',
      value: String(total),
      cls: total > 0 ? 'orange' : 'green',
      onClick: { action: 'dashHubNavigateToFeature', args: [VEHICLE_INSIGHT_NAV_TARGETS.reminder] },
    };
  },

  // _overdueCard(reminder) — overdueCount dari VehicleReminder.summary() apa
  // adanya (reminder severity 'overdue' lintas service+tax+fuel — 0
  // recompute di sini).
  _overdueCard(reminder) {
    const count = (reminder && reminder.overdueCount) || 0;
    return {
      icon: '⛔',
      label: 'Reminder Lewat Jatuh Tempo',
      value: String(count),
      cls: count > 0 ? 'red' : 'green',
      onClick: { action: 'dashHubNavigateToFeature', args: [VEHICLE_INSIGHT_NAV_TARGETS.overdue] },
    };
  },

  // _dueSoonCard(reminder) — dueSoonCount dari VehicleReminder.summary() apa
  // adanya (reminder severity 'due-soon' lintas service+tax+fuel — 0
  // recompute di sini).
  _dueSoonCard(reminder) {
    const count = (reminder && reminder.dueSoonCount) || 0;
    return {
      icon: '⏳',
      label: 'Reminder Segera Jatuh Tempo',
      value: String(count),
      cls: count > 0 ? 'orange' : 'green',
      onClick: { action: 'dashHubNavigateToFeature', args: [VEHICLE_INSIGHT_NAV_TARGETS.dueSoon] },
    };
  },

};
