// modules/vehicle/vehicle-insight-feed.js — Vehicle Insight Feed
// (Sesi 80, Batch 7). Lihat docs/BATCH_PLAN.md § Batch 7.
//
// PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE
// VehicleAIHook.fleetSummary() (modules/vehicle/vehicle-ai-hook.js, Sesi
// 79) -> intelligence.insights (VehicleIntelligence.insights(), Sesi 76) +
// reminder.all (VehicleReminder.summary(), Sesi 78) — TIDAK ada rumus
// baru, TIDAK menghitung ulang apa pun. Pola SAMA PERSIS EIEInsightFeed
// (economic-intelligence/ui/eie-insight-feed.js) — feed list dgn ikon per
// severity, TAPI SINKRON (VehicleAIHook.fleetSummary() bukan async, beda
// dari InsightGenerator.list() di EIE) & TANPA link navigasi
// dashHubNavigateToFeature() (di luar scope sesi ini — item feed di sini
// tidak punya `rec.target` krn bukan RecommendationService, murni
// tampilan). Beda dari VehicleAlertPanel (HANYA severity 'overdue'):
// feed ini mencakup insight fleet-level (VehicleIntelligence.insights(),
// type info/warning/positive) DAN reminder severity 'due-soon' (belum
// mendesak tapi perlu diketahui) — overdue TIDAK diulang di sini (sudah
// jadi tanggung jawab VehicleAlertPanel, supaya tidak dobel tampil di 2
// tempat).
//
// Dipanggil dari renderCnTab() (modules/shared/modules-render.js) — DIPINDAH dari
// DashboardHub.render() di Sesi 133, live-wiring renderDashboard() DIHAPUS di Sesi 134
// (gap fix, sudah dobel dgn renderCnTab(), lihat CHANGELOG.md Sesi 134)
// (modules/shared/modules-render.js), TIDAK ada mekanisme render baru.
const VehicleInsightFeed = {

  // _insightIcon(type) — pemetaan type insight VehicleIntelligence
  // ('warning'/'positive'/'info') ke emoji, pola sama persis sevIcon di
  // EIEInsightFeed, MURNI presentasional.
  _insightIcon(type) {
    return { warning: '🟡', positive: '🟢', info: 'ℹ️' }[type] || 'ℹ️';
  },

  render() {
    const el = document.getElementById('vehInsightFeedBody');
    if (!el) return; // container belum ada di halaman ini, aman diam2.

    if (typeof VehicleAIHook === 'undefined') {
      el.innerHTML = '<div class="u-fs12 u-t2" style="opacity:.6;padding:6px 0;">Belum ada insight kendaraan.</div>';
      return;
    }
    const hook = VehicleAIHook.fleetSummary();
    if (!hook.ok) {
      el.innerHTML = '<div class="u-fs12 u-t2" style="opacity:.6;padding:6px 0;">Belum ada insight kendaraan.</div>';
      return;
    }

    const insightItems = ((hook.intelligence && hook.intelligence.insights) || [])
      .map((ins) => ({ icon: this._insightIcon(ins.type), message: ins.message }));
    const dueSoonItems = ((hook.reminder && Array.isArray(hook.reminder.all)) ? hook.reminder.all : [])
      .filter((r) => r.severity === 'due-soon')
      .map((r) => ({ icon: '⏳', message: r.message }));

    const list = [...insightItems, ...dueSoonItems].slice(0, 8);
    if (!list.length) {
      el.innerHTML = '<div class="u-fs12 u-t2" style="opacity:.6;padding:6px 0;">Belum ada insight kendaraan — semua kondisi armada aman saat ini.</div>';
      return;
    }

    el.innerHTML = list.map((item) => `
      <div style="padding:8px 0;border-bottom:1px solid var(--border,rgba(255,255,255,.08));font-size:13px;">
        ${item.icon} ${escapeHtml(item.message)}
      </div>
    `).join('');
  },

};
