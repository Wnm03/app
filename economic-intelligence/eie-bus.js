// eie-bus.js — Event bus internal Economic Intelligence Engine (EIE).
//
// Pola pub/sub sederhana, TIDAK bergantung pada library luar, TIDAK
// menyentuh IndexedDB/D. Dipakai supaya macro-sync-service/scoring-engine
// bisa "memancarkan" event (mis. 'eie:macro-updated', 'eie:scores-updated')
// tanpa listener (services/ui) perlu polling.
//
// PENTING (fase 1 — "senyap"): bus ini TIDAK auto-listen ke apa pun secara
// default. Tidak ada notifikasi/toast yang terpasang di file ini. Modul lain
// (mis. notification-service.js) baru aktif kalau di-subscribe eksplisit.

const EIEBus = {
  _listeners: Object.create(null),

  on(eventName, handler) {
    if (!this._listeners[eventName]) this._listeners[eventName] = [];
    this._listeners[eventName].push(handler);
    return () => this.off(eventName, handler); // unsubscribe helper
  },

  off(eventName, handler) {
    const arr = this._listeners[eventName];
    if (!arr) return;
    this._listeners[eventName] = arr.filter((h) => h !== handler);
  },

  emit(eventName, payload) {
    const arr = this._listeners[eventName];
    if (!arr || !arr.length) return;
    // Salin array supaya handler yang unsubscribe di tengah iterasi aman.
    arr.slice().forEach((handler) => {
      try {
        handler(payload);
      } catch (e) {
        // EIE tidak boleh menjatuhkan app utama kalau 1 listener error.
        console.warn('[EIE] Listener error untuk event "' + eventName + '":', e);
      }
    });
  },
};
