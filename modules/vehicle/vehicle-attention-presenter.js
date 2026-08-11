// modules/vehicle/vehicle-attention-presenter.js — Vehicle Attention Card
// (Sesi 156b, permintaan eksplisit user: gabungkan VehicleAlertPanel +
// VehicleInsightFeed + VehicleDecisionPresenter jadi SATU card ranked
// "🧭 Perlu Perhatian" — satu daftar/satu prioritas, bukan 3 versi beda
// dari info yang sama.
//
// PRINSIP: UI HANYA presenter, 0 rumus/skoring baru — 100% REUSE:
//  - Item actionable (servis/pajak/BBM/insight peringatan) diambil dari
//    VehicleRecommendationEngine.recommendations() -> VehiclePriorityScoring.
//    rank() -> VehicleActionRecommendation.withAction() — persis alur yang
//    dulu dipakai VehicleDecisionPresenter, TIDAK diubah sama sekali.
//    VehicleRecommendationEngine SUDAH mencakup reminder severity
//    'overdue'/'due-soon' (dulu tampil terpisah di VehicleAlertPanel/
//    VehicleInsightFeed) + insight type 'warning' (lihat komentar
//    _fromReminders()/_fromInsights() di vehicle-recommendation-engine.js)
//    — jadi sumber ini SUDAH superset dari isi VehicleAlertPanel & sebagian
//    besar VehicleInsightFeed, TIDAK perlu dihitung ulang di sini.
//  - Sisanya (insight fleet-level type 'info'/'positive' yang SENGAJA
//    dilewati VehicleRecommendationEngine krn bukan hal actionable) diambil
//    langsung dari VehicleAIHook.fleetSummary().intelligence.insights
//    (persis sumber data VehicleInsightFeed yang lama), ditampilkan SETELAH
//    item actionable sbg baris info tambahan (bukan actionable, tidak ada
//    CTA/action label).
//
// VehicleAlertPanel.render()/VehicleInsightFeed.render()/
// VehicleDecisionPresenter.render() (file lama, tidak dihapus utk histori)
// TIDAK LAGI dipanggil dari renderCnTab() (modules/shared/modules-render.js)
// — diganti panggilan tunggal VehicleAttentionPresenter.render(), mengisi
// container tunggal #vehAttentionBody (index.html/app_production.html).
//
// Pola SILENT-kalau-kosong sama persis panel lama — body dikosongkan kalau
// tidak ada actionable item maupun insight info/positive apa pun (armada
// aman).
const VehicleAttentionPresenter = {

  // _icon(type)/_borderColor(severity) — pemetaan MURNI presentasional,
  // persis sama dgn VehicleDecisionPresenter/VehicleAlertPanel yang lama
  // (tipe & severity itu sendiri sudah final dari engine yang direuse).
  _icon(type) {
    return { service: '🔧', tax: '📋', fuel: '⛽', insight: '💡' }[type] || 'ℹ️';
  },

  _borderColor(severity) {
    return { overdue: 'var(--accent4)', 'due-soon': 'var(--accent)', warning: 'var(--accent2)' }[severity] || 'var(--accent4)';
  },

  _insightIcon(type) {
    return { warning: '🟡', positive: '🟢', info: 'ℹ️' }[type] || 'ℹ️';
  },

  _actionRow(r) {
    return `
      <div class="u-fs12 u-lh15 u-t2 u-mb6" style="border-left:3px solid ${this._borderColor(r.severity)};padding-left:8px;">
        <div>${this._icon(r.type)} ${escapeHtml(r.message)}</div>
        <div class="u-fs11 u-fw700 u-t2" style="opacity:.8;">→ ${escapeHtml(r.action.label)}</div>
      </div>
    `;
  },

  _insightRow(item) {
    return `
      <div style="padding:8px 0;border-bottom:1px solid var(--border,rgba(255,255,255,.08));font-size:13px;">
        ${item.icon} ${escapeHtml(item.message)}
      </div>
    `;
  },

  render() {
    const el = document.getElementById('vehAttentionBody');
    if (!el) return; // container belum ada di halaman ini, aman diam2.

    // Bagian actionable (ranked) — persis alur VehicleDecisionPresenter lama.
    let actionRows = '';
    if (typeof VehicleRecommendationEngine !== 'undefined'
      && typeof VehiclePriorityScoring !== 'undefined'
      && typeof VehicleActionRecommendation !== 'undefined') {
      const recommendations = VehicleRecommendationEngine.recommendations();
      if (recommendations.length) {
        const ranked = VehiclePriorityScoring.rank(recommendations);
        const withAction = VehicleActionRecommendation.withAction(ranked);
        const top = withAction.slice(0, 6);
        actionRows = top.map((r) => this._actionRow(r)).join('');
      }
    }

    // Bagian insight info/positive (non-actionable, SENGAJA dilewati
    // VehicleRecommendationEngine) — persis sumber data VehicleInsightFeed
    // lama, tapi HANYA type 'info'/'positive' (type 'warning' sudah masuk
    // di bagian actionable di atas lewat VehicleRecommendationEngine,
    // supaya tidak tampil dobel).
    let insightRows = '';
    if (typeof VehicleAIHook !== 'undefined') {
      const hook = VehicleAIHook.fleetSummary();
      if (hook.ok) {
        const insightItems = ((hook.intelligence && hook.intelligence.insights) || [])
          .filter((ins) => ins.type !== 'warning')
          .map((ins) => ({ icon: this._insightIcon(ins.type), message: ins.message }));
        insightRows = insightItems.slice(0, 3).map((item) => this._insightRow(item)).join('');
      }
    }

    if (!actionRows && !insightRows) { el.innerHTML = ''; return; }

    el.innerHTML = `<div class="u-fs11 u-fw700 u-t2 u-mb6 u-mt10">🧭 Perlu Perhatian</div>${actionRows}${insightRows}`;
  },

};
