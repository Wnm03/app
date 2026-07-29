// modules/cross/recommendation-panel.js — Recommendation Panel (Sesi 90,
// Batch 8). Target sesi: Personal Decision Center Foundation.
//
// PRINSIP (RULE #1 sesi ini): UI HANYA presenter. 100% REUSE
// DecisionCenterAPI.summary() (modules/cross/decision-center-api.js,
// sesi ini) -> s.recommendations (subset insight `type==='warning'`
// yang SUDAH FINAL dari layer di bawahnya) — TIDAK ada rumus/kategori
// baru di file ini, TIDAK membaca D/FinanceIntelligence/VehicleIntelligence
// langsung sama sekali. Pola SILENT sama persis CrossInsightPresenter/
// LifePriorityPanel — body dikosongkan kalau tidak ada rekomendasi.
//
// Dipanggil dari DecisionCenterHome.render() (modules/cross/
// decision-center-home.js, sesi ini) — TIDAK ada mekanisme render baru.
//
// WIRING S114 (Batch 13) — Unified Recommendation Panel Integration:
// getRecommendations() ditambahkan sbg SATU pintu masuk DATA publik
// (dipisah dari render()), 100% reuse DecisionCenterAPI.summary() apa
// adanya (0 rumus/transformasi baru — sama persis logic yang sebelumnya
// inline di render()). render() sendiri direfaktor supaya memanggil
// getRecommendations() ini (bukan DecisionCenterAPI.summary() langsung),
// jadi HANYA ADA SATU tempat yang tahu cara ambil rekomendasi — dipakai
// bareng oleh render() (DashboardHub, TIDAK berubah perilaku) & AI Chat
// (recommendationPanelChatContext(), ai-chat.js, sesi ini juga) — TIDAK
// ada API baru di layer manapun di bawah RecommendationPanel, TIDAK ada
// duplikasi transformasi data.
const RecommendationPanel = {

  // _icon(type) — pemetaan type insight ke emoji, pola sama persis
  // CrossInsightPresenter._icon(), MURNI presentasional (di sini
  // praktis selalu 'warning' krn recommendations() sudah difilter,
  // tapi tetap disediakan fallback yang sama utk konsistensi).
  _icon(type) {
    return { warning: '🟡', positive: '🟢', info: 'ℹ️' }[type] || 'ℹ️';
  },

  // getRecommendations() — Recommendation Panel Data API (S114). 100%
  // reuse DecisionCenterAPI.summary() apa adanya, 0 rumus baru — murni
  // dipindah dari body render() (dulu inline) supaya bisa dipakai ulang
  // oleh konsumen non-DOM (AI Chat). {ok:false, recommendations:[]}
  // kalau DecisionCenterAPI belum dimuat ATAU summary() sendiri
  // {ok:false}/recommendations bukan array (pola guard sama persis
  // render() versi lama).
  getRecommendations() {
    if (typeof DecisionCenterAPI === 'undefined') return { ok: false, recommendations: [] };
    const s = DecisionCenterAPI.summary();
    if (!s.ok || !Array.isArray(s.recommendations)) return { ok: false, recommendations: [] };
    return { ok: true, recommendations: s.recommendations };
  },

  render() {
    const el = document.getElementById('recommendationPanelBody');
    if (!el) return; // container belum ada di halaman ini, aman diam2.

    const { ok, recommendations } = this.getRecommendations();
    if (!ok || !recommendations.length) {
      el.innerHTML = '';
      return;
    }

    const rows = recommendations.map((r) => `
      <div class="u-fs12 u-lh15 u-t2 u-mb6" style="border-left:3px solid var(--accent3);padding-left:8px;">
        ${this._icon(r.type)} ${escapeHtml(r.message)}
      </div>
    `).join('');

    el.innerHTML = `<div class="u-fs11 u-fw700 u-t2 u-mb6 u-mt10">💡 Rekomendasi utk Anda</div>`
      + rows;
  },

};
