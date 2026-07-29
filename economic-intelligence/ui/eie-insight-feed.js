// ui/eie-insight-feed.js — Feed insight & rekomendasi (§3, §19). HANYA
// render, akses data lewat InsightGenerator/RecommendationService (bukan
// EIEStore langsung).
//
// Baris rekomendasi ("→ ...") DAPAT DIKLIK — fase 2 UI yang disebut di
// komentar services/recommendation-service.js. `rec.target` di sana sudah
// mengikuti bentuk sama persis dengan FEATURE_REGISTRY[].target di
// dashboard-hub-registry.js, jadi navigasinya REUSE dashHubNavigateToFeature()
// (dashboard-hub.js) lewat dispatcher data-action global yang sudah ada
// (features-helpers-global-security.js) — TIDAK menulis mekanisme navigasi
// baru di sini. dashHubNavigateToFeature() sendiri yang urus showPage +
// ganti tab + scroll/flash-highlight ke target.goTo, persis seperti dipakai
// puluhan kartu fitur lain di grid Dashboard Hub.

const EIEInsightFeed = {
  async render() {
    const el = document.getElementById('eieInsightFeed');
    if (!el) return;
    try {
      const list = (await InsightGenerator.list({ onlyUnread: false }))
        .filter((i) => !i.dismissed)
        .slice(0, 8);
      if (!list.length) {
        el.innerHTML = `<div style="font-size:12.5px;opacity:.6;padding:6px 0;">Belum ada insight — kondisi makro & keuanganmu belum memicu rule apa pun saat ini.</div>`;
        return;
      }
      const sevIcon = { critical: '🔴', warning: '🟡', info: 'ℹ️' };
      el.innerHTML = list.map((ins) => {
        const rec = ins.recommendationId ? RecommendationService.getById(ins.recommendationId) : null;
        // rec.target bisa kosong/tidak dikenal (mis. recommendationId baru
        // yang belum didaftarkan) — kalau begitu tetap tampil sbg teks
        // statis (fallback aman), bukan tombol mati/error.
        const recLine = rec
          ? (rec.target
            ? `<div class="u-pointer" style="margin-top:3px;font-size:11.5px;opacity:.7;" data-action="dashHubNavigateToFeature" data-args='${escapeHtml(JSON.stringify([rec.target]))}'>→ ${escapeHtml(rec.label)}</div>`
            : `<div style="margin-top:3px;font-size:11.5px;opacity:.7;">→ ${escapeHtml(rec.label)}</div>`)
          : '';
        return `
          <div style="padding:8px 0;border-bottom:1px solid var(--border,rgba(255,255,255,.08));font-size:13px;">
            <div>${sevIcon[ins.severity] || 'ℹ️'} ${escapeHtml(ins.message)}</div>
            ${recLine}
          </div>
        `;
      }).join('');
    } catch (e) {
      console.warn('[EIE] EIEInsightFeed.render() gagal:', e);
    }
  },
};
