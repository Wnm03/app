// ui/areas.js — render-only lewat areaAdapterList(D). Ringkasan jumlah
// item per AREA (lihat adapters/area-adapter.js — LIFEOS_AREAS,
// lifeos-registry.js). Sebelum Sesi 39, area-adapter.js sudah ADA & sudah
// dites (Sesi 24) tapi TIDAK PERNAH dikonsumsi UI manapun — bagian dari
// "Executive Dashboard Integration" (target eksplisit user Sesi 39) yang
// melengkapi LifeOSHome supaya SEMUA 6 adapter (area/today/goal/project/
// review/knowledge) benar-benar terpakai sebagai satu pintu masuk.
//
// Beda dari Today/Goals/Projects: 1 Area = gabungan BANYAK dSources
// sekaligus (bukan 1 item -> 1 sumber tunggal), jadi tidak ada
// sourceKind/sourceId per-entri utk lifeOSNavigateToSource() — murni
// ringkasan angka, tanpa aksi/navigasi apa pun (read-only agregat).
//
// Sesi 281 (KNOWN-ISSUES.md §4.1): ikon area sebelumnya emoji literal
// (escapeHtml(a.icon)) — sekarang lewat FeatureIcons.render() (pola
// SAMA PERSIS dashboard-hub.js/dashboard-hub-search.js), konsisten
// dgn ikon fitur lain di app. `a.icon` bersumber dari LIFEOS_AREAS
// (lifeos-registry.js) — data statis terdaftar di source, BUKAN input
// user, jadi aman dipakai tanpa escapeHtml (sama seperti FEATURE_REGISTRY
// yang juga tidak di-escape). Guard `typeof FeatureIcons` menjaga
// fallback ke emoji asli kalau file belum di-load / emoji belum
// terpetakan di `_MAP` (0 kemungkinan kosong/pecah).

const LifeOSAreas = {
  render() {
    const el = document.getElementById('lifeOSAreasGrid');
    if (!el) return;
    const areas = areaAdapterList(D);
    el.innerHTML = areas.length
      ? areas.map((a) => `
        <div class="lifeos-area-card">
          <div class="lifeos-area-icon">${(typeof FeatureIcons !== 'undefined') ? FeatureIcons.render(a.icon || '🗂️') : escapeHtml(a.icon || '🗂️')}</div>
          <div class="lifeos-area-name">${escapeHtml(a.label || '')}</div>
          <div class="lifeos-area-count">${a.itemCount} item</div>
        </div>
      `).join('')
      : '<div class="empty"><div class="empty-text">Belum ada data area</div></div>';
  },
};
