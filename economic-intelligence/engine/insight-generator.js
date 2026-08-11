// engine/insight-generator.js — Fase 1: template + slot filling SUDAH
// dilakukan langsung di dalam rule.action() (rules/rule-definitions.js),
// jadi file ini fokus jadi helper baca/kelola Insight[] tersimpan, dengan
// interface yang sama persis siap diisi upgrade AI di fase 3 (§21):
//
//   InsightGenerator.generate(triggeredRule, macro, user) -> string
//
// Prinsip kunci (§21): LLM TIDAK PERNAH menggantikan Rule Engine untuk
// angka/skor — hanya boleh merangkai bahasa kalau suatu saat dipasang.
// Fase 1 ini generate() masih pure passthrough (rule sudah generate teks).

const InsightGenerator = {
  /** Fase 1: passthrough. Fase 3 bisa ganti isi ini dgn panggilan LLM
   * (guarded try/catch, fallback ke passthrough kalau offline/gagal). */
  generate(triggeredRule) {
    return triggeredRule.message;
  },

  async list({ onlyUnread = false } = {}) {
    await eieEnsureLoaded();
    const store = eieGetStore();
    let list = store.insights || [];
    if (onlyUnread) list = list.filter((i) => !i.read);
    return list.slice().sort((a, b) => b.createdAt - a.createdAt);
  },

  async markRead(insightId) {
    await eieEnsureLoaded();
    const store = eieGetStore();
    const ins = (store.insights || []).find((i) => i.id === insightId);
    if (ins) { ins.read = true; await eieSave(); }
    return ins || null;
  },

  async dismiss(insightId) {
    await eieEnsureLoaded();
    const store = eieGetStore();
    const ins = (store.insights || []).find((i) => i.id === insightId);
    if (ins) { ins.dismissed = true; await eieSave(); }
    return ins || null;
  },
};
