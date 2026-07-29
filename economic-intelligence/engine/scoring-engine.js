// engine/scoring-engine.js — Orkestrasi EES/PEHS/ERI + Status Ekonomi
// (§5-8), memanggil RuleEngine (§9) untuk insight, lalu PERSIST hasil ke
// eie-store. Ini SATU-SATUNYA tempat yang menulis EIEScoreSnapshot &
// Insight[] ke store (selaras dgn aturan "services/engine = satu2nya
// penulis" di §2 dokumen desain).

const EIEScoringEngine = {
  /**
   * Hitung EES/PEHS/ERI + Status Ekonomi dari snapshot yang SUDAH ada
   * (tidak baca D/adapter sendiri) — dipakai juga oleh ScenarioSimulator
   * (What-If, fase 2) supaya simulasi tidak menulis apa pun.
   */
  calculateAll(macroSnapshots, userSnapshot) {
    const ees = calcEES(userSnapshot);
    const pehs = calcPEHS(userSnapshot);
    const eri = calcERI(macroSnapshots);
    const { status, impactScore } = classifyEconomicStatus(ees.score, pehs.score, eri.score);
    return {
      economicExposureScore: ees.score,
      personalEconomicHealthScore: pehs.score,
      economicRiskIndex: eri.score,
      status,
      breakdown: { ees: ees.breakdown, pehs: pehs.breakdown, eri: eri.breakdown, impactScore },
    };
  },

  /**
   * Alur utama fase 1: baca macro (cache) + user (live dari D), hitung
   * skor, evaluasi rule -> insight, lalu PERSIST semuanya sekali jalan.
   * TIDAK mengirim notifikasi apa pun di sini (lihat notification-service.js
   * — sengaja pasif di fase 1, "senyap").
   */
  async recomputeAndPersist() {
    await eieEnsureLoaded();
    const macro = MacroDataAdapter.getLatest();
    const user = UserFinanceAdapter.getSnapshot();
    const scores = this.calculateAll(macro, user);
    const triggered = RuleEngine.evaluate(macro, user, { simulated: false });

    const store = eieGetStore();
    const today = new Date().toISOString().slice(0, 10);
    const snapshot = { date: today, ...scores };
    // 1 entry per hari: kalau hari yang sama sudah ada, timpa (bukan duplikat).
    store.scoreHistory = (store.scoreHistory || []).filter((s) => s.date !== today);
    store.scoreHistory.push(snapshot);
    store.scoreHistory = store.scoreHistory.slice(-365);

    const now = Date.now();
    const newInsights = triggered.map((t, i) => ({
      id: `ins_${now}_${i}_${t.ruleId}`,
      ruleId: t.ruleId, severity: t.severity, message: t.message,
      recommendationId: t.recommendationId, createdAt: now, read: false, dismissed: false,
    }));
    store.insights = (store.insights || []).concat(newInsights).slice(-200);
    store.lastSyncAt = now;

    await eieSave();
    EIEBus.emit('eie:scores-updated', { snapshot, insights: newInsights });
    return { snapshot, insights: newInsights };
  },

  async getLatestSnapshot() {
    await eieEnsureLoaded();
    const store = eieGetStore();
    const arr = store.scoreHistory || [];
    return arr.length ? arr[arr.length - 1] : null;
  },
};
