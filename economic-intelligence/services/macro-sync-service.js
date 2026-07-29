// services/macro-sync-service.js — Orkestrasi refresh macro + recompute
// skor. Ini titik masuk utama yang dipanggil UI/scheduler (§2: "SATU-
// SATUNYA tempat menulis ke EIEStore.*" ada di layer services/engine).
//
// FASE 1 ("senyap"): tidak ada auto-trigger apa pun terpasang secara
// default. Fungsi di bawah HARUS dipanggil eksplisit (mis. dari scheduler
// fase 2, atau manual dari console/UI) — mengikuti pola lazy-load
// lifeOSEnsureLoaded() yang sudah ada, supaya app tidak "diam-diam" jadi
// lebih berat/berisik dari sebelumnya sampai fase UI benar-benar dipasang.

const MacroSyncService = {
  /** Refresh macro (fase 1: dari cache/manual input) lalu recompute skor + insight. */
  async syncAndRecompute() {
    await eieEnsureLoaded();
    await MacroDataAdapter.refresh();
    return EIEScoringEngine.recomputeAndPersist();
  },

  /** Hanya recompute dari data yang sudah ada di cache, tanpa refresh macro. */
  async recomputeOnly() {
    await eieEnsureLoaded();
    return EIEScoringEngine.recomputeAndPersist();
  },
};
