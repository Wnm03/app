// modules/cross/personal-overview-presenter.js — Personal Overview
// Presenter (Sesi 89, Batch 8). Lihat docs/BATCH_PLAN.md § Batch 8.
//
// PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE
// LifeDashboardSummaryAPI.summary() (modules/cross/
// life-dashboard-summary-api.js, sesi ini) — TIDAK ada rumus baru, TIDAK
// menyusun teks briefing di file ini (teksnya APA ADANYA dari
// UnifiedAIBriefing lewat LifeDashboardSummaryAPI), TIDAK membaca D
// langsung sama sekali. Pola SILENT sama persis UnifiedBriefingPresenter
// (Sesi 88) — body dikosongkan kalau tidak ada apa pun buat diceritakan.
//
// Dipanggil dari UnifiedDashboardHome.render() (modules/cross/
// unified-dashboard-home.js, sesi ini) — TIDAK ada mekanisme render baru.
const PersonalOverviewPresenter = {

  render() {
    const el = document.getElementById('personalOverviewBody');
    if (!el) return; // container belum ada di halaman ini, aman diam2.

    if (typeof LifeDashboardSummaryAPI === 'undefined') { el.innerHTML = ''; return; }
    const s = LifeDashboardSummaryAPI.summary();
    if (!s.ok) { el.innerHTML = ''; return; }

    const briefText = (s.briefing && s.briefing.ok) ? s.briefing.text : '';
    const priorityLine = s.priorityCount > 0
      ? `⚠️ ${s.priorityCount} hal butuh perhatian dari Finance &amp; Vehicle.`
      : '✅ Semua aman, tidak ada yang mendesak saat ini.';

    if (!briefText && !s.priorityCount) { el.innerHTML = ''; return; }

    el.innerHTML = `<div class="u-fs12 u-fw700 u-t2 u-mb6 u-mt10">👤 Ringkasan Hidup Pribadi</div>`
      + (briefText ? `<div class="u-fs12 u-lh15 u-t2 u-mb6">${escapeHtml(briefText)}</div>` : '')
      + `<div class="u-fs12 u-lh15 u-t2">${priorityLine}</div>`;
  },

};
