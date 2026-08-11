// modules/cross/cross-module-widgets.js — Cross Module Widgets (Sesi 89,
// Batch 8). Lihat docs/BATCH_PLAN.md § Batch 8.
//
// PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE
// LifeDashboardSummaryAPI.summary() (modules/cross/
// life-dashboard-summary-api.js, sesi ini) — TIDAK ada rumus baru, TIDAK
// menghitung ulang insightCount/priorityCount, TIDAK membaca D langsung
// sama sekali (pola sama persis CrossDashboardCard — 0 pembacaan D
// tambahan). Beda scope dgn CrossDashboardCard (Sesi 87, yang sudah
// menampilkan skor kesehatan finansial/armada + total perhatian gabungan)
// — widget di sini KHUSUS 2 angka level "Personal Life Dashboard" yang
// BELUM ditampilkan kartu manapun: insight gabungan & prioritas aktif
// (priorityCount, Sesi ini), supaya TIDAK duplicate kartu yang sudah ada.
//
// Satu-satunya "logic" di file ini adalah pemetaan nilai>0 ke warna
// (cls 'orange'/'green') — pola SAMA PERSIS
// CrossDashboardCard._combinedAttentionCard(), bukan ambang baru.
//
// Dipanggil dari UnifiedDashboardHome.render() (modules/cross/
// unified-dashboard-home.js, sesi ini) — TIDAK ada mekanisme render baru.
//
// CSS: TIDAK ada class baru — reuse penuh .findash-grid/.findash-card*
// (styles.css, Sesi 75) apa adanya.
const CrossModuleWidgets = {

  render() {
    const el = document.getElementById('crossWidgetsGrid');
    if (!el) return; // container belum ada di halaman ini, aman diam2.

    if (typeof LifeDashboardSummaryAPI === 'undefined') {
      el.innerHTML = '<div class="empty"><div class="empty-text">Data life dashboard belum tersedia</div></div>';
      return;
    }
    const s = LifeDashboardSummaryAPI.summary();
    if (!s.ok) {
      el.innerHTML = '<div class="empty"><div class="empty-text">Data life dashboard belum tersedia</div></div>';
      return;
    }

    const cards = [
      { icon: '📰', label: 'Insight Tersedia', value: String(s.insightCount || 0), cls: (s.insightCount || 0) > 0 ? 'orange' : 'green' },
      { icon: '📌', label: 'Prioritas Aktif', value: String(s.priorityCount || 0), cls: (s.priorityCount || 0) > 0 ? 'orange' : 'green' },
    ];

    el.innerHTML = cards.map((c) => `
      <div class="findash-card">
        <div class="findash-card-icon">${c.icon}</div>
        <div class="findash-card-body">
          <div class="findash-card-label">${escapeHtml(c.label)}</div>
          <div class="findash-card-val${c.cls ? ' ' + c.cls : ''}">${escapeHtml(c.value)}</div>
        </div>
      </div>
    `).join('');
  },

};
