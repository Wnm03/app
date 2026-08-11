// ai-decision-engine.js — Smart Delivery Engine, Sesi 2/6: "otak" AI.
//
// Lihat RENCANA-SESI-RINGKAS.md untuk peta 6 sesi. Sesi ini butuh Sesi 1
// (ai-core.js: AIBus, AIStore/aiEnsureLoaded/aiGetStore/aiSave, AIContext)
// SUDAH dimuat lebih dulu — lihat urutan di scripts/build.js.
//
// Kenapa 1 file, bukan 4 (ai-decision-engine.js + ai-rule-engine.js +
// ai-recommendation-engine.js + ai-learning-engine.js) — lihat
// RENCANA-SESI-RINGKAS.md bagian "Kenapa dipangkas". Isinya tetap 3
// lapisan terpisah + 1 orkestrator, dikumpulkan lewat namespace internal:
//   AIDecision.rules    — registry + evaluator IF-THEN generik (pola sama
//                          dgn EIERegistry+RuleEngine, tapi digabung jadi
//                          1 karena Sesi ini tidak menyediakan file
//                          registry terpisah).
//   AIDecision.recommend — mapping recommendationId -> aksi konkret (pola
//                          sama dgn RecommendationService), diisi domain
//                          modules di Sesi 4-5 lewat .register().
//   AIDecision.learn     — pencatatan hasil (diterima/ditolak/diabaikan)
//                          per rule, dipakai penyesuaian confidence ringan
//                          (BUKAN machine learning — cuma rasio hitung).
//   AIDecision.decide()  — orkestrator: evaluate rules -> persist decision
//                          log + cooldown -> emit event lewat AIBus.
//
// PENTING (Sesi 2 — masih "senyap"): TIDAK ada satu pun rule domain yang
// didaftarkan di file ini. AIDecision.rules._rules kosong sampai modul
// SHOP/COBEK/FINANCE/dst (Sesi 4-5) mulai memanggil
// AIDecision.rules.register(...). File ini murni mesin generik + kontrak
// yang dites, TIDAK berefek apa pun ke app yang berjalan sampai ada
// pendaftar.

const AI_VALID_SEVERITIES = ['info', 'warning', 'critical'];
const AI_SEVERITY_ORDER = { critical: 3, warning: 2, info: 1 };
const AI_VALID_OUTCOMES = ['accepted', 'rejected', 'ignored'];
// Sesi 11 — mapping severity (rule) -> priority (rekomendasi terformat).
// Tidak menambah severity baru; 'LOW' dipakai kalau weight rule rendah
// (lihat formatRecommendation) supaya 4 level priority (LOW/MEDIUM/HIGH/
// CRITICAL) tetap tersedia tanpa mengubah kontrak severity yang sudah ada.
const AI_PRIORITY_FROM_SEVERITY = { critical: 'CRITICAL', warning: 'HIGH', info: 'MEDIUM' };

/** Validasi struktur Rule sebelum diterima registry — sama filosofinya
 * dgn eie rule-schema.js: rule custom yang salah bentuk ditolak diam-diam
 * (return errors[], bukan throw) supaya 1 modul yang salah daftar tidak
 * bisa menjatuhkan modul lain yang sudah lebih dulu register. */
function validateAIRuleShape(rule) {
  const errors = [];
  if (!rule || typeof rule !== 'object') return ['Rule harus berupa object'];
  if (!rule.id || typeof rule.id !== 'string') errors.push('Rule.id wajib string');
  if (!rule.category || typeof rule.category !== 'string') errors.push('Rule.category wajib string');
  if (typeof rule.condition !== 'function') errors.push('Rule.condition wajib function (ctx)=>boolean');
  if (typeof rule.action !== 'function') errors.push('Rule.action wajib function (ctx)=>{message,recommendationId?}');
  if (!AI_VALID_SEVERITIES.includes(rule.severity)) errors.push('Rule.severity wajib salah satu dari: ' + AI_VALID_SEVERITIES.join(', '));
  if (typeof rule.weight !== 'number') errors.push('Rule.weight wajib number');
  if (typeof rule.cooldownHours !== 'number' || rule.cooldownHours < 0) errors.push('Rule.cooldownHours wajib number >= 0');
  return errors;
}

const AIDecision = {
  // ----------------------------------------------------------------------
  // .rules — registry + evaluator IF-THEN generik. Domain-agnostic:
  // logistik/keuangan/aset/dll semua mendaftar lewat interface yang sama.
  // ----------------------------------------------------------------------
  rules: {
    // Array (bukan map) — sama alasannya dgn AICommandCenter: urutan
    // pendaftaran dipertahankan apa adanya untuk konsumen (mis. urutan
    // tampil di daily briefing) tanpa bergantung urutan Object.keys().
    _rules: [],

    /** register(rule) — satu-satunya jalur pendaftaran rule. Return true
     * kalau berhasil, false kalau invalid atau id duplikat (skip diam-diam,
     * bukan exception — pola sama dgn AICommandCenter.registerCommand). */
    register(rule) {
      const errors = validateAIRuleShape(rule);
      if (errors.length) {
        console.warn('[AIDecision] Rule ditolak:', rule && rule.id, errors);
        return false;
      }
      if (this._rules.some((r) => r.id === rule.id)) return false; // id harus unik
      this._rules.push({
        id: rule.id,
        category: rule.category,
        condition: rule.condition,
        action: rule.action,
        severity: rule.severity,
        weight: rule.weight,
        cooldownHours: rule.cooldownHours,
        enabled: rule.enabled !== false, // default true kecuali eksplisit false
        description: typeof rule.description === 'string' ? rule.description : '',
      });
      return true;
    },

    unregister(id) {
      const before = this._rules.length;
      this._rules = this._rules.filter((r) => r.id !== id);
      return this._rules.length < before;
    },

    getAll() {
      return this._rules.slice();
    },

    /** evaluate(ctx) — jalankan semua rule enabled & di luar cooldown
     * terhadap ctx (bentuk ctx bebas, ditentukan pemanggil per-domain —
     * mis. { finance: {...}, logistics: {...} } di sesi lanjutan).
     * ctx.simulated=true (What-If, dipakai AIService.simulate() Sesi ini
     * juga) TIDAK menandai cooldown, supaya simulasi tidak mengganggu
     * jadwal munculnya rekomendasi nyata. */
    evaluate(ctx = {}) {
      const triggered = [];
      for (const rule of this._rules) {
        if (!rule.enabled) continue;
        if (!ctx.simulated && this._inCooldown(rule.id, rule.cooldownHours)) continue;
        try {
          if (rule.condition(ctx)) {
            const result = rule.action(ctx) || {};
            triggered.push({
              ruleId: rule.id, category: rule.category, severity: rule.severity, weight: rule.weight,
              message: result.message || '', recommendationId: result.recommendationId || null,
              // Sesi 11 — field opsional, dilewatkan apa adanya kalau rule
              // domain menyediakannya (lihat formatRecommendation di bawah).
              // Rule lama yang tidak mengisi field ini tetap jalan normal
              // (fallback dihitung dari severity/weight/category).
              title: typeof result.title === 'string' ? result.title : null,
              affectedModules: Array.isArray(result.affectedModules) ? result.affectedModules : null,
              estimatedImpact: (result.estimatedImpact && typeof result.estimatedImpact === 'object') ? result.estimatedImpact : null,
              actions: Array.isArray(result.actions) ? result.actions : null,
            });
            if (!ctx.simulated) this._markCooldown(rule.id);
          }
        } catch (e) {
          // 1 rule error tidak boleh menjatuhkan evaluasi rule lain.
          console.warn(`[AIDecision] Rule ${rule.id} error, di-skip:`, e);
        }
      }
      return triggered.sort((a, b) => (AI_SEVERITY_ORDER[b.severity] || 0) - (AI_SEVERITY_ORDER[a.severity] || 0));
    },

    _inCooldown(ruleId, hours) {
      const store = aiGetStore();
      const last = (store.ruleCooldowns || {})[ruleId];
      if (!last || !hours) return false;
      const elapsedHours = (Date.now() - last) / (1000 * 60 * 60);
      return elapsedHours < hours;
    },

    _markCooldown(ruleId) {
      const store = aiGetStore();
      store.ruleCooldowns = store.ruleCooldowns || {};
      store.ruleCooldowns[ruleId] = Date.now();
      // Tidak await aiSave() di sini secara sengaja — AIDecision.decide()
      // (di bawah) yang jadi titik commit tunggal, sama pola dgn EIE
      // RuleEngine._markCooldown() vs EIEScoringEngine.recomputeAndPersist().
    },
  },

  // ----------------------------------------------------------------------
  // .recommend — mapping recommendationId -> aksi konkret ({ label,
  // target }). Data-only registry, diisi domain modules (Sesi 4-5) lewat
  // .register(), TIDAK berisi rekomendasi bawaan apa pun di Sesi 2 ini.
  // ----------------------------------------------------------------------
  recommend: {
    _map: Object.create(null),

    register(id, def) {
      if (typeof id !== 'string' || id.trim() === '') return false;
      if (!def || typeof def !== 'object' || typeof def.label !== 'string') return false;
      this._map[id] = { label: def.label, target: def.target || null };
      return true;
    },

    getById(id) {
      return this._map[id] || null;
    },

    getAll() {
      return Object.assign({}, this._map);
    },
  },

  // ----------------------------------------------------------------------
  // .learn — pencatatan ringan hasil keputusan per rule (diterima/ditolak/
  // diabaikan user), dipersist ke AIStore.learningData. BUKAN machine
  // learning — cuma rasio hitung, dipakai UI/rule masa depan buat
  // menimbang seberapa "dipercaya" rekomendasi dari rule tertentu.
  // ----------------------------------------------------------------------
  learn: {
    /** recordOutcome(ruleId, outcome) — persist langsung (bukan nunggu
     * decide() berikutnya), supaya feedback user tidak hilang kalau app
     * ditutup sebelum siklus decide() berikutnya jalan. */
    async recordOutcome(ruleId, outcome) {
      if (typeof ruleId !== 'string' || ruleId.trim() === '') return null;
      if (!AI_VALID_OUTCOMES.includes(outcome)) return null;
      await aiEnsureLoaded();
      const store = aiGetStore();
      store.learningData = store.learningData || {};
      const stats = store.learningData[ruleId] || { accepted: 0, rejected: 0, ignored: 0 };
      stats[outcome] += 1;
      store.learningData[ruleId] = stats;
      await aiSave();
      return stats;
    },

    async getStats(ruleId) {
      await aiEnsureLoaded();
      const store = aiGetStore();
      return (store.learningData || {})[ruleId] || { accepted: 0, rejected: 0, ignored: 0 };
    },

    /** getConfidence(ruleId) — rasio accepted / (accepted+rejected),
     * mengabaikan 'ignored' (belum tentu penolakan). Default 0.5 (netral)
     * kalau belum ada data sama sekali, supaya rule baru tidak langsung
     * dianggap tidak dipercaya. */
    async getConfidence(ruleId) {
      const stats = await this.getStats(ruleId);
      const decided = stats.accepted + stats.rejected;
      if (decided === 0) return 0.5;
      return stats.accepted / decided;
    },
  },

  // ----------------------------------------------------------------------
  // decide(ctx) — orkestrator utama: evaluate rules -> tulis decisionLog +
  // cooldown -> PERSIST sekali jalan -> emit 'ai:decision-made' lewat
  // AIBus. Ini SATU-SATUNYA tempat yang menulis AIStore.decisionLog
  // (selaras aturan "engine/service = satu-satunya penulis" dari pola EIE).
  // ----------------------------------------------------------------------
  async decide(ctx = {}) {
    await aiEnsureLoaded();
    const triggered = this.rules.evaluate(ctx);

    if (ctx.simulated) {
      // Simulasi (What-If): kembalikan hasil TANPA menulis apa pun ke
      // store (cooldown pun tidak ditandai — lihat rules.evaluate di atas).
      // recommendations tetap dibentuk (read-only, dari `triggered` yang
      // sudah bawa title/affectedModules/estimatedImpact/actions) supaya
      // UI What-If bisa pakai kontrak output yang sama dgn decide() nyata.
      const simDecisions = triggered.map((t, i) => ({
        id: `sim_${i}_${t.ruleId}`, ruleId: t.ruleId, category: t.category, severity: t.severity,
        message: t.message, recommendationId: t.recommendationId,
        title: t.title, affectedModules: t.affectedModules, estimatedImpact: t.estimatedImpact, actions: t.actions,
      }));
      return { decisions: [], triggered, recommendations: simDecisions.map((d) => this.formatRecommendation(d)), simulated: true };
    }

    const store = aiGetStore();
    const now = Date.now();
    const decisions = triggered.map((t, i) => ({
      id: `dec_${now}_${i}_${t.ruleId}`,
      ruleId: t.ruleId, category: t.category, severity: t.severity,
      message: t.message, recommendationId: t.recommendationId,
      // Sesi 11 — disimpan di decisionLog kalau rule menyediakan, supaya
      // riwayat (poin 7 kontrak: timestamp/module/reason/result/confidence)
      // tetap utuh dipanggil ulang lewat formatRecommendation() nanti,
      // bukan cuma dihitung sekali saat decide().
      title: t.title, affectedModules: t.affectedModules,
      estimatedImpact: t.estimatedImpact, actions: t.actions,
      createdAt: now, outcome: null,
    }));
    store.decisionLog = (store.decisionLog || []).concat(decisions).slice(-500);
    store.lastRunAt = now;
    await aiSave();

    const recommendations = decisions.map((d) => this.formatRecommendation(d));

    if (decisions.length) {
      AIBus.emit('ai:decision-made', { decisions, recommendations });
    }
    return { decisions, triggered, recommendations, simulated: false };
  },

  // ----------------------------------------------------------------------
  // formatRecommendation(decision) — Sesi 11: bentuk output standar dipakai
  // bareng oleh Tahap 5 (Daily Briefing), Tahap 7 (Simulation), dan UI mana
  // pun, supaya semuanya konsumsi 1 bentuk yang sama alih-alih menghitung
  // ulang logic bisnisnya masing-masing. Pure/read-only — tidak menulis
  // store, tidak butuh await (semua input sudah ada di decision).
  // Field yang tidak disediakan rule (affectedModules/estimatedImpact/
  // actions/title) diisi fallback aman, TIDAK error.
  // ----------------------------------------------------------------------
  formatRecommendation(decision) {
    if (!decision || typeof decision !== 'object') return null;
    const rule = this.rules._rules.find((r) => r.id === decision.ruleId);
    const weight = rule ? rule.weight : 5;
    const rec = decision.recommendationId ? this.recommend.getById(decision.recommendationId) : null;
    return {
      id: decision.id,
      ruleId: decision.ruleId || null,
      title: decision.title || (rec && rec.label) || decision.message.slice(0, 60),
      reason: decision.message,
      // Confidence: 0-1, dari weight rule (1-10 -> 0.1-1.0) sebagai proxy
      // sederhana kalau rule tidak menyediakan angka sendiri. BUKAN dari
      // AIDecision.learn (itu async & butuh histori outcome — konsumen yang
      // butuh confidence adaptif tetap bisa panggil learn.getConfidence()
      // terpisah, formatRecommendation() ini murni sync).
      confidence: Math.max(0.1, Math.min(1, weight / 10)),
      priority: AI_PRIORITY_FROM_SEVERITY[decision.severity] || 'MEDIUM',
      affectedModules: decision.affectedModules || [decision.category],
      estimatedImpact: decision.estimatedImpact || {},
      actions: decision.actions || (rec && rec.label ? [rec.label] : []),
    };
  },
};

// ---------------------------------------------------------------------------
// Rule Cross Module pertama (TODO.md #1, keputusan produk dikonfirmasi user):
// 'cross-finance-delivery-margin-balance' — peringatan kalau margin rata-rata
// 5 transaksi Cobek terakhir TIPIS (AIContext.snapshot().shop.recentAvgMarginPct)
// BERSAMAAN dgn saldo total akun sedang RENDAH
// (AIContext.snapshot().finance.saldoNow). Ini rule pertama yang benar-benar
// membaca 2+ domain dalam 1 condition() — sebelumnya semua rule domain
// (finance-*/vehicle-*/asset-*/delivery-*) hanya baca domain sendiri.
//
// Ditempatkan di ai-decision-engine.js (bukan tx-list-cashflow.js/
// cobek-pricing.js) krn rule ini bukan milik satu domain tunggal — butuh
// AIContext (ai-core.js) + getter finance + getter shop yang KETIGANYA harus
// sudah di-load. scripts/build.js sudah menjamin urutan ini (ai-core.js/
// ai-decision-engine.js dimuat SETELAH tx-list-cashflow.js & cobek-pricing.js).
//
// Ambang: SENGAJA TIDAK membuat ambang baru — reuse APA ADANYA 2 getter yang
// sudah ada & sudah bisa diatur user lewat Pengaturan > 🤖 AI Asisten:
//   - getAIDeliveryThinMarginThreshold() (cobek-pricing.js, default 10%)
//   - getAIFinanceLowBalanceMultiplier() (tx-list-cashflow.js, default 0.5x)
// Beda dari delivery-thin-margin (baca ctx.payload event 'delivery.created',
// 1 transaksi saja): rule ini baca recentAvgMarginPct (rata-rata 5 transaksi
// terakhir dari AIContext) supaya bisa dievaluasi kapan saja (bukan cuma
// persis saat 1 transaksi baru disimpan), sesuai sifat AIContext.snapshot()
// sendiri (ringkasan state terkini, bukan event sesaat).
// ---------------------------------------------------------------------------

function _crossFinanceDeliveryCheck() {
  if (typeof AIContext === 'undefined' || typeof AIContext.snapshot !== 'function') return { trigger: false };
  const snap = AIContext.snapshot();
  const fin = snap.finance, shop = snap.shop;
  if (!fin || !fin.available || !shop || !shop.available) return { trigger: false };
  if (typeof shop.recentAvgMarginPct !== 'number') return { trigger: false }; // belum cukup histori transaksi Cobek
  if (!fin.expAvgBulanan || fin.expAvgBulanan <= 0) return { trigger: false };
  const marginThreshold = (typeof getAIDeliveryThinMarginThreshold === 'function') ? getAIDeliveryThinMarginThreshold() : 10;
  const balanceMultiplier = (typeof getAIFinanceLowBalanceMultiplier === 'function') ? getAIFinanceLowBalanceMultiplier() : 0.5;
  const marginLow = shop.recentAvgMarginPct < marginThreshold;
  const balanceLow = fin.saldoNow < fin.expAvgBulanan * balanceMultiplier;
  return {
    trigger: marginLow && balanceLow,
    saldoNow: fin.saldoNow,
    expAvgBulanan: fin.expAvgBulanan,
    balanceMultiplier,
    recentAvgMarginPct: shop.recentAvgMarginPct,
    marginThreshold,
  };
}

let _crossModuleAIRulesRegistered = false;
// registerCrossModuleAIRules() — dipanggil sekali saat boot (self-test.js
// init(), SETELAH registerFinanceAIRules()/registerDeliveryAIRules() —
// urutan tidak wajib krn rule ini baca lewat AIContext.snapshot(), bukan
// manggil register*AIRules() domain lain). Idempotent & return false kalau
// AIDecision belum ada, pola sama persis dgn register*AIRules() domain lain.
function registerCrossModuleAIRules() {
  if (_crossModuleAIRulesRegistered) return false;
  if (typeof AIDecision === 'undefined' || !AIDecision.rules || typeof AIDecision.rules.register !== 'function') return false;
  AIDecision.rules.register({
    id: 'cross-finance-delivery-margin-balance',
    category: 'cross',
    severity: 'warning',
    weight: 6,
    cooldownHours: 24,
    description: 'Margin rata-rata transaksi Cobek terakhir tipis (di bawah ambang) BERSAMAAN dgn saldo total akun sedang rendah (AIContext.snapshot()).',
    condition: () => _crossFinanceDeliveryCheck().trigger,
    action: () => {
      const c = _crossFinanceDeliveryCheck();
      const fmt = typeof fmtFull === 'function' ? fmtFull : (n => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'));
      return { message: `Margin transaksi Cobek belakangan cuma ${c.recentAvgMarginPct.toFixed(1)}% (di bawah ambang ${c.marginThreshold}%), sementara saldo total akun cuma ${fmt(c.saldoNow)}, di bawah ${c.balanceMultiplier}x rata-rata pengeluaran bulanan (${fmt(Math.round(c.expAvgBulanan))}).` };
    },
  });
  _crossModuleAIRulesRegistered = true;
  return true;
}

if (typeof window !== 'undefined') {
  window.AIDecision = AIDecision;
}
