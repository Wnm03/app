// services/notification-service.js — Event listener -> Notification API /
// in-app toast (§2, §14 dokumen desain).
//
// FASE 1 ("senyap", sesuai permintaan implementasi bertahap): service ini
// TIDAK subscribe ke EIEBus secara default & TIDAK pernah memanggil
// Notification API atau toast(). Ini murni siap pakai (interface sudah
// ada) supaya fase 2 tinggal panggil `NotificationService.enable()` tanpa
// perlu ubah scoring-engine/rule-engine sama sekali.
//
// Kenapa penting dipisah begini: memunculkan notifikasi browser/toast
// otomatis tanpa persetujuan eksplisit user bisa terasa mengganggu &
// prematur selama UI EIE (dashboard, insight feed) belum ada tempat bagi
// user untuk mengatur preferensinya. Jadi fase 1 sengaja senyap total.

const NotificationService = {
  _unsubscribe: null,
  _enabled: false,

  /** Aktifkan listener (dipanggil eksplisit di fase 2, TIDAK dipanggil otomatis di fase 1). */
  enable(options = {}) {
    if (this._enabled) return;
    this._enabled = true;
    this._unsubscribe = EIEBus.on('eie:scores-updated', ({ insights }) => {
      if (!insights || !insights.length) return;
      const critical = insights.filter((i) => i.severity === 'critical');
      const toShow = options.criticalOnly ? critical : insights;
      toShow.forEach((ins) => this._deliver(ins, options));
    });
  },

  disable() {
    if (this._unsubscribe) this._unsubscribe();
    this._unsubscribe = null;
    this._enabled = false;
  },

  _deliver(insight, options) {
    // In-app toast, reuse fungsi global toast() yang sudah ada di app
    // (dipakai fitur lain, mis. worthit.js) — guarded, tidak pernah lempar
    // error kalau toast() belum tersedia saat file ini dimuat lebih awal.
    try {
      if (typeof toast === 'function' && !options.silent) {
        toast(`${insight.severity === 'critical' ? '🔴' : (insight.severity === 'warning' ? '🟡' : 'ℹ️')} ${insight.message}`);
      }
    } catch (e) {
      console.warn('[EIE] NotificationService gagal deliver toast:', e);
    }
  },
};
