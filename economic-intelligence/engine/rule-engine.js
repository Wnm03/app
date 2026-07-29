// engine/rule-engine.js — Evaluator IF-THEN generik (§9.2). SATU-SATUNYA
// tempat yang menjalankan condition/action dari rules/rule-definitions.js
// + rule custom hasil EIERegistry.registerRule() (§20).
//
// Cooldown anti-spam (§9) disimpan lewat eie-store (EIEStore.ruleCooldowns),
// BUKAN state lokal di file ini, supaya bertahan antar sesi/reload.

const EIE_SEVERITY_ORDER = { critical: 3, warning: 2, info: 1 };

const RuleEngine = {
  /**
   * @param {Object} macroSnapshots - { usdidr, inflasi, bi_rate, ihsg, emas, bbm, ... }
   * @param {import('../domain/entities.js').UserFinanceSnapshot} userSnapshot
   * @param {Object} [ctx] - { simulated?: boolean } — simulasi What-If tidak menulis cooldown
   * @returns {Array} triggered insights (belum di-persist)
   */
  evaluate(macroSnapshots, userSnapshot, ctx = {}) {
    const rules = (typeof EIERegistry !== 'undefined' ? EIERegistry.getRules() : EIE_RULES);
    const triggered = [];
    for (const rule of rules) {
      if (!rule.enabled) continue;
      if (!ctx.simulated && this._inCooldown(rule.id, rule.cooldownDays)) continue;
      try {
        if (rule.condition(macroSnapshots, userSnapshot, ctx)) {
          const result = rule.action(macroSnapshots, userSnapshot, ctx) || {};
          triggered.push({
            ruleId: rule.id, severity: rule.severity, weight: rule.weight,
            message: result.message || '', recommendationId: result.recommendationId || null,
          });
          if (!ctx.simulated) this._markCooldown(rule.id);
        }
      } catch (e) {
        console.warn(`[EIE] Rule ${rule.id} error, di-skip:`, e);
      }
    }
    return triggered.sort((a, b) => (EIE_SEVERITY_ORDER[b.severity] || 0) - (EIE_SEVERITY_ORDER[a.severity] || 0));
  },

  _inCooldown(ruleId, days) {
    const store = eieGetStore();
    const last = (store.ruleCooldowns || {})[ruleId];
    if (!last || !days) return false;
    const elapsedDays = (Date.now() - last) / (1000 * 60 * 60 * 24);
    return elapsedDays < days;
  },

  _markCooldown(ruleId) {
    const store = eieGetStore();
    store.ruleCooldowns = store.ruleCooldowns || {};
    store.ruleCooldowns[ruleId] = Date.now();
    // Tidak await eieSave() di sini secara sengaja — caller (ScoringEngine)
    // yang menentukan titik commit tunggal supaya tidak banyak write kecil
    // ber-hamburan ke IndexedDB dalam 1 siklus evaluasi.
  },
};
