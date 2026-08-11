// modules/cross/decision-center-home.js — Decision Center Home (Sesi 90,
// Batch 8). Target sesi: Personal Decision Center Foundation — Dashboard
// Integration.
//
// PRINSIP (RULE #1 sesi ini): UI HANYA presenter, TIDAK ada rumus/state
// baru di file ini. Decision Center Home adalah SATU pintu masuk render
// (entry point) utk section "Personal Decision Center" — 100% REUSE 2
// presenter yang sudah ada (sesi ini juga): RecommendationPanel (modules/
// cross/recommendation-panel.js), ActionQueue (modules/cross/
// action-queue.js) — TIDAK ada mekanisme render baru, murni memanggil
// `.render()` keduanya berurutan, pola SAMA PERSIS UnifiedDashboardHome
// (Sesi 89) yang juga jadi orchestrator tipis utk beberapa presenter
// section yang sama.
//
// Alasan dipisah jadi 1 file orchestrator (bukan 2 baris render() lepas
// langsung di DashboardHub.render()): Recommendation Panel & Action
// Queue SECARA PRODUK adalah 1 section "Personal Decision Center" yang
// tampil bersamaan — DashboardHub.render() cukup memanggil SATU titik
// (DecisionCenterHome.render()), konsisten dgn pola UnifiedDashboardHome.
const DecisionCenterHome = {

  render() {
    if (typeof RecommendationPanel !== 'undefined') RecommendationPanel.render();
    if (typeof ActionQueue !== 'undefined') ActionQueue.render();
  },

};
