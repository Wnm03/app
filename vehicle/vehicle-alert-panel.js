// modules/vehicle/vehicle-alert-panel.js — Vehicle Alert Panel
// (Sesi 80, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7.
//
// PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE
// VehicleAIHook.fleetSummary() (modules/vehicle/vehicle-ai-hook.js, Sesi
// 79) -> reminder.all (VehicleReminder.summary(), Sesi 78) — TIDAK ada
// rumus baru, TIDAK menghitung ulang status/severity apa pun. Satu-satunya
// operasi di sini adalah FILTER array yang sudah ada ke severity
// `'overdue'` (bukan recompute ambang — severity itu sendiri sudah final
// dari VehicleReminder, sama seperti VehicleIntelligence.insights() yang
// juga cuma filter status yang sudah ada). Pola SILENT-kalau-kosong sama
// persis AIStatusCard (ai-chat.js) — panel ini murni "hal yang perlu
// perhatian SEKARANG", jadi tidak nambah ruang kosong kalau tidak ada
// (beda dari VehicleInsightPresenter yang selalu tampil krn berupa
// angka ringkasan, bukan daftar).
//
// Dipanggil dari renderCnTab() (modules/shared/modules-render.js) — DIPINDAH dari
// DashboardHub.render() di Sesi 133, live-wiring renderDashboard() DIHAPUS di Sesi 134
// (gap fix, sudah dobel dgn renderCnTab(), lihat CHANGELOG.md Sesi 134)
// (modules/shared/modules-render.js), TIDAK ada mekanisme render baru.
const VehicleAlertPanel = {

  // _icon(type) — pemetaan tipe reminder ('service'/'tax'/'fuel') ke emoji,
  // MURNI presentasional, bukan logic baru (tipe itu sendiri sudah ada di
  // tiap item VehicleReminder.summary()).
  _icon(type) {
    return { service: '🔧', tax: '📋', fuel: '⛽' }[type] || '⛔';
  },

  render() {
    const el = document.getElementById('vehAlertBody');
    if (!el) return; // container belum ada di halaman ini, aman diam2.

    if (typeof VehicleAIHook === 'undefined') { el.innerHTML = ''; return; }
    const hook = VehicleAIHook.fleetSummary();
    if (!hook.ok || !hook.reminder || !Array.isArray(hook.reminder.all)) { el.innerHTML = ''; return; }

    const overdue = hook.reminder.all.filter((r) => r.severity === 'overdue');
    if (!overdue.length) { el.innerHTML = ''; return; }

    const rows = overdue.map((r) => `
      <div class="u-fs12 u-lh15 u-t2 u-mb6" style="border-left:3px solid var(--accent4);padding-left:8px;">
        ${this._icon(r.type)} ${escapeHtml(r.message)}
      </div>
    `).join('');

    el.innerHTML = `<div class="u-fs11 u-fw700 u-t2 u-mb6 u-mt10">⛔ Butuh Perhatian Segera</div>${rows}`;
  },

};
