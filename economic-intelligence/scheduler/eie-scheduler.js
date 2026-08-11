// scheduler/eie-scheduler.js — Trigger periodik untuk MacroSyncService
// (§14). FASE 1 ("senyap"): TIDAK ada setInterval yang otomatis jalan saat
// file ini dimuat. start()/stop() harus dipanggil eksplisit — supaya
// menambahkan file ini ke build TIDAK diam-diam membuat app polling/refresh
// di background sebelum ada UI yang benar-benar membutuhkannya (fase 2).

const EIEScheduler = {
  _timerId: null,

  /** @param {number} intervalMs default 6 jam */
  start(intervalMs = 6 * 60 * 60 * 1000) {
    if (this._timerId) return; // sudah jalan, tidak dobel
    this._timerId = setInterval(() => {
      MacroSyncService.recomputeOnly().catch((e) => console.warn('[EIE] Scheduler recompute gagal:', e));
    }, intervalMs);
  },

  stop() {
    if (this._timerId) { clearInterval(this._timerId); this._timerId = null; }
  },

  isRunning() {
    return !!this._timerId;
  },
};
