// modules/cross/unified-dashboard-home.js — Unified Dashboard Home (Sesi
// 89, Batch 8). Lihat docs/BATCH_PLAN.md § Batch 8 — "Personal Life
// Dashboard Foundation".
//
// PRINSIP (RULE #1 sesi ini): UI HANYA presenter, TIDAK ada rumus/state
// baru di file ini. Unified Dashboard Home adalah SATU pintu masuk render
// (entry point) utk seluruh section "Personal Life Dashboard" — 100%
// REUSE 3 presenter yang sudah ada (sesi ini juga): PersonalOverviewPresenter
// (modules/cross/personal-overview-presenter.js), CrossModuleWidgets
// (modules/cross/cross-module-widgets.js), LifePriorityPanel (modules/
// cross/life-priority-panel.js) — TIDAK ada mekanisme render baru, murni
// memanggil `.render()` ketiganya berurutan, pola SAMA PERSIS
// DashboardHub.render() sendiri yang juga memanggil banyak `X.render()`
// berurutan utk tiap section.
//
// Alasan dipisah jadi 1 file orchestrator (bukan 3 baris render() lepas
// langsung di DashboardHub.render()): 3 deliverable sesi ini (Personal
// Overview/Cross Module Widgets/Priority Panel) SECARA PRODUK adalah 1
// section "Personal Life Dashboard" yang tampil bersamaan — DashboardHub.
// render() cukup memanggil SATU titik (UnifiedDashboardHome.render()),
// konsisten dgn cara `docs/BATCH_PLAN.md` sesi ini menyebut deliverable
// "Unified Dashboard Home" sbg home/entry-point-nya sendiri.
const UnifiedDashboardHome = {

  render() {
    if (typeof PersonalOverviewPresenter !== 'undefined') PersonalOverviewPresenter.render();
    if (typeof CrossModuleWidgets !== 'undefined') CrossModuleWidgets.render();
    if (typeof LifePriorityPanel !== 'undefined') LifePriorityPanel.render();
  },

};
